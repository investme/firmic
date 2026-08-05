from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from auth import get_token_payload
from database import get_db
from firmic_models import User
from models.company import Company
from models.launch import CompanyLaunch
from schemas.launch import (
    LaunchAdminReviewRequest,
    LaunchOfficeStatusUpdate,
    LaunchProvisioningUpdate,
    LaunchRecordResponse,
    LaunchRequirementUpdate,
    LaunchStatusUpdate,
    LaunchSummaryResponse,
)
from services.launch_service import (
    ensure_company_launch,
    get_launch_or_404,
    get_launch_summary,
    restore_company_launch,
    review_company_launch,
    set_office_status,
    suspend_company_launch,
    synchronize_launch_state,
    update_launch_requirement,
    update_provisioning,
)


router = APIRouter(
    prefix="/api/launch",
    tags=["Launch Engine"],
)


def get_authenticated_user_id(token: dict) -> str:
    user_id = str(token.get("sub") or "").strip()

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized.",
        )

    return user_id


def get_user_record(
    db: Session,
    user_id: str,
) -> User | None:
    try:
        normalized_user_id = int(user_id)
    except (TypeError, ValueError):
        return None

    return (
        db.query(User)
        .filter(User.id == normalized_user_id)
        .first()
    )


def user_is_admin(
    db: Session,
    user_id: str,
) -> bool:
    user = get_user_record(db, user_id)

    return bool(
        user
        and str(
            getattr(user, "role", "") or ""
        )
        .strip()
        .lower()
        == "admin"
    )


def verify_company_access(
    db: Session,
    *,
    company_id: str,
    user_id: str,
) -> Company:
    company = (
        db.query(Company)
        .filter(
            Company.id == company_id,
            Company.status != "terminated",
        )
        .first()
    )

    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found.",
        )

    is_owner = str(company.user_id) == str(user_id)
    is_admin = user_is_admin(db, user_id)

    if not is_owner and not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Company access denied.",
        )

    return company


def require_admin(
    db: Session,
    token: dict,
) -> str:
    user_id = get_authenticated_user_id(token)

    if not user_is_admin(db, user_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Firmic Admin access required.",
        )

    return user_id


def commit_launch(
    db: Session,
    launch: CompanyLaunch,
) -> CompanyLaunch:
    try:
        db.add(launch)
        db.commit()
        db.refresh(launch)
        return launch
    except Exception:
        db.rollback()
        raise


@router.post(
    "/company/{company_id}/initialize",
    response_model=LaunchSummaryResponse,
)
def initialize_company_launch(
    company_id: str,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    user_id = get_authenticated_user_id(token)

    company = verify_company_access(
        db,
        company_id=company_id,
        user_id=user_id,
    )

    try:
        launch = ensure_company_launch(
            db,
            company,
            commit=False,
        )

        commit_launch(db, launch)
        return get_launch_summary(launch)

    except HTTPException:
        db.rollback()
        raise

    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(
                "Firmic could not initialize the company "
                f"launch record: {error}"
            ),
        ) from error


@router.get(
    "/company/{company_id}",
    response_model=LaunchSummaryResponse,
)
def read_company_launch(
    company_id: str,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    user_id = get_authenticated_user_id(token)

    company = verify_company_access(
        db,
        company_id=company_id,
        user_id=user_id,
    )

    launch = ensure_company_launch(
        db,
        company,
        commit=False,
    )

    synchronize_launch_state(launch)
    commit_launch(db, launch)

    return get_launch_summary(launch)


@router.get(
    "/company/{company_id}/record",
    response_model=LaunchRecordResponse,
)
def read_company_launch_record(
    company_id: str,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    user_id = get_authenticated_user_id(token)

    company = verify_company_access(
        db,
        company_id=company_id,
        user_id=user_id,
    )

    launch = ensure_company_launch(
        db,
        company,
        commit=False,
    )

    synchronize_launch_state(launch)
    return commit_launch(db, launch)


@router.patch(
    "/company/{company_id}/requirements/{requirement_key}",
    response_model=LaunchSummaryResponse,
)
def update_company_launch_requirement(
    company_id: str,
    requirement_key: str,
    payload: LaunchRequirementUpdate,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    user_id = get_authenticated_user_id(token)

    verify_company_access(
        db,
        company_id=company_id,
        user_id=user_id,
    )

    launch = get_launch_or_404(
        db,
        company_id,
    )

    is_admin = user_is_admin(db, user_id)

    if payload.approved is not None and not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Only Firmic Admin may approve or reject "
                "launch requirements."
            ),
        )

    try:
        update_launch_requirement(
            launch,
            requirement_key,
            uploaded=payload.uploaded,
            approved=payload.approved,
        )

        commit_launch(db, launch)
        return get_launch_summary(launch)

    except HTTPException:
        db.rollback()
        raise

    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Launch requirement update failed: {error}",
        ) from error


