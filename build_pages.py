"""Write a copy of site/index.html for every page path, so GitHub Pages serves each with a 200.

    python3 build_pages.py

The site is one page that draws itself from location.pathname (render() in app.js).
GitHub Pages serves /calendar from calendar.html and /routes/<id> from
routes/<id>.html; anything else gets 404.html, also a copy. Run at deploy only; the
copies are not committed.
"""

import csv
import shutil
from pathlib import Path

SITE = Path(__file__).resolve().parent / "site"
# Keep in step with render() in app.js.
PAGES = [
    "about",
    "routes",
    "calendar",
    "lighting",
    "brevets",
    "awards",
    "waterfalls",
    "rider-info",
]


def main() -> None:
    index = SITE / "index.html"
    with open(SITE / "content" / "routes.csv", newline="", encoding="utf-8") as f:
        ids = [r["id"].strip() for r in csv.DictReader(f) if r["id"].strip()]
    paths = ["404", *PAGES, *(f"routes/{i}" for i in ids)]
    for p in paths:
        out = SITE / f"{p}.html"
        out.parent.mkdir(exist_ok=True)
        shutil.copyfile(index, out)
    print(f"wrote {len(paths)} page copies of index.html")


if __name__ == "__main__":
    main()
