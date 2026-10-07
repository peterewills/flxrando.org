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
    ["locations.csv", "routes.csv", "rides.csv", "route_stats.json"].map(get)
  );
  LOCATIONS = Object.fromEntries(locations.map(({ key, ...loc }) => [key, loc]));
  ROUTES = routes.map((r) => toRoute(r, stats));
  RIDES = rides.map((r) => ({ ...r, km: num(r.km) }));
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

function rideInfo(ride) {
  const route = ride.route ? routeById[ride.route] : null;
  return {
    route,
    name: route ? route.name : ride.name,
    km: route ? route.km : ride.km,
    start: route ? route.start : ride.start,
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

function rideRow(ride) {
  const { route, name, km, start } = rideInfo(ride);
  const past = ride.date < today;
  const title = route ? `<a href="#/routes/${route.id}">${esc(name)}</a>` : ride.link ? `<a href="${ride.link}">${esc(name)}</a>` : esc(name);
  return `
    <li class="ride${past ? " past" : ""}">
      <div class="ride-date">
        <span class="dow">${fmtDate(ride.date, { weekday: "short" })}</span>
        <span class="day">${fmtDate(ride.date, { day: "numeric" })}</span>
        <span class="mon">${fmtDate(ride.date, { month: "short" })}</span>
      </div>
      <div class="ride-main">
        <div class="ride-title">${title}</div>
        <div class="ride-meta">
          <span>${esc(ride.type)}</span>
          ${start ? `<span>${esc(startName(start))}</span>` : ""}
        </div>
        ${ride.note ? `<div class="ride-note">${esc(ride.note)}</div>` : ""}
      </div>
      <div class="ride-km" title="${km} km">${nominalKm(km)}</div>
    </li>`;
}

function upcoming(n) {
  return RIDES.filter((r) => r.date >= today).sort((a, b) => a.date.localeCompare(b.date)).slice(0, n);
}

// ---- pages ----

function home() {
  const next = upcoming(4);
  return `
    <section class="poster-hero">
      <div class="poster">
        <img src="assets/photos/river-bridge-poster.jpg" alt="A randonneuring bike leaning on a bridge rail above a river valley">
        <div class="poster-text">
          <h1>Long-distance cycling in Central &amp; Western NY</h1>
        </div>
      </div>
      <div class="cta poster-cta">
        <a class="btn" href="#/about">New to randonneuring?</a>
      </div>
    </section>

    <section>
      <div class="section-head">
        <h2>Next up</h2>
        <a href="#/calendar">Full calendar →</a>
      </div>
      ${next.length ? `<ul class="rides">${next.map(rideRow).join("")}</ul>` : "<p class=\"muted\">No upcoming rides scheduled.</p>"}
    </section>

    <section class="feature">
      <img src="assets/photos/niagara-falls.jpg" alt="A loaded randonneuring bike at the railing above Niagara Falls" loading="lazy">
      <div class="feature-body">
        <h2>Western NY Waterfalls</h2>
        <p>Our grand randonnée: 1300K, 1200K and 1000K options past the region's waterfalls, held September 9, 2026.</p>
        <a class="btn" href="https://distancerider.net/WNYWaterfalls-2026/index.html">Event details</a>
      </div>
    </section>`;
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
      <p>Randonneuring is long-distance, self-supported, non-competitive cycling. Randonneuring events (called <em>brevets</em>) have a time limit, and riders check in at a specified set of controls along the route.</p>

      <h2>About our club</h2>
      <p>The Finger Lakes Randonneurs is a club of long-distance cycling enthusiasts who live and ride in the valleys, over the hills, around the lakes, and through the towns of Central and Western New York. We organize a full calendar of brevets each year. We hope you'll join us for a ride some time!</p>

      <h2>Event types</h2>
      <ul>
        <li><strong>Populaire</strong>: 100–199 km. A good first ride.</li>
        <li><strong>Brevet</strong>: 200, 300, 400, 600 or 1000 km, with fixed time limits (13.5 h for a 200K up to 75 h for a 1000K). ACP brevets count toward international awards.</li>
        <li><strong>Grand randonnée</strong>: 1200 km and longer, such as our Western NY Waterfalls.</li>
        <li><strong>Flèche / Trace / Dart</strong>: team rides on routes the team designs, finishing at a common point.</li>
      </ul>

      <h2>FAQs</h2>
      <h3>Do I need to be super fit?</h3>
      <p>No! Plenty of riders complete brevets at a very moderate pace. All that is required is the ability to be self-sufficient, a bike you are comfortable spending a long day on, and the mental grit to keep pedaling.</p>

      <h3>Do I need a fancy bike?</h3>
      <p>No! Any bike you are comfortable on will do just fine. It's best to have some way to carry food, clothing, etc., and for the longer rides you'll need a reliable lighting setup. But don't let equipment stop you from getting started: you can ride a populaire on almost any bike!</p>

      <h3>Do I need to be a member to take part in a brevet?</h3>
      <p>Yes, for insurance purposes all riders need an active <a href="https://rusa.org">Randonneurs USA</a> membership; you can join on the RUSA website. If you have questions, <a href="mailto:RBA_EMAIL_PLACEHOLDER">contact our RBA</a> (Regional Brevet Administrator).</p>

      <h3>Why is this all so French?</h3>
      <p>Long-distance "audax" riding began in Italy in the 1890s and was taken up in France soon after. In the early 1920s the Audax Club Parisien created the <em>allure libre</em> ("free pace") format: rather than riding together at a set pace behind a road captain, riders go at their own speed and need only reach each control in time. That format is randonneuring, and the ACP still certifies brevets worldwide, which is why the vocabulary is French.</p>
      <p>The sport's signature event is <a href="https://www.paris-brest-paris.org">Paris-Brest-Paris</a>, a 1200 km ride with a 90-hour limit. It was first held in 1891, twelve years before the first Tour de France, making it one of the oldest cycling events still running. Held every four years, it draws thousands of randonneurs from around the world, and for many riders it's the goal of a lifetime.</p>

      <h2>Contact</h2>
      <ul>
        <li><strong>Club and ride questions:</strong> Pete Dusel, RBA, &lt;PETE'S EMAIL&gt;</li>
        <li><strong>Website issues:</strong> Peter Wills, &lt;PETER'S EMAIL&gt;</li>
      </ul>
      <p>Day-to-day chatter happens in our <a href="https://www.facebook.com/groups/927013607977742">Facebook group</a>.</p>
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
    </div>
    <p class="muted small">${list.length} of ${ROUTES.length} routes. Climbing, from RideWithGPS: one mountain is under 40 ft per mile, two is 40–70, three is over 70. Routes without a map have no rating.</p>`;
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
    ${dates.length ? `<ul class="rides">${dates.map(rideRow).join("")}</ul>` : `<p class="muted">Not on the calendar.</p>`}`;
}

function calendar() {
  const rides = RIDES.filter((r) => (state.showPast || r.date >= today) && inBand(state.calBand, rideInfo(r).km))
    .sort((a, b) => a.date.localeCompare(b.date));
  const byMonth = {};
  for (const r of rides) (byMonth[r.date.slice(0, 7)] ||= []).push(r);
  return `
    <h1>Calendar</h1>
    <div class="cal-controls">
      ${chips(state.calBand, "calBand")}
      <label class="toggle"><input type="checkbox" id="showPast" ${state.showPast ? "checked" : ""}> Show past rides</label>
    </div>
    ${Object.entries(byMonth).map(([ym, list]) => `
      <h2 class="month">${fmtDate(ym + "-01", { month: "long", year: "numeric" })}</h2>
      <ul class="rides">${list.map(rideRow).join("")}</ul>`).join("") || `<p class="muted">No rides match.</p>`}`;
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
