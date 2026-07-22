from pathlib import Path
import shutil
import sys


TARGET = Path("routes/sonny.py")
BACKUP = Path("routes/sonny.py.before-admin-access-fix")


def main() -> int:
    if not BACKUP.exists():
        print(
            "ERROR: Backup file was not found. Nothing was changed.",
            file=sys.stderr,
        )
        return 1

    shutil.copy2(BACKUP, TARGET)
    print("Original Sonny route restored.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
