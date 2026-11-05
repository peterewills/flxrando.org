# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Two audiences, weighted equally:

- **Current club riders** checking what's next: date, start time and place, fee, route, how to register.
- **Prospective riders** who have heard of randonneuring and are deciding whether to try a first populaire.

Secondary: riders from outside the region considering the WNY Waterfalls 1300K / 1200K / 1000K, and the RBA and admins who keep the content correct.

## Product Purpose

The club site for Finger Lakes Randonneurs, a Randonneurs USA affiliated club promoting long-distance, self-supported, non-competitive riding in Central and Western New York. It publishes the ride calendar, the route library, rules and requirements (brevet types, lighting, awards), and the new-rider sign-up.

Success means:

- Riders find start time, place, fee, route and how to register without emailing the RBA.
- More newcomers sign up through the new-rider form and show up at a populaire.

## Positioning

The calendar is RUSA's own event list for region 30, rebuilt daily, joined with the club's local details and RideWithGPS route stats, and checked against randonneuring.org before deploy. What the site shows is what RUSA has sanctioned, so riders can trust it over a Facebook post or an old PDF.

## Operating Context

- Riders reach a ride through the Calendar or the home page's "Next up", follow the route to RideWithGPS, and register by email to the RBA (Register buttons) or via randonneuring.org.
- Newcomers land on Home or About, read "What is randonneuring?" and event types, then sign up through the form, which posts to the club's existing `RiderInfo.php` on distancerider.net.
- Admins are non-technical. They edit `site/content/*.csv` in the GitHub web editor; the build validates and either deploys or keeps the last good version.
- Club discussion happens in the Facebook group, which the site links to.

## Capabilities and Constraints

- Static site: plain HTML/CSS/JS in `site/`, no framework, no npm, no server. Pages render client-side from content files in `app.js`; prose pages are template strings in `app.js`.
- Build is `build_routes.py` (Python standard library only); deploy is GitHub Pages via Actions, on push, daily at 10:00 UTC, and manually.
- RUSA is the source of truth for which rides exist, their date, type and distance class. The site never invents or moves rides on its own; `rides.csv` overrides (postponed, cancelled) require a rider-visible note.
- Route approval vocabulary: "RUSA route" (approved for brevets and populaires), "Permanent", "Draft". Distance class (populaire, 200K, 300K, ...) comes from RUSA, exact km from the route.
- The repository is public, including history. No private contact details beyond what the club publishes; emails are split in `EMAILS` in `app.js` to slow scrapers.
- `noindex, nofollow` is set until the club is ready to announce the site.

## Brand Commitments

- Name: Finger Lakes Randonneurs; domain flxrando.org; "A Randonneurs USA affiliated club".
- Logo: `site/assets/logo.svg`.
- Voice: warm and welcoming. Encouraging to newcomers, leans into community and the scenery, while staying factual about rules, times and requirements.

## Evidence on Hand

- Ride photos in `site/assets/photos/` (group at Byrne Dairy, Niagara Falls, river bridge, Waterfalls route shots and medal).
- Live calendar and route data: `site/content/rides.json`, `routes.csv`, `route_stats.json`, `locations.csv`.
- Named contacts: RBA Pete Dusel, webmaster Peter Wills.
- No testimonials, rider counts, or press. Do not fabricate them.

## Product Principles

- The facts a rider needs to show up (when, where, how far, how to register) are never more than one step away.
- A newcomer should come away believing a first populaire is doable, and know exactly how to sign up.
- RUSA is the authority; the site reflects it and says plainly when a local override applies.
- Everything an admin can change lives in the CSVs and fails loudly when wrong; design must not create content that only a developer can update.
