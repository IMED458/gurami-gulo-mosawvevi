"""Stamps a fresh build id into index.html and admin.html (run by the
pre-commit hook in .githooks/). The pages compare their own id against the
live one on every open and reload when they are stale — Messenger and
Instagram's in-app browsers otherwise keep showing an old cached copy."""
import pathlib, re, time

ROOT = pathlib.Path(__file__).resolve().parent.parent
stamp = time.strftime("%Y%m%d%H%M%S")
for name in ("index.html", "admin.html"):
    p = ROOT / name
    s = p.read_text(encoding="utf-8")
    s = re.sub(r'(<meta name="build" content=")[^"]*(")', rf"\g<1>{stamp}\g<2>", s)
    s = re.sub(r'(src="assets/js/[a-z-]+\.js)(\?v=[^"]*)?(")', rf"\g<1>?v={stamp}\g<3>", s)
    p.write_text(s, encoding="utf-8")
print("build", stamp)
