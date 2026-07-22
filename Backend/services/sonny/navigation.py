from __future__ import annotations

import re
from typing import Any


PAGE_MAP: dict[str, dict[str, str]] = {
    "dashboard": {"target": "/dashboard", "label": "Dashboard"},
    "home": {"target": "/dashboard", "label": "Dashboard"},
    "tasks": {"target": "/tasks", "label": "Tasks"},
    "task": {"target": "/tasks", "label": "Tasks"},
    "documents": {"target": "/documents", "label": "Documents"},
    "document center": {"target": "/documents", "label": "Documents"},
    "timeline": {"target": "/timeline", "label": "Timeline"},
    "notifications": {"target": "/notifications", "label": "Notifications"},
    "notification center": {"target": "/notifications", "label": "Notifications"},
    "billing": {"target": "/billing", "label": "Billing"},
    "invoices": {"target": "/billing", "label": "Billing"},
    "reports": {"target": "/reports", "label": "Reports"},
    "executive reports": {"target": "/reports", "label": "Reports"},
    "crm": {"target": "/crm", "label": "CRM"},
    "mailbox": {"target": "/mailbox", "label": "Mailbox"},
    "meeting rooms": {"target": "/meeting-rooms", "label": "Meeting Rooms"},
    "meetings": {"target": "/meeting-rooms", "label": "Meeting Rooms"},
    "ai workforce": {"target": "/ai-workforce", "label": "AI Workforce"},
    "workforce": {"target": "/ai-workforce", "label": "AI Workforce"},
    "hermes": {"target": "/hermes", "label": "Hermes"},
    "sonny": {"target": "/sonny", "label": "Sonny"},
    "settings": {"target": "/settings", "label": "Settings"},
    "integrations": {"target": "/integrations", "label": "Integrations"},
    "microsoft 365": {"target": "/microsoft-365", "label": "Microsoft 365"},
    "office": {"target": "/my-office", "label": "My Office"},
    "my office": {"target": "/my-office", "label": "My Office"},
}

URL_MAP: dict[str, dict[str, str]] = {
    "youtube": {"target": "https://www.youtube.com", "label": "YouTube"},
    "google": {"target": "https://www.google.com", "label": "Google"},
    "github": {"target": "https://github.com", "label": "GitHub"},
    "hub71": {"target": "https://www.hub71.com", "label": "Hub71"},
    "openai": {"target": "https://openai.com", "label": "OpenAI"},
    "microsoft": {"target": "https://www.microsoft.com", "label": "Microsoft"},
}

NAVIGATION_TRIGGERS = (
    "open",
    "go to",
    "take me to",
    "show",
    "display",
    "launch",
    "navigate to",
    "bring me to",
)


def _normalize(message: str) -> str:
    normalized = re.sub(r"[^a-z0-9\s]", " ", message.lower())
    return re.sub(r"\s+", " ", normalized).strip()


def _contains_phrase(message: str, phrase: str) -> bool:
    return bool(re.search(rf"\b{re.escape(phrase)}\b", message))


def _find_destination(
    message: str,
    destination_map: dict[str, dict[str, str]],
) -> dict[str, str] | None:
    # Longest aliases win, so "meeting rooms" is matched before "meetings".
    for alias in sorted(destination_map, key=len, reverse=True):
        if _contains_phrase(message, alias):
            return destination_map[alias]
    return None


def resolve_navigation(message: str) -> dict[str, Any]:
    """Resolve safe, non-destructive browser navigation commands."""
    clean = _normalize(message)
    if not clean:
        return {"has_navigation": False}

    has_trigger = any(_contains_phrase(clean, trigger) for trigger in NAVIGATION_TRIGGERS)
    if not has_trigger:
        return {"has_navigation": False}

    page = _find_destination(clean, PAGE_MAP)
    if page:
        action = {
            "type": "open_page",
            "target": page["target"],
            "label": page["label"],
        }
        return {
            "has_navigation": True,
            "reply": f'Opening {page["label"]}.',
            "speech": f'Opening {page["label"]}.',
            "actions": [action],
        }

    website = _find_destination(clean, URL_MAP)
    if website:
        action = {
            "type": "open_url",
            "target": website["target"],
            "label": website["label"],
        }
        return {
            "has_navigation": True,
            "reply": f'Opening {website["label"]} in a new tab.',
            "speech": f'Opening {website["label"]}.',
            "actions": [action],
        }

    return {"has_navigation": False}
