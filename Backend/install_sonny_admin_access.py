from __future__ import annotations

from pathlib import Path
import shutil
import sys


TARGET = Path("routes/sonny.py")
BACKUP = Path("routes/sonny.py.before-admin-access-fix")

USER_IMPORT = "from firmic_models import User\n"

OLD_HELPER = '''def verify_company_access(
    company_id: str,
    user_id: str,
    db: Session,
) -> Company:
    company = (
        db.query(Company)
        .filter(
            Company.id == company_id,
            Company.user_id == str(user_id),
            Company.status != "terminated",
        )
        .first()
    )

    if not company:
        raise HTTPException(
            status_code=404,
            detail="Company not found or access denied.",
        )

    return company
'''

NEW_HELPER = '''def verify_company_access(
    company_id: str,
    user_id: str,
    db: Session,
) -> Company:
    \"\"\"Allow an active company owner or Firmic administrator.\"\"\"
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
            status_code=404,
            detail="Company not found.",
        )

    user = None

    try:
        normalized_user_id = int(str(user_id))
    except (TypeError, ValueError):
        normalized_user_id = None

    if normalized_user_id is not None:
        user = (
            db.query(User)
            .filter(User.id == normalized_user_id)
            .first()
        )

    is_owner = str(company.user_id) == str(user_id)
    is_admin = bool(
        user
        and str(getattr(user, "role", "") or "").strip().lower()
        == "admin"
    )

    if not is_owner and not is_admin:
        raise HTTPException(
            status_code=403,
            detail="Company access denied.",
        )

    return company
'''


def main() -> int:
    if not TARGET.exists():
        print(
            "ERROR: routes/sonny.py was not found. "
            "Run this script from the Backend directory.",
            file=sys.stderr,
        )
        return 1

    text = TARGET.read_text(encoding="utf-8")

    if NEW_HELPER in text:
        print("Sonny admin workspace access is already installed.")
        return 0

    if OLD_HELPER not in text:
        print(
            "ERROR: The expected verify_company_access helper was not found. "
            "No file was changed.",
            file=sys.stderr,
        )
        return 2

    if "from firmic_models import User" not in text:
        company_import = "from models.company import Company\n"

        if company_import not in text:
            print(
                "ERROR: Company import marker was not found. "
                "No file was changed.",
                file=sys.stderr,
            )
            return 3

        text = text.replace(
            company_import,
            company_import + USER_IMPORT,
            1,
        )

    if not BACKUP.exists():
        shutil.copy2(TARGET, BACKUP)

    text = text.replace(OLD_HELPER, NEW_HELPER, 1)
    TARGET.write_text(text, encoding="utf-8")

    print("SONNY ADMIN WORKSPACE ACCESS FIX INSTALLED")
    print(f"Backup: {BACKUP}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
