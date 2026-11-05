---
target: home and calendar
total_score: 23
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 4
target_identity: "file:/Users/peter/code/peter/flxrando.org/site/index.html"
target_fingerprint: "sha256:2e91eaa1790f949933971cfcf6a7f227df84f41f241d4c93e791d7f6ba2d637e"
target_path: /Users/peter/code/peter/flxrando.org/site/index.html
timestamp: 2026-11-05T17-20-08Z
slug: site-index-html
---
Method: dual-agent (A: design review · B: detector + contrast). Browser inspection skipped per user instruction.

Score 23/40 (Acceptable). H1 2, H2 3, H3 3, H4 3, H5 2, H6 2, H7 2, H8 3, H9 1, H10 2.

Priority issues:
- [P1] Newcomer path dead-ends: Welcome → About → no link to sign-up form, calendar or first populaire; /rider-info only reachable via Register panel or "Before you ride". Fix: "Your first ride" sequence (join RUSA → sign-up form → pick a populaire) on About and Welcome card; sign-up in footer/nav. → onboard
- [P1] Start time and place under-weighted and often missing (36/61 rides no time; town only, no street/map). Fix: first meta line "time · town: street ↗"; "Start time TBA" when blank; type and cue links to second line. → layout
- [P1] `today` is UTC (app.js:58); same-day rides go past after ~7–8pm Eastern. Fix: toLocaleDateString("en-CA", {timeZone: "America/New_York"}). → harden
- [P1] Calendar keyboard/SR: chip toggle re-renders and loses focus; no aria-pressed; identical "Register" names; route change doesn't move focus or set title; no focus-visible styles. → audit
- [P2] No loading state; error state is raw technical string with no fallback links. → harden

Detector: 33 findings on static files; app.js markup unscanned. Real: kicker-above-heading (4 instances, 1 flagged), side-tab on .route-note (styles.css:152), font-size drift (~10 small sizes 0.7–0.92rem). Brand-choice: overused-font (Inter, Fraunces).
Contrast failures: banner eyebrow vine on logo panel 1.92 light / 3.59 dark; .ride.past opacity 0.5 (muted 2.10, ink 3.05 light); tag/status-cue 4.49 light (4.04 on bg); status-none 4.02 light; unselected chip/register borders ~1.3–1.4.

Personas: Jordan (jargon, no populaire soon, dead-end CTA, RUSA number first, fee unclear); Casey (Next up ~1100px down at 375px, 26–32px targets, blank load, clipped Facebook tab); Sam (focus loss, unannounced routes, identical Register names, faded past rides); night-before rider (no clock time or street, UTC vanishing, no .ics, no pointer to where late changes are posted).

Minor: cancelled rides can fill Next up; mixed "register ahead"/"day-of fine" copy; bannerArt() no .catch; raw RUSA route name on lookup failure.

Questions: lead Home with the next ride? sign-up form as registration with a ride select? what should a November newcomer do this week?
