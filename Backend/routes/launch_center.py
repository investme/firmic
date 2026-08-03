import datetime
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload

from auth import get_token_payload
from database import get_db
from models.company import Company
from models.launch_center import (
    BankPartner,
    FormationPartner,
    LaunchApplication,
    LaunchMilestone,
)
from schemas.launch_center import (
    BankPartnerResponse,
    FormationPartnerResponse,
    LaunchApplicationCreate,
    LaunchApplicationResponse,
    LaunchApplicationUpdate,
    LaunchMilestoneResponse,
    LaunchMilestoneUpdate,
)


router = APIRouter()


DEFAULT_MILESTONES = [
    {
        "key": "company_profile",
        "title": "Company Profile",
        "position": 1,
    },
    {
        "key": "jurisdiction",
        "title": "Country and Jurisdiction",
        "position": 2,
    },
    {
        "key": "business_activity",
        "title": "Business Activity",
        "position": 3,
    },
    {
        "key": "formation_partner",
        "title": "Formation Partner",
        "position": 4,
    },
    {
        "key": "licensing",
        "title": "Company Licensing",
        "position": 5,
    },
    {
        "key": "banking",
        "title": "Corporate Banking",
        "position": 6,
    },
    {
        "key": "virtual_office",
        "title": "Virtual Office",
        "position": 7,
    },
    {
        "key": "workspace_activation",
        "title": "Workspace Activation",
        "position": 8,
    },
]


def generate_uuid() -> str:
    return str(uuid.uuid4())


def get_user_id(token: dict) -> str:
    user_id = token.get("sub")

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized",
        )

    return str(user_id)


def get_owned_company(
    db: Session,
    *,
    company_id: str,
    user_id: str,
) -> Company:
    company = (
        db.query(Company)
        .filter(
            Company.id == company_id,
            Company.user_id == user_id,
            Company.status != "terminated",
        )
        .first()
    )

    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found",
        )

    return company


def get_owned_launch_application(
    db: Session,
    *,
    application_id: str,
    user_id: str,
) -> LaunchApplication:
    application = (
        db.query(LaunchApplication)
        .options(
            joinedload(LaunchApplication.formation_partner),
            joinedload(LaunchApplication.bank_partner),
            joinedload(LaunchApplication.milestones),
        )
        .filter(
            LaunchApplication.id == application_id,
            LaunchApplication.user_id == user_id,
        )
        .first()
    )

    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Launch application not found",
        )

    return application


def initialize_milestones(
    db: Session,
    *,
    application: LaunchApplication,
) -> None:
    now = datetime.datetime.utcnow()

    for definition in DEFAULT_MILESTONES:
        milestone_status = "not_started"
        started_at = None
        completed_at = None

        if definition["key"] == "company_profile":
            milestone_status = "completed"
            started_at = now
            completed_at = now

        elif definition["key"] in {
            "jurisdiction",
            "business_activity",
        }:
            milestone_status = "in_progress"
            started_at = now

        milestone = LaunchMilestone(
            id=generate_uuid(),
            launch_application_id=application.id,
            key=definition["key"],
            title=definition["title"],
            position=float(definition["position"]),
            status=milestone_status,
            started_at=started_at,
            completed_at=completed_at,
        )

        db.add(milestone)


def calculate_progress(application: LaunchApplication) -> float:
    milestones = application.milestones or []

    if not milestones:
        return 0.0

    completed_count = sum(
        milestone.status in {"approved", "completed"}
        for milestone in milestones
    )

    return round(
        (completed_count / len(milestones)) * 100,
        1,
    )
def synchronize_application_milestones(
    application: LaunchApplication,
) -> None:
    """
    Keep milestone states aligned with the launch application.

    The milestone records remain the source used by the progress UI,
    while the application fields provide convenient operational summaries.
    """

    milestones = {
        milestone.key: milestone
        for milestone in application.milestones or []
    }

    def set_status(
        key: str,
        value: str,
    ) -> None:
        milestone = milestones.get(key)

        if not milestone:
            return

        now = datetime.datetime.utcnow()

        if value != "not_started" and milestone.started_at is None:
            milestone.started_at = now

        if value in {"approved", "completed"}:
            milestone.completed_at = milestone.completed_at or now
        else:
            milestone.completed_at = None

        milestone.status = value

    if application.jurisdiction:
        set_status("jurisdiction", "completed")
    else:
        set_status("jurisdiction", "in_progress")

    if application.business_activity:
        set_status("business_activity", "completed")
    else:
        set_status("business_activity", "in_progress")

    if application.formation_partner_id:
        set_status("formation_partner", "completed")
    else:
        set_status("formation_partner", "not_started")

    set_status("licensing", application.formation_status)
    set_status("banking", application.banking_status)
    set_status("virtual_office", application.office_status)
    set_status("workspace_activation", application.workspace_status)

    completed = all(
        milestone.status in {"approved", "completed"}
        for milestone in milestones.values()
    )

    if completed:
        application.status = "completed"
        application.completed_at = (
            application.completed_at
            or datetime.datetime.utcnow()
        )
    elif application.status == "completed":
        application.status = "in_progress"
        application.completed_at = None


