import sys
from pathlib import Path
from sqlalchemy import text

BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))

REQUIRED = {
    "/health",
    "/ready",
    "/api/auth/login",
    "/api/company/list",
    "/api/offices",
    "/api/sonny/chat",
}

def check_routes():
    import main
    paths = {getattr(r, "path", "") for r in main.app.routes}
    missing = sorted(REQUIRED - paths)
    notifications = any(
        p.startswith("/api/notifications") for p in paths
    )
    if missing or not notifications:
        print("ROUTES=FAIL", missing)
        return False
    print("ROUTES=PASS")
    print("ROUTE_COUNT=" + str(len(paths)))
    return True

def check_database():
    from database import engine
    with engine.connect() as conn:
        value = conn.execute(text("SELECT 1")).scalar()
    if value != 1:
        print("DATABASE=FAIL")
        return False
    print("DATABASE=PASS")
    return True

def check_alembic():
    from alembic.config import Config
    from alembic.script import ScriptDirectory
    from database import engine

    cfg = Config(str(BACKEND / "alembic.ini"))
    cfg.set_main_option(
        "script_location",
        str(BACKEND / "alembic"),
    )

    scripts = ScriptDirectory.from_config(cfg)
    heads = set(scripts.get_heads())

    with engine.connect() as conn:
        rows = conn.execute(
            text("SELECT version_num FROM alembic_version")
        ).fetchall()

    current = {str(row[0]) for row in rows}

    if current != heads:
        print("ALEMBIC=FAIL")
        print("CURRENT=" + ",".join(sorted(current)))
        print("HEADS=" + ",".join(sorted(heads)))
        return False

    print("ALEMBIC=PASS")
    print("ALEMBIC_HEAD=" + ",".join(sorted(heads)))
    return True


def run():
    failures = 0

    for name, check in [
        ("routes", check_routes),
        ("database", check_database),
        ("alembic", check_alembic),
    ]:
        try:
            if not check():
                failures += 1
        except Exception as exc:
            print(
                name.upper()
                + "=FAIL_EXCEPTION "
                + type(exc).__name__
                + ": "
                + str(exc)
            )
            failures += 1

    print("RELEASE_GATE_FAILURE_COUNT=" + str(failures))

    if failures == 0:
        print("RELEASE_GATE=PASS")
        print("DATABASE_MUTATION=NONE")
        return 0

    print("RELEASE_GATE=FAIL")
    return 1


if __name__ == "__main__":
    raise SystemExit(run())
