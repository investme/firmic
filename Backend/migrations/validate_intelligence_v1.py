from pathlib import Path
import py_compile


ROOT = Path(__file__).resolve().parents[1]

FILES = [
    ROOT / "models" / "intelligence.py",
    ROOT / "services" / "intelligence" / "engine.py",
    ROOT / "services" / "intelligence" / "personas.py",
    ROOT / "routes" / "intelligence.py",
    ROOT / "routes" / "sonny_chat.py",
    ROOT / "routes" / "hermes.py",
    ROOT / "main.py",
]

for file_path in FILES:
    py_compile.compile(
        str(file_path),
        doraise=True,
    )

    print(
        "PASS:",
        file_path.relative_to(ROOT),
    )

print(
    "Firmic Intelligence Engine v1 "
    "syntax validation passed."
)
