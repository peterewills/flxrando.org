# Editing the club site

Everything on the calendar and the routes pages comes from the three files in this folder. To change one, open it here on GitHub, click the pencil icon, edit, and click "Commit changes". The site updates a few minutes later.

Each file is a spreadsheet saved as text: one line per item, values separated by commas. A value that itself contains a comma goes inside double quotes, e.g. `"Tully, NY"`. Leave a value empty by putting nothing between the commas. You can also open the file in Excel or Google Sheets and save it back as CSV.

## rides.csv: the calendar

One line per scheduled ride.

- `date`: like `2026-05-30`
- `time`: like `7:30 AM`, or `TBD`, `Evening`, `Team choice`
- `route`: the `id` of a route in routes.csv. For a one-off event with no route, leave it empty and fill in `name` and `km` instead (and `start` if known).
- `type`: e.g. `ACP brevet`, `RUSA populaire`
- `fee`: e.g. `$10`, `Free`
- `ebrevet`, `link`, `note`: optional

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

Every change is checked before it goes live. If a line has a mistake (a date in the wrong format, a ride naming a route that doesn't exist), the site keeps showing the last good version, and the failed run under the repository's Actions tab lists what to fix, by file and line.
