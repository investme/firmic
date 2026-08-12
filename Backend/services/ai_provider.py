from __future__ import annotations

import os
from typing import Any

from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()


def get_ai_provider() -> str:
    return (
        os.getenv(
            "FIRMIC_AI_PROVIDER",
            "openrouter",
        )
        .strip()
        .lower()
    )


def get_client() -> OpenAI:
    provider = get_ai_provider()

    if provider == "openrouter":
        api_key = os.getenv(
            "OPENROUTER_API_KEY",
            "",
        ).strip()

        if not api_key:
            raise RuntimeError(
                "OPENROUTER_API_KEY is not configured."
            )

        return OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=api_key,
        )

    if provider == "openai":
        api_key = os.getenv(
            "OPENAI_API_KEY",
            "",
        ).strip()

        if not api_key:
            raise RuntimeError(
                "OPENAI_API_KEY is not configured."
            )

        return OpenAI(
            api_key=api_key,
        )

    raise RuntimeError(
        f"Unsupported Firmic AI provider: {provider}"
    )


def get_agent_model(
    agent_name: str,
) -> str:
    agent = agent_name.strip().upper()

    env_name = (
        f"FIRMIC_{agent}_MODEL"
    )

    configured = os.getenv(
        env_name,
        "",
    ).strip()

    if configured:
        return configured

    provider = get_ai_provider()

    if provider == "openrouter":
        return "openrouter/free"

    return "gpt-5.2"


def run_agent_completion(
    *,
    agent_name: str,
    system_prompt: str,
    user_prompt: str,
    temperature: float = 0.2,
) -> dict[str, Any]:
    client = get_client()
    model = get_agent_model(
        agent_name,
    )

    response = (
        client.chat.completions.create(
            model=model,
            temperature=temperature,
            messages=[
                {
                    "role": "system",
                    "content": system_prompt,
                },
                {
                    "role": "user",
                    "content": user_prompt,
                },
            ],
        )
    )

    message = (
        response.choices[0]
        .message
        .content
        or ""
    ).strip()

    return {
        "provider": get_ai_provider(),
        "model": model,
        "text": message,
    }