from __future__ import annotations

from typing import Any


REQUIRED_COMPLIANCE_DOCUMENTS: list[dict[str, Any]] = [
    {
        "key": "passport",
        "label": "Passport Copy",
        "aliases": [
            "passport",
            "passport copy",
            "owner passport",
            "government id",
        ],
    },
    {
        "key": "proof_of_address",
        "label": "Proof of Address",
        "aliases": [
            "proof of address",
            "address proof",
            "utility bill",
            "bank statement",
            "tenancy contract",
        ],
    },
    {
        "key": "trade_license",
        "label": "Trade License",
        "aliases": [
            "trade license",
            "business license",
            "commercial license",
        ],
    },
    {
        "key": "certificate_of_incorporation",
        "label": "Company Formation Documents",
        "aliases": [
            "company formation",
            "formation documents",
            "incorporation certificate",
            "certificate of incorporation",
            "memorandum",
            "articles of association",
            "incorporation",
        ],
    },
    {
        "key": "beneficial_owner_declaration",
        "label": "Beneficial Owner Declaration",
        "aliases": [
            "beneficial owner",
            "beneficial owner declaration",
            "ubo",
            "ultimate beneficial owner",
            "ownership declaration",
        ],
    },
    {
        "key": "emirates_id",
        "label": "Emirates ID",
        "aliases": [
            "emirates id",
            "emirates_id",
            "uae id",
            "emirates identity card",
        ],
    },
    {
        "key": "kyc_questionnaire",
        "label": "KYC Questionnaire",
        "aliases": [
            "kyc questionnaire",
            "kyc_questionnaire",
            "kyc",
            "know your customer questionnaire",
            "kyc form",
            "kyc submission",
        ],
    },
]


def normalize_compliance_text(value: Any) -> str:
    return " ".join(
        str(value or "")
        .lower()
        .replace("_", " ")
        .replace("-", " ")
        .split()
    )


def requirement_applies_to_company(
    company: Any,
    requirement: dict[str, Any],
) -> bool:
    if requirement.get("key") != "emirates_id":
        return True

    return getattr(
        company,
        "is_uae_resident",
        None,
    ) is not False


def applicable_compliance_requirements(
    company: Any,
) -> list[dict[str, Any]]:
    return [
        requirement
        for requirement in REQUIRED_COMPLIANCE_DOCUMENTS
        if requirement_applies_to_company(
            company,
            requirement,
        )
    ]


def document_matches_requirement(
    document: Any,
    requirement: dict[str, Any],
) -> bool:
    text = normalize_compliance_text(
        f"{getattr(document, 'name', '') or ''} "
        f"{getattr(document, 'type', '') or ''}"
    )

    return any(
        normalize_compliance_text(alias) in text
        for alias in requirement.get("aliases", [])
    )


def compliance_requirement_signals(
    company: Any,
    documents: list[Any],
) -> dict[str, bool]:
    return {
        requirement["key"]: any(
            document_matches_requirement(
                document,
                requirement,
            )
            for document in documents
        )
        for requirement in applicable_compliance_requirements(
            company
        )
    }


def compliance_requirement_labels(
    company: Any,
) -> dict[str, str]:
    return {
        requirement["key"]: requirement["label"]
        for requirement in applicable_compliance_requirements(
            company
        )
    }
