# Editing the club site

Everything on the calendar and the routes pages comes from the three files in this folder, plus RUSA's event list for the calendar. To change one, open it here on GitHub, click the pencil icon, edit, and click "Commit changes". The site updates a few minutes later.

Each file is a spreadsheet saved as text: one line per item, values separated by commas. A value that itself contains a comma goes inside double quotes, e.g. `"Tully, NY"`. Leave a value empty by putting nothing between the commas. You can also open the file in Excel or Google Sheets and save it back as CSV.

## The calendar: RUSA plus rides.csv

The calendar lists every event RUSA has for our region (NY: Central/Western), read from the [RUSA event search](https://rusa.org/cgi-bin/eventsearch_GF.pl) each time the site is built. To add, move or cancel a ride, change it on RUSA, then rebuild the site (any commit, or "Run workflow" under the Actions tab). The date, type and distance come only from RUSA. The route comes from the RUSA route number, matched to the `rusa` column in routes.csv.

rides.csv adds our own details to a RUSA event. A ride needs a line only if it has something to add.

- `date`, `km`: pick out the RUSA event, by its date and its distance as RUSA lists it (e.g. `201`, `1309`).
- `route`: only when two RUSA events share a date and distance. Put the route `id` here; leave it empty for the event that has no route on RUSA.
- `time`, `finish_time`: like `7:30 AM`, or `TBD`, `Evening`, `Team choice`. Finish time is for team rides.
- `start`, `finish`: a `key` from locations.csv or a place like `Tully, NY`. `start` is only needed when it differs from the route's start; `finish` is for team rides.
- `fee`: only when it differs from the usual fee by distance: populaires free, 200K $10, 300K $20, 360K $36, 400K and 600K $25, longer TBD.
- `ebrevet`: the randonneuring.org event page. For an upcoming ride, the build checks that the event page's date, start time, start town, distance and RideWithGPS route match ours, and fails if they don't.
- `link`: a web address or a page on this site, like `#/waterfalls`. The ride's name links here instead of to the route.
- `description`: replaces the route's description on the calendar. `note`: a short extra line.

## routes.csv: the route library

One line per route.

- `id`: a short lowercase name with dashes, e.g. `lansing-101`. Rides refer to routes by this.
- `name`, `start`: `start` is either a `key` from locations.csv or a place like `Tully, NY`.
- `maps`: the RideWithGPS link. For a route in parts, label each and separate with `;`, e.g. `Loop 1: https://ridewithgps.com/routes/123; Loop 2: https://ridewithgps.com/routes/456`. The route must be public on RideWithGPS.
- `km`: leave empty to use the RideWithGPS distance. Fill it in to show the official distance instead, and always for a route with no map.
- `rusa`, `perm`: RUSA brevet and permanent route numbers, if any
- `cues`: cue sheet links, separated by `;`
- `description`, `note`: plain text

Distance, climbing and unpaved km come from RideWithGPS automatically.

## locations.csv: named start spots

`key` (one word, used in the `start` columns), `town`, `spot`, and `map` (a Google Maps link).

## If something goes wrong

Every change is checked before it goes live. If a line has a mistake (a date in the wrong format, a rides.csv line that no longer matches a RUSA event), the site keeps showing the last good version, and the failed run under the repository's Actions tab lists what to fix, by file and line.
