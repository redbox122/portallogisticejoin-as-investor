from pathlib import Path

root = Path("/home/portallogist")
needles = [
    "Not Found",
    "\"path\"",
    "'path'",
]

for p in root.rglob("*.php"):
    sp = str(p)
    if "/vendor/" in sp or "/node_modules/" in sp:
        continue
    try:
        text = p.read_text(errors="ignore")
    except Exception:
        continue
    if "Not Found" in text and ("'path'" in text or '"path"' in text):
        print(p)
