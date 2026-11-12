from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit, unquote

root = Path(__file__).resolve().parents[1]
out = root / "out"
class Links(HTMLParser):
    def handle_starttag(self, tag, attrs):
        for key, value in attrs:
            if key in ("href", "src") and value:
                parts = urlsplit(value)
                if parts.scheme or parts.netloc or not parts.path.startswith("/"):
                    continue
                target = out / unquote(parts.path).lstrip("/")
                assert target.is_file() or (target / "index.html").is_file(), f"Broken asset/link: {value}"

pages = list(out.rglob("*.html"))
assert pages, "No exported pages"
for page in pages:
    Links().feed(page.read_text())
commands = ["pair", "send", "devices", "default", "rename", "unlink", "status", "upgrade"]
for command in commands:
    assert (out / "reference" / command / "index.html").is_file(), command
assert (out / "_pagefind" / "pagefind.js").is_file(), "Missing local search"
assert (out / "404.html").is_file(), "Missing real 404 page"
print(f"PASS: {len(pages)} static pages, all command references, local links/assets, search and 404")
