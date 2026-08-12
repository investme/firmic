from __future__ import annotations

import datetime
from dataclasses import dataclass

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from models.company import Company
from models.launch import CompanyLaunch


VALID_LAUNCH_STATUSES = {
    "draft",
    "pending_compliance",
    "under_review",
    "provisioning",
    "active",
    "suspended",
}

VALID_OFFICE_STATUSES = {
    "not_selected",
    "reserved",
    "awaiting_compliance",
    "provisioning",
    "active",
    "suspended",
}


@dataclass(frozen=True)
class RequirementDefinition:
    key: str
    label: str
    category: str
    required_field: str | None
    uploaded_field: str
    approved_field: str
    blocking: bool
    action_label: str
    action_href: str


REQUIREMENT_DEFINITIONS: tuple[RequirementDefinition, ...] = (
    RequirementDefinition(
        key="company_profile",
        label="Company Profile",
        category="company",
        required_field=None,
        uploaded_field="company_profile_completed",
        approved_field="company_profile_completed",
        blocking=True,
        action_label="Complete Company Profile",
        action_href="/company",
    ),
        RequirementDefinition(
        key="kyc_questionnaire",
        label="KYC Questionnaire",
        category="kyc",
        required_field="kyc_questionnaire_required",
        uploaded_field="kyc_questionnaire_uploaded",
        approved_field="kyc_questionnaire_approved",
        blocking=True,
        action_label="Upload KYC Questionnaire",
        action_href="/documents?request=kyc_questionnaire",
    ),
    RequirementDefinition(
        key="subscription",
        label="Subscription",
        category="billing",
        required_field=None,
        uploaded_field="subscription_completed",
        approved_field="subscription_completed",
        blocking=True,
        action_label="Review Subscription",
        action_href="/billing",
    ),
    RequirementDefinition(
        key="office_reserved",
        label="Headquarters Reserved",
        category="infrastructure",
        required_field=None,
        uploaded_field="office_reserved",
        approved_field="office_reserved",
        blocking=True,
        action_label="Reserve Headquarters",
        action_href="/my-office",
    ),
    RequirementDefinition(
        key="trade_license",
        label="Trade License",
        category="company_documents",
        required_field="trade_license_required",
        uploaded_field="trade_license_uploaded",
        approved_field="trade_license_approved",
        blocking=True,
        action_label="Upload Trade License",
        action_href="/documents?request=trade_license",
    ),
    RequirementDefinition(
        key="certificate_of_incorporation",
        label="Certificate of Incorporation",
        category="company_documents",
        required_field="certificate_of_incorporation_required",
        uploaded_field="certificate_of_incorporation_uploaded",
        approved_field="certificate_of_incorporation_approved",
        blocking=True,
        action_label="Upload Certificate of Incorporation",
        action_href=(
            "/documents?request=certificate_of_incorporation"
        ),
    ),
    RequirementDefinition(
        key="beneficial_owner_declaration",
        label="Beneficial Owner Declaration",
        category="kyc",
        required_field="beneficial_owner_declaration_required",
        uploaded_field="beneficial_owner_declaration_uploaded",
        approved_field="beneficial_owner_declaration_approved",
        blocking=True,
        action_label="Upload Beneficial Owner Declaration",
        action_href=(
            "/documents?request=beneficial_owner_declaration"
        ),
    ),
    RequirementDefinition(
        key="passport",
        label="Passport or Government ID",
        category="kyc",
        required_field="passport_required",
        uploaded_field="passport_uploaded",
        approved_field="passport_approved",
        blocking=True,
        action_label="Upload Passport",
        action_href="/documents?request=passport",
    ),
    RequirementDefinition(
        key="proof_of_address",
        label="Proof of Residential Address",
        category="kyc",
        required_field="proof_of_address_required",
        uploaded_field="proof_of_address_uploaded",
        approved_field="proof_of_address_approved",
        blocking=True,
        action_label="Upload Proof of Address",
        action_href="/documents?request=proof_of_address",
    ),
    RequirementDefinition(
        key="emirates_id",
        label="Emirates ID",
        category="kyc",
        required_field="emirates_id_required",
        uploaded_field="emirates_id_uploaded",
        approved_field="emirates_id_approved",
        blocking=True,
        action_label="Upload Emirates ID",
        action_href="/documents?request=emirates_id",
    ),
    RequirementDefinition(
        key="admin_review",
        label="Firmic Compliance Approval",
        category="review",
        required_field=None,
        uploaded_field="compliance_submitted",
        approved_field="admin_approved",
        blocking=True,
        action_label="Await Compliance Review",
        action_href="/documents",
    ),
    RequirementDefinition(
        key="infrastructure_provisioning",
        label="Infrastructure Provisioning",
        category="provisioning",
        required_field=None,
        uploaded_field="infrastructure_provisioned",
        approved_field="infrastructure_provisioned",
        blocking=True,
        action_label="View Launch Progress",
        action_href="/launch-center",
    ),
)


