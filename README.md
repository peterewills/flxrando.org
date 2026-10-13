# flxrando.org

Source for [flxrando.org](https://flxrando.org), the Finger Lakes Randonneurs club site. It is a static site with no framework, no npm and no server: plain HTML/CSS/JS in `site/`, CSV content files that club admins edit, and one Python script (standard library only) that validates the content and fetches data from RideWithGPS and RUSA at build time. GitHub Actions builds and deploys to GitHub Pages.

To edit rides, routes or start locations, see [site/content/README.md](site/content/README.md). That guide is written for non-technical editors; this file covers how the pieces fit together.

## This repository is public

GitHub Pages on a free account requires a public repository, so anyone can read every file and every past commit. Do not commit anything you would not post on the site itself: no API keys or passwords, and no rider phone numbers, emails or addresses beyond what the club publishes. Deleting a file later does not remove it from the history.

## Layout

```
build_routes.py            build step: validate content, fetch RideWithGPS + RUSA data
site/                      deployed as-is; this directory is the website
  index.html               page shell: banner, tabs, footer, <main id="app">
  app.js                   all pages, rendered client-side from the content files
  styles.css
  CNAME                    flxrando.org
  assets/                  logo and photos
  content/
    README.md              editing guide for admins
    locations.csv          named start spots (edited by hand)
    routes.csv             route library (edited by hand)
    rides.csv              local details for RUSA events (edited by hand)
    route_stats.json       generated: distance/climbing/unpaved per RideWithGPS route
    rides.json             generated: the calendar
.github/workflows/deploy.yml
```

## How data flows

```
RUSA event search (region 30) ─┐
rides.csv ─────────────────────┼─> build_routes.py ─> rides.json ───────┐
routes.csv ────────────────────┤                                        ├─> app.js (browser)
RideWithGPS route JSON ────────┘                  ─> route_stats.json ──┤
locations.csv, routes.csv ──────────────────────────────────────────────┘
```

- **The calendar comes from RUSA.** `build_routes.py` scrapes RUSA's event search for our region. RUSA decides which rides exist, their date and type, and the distance class (populaire, 200K, ...). A `rides.csv` line attaches local details (start time, fee, links, notes) to one RUSA event, matched by date and km. To add, move or cancel a ride, change it on RUSA, not here.
- **Routes come from `routes.csv`.** RUSA lists a route number per event, not a map; `routes.csv` links that number (its `rusa` column) to our RideWithGPS map. Distance, climbing and unpaved km are fetched from each map.
- **Two distances, on purpose.** RUSA's event distance sets the class: the populaire/200K/300K label, the distance filter, the registration subject. The exact km shown is our route's (`routes.csv` `km`, else the map). A reroute is just a new map link in `routes.csv`; the exact km follows it and may drift from RUSA's route page, while the class can't change. Some maps run just under nominal (the 1200K map is 1199 km), which is why the class never comes from the map.
- **Overrides cover what RUSA hasn't caught up with.** A `rides.csv` line can set `override_date` (postponed) or `cancelled`, each requiring an `override_note` that riders see. The line still names the event by RUSA's `date` and `km`, so once RUSA changes, it stops matching and the build fails until someone clears the override. For a moved ride, the randonneuring.org date check accepts either date; cancelled rides skip that check.
- **`route_stats.json` is a cache.** The build fetches only RideWithGPS ids missing from it. CI doesn't commit its output back, so a newly added route is fetched on every build until someone runs the build locally and commits the updated file.
- **`rides.json` is rebuilt on every build** from RUSA's current list. The committed copy is just the last local build.
- **Validation blocks bad deploys.** The build exits non-zero, with plain-English messages by file and line, if a content file is malformed, a `rides.csv` line no longer matches a RUSA event, a RideWithGPS route isn't public, or an upcoming ride disagrees with its randonneuring.org event page (date, start time, start town, distance, route). When the build fails, the live site keeps the last good version.

## The front end

`app.js` is one file with no build step. On load it fetches `locations.csv`, `routes.csv`, `rides.json` and `route_stats.json` from `content/`, parses the CSVs itself, and renders every page into `<main id="app">`. Pages are hash routes (`#/`, `#/about`, `#/routes`, `#/routes/<id>`, `#/calendar`, `#/lighting`, `#/brevets`, `#/awards`, `#/waterfalls`, `#/rider-info`), dispatched in `render()` at the bottom of the file. Prose pages (About, Brevets, Awards, Waterfalls, Lighting) are written directly in `app.js` as template strings.

External services the site talks to:

- **RideWithGPS**: route maps are iframe embeds; stats are fetched at build time.
- **RUSA** (rusa.org): source of the calendar, fetched at build time.
- **randonneuring.org**: event pages linked from rides and checked at build time.
- **distancerider.net**: the new rider sign-up form posts to the club's existing `RiderInfo.php` script, which adds the rider to the RBA's list and emails the RBA.

## Current state

Contact addresses live in `EMAILS` in `app.js`, split into user and domain to slow scrapers; the footer fills them in at load. The RBA address is where Register buttons send email and what the sign-up form passes to `RiderInfo.php`. `index.html` still sets `noindex, nofollow`, so search engines don't list the site; remove that tag when the club is ready to announce it.

## Deploy

`.github/workflows/deploy.yml` runs `build_routes.py` and publishes `site/` to GitHub Pages:

- on every push to `main`
- daily at 10:00 UTC, so new RUSA events appear without a commit
- manually, via "Run workflow" under the Actions tab

DNS is on Cloudflare: four `A` records for the apex pointing to GitHub Pages and a `www` `CNAME` to `peterewills.github.io`, all set to "DNS only" (not proxied), which GitHub needs to issue the HTTPS certificate.

## Running locally

```bash
python3 build_routes.py
python3 -m http.server -d site 8000   # then open http://localhost:8000
```

The site must be served over HTTP, not opened as a file, because `app.js` fetches the content files.
