---
name: Finger Lakes Randonneurs
description: Club site for long-distance, self-supported riding in Central and Western New York.
colors:
  seneca-lake: "#2e5e6e"
  seneca-lake-wash: "#e1eae8"
  hemlock: "#3d5a36"
  barn-rust: "#9a5530"
  almanac-paper: "#f4efe4"
  card-stock: "#fffcf5"
  bark-ink: "#2c261f"
  weathered-ink: "#6e6556"
  fence-line: "#e0d7c5"
  logo-sage: "#8a9c7a"
  logo-wheat: "#efe5c9"
  seneca-lake-dark: "#8db8c2"
  seneca-lake-wash-dark: "#1e2a2b"
  hemlock-dark: "#a3bf92"
  barn-rust-dark: "#d88e62"
  almanac-paper-dark: "#171512"
  card-stock-dark: "#201d18"
  bark-ink-dark: "#ece5d6"
  weathered-ink-dark: "#a69c8b"
  fence-line-dark: "#363027"
typography:
  display:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "clamp(2.1rem, 5vw, 3.25rem)"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "2.2rem"
    fontWeight: 700
    lineHeight: 1.15
  title:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "1.4rem"
    fontWeight: 700
    lineHeight: 1.15
  numeral:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.1
  body:
    fontFamily: "Inter, system-ui, -apple-system, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.55
  lede:
    fontFamily: "Inter, system-ui, -apple-system, sans-serif"
    fontSize: "1.19rem"
    fontWeight: 400
    lineHeight: 1.65
  label:
    fontFamily: "Inter, system-ui, -apple-system, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    letterSpacing: "0.08em"
rounded:
  control: "8px"
  card: "10px"
  pill: "999px"
spacing:
  gutter: "16px"
  row: "0.8rem 1.1rem"
  card: "1.1rem 1.5rem"
  section: "3rem"
  column: "960px"
  measure: "42rem"
components:
  button-primary:
    backgroundColor: "{colors.seneca-lake}"
    textColor: "{colors.almanac-paper}"
    rounded: "{rounded.control}"
    padding: "0.6rem 1.1rem"
  button-secondary:
    backgroundColor: "{colors.card-stock}"
    textColor: "{colors.bark-ink}"
    rounded: "{rounded.control}"
    padding: "0.6rem 1.1rem"
  button-welcome:
    backgroundColor: "{colors.hemlock}"
    textColor: "{colors.card-stock}"
    rounded: "{rounded.control}"
    height: "44px"
    padding: "0 1.25rem"
  register-pill:
    backgroundColor: "transparent"
    textColor: "{colors.seneca-lake}"
    rounded: "{rounded.pill}"
    padding: "0.2rem 0.75rem"
  register-pill-open:
    backgroundColor: "{colors.seneca-lake-wash}"
    textColor: "{colors.seneca-lake}"
    rounded: "{rounded.pill}"
  nav-tab:
    textColor: "{colors.weathered-ink}"
    rounded: "{rounded.pill}"
    padding: "0.4rem 0.75rem"
  nav-tab-active:
    backgroundColor: "{colors.seneca-lake-wash}"
    textColor: "{colors.seneca-lake}"
    rounded: "{rounded.pill}"
  chip:
    backgroundColor: "{colors.card-stock}"
    textColor: "{colors.bark-ink}"
    rounded: "{rounded.pill}"
    padding: "0.3rem 0.8rem"
  chip-on:
    backgroundColor: "{colors.seneca-lake}"
    textColor: "{colors.almanac-paper}"
    rounded: "{rounded.pill}"
  tag:
    textColor: "{colors.barn-rust}"
    rounded: "{rounded.pill}"
    padding: "0.05rem 0.45rem"
  card:
    backgroundColor: "{colors.card-stock}"
    rounded: "{rounded.card}"
  input:
    backgroundColor: "{colors.card-stock}"
    textColor: "{colors.bark-ink}"
    rounded: "{rounded.control}"
    padding: "0.5rem 0.65rem"
---

# Design System: Finger Lakes Randonneurs

## Overview

**Creative North Star: "The Long Road Almanac"**

The site reads like a club almanac kept by people who ride all year: a calendar organized by month, routes catalogued like field notes, the landscape present in color and photographs. The palette comes from the region (lake water, hemlock, red barns, wheat and bark on warm paper) and is set on flat, quiet surfaces with no gloss. A bookish serif carries headings and the numbers riders scan for (the date, the distance). A plain sans carries everything else.