def utcnow() -> datetime.datetime:
    return datetime.datetime.utcnow()


def get_company_or_404(
    db: Session,
    company_id: str,
) -> Company:
    company = (
        db.query(Company)
        .filter(Company.id == company_id)
        .first()
    )

    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found.",
        )

    return company


def get_launch_or_404(
    db: Session,
    company_id: str,
) -> CompanyLaunch:
    launch = (
        db.query(CompanyLaunch)
        .filter(CompanyLaunch.company_id == company_id)
        .first()
    )

    if not launch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company launch record not found.",
        )

    return launch


def ensure_company_launch(
    db: Session,
    company: Company,
    *,
    commit: bool = False,
) -> CompanyLaunch:
    launch = (
        db.query(CompanyLaunch)
        .filter(CompanyLaunch.company_id == company.id)
        .first()
    )

    if launch:
        # Emirates ID is mandatory unless the company has
        # explicitly declared that its founder/representative
        # is not a UAE resident.
        launch.emirates_id_required = (
            getattr(company, "is_uae_resident", None) is not False
        )

        synchronize_launch_state(launch)

        if commit:
            db.commit()
            db.refresh(launch)

        return launch

    company_status = str(
        getattr(company, "status", "") or ""
    ).lower()

    launch = CompanyLaunch(
        company_id=company.id,
        status=(
            "active"
            if company_status == "active"
            else "pending_compliance"
        ),
        company_profile_completed=bool(
            getattr(company, "name", None)
        ),
        subscription_completed=False,
        office_status=(
            "reserved"
            if getattr(
                company,
                "headquarters_office_code",
                None,
            )
            else "not_selected"
        ),
        office_reserved=bool(
            getattr(
                company,
                "headquarters_office_code",
                None,
            )
        ),

        # Fail closed:
        # True  -> Emirates ID required.
        # False -> Emirates ID not applicable.
        # None  -> unanswered; keep it required so compliance
        #          cannot accidentally bypass the document.
        emirates_id_required=(
            getattr(company, "is_uae_resident", None) is not False
        ),
    )

    if launch.office_reserved:
        launch.office_status = "awaiting_compliance"

    if company_status == "active":
        launch.admin_approved = True
        launch.compliance_submitted = True
        launch.infrastructure_provisioned = True
        launch.headquarters_provisioned = True
        launch.workspace_provisioned = True
        launch.activated_at = utcnow()
        launch.office_status = "active"

    db.add(launch)
    db.flush()

    synchronize_launch_state(launch)

    if commit:
        db.commit()
        db.refresh(launch)

    return launch


