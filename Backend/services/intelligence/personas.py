from __future__ import annotations

VOICE_PROFILES = {
    "hermes": {
        "agent": "hermes",
        "display_name": "Hermes",
        "title": "Chief Compliance Officer",
        "voice_gender": "female",
        "voice_style": "calm_professional_natural",
        "accent": "neutral_international",
    },
    "sonny": {
        "agent": "sonny",
        "display_name": "Sonny",
        "title": "Chief Operating Officer",
        "voice_gender": "male",
        "voice_style": "calm_executive_natural",
        "accent": "neutral_international",
    },
}


def get_voice_profile(agent: str) -> dict:
    return dict(VOICE_PROFILES[str(agent).strip().lower()])


def hermes_spoken_message(company_name: str, launch_summary: dict) -> str:
    requirements = launch_summary.get("requirements") or []
    missing = [
        item.get("label") or item.get("key")
        for item in requirements
        if item.get("required")
        and item.get("category") in {"company_documents", "kyc"}
        and not (item.get("uploaded") or item.get("approved"))
    ]
    waiting = [
        item.get("label") or item.get("key")
        for item in requirements
        if item.get("required")
        and item.get("category") in {"company_documents", "kyc"}
        and item.get("uploaded")
        and not item.get("approved")
    ]
    status = str(launch_summary.get("status") or "").lower()

    if status == "active":
        return (
            f"Congratulations. The compliance review for {company_name} is complete "
            "and your company is now active. I'll hand you over to Sonny, your Chief "
            "Operating Officer, who will guide you through your Firmic workspace."
        )
    if missing:
        return (
            f"Hello. I'm Hermes, Firmic's Chief Compliance Officer. "
            f"I still need {', '.join(missing)} before I can complete your review."
        )
    if waiting:
        return (
            f"Hello. I'm Hermes. I've received the compliance package for {company_name}. "
            "Your documents are with Firmic for verification. You don't need to do "
            "anything else unless I request additional information."
        )
    if launch_summary.get("compliance_ready"):
        return (
            f"The compliance documents for {company_name} have been verified. "
            "Firmic is completing final approval and provisioning."
        )
    return (
        f"I'm Hermes. The current next step for {company_name} is "
        f"{launch_summary.get('next_step') or 'the remaining onboarding requirement'}."
    )


def sonny_handoff_spoken_message(company_name: str) -> str:
    return (
        f"Welcome aboard. I'm Sonny, your Chief Operating Officer. Hermes has completed "
        f"the compliance handoff for {company_name}. Your company is active, and from "
        "here I'll help coordinate your workspace, AI workforce, and operations."
    )
