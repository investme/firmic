from pathlib import Path
import shutil
import sys


TARGET = Path("routes/sonny.py")
BACKUP = Path("routes/sonny.py.before-b5-5-assignment-list")


if not BACKUP.exists():
    print("ERROR: Backup not found.", file=sys.stderr)
    raise SystemExit(1)

shutil.copy2(BACKUP, TARGET)
print("Original Sonny route restored.")
