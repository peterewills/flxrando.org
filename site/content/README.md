# Editing the club site

Everything on the calendar and the routes pages comes from the three files in this folder, plus RUSA's event list for the calendar. To change one, open it here on GitHub, click the pencil icon, edit, and click "Commit changes". The site updates a few minutes later.

This repository is public, including its history. Don't put anything here that shouldn't be on the website, such as private phone numbers or email addresses.

Each file is a spreadsheet saved as text: one line per item, values separated by commas. A value that itself contains a comma goes inside double quotes, e.g. `"Tully, NY"`. Leave a value empty by putting nothing between the commas. You can also open the file in Excel or Google Sheets and save it back as CSV.

## The calendar: RUSA plus rides.csv

The calendar lists every event RUSA has for our region (NY: Central/Western), read from the [RUSA event search](https://rusa.org/cgi-bin/eventsearch_GF.pl) each time the site is built. To add, move or cancel a ride, change it on RUSA, and the site picks it up at its daily rebuild (10:00 UTC). To update sooner, make any commit or click "Run workflow" under the Actions tab. If RUSA can't be updated in time, see [Last-minute changes](#last-minute-changes-postponed-or-cancelled).

Where each part of a ride comes from:

- Date and type (ACP brevet, RUSA populaire, ...): RUSA.
- Class (populaire, 200K, 300K, ...): RUSA's distance. It sets the big distance label, the distance filter and the registration email subject, and is never taken from our map, which can run a little under (the 1200K map is 1199 km).
- Route: RUSA's route number, matched to the `rusa` column in routes.csv. Every route number RUSA uses must be in routes.csv, with a map, or the build fails. A rides.csv line names its route explicitly in `route`, which must agree with RUSA's; for an event with no route on RUSA yet, it can attach one of ours (see `route` below).
- Exact distance (the "201 km" in the ride's details): our route, its `km` in routes.csv, else the RideWithGPS map. To reroute a ride, link the new map in routes.csv. That row may serve several dates, and relinking it changes all of them.

rides.csv adds our own details to a RUSA event. A ride needs a line only if it has something to add. A line that matches no RUSA event (the ride is past and RUSA has dropped it, or it was moved or cancelled) is left off the calendar, and the build lists it as a warning without failing; delete it when convenient.

- `date`, `km`: pick out the RUSA event, by its date and its distance as RUSA lists it (e.g. `201`, `1309`).
- `route`: the route `id` from routes.csv this ride uses. Required whenever RUSA has a route for the event, and it must be the routes.csv line whose `rusa` number RUSA uses; the build fails otherwise and names the id to use. Leave it empty only for an event with no route on RUSA that doesn't need one (team rides).
  - Two RUSA events share a date and distance: the route picks between them; an empty route picks the event with no route on RUSA.
  - The RUSA event has no route yet (a far-future event, say): this attaches one of ours, usually a draft. The calendar tags it "Draft route" while it has no RUSA number. When RUSA assigns the event a route, the build fails until that RUSA number is in the `rusa` column of the right routes.csv line, which makes the draft an approved route. If RUSA's route isn't the one named here, the build fails too: RUSA's route always wins.
- `time`, `finish_time`: like `7:30 AM`, or `TBD`, `Evening`, `Team choice`. Finish time is for team rides.
- `start`, `finish`: a `key` from locations.csv or a place like `Tully, NY`. `start` is only needed when it differs from the route's start; `finish` is for team rides.
- `fee`: only when it differs from the usual fee by distance: populaires free, 200K $10, 300K $20, 360K $36, 400K and 600K $25, longer TBD.
- `ebrevet`: the randonneuring.org event page. For an upcoming ride, the build checks that the event page's date, start time, start town, distance and RideWithGPS route match ours, and fails if they don't.
- `link`: a web address or a page on this site, like `#/waterfalls`. The ride's name links here instead of to the route.
- `description`: replaces the route's description on the calendar. `note`: a short extra line.
- `override_date`, `cancelled`, `override_note`: last-minute changes RUSA doesn't show yet; see below.

### Last-minute changes: postponed or cancelled

Change RUSA first whenever you can. When a ride is postponed or cancelled too late for that, override it on its rides.csv line:

- Postponed: set `override_date` to the new date, like `2026-05-10`. Leave `date` as RUSA's date.
- Cancelled: set `cancelled` to `yes`. The ride stays on the calendar, struck through, with no Register button.
- Either way, `override_note` is required. Riders see it next to the ride name, after a "Moved from May 9" or "Cancelled" tag, so say why: `Rain forecast`, `Bridge closed on the route`.

`date` and `km` keep naming the event as RUSA lists it; that is how the override stays tied to the right event. Once RUSA catches up (moves the event or removes it), that line no longer matches a RUSA event and has no effect; the build warns, asking you to update `date` and `km` and clear the three override columns.

## routes.csv: the route library

One line per route.

- `id`: a short lowercase name with dashes, e.g. `lansing-101`. Rides refer to routes by this.
- `name`, `start`: `start` is either a `key` from locations.csv or a place like `Tully, NY`.
- `maps`: the RideWithGPS link. For a route in parts, label each and separate with `;`, e.g. `Loop 1: https://ridewithgps.com/routes/123; Loop 2: https://ridewithgps.com/routes/456`. The route must be public on RideWithGPS.
- `km`: leave empty to use the RideWithGPS distance. Fill it in to show the official distance instead, and always for a route with no map.
- `rusa`: the RUSA route number, once RUSA has approved the route for brevets and populaires. The site shows it as "Brevet approved". A route with a `rusa` number must have a map.
- `perm`: the RUSA permanent number, once approved as a permanent. Shown as "Permanent".
- A route with neither is a draft, tagged "Draft" on the site. Add drafts freely: a reroute idea, or a route for an event RUSA hasn't approved yet.
- `cues`: cue sheet links, separated by `;`
- `description`, `note`: plain text

Distance, climbing and unpaved km come from RideWithGPS automatically.

## locations.csv: named start spots

`key` (one word, used in the `start` columns), `town`, `spot`, and `map` (a Google Maps link).

## If something goes wrong

Every change is checked before it goes live. If a line has a mistake (a date in the wrong format, a route that disagrees with RUSA), the site keeps showing the last good version, and the failed run under the repository's Actions tab lists what to fix, by file and line. Warnings appear in the same log on runs that succeed.
