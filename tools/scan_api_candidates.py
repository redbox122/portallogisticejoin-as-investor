from pathlib import Path

root = Path("/home/portallogist")
for p in root.rglob("api.php"):
    sp = str(p)
    if "/vendor/" in sp:
        continue
    try:
        t = p.read_text(errors="ignore")
    except Exception:
        continue
    if "Hello API" in t or "Route::get('/health'" in t:
        print(f"=== {p} ===")
        print(f"has contracts route: {'contracts' in t}")
        print(f"has admin users: {'admin/users' in t}")