Density is moderate. The calendar and route table are compact enough to scan a season at a glance. Prose pages (About, Brevets, Lighting, Waterfalls) sit at a comfortable reading measure. Warmth comes from the materials (paper tones, serif numerals, real ride photos, the logo's bike against a sage panel), not from decoration or motion. The site is static and calm: almost no animation, only hover color shifts.

Light and dark modes are both first-class. Dark mode follows the system setting and swaps every token for a night-paper equivalent; the hues stay the same and only lightness changes.

**Key Characteristics:**
- Warm paper ground, card-stock surfaces, bark-brown ink; never pure white or black.
- Fraunces for headings and for the numbers riders scan for; Inter for everything else.
- One cool primary (Seneca Lake) for action and links; Barn Rust for distances and status; Hemlock in small doses.
- Flat: depth comes from paper-versus-card tone and hairline borders, never shadows.
- Soft, plain shapes: pills for navigation and status, gently rounded cards and controls.

## Colors

Finger Lakes earth tones: a cool lake blue for interaction against warm paper, with rust and hemlock green as the regional accents.

### Primary
- **Seneca Lake** (`seneca-lake`): links, primary buttons, the selected filter chip, the active tab's text, the Register button, sort arrows. It is the one color that says "you can act here."
- **Seneca Lake Wash** (`seneca-lake-wash`): the soft field behind the active tab, the open Register panel, the welcome card, the route table header and feature cards.

### Secondary
- **Hemlock** (`hemlock`): the newcomer path, used sparingly. The welcome card's heading and its "get started" button, mountain climbing icons, the map-status pill text.

### Tertiary
- **Barn Rust** (`barn-rust`): distances (the big km on each ride row, time limits on the Waterfalls page), the eyebrow line, tags such as "Draft route", postponed or cancelled notes, required-field markers, and the left rule on route notes. Tag backgrounds are Barn Rust at 15% over the surface.

### Neutral
- **Almanac Paper** (`almanac-paper`): page background, and text on Seneca Lake fills.
- **Card Stock** (`card-stock`): raised surfaces: tab bar, ride list, route table, footer, inputs, info boxes.
- **Bark Ink** (`bark-ink`): body text and headings.
- **Weathered Ink** (`weathered-ink`): metadata, captions, day/month labels, inactive tabs, the footer.
- **Fence Line** (`fence-line`): every border and row divider; also the neutral pill background.
- **Logo Sage / Logo Wheat** (`logo-sage`, `logo-wheat`): reserved for the logo and the banner art built from it.

Each neutral and accent has a `-dark` twin applied under `prefers-color-scheme: dark`. The logo has its own dark-mode variables (`--logo-panel`, `--logo-beam`, `--logo-stripe-*`) in `styles.css`.

### Named Rules
**The One Lake Rule.** Seneca Lake is the only interactive color. If something is clickable it is Seneca Lake (or sits on Seneca Lake Wash); nothing else is.

**The Rust Means Distance Rule.** Barn Rust marks the distance, the status, or the exception (draft, moved, cancelled, required). It is never used for links or buttons.

**The No Pure Values Rule.** No `#fff` or `#000` anywhere. Paper, card stock and bark ink are the extremes.

## Typography

**Display Font:** Fraunces (optical size 9–144, weights 600 and 700), falling back to Georgia
**Body Font:** Inter (400, 500, 600), falling back to system-ui

**Character:** A soft, old-style serif with optical sizing gives headings and numerals an almanac warmth; Inter keeps dense metadata, tables and forms neutral and legible.

### Hierarchy
- **Display** (700, `clamp(2.1rem, 5vw, 3.25rem)`, 1.05, -0.01em, balanced wrap): the home page headline only, centered.
- **Headline** (700, 2.2rem, 1.15): page titles (`h1`).
- **Title** (700, 1.4rem, 1.15): section headings and calendar month headings (`h2`).
- **Numeral** (Fraunces 700, 1.5rem, 1.1): the day number in ride rows; at 1.1rem in Barn Rust for the ride km; at 1.3rem for Waterfalls time limits.
- **Body** (400, 16px, 1.55): all running text. Prose is capped at 42rem.
- **Lede** (400, 1.15–1.19rem, 1.65): the home intro and page ledes, capped at 40rem.
- **Label** (600, 0.75–0.8rem, uppercase, 0.06–0.08em tracking): the eyebrow (Barn Rust), day/month abbreviations, and route fact labels (Weathered Ink).

### Named Rules
**The Serif Numbers Rule.** The figures a rider scans for (date, distance, time limit) are set in Fraunces bold. Supporting numbers in tables and metadata stay in Inter.

**The Two Families Rule.** Fraunces and Inter only. No third face, no monospace.

## Layout

A single centered column, 960px wide with 16px side gutters (`.wrap`), used by the banner, tab bar, main content and footer. Prose pages cap text at 42rem inside it; the Waterfalls page lets its photo grid use the full column while text stays at 46rem.

The banner is a fixed-height band (220px, 130px under 600px) with the title anchored bottom-left and the logo's bike art at the column's right edge; the art's sage panel and wheat beam run edge to edge. The tab bar sticks to the top of the viewport and scrolls horizontally when it overflows.

The calendar is a single bordered list grouped under month headings. Each ride row is a four-column grid: date stack, km, details, Register. Under 600px it becomes date on the left, km and Register on the top row, details full width below, and the one-line blurb is hidden. The route library is a horizontally scrollable table. The footer is three columns, stacking to one under 700px.

Vertical rhythm: 2rem above section headings, 3–4rem between home page blocks, 1.5rem around figures. Breakpoints are 600px (rows, forms, maps, Waterfalls), 700px (footer) and 760px (home intro).

## Elevation & Depth

Completely flat. There are no shadows anywhere. Depth comes from three tones (Almanac Paper ground, Card Stock surfaces, Seneca Lake Wash for highlighted fields) and 1px Fence Line borders. Hover states change color or background, never elevation. Past rides fade to 50% opacity rather than receding with depth.

### Named Rules
**The Paper and Card Rule.** To lift something, put it on Card Stock with a Fence Line border. To highlight it, use Seneca Lake Wash. Never use a shadow.

## Shapes

Three radii, applied by role. Pills (999px) for anything that labels or navigates: tabs, filter chips, tags, status badges, the Register button. Gently curved controls (8px) for buttons, inputs, selects, the Register panel and smaller photos. Softly rounded cards (10px) for lists, tables, feature cards, info boxes, maps and large photos. The Waterfalls medal is the only circle. Borders are always 1px Fence Line; the only heavier rule is the 3px Barn Rust left border on route notes, and the empty-map placeholder uses a dashed border.

Photos are cropped to fixed aspect ratios with `object-fit: cover` (4:3 for inline photos, 16:9 for feature cards, 21:8 for wide features) and take the radius of their container role.

## Components

### Buttons
Soft and plain: a filled or outlined rectangle with gentle corners, no gradient, no shadow.
- **Shape:** gently curved (8px).
- **Primary:** Seneca Lake fill, Almanac Paper text, 500 weight, 0.6rem × 1.1rem.
- **Secondary:** Card Stock fill with a Fence Line border and Bark Ink text.
- **Welcome:** Hemlock fill, Card Stock text, 600 weight, at least 44px tall; hover brightens by 10%. Reserved for the newcomer path.
- **Register:** a small outlined pill in Seneca Lake text; hover and open state add a Seneca Lake border and a Seneca Lake Wash fill. It opens a full-width Seneca Lake Wash panel inside the ride row.

### Chips
- **Style:** pills with a Fence Line border on Card Stock, Bark Ink text, 0.9rem.
- **State:** when selected, a solid Seneca Lake fill with Almanac Paper text. Used for calendar filters.

### Tags and status pills
- **Tag:** small 600-weight pill, Barn Rust text on 15% Barn Rust ("Draft route", "Draft").
- **Status:** a 0.78rem pill. Map (Hemlock text on Seneca Lake Wash), cue sheet only (Barn Rust on 15% Barn Rust), none (Weathered Ink on Fence Line).

### Cards / Containers
- **Corner Style:** softly rounded (10px).
- **Background:** Card Stock (ride list, route table, info boxes) or Seneca Lake Wash (feature card, welcome card).
- **Shadow Strategy:** none; see Elevation & Depth.
- **Border:** 1px Fence Line on Card Stock containers; none on Wash containers.
- **Internal Padding:** 1rem–1.5rem; ride rows 0.8rem × 1.1rem with Fence Line dividers between them.

### Inputs / Fields
- **Style:** Card Stock fill, 1px Fence Line border, 8px radius, inherited font. Labels sit above at 0.9rem; required markers are Barn Rust.
- **Focus:** browser default focus ring (no custom treatment yet).

### Navigation
- **Tabs:** a sticky Card Stock bar with a bottom Fence Line border. Tabs are 500-weight Weathered Ink pills; hover goes to Bark Ink; active is Seneca Lake text on Seneca Lake Wash. External links carry a ↗.
- **Mobile:** the same row, scrolling horizontally.

### Ride Row (signature)
The calendar's unit. A stacked date (uppercase day and month labels around a Fraunces day number), the class distance in Barn Rust Fraunces, the ride name in 600 Bark Ink with a Seneca Lake hover, a dot-separated Weathered Ink metadata line, and the Register pill. Past rides fade to 50%. Cancelled rides strike through the name in Weathered Ink and drop Register. Overrides show a Barn Rust "Moved from …" or "Cancelled" note beside the name.

### Banner (signature)
The logo built out to full width: sage panel and wheat beam running edge to edge, the bike at the right of the column, the club name in Fraunces bold bottom-left, and the Barn Rust eyebrow above it (hidden on mobile).

## Do's and Don'ts

### Do:
- **Do** use the CSS custom properties in `styles.css` (`--lake`, `--forest`, `--vine`, `--bg`, `--surface`, `--ink`, `--muted`, `--line`) rather than literal colors, so dark mode follows.
- **Do** set the date and distance riders scan for in Fraunces bold, with distance in Barn Rust.
- **Do** lift surfaces with Card Stock and a 1px Fence Line border, and highlight with Seneca Lake Wash.
- **Do** use pills for navigation, filters, tags and status, 8px for controls and 10px for containers.
- **Do** use real club ride photos from `site/assets/photos/`, cropped to a fixed aspect ratio.
- **Do** check every new element in both light and dark modes.

### Don't:
- **Don't** add box shadows, gradients or glossy fills.
- **Don't** use Barn Rust or Hemlock for links or general buttons; Seneca Lake is the interactive color.
- **Don't** use pure white or pure black.
- **Don't** introduce a third typeface.
- **Don't** recolor the logo outside its own variables, or use stock imagery in place of club photos.