def requirement_is_required(
    launch: CompanyLaunch,
    definition: RequirementDefinition,
) -> bool:
    if definition.required_field is None:
        return True

    value = getattr(
        launch,
        definition.required_field,
        None,
    )

    # SQLAlchemy defaults are applied during INSERT/flush.
    # A transient in-memory model may still contain None.
    # Compliance requirements default to required unless
    # they have been explicitly disabled.
    if value is None:
        return True

    return bool(value)


def requirement_is_uploaded(
    launch: CompanyLaunch,
    definition: RequirementDefinition,
) -> bool:
    return bool(
        getattr(
            launch,
            definition.uploaded_field,
            False,
        )
    )


def requirement_is_approved(
    launch: CompanyLaunch,
    definition: RequirementDefinition,
) -> bool:
    return bool(
        getattr(
            launch,
            definition.approved_field,
            False,
        )
    )


def requirement_status(
    launch: CompanyLaunch,
    definition: RequirementDefinition,
) -> str:
    required = requirement_is_required(
        launch,
        definition,
    )

    if not required:
        return "not_required"

    if requirement_is_approved(
        launch,
        definition,
    ):
        return "approved"

    if requirement_is_uploaded(
        launch,
        definition,
    ):
        return "uploaded"

    return "required"


def build_requirements(
    launch: CompanyLaunch,
) -> list[dict]:
    requirements: list[dict] = []

    for definition in REQUIREMENT_DEFINITIONS:
        required = requirement_is_required(
            launch,
            definition,
        )

        uploaded = requirement_is_uploaded(
            launch,
            definition,
        )

        approved = requirement_is_approved(
            launch,
            definition,
        )

        current_status = requirement_status(
            launch,
            definition,
        )

        action_label = definition.action_label
        action_href = definition.action_href

        if current_status == "approved":
            action_label = None
            action_href = None

        elif current_status == "uploaded":
            action_label = "Awaiting Review"
            action_href = "/documents"

        requirements.append(
            {
                "key": definition.key,
                "label": definition.label,
                "category": definition.category,
                "required": required,
                "uploaded": uploaded,
                "approved": approved,
                "status": current_status,
                "blocking": definition.blocking,
                "action_label": action_label,
                "action_href": action_href,
            }
        )

    return requirements


def calculate_launch_progress(
    launch: CompanyLaunch,
) -> dict:
    requirements = build_requirements(launch)

    applicable = [
        requirement
        for requirement in requirements
        if requirement["required"]
    ]

    completed = [
        requirement
        for requirement in applicable
        if requirement["approved"]
    ]

    total_count = len(applicable)
    completed_count = len(completed)

    progress_percent = (
        round(
            (
                completed_count
                / total_count
            )
            * 100,
            1,
        )
        if total_count
        else 100.0
    )

    next_requirement = next(
        (
            requirement
            for requirement in applicable
            if not requirement["approved"]
        ),
        None,
    )

    compliance_keys = {
        "trade_license",
        "certificate_of_incorporation",
        "beneficial_owner_declaration",
        "passport",
        "proof_of_address",
        "emirates_id",
        "kyc_questionnaire",
    }

    compliance_requirements = [
        requirement
        for requirement in applicable
        if requirement["key"]
        in compliance_keys
    ]

    compliance_uploaded = all(
        requirement["uploaded"]
        or requirement["approved"]
        for requirement in compliance_requirements
    )

    compliance_ready = all(
        requirement["approved"]
        for requirement in compliance_requirements
    )

    foundation_ready = all(
        bool(
            getattr(
                launch,
                field_name,
                False,
            )
        )
        for field_name in (
            "company_profile_completed",
            "subscription_completed",
            "office_reserved",
        )
    )

    provisioning_ready = bool(
        foundation_ready
        and compliance_ready
        and launch.admin_approved
    )

    launch_ready = bool(
        provisioning_ready
        and launch.infrastructure_provisioned
    )

    return {
        "requirements": requirements,
        "progress_percent": progress_percent,
        "completed_requirements": completed_count,
        "total_requirements": total_count,
        "next_step": (
            next_requirement["label"]
            if next_requirement
            else None
        ),
        "next_action_label": (
            next_requirement["action_label"]
            if next_requirement
            else None
        ),
        "next_action_href": (
            next_requirement["action_href"]
            if next_requirement
            else None
        ),
        "compliance_uploaded": compliance_uploaded,
        "compliance_ready": compliance_ready,
        "provisioning_ready": provisioning_ready,
        "launch_ready": launch_ready,
    }


