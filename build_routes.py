"""Check the flxrando content files, fetch RideWithGPS stats and the RUSA event list.

    python3 flxrando/build_routes.py

Reads site/content/{locations,routes,rides}.csv. Writes two files the site loads:

- site/content/route_stats.json: distance, climbing and unpaved share per RideWithGPS
  route id, fetched only for ids not already in the file.
- site/content/rides.json: the calendar. RUSA's event list for our region is the source
  for which rides exist and their date, type and distance; rides.csv adds local details
  (start time, fee, links, notes) to individual RUSA events. Upcoming rides with a
  randonneuring.org event page are checked against it.

Exits non-zero, listing every problem in plain English, when a content file has an
error, so a bad edit fails the deploy instead of breaking the site.
"""

import csv
import html
import json
import re
import sys
import urllib.parse
import urllib.request
from datetime import date, datetime
from pathlib import Path

CONTENT = Path(__file__).resolve().parent / "site" / "content"
STATS = CONTENT / "route_stats.json"
RIDES = CONTENT / "rides.json"
RWGPS = re.compile(r"ridewithgps\.com/routes/(\d+)")
URL = re.compile(r"^https?://\S+$")
PAGE = re.compile(r"^#/[a-z0-9-]+$")  # a page on this site, e.g. #/waterfalls
TIME = re.compile(r"^(\d{1,2}:\d{2} (AM|PM)|TBD|Evening|Team choice)$")

RUSA_SEARCH = "https://rusa.org/cgi-bin/eventsearch_PF.pl"
RUSA_REGION = "30"  # NY: Central/Western

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
        "km",
        "route",
        "time",
        "finish_time",
        "start",
        "finish",
        "fee",
        "ebrevet",
        "link",
        "description",
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
        if not ride["km"].isdigit():
            problems.append(f"{where}: km must be the RUSA distance, a whole number")
        if ride["route"] and ride["route"] not in ids:
            problems.append(
                f"{where}: route '{ride['route']}' is not an id in routes.csv"
            )
        for col in ("time", "finish_time"):
            if ride[col] and not TIME.match(ride[col]):
                problems.append(
                    f"{where}: {col} '{ride[col]}' must look like 7:30 AM"
                    " (or TBD, Evening, Team choice)"
                )
        bad_start(ride["start"], keys, where, problems, required=False)
        bad_start(ride["finish"], keys, where, problems, required=False)
        if ride["ebrevet"] and not URL.match(ride["ebrevet"]):
            problems.append(f"{where}: ebrevet is not a link")
        if ride["link"] and not (URL.match(ride["link"]) or PAGE.match(ride["link"])):
            problems.append(
                f"{where}: link is not a link or a page on this site like #/waterfalls"
            )


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


def text(cell: str) -> str:
    return " ".join(html.unescape(re.sub(r"<[^>]+>", " ", cell)).split())


