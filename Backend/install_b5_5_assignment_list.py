from pathlib import Path
import shutil
import sys


TARGET = Path("routes/sonny.py")
BACKUP = Path("routes/sonny.py.before-b5-5-assignment-list")

ROUTE = r"""

@router.get(
    "/company/{company_id}/orchestrations/{run_id}/assignments"
)
def list_sonny_orchestration_assignments(
    company_id: str,
    run_id: str,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    verify_company_access(
        company_id,
        str(token.get("sub") or ""),
        db,
    )

    run = resolve_orchestration_run_or_404(
        db,
        company_id=company_id,
        run_id=run_id,
    )

    assignments = (
        db.query(SonnyAgentAssignment)
        .filter(
            SonnyAgentAssignment.orchestration_run_id == run.id
        )
        .order_by(SonnyAgentAssignment.created_at.asc())
        .all()
    )

    return {
        "company_id": company_id,
        "run_id": run.id,
        "count": len(assignments),
        "assignments": [
            serialize_assignment(assignment)
            for assignment in assignments
        ],
    }
"""


def main() -> int:
    if not TARGET.exists():
        print(
            "ERROR: routes/sonny.py was not found. "
            "Run this from the Backend directory.",
            file=sys.stderr,
        )
        return 1

    text = TARGET.read_text(encoding="utf-8")

    marker = '"/company/{company_id}/orchestrations/{run_id}/assignments"\n)'

    if "def list_sonny_orchestration_assignments(" in text:
        print("B.5.5 assignment-list endpoint is already installed.")
        return 0

    required = [
        "SonnyAgentAssignment",
        "serialize_assignment",
        "resolve_orchestration_run_or_404",
    ]

    missing = [item for item in required if item not in text]

    if missing:
        print(
            "ERROR: Missing B.5.4 symbols: " + ", ".join(missing),
            file=sys.stderr,
        )
        print("No file was changed.", file=sys.stderr)
        return 2

    if not BACKUP.exists():
        shutil.copy2(TARGET, BACKUP)

    TARGET.write_text(text.rstrip() + ROUTE + "\n", encoding="utf-8")

    print("B.5.5 ASSIGNMENT LIST ENDPOINT INSTALLED")
    print(f"Backup: {BACKUP}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