def all_provisioning_complete(
    launch: CompanyLaunch,
) -> bool:
    provisioning_fields = (
        "headquarters_provisioned",
        "mailbox_provisioned",
        "voip_provisioned",
        "ai_workforce_provisioned",
        "workspace_provisioned",
    )

    return all(
        bool(
            getattr(
                launch,
                field_name,
                False,
            )
        )
        for field_name in provisioning_fields
    )


def synchronize_launch_state(
    launch: CompanyLaunch,
) -> CompanyLaunch:
    if launch.status == "suspended":
        launch.office_status = "suspended"
        return launch

    progress = calculate_launch_progress(launch)

    launch.infrastructure_provisioned = (
        all_provisioning_complete(launch)
    )

    if launch.infrastructure_provisioned:
        progress = calculate_launch_progress(launch)

    if progress["launch_ready"]:
        launch.status = "active"
        launch.office_status = "active"
        launch.activated_at = (
            launch.activated_at
            or utcnow()
        )
        launch.suspended_at = None
        launch.suspension_reason = None
        return launch

    if progress["provisioning_ready"]:
        launch.status = "provisioning"
        launch.office_status = (
            "provisioning"
            if launch.office_reserved
            else "not_selected"
        )
        launch.activated_at = None
        return launch

    if progress["compliance_uploaded"]:
        launch.status = "under_review"
        launch.compliance_submitted = True
    else:
        launch.status = "pending_compliance"
        launch.compliance_submitted = False

    if launch.office_reserved:
        launch.office_status = "awaiting_compliance"
    else:
        launch.office_status = "not_selected"

    launch.activated_at = None
    return launch


def get_launch_summary(
    launch: CompanyLaunch,
) -> dict:
    synchronize_launch_state(launch)

    progress = calculate_launch_progress(launch)

    return {
        "company_id": launch.company_id,
        "status": launch.status,
        "office_status": launch.office_status,
        "progress_percent": progress[
            "progress_percent"
        ],
        "completed_requirements": progress[
            "completed_requirements"
        ],
        "total_requirements": progress[
            "total_requirements"
        ],
        "next_step": progress["next_step"],
        "next_action_label": progress[
            "next_action_label"
        ],
        "next_action_href": progress[
            "next_action_href"
        ],
        "compliance_ready": progress[
            "compliance_ready"
        ],
        "provisioning_ready": progress[
            "provisioning_ready"
        ],
        "launch_ready": progress[
            "launch_ready"
        ],
        "requirements": progress[
            "requirements"
        ],
        "rejection_reason": (
            launch.rejection_reason
        ),
        "suspension_reason": (
            launch.suspension_reason
        ),
        "activated_at": launch.activated_at,
        "suspended_at": launch.suspended_at,
        "created_at": launch.created_at,
        "updated_at": launch.updated_at,
    }


def get_requirement_definition(
    requirement_key: str,
) -> RequirementDefinition:
    definition = next(
        (
            item
            for item in REQUIREMENT_DEFINITIONS
            if item.key == requirement_key
        ),
        None,
    )

    if not definition:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                "Launch requirement not found."
            ),
        )

    return definition