def fetch_rusa() -> list[dict]:
    """Our region's events from RUSA's event search: upcoming, plus recent past ones.

    Each result row is <TR eid=...> with cells: region, type, date, distance,
    climbing, route, start location, web site.
    """
    form = {"region": RUSA_REGION, "reg_type": "exact", "include_pending": "1"}
    form |= {"start_location": "1", "sortby": "date", "submit": "search"}
    req = urllib.request.Request(
        RUSA_SEARCH,
        data=urllib.parse.urlencode(form).encode(),
        headers={"User-Agent": "flxrando-build"},
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        page = resp.read().decode("utf-8", errors="replace")
    events = []
    for eid, row in re.findall(r'<TR[^>]*\beid="(\d+)"[^>]*>(.*?)</TR>', page, re.S):
        cells = re.findall(r"<TD[^>]*>(.*?)</TD>", row, re.S)
        if len(cells) < 7:
            raise ValueError(f"RUSA event {eid} has {len(cells)} columns, expected 8")
        rtid = re.search(r"rtid=(\d+)", cells[5])
        events.append(
            {
                "eid": eid,
                # Type and distance cells carry extra notes (gravel rules, unpaved
                # km) after the first tag.
                "type": text(cells[1].split("<")[0]),
                "date": text(cells[2]).replace("/", "-"),
                "km": int(text(cells[3].split("<")[0])),
                "rtid": rtid.group(1) if rtid else "",
                # Unrouted events (team rides) give "Name<br>Town, ST" here.
                "name": text(cells[5].split("<br>")[0]),
                "rusa_start": text(cells[6]),
            }
        )
    if not events:
        raise ValueError("no events found; has the RUSA page layout changed?")
    return events


def default_fee(km: int) -> str:
    """Club fee by distance; rides.csv `fee` overrides it."""
    if km < 200:
        return "Free"
    if km < 300:
        return "$10"
    if km < 360:
        return "$20"
    if km < 400:
        return "$36"
    if km <= 600:
        return "$25"
    return "TBD"


def calendar(events, routes, rides, problems) -> list[dict]:
    """RUSA events joined to our routes and to the local details in rides.csv.

    A rides.csv row names its event by date and km. When two events share both, the
    row's route picks one; a row with no route then picks the event with no route.
    """
    by_rusa = {r["rusa"]: r["id"] for r in routes if r["rusa"]}
    for e in events:
        e["route"] = by_rusa.get(e["rtid"], "")
        if e["rtid"] and not e["route"]:
            print(
                f"note: RUSA route {e['rtid']} ({e['name']}, {e['date']}) is not in"
                " routes.csv; the calendar shows RUSA's name for it"
            )
    extras = {}
    for i, ride in enumerate(rides, start=2):
        where = f"rides.csv line {i} ({ride['date']}, {ride['km']} km)"
        same = [
            e
            for e in events
            if e["date"] == ride["date"] and str(e["km"]) == ride["km"]
        ]
        if len(same) > 1:
            same = [e for e in same if e["route"] == ride["route"]]
        if not same:
            problems.append(
                f"{where}: no RUSA event on that date with that distance"
                f"{' and route' if ride['route'] else ''}. Was it moved or cancelled?"
            )
        elif len(same) > 1:
            problems.append(
                f"{where}: several RUSA events match; add the route to tell them apart"
            )
        elif same[0]["eid"] in extras:
            problems.append(f"{where}: another line already describes this event")
        else:
            extras[same[0]["eid"]] = ride
    out = []
    for e in sorted(events, key=lambda e: (e["date"], e["km"])):
        x = extras.get(e["eid"], {})
        keep = (
            "time",
            "finish_time",
            "start",
            "finish",
            "ebrevet",
            "link",
            "description",
            "note",
        )
        out.append(
            {k: e[k] for k in ("eid", "date", "type", "km", "route", "name")}
            | {"rusa_start": e["rusa_start"]}
            | {k: x.get(k, "") for k in keep}
            | {"fee": x.get("fee") or default_fee(e["km"])}
        )
    return out


def event_page_field(page: str, label: str) -> str:
    """One value from the table on a randonneuring.org event page, or ""."""
    m = re.search(rf"<TD>{label}</TD>\s*<TD>(.*?)</TD>", page, re.S)
    return text(m.group(1)) if m else ""


def check_event_pages(cal, routes, locations, problems):
    """Log where an upcoming ride disagrees with its randonneuring.org event page.

    Compares date, start time, start town, distance and the RideWithGPS route. The
    event page's cue sheets are hosted there, so they cannot be compared by link.
    """
    routes = {r["id"]: r for r in routes}
    towns = {loc["key"]: loc["town"] for loc in locations}
    today = date.today().isoformat()
    for ride in cal:
        if ride["date"] < today or "randonneuring.org" not in ride["ebrevet"]:
            continue
        url = ride["ebrevet"]
        req = urllib.request.Request(url, headers={"User-Agent": "flxrando-build"})
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                page = resp.read().decode("utf-8", errors="replace")
        except Exception as e:  # noqa: BLE001 - validation only; don't block a deploy
            print(f"note: could not check {url} ({e})")
            continue
        route = routes.get(ride["route"], {})
        start = ride["start"] or route.get("start") or ride["rusa_start"]
        theirs = {
            "date": event_page_field(page, "Start Date"),
            "start time": re.sub(
                r" [A-Z]{3}$", "", event_page_field(page, "Start Time")
            ),
            "start": event_page_field(page, "Start Location"),
            "distance": event_page_field(page, "Official Distance").removesuffix(" km"),
            "RideWithGPS route": " ".join(
                RWGPS.findall(event_page_field(page, "Route Editor Link URL"))
            ),
        }
        try:
            theirs["date"] = (
                datetime.strptime(theirs["date"], "%d %B %Y").date().isoformat()
            )
        except ValueError:
            pass
        ours = {
            "date": (ride["date"], "RUSA"),
            "start time": (ride["time"], "rides.csv time"),
            "start": (
                towns.get(start, start),
                "our start (rides.csv, else the route's)",
            ),
            "distance": (str(ride["km"]), "RUSA"),
            "RideWithGPS route": (
                " ".join(map_ids(route.get("maps", ""))),
                f"routes.csv maps for {ride['route']}",
            ),
        }
        where = f"{ride['date']} {name_of(ride, route)}"
        for what, (value, source) in ours.items():
            if theirs[what] and theirs[what] != value:
                problems.append(
                    f"{where}: randonneuring.org has {what} '{theirs[what]}',"
                    f" {source} has '{value}' ({url})"
                )


def name_of(ride, route) -> str:
    return route.get("name") or ride["name"] or "TBD"


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

    try:
        events = fetch_rusa()
    except Exception as e:  # noqa: BLE001 - reported to the editor as-is
        events = []
        problems.append(f"could not read the RUSA event list ({e})")
    if events:
        cal = calendar(events, routes, rides, problems)
        RIDES.write_text(json.dumps(cal, indent=1, ensure_ascii=False) + "\n")
        check_event_pages(cal, routes, locations, problems)

    if problems:
        print("The site was not updated. Fix these in flxrando/site/content:")
        print("\n".join(f"  - {p}" for p in problems))
        return 1
    print(
        f"ok: {len(locations)} locations, {len(routes)} routes,"
        f" {len(events)} RUSA events ({len(rides)} with local details),"
        f" {len(stats)} maps"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