@router.patch(
    "/company/{company_id}/office-status",
    response_model=LaunchSummaryResponse,
)
def update_company_office_status(
    company_id: str,
    payload: LaunchOfficeStatusUpdate,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    user_id = get_authenticated_user_id(token)

    verify_company_access(
        db,
        company_id=company_id,
        user_id=user_id,
    )

    launch = get_launch_or_404(
        db,
        company_id,
    )

    protected_statuses = {
        "provisioning",
        "active",
        "suspended",
    }

    if (
        payload.office_status in protected_statuses
        and not user_is_admin(db, user_id)
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Only Firmic Admin may provision, activate, "
                "or suspend a headquarters."
            ),
        )

    try:
        set_office_status(
            launch,
            payload.office_status,
        )

        commit_launch(db, launch)
        return get_launch_summary(launch)

    except HTTPException:
        db.rollback()
        raise

    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Office launch status update failed: {error}",
        ) from error


@router.post(
    "/company/{company_id}/admin-review",
    response_model=LaunchSummaryResponse,
)
def review_company_launch_package(
    company_id: str,
    payload: LaunchAdminReviewRequest,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    reviewer_id = require_admin(
        db,
        token,
    )

    verify_company_access(
        db,
        company_id=company_id,
        user_id=reviewer_id,
    )

    launch = get_launch_or_404(
        db,
        company_id,
    )

    try:
        review_company_launch(
            launch,
            approved=payload.approved,
            reviewer_id=(
                payload.reviewer_id
                or reviewer_id
            ),
            rejection_reason=payload.rejection_reason,
        )

        commit_launch(db, launch)
        return get_launch_summary(launch)

    except HTTPException:
        db.rollback()
        raise

    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Launch review failed: {error}",
        ) from error


@router.patch(
    "/company/{company_id}/provisioning",
    response_model=LaunchSummaryResponse,
)
def update_company_provisioning(
    company_id: str,
    payload: LaunchProvisioningUpdate,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    admin_user_id = require_admin(
        db,
        token,
    )

    verify_company_access(
        db,
        company_id=company_id,
        user_id=admin_user_id,
    )

    launch = get_launch_or_404(
        db,
        company_id,
    )

    try:
        update_provisioning(
            launch,
            headquarters_provisioned=(
                payload.headquarters_provisioned
            ),
            mailbox_provisioned=(
                payload.mailbox_provisioned
            ),
            voip_provisioned=(
                payload.voip_provisioned
            ),
            ai_workforce_provisioned=(
                payload.ai_workforce_provisioned
            ),
            workspace_provisioned=(
                payload.workspace_provisioned
            ),
        )

        commit_launch(db, launch)
        return get_launch_summary(launch)

    except HTTPException:
        db.rollback()
        raise

    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Company provisioning update failed: {error}",
        ) from error


@router.patch(
    "/company/{company_id}/status",
    response_model=LaunchSummaryResponse,
)
def update_company_launch_status(
    company_id: str,
    payload: LaunchStatusUpdate,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    admin_user_id = require_admin(
        db,
        token,
    )

    verify_company_access(
        db,
        company_id=company_id,
        user_id=admin_user_id,
    )

    launch = get_launch_or_404(
        db,
        company_id,
    )

    try:
        if payload.status == "suspended":
            suspend_company_launch(
                launch,
                reason=(
                    payload.reason
                    or "Company launch suspended by Firmic Admin."
                ),
            )

        elif launch.status == "suspended":
            restore_company_launch(launch)

        else:
            launch.status = payload.status
            synchronize_launch_state(launch)

        commit_launch(db, launch)
        return get_launch_summary(launch)

    except HTTPException:
        db.rollback()
        raise

    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Company launch status update failed: {error}",
        ) from error


@router.post(
    "/company/{company_id}/suspend",
    response_model=LaunchSummaryResponse,
)
def suspend_launch(
    company_id: str,
    payload: LaunchStatusUpdate,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    admin_user_id = require_admin(
        db,
        token,
    )

    verify_company_access(
        db,
        company_id=company_id,
        user_id=admin_user_id,
    )

    launch = get_launch_or_404(
        db,
        company_id,
    )

    reason = (
        payload.reason
        or "Company launch suspended by Firmic Admin."
    )

    try:
        suspend_company_launch(
            launch,
            reason=reason,
        )

        commit_launch(db, launch)
        return get_launch_summary(launch)

    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Company launch suspension failed: {error}",
        ) from error


@router.post(
    "/company/{company_id}/restore",
    response_model=LaunchSummaryResponse,
)
def restore_launch(
    company_id: str,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    admin_user_id = require_admin(
        db,
        token,
    )

    verify_company_access(
        db,
        company_id=company_id,
        user_id=admin_user_id,
    )

    launch = get_launch_or_404(
        db,
        company_id,
    )

    try:
        restore_company_launch(launch)

        commit_launch(db, launch)
        return get_launch_summary(launch)

    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Company launch restoration failed: {error}",
        ) from error