from __future__ import annotations

import re
from typing import Any

from sqlalchemy.orm import Session

from models.sonny_knowledge import SonnyCompanyKnowledge


KNOWLEDGE_FIELDS = (
    "company_summary",
    "mission",
    "vision",
    "industry",
    "products",
    "services",
    "pricing",
    "communication_style",
    "sales_pitch",
    "founder_notes",
    "company_rules",
    "operating_procedures",
    "faq",
)

SECTION_ALIASES = {
    "company_summary": {"company summary", "overview", "about", "company"},
    "mission": {"mission"},
    "vision": {"vision"},
    "industry": {"industry", "sector"},
    "products": {"products", "product"},
    "services": {"services", "service"},
    "pricing": {"pricing", "prices", "price list", "plans"},
    "communication_style": {"communication style", "tone", "brand voice"},
    "sales_pitch": {"sales pitch", "pitch", "value proposition"},
    "founder_notes": {"founder notes", "notes"},
    "company_rules": {"company rules", "rules", "policies"},
    "operating_procedures": {
        "operating procedures",
        "procedures",
        "sops",
        "sop",
    },
    "faq": {"faq", "faqs", "frequently asked questions"},
}


def _clean(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def get_company_knowledge(
    db: Session,
    *,
    company_id: str,
) -> SonnyCompanyKnowledge | None:
    return (
        db.query(SonnyCompanyKnowledge)
        .filter(SonnyCompanyKnowledge.company_id == company_id)
        .first()
    )


def get_or_create_company_knowledge(
    db: Session,
    *,
    company_id: str,
) -> SonnyCompanyKnowledge:
    knowledge = get_company_knowledge(db, company_id=company_id)
    if knowledge:
        return knowledge

    knowledge = SonnyCompanyKnowledge(company_id=company_id)
    db.add(knowledge)
    db.commit()
    db.refresh(knowledge)
    return knowledge


def update_company_knowledge(
    db: Session,
    *,
    company_id: str,
    values: dict[str, Any],
) -> SonnyCompanyKnowledge:
    knowledge = get_or_create_company_knowledge(
        db,
        company_id=company_id,
    )

    for field in KNOWLEDGE_FIELDS:
        if field in values:
            setattr(knowledge, field, _clean(values[field]))

    db.add(knowledge)
    db.commit()
    db.refresh(knowledge)
    return knowledge


def _normalize_heading(text: str) -> str:
    text = re.sub(r"^[#*\-\s]+", "", text.strip().lower())
    text = re.sub(r"[:\s]+$", "", text)
    return text


def parse_imported_knowledge(raw_text: str) -> dict[str, str]:
    """Parse simple titled sections without requiring an AI provider."""
    lines = raw_text.replace("\r\n", "\n").split("\n")
    alias_to_field = {
        alias: field
        for field, aliases in SECTION_ALIASES.items()
        for alias in aliases
    }

    sections: dict[str, list[str]] = {}
    current_field: str | None = None

    for line in lines:
        candidate = _normalize_heading(line)
        matched_field = alias_to_field.get(candidate)

        if matched_field:
            current_field = matched_field
            sections.setdefault(current_field, [])
            continue

        if current_field is not None:
            sections[current_field].append(line)

    parsed = {
        field: "\n".join(content).strip()
        for field, content in sections.items()
        if "\n".join(content).strip()
    }

    if not parsed:
        parsed["founder_notes"] = raw_text.strip()

    return parsed


def import_company_knowledge(
    db: Session,
    *,
    company_id: str,
    raw_text: str,
    replace_existing_import: bool = False,
) -> tuple[SonnyCompanyKnowledge, list[str]]:
    knowledge = get_or_create_company_knowledge(
        db,
        company_id=company_id,
    )
    parsed = parse_imported_knowledge(raw_text)
    updated_fields: list[str] = []

    for field, incoming in parsed.items():
        existing = _clean(getattr(knowledge, field, None))
        if existing:
            setattr(knowledge, field, f"{existing}\n\n{incoming}")
        else:
            setattr(knowledge, field, incoming)
        updated_fields.append(field)

    previous_import = _clean(knowledge.imported_source_text)
    if previous_import and not replace_existing_import:
        knowledge.imported_source_text = f"{previous_import}\n\n--- IMPORT ---\n\n{raw_text.strip()}"
    else:
        knowledge.imported_source_text = raw_text.strip()

    db.add(knowledge)
    db.commit()
    db.refresh(knowledge)
    return knowledge, updated_fields


def build_knowledge_prompt_context(
    knowledge: SonnyCompanyKnowledge | None,
) -> str:
    if knowledge is None:
        return "No structured company knowledge has been saved yet."

    labels = {
        "company_summary": "Company summary",
        "mission": "Mission",
        "vision": "Vision",
        "industry": "Industry",
        "products": "Products",
        "services": "Services",
        "pricing": "Pricing",
        "communication_style": "Communication style",
        "sales_pitch": "Sales pitch",
        "founder_notes": "Founder notes",
        "company_rules": "Company rules",
        "operating_procedures": "Operating procedures",
        "faq": "FAQ",
    }

    blocks = []
    for field in KNOWLEDGE_FIELDS:
        value = _clean(getattr(knowledge, field, None))
        if value:
            blocks.append(f"## {labels[field]}\n{value}")

    return "\n\n".join(blocks) or "No structured company knowledge has been saved yet."
