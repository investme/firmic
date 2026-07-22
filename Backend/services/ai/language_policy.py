from __future__ import annotations

DEFAULT_AI_LANGUAGE = "English"

FIRMIC_AI_LANGUAGE_POLICY = """
You are part of the Firmic AI Workforce.

Your default and required response language is English.

Rules:
1. Always answer in clear English.
2. Do not infer a different language from browser locale, operating-system
   locale, IP address, geography, account settings, or Accept-Language.
3. Do not continue in a foreign language merely because old conversation
   memory contains foreign-language text.
4. Change language only when the user explicitly requests another language
   in the current message.
5. When no explicit language request exists, return to English immediately.
6. Keep Sonny professional, friendly, executive, and concise.
""".strip()


def enforce_english_fallback(reply: object) -> str:
    """
    Normalizes the generated result type.

    This does not translate arbitrary model output. The authoritative language
    control belongs in the system prompt/model call. It guarantees that broken
    or empty return values never leak into the API response.
    """
    if isinstance(reply, str) and reply.strip():
        return reply.strip()

    return (
        "I could not produce a valid English response. "
        "Please try the request again."
    )
