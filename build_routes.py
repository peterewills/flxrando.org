"""Check the flxrando content files and fetch RideWithGPS stats for every mapped route.

    python3 flxrando/build_routes.py

Reads site/content/{locations,routes,rides}.csv. Writes site/content/route_stats.json:
distance, climbing and unpaved share per RideWithGPS route id, fetched only for ids not
already in the file. Exits non-zero, listing every problem in plain English, when a
content file has an error, so a bad edit fails the deploy instead of breaking the site.
"""

import csv
import json
import re
import sys
import urllib.request
from datetime import date
from pathlib import Path

CONTENT = Path(__file__).resolve().parent / "site" / "content"
STATS = CONTENT / "route_stats.json"
RWGPS = re.compile(r"ridewithgps\.com/routes/(\d+)")
URL = re.compile(r"^https?://\S+$")
TIME = re.compile(r"^(\d{1,2}:\d{2} (AM|PM)|TBD|Evening|Team choice)$")

COLUMNS = {
    "locations.csv": ["key", "town", "spot", "map"],
    "routes.csv": [
        "id",
        "name",
        "start",
        "maps",
        "km",
        "rusa",
        "perm",
        "cues",
        "description",
        "note",
    ],
    "rides.csv": [
        "date",
        "time",
        "route",
        "name",
        "km",
        "start",
        "type",
        "fee",
        "ebrevet",
        "link",
        "note",
    ],
}


def read(name: str, problems: list[str]) -> list[dict]:
    """Rows of one content file, with a problem logged for wrong headers."""
    with open(CONTENT / name, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        if reader.fieldnames != COLUMNS[name]:
            problems.append(
                f"{name}: the header row must be exactly: {','.join(COLUMNS[name])}"
            )
            return []
        return [
            {k: (v or "").strip() for k, v in row.items()}
            for row in reader
            if any((v or "").strip() for v in row.values())
        ]


def map_ids(maps: str) -> list[str]:
    """RideWithGPS ids in a routes.csv `maps` cell ("Loop 1: <link>; Loop 2: <link>")."""
    return RWGPS.findall(maps)


def check(locations, routes, rides, problems):
    """Log every content error."""
    keys = {loc["key"] for loc in locations}
    for i, loc in enumerate(locations, start=2):
        if not re.fullmatch(r"[A-Za-z0-9]+", loc["key"]):
            problems.append(
                f"locations.csv line {i}: key '{loc['key']}' must be one word"
            )
        if loc["map"] and not URL.match(loc["map"]):
            problems.append(f"locations.csv line {i}: map is not a link")

    ids = set()
    for i, r in enumerate(routes, start=2):
        where = f"routes.csv line {i} ({r['name'] or r['id']})"
        if not re.fullmatch(r"[a-z0-9-]+", r["id"]):
            problems.append(f"{where}: id must be lowercase letters, digits and dashes")
        if r["id"] in ids:
            problems.append(f"{where}: id '{r['id']}' is used twice")
        ids.add(r["id"])
        if not r["name"]:
            problems.append(f"{where}: name is empty")
        for part in filter(None, (p.strip() for p in r["maps"].split(";"))):
            if not RWGPS.search(part):
                problems.append(
                    f"{where}: '{part}' in maps is not a RideWithGPS route link"
                )
        if not r["maps"] and not r["km"]:
            problems.append(f"{where}: a route with no map needs a km")
        for col in ("km", "rusa", "perm"):
            if r[col] and not r[col].isdigit():
                problems.append(f"{where}: {col} must be a whole number")
        for cue in filter(None, (c.strip() for c in r["cues"].split(";"))):
            if not URL.match(cue):
                problems.append(f"{where}: cue sheet '{cue}' is not a link")
        bad_start(r["start"], keys, where, problems, required=True)

    for i, ride in enumerate(rides, start=2):
        where = f"rides.csv line {i} ({ride['date']})"
        try:
            date.fromisoformat(ride["date"])
        except ValueError:
            problems.append(
                f"rides.csv line {i}: date '{ride['date']}' must look like 2026-05-30"
            )
        if not TIME.match(ride["time"]):
            problems.append(
                f"{where}: time '{ride['time']}' must look like 7:30 AM"
                " (or TBD, Evening, Team choice)"
            )
        if ride["route"]:
            if ride["route"] not in ids:
                problems.append(
                    f"{where}: route '{ride['route']}' is not an id in routes.csv"
                )
        elif not (ride["name"] and ride["km"]):
            problems.append(f"{where}: give either a route, or a name and a km")
        if ride["km"] and not ride["km"].isdigit():
            problems.append(f"{where}: km must be a whole number")
        bad_start(ride["start"], keys, where, problems, required=False)
        if not ride["type"]:
            problems.append(f"{where}: type is empty")
        for col in ("ebrevet", "link"):
            if ride[col] and not URL.match(ride[col]):
                problems.append(f"{where}: {col} is not a link")


def bad_start(start, keys, where, problems, required):
    """Log a start that is neither a locations.csv key nor a "Town, ST"."""
    if not start:
        if required:
            problems.append(f"{where}: start is empty")
    elif start not in keys and "," not in start:
        problems.append(
            f"{where}: start '{start}' is neither a key in locations.csv"
            " nor a place like 'Tully, NY'"
        )


def fetch(rid: str) -> dict:
    """Distance, climbing and unpaved share of one public RideWithGPS route."""
    req = urllib.request.Request(
        f"https://ridewithgps.com/routes/{rid}.json",
        headers={"Accept": "application/json", "User-Agent": "flxrando-build"},
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        r = json.load(resp)
    r = r.get("route", r)
    return {
        "m": round(r["distance"]),
        "gain_m": round(r.get("elevation_gain") or 0),
        "unpaved_pct": r.get("unpaved_pct") or 0,
    }


def main() -> int:
    problems: list[str] = []
    locations = read("locations.csv", problems)
    routes = read("routes.csv", problems)
    rides = read("rides.csv", problems)
    check(locations, routes, rides, problems)

    stats = json.loads(STATS.read_text()) if STATS.exists() else {}
    wanted = {rid for r in routes for rid in map_ids(r["maps"])}
    for rid in sorted(wanted - stats.keys()):
        try:
            stats[rid] = fetch(rid)
            print(f"fetched RideWithGPS route {rid}")
        except Exception as e:  # noqa: BLE001 - reported to the editor as-is
            problems.append(
                f"could not read RideWithGPS route {rid} ({e}); is it public?"
            )
    stats = {k: stats[k] for k in sorted(stats, key=int) if k in wanted}
    STATS.write_text(json.dumps(stats, indent=1) + "\n")

    if problems:
        print("The site was not updated. Fix these in flxrando/site/content:")
        print("\n".join(f"  - {p}" for p in problems))
        return 1
    print(
        f"ok: {len(locations)} locations, {len(routes)} routes, {len(rides)} rides,"
        f" {len(stats)} maps"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
