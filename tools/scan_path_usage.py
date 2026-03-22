from pathlib import Path

root = Path("/home/portallogist")
for p in root.rglob("*.php"):
    sp = str(p)
    if "/vendor/" in sp or "/node_modules/" in sp:
        continue
    try:
        t = p.read_text(errors="ignore")
    except Exception:
        continue
    if "->path(" in t or "request()->path(" in t:
        print(p)