def serialize_application(
    application: LaunchApplication,
) -> dict:
    return {
        "id": application.id,
        "user_id": application.user_id,
        "company_id": application.company_id,
        "status": application.status,
        "country": application.country,
        "jurisdiction": application.jurisdiction,
        "business_activity": application.business_activity,
        "business_description": application.business_description,
        "formation_status": application.formation_status,
        "banking_status": application.banking_status,
        "office_status": application.office_status,
        "workspace_status": application.workspace_status,
        "estimated_completion_at": (
            application.estimated_completion_at
        ),
        "completed_at": application.completed_at,
        "created_at": application.created_at,
        "updated_at": application.updated_at,
        "formation_partner": application.formation_partner,
        "bank_partner": application.bank_partner,
        "milestones": sorted(
            application.milestones or [],
            key=lambda item: item.position,
        ),
        "progress_percent": calculate_progress(application),
    }


@router.post(
    "/applications",
    response_model=LaunchApplicationResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_launch_application(
    payload: LaunchApplicationCreate,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    user_id = get_user_id(token)

    company = get_owned_company(
        db,
        company_id=payload.company_id,
        user_id=user_id,
    )

    existing = (
        db.query(LaunchApplication)
        .filter(
            LaunchApplication.company_id == company.id,
        )
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "A launch application already exists "
                "for this company"
            ),
        )

    application = LaunchApplication(
        id=generate_uuid(),
        user_id=user_id,
        company_id=company.id,
        status="in_progress",
        country=payload.country.strip(),
        jurisdiction=(
            payload.jurisdiction.strip()
            if payload.jurisdiction
            else None
        ),
        business_activity=(
            payload.business_activity.strip()
            if payload.business_activity
            else None
        ),
        business_description=(
            payload.business_description.strip()
            if payload.business_description
            else None
        ),
        formation_status="not_started",
        banking_status="not_started",
        office_status=(
            "completed"
            if company.headquarters_office_code
            else "not_started"
        ),
        workspace_status="initiated",
    )

    try:
        db.add(application)
        db.flush()

        initialize_milestones(
            db,
            application=application,
        )
        db.flush()
        db.refresh(application)
        synchronize_application_milestones(application)

        db.commit()

        application = get_owned_launch_application(
            db,
            application_id=application.id,
            user_id=user_id,
        )

        return serialize_application(application)

    except HTTPException:
        db.rollback()
        raise

    except Exception:
        db.rollback()
        raise


@router.get(
    "/applications",
    response_model=list[LaunchApplicationResponse],
)
def list_launch_applications(
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    user_id = get_user_id(token)

    applications = (
        db.query(LaunchApplication)
        .options(
            joinedload(LaunchApplication.formation_partner),
            joinedload(LaunchApplication.bank_partner),
            joinedload(LaunchApplication.milestones),
        )
        .filter(
            LaunchApplication.user_id == user_id,
        )
        .order_by(LaunchApplication.created_at.desc())
        .all()
    )

    return [
        serialize_application(application)
        for application in applications
    ]


@router.get(
    "/applications/company/{company_id}",
    response_model=LaunchApplicationResponse,
)
def get_launch_application_by_company(
    company_id: str,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    user_id = get_user_id(token)

    get_owned_company(
        db,
        company_id=company_id,
        user_id=user_id,
    )

    application = (
        db.query(LaunchApplication)
        .options(
            joinedload(LaunchApplication.formation_partner),
            joinedload(LaunchApplication.bank_partner),
            joinedload(LaunchApplication.milestones),
        )
        .filter(
            LaunchApplication.company_id == company_id,
            LaunchApplication.user_id == user_id,
        )
        .first()
    )

    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Launch application not found",
        )

    return serialize_application(application)


@router.get(
    "/applications/{application_id}",
    response_model=LaunchApplicationResponse,
)
def get_launch_application(
    application_id: str,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    user_id = get_user_id(token)

    application = get_owned_launch_application(
        db,
        application_id=application_id,
        user_id=user_id,
    )

    return serialize_application(application)


@router.patch(
    "/applications/{application_id}",
    response_model=LaunchApplicationResponse,
)
def update_launch_application(
    application_id: str,
    payload: LaunchApplicationUpdate,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    user_id = get_user_id(token)

    application = get_owned_launch_application(
        db,
        application_id=application_id,
        user_id=user_id,
    )

    updates = payload.model_dump(exclude_unset=True)

    if "formation_partner_id" in updates:
        partner_id = updates["formation_partner_id"]

        if partner_id:
            formation_partner = (
                db.query(FormationPartner)
                .filter(
                    FormationPartner.id == partner_id,
                    FormationPartner.is_active.is_(True),
                )
                .first()
            )

            if not formation_partner:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Formation partner not found",
                )

    if "bank_partner_id" in updates:
        partner_id = updates["bank_partner_id"]

        if partner_id:
            bank_partner = (
                db.query(BankPartner)
                .filter(
                    BankPartner.id == partner_id,
                    BankPartner.is_active.is_(True),
                )
                .first()
            )

            if not bank_partner:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Banking partner not found",
                )

    string_fields = {
        "country",
        "jurisdiction",
        "business_activity",
        "business_description",
    }

    for field_name, value in updates.items():
        if (
            field_name in string_fields
            and isinstance(value, str)
        ):
            value = value.strip() or None

        setattr(application, field_name, value)

    # Synchronize after every submitted update has been applied.
    synchronize_application_milestones(application)

    if application.status == "completed":
        application.completed_at = (
            application.completed_at
            or datetime.datetime.utcnow()
        )
    elif "status" in updates:
        application.completed_at = None

    try:
        db.commit()

        application = get_owned_launch_application(
            db,
            application_id=application.id,
            user_id=user_id,
        )

        return serialize_application(application)

    except HTTPException:
        db.rollback()
        raise

    except Exception:
        db.rollback()
        raise


@router.patch(
    "/applications/{application_id}/milestones/{milestone_id}",
    response_model=LaunchMilestoneResponse,
)
def update_launch_milestone(
    application_id: str,
    milestone_id: str,
    payload: LaunchMilestoneUpdate,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    user_id = get_user_id(token)

    application = get_owned_launch_application(
        db,
        application_id=application_id,
        user_id=user_id,
    )

    milestone = (
        db.query(LaunchMilestone)
        .filter(
            LaunchMilestone.id == milestone_id,
            LaunchMilestone.launch_application_id
            == application.id,
        )
        .first()
    )

    if not milestone:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Launch milestone not found",
        )

    now = datetime.datetime.utcnow()

    if (
        payload.status != "not_started"
        and milestone.started_at is None
    ):
        milestone.started_at = now

    if payload.status in {"approved", "completed"}:
        milestone.completed_at = now
    else:
        milestone.completed_at = None

    milestone.status = payload.status
    milestone.notes = (
        payload.notes.strip()
        if payload.notes
        else None
    )

    try:
        db.commit()
        db.refresh(milestone)
        return milestone

    except Exception:
        db.rollback()
        raise


@router.get(
    "/formation-partners",
    response_model=list[FormationPartnerResponse],
)
def list_formation_partners(
    country: str | None = Query(default=None),
    jurisdiction: str | None = Query(default=None),
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    get_user_id(token)

    query = db.query(FormationPartner).filter(
        FormationPartner.is_active.is_(True)
    )

    if country:
        query = query.filter(
            FormationPartner.country == country.strip()
        )

    if jurisdiction:
        query = query.filter(
            FormationPartner.jurisdiction
            == jurisdiction.strip()
        )

    return query.order_by(
        FormationPartner.is_verified.desc(),
        FormationPartner.rating.desc().nullslast(),
        FormationPartner.name.asc(),
    ).all()


@router.get(
    "/bank-partners",
    response_model=list[BankPartnerResponse],
)
def list_bank_partners(
    country: str | None = Query(default=None),
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    get_user_id(token)

    query = db.query(BankPartner).filter(
        BankPartner.is_active.is_(True)
    )

    if country:
        query = query.filter(
            BankPartner.country == country.strip()
        )

    return query.order_by(
        BankPartner.is_verified.desc(),
        BankPartner.name.asc(),
    ).all()