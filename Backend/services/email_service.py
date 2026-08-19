from __future__ import annotations

import html
import os

import resend


def email_is_configured() -> bool:
    return bool(os.getenv("RESEND_API_KEY", "").strip())


def send_company_activation_email(
    *,
    recipient_email: str,
    recipient_name: str | None,
    company_name: str,
    company_id: str,
) -> dict:
    """
    Send the tenant notification after Firmic has successfully
    activated and unlocked the company.

    This service must be called only AFTER the activation
    transaction has committed. Email delivery must never be
    allowed to roll back company activation.
    """

    api_key = os.getenv("RESEND_API_KEY", "").strip()

    if not api_key:
        return {
            "sent": False,
            "reason": "RESEND_API_KEY is not configured",
        }

    resend.api_key = api_key

    sender = os.getenv(
        "FIRMIC_EMAIL_FROM",
        "Firmic <notifications@firmic.io>",
    ).strip()

    login_url = os.getenv(
        "FIRMIC_LOGIN_URL",
        "https://firmic.io/login",
    ).strip()

    safe_name = html.escape(
        (recipient_name or "there").strip()
    )
    safe_company = html.escape(company_name.strip())
    safe_login_url = html.escape(
        login_url,
        quote=True,
    )

    subject = f"{company_name} is now active on Firmic"

    body = f"""
    <div style="
        font-family:Arial,Helvetica,sans-serif;
        max-width:640px;
        margin:0 auto;
        color:#111827;
        line-height:1.6;
    ">
        <div style="padding:32px 0 18px;">
            <div style="
                font-size:13px;
                font-weight:700;
                letter-spacing:1.5px;
                color:#7c3aed;
            ">
                FIRMIC
            </div>

            <h1 style="
                font-size:30px;
                line-height:1.2;
                margin:12px 0;
            ">
                Your company is now active.
            </h1>
        </div>

        <p>Hello {safe_name},</p>

        <p>
            Great news. <strong>{safe_company}</strong>
            has successfully completed Firmic's compliance
            review and has been approved for activation.
        </p>

        <p>
            Your Firmic company workspace and operating
            services are now unlocked and ready to use.
        </p>

        <div style="margin:32px 0;">
            <a
                href="{safe_login_url}"
                style="
                    display:inline-block;
                    background:#7c3aed;
                    color:#ffffff;
                    text-decoration:none;
                    padding:14px 24px;
                    border-radius:10px;
                    font-weight:700;
                "
            >
                Open My Company
            </a>
        </div>

        <p>
            You can now sign in to Firmic and access your
            company workspace, headquarters, AI workforce,
            communications, billing, documents, and
            operational services.
        </p>

        <p>
            Welcome to Firmic.
        </p>

        <p style="margin-top:28px;">
            Firmic<br>
            <span style="color:#6b7280;">
                The Operating System for AI-Native Companies
            </span>
        </p>
    </div>
    """

    params = {
        "from": sender,
        "to": [recipient_email],
        "subject": subject,
        "html": body,
    }

    result = resend.Emails.send(
        params,
        {
            "idempotencyKey":
                f"company-activation/{company_id}"
        },
    )

    return {
        "sent": True,
        "email_id": (
            result.get("id")
            if isinstance(result, dict)
            else getattr(result, "id", None)
        ),
    }