def update_launch_requirement(
    launch: CompanyLaunch,
    requirement_key: str,
    *,
    uploaded: bool | None = None,
    approved: bool | None = None,
) -> CompanyLaunch:
    definition = get_requirement_definition(
        requirement_key
    )

    if uploaded is not None:
        setattr(
            launch,
            definition.uploaded_field,
            uploaded,
        )

        if not uploaded:
            setattr(
                launch,
                definition.approved_field,
                False,
            )

    if approved is not None:
        setattr(
            launch,
            definition.approved_field,
            approved,
        )

        if approved:
            setattr(
                launch,
                definition.uploaded_field,
                True,
            )

    if approved is False:
        launch.admin_approved = False

    synchronize_launch_state(launch)
    return launch


def set_office_status(
    launch: CompanyLaunch,
    office_status: str,
) -> CompanyLaunch:
    if office_status not in VALID_OFFICE_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid office status.",
        )

    launch.office_status = office_status

    launch.office_reserved = office_status in {
        "reserved",
        "awaiting_compliance",
        "provisioning",
        "active",
        "suspended",
    }

    if office_status == "active":
        launch.headquarters_provisioned = True

    elif office_status in {
        "not_selected",
        "reserved",
        "awaiting_compliance",
    }:
        launch.headquarters_provisioned = False

    synchronize_launch_state(launch)
    return launch


def review_company_launch(
    launch: CompanyLaunch,
    *,
    approved: bool,
    reviewer_id: str | None = None,
    rejection_reason: str | None = None,
) -> CompanyLaunch:
    progress = calculate_launch_progress(launch)

    if approved and not progress["compliance_ready"]:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "All required compliance documents "
                "must be approved before the company "
                "launch can receive final approval."
            ),
        )

    launch.admin_approved = approved
    launch.admin_approved_by = reviewer_id

    if approved:
        launch.admin_approved_at = utcnow()
        launch.rejection_reason = None
    else:
        launch.admin_approved_at = None
        launch.rejection_reason = (
            rejection_reason
            or "Compliance review was not approved."
        )

    synchronize_launch_state(launch)
    return launch


def update_provisioning(
    launch: CompanyLaunch,
    *,
    headquarters_provisioned: bool | None = None,
    mailbox_provisioned: bool | None = None,
    voip_provisioned: bool | None = None,
    ai_workforce_provisioned: bool | None = None,
    workspace_provisioned: bool | None = None,
) -> CompanyLaunch:
    updates = {
        "headquarters_provisioned": (
            headquarters_provisioned
        ),
        "mailbox_provisioned": mailbox_provisioned,
        "voip_provisioned": voip_provisioned,
        "ai_workforce_provisioned": (
            ai_workforce_provisioned
        ),
        "workspace_provisioned": (
            workspace_provisioned
        ),
    }

    for field_name, value in updates.items():
        if value is not None:
            setattr(
                launch,
                field_name,
                value,
            )

    launch.infrastructure_provisioned = (
        all_provisioning_complete(launch)
    )

    synchronize_launch_state(launch)
    return launch


def suspend_company_launch(
    launch: CompanyLaunch,
    *,
    reason: str,
) -> CompanyLaunch:
    launch.status = "suspended"
    launch.office_status = "suspended"
    launch.suspended_at = utcnow()
    launch.suspension_reason = reason
    return launch


def restore_company_launch(
    launch: CompanyLaunch,
) -> CompanyLaunch:
    launch.suspended_at = None
    launch.suspension_reason = None

    synchronize_launch_state(launch)
    return launch


def can_use_operational_services(
    launch: CompanyLaunch,
) -> bool:
    synchronize_launch_state(launch)
    return launch.status == "active"


def can_use_ai_workforce(
    launch: CompanyLaunch,
) -> bool:
    return bool(
        can_use_operational_services(launch)
        and launch.ai_workforce_provisioned
    )


def can_use_voip(
    launch: CompanyLaunch,
) -> bool:
    return bool(
        can_use_operational_services(launch)
        and launch.voip_provisioned
    )


def can_receive_mail(
    launch: CompanyLaunch,
) -> bool:
    return bool(
        can_use_operational_services(launch)
        and launch.mailbox_provisioned
    )