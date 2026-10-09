const app = document.getElementById("app");
// Content lives in content/*.csv (see content/README.md); route_stats.json is written
// from RideWithGPS by ../build_routes.py.
let LOCATIONS = {}, ROUTES = [], RIDES = [], routeById = {};

// RFC 4180 CSV: quoted fields may hold commas, newlines and doubled quotes.
function parseCsv(text) {
  const rows = [[]];
  let field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { rows.at(-1).push(field); field = ""; }
    else if (c === "\n") { rows.at(-1).push(field); field = ""; rows.push([]); }
    else if (c !== "\r") field += c;
  }
  rows.at(-1).push(field);
  const [head, ...body] = rows;
  return body.filter((r) => r.some((x) => x.trim())).map((r) => Object.fromEntries(head.map((h, i) => [h.trim(), (r[i] ?? "").trim()])));
}

const num = (s) => (s ? Number(s) : undefined);
const list = (s) => s.split(";").map((x) => x.trim()).filter(Boolean);

function toRoute(r, stats) {
  const rwgps = list(r.maps).map((part) => {
    const m = part.match(/^(?:(.+?):\s+)?\S*ridewithgps\.com\/routes\/(\d+)/);
    return { id: m[2], label: m[1] };
  });
  const s = rwgps.map((m) => stats[m.id]);
  const sum = (f) => s.reduce((a, x) => a + f(x), 0);
  return {
    id: r.id, name: r.name, start: r.start, rwgps, note: r.note, description: r.description,
    km: num(r.km) ?? Math.floor(sum((x) => x.m) / 1000),
    gain: s.length ? sum((x) => x.gain_m) : undefined,
    unpaved: s.length ? Math.round(sum((x) => (x.m * x.unpaved_pct) / 100) / 1000) : undefined,
    rusa: num(r.rusa), perm: num(r.perm), cues: list(r.cues),
  };
}

async function loadContent() {
  const get = (f) => fetch(`content/${f}`, { cache: "no-cache" }).then((res) => {
    if (!res.ok) throw new Error(`content/${f}: ${res.status}`);
    return f.endsWith(".json") ? res.json() : res.text().then(parseCsv);
  });
  const [locations, routes, rides, stats] = await Promise.all(
    ["locations.csv", "routes.csv", "rides.json", "route_stats.json"].map(get)
  );
  LOCATIONS = Object.fromEntries(locations.map(({ key, ...loc }) => [key, loc]));
  ROUTES = routes.map((r) => toRoute(r, stats));
  RIDES = rides;
  routeById = Object.fromEntries(ROUTES.map((r) => [r.id, r]));
}
const today = new Date().toISOString().slice(0, 10);

const BANDS = [
  { key: "all", label: "All" },
  { key: "pop", label: "Populaires", test: (km) => km < 200 },
  { key: "200", label: "200K", test: (km) => km >= 200 && km < 300 },
  { key: "300", label: "300K", test: (km) => km >= 300 && km < 400 },
  { key: "400", label: "400K", test: (km) => km >= 400 && km < 600 },
  { key: "600", label: "600K", test: (km) => km >= 600 && km < 1000 },
  { key: "1000", label: "1000K+", test: (km) => km >= 1000 },
];
const inBand = (band, km) => band === "all" || BANDS.find((b) => b.key === band).test(km);

const state = { routesBand: "all", calBand: "all", showPast: false, routeSort: [{ key: "km", dir: 1 }], routeType: "all", routeQuery: "" };

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

// A ride is a RUSA event (date, type, km, route) plus local details from rides.csv;
// see build_routes.py. RUSA's distance wins over the route's mapped distance.
function rideInfo(ride) {
  const route = ride.route ? routeById[ride.route] : null;
  return {
    route,
    name: route ? route.name : ride.name || "TBD",
    km: ride.km,
    start: ride.start || route?.start || ride.rusa_start,
  };
}

// A start is either a LOCATIONS key (with a map link) or plain text like "Tully, NY".
const startName = (start) => LOCATIONS[start]?.town ?? start ?? "";
const mapStatus = (r) => (r.rwgps.length ? "map" : r.cues?.length ? "cue" : "none");
const hasMap = (r) => r.rwgps.length > 0;
const MAP_STATUS = { map: "Map", cue: "Cue sheet only", none: "No route file" };
// Climbing rating: feet per mile. 1 mountain < 40, 2 = 40–70, 3 > 70.
const ftPerMile = (r) => (r.gain ? Math.round((r.gain * 3.28084) / (r.km * 0.621371)) : null);
const mountainCount = (fpm) => (fpm < 40 ? 1 : fpm <= 70 ? 2 : 3);
const MOUNTAIN = `<svg class="mtn" viewBox="0 0 24 16" aria-hidden="true"><path d="M1 15 L9 3 L13 9 L16 6 L23 15 Z"/></svg>`;
function mountains(r) {
  const fpm = ftPerMile(r);
  if (fpm == null) return `<span class="muted">—</span>`;
  const n = mountainCount(fpm);
  return `<span class="mtns" title="${fpm} ft per mile" aria-label="${n} of 3 mountains, ${fpm} ft per mile">${MOUNTAIN.repeat(n)}</span>`;
}
const routeType = (r) => [r.rusa && "Brevet", r.perm && "Perm"].filter(Boolean).join(", ");
const nextRide = (r) => RIDES.filter((x) => x.route === r.id && x.date >= today).sort((a, b) => a.date.localeCompare(b.date))[0];

function fmtDate(iso, opts) {
  return new Date(iso + "T12:00:00").toLocaleDateString("en-US", opts);
}

// Club logo, redrawn from the official artwork; colors come from CSS variables.
// Master copy (fixed colors) is assets/logo.svg. For the banner, the panel, beam and
// road run far past the viewBox and the banner clips them at the page edges.
function bannerArt() {
  const far = 4000;
  return `
    <svg class="logo banner-art" viewBox="260 114 240 160" aria-hidden="true">
      <rect class="panel" x="${-far}" y="162" width="${2 * far}" height="100"/>
      <polygon class="beam" points="268,162 ${-far},162 ${-far},262 92,262"/>
      <rect class="solid" x="${-far}" y="262" width="${2 * far}" height="12"/>
      <g class="stroke">
        <circle cx="288" cy="213" r="46"/>
        <circle cx="444" cy="213" r="46"/>
        <path d="M274.4 165.4 A49.5 49.5 0 0 1 334.5 229.9 M395.0 219.9 A49.5 49.5 0 1 1 491.8 225.8" stroke-width="5" stroke-linecap="butt"/>
        <path d="M288 213 L337 213 M444 213 L489.0 194" stroke-width="2.5"/>
        <path d="M323 139 L317 160 M323 140 L406.6 140 M380 222 L406.6 140 M317 160 L380 222 M380 222 L444 213 M406.6 140 L444 213"/>
        <path d="M317 160 L310.1 184 C306.8 195.5 297 210 288 213"/>
        <path d="M323 139 L326.8 125.5 L305 125.5 Q298 125.5 298 132"/>
        <path d="M406.6 140 L412.4 122"/>
        <path d="M274 162 L314 162"/>
        <circle cx="380" cy="222" r="11" stroke-width="5"/>
        <path d="M380 222 L360 228" stroke-width="4"/>
      </g>
      <g class="solid">
        <rect x="272" y="132" width="38" height="28" rx="4"/>
        <path d="M394 121.5C394 119.8 396 119.2 400 118.8C410 118 422 117.2 429 117C432 117 433.5 118 433.5 120L433 124C432.6 125.2 431 125.6 429 125.4C422 124.6 416 123.8 410 123.6C403 123.4 398 123.6 396 123.4C394.6 123.2 394 122.6 394 121.5Z"/>
        <rect x="354" y="227" width="12" height="3.5" rx="1"/>
        <rect x="264" y="159" width="11" height="8" rx="2"/>
      </g>
    </svg>`;
}

function rwgpsEmbed(id, label) {
  return `
    ${label ? `<h3 class="map-label">${esc(label)}</h3>` : ""}
    <figure class="map">
      <iframe src="https://ridewithgps.com/embeds?type=route&id=${id}&sampleGraph=true"
              loading="lazy" title="RideWithGPS route ${id}"></iframe>
      <figcaption><a href="https://ridewithgps.com/routes/${id}" target="_blank" rel="noopener">Open in RideWithGPS ↗</a></figcaption>
    </figure>`;
}

function startLink(start) {
  const loc = LOCATIONS[start];
  if (!loc) return esc(start ?? "");
  return `<a href="${loc.map}" target="_blank" rel="noopener">${esc(loc.town)}</a> <span class="muted">· ${esc(loc.spot)}</span>`;
}

function chips(current, onKey) {
  return `<div class="chips" data-chips="${onKey}">${BANDS.map(
    (b) => `<button class="chip${b.key === current ? " on" : ""}" data-band="${b.key}">${b.label}</button>`
  ).join("")}</div>`;
}

// Nominal event distance: populaires (< 200 km) show as "Pop.", others round down to the brevet distance.
function nominalKm(km) {
  if (km < 200) return `Pop.`;
  const d = [1200, 1000, 600, 400, 300, 200].find((x) => km >= x);
  return `${d}<span>km</span>`;
}

// RBA email for registration, kept in two parts and joined only when someone opens a
// Register panel, so scrapers reading the page source never see a whole address.
// Leave empty to show a placeholder.
const RBA_EMAIL = { user: "", domain: "" };
const rbaEmail = () => (RBA_EMAIL.user && RBA_EMAIL.domain ? `${RBA_EMAIL.user}@${RBA_EMAIL.domain}` : "");

const RIDER_INFO_FORM = "#/rider-info";
// The sign-up form posts to the old distancerider.net script, which adds the rider to
// Pete's rider list and emails him the details.
const RIDER_INFO_ACTION = "https://distancerider.net/RiderInfo/RiderInfo.php";

// Email subject for registering, e.g. "Paul's Niagara Loop 600K on Oct 10, 2026".
function registerSubject(ride) {
  const { name, km } = rideInfo(ride);
  const label = km < 200 ? "Populaire" : `${[1200, 1000, 600, 400, 300, 200].find((x) => km >= x)}K`;
  const named = /\d{3,4}\s?k\b/i.test(name) || /populaire/i.test(name);
  return `${name}${named ? "" : ` ${label}`} on ${fmtDate(ride.date, { month: "short", day: "numeric", year: "numeric" })}`;
}

function registerBody(subject) {
  const email = rbaEmail();
  const how = email
    ? `<a class="btn primary" href="mailto:${email}?subject=${encodeURIComponent(subject)}">Email the RBA to register</a>
       <p class="small muted">No email app? Send a message to <strong>${esc(email)}</strong> with the subject “${esc(subject)}”.</p>`
    : `<p>Email the RBA at <strong>&lt;PETE'S EMAIL&gt;</strong> with the subject “${esc(subject)}”.</p>`;
  return `${how}<p class="small">First ride with us? Also fill in the <a href="${RIDER_INFO_FORM}">rider info form</a>.</p>`;
}

// Links and notes shown on the Calendar and About pages.
function rideInfoBox(heading) {
  return `
    <section class="ride-info">
      <h2>${heading}</h2>
      <ul class="info-links">
        <li><a href="https://rusa.org/pages/memberservices" target="_blank" rel="noopener">RUSA membership</a> <span class="muted">(required to ride)</span></li>
        <li><a href="https://rusa.org/pages/rulesForRiders" target="_blank" rel="noopener">RUSA rules for riders</a></li>
        <li><a href="#/lighting">Lighting requirements</a></li>
        <li><a href="https://rusa.org/pages/new-member-guide" target="_blank" rel="noopener">RUSA new member guide</a></li>
      </ul>
      <ul class="info-notes">
        <li><strong>Register ahead</strong> by email, using the Register link on each ride, so brevet cards and cue sheets can be ready. Registering on the day is usually fine, except for flèches, traces, and rides of 600&nbsp;km and longer.</li>
        <li><strong>First time riding with us?</strong> Fill in the <a href="${RIDER_INFO_FORM}">rider info form</a> so your details are on file and your paperwork can be printed ahead.</li>
        <li><strong>Cue sheets on this site are unofficial.</strong> Pick up the official cue sheet at the start.</li>
        <li>Any event may be cancelled or rescheduled up to its start.</li>
      </ul>
    </section>`;
}

// First sentence of a route description, for the calendar.
function firstSentence(text, max = 170) {
  const t = (text || "").trim();
  const m = t.match(/^.+?[.!?](?=\s|$)/);
  const s = m ? m[0] : t;
  return s.length > max ? s.slice(0, max).replace(/\s+\S*$/, "") + "…" : s;
}

// "Cue sheet", or "Cue sheets 1 · 2" for a route in parts.
function cueLinks(cues) {
  const a = (c, label) => `<a href="${c}" target="_blank" rel="noopener">${label}</a>`;
  return cues.length === 1 ? a(cues[0], "Cue sheet") : `Cue sheets ${cues.map((c, i) => a(c, i + 1)).join(" · ")}`;
}

// opts.blurb: show the route's description (off on a route's own page, which already shows it).
function rideRow(ride, opts = {}) {
  const { route, name, km, start } = rideInfo(ride);
  const past = ride.date < today;
  const title = ride.link ? `<a href="${ride.link}">${esc(name)}</a>` : route ? `<a href="#/routes/${route.id}">${esc(name)}</a>` : esc(name);
  const blurb = opts.blurb === false ? "" : ride.description || (route?.description ? firstSentence(route.description) : "");
  const finish = [ride.finish && startName(ride.finish), ride.finish_time].filter(Boolean).join(", ");
  return `
    <li class="ride${past ? " past" : ""}">
      <div class="ride-date">
        <span class="dow">${fmtDate(ride.date, { weekday: "short" })}</span>
        <span class="day">${fmtDate(ride.date, { day: "numeric" })}</span>
        <span class="mon">${fmtDate(ride.date, { month: "short" })}</span>
      </div>
      <div class="ride-km" title="${km} km">${nominalKm(km)}</div>
      <div class="ride-main">
        <div class="ride-title">${title}</div>
        <div class="ride-meta">
          <span>${esc(ride.type)}</span>
          ${ride.time ? `<span>${esc(ride.time)}</span>` : ""}
          ${start ? `<span>${esc(startName(start))}</span>` : ""}
          ${finish ? `<span>Finish: ${esc(finish)}</span>` : ""}
          <span>${esc(ride.fee)}</span>
          ${route?.cues?.length ? `<span>${cueLinks(route.cues)}</span>` : ""}
          ${ride.ebrevet ? `<span><a href="${ride.ebrevet}" target="_blank" rel="noopener">Event page</a></span>` : ""}
        </div>
        ${blurb ? `<p class="ride-blurb">${esc(blurb)}</p>` : ""}
        ${ride.note ? `<div class="ride-note">${esc(ride.note)}</div>` : ""}
      </div>
      <div class="ride-side">
        ${past ? "" : `<button class="register-btn" type="button" aria-expanded="false" data-subject="${esc(registerSubject(ride))}">Register</button>`}
      </div>
      ${past ? "" : `<div class="register-body" hidden></div>`}
    </li>`;
}

function upcoming(n) {
  return RIDES.filter((r) => r.date >= today).sort((a, b) => a.date.localeCompare(b.date)).slice(0, n);
}

// ---- pages ----

// WNY Waterfalls feature (Routes page top, Home under Next up)
function waterfallsFeature() {
  return `
    <a class="wf-card" href="#/waterfalls">
      <img src="assets/photos/waterfalls/niagara-control.jpg" alt="Riders at the Niagara Falls control" loading="lazy">
      <div class="wf-card-body">
        <p class="eyebrow">Our grand randonnée</p>
        <h2>WNY Waterfalls 1300K / 1200K / 1000K</h2>
        <p>A cloverleaf of loops from Webster past Niagara Falls, the Finger Lakes gorges and the Lake Ontario shore, with 400K and 600K options. Sep 9–13, 2026.</p>
        <span class="wf-card-go">Event details →</span>
      </div>
    </a>`;
}

function home() {
  const next = upcoming(4);
  return `
    <section class="home-hero">
      <h1>Long-distance cycling in Central &amp; Western NY</h1>
      <div class="home-intro">
        <div class="home-intro-text">
          <p>Randonneuring is long-distance, self-supported, non-competitive cycling. Each ride has a time limit and checkpoints along the route, and you ride at your own pace.</p>
          <p>We're a club of riders in Central and Western New York with a full calendar of brevets each year. You don't need to be super fit or own a fancy bike. We hope you'll join us for a ride!</p>
          <div class="welcome">
            <h2>New to randonneuring?</h2>
            <a class="welcome-go" href="#/about">Welcome! Start here <span aria-hidden="true">→</span></a>
          </div>
        </div>
        <figure class="home-photo">
          <img src="assets/photos/river-bridge-square.jpg" alt="A loaded touring bike leaning on a bridge rail over a river valley" fetchpriority="low" decoding="async">
        </figure>
      </div>
    </section>

    <section class="home-next">
      <div class="section-head">
        <h2>Next up</h2>
        <a href="#/calendar">Full calendar →</a>
      </div>
      ${next.length ? `<ul class="rides">${next.map((r) => rideRow(r)).join("")}</ul>` : "<p class=\"muted\">No upcoming rides scheduled.</p>"}
    </section>

    <section class="home-feature">${waterfallsFeature()}</section>`;
}

function about() {
  return `
    <article class="prose">
      <h1>About</h1>
      <figure class="photo">
        <img src="assets/photos/group-byrne-dairy.jpg" alt="Three club members in Finger Lakes Randonneurs jerseys at a Byrne Dairy" loading="lazy">
        <figcaption>Club jerseys at a Byrne Dairy stop, August 2026.</figcaption>
      </figure>

      <h2>What is randonneuring?</h2>
      <p>Randonneuring is long-distance, self-supported, non-competitive cycling. Randonneuring events (called <em>brevets</em>) have a time limit, and riders check in at a specified set of controls along the route. For a fuller introduction, see the Chicago Randonneurs' <a href="https://chicagorando.org/learn-about-randonneuring/" target="_blank" rel="noopener">Learn About Randonneuring</a>.</p>

      <h2>About our club</h2>
      <p>The Finger Lakes Randonneurs is a club of long-distance cycling enthusiasts who live and ride in the valleys, over the hills, around the lakes, and through the towns of Central and Western New York. We organize a full calendar of brevets each year. We hope you'll join us for a ride some time!</p>

      <h2>Event types</h2>
      <ul>
        <li><strong>Populaire</strong>: 100–199 km. A good first ride.</li>
        <li><strong>Brevet</strong>: 200, 300, 400, 600 or 1000 km, with fixed time limits (13.5 h for a 200K up to 75 h for a 1000K). ACP brevets count toward international awards.</li>
        <li><strong>Grand randonnée</strong>: 1200 km and longer, such as our Western NY Waterfalls.</li>
        <li><strong>Flèche / Trace / Dart</strong>: team rides on routes the team designs, finishing at a common point.</li>
      </ul>
      <p>More: <a href="#/brevets">Brevets &amp; Populaires</a>, Pete Dusel's history of the brevet and how sanctioning works · <a href="#/awards">Awards</a> you can earn along the way.</p>

      <h2>FAQs</h2>
      <h3>Do I need to be super fit?</h3>
      <p>No! Plenty of riders complete brevets at a very moderate pace. All that is required is the ability to be self-sufficient, a bike you are comfortable spending a long day on, and the mental grit to keep pedaling.</p>

      <h3>Do I need a fancy bike?</h3>
      <p>No! Any bike you are comfortable on will do just fine. It's best to have some way to carry food, clothing, etc., and for the longer rides you'll need a reliable lighting setup. But don't let equipment stop you from getting started: you can ride a populaire on almost any bike!</p>

      <h3>Do I need to be a member to take part in a brevet?</h3>
      <p>Yes, for insurance purposes all riders need an active <a href="https://rusa.org">Randonneurs USA</a> membership; you can join on the RUSA website. If you have questions, contact our RBA (Regional Brevet Administrator); contact details are at the bottom of every page.</p>

      <h3>Why is this all so French?</h3>
      <p>Long-distance "audax" riding began in Italy in the 1890s and was taken up in France soon after. In the early 1920s the Audax Club Parisien created the <em>allure libre</em> ("free pace") format: rather than riding together at a set pace behind a road captain, riders go at their own speed and need only reach each control in time. That format is randonneuring, and the ACP still certifies brevets worldwide, which is why the vocabulary is French.</p>
      <p>The sport's signature event is <a href="https://www.paris-brest-paris.org">Paris-Brest-Paris</a>, a 1200 km ride with a 90-hour limit. It was first held in 1891, twelve years before the first Tour de France, making it one of the oldest cycling events still running. Held every four years, it draws thousands of randonneurs from around the world, and for many riders it's the goal of a lifetime.</p>

      <h3>What do all these terms mean?</h3>
      <p>Randonneuring has its own vocabulary: controls, brevet cards, DNFs, allure libre and more. The Chicago Randonneurs keep a good <a href="https://chicagorando.org/glossary-of-randonneuring-terms/" target="_blank" rel="noopener">glossary of randonneuring terms</a>.</p>

    </article>`;
}

const ROUTE_COLS = [
  { key: "name", label: "Route", val: (r) => r.name },
  { key: "start", label: "Start", val: (r) => startName(r.start) },
  { key: "km", label: "Distance", val: (r) => r.km, num: true },
  { key: "climb", label: "Climbing", val: (r) => ftPerMile(r) ?? -1, num: true },
  { key: "type", label: "Type", val: routeType },
];

function routes() {
  return `
    <h1>Routes</h1>
    ${waterfallsFeature()}
    <p class="muted">RUSA brevet routes and permanents in Central and Western New York. Click a column to sort.</p>
    <div class="route-controls">
      ${chips(state.routesBand, "routesBand")}
      <div class="route-filters">
        <input type="search" id="routeQuery" placeholder="Search name or start" value="${esc(state.routeQuery)}">
        <select id="routeType">
          <option value="all"${state.routeType === "all" ? " selected" : ""}>Brevets and perms</option>
          <option value="brevet"${state.routeType === "brevet" ? " selected" : ""}>Brevets</option>
          <option value="perm"${state.routeType === "perm" ? " selected" : ""}>Perms</option>
        </select>
      </div>
    </div>
    <div id="route-table">${routeTable()}</div>`;
}

function routeTable() {
  const q = state.routeQuery.trim().toLowerCase();
  // Most recently clicked column first; earlier clicks break ties.
  const sorts = state.routeSort.map((s) => ({ ...s, col: ROUTE_COLS.find((c) => c.key === s.key) }));
  const { key, dir } = sorts[0];
  const list = ROUTES.filter((r) => inBand(state.routesBand, r.km))
    .filter((r) => state.routeType === "all" || (state.routeType === "brevet" ? r.rusa : r.perm))
    .filter((r) => !q || `${r.name} ${startName(r.start)}`.toLowerCase().includes(q))
    .sort((a, b) => {
      for (const { col, dir } of sorts) {
        const x = col.val(a), y = col.val(b);
        const d = col.num ? x - y : String(x).localeCompare(String(y));
        if (d) return dir * d;
      }
      return a.km - b.km || a.name.localeCompare(b.name);
    });
  if (!list.length) return `<p class="muted">No routes match.</p>`;
  return `
    <div class="table-wrap">
      <table class="route-table">
        <thead><tr>${ROUTE_COLS.map((c) => `
          <th class="${c.num ? "num" : ""}" aria-sort="${c.key === key ? (dir > 0 ? "ascending" : "descending") : "none"}">
            <button data-sort="${c.key}">${c.label}<span class="arrow">${c.key === key ? (dir > 0 ? "▲" : "▼") : ""}</span></button>
          </th>`).join("")}
        </tr></thead>
        <tbody>${list.map((r) => {
          return `
            <tr>
              <td><a href="#/routes/${r.id}">${esc(r.name)}</a></td>
              <td>${esc(startName(r.start))}</td>
              <td class="num">${r.km} km</td>
              <td class="num">${mountains(r)}</td>
              <td>${routeType(r)}</td>
            </tr>`;
        }).join("")}</tbody>
      </table>
    </div>`;
}

function routeDetail(id) {
  const r = routeById[id];
  if (!r) return `<p>Route not found. <a href="#/routes">Back to routes</a></p>`;
  const dates = RIDES.filter((x) => x.route === id).sort((a, b) => a.date.localeCompare(b.date));
  const st = mapStatus(r);
  const maps = hasMap(r) ? r.rwgps.map((m) => rwgpsEmbed(m.id, m.label)).join("")
    : `<div class="map-empty">No RideWithGPS map for this route yet.${st === "cue" ? " Only the cue sheet exists." : " No cue sheet or map has been found."}</div>`;
  return `
    <a class="back" href="#/routes">← All routes</a>
    <h1>${esc(r.name)}</h1>
    <div class="route-facts">
      <div><span>Distance</span>${r.km} km${r.unpaved ? ` (${r.unpaved} km unpaved)` : ""}</div>
      ${r.gain ? `<div><span>Climbing</span>${mountains(r)}</div>` : ""}
      <div><span>Start</span>${startLink(r.start)}</div>
      ${r.rusa ? `<div><span>RUSA brevet</span><a href="https://rusa.org/cgi-bin/routeview_PF.pl?rtid=${r.rusa}" target="_blank" rel="noopener">#${r.rusa}</a></div>` : ""}
      ${r.perm ? `<div><span>RUSA perm</span><a href="https://rusa.org/cgi-bin/permview_GF.pl?permid=${r.perm}" target="_blank" rel="noopener">#${r.perm}</a></div>` : ""}
      ${r.cues?.length ? `<div><span>Cue sheet${r.cues.length > 1 ? "s" : ""}</span>${r.cues.map((c, i) => `<a href="${c}" target="_blank" rel="noopener">PDF${r.cues.length > 1 ? " " + (i + 1) : ""}</a>`).join(" · ")}</div>` : ""}
    </div>
    ${r.note ? `<p class="route-note">${esc(r.note)}</p>` : ""}
    ${maps}
    <div class="prose">${r.description ? `<p>${esc(r.description)}</p>` : `<p class="muted">No description yet.</p>`}</div>
    <h2>Scheduled</h2>
    ${dates.length ? `<ul class="rides">${dates.map((r) => rideRow(r, { blurb: false })).join("")}</ul>` : `<p class="muted">Not on the calendar.</p>`}`;
}

function calendar() {
  const rides = RIDES.filter((r) => (state.showPast || r.date >= today) && inBand(state.calBand, rideInfo(r).km))
    .sort((a, b) => a.date.localeCompare(b.date));
  const byMonth = {};
  for (const r of rides) (byMonth[r.date.slice(0, 7)] ||= []).push(r);
  return `
    <h1>Calendar</h1>
    ${rideInfoBox("Before you ride")}
    <div class="cal-controls">
      ${chips(state.calBand, "calBand")}
      <label class="toggle"><input type="checkbox" id="showPast" ${state.showPast ? "checked" : ""}> Show past rides</label>
    </div>
    ${Object.entries(byMonth).map(([ym, list]) => `
      <h2 class="month">${fmtDate(ym + "-01", { month: "long", year: "numeric" })}</h2>
      <ul class="rides">${list.map((r) => rideRow(r)).join("")}</ul>`).join("") || `<p class="muted">No rides match.</p>`}`;
}

function lighting() {
  return `
    <article class="prose">
      <h1>Lighting requirements</h1>
      <p>The purpose of the lighting requirement and inspection is to ensure that the cyclist has an adequate set of lights for riding in low and no light conditions, including rain and fog. Backup requirements ensure that the cyclist can continue despite a failure of some component of the lighting system. This listing is the minimum requirement by RUSA for ACP and RUSA sanctioned events. Cyclists are responsible for the proper operation of their lighting system.</p>
      <p>As stated in the RUSA lighting rules: "Each rider, whether riding in a group or by himself, must fully comply with this requirement. Everyone must use their lights!" Non-compliance with these regulations during low or no light conditions will result in disqualification. Rider safety is paramount.</p>

      <h2>Primary lighting system</h2>
      <ul>
        <li>White headlight</li>
        <li>At least one red taillight with a steady operation mode</li>
        <li>Generator or battery powered sources (head and taillights may or may not share power)</li>
        <li>Lights must be firmly attached to the bike, not clipped onto a bag which may change their angle when riding</li>
      </ul>

      <h2>Backups</h2>
      <p>No specific requirements are made for a backup system; however, the following are recommended:</p>
      <ul>
        <li>Spare headlight</li>
        <li>Spare taillight</li>
        <li>Spare batteries for headlights and taillights</li>
        <li>Small headlamp (useful for reading cue sheets or making repairs)</li>
      </ul>

      <h2>Reflective requirements</h2>
      <ul>
        <li>Reflective vest, sash, Sam Browne belt, Illuminite-type jacket or vest, etc. (small reflective stripes on clothing do not count)</li>
        <li>Red rear reflector (state law). Some rear-light lenses do not qualify as reflectors: they must be explicitly marked as approved by the CPSC (bicycle-type) or S.A.E. (automotive-type).</li>
        <li>Reflective ankle bands</li>
      </ul>
      <p>For more detail, see RUSA's <a href="https://rusa.org/reflectivity" target="_blank" rel="noopener">Reflectivity Guide</a> and the <a href="https://rusa.org/pages/rulesForRiders" target="_blank" rel="noopener">Rules for Riders</a> (Article 10).</p>

      <h2>Recommended items</h2>
      <ul>
        <li>Reflective material on pedals or shoes</li>
        <li>Light-colored clothing</li>
        <li>A map or cue sheet reading light, such as a hiking headlamp or a small clip-on light</li>
      </ul>

      <h2>Most common lighting problems</h2>
      <ul>
        <li>Low or dead battery</li>
        <li>Wiring problem (loose wire, short, bad switch or connector)</li>
        <li>Failure of the attachment mechanism: the light falls off and is damaged</li>
        <li>Failure to operate due to moisture or rain (we recommend sealing the light with electrical tape or a clear plastic bag)</li>
        <li>Generator failure or slippage</li>
        <li>LED failure</li>
        <li>Battery enclosure problem</li>
      </ul>
      <p>Make sure the combination of lights, power sources and backups you choose lets you tolerate any of these failures and will last for the hours of night and low-light riding you will be doing.</p>
      <p><strong>Bicycles and riders are subject to a safety check before the start of the ride.</strong> Riders whose bikes and persons do not meet the minimum requirements will not be allowed to start.</p>
    </article>`;
}

function riderInfo() {
  const field = (name, label, opts = {}) => `
        <label class="field${opts.wide ? " wide" : ""}"><span>${label}${opts.required ? " <em>*</em>" : ""}</span>
          <input name="${name}" type="${opts.type || "text"}"${opts.required ? " required" : ""}${opts.auto ? ` autocomplete="${opts.auto}"` : ""}${opts.max ? ` maxlength="${opts.max}"` : ""}>
        </label>`;
  return `
    <article class="prose">
      <h1>New rider sign-up</h1>
      <p>Riding with us for the first time? Fill this in once, before your first event. It puts you in our rider list, so your brevet card and paperwork can be printed ahead and nothing gets mistyped on the morning of the ride. The RBA will email you a confirmation once you're added.</p>
      <p>You'll need an active <a href="https://rusa.org/pages/memberservices" target="_blank" rel="noopener">RUSA membership</a> to ride.</p>
    </article>
    <form id="rider-form" class="rider-form" method="post" action="${RIDER_INFO_ACTION}">
      <div class="field-grid">
        ${field("fname", "First name", { required: true, auto: "given-name" })}
        ${field("lname", "Last name", { required: true, auto: "family-name" })}
        ${field("snum", "Street number", { auto: "address-line1" })}
        ${field("street", "Street")}
        ${field("city", "City", { auto: "address-level2" })}
        ${field("state", "State / province (2 letters)", { max: 2, auto: "address-level1" })}
        ${field("zip", "Zip / postal code", { auto: "postal-code" })}
        ${field("RUSA", "RUSA number", { required: true })}
        ${field("email", "Email", { type: "email", required: true, auto: "email" })}
        ${field("phone", "Home phone", { type: "tel", auto: "tel" })}
        ${field("cell", "Cell number during the ride", { type: "tel" })}
        ${field("emergency", "Emergency contact name(s)", { required: true })}
        ${field("emergencyphone", "Emergency contact phone number(s)", { type: "tel", required: true })}
        <label class="field wide"><span>Anything else we should know?</span><textarea name="feedback" rows="3"></textarea></label>
      </div>
      <input type="hidden" name="submitaddress" value="">
      <p class="small muted"><em>*</em> required. Your details go to the RBA only; they are not shown on this site.</p>
      <p id="rider-form-msg" class="rider-form-msg" hidden></p>
      <button class="btn primary" type="submit">Send</button>
    </form>`;
}

function waterfalls() {
  const rw = (id, label) => `<li><a href="https://ridewithgps.com/routes/${id}" target="_blank" rel="noopener">${label}</a></li>`;
  const yt = (id, label) => `<li><a href="https://www.youtube.com/watch?v=${id}" target="_blank" rel="noopener">${label}</a></li>`;
  return `
    <a class="back" href="#/routes">← All routes</a>
    <article class="prose wf">
      <header class="wf-head">
        <img class="wf-medal" src="assets/photos/waterfalls/medal.jpg" alt="WNY Waterfalls finisher's medal">
        <div>
          <p class="eyebrow">Grand randonnée · ACP / RUSA</p>
          <h1>WNY Waterfalls 1300K / 1200K / 1000K</h1>
          <p class="wf-sub">With 400K and 600K options · <strong>Sep 9–13, 2026</strong> · 04:00 start, Webster, NY</p>
        </div>
      </header>

      <p>The route is a cloverleaf with Webster and Ontario, NY at the center, and a brief tour of Western New York and the Finger Lakes. It passes the suggested motels in Webster at the start and at about 240, 441 and 600 miles (0, 385, 710 and 965 km). Webster is an open control, so riders can have personal support at any of the motels. Expect minor route changes before the start for road construction and the like.</p>

      <div class="wf-photos">
        <figure><img src="assets/photos/waterfalls/niagara-control.jpg" alt="Riders at the Niagara Falls control" loading="lazy"><figcaption>Niagara Falls control</figcaption></figure>
        <figure><img src="assets/photos/waterfalls/loop2-road.jpg" alt="A quiet rural road on loop 2" loading="lazy"><figcaption>A "busy" road on loop 2</figcaption></figure>
        <figure><img src="assets/photos/waterfalls/taughannock-control.jpg" alt="Taughannock Falls control" loading="lazy"><figcaption>Taughannock Falls control: look for the people near the base of the falls</figcaption></figure>
      </div>

      <h2>Time limits</h2>
      <ul class="wf-limits">
        ${[["400K", 27], ["600K", 40], ["1000K", 75], ["1200K", 90], ["1308K", 109]].map(([d, h]) => `<li><span class="wf-limit-d">${d}</span><span class="wf-limit-h">${h} h</span></li>`).join("")}
      </ul>
      <p>Ride the extra 100 km of the 1300K and you get 18 more hours than the 1200K.</p>

      <h2>The route</h2>
      <ul>
        <li><strong>Loop 1, 385 km:</strong> Webster to Niagara Falls and back. A very mild 400K with Niagara Falls at the center. Allow extra time near the falls: the last miles are residential roads and a paved trail along the Niagara River, the control area is busy with tourists, and who could rush past Niagara Falls without stopping?</li>
        <li><strong>Loop 2, 325 km:</strong> the Finger Lakes and more waterfalls: Taughannock Falls, Hector Falls, Watkins Glen, Shequaga Falls, and the lakes between them. It passes through Amish country, so you may be passed by a horse and buggy. The most challenging loop, with several long climbs.</li>
        <li><strong>Loop 3, 290 km:</strong> east along the Lake Ontario shore to Oswego, then inland back to motel row, past Wolcott Falls. A fair amount of climbing, but mostly mild rollers with no steep "knee busters".</li>
        <li><strong>Loop 4, 200 km:</strong> a very mild ride on quiet side roads, past Phelps Falls and the Women's Rights National Historical Park in Seneca Falls.</li>
        <li><strong>Loop 5, 100 km (1300K only):</strong> "A taste of the Erie Canal", a variation of a mild winter populaire.</li>
      </ul>
      <p>The loops are one continuous route with one overall time limit, ridden in order. You don't need to finish a loop before your overnight break: the route is designed so you can sleep in the same motel every night. Stop when the route passes your motel, and carry on the next morning.</p>

      <h2>Routes and cue sheets</h2>
      <p>Each distance has its own page here, with the maps. Except for the first segment, segments start from the Ontario control; where you start your day is up to you.</p>
      <ul>
        <li><a href="#/routes/waterfalls-1300">1300K</a> (RUSA brevet 3405): five segments · <a href="https://distancerider.net/cues/1300LR_1_R0.01_09042024.pdf" target="_blank" rel="noopener">cue sheet</a></li>
        <li><a href="#/routes/wny-waterfalls-1200">1200K</a> (RUSA brevet 2783): four segments · <a href="https://www.distancerider.net/cues/1200LR_1_R1.01_09042024.pdf" target="_blank" rel="noopener">1000K/1200K cue sheet</a></li>
        <li><a href="#/routes/wny-waterfalls-1000">1000K</a> (RUSA brevet 2785): segments 1–3 of the 1200K</li>
        <li><strong>400K:</strong> loop 1 · <strong>600K:</strong> loop 1, then a slightly changed loop 4 · <a href="https://distancerider.net/cues/WNY_Waterfalls%20400k-600k-2026.pdf" target="_blank" rel="noopener">400K/600K cue sheet</a></li>
      </ul>
      <p class="small">RideWithGPS segments:</p>
      <ul class="small wf-cols">
        ${rw(48687387, "Leaf 1: to Niagara and back (also the 400K)")}
        ${rw(48687413, "Leaf 2: Finger Lakes")}
        ${rw(48687425, "Leaf 3: Lake Ontario shore")}
        ${rw(48687446, "Leaf 4: 1200K")}
        ${rw(48687439, "Leaf 4: 1300K option")}
        ${rw(48687483, "Leaf 5: 1300K, Erie Canal")}
        ${rw(40776998, "600K segment 2")}
      </ul>

      <h2>Support</h2>
      <p>The route passes the motels repeatedly, so there's no bag drop. There's light support: at least one vehicle on the road with common repair parts (at cost), tools, snacks and water. Our goal is as many finishers as possible, so the support vehicle concentrates on riders at the back. Riders arrange their own lodging and meals. Since many riders will leave their motels before restaurants open, there's a quick breakfast at the Ontario control, about 9 miles after Webster on every loop except the first.</p>

      <h2>Registering</h2>
      <p>Interested? Contact the RBA at &lt;PETE'S EMAIL&gt; and put "WNY Waterfall" in the subject so it stands out. If you don't hear back within a few days, please write again.</p>
      <p>Ready to register? Fill in the <a href="https://www.distancerider.net/RiderInfo/WNYWaterFallRiderInfo-2026.html" target="_blank" rel="noopener">WNY Waterfalls registration form</a>. The RBA will review it, check your RUSA membership, and get back to you.</p>

      <h3>Qualification for the 1200K and 1300K</h3>
      <p>An LOL ancien, or the organizer's discretion based on your experience. Requirements are minimal: mostly we want to know you're likely to finish the first 400K loop on your own. The RUSA results database is checked when you register; if anything needs clarifying you'll get an email. Otherwise you'll get an acceptance email with directions for paying the deposit.</p>

      <h3>Ride fee</h3>
      <p>Estimated expenses divided among the riders, fixed a few weeks before the ride and due at check-in. Currently estimated at $125–$150, pro-rated for the shorter distances. A $50 non-refundable deposit is due when your application is approved. The fee includes:</p>
      <ul>
        <li>Daily light breakfast</li>
        <li>T-shirt</li>
        <li>Light support</li>
        <li>Finish picnic</li>
        <li>Finisher's medal (1000K, 1200K, 1300K)</li>
      </ul>

      <h3>Rider cap</h3>
      <p>There may be a cap, depending on volunteers, but we'll make it as large as possible. Previous editions have not been capped.</p>

      <h3>RUSA membership</h3>
      <p>Current <a href="https://rusa.org/pages/memberservices" target="_blank" rel="noopener">RUSA membership</a> is required, for liability insurance.</p>

      <h2>Getting there and staying</h2>
      <p>The nearest airport is Frederick Douglass Greater Rochester International (<a href="https://www.rocairport.com" target="_blank" rel="noopener">ROC</a>). Careful: there is also a Rochester airport in Minnesota.</p>
      <p>Suggested motels, all within a block of each other and the start, with food nearby:</p>
      <ul>
        <li>Fairfield Inn, 915 Hard Rd, Webster, NY 14580</li>
        <li>Holiday Inn Express, 860 Holt Rd, Webster, NY 14580</li>
        <li>Hampton Inn Rochester-Webster, 878 Hard Rd, Webster, NY 14580</li>
      </ul>
      <p>A short drive away, but a ride off route on a busy road: the Rodeway Inn (formerly a Super 8), 2450 Empire Blvd, and the Relax Inn, Empire Blvd, which was being renovated at last report. Camping is available in <a href="https://www.monroecounty.gov/parks-webster" target="_blank" rel="noopener">Webster Park</a>, and there may be tent space with no amenities at the Ontario control; ask the RBA.</p>

      <h2>The Finger Lakes on video</h2>
      <ul class="small wf-cols">
        ${yt("ALqdJJ_sHE0", "The Finger Lakes (1)")}
        ${yt("D_wo5URmGL0", "The Finger Lakes (2)")}
        ${yt("fSfuch4U1AI", "The Finger Lakes (3)")}
        ${yt("drhweXGtiAE", "The Finger Lakes (4)")}
        <li><a href="https://www.nps.gov/wori/index.htm" target="_blank" rel="noopener">Women's Rights National Historical Park, Seneca Falls</a></li>
        ${yt("5rckepc_-BI", "Seneca Falls and It's a Wonderful Life (1)")}
        ${yt("T6OQOIvPCns", "Seneca Falls and It's a Wonderful Life (2)")}
        ${yt("HzPWz7yTYwY", "Eternal Flame Falls, a bit off route")}
        ${yt("xeRke-pVm_0", "Watkins Glen State Park, on route")}
        ${yt("VTydr-zKqgA", "Watkins Glen State Park, longer video")}
        ${yt("W4vhoXcDY4A", "Taughannock Falls, control on loop 2")}
        ${yt("JCMrSiXXEYQ", "Corning Museum of Glass")}
      </ul>

      <h2>Past editions</h2>
      <ul class="small">
        <li>Photos and videos: <a href="https://photos.app.goo.gl/c4ygYh5J6gFNdK3TA" target="_blank" rel="noopener">September 2024</a> · <a href="https://photos.app.goo.gl/J5WwpShV8MNNupiQ7" target="_blank" rel="noopener">September 2022</a> · July 2021 (<a href="https://photos.app.goo.gl/trYSu6YzvSdWoLKu6" target="_blank" rel="noopener">1</a>, <a href="https://photos.app.goo.gl/ovVv5yJ8rrzzpQNi9" target="_blank" rel="noopener">2</a>)</li>
        <li><a href="https://photos.google.com/share/AF1QipOxW3aJEjVEZLVoNCXnSOOC_HMq0jsRVmmxJzW2NimkbWRyxAfDj4P5LsqeqL-BHg?key=UWdGSzlwUUF0aWxuM2RDb0JGT3Q4cFVKYlpKN2Z3" target="_blank" rel="noopener">Joe Todd's photos</a></li>
        <li><a href="https://www.youtube.com/channel/UCotGDTkLSzDYtbHb1Vg14yA" target="_blank" rel="noopener">Videos on the RandoPete YouTube channel</a></li>
        <li>For reference: <a href="http://gowaterfalling.com" target="_blank" rel="noopener">gowaterfalling.com</a></li>
      </ul>
    </article>`;
}

function brevetsEssay() {
  return `
    <a class="back" href="#/about">← About</a>
    <article class="prose">
      <h1>Brevets &amp; Populaires</h1>
      <p class="muted">By Pete Dusel, RBA. Written in 2010; some details may have changed since.</p>

      <h2>ACP sanctioned brevets</h2>
      <p>The Audax Club Parisien (ACP) sanctions the traditional brevet lengths of 200, 300, 400, 600 and 1000 km. ACP also sanctions the 1200 km Paris-Brest-Paris (PBP). All other events of 1200 km and longer are sanctioned by Randonneurs Mondiaux (RM). All ACP sanctioned brevets are scheduled at the beginning of the year and published by the ACP. Rides scheduled in the United States are listed on the <a href="https://rusa.org" target="_blank" rel="noopener">Randonneurs USA (RUSA)</a> website.</p>
      <p>The tradition of randonneuring began in late-1800s France, as a group of friends went out on a ride to see how far they could get. A <em>randonnée</em> is a long ramble in the countryside by foot or bike. Challenges were later organized to complete a set distance within a time limit. These events were termed <em>brevets</em>, after the card each participant carries to certify the event: <em>brevet</em> is French for certificate. The longest continuously organized cycling event in the world is PBP.</p>
      <p>Participation in a brevet is an individual challenge. While there may be a friendly competition between riders at a local brevet, the goal is just to ride <em>allure libre</em> (self-paced) and have a good time among chums. The riders in a brevet are termed <em>randonneurs</em> (male or gender neutral) or <em>randonneuses</em> (female, or the bike used).</p>
      <p>Randonneurs carry their brevet card to the <em>contrôle</em> points along the route, to certify arrival at each listed contrôle within the allotted time. At the end of the ride, randonneurs hand their brevet cards to the organizer for results certification. After the results are sent to the ACP in France for the official stamp, the cards are returned to the riders as a memento and proof that they completed the event.</p>
      <p>To ride the 1200 km events offered by the ACP and RM, randonneurs must complete a full series, in order: 200, 300, 400 and 600 km. Riders wishing to take part in PBP must complete the Super Randonneur series before 1 July in the year of the 1200 km event. All randonneurs completing a full series are eligible for the Super Randonneur award.</p>
      <p>For those who complete an extraordinary 5000 km within a four-year period, there is the Randonneur 5000 award. To receive it, a rider must complete 5000 km of ACP sanctioned events, including a flèche, a full series, a 1000 km and PBP. The Super Randonneur and Randonneur 5000 awards honor the spirit and determination of the individual.</p>

      <h2>RUSA sanctioned brevets</h2>
      <p>In addition to the traditional ACP sanctioned brevets, RUSA offers domestically sanctioned brevets. These events, at least 200 km long, need not be the traditional distances; the Finger Lakes 350 km, for example, is a domestically sanctioned brevet.</p>
      <p>Randonneurs riding RUSA and ACP sanctioned brevets are eligible for the RUSA 1000 km through 5000 km distance awards: anyone completing at least 1000 km in sanctioned brevets may receive the 1000 km award. A rider eligible for more than one award in a year must ride the distance for each separately: to receive both the 1000 km and the 2000 km awards takes at least 3000 km, and no brevet (or part of one) may count toward both.</p>

      <h2>RUSA sanctioned populaires</h2>
      <p>Populaires are sanctioned domestically by RUSA. They run like brevets, with cards and contrôle points, but are between 100 and 199 km. Like domestically sanctioned brevets, they count toward the distance awards. Populaires are meant as an introduction to the brevet format, and are often paired with a social event or a seminar, or used as a winter training ride.</p>
      <p>See also: <a href="#/awards">Awards</a>.</p>
    </article>`;
}

function awards() {
  return `
    <a class="back" href="#/about">← About</a>
    <article class="prose">
      <h1>Awards</h1>
      <p>Randonneurs USA and the Audax Club Parisien recognize what riders achieve over a season and over the years. Here are the main awards; the complete list, with the rules for each, is on the <a href="https://rusa.org/pages/awards" target="_blank" rel="noopener">RUSA awards page</a>.</p>

      <h2>For finishing brevets</h2>
      <ul>
        <li><strong>Brevet medals:</strong> finish an ACP sanctioned brevet of 200, 300, 400, 600 or 1000 km.</li>
        <li><strong>Super Randonneur:</strong> complete a series of 200, 300, 400 and 600 km brevets in one season. A Super Randonneur series also qualifies you to ride Paris-Brest-Paris.</li>
        <li><strong>Randonneur 5000:</strong> complete 5000 km of ACP sanctioned events within four years, including a flèche, a full Super Randonneur series, a 1000 km and Paris-Brest-Paris.</li>
      </ul>

      <h2>For riding all year</h2>
      <ul>
        <li><strong>P-12:</strong> complete a populaire (under 200 km) in each of 12 consecutive months.</li>
        <li><strong>R-12:</strong> complete a ride of 200 km or longer in each of 12 consecutive months.</li>
      </ul>

      <h2>For distance</h2>
      <ul>
        <li><strong>RUSA distance awards:</strong> ride 1000, 2000, 3000, 4000 or 5000 km in RUSA events and permanents in a calendar year.</li>
        <li><strong>K-Hound:</strong> ride 10,000 km in a calendar year in RUSA events and permanents, Paris-Brest-Paris, or RM sanctioned events of 1200 km and longer.</li>
        <li><strong>RUSA Cup:</strong> complete at least one of each type of RUSA event, totalling at least 5000 km, within two years.</li>
      </ul>
      <p>These awards recognize the dedication and perseverance it takes to ride long distances, season after season. For the history behind brevets and their awards, see Pete Dusel's <a href="#/brevets">Brevets &amp; Populaires</a>.</p>
    </article>`;
}

// ---- router ----

function render() {
  const parts = location.hash.replace(/^#\/?/, "").split("/");
  const tab = parts[0] || "home";
  let html;
  if (tab === "about") html = about();
  else if (tab === "routes" && parts[1]) html = routeDetail(parts[1]);
  else if (tab === "routes") html = routes();
  else if (tab === "calendar") html = calendar();
  else if (tab === "lighting") html = lighting();
  else if (tab === "brevets") html = brevetsEssay();
  else if (tab === "awards") html = awards();
  else if (tab === "waterfalls") html = waterfalls();
  else if (tab === "rider-info") html = riderInfo();
  else html = home();
  app.innerHTML = html;
  document.querySelectorAll(".tabs a").forEach((a) => a.classList.toggle("active", a.dataset.tab === (tab || "home")));
}

app.addEventListener("click", (e) => {
  const sort = e.target.closest("[data-sort]");
  if (sort) {
    const key = sort.dataset.sort;
    const [first, ...rest] = state.routeSort;
    state.routeSort = first.key === key
      ? [{ key, dir: -first.dir }, ...rest]
      : [{ key, dir: 1 }, ...state.routeSort.filter((s) => s.key !== key)];
    document.getElementById("route-table").innerHTML = routeTable();
    return;
  }
  const chip = e.target.closest(".chip");
  if (!chip) return;
  state[chip.parentElement.dataset.chips] = chip.dataset.band;
  render();
});
app.addEventListener("submit", (e) => {
  if (e.target.id !== "rider-form") return;
  const email = rbaEmail();
  if (!email) {
    e.preventDefault();
    const msg = document.getElementById("rider-form-msg");
    msg.textContent = "Sign-up isn't connected yet on this prototype site, so nothing was sent.";
    msg.hidden = false;
    return;
  }
  e.target.elements.submitaddress.value = email;
});
// Register: open the panel under the ride, filling it (and the RBA address) only now.
app.addEventListener("click", (e) => {
  const btn = e.target.closest(".register-btn");
  if (!btn) return;
  const panel = btn.closest(".ride").querySelector(".register-body");
  const open = panel.hidden;
  if (open) panel.innerHTML = registerBody(btn.dataset.subject);
  panel.hidden = !open;
  btn.setAttribute("aria-expanded", String(open));
});
// Re-render only the table so the search box keeps focus while typing.
app.addEventListener("input", (e) => {
  if (e.target.id === "routeQuery") {
    state.routeQuery = e.target.value;
    document.getElementById("route-table").innerHTML = routeTable();
  }
});
app.addEventListener("change", (e) => {
  if (e.target.id === "showPast") {
    state.showPast = e.target.checked;
    render();
  } else if (e.target.id === "routeType") {
    state.routeType = e.target.value;
    document.getElementById("route-table").innerHTML = routeTable();
  }
});
window.addEventListener("hashchange", () => {
  render();
  window.scrollTo(0, 0);
});
document.querySelector(".banner-inner").insertAdjacentHTML("afterbegin", bannerArt());
loadContent().then(render, (err) => {
  app.innerHTML = `<p>Could not load the site's content (${esc(err.message)}).</p>`;
});
