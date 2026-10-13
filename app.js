/* Coffee Log — client-side app.
   Data lives in localStorage (your working copy), seeded once from data.js.
   Use Export to save a backup file; Import to restore one. */

const STORE_KEY = 'coffeelog.v2'; // bumped when the clean HTML export replaced the PDF import
// read-only published build (see build_public.py): no editing, no recos,
// no private columns, and no dependence on serve.py
const PUBLIC = !!window.COFFEELOG_PUBLIC;
const PRIVATE_FIELDS = ['bought_from', 'from_who', 'notes'];
const FIELDS = ['date','roaster','city','coffee','farm','country','variety',
  'process','tasting_notes','bought_from','from_who','notes']
  .filter(f => !PUBLIC || !PRIVATE_FIELDS.includes(f));

let coffees = [];

/* ---------- storage ---------- */
function load() {
  // public site always shows the published snapshot, never a stale browser copy
  if (PUBLIC) return (window.SEED_COFFEES || []).map(c => ({ ...c }));
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { console.warn('load failed', e); }
  // first run: seed from the PDF import
  const seed = (window.SEED_COFFEES || []).map(c => ({ ...c }));
  persist(seed);
  return seed;
}
function persist(list) {
  coffees = list;
  try { localStorage.setItem(STORE_KEY, JSON.stringify(list)); }
  catch (e) { alert('Could not save to this browser: ' + e.message); }
  updateStoreNote();
}
function nextId() {
  return coffees.reduce((m, c) => Math.max(m, c.id || 0), 0) + 1;
}

/* ---------- date helpers ---------- */
function sortKey(d) {
  const m = /^(\d{1,2})\/(\d{4})/.exec(d || '');
  if (m) return `${m[2].padStart(4,'0')}-${m[1].padStart(2,'0')}`;
  const y = /^(\d{4})/.exec(d || '');
  return y ? `${y[1]}-00` : '0000-00';
}
function prettyDate(d) {
  const m = /^(\d{1,2})\/(\d{4})/.exec(d || '');
  if (!m) return d || '';
  const months = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[+m[1]] || m[1]} ${m[2]}`;
}

/* ---------- rendering ---------- */
const el = id => document.getElementById(id);

// table columns, in the order shown — mirrors the original PDF
const COLUMNS = [
  { key: 'date',          label: 'Date' },
  { key: 'roaster',       label: 'Roaster' },
  { key: 'city',          label: 'City' },
  { key: 'coffee',        label: 'Coffee Name' },
  { key: 'farm',          label: 'Farm / Region / Producer' },
  { key: 'country',       label: 'Country' },
  { key: 'variety',       label: 'Variety' },
  { key: 'process',       label: 'Process' },
  { key: 'tasting_notes', label: 'Tasting Notes' },
  { key: 'bought_from',   label: 'Bought From' },
  { key: 'from_who',      label: 'From Who' },
  { key: 'notes',         label: 'Notes' },
].filter(col => FIELDS.includes(col.key));
let sortState = { key: 'date', dir: 'desc' };

function buildHeader() {
  el('headRow').innerHTML = COLUMNS.map(col => {
    const active = sortState.key === col.key;
    const arrow = active ? `<span class="arrow">${sortState.dir === 'asc' ? '▲' : '▼'}</span>` : '';
    return `<th data-key="${col.key}">${esc(col.label)}${arrow}</th>`;
  }).join('');
  el('headRow').querySelectorAll('th').forEach(th => {
    th.onclick = () => {
      const key = th.dataset.key;
      if (sortState.key === key) {
        sortState.dir = sortState.dir === 'asc' ? 'desc' : 'asc';
      } else {
        sortState = { key, dir: key === 'date' ? 'desc' : 'asc' };
      }
      render();
    };
  });
}

function sortValue(c, key) {
  return key === 'date' ? sortKey(c.date) : (c[key] || '').toLowerCase();
}

function render() {
  const q = el('search').value.trim().toLowerCase();
  const fc = el('filterCountry').value;
  const fp = el('filterProcess').value;
  let list = coffees.filter(c => {
    if (fc && c.country !== fc) return false;
    if (fp && c.process !== fp) return false;
    if (q) {
      const hay = FIELDS.map(f => c[f] || '').join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const dir = sortState.dir === 'asc' ? 1 : -1;
  list.sort((a, b) => {
    const av = sortValue(a, sortState.key), bv = sortValue(b, sortState.key);
    return av < bv ? -dir : av > bv ? dir : 0;
  });

  buildHeader();
  el('rows').innerHTML = list.map(rowHtml).join('');
  el('rows').querySelectorAll('tr').forEach(tr => {
    if (!PUBLIC) tr.onclick = () => openModal(coffees.find(c => c.id === +tr.dataset.id));
  });

  el('empty').hidden = list.length > 0;
  document.getElementById('table').hidden = list.length === 0;
  el('resultCount').textContent =
    `${list.length} ${list.length === 1 ? 'coffee' : 'coffees'}` +
    (list.length !== coffees.length ? ` of ${coffees.length}` : '');
}

function rowHtml(c) {
  const cells = COLUMNS.map(col => {
    let val = col.key === 'date' ? prettyDate(c.date) : (c[col.key] || '');
    let inner = esc(val);
    if (col.key === 'coffee' && c.review) inner += '<span class="review-mark">REVIEW</span>';
    const cls = `c-${col.key}` + (val ? '' : ' empty-cell');
    return `<td class="${cls}">${inner || '—'}</td>`;
  }).join('');
  return `<tr data-id="${c.id}" class="${c.review ? 'review' : ''}">${cells}</tr>`;
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, m =>
    ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));
}

/* ---------- stats & filters ---------- */
function refreshAux() {
  const countries = [...new Set(coffees.map(c => c.country).filter(Boolean))].sort();
  const processes = [...new Set(coffees.map(c => c.process).filter(Boolean))].sort();
  const roasters  = [...new Set(coffees.map(c => c.roaster).filter(Boolean))].sort();

  const years = [...new Set(coffees.map(c => yearOf(c.date)).filter(Boolean))]
    .sort((a, b) => b.localeCompare(a));
  fillSelect(el('filterCountry'), countries, 'All countries');
  fillSelect(el('filterProcess'), processes, 'All processes');
  fillSelect(el('chartYear'), years, 'All years');
  fillDatalist(el('countries'), countries);
  fillDatalist(el('processes'), processes);
  fillDatalist(el('roasters'), roasters);

  el('stats').innerHTML = [
    ['Coffees', coffees.length],
    ['Roasters', roasters.length],
    ['Origins', countries.length],
  ].map(([lbl, num]) =>
    `<div class="stat"><div class="num">${num}</div><div class="lbl">${lbl}</div></div>`
  ).join('');

  renderChart();
  // keep the wheel in step with edits, but only while it's the visible tab
  if (el('profilesView') && !el('profilesView').hidden) renderProfiles();
}

const VIEWS = ['log', 'chart', 'roaster', 'profiles', 'recos'].filter(v => !PUBLIC || v !== 'recos');
function switchView(view) {
  if (!VIEWS.includes(view)) view = 'log';
  document.querySelectorAll('.tab').forEach(t =>
    t.classList.toggle('active', t.dataset.view === view));
  el('logView').hidden = view !== 'log';
  el('chartView').hidden = view !== 'chart';
  el('roasterView').hidden = view !== 'roaster';
  el('profilesView').hidden = view !== 'profiles';
  if (!PUBLIC) el('recosView').hidden = view !== 'recos';
  if (view === 'profiles') renderProfiles();
  if (view === 'recos') { renderRecos(); autoLoadRecos(); }
  if (location.hash.slice(1) !== view) history.replaceState(null, '', '#' + view);
}
function yearOf(d) { const m = /(\d{4})/.exec(d || ''); return m ? m[1] : ''; }
function renderChart() {
  const yr = el('chartYear') ? el('chartYear').value : '';
  const byYear = yr ? coffees.filter(c => yearOf(c.date) === yr) : coffees;
  el('chartTitle').textContent =
    'Coffees by country of origin' + (yr ? ` — ${yr}` : '');
  renderBars('country', 'chart', 'chartSub', 'origin', byYear);
  renderBars('roaster', 'roasterChart', 'roasterSub', 'roaster', coffees);
}
// tally coffees by a field and draw ranked bars into `chartId`
function renderBars(key, chartId, subId, unit, list = coffees) {
  const counts = {};
  for (const c of list) {
    const k = c[key] && c[key].trim() ? c[key].trim() : 'Unknown';
    counts[k] = (counts[k] || 0) + 1;
  }
  const rows = Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const max = rows.length ? rows[0][1] : 1;
  el(chartId).innerHTML = rows.map(([name, n]) => `
    <div class="bar-row">
      <div class="bar-label" title="${esc(name)}">${esc(name)}</div>
      <div class="bar-track">
        <div class="bar-fill" style="width:${(n / max * 100).toFixed(1)}%"></div>
        <span class="bar-count">${n}</span>
      </div>
    </div>`).join('');
  el(subId).textContent =
    `${list.length} coffees across ${rows.length} ${unit}${rows.length === 1 ? '' : 's'}`;
}

/* ---------- tasting profiles ----------
   An SCA-style flavour wheel over the log's own tasting notes: inner ring =
   flavour family, outer ring = sub-group, both sized by how often you've
   logged them. The ranked list beside it is the table view — the wheel shows
   shape, the bars are where you actually read magnitudes off. */

const WHEEL = { size: 560, r0: 86, r1: 152, r2: 154, r3: 218 };
let flavorFilter = null;   // selected family name, or null for all
let originFilter = 'all';  // 'all' | 'single' | 'blend'

function polarXY(r, deg) {
  const a = (deg - 90) * Math.PI / 180;
  return [WHEEL.size / 2 + r * Math.cos(a), WHEEL.size / 2 + r * Math.sin(a)];
}
// one wedge of an annulus, a0 -> a1 clockwise from 12 o'clock
function wedgePath(r0, r1, a0, a1) {
  const big = a1 - a0 > 180 ? 1 : 0;
  const [xa, ya] = polarXY(r1, a0), [xb, yb] = polarXY(r1, a1);
  const [xc, yc] = polarXY(r0, a1), [xd, yd] = polarXY(r0, a0);
  return `M${xa.toFixed(2)} ${ya.toFixed(2)}A${r1} ${r1} 0 ${big} 1 ${xb.toFixed(2)} ${yb.toFixed(2)}` +
         `L${xc.toFixed(2)} ${yc.toFixed(2)}A${r0} ${r0} 0 ${big} 0 ${xd.toFixed(2)} ${yd.toFixed(2)}Z`;
}
// arc for a curved label; runs backwards on the lower half so text stays upright
function labelPath(r, a0, a1) {
  const mid = (a0 + a1) / 2, flip = mid > 90 && mid < 270;
  const [s, e] = flip ? [a1, a0] : [a0, a1];
  const [xa, ya] = polarXY(r, s), [xb, yb] = polarXY(r, e);
  return `M${xa.toFixed(2)} ${ya.toFixed(2)}A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} ${flip ? 0 : 1} ${xb.toFixed(2)} ${yb.toFixed(2)}`;
}
// a 2px surface gap between fills, expressed as the angle 2px subtends at r
const gapAt = r => Math.min(2, 114.59 / r);
// does `text` fit along the arc it would sit on?
const fitsArc = (text, r, sweep, px) =>
  (sweep / 360) * 2 * Math.PI * r > text.length * px * 0.58 + 10;

function renderProfiles() {
  const scope = filterByOrigin(coffees, originFilter);
  const prof = buildFlavorProfile(scope);
  // a family can vanish under you (import, reset, or the last note of a family
  // edited away) — drop the selection rather than filter to something gone
  if (flavorFilter && !prof.groups.has(flavorFilter)) flavorFilter = null;
  const scopeWord = originFilter === 'single' ? 'single-origin coffees'
    : originFilter === 'blend' ? 'blends' : 'coffees';
  el('profilesSub').textContent =
    `${prof.mentions} notes across ${prof.withNotes} of ${prof.coffees} ${scopeWord}`;
  el('originToggle').querySelectorAll('.seg').forEach(b =>
    b.classList.toggle('active', b.dataset.origin === originFilter));

  const total = prof.rings.reduce((s, g) => s + g.count, 0);
  if (!total) {
    el('wheel').innerHTML = `<div class="empty">No tasting notes on ${
      originFilter === 'blend' ? 'any blends' :
      originFilter === 'single' ? 'any single-origin coffees' : 'any coffees'} yet.</div>`;
    el('noteBars').innerHTML = ''; el('bodyAside').textContent = '';
    return;
  }

  const inner = [], outer = [], labels = [], legend = [];
  let a = 0;
  prof.rings.forEach(g => {
    const sweep = g.count / total * 360, a0 = a, a1 = a + sweep;
    const gi = gapAt(WHEEL.r1) / 2;
    inner.push(`<path class="wedge" d="${wedgePath(WHEEL.r0, WHEEL.r1, a0 + gi, a1 - gi)}"
      fill="${g.color}" data-family="${esc(g.name)}"
      data-tip="${esc(g.name)} · ${g.count} notes · ${(g.count / total * 100).toFixed(0)}% · ${g.coffees.size} coffees"></path>`);
    const lr = (WHEEL.r0 + WHEEL.r1) / 2, gshort = FLAVOR_SHORT[g.name] || g.name;
    if (fitsArc(gshort, lr, sweep, 12)) {
      labels.push(`<path id="lp1-${legend.length}" d="${labelPath(lr, a0 + gi, a1 - gi)}" fill="none"></path>
        <text class="wedge-label wedge-label-in"><textPath href="#lp1-${legend.length}" startOffset="50%">${esc(gshort)}</textPath></text>`);
    }
    // outer ring: this family's sub-groups, largest first
    let b = a0;
    [...g.subs.entries()].sort((x, y) => y[1] - x[1]).forEach(([sub, n]) => {
      const ss = n / total * 360, b0 = b, b1 = b + ss;
      const go = gapAt(WHEEL.r3) / 2;
      outer.push(`<path class="wedge" d="${wedgePath(WHEEL.r2, WHEEL.r3, b0 + go, b1 - go)}"
        fill="${g.color}" fill-opacity="0.55" data-family="${esc(g.name)}"
        data-tip="${esc(sub)} · ${n} notes · ${(n / total * 100).toFixed(0)}%"></path>`);
      const or = (WHEEL.r2 + WHEEL.r3) / 2, sshort = FLAVOR_SHORT[sub] || sub;
      if (fitsArc(sshort, or, ss, 11)) {
        labels.push(`<path id="lp2-${outer.length}" d="${labelPath(or, b0 + go, b1 - go)}" fill="none"></path>
          <text class="wedge-label wedge-label-out"><textPath href="#lp2-${outer.length}" startOffset="50%">${esc(sshort)}</textPath></text>`);
      }
      b = b1;
    });
    legend.push(g);
    a = a1;
  });

  el('wheel').innerHTML = `
    <svg viewBox="0 0 ${WHEEL.size} ${WHEEL.size}" class="wheel-svg" role="img"
         aria-label="Flavour wheel of ${prof.mentions} tasting notes. Largest family ${esc(prof.rings[0].name)} at ${(prof.rings[0].count / total * 100).toFixed(0)} percent.">
      <g>${inner.join('')}${outer.join('')}</g>
      <g class="wheel-labels" aria-hidden="true">${labels.join('')}</g>
      <text class="wheel-total" x="${WHEEL.size / 2}" y="${WHEEL.size / 2 - 6}">${prof.mentions}</text>
      <text class="wheel-total-sub" x="${WHEEL.size / 2}" y="${WHEEL.size / 2 + 16}">notes logged</text>
      <text class="wheel-total-sub" x="${WHEEL.size / 2}" y="${WHEEL.size / 2 + 34}">${prof.rings.length} families</text>
    </svg>
    <div id="wheelTip" class="wheel-tip" hidden></div>`;

  el('wheelCaption').innerHTML = legend.map(g =>
    `<button class="legend-item" data-family="${esc(g.name)}">
       <span class="legend-dot" style="background:${g.color}"></span>${esc(g.name)}
       <span class="legend-n">${g.count}</span></button>`).join('');

  const aside = prof.aside.filter(g => g.name !== OTHER_GROUP || g.count);
  el('bodyAside').textContent = aside.length
    ? aside.map(g => `${g.count} ${g.name === BODY_GROUP ? 'notes describe body or balance' : 'unclassified'}`).join(' · ') +
      ' — kept off the wheel, since they describe texture rather than flavour.'
    : '';

  renderNoteBars(prof);
  wireWheel(prof);
}

// ranked individual notes — the readable counterpart to the wheel
function renderNoteBars(prof) {
  const pick = flavorFilter && prof.groups.get(flavorFilter);
  const src = pick ? pick.notes : (() => {
    const all = new Map();
    prof.groups.forEach((g, name) => {
      if (name === BODY_GROUP || name === OTHER_GROUP) return;
      g.notes.forEach((n, note) => all.set(note, (all.get(note) || 0) + n));
    });
    return all;
  })();
  const rows = [...src.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 25);
  const max = rows.length ? rows[0][1] : 1;
  el('notesTitle').textContent = flavorFilter ? `${flavorFilter} — most-logged notes` : 'Most-logged notes';
  el('clearFlavor').hidden = !flavorFilter;
  el('noteBars').innerHTML = rows.map(([note, n]) => {
    const fam = flavorFilter || classifyFlavor(note).l1;
    const color = FLAVOR_COLORS[fam] || 'var(--ink-soft)';
    return `<div class="note-row">
      <div class="note-label" title="${esc(note)}">${esc(note)}</div>
      <div class="note-track">
        <div class="note-fill" style="width:${(n / max * 100).toFixed(1)}%;background:${color}"></div>
        <span class="note-count">${n}</span>
      </div>
    </div>`;
  }).join('') || '<div class="empty">No notes in this family.</div>';
}

function wireOriginToggle() {
  const box = el('originToggle');
  if (!box) return;
  box.onclick = e => {
    const b = e.target.closest('.seg');
    if (!b || b.dataset.origin === originFilter) return;
    originFilter = b.dataset.origin;
    flavorFilter = null;          // a family selected in one scope may not exist in the next
    renderProfiles();
  };
}

function wireWheel(prof) {
  const tip = el('wheelTip'), svg = el('wheel').querySelector('.wheel-svg');
  if (!svg) return;
  svg.addEventListener('mousemove', e => {
    const w = e.target.closest('.wedge');
    if (!w) { tip.hidden = true; return; }
    const box = el('wheel').getBoundingClientRect();
    tip.textContent = w.dataset.tip;
    tip.hidden = false;
    tip.style.left = (e.clientX - box.left + 14) + 'px';
    tip.style.top = (e.clientY - box.top + 14) + 'px';
  });
  svg.addEventListener('mouseleave', () => { tip.hidden = true; });
  const choose = name => {
    flavorFilter = flavorFilter === name ? null : name;
    renderNoteBars(prof);
    el('wheel').querySelectorAll('.wedge').forEach(p =>
      p.classList.toggle('dim', !!flavorFilter && p.dataset.family !== flavorFilter));
  };
  svg.addEventListener('click', e => {
    const w = e.target.closest('.wedge');
    if (w) choose(w.dataset.family);
  });
  el('wheelCaption').querySelectorAll('.legend-item').forEach(b =>
    b.addEventListener('click', () => choose(b.dataset.family)));
  // a re-render (you added a coffee) rebuilds the SVG, so re-apply the dimming
  // that a still-active filter implies
  if (flavorFilter) el('wheel').querySelectorAll('.wedge').forEach(p =>
    p.classList.toggle('dim', p.dataset.family !== flavorFilter));
  el('clearFlavor').onclick = () => { flavorFilter = null; renderNoteBars(prof);
    el('wheel').querySelectorAll('.wedge').forEach(p => p.classList.remove('dim')); };
}

/* ---------- recommendations ----------
   Builds a taste profile from the log, scores a curated roaster list against
   it, and (best-effort, via the local helper) pulls each roaster's live
   Shopify catalog to surface in-stock coffees matched to your taste. */

let PROFILE = null;
const CATALOG_CACHE = new Map();    // domain -> slim product list (this session)
const CATALOG_INFLIGHT = new Map(); // domain -> in-flight fetch promise (dedupe)
const CAT_PREFIX = 'coffeelog.cat2.';  // v2: slim products now keep variant titles
const CAT_TTL = 6 * 3600 * 1000;    // reuse a catalog for 6h across reloads

function readPersistentCatalog(domain) {
  try {
    const o = JSON.parse(localStorage.getItem(CAT_PREFIX + domain) || 'null');
    if (!o) return null;
    if (Date.now() - o.t > CAT_TTL) { localStorage.removeItem(CAT_PREFIX + domain); return null; }
    return o.p;
  } catch (_) { return null; }
}
function writePersistentCatalog(domain, products) {
  const payload = JSON.stringify({ t: Date.now(), p: products });
  try { localStorage.setItem(CAT_PREFIX + domain, payload); }
  catch (_) { purgeCatalogCache(); try { localStorage.setItem(CAT_PREFIX + domain, payload); } catch (_) {} }
}
// only ever removes our own cat.* keys — never touches the coffee log
function purgeCatalogCache() {
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const k = localStorage.key(i);
    if (k && k.startsWith(CAT_PREFIX)) localStorage.removeItem(k);
  }
}
// prefetch catalogs in the background so the next visit/shuffle is instant
function warmCatalogs() {
  mapLimit(window.RECO_ROASTERS || [], 3, r => getCatalog(r.domain).catch(() => {}));
}

function splitMulti(s) {
  return String(s || '').split(/[,/;+&]| and /i).map(x => x.trim()).filter(Boolean);
}
function notesList(s) {
  return String(s || '').split(/[,/;•·]| and /i)
    .map(x => x.trim().toLowerCase()).filter(x => x.length > 2);
}

// generic geography/process words that shouldn't count as a "grower" match
const FARM_STOP = new Set(['region', 'regional', 'valley', 'washing', 'station', 'farm',
  'farms', 'finca', 'fincas', 'estate', 'coop', 'cooperative', 'mill', 'sitio', 'fazenda',
  'hacienda', 'quinta', 'district', 'county', 'municipality', 'community', 'village',
  'water', 'del', 'los', 'las', 'san', 'santa', 'santo', 'the', 'and', 'various', 'blend',
  'unknown', 'producer', 'producers', 'washed', 'natural', 'honey', 'anaerobic', 'lot',
  'microlot', 'micro', 'huila', 'narino', 'nariño', 'cauca', 'tolima', 'antioquia',
  'sidama', 'guji', 'yirgacheffe', 'tarrazu', 'tarrazú', 'oromia', 'kayanza', 'gedeb']);

function buildProfile() {
  const bag = { origins: {}, processes: {}, varieties: {}, notes: {}, roasters: {} };
  const add = (o, v) => { v = v.trim(); if (v && v.toLowerCase() !== 'blend') o[v] = (o[v] || 0) + 1; };
  const farmPhrases = [], farmTokens = new Set(), farmOrig = new Map();
  const stop = new Set([...FARM_STOP, ...(typeof ORIGINS !== 'undefined' ? ORIGINS.map(o => o.toLowerCase()) : [])]);
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  for (const c of coffees) {
    if (c.roaster) add(bag.roasters, c.roaster);
    if (c.country) add(bag.origins, c.country);
    splitMulti(c.process).forEach(p => add(bag.processes, p));
    splitMulti(c.variety).forEach(v => add(bag.varieties, v));
    notesList(c.tasting_notes).forEach(n => add(bag.notes, n));
    // farm / producer signal
    const f = (c.farm || '').trim(), low = f.toLowerCase();
    if (low.length >= 6 && !farmPhrases.includes(low)) { farmPhrases.push(low); farmOrig.set(low, f); }
    for (const t of low.split(/[^a-z0-9'’]+/)) {
      if (t.length >= 4 && !stop.has(t)) { farmTokens.add(t); if (!farmOrig.has(t)) farmOrig.set(t, cap(t)); }
    }
  }
  const rank = o => Object.entries(o).sort((a, b) => b[1] - a[1]);
  const weights = ranked => {
    const m = {}, max = ranked.length ? ranked[0][1] : 1;
    ranked.forEach(([k, n]) => m[k.toLowerCase()] = n / max);
    return m;
  };
  PROFILE = {
    roasters: rank(bag.roasters),
    origins: rank(bag.origins), processes: rank(bag.processes),
    varieties: rank(bag.varieties), notes: rank(bag.notes),
    roasterSet: new Set(coffees.map(c => (c.roaster || '').trim().toLowerCase()).filter(Boolean)),
    loggedSet: new Set(coffees.map(c => `${(c.roaster || '').trim().toLowerCase()}|${(c.coffee || '').trim().toLowerCase()}`)),
    farmPhrases, farmTokens, farmOrig,
  };
  PROFILE.origW = weights(PROFILE.origins);
  PROFILE.procW = weights(PROFILE.processes);
  PROFILE.varW = weights(PROFILE.varieties);
  PROFILE.noteW = weights(PROFILE.notes);
}

// does this coffee's farm/producer match one you've logged? returns display term
function farmMatch(farm) {
  if (!farm || !PROFILE.farmTokens) return '';
  const low = farm.toLowerCase();
  for (const p of PROFILE.farmPhrases) {
    if (p.length >= 6 && (low.includes(p) || p.includes(low))) return PROFILE.farmOrig.get(p) || p;
  }
  for (const t of low.split(/[^a-z0-9'’]+/)) {
    if (t.length >= 5 && PROFILE.farmTokens.has(t)) return PROFILE.farmOrig.get(t) || t;
  }
  return '';
}
// score a coffee: `tasteScore` is pure profile fit; `score` adds a producer
// bonus; `farmMatch` is set when its grower matches one you've logged
function scoreCoffee(c) {
  let taste = 0; const why = [];
  const o = (c.country || '').toLowerCase();
  if (PROFILE.origW[o]) { taste += 4 * PROFILE.origW[o]; if (PROFILE.origW[o] >= 0.12) why.push(c.country); }
  splitMulti(c.process).forEach(p => { const w = PROFILE.procW[p.toLowerCase()]; if (w) taste += 2 * w; });
  splitMulti(c.variety).forEach(v => {
    const w = PROFILE.varW[v.toLowerCase()]; if (w) { taste += 1.5 * w; if (w >= 0.25) why.push(v); }
  });
  const shared = [];
  notesList(c.tasting_notes).forEach(n => { if (PROFILE.noteW[n]) { taste += 1.3 * PROFILE.noteW[n]; shared.push(n); } });
  if (shared.length) why.push('notes: ' + shared.slice(0, 3).join(', '));
  const fm = farmMatch(c.farm);
  if (fm) { c.farmMatch = fm; why.unshift('same grower you’ve had: ' + fm); }
  return { score: taste + (fm ? 6 : 0), tasteScore: taste, why, farmMatch: fm };
}
// randomness + diversity helpers for rotating recommendations
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
function weightedIndex(weights) {
  const sum = weights.reduce((x, y) => x + y, 0); let r = Math.random() * sum;
  for (let i = 0; i < weights.length; i++) { r -= weights[i]; if (r <= 0) return i; }
  return weights.length - 1;
}
// four complementary picks, each a different roaster:
//   1) pure taste-profile match  2) a grower you've had  3) a budget bag
//   4) a wildcard/new find
const BUDGET_MAX = 20;   // the "Under $20" slot's ceiling
function pickFour(pool) {
  const chosen = [], usedR = new Set(), usedC = new Set();
  const avail = c => !usedC.has(c) && !usedR.has((c.roaster || '').toLowerCase());
  const take = (c, slot) => {
    if (!c) return; c.slot = slot; chosen.push(c);
    usedC.add(c); usedR.add((c.roaster || '').toLowerCase());
  };
  const draw = (list, wf) => {
    const f = list.filter(avail); if (!f.length) return null;
    return f[weightedIndex(f.map(wf))];
  };
  const isNew = c => !PROFILE.roasterSet.has((c.roaster || '').toLowerCase());

  // most constrained first so it isn't crowded out: a grower you've logged
  take(draw(pool.filter(c => c.farmMatch), c => Math.max(0.15, c.score)), 'Same grower');
  // a bag under the budget ceiling — unpriced coffees give NaN and drop out.
  // Weighted by taste score so it's the best cheap bag, not just any cheap bag.
  take(draw(pool.filter(c => parseFloat(c.price) < BUDGET_MAX),
    c => Math.max(0.15, c.score)), `Under $${BUDGET_MAX}`);
  // pure taste profile — weighted-random among the best taste fits
  take(draw([...pool].sort((a, b) => b.tasteScore - a.tasteScore).slice(0, 12),
    c => Math.max(0.15, c.tasteScore)), 'Your taste');
  // wildcard — random, preferring a roaster you've never logged
  const rest = pool.filter(avail);
  const fresh = rest.filter(isNew);
  const wp = fresh.length ? fresh : rest;
  const wild = wp.length ? wp[Math.floor(Math.random() * wp.length)] : null;
  take(wild, wild && isNew(wild) ? 'New roaster' : 'Wildcard');

  // backfill if a slot came up empty (e.g. no grower match, nothing under the cap)
  if (chosen.length < 4) for (const c of [...pool].sort((a, b) => b.score - a.score)) {
    if (chosen.length >= 4) break;
    if (avail(c)) take(c, 'Your taste');
  }
  const order = { 'Your taste': 0, 'Same grower': 1, [`Under $${BUDGET_MAX}`]: 2,
    'New roaster': 3, 'Wildcard': 3 };
  return chosen.sort((a, b) => (order[a.slot] ?? 9) - (order[b.slot] ?? 9));
}
function scoreRoaster(r) {
  let s = 0; const why = new Set();
  r.origins.forEach(o => { const w = PROFILE.origW[o.toLowerCase()]; if (w) { s += w; if (w >= 0.2) why.add(o); } });
  r.processes.forEach(p => { const w = PROFILE.procW[p.toLowerCase()]; if (w) s += 0.5 * w; });
  const loved = PROFILE.roasterSet.has(r.name.toLowerCase());
  if (loved) s += 1.5;
  return { score: s, why: [...why], loved };
}

function renderRecos() {
  buildProfile(); // taste profile drives the scoring, even though it's no longer shown
}

// keep only the fields we need, and cap description size (session cache)
function slimProduct(p) {
  return {
    title: p.title, vendor: p.vendor, handle: p.handle, product_type: p.product_type,
    tags: p.tags, body_html: (p.body_html || '').slice(0, 2500),
    variants: (p.variants || []).map(v => ({ price: v.price, available: v.available, title: v.title })),
  };
}
async function fetchCatalogJson(domain) {
  const url = `https://${domain}/products.json?limit=250`;
  // local helper first (no CORS/no rate-limit issues), then direct, then proxy
  try {
    const r = await fetch('/fetch?url=' + encodeURIComponent(url), { cache: 'no-store' });
    if (r.ok) return await r.json();
  } catch (_) {}
  try { const r = await fetch(url); if (r.ok) return await r.json(); } catch (_) {}
  const txt = await fetchViaProxy(url);
  return JSON.parse(txt);
}
async function getCatalog(domain) {
  if (CATALOG_CACHE.has(domain)) return CATALOG_CACHE.get(domain);
  const persisted = readPersistentCatalog(domain);
  if (persisted) { CATALOG_CACHE.set(domain, persisted); return persisted; }
  if (CATALOG_INFLIGHT.has(domain)) return CATALOG_INFLIGHT.get(domain); // dedupe warm + scan
  const p = (async () => {
    const data = await fetchCatalogJson(domain);
    const products = (data.products || []).map(slimProduct);
    CATALOG_CACHE.set(domain, products);
    writePersistentCatalog(domain, products);
    return products;
  })().finally(() => CATALOG_INFLIGHT.delete(domain));
  CATALOG_INFLIGHT.set(domain, p);
  return p;
}

function isCoffeeLike(c) {
  // `name` = product type + title only; `hay` also folds in tags. Match product
  // shape (merch / gear / subscriptions) against `name`, NOT tags — roasters tag
  // real coffees with brew methods and subscription metadata (e.g. Verve's
  // "CS: AeroPress", "CS: Pour Over", "Blend Subscription Tag") that would
  // otherwise get whole-bean coffees mis-flagged as gear.
  const name = `${c.type || ''} ${c.coffee || ''}`.toLowerCase();
  const hay = `${name} ${c.tagstr || ''}`.toLowerCase();
  // merch / gear / gift cards / subscriptions
  if (/gift ?card|subscription|\bmerch(?:andise)?\b|\bmugs?\b|tote|shirt|hoodie|equipment|filter|dripper|kettle|grinder|\bbook\b|apparel|sticker|carafe|scale|beanie|\bhat\b|tumbler|bundle|voucher|e-?gift/.test(name))
    return false;
  // books and other reading matter. Roasters file these under a "Publication"
  // product_type, and most titles never say "book" — Square Mile alone sells
  // "The World Atlas of Coffee", "Terroir Coffee from Seed to Harvest" and
  // "What I Know About Running Coffee Shops", all of which read as coffee to
  // the catch-all at the bottom.
  if (/\bpublications?\b|\bmagazines?\b|\bzine\b|\bcourses?\b/.test(name))
    return false;
  // printed collateral sold alongside the beans — info cards, pot tags, posters.
  // Passenger files these under product_type "Collateral" and titles them e.g.
  // "Coffee Info Card Set", so the word "coffee" in the name would otherwise let
  // the catch-all at the bottom wave them through. ("cardamom"/"Cardenas" are
  // safe: \b keeps \bcards?\b from matching inside a longer word.)
  if (/\bcollateral\b|\bcards?\b|postcard|\bposters?\b|\bsignage\b/.test(name))
    return false;
  // brewing gear whose name gives it away (drippers, kettles, coffee makers…)
  if (/chemex|aeropress|kalita|hario|v60|prismo|gooseneck|pour.?over|french press|moka pot|\bbrewers?\b|coffee maker|\bmaker\b|\bserver\b|brew ?gear/.test(name))
    return false;
  // non-coffee product categories, incl. localized ones from non-English
  // roasters — e.g. Nomad (ES): "Cursos" (courses), "Objetos", "Textil",
  // "Equipamiento", "Suscripción", "Libro" (book), "Monográfico"
  if (/equipamiento|\bcursos?\b|taller|monogr|academy|objetos|\btextil\b|merchandising|suscripci|\blibro\b/.test(name))
    return false;
  // gear whose only tell is a category tag — e.g. a Fellow espresso machine
  // resold with an empty product_type but an "Equipment" tag. This token never
  // appears on a real coffee, so it's safe to read from the tags too.
  if (/\bequipment\b|equipamiento/.test(hay)) return false;
  // wholesale-account-only lots and instant / single-serve coffee
  if (/\bwholesale\b|\btrade\b|\binstant\b|steeped|sachet|\bsingle[- ]?serve\b|\bpods?\b|k-?cup|capsule/.test(name))
    return false;
  // ready-to-drink: iced coffee, canned/bottled RTD, bag-in-box, kegs. Keyed on
  // the beverage product type / "iced coffee" name / RTD packaging — NOT bare
  // "cold brew" or "nitro", which are also real whole-bean coffees (e.g.
  // Passenger's "Necessary Cold Brew", Black & White's "Nitro Caturra").
  if (/iced coffee|iced latte|\brtd\b|ready.to.drink|\bbebidas?\b|bag ?in ?box|baginbox|on tap|\bkegs?\b/.test(name))
    return false;
  // tea and other non-coffee drinks (roasters like Passenger sell tea too);
  // these often carry an origin country, so screen them before the country pass.
  // (no bare "mate" — it hits producer/farm names like "Mate Matiwos")
  if (/\btea\b|\bteas\b|matcha|oolong|\bpu-?erh?\b|\bchai\b|yerba|tisane|herbal|rooibos|gaiwan|teaware|cocoa|\bcacao\b|hot chocolate|drinking chocolate/.test(hay))
    return false;
  if (c.country) return true;
  return /coffee|beans|espresso|single origin|micro ?lot|roast/.test(hay);
}
// wholesale / cafe-only / white-label lots you can't just add to cart — these
// sit behind a trade login. Spot them by a white-label tag, a "Cafes Only" /
// "Wholesale" name, or variants sold only in bulk (5lb, case packs, supersacks).
const BULK_VARIANT = /case pack|super\s?sack|pallet|\b(?:[2-9]|\d\d+)\s?lbs?\b/i;
function isTradeGated(p) {
  const tags = (Array.isArray(p.tags) ? p.tags.join(', ') : (p.tags || '')).toLowerCase();
  if (/white[- ]?label/.test(tags)) return true;
  // cafe-channel / members-only lots that show as "locked" without a trade login
  // (e.g. Onyx's "onyx cafes" tag on its 8oz/27oz cafe-espresso bags)
  if (/\bcafes?\s*only\b|onyx cafes|(?:^|, )cafes?(?:,|$)|\bmembers?[- ]only\b|\btrade[- ]only\b|\bwholesale[- ]only\b/.test(tags)) return true;
  if (/\bcafes? only\b|\bwholesale\b|white[- ]?label/.test((p.title || '').toLowerCase())) return true;
  const titles = (p.variants || []).map(v => v.title || '').filter(Boolean);
  return titles.length > 0 && titles.every(t => BULK_VARIANT.test(t));
}
// green (unroasted) beans for home roasters — Prodigal sells these alongside its
// roasted bags. Keyed on the product type or an exact "green" tag, never a loose
// substring: Onyx tags roasted coffees with bag colours ("COLOR: Green") and B&W
// sells a roasted coffee called "Rodrigo Sanchez - Green Tea".
function isGreenCoffee(p) {
  if (/\bgreen\b|\bunroasted\b|\braw\b/.test((p.product_type || '').toLowerCase())) return true;
  if (/\bgreen coffee\b|\bunroasted\b/.test((p.title || '').toLowerCase())) return true;
  const tags = (Array.isArray(p.tags) ? p.tags : String(p.tags || '').split(','))
    .map(t => String(t).trim().toLowerCase());
  return tags.some(t => t === 'green' || t === 'green coffee' || t === 'unroasted');
}
// grams for a variant title like "250 g", "10oz", "2 lb", "1kg" — null if none
function variantGrams(title) {
  const s = (title || '').toLowerCase();
  let m = s.match(/([\d.]+)\s*kg/);       if (m) return parseFloat(m[1]) * 1000;
  m = s.match(/([\d.]+)\s*g\b/);           if (m) return parseFloat(m[1]);
  m = s.match(/([\d.]+)\s*lbs?\b/);        if (m) return parseFloat(m[1]) * 453.6;
  m = s.match(/([\d.]+)\s*oz\b/);          if (m) return parseFloat(m[1]) * 28.35;
  return null;
}
// The card should show the price of a standard retail bag, not the cheapest
// tiny sample (e.g. Passenger's 125 g at $6 vs the 250 g bag at $22.25) nor a
// bulk sack. Drop sample (<150 g) and bulk (≥900 g / case) sizes, then take the
// lowest of what's left; fall back to the overall min if nothing qualifies.
function representativePrice(variants) {
  const priced = (variants || []).filter(v => parseFloat(v.price) > 0);
  const standard = priced.filter(v => {
    const t = (v.title || '').toLowerCase();
    if (/\bsample\b|case pack|super\s?sack|pallet/.test(t)) return false;
    const g = variantGrams(t);
    return g == null || (g >= 150 && g < 900);
  });
  const pool = standard.length ? standard : priced;
  if (!pool.length) return '';
  return String(Math.min(...pool.map(v => parseFloat(v.price)))).replace(/\.00$/, '');
}
// turn a roaster's raw catalog into scored, in-stock coffee recommendations
function enrichCatalog(products, roasterName, domain) {
  return products.filter(p => !isTradeGated(p) && !isGreenCoffee(p)).map(p => {
    const d = extractFromShopify(p, `https://${domain}/products/${p.handle}`);
    d.roaster = d.roaster || roasterName;
    d.price = representativePrice(p.variants);
    d.available = (p.variants || []).some(v => v.available !== false);
    d.url = `https://${domain}/products/${p.handle}`;
    d.type = p.product_type;
    d.tagstr = Array.isArray(p.tags) ? p.tags.join(' ') : (p.tags || '');
    Object.assign(d, scoreCoffee(d));
    return d;
  }).filter(c => c.available && isCoffeeLike(c)
    && !PROFILE.loggedSet.has(`${(c.roaster || '').trim().toLowerCase()}|${(c.coffee || '').trim().toLowerCase()}`));
}

function liveCardHtml(c, showRoaster) {
  const meta = [c.country, c.process, c.variety].filter(Boolean).map(esc).join(' · ');
  return `<div class="live-card" data-url="${esc(c.url || '')}">
    ${(showRoaster || c.slot) ? `<div class="lc-head">${c.slot ? `<span class="lc-slot">${esc(c.slot)}</span>` : ''}<span class="lc-roaster">${esc(c.roaster || '')}</span></div>` : ''}
    <div class="lc-top"><span class="lc-name">${esc(c.coffee || 'Coffee')}</span>${c.price ? `<span class="lc-price">$${esc(c.price)}</span>` : ''}</div>
    ${meta ? `<div class="lc-meta">${meta}</div>` : ''}
    <div class="lc-notes"${c.tasting_notes ? '' : ' hidden'}>${esc(c.tasting_notes || '')}</div>
    ${c.why && c.why.length ? `<div class="lc-why">✓ ${esc(c.why.slice(0, 3).join(' · '))}</div>` : ''}
    <a class="btn btn-primary lc-buy" href="${esc(c.url)}" target="_blank" rel="noopener">View &amp; buy ↗</a>
  </div>`;
}
// Catalog JSON often omits tasting notes (Onyx keeps them in a metafield the
// product page renders but /products.json doesn't). After the cards render, pull
// each pick's page in the background and drop the notes into its card.
const NOTES_CACHE = new Map();   // product url -> tasting notes (this session)
async function enrichCardNotes(picks, container) {
  const need = picks.filter(c => !c.tasting_notes && c.url);
  await mapLimit(need, 4, async c => {
    let notes = NOTES_CACHE.get(c.url);
    if (notes === undefined) {
      try {
        const html = await fetchPageHtml(c.url);
        const info = html ? extractFromHtml(html, c.url) : null;
        notes = (info && info.tasting_notes) || '';
      } catch (_) { notes = ''; }
      NOTES_CACHE.set(c.url, notes);
    }
    if (!notes) return;
    c.tasting_notes = notes;
    const card = [...container.querySelectorAll('.live-card')].find(el => el.dataset.url === c.url);
    const slot = card && card.querySelector('.lc-notes');
    if (slot) { slot.textContent = notes; slot.hidden = false; }
  });
}
function liveErrorHtml(e) {
  const helper = location.protocol === 'file:'
    ? 'Open the app via <code>python3 serve.py</code> (localhost) for live data.'
    : 'The roaster may be rate-limiting — try again in a minute.';
  return `<div class="reco-note">Couldn’t load live catalog (${esc(e.message || 'network error')}). ${helper}</div>`;
}

// run an async fn over items with bounded concurrency, preserving order
async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) { const idx = i++; results[idx] = await fn(items[idx], idx); }
  }));
  return results;
}
// load the 3 picks automatically the first time the tab is opened
function autoLoadRecos() {
  if (el('liveRecos').children.length) return; // already have picks showing
  if (el('checkStockBtn').disabled) return;    // a load is already in progress
  checkAllStock();
}
async function checkAllStock() {
  const btn = el('checkStockBtn'), status = el('recoStatus'), out = el('liveRecos');
  btn.disabled = true; const label = btn.textContent; btn.textContent = 'Finding coffees…';
  out.innerHTML = '';
  const roasters = window.RECO_ROASTERS || [];
  // reuse every catalog already fetched this session (free), then fetch a
  // rotating batch of new ones — so producer matches from new roasters
  // accumulate across clicks instead of relying on one random sample
  const cached = roasters.filter(r => CATALOG_CACHE.has(r.domain));
  const fresh = shuffle(roasters.filter(r => !CATALOG_CACHE.has(r.domain))).slice(0, 8);
  const toScan = [...cached, ...fresh];
  let ok = 0, done = 0, lastErr = null;
  // fetch catalogs in parallel (each is a different domain → one request each)
  const results = await mapLimit(toScan, 8, async r => {
    try { const items = enrichCatalog(await getCatalog(r.domain), r.name, r.domain); ok++; return items; }
    catch (e) { lastErr = e; return []; }
    finally { status.textContent = `Scanning catalogs… (${++done}/${toScan.length})`; }
  });
  const all = results.flat();
  const picks = pickFour(all);
  if (picks.length) {
    const roasterN = new Set(picks.map(p => p.roaster)).size;
    status.textContent = `${picks.length} picks across ${roasterN} roaster${roasterN === 1 ? '' : 's'} · click again to reshuffle`;
    out.innerHTML = picks.map(c => liveCardHtml(c, true)).join('');
    enrichCardNotes(picks, out);   // fill in tasting notes from each product page
  } else {
    status.textContent = '';
    out.innerHTML = ok ? '<div class="reco-empty">No in-stock coffees matched your taste right now.</div>'
      : liveErrorHtml(lastErr || { message: 'no catalogs reachable' });
  }
  btn.disabled = false; btn.textContent = label;
  warmCatalogs(); // pre-fetch the rest so the next shuffle/visit is instant
}

function fillSelect(sel, items, allLabel) {
  const cur = sel.value;
  sel.innerHTML = `<option value="">${allLabel}</option>` +
    items.map(i => `<option>${esc(i)}</option>`).join('');
  if (items.includes(cur)) sel.value = cur;
}
function fillDatalist(dl, items) {
  dl.innerHTML = items.map(i => `<option value="${esc(i)}">`).join('');
}

/* ---------- modal / form ---------- */
const modal = el('modal'), form = el('coffeeForm');

function openModal(coffee) {
  el('modalTitle').textContent = coffee ? 'Edit coffee' : 'Add coffee';
  form.reset();
  clearAutofillMarks();
  el('fetchUrl').value = '';
  hideFetchStatus();
  el('deleteBtn').hidden = !coffee;
  el('duplicateBtn').hidden = !coffee;
  form.id.value = coffee ? coffee.id : '';
  if (coffee) for (const f of FIELDS) form[f].value = coffee[f] || '';
  modal.hidden = false;
  form.date.focus();
}
function closeModal() { modal.hidden = true; }

form.onsubmit = e => {
  e.preventDefault();
  const data = {};
  for (const f of FIELDS) data[f] = form[f].value.trim();
  if (!data.date || !data.roaster) { alert('Date and Roaster are required.'); return; }
  const id = form.id.value;
  if (id) {
    const i = coffees.findIndex(c => c.id === +id);
    coffees[i] = { ...coffees[i], ...data, review: false };
  } else {
    coffees.push({ id: nextId(), ...data, review: false });
  }
  persist(coffees);
  refreshAux();
  render();
  closeModal();
};

// keep the filled-in values but detach from the original so Save creates a new
// entry — handy for logging a similar coffee
el('duplicateBtn').onclick = () => {
  form.id.value = '';
  el('modalTitle').textContent = 'Add coffee';
  el('deleteBtn').hidden = true;
  el('duplicateBtn').hidden = true;
  setFetchStatus('Duplicated — edit anything you like, then Save as a new entry.', 'ok');
  form.date.focus();
};

el('deleteBtn').onclick = () => {
  const id = +form.id.value;
  const c = coffees.find(c => c.id === id);
  if (!c) return;
  if (!confirm(`Delete "${c.coffee || 'this coffee'}" from ${c.roaster}?`)) return;
  coffees = coffees.filter(c => c.id !== id);
  persist(coffees);
  refreshAux();
  render();
  closeModal();
};

/* ---------- export / import / reset ---------- */
function exportData() {
  const blob = new Blob([JSON.stringify(coffees, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `coffee-log-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}
el('importFile').onchange = e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!Array.isArray(data)) throw new Error('Expected a JSON array');
      if (!confirm(`Import ${data.length} coffees? This replaces your current list.`)) return;
      data.forEach((c, i) => { if (c.id == null) c.id = i + 1; });
      persist(data);
      refreshAux();
      render();
    } catch (err) { alert('Import failed: ' + err.message); }
  };
  reader.readAsText(file);
  e.target.value = '';
};
function resetData() {
  if (!confirm('Reset to the original PDF data? This discards your changes since import.')) return;
  persist((window.SEED_COFFEES || []).map(c => ({ ...c })));
  refreshAux();
  render();
}

function updateStoreNote() {
  if (PUBLIC) { el('storeNote').textContent = `${coffees.length} coffees`; return; }
  el('storeNote').textContent =
    `${coffees.length} coffees saved in this browser · export a backup to keep them safe`;
}

/* ---------- auto-fill from a pasted URL ----------
   Browsers can't fetch arbitrary sites directly (CORS), so we route the
   request through a public read-only proxy, then scrape structured data
   (JSON-LD / Open Graph / Shopify product JSON) plus a few text heuristics.
   Everything filled is best-effort — review before saving. */

const PROXIES = [
  u => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
  u => `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(u)}`,
  u => `https://corsproxy.io/?url=${encodeURIComponent(u)}`,
];

// coffee-producing origins (longest first so "Papua New Guinea" beats "Guinea")
const ORIGINS = ['Papua New Guinea','Democratic Republic of Congo','DR Congo',
  'Costa Rica','El Salvador','Ivory Coast','Timor-Leste','East Timor',
  'Ethiopia','Kenya','Colombia','Brazil','Guatemala','Honduras','Panama','Peru',
  'Rwanda','Burundi','Tanzania','Uganda','Yemen','Indonesia','Sumatra','Java',
  'Sulawesi','Flores','Bali','Bolivia','Ecuador','Mexico','Nicaragua','India',
  'China','Yunnan','Myanmar','Thailand','Laos','Vietnam','Zambia','Malawi',
  'Zimbabwe','Congo','Nepal','Philippines','Jamaica','Haiti','Cuba','Cameroon'];

const PROCESSES = ['Carbonic Maceration','Anaerobic Natural','Anaerobic Washed',
  'Anaerobic','Wet Hulled','Wet-Hulled','Giling Basah','Pulped Natural',
  'Black Honey','Red Honey','Yellow Honey','White Honey','Honey',
  'Double Washed','Fully Washed','Washed','Natural','Dry Process','Wet Process',
  'Semi-Washed','Semi Washed','Semi-Lavado','Lactic','Thermal Shock'];

const VARIETIES = ['Pink Bourbon','Yellow Bourbon','Red Bourbon','Wush Wush',
  'Ethiopian Landrace','Villa Sarchi','Mundo Novo','Maragogipe','Ruiru 11',
  'Gesha','Geisha','Caturra','Castillo','Bourbon','Typica','Catuai','Catimor',
  'SL28','SL34','Pacamara','Pacas','Heirloom','Sidra','Java','Marsellesa',
  'Parainema','Chiroso','Batian','Colombia','Tabi','Laurina','Obata'];

// Most specialty roasters run on Shopify, whose /products/<handle>.json
// endpoint is served with open CORS — so we can read it directly, no proxy.
function shopifyJsonUrl(url) {
  try {
    const u = new URL(url);
    const m = u.pathname.match(/\/products\/[^/?#]+/);
    if (!m) return null;
    return u.origin + m[0].replace(/\.json$/i, '') + '.json';
  } catch (_) { return null; }
}
async function fetchShopifyProduct(url) {
  const jurl = shopifyJsonUrl(url);
  if (!jurl) return null;
  try {
    const res = await fetch(jurl, { headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    const data = await res.json();
    return (data && data.product) || null;
  } catch (_) { return null; }
}
function extractFromShopify(p, url) {
  const out = {};
  out.coffee  = firstStr(p.title);
  out.roaster = firstStr(p.vendor);
  out.desc    = stripTags(p.body_html || '');

  // tags come as a comma-joined string; some roasters encode "Key: Value"
  const tags = Array.isArray(p.tags) ? p.tags : String(p.tags || '').split(/,\s*/);
  const tag = {};
  tags.forEach(t => {
    const m = String(t).match(/^\s*([\w /]+?)\s*[:\-]\s*(.+)$/);
    if (m) tag[m[1].toLowerCase().trim()] = m[2].trim();
  });

  // "Producer: …Region: …Notes: …" style specs sometimes live in the body
  const labeled = parseLabeledText(out.desc);
  const hay = `${out.coffee}\n${tags.join(' ')}\n${out.desc}`;
  out.country = tag.origin || tag.country || labeled.country || firstMatch(hay, ORIGINS);
  out.process = tag.process || labeled.process || firstMatch(hay, PROCESSES);
  out.variety = tag.variety || tag.varietal || labeled.variety || matchAll(hay, VARIETIES);
  out.tasting_notes = tag['tasting notes'] || tag.notes || tag.flavour ||
    tag.flavor || labeled.notes || findTastingNotes(out.desc, hay);
  out.farm = tag.producer || tag.farm ||
    [labeled.farm, labeled.region].filter(Boolean).join(', ') || '';
  out.bought_from = out.roaster;
  out.coffee = cleanTitle(out.coffee, out.roaster);
  return out;
}

// drop a roaster/origin suffix from a title like "Limeira – Brazil"
function cleanTitle(title, roaster) {
  if (!title) return title;
  // split on pipe / en- / em-dash, or a spaced hyphen — but NOT a hyphen inside
  // a word like "t-shirt" (which would both mangle the name and hide it from
  // the merch filter)
  const parts = title.split(/\s*[|–—]\s*|\s+-\s+/).map(s => s.trim()).filter(Boolean);
  if (parts.length < 2) return title;
  const keep = parts.filter(p =>
    !roaster || p.toLowerCase() !== roaster.toLowerCase());
  return (keep[0] || parts[0]).trim();
}

// Get a page's full HTML. Prefers the local helper (serve.py's /fetch, no
// CORS limits — pulls the complete page incl. tasting notes); falls back to
// public proxies when the app is opened as a plain file.
async function fetchPageHtml(url) {
  try {
    const r = await fetch('/fetch?url=' + encodeURIComponent(url), { cache: 'no-store' });
    if (r.ok) { const t = await r.text(); if (t && t.length > 200) return t; }
  } catch (_) { /* helper not running — fall through */ }
  try { return await fetchViaProxy(url); } catch (_) { return null; }
}

async function fetchViaProxy(url) {
  let lastErr;
  for (const build of PROXIES) {
    try {
      const res = await fetch(build(url), { redirect: 'follow' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const text = await res.text();
      if (text && text.length > 200) return text;
      throw new Error('empty response');
    } catch (e) { lastErr = e; }
  }
  throw lastErr || new Error('all proxies failed');
}

// pull the best structured data we can out of the raw HTML
function extractFromHtml(html, sourceUrl) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const out = {};

  const meta = (sel) => {
    const m = doc.querySelector(sel);
    return m ? (m.getAttribute('content') || '').trim() : '';
  };

  // 1) JSON-LD Product
  let ld = null;
  doc.querySelectorAll('script[type="application/ld+json"]').forEach(s => {
    if (ld) return;
    try {
      let data = JSON.parse(s.textContent);
      const nodes = Array.isArray(data) ? data : (data['@graph'] || [data]);
      ld = nodes.find(n => n && /product/i.test([].concat(n['@type'] || '').join(' ')));
    } catch (_) {}
  });
  if (ld) {
    out.coffee = firstStr(ld.name);
    out.roaster = firstStr(ld.brand && (ld.brand.name || ld.brand)) ;
    out.desc = stripTags(firstStr(ld.description));
  }

  // 2) Shopify product JSON embedded in the page
  const shop = html.match(/"product"\s*:\s*(\{.*?"variants".*?\})\s*[,}]/s);
  if (shop) {
    try {
      const p = JSON.parse(shop[1]);
      out.coffee = out.coffee || p.title;
      out.roaster = out.roaster || p.vendor;
      out.desc = out.desc || stripTags(p.body_html || p.description || '');
    } catch (_) {}
  }

  // 3) Open Graph / meta / title fallbacks
  out.coffee = out.coffee || meta('meta[property="og:title"]') || (doc.title || '').trim();
  out.roaster = out.roaster || meta('meta[property="og:site_name"]');
  out.desc = out.desc ||
    stripTags(meta('meta[property="og:description"]') || meta('meta[name="description"]'));

  // roaster fallback from the hostname, e.g. onyxcoffeelab.com -> Onyxcoffeelab
  if (!out.roaster) {
    try {
      const host = new URL(sourceUrl).hostname.replace(/^www\./, '').split('.')[0];
      out.roaster = host.charAt(0).toUpperCase() + host.slice(1);
    } catch (_) {}
  }

  // split "Coffee Name — Roaster" style titles
  out.coffee = cleanTitle(out.coffee, out.roaster);

  // 4) labelled spec blocks (varietal / process / producer / notes …) that
  //    roaster themes render into the page but leave out of the product JSON
  const specs = extractSpecs(doc);

  // 5) some roasters cram every field into one description string with no
  //    separators — parse those "Label: value" runs
  const labeled = parseLabeledText(out.desc);

  // 6) heuristics over all the text, with specs/labels taking priority
  // prefer the coffee's own name/description over whole-page text, so origins
  // and varieties from related-product blocks or footers don't leak in
  const nameDesc = `${out.coffee || ''}\n${out.desc || ''}`;
  const hay = `${nameDesc}\n${textContent(doc)}`;
  out.country = specs.country || labeled.country || firstMatch(nameDesc, ORIGINS) || firstMatch(hay, ORIGINS);
  out.process = specs.process || labeled.process || firstMatch(nameDesc, PROCESSES) || firstMatch(hay, PROCESSES);
  out.variety = specs.varietal || labeled.variety || matchAll(nameDesc, VARIETIES) || matchAll(hay, VARIETIES);
  out.farm = specs.producer || specs.region ||
    [labeled.farm, labeled.region].filter(Boolean).join(', ') || '';
  out.tasting_notes = specs.notes || tastingNotesFromDom(doc) || labeled.notes ||
    flavourNotes(hay) || findTastingNotes(out.desc, hay);
  out.bought_from = out.roaster;

  // a spec like "Alta Mogiana, Brazil" -> country "Brazil", region into farm
  if (out.country) {
    const o = firstMatch(out.country, ORIGINS);
    if (o && o.toLowerCase() !== out.country.toLowerCase()) {
      const region = out.country.replace(new RegExp('[,\\s]*' + o + '.*', 'i'), '').trim();
      if (region && !out.farm) out.farm = region;
      out.country = o;
    }
  }
  return out;
}

// Pull "Label: value" spec blocks out of a rendered product page. Coffee
// themes lay these out as icon grids or spec tables; we look for a short
// label node and grab the value sitting next to it.
const SPEC_LABELS = [
  ['varietal', /^(varietals?|variet(?:y|ies)|cultivars?)$/i],
  ['process',  /^(process(?:ing)?(?: method)?)$/i],
  ['country',  /^(country|origin)$/i],
  ['producer', /^(producers?|farms?|farmers?|estate|co-?op(?:erative)?|grower)$/i],
  ['region',   /^(regions?)$/i],
  ['notes',    /^(tasting notes?|flavou?r notes?|cup(?:ping)? notes?)$/i],
];
function extractSpecs(doc) {
  const found = {};
  doc.querySelectorAll('strong, b, dt, th, .h6, [class*="label"], [class*="spec"]')
    .forEach(node => {
      const label = clean(node.textContent).replace(/[:\s]+$/, '');
      if (!label || label.length > 22) return;
      for (const [key, re] of SPEC_LABELS) {
        if (found[key] || !re.test(label)) continue;
        const val = specValue(node);
        if (val && val.length < 140) found[key] = val;
      }
    });
  return found;
}
function specValue(node) {
  // value usually lives in a sibling .prose/dd/td, often under the small
  // wrapper the label shares with it
  const pick = root => {
    if (!root) return '';
    const v = root.querySelector('.prose, dd, td, .value, .metafield');
    return v && !v.contains(node) ? clean(v.textContent) : '';
  };
  let val = pick(node.parentElement && node.parentElement.parentElement)
    || pick(node.parentElement);
  if (val) return val;
  // inline label followed by its value in sibling nodes, e.g.
  // "<strong>Varietal:</strong><span> Geisha<br></span><strong>Process:</strong>…"
  // — several Label/value pairs can share one <p>, so read only up to the next
  // label or <br>, not the whole paragraph (which would jumble the fields).
  if (/^(B|STRONG|SPAN|EM|I)$/.test(node.tagName)) {
    let acc = '';
    for (let sib = node.nextSibling; sib; sib = sib.nextSibling) {
      if (sib.nodeType === 1) {                       // element node
        if (/^(STRONG|B)$/.test(sib.tagName)) break;  // next label starts here
        if (sib.tagName === 'BR') break;              // end of this value line
      }
      acc += sib.textContent || '';
    }
    acc = clean(acc).replace(/^[:\-–]\s*/, '');
    if (acc && acc.length < 140 &&
        !SPEC_LABELS.some(([, re]) => re.test(acc.replace(/[:\s]+$/, '')))) return acc;
  }
  // inline "<p><b>Label:</b> value</p>" — value is the host text minus the label
  if (/^(B|STRONG|SPAN|EM|I)$/.test(node.tagName)) {
    const host = node.closest('p, li');
    if (host) {
      const lbl = clean(node.textContent), full = clean(host.textContent);
      if (full.length > lbl.length && full.length < 160) {
        const cut = full.startsWith(lbl) ? lbl.length : full.indexOf(lbl) + lbl.length;
        const rest = clean(full.slice(cut)).replace(/^[:\-–]\s*/, '');
        if (rest) return rest;
      }
    }
  }
  // fall back to the next sibling of the label (dt→dd, th→td style)
  let sib = (node.closest('dt, th, .h6, p, li') || node).nextElementSibling;
  while (sib) {
    const t = clean(sib.textContent);
    if (t && !SPEC_LABELS.some(([, re]) => re.test(t.replace(/[:\s]+$/, '')))) return t;
    sib = sib.nextElementSibling;
  }
  return '';
}
// Roasters usually print the headline tasting notes in a dedicated, classed
// element (e.g. <div class="coffee_tasting_notes">Almond • Brown Sugar •
// Caramel</div>) or as a short bullet/comma list — prefer that over the
// longer per-brew "Flavours of…" prose.
// common coffee tasting-note words, used to spot an unlabelled flavour line
// like "Strawberry, blood orange, Rainier cherry" that carries no "Notes:" cue
const FLAVOR_WORDS = new Set(['strawberry', 'raspberry', 'blueberry', 'blackberry',
  'boysenberry', 'cranberry', 'currant', 'blackcurrant', 'gooseberry', 'mulberry',
  'cherry', 'cherries', 'berry', 'berries', 'plum', 'peach', 'apricot', 'nectarine',
  'apple', 'pear', 'quince', 'grape', 'raisin', 'sultana', 'fig', 'date', 'melon',
  'watermelon', 'mango', 'papaya', 'guava', 'pineapple', 'banana', 'coconut', 'lychee',
  'passionfruit', 'passion', 'kiwi', 'pomegranate', 'persimmon', 'rhubarb', 'tamarind',
  'pomelo', 'lime', 'lemon', 'orange', 'tangerine', 'mandarin', 'clementine', 'grapefruit',
  'bergamot', 'citrus', 'yuzu', 'fruit', 'chocolate', 'cocoa', 'cacao', 'caramel', 'toffee',
  'butterscotch', 'molasses', 'honey', 'maple', 'sugar', 'vanilla', 'nougat', 'praline',
  'fudge', 'syrup', 'marzipan', 'custard', 'cream', 'almond', 'hazelnut', 'walnut',
  'pecan', 'peanut', 'cashew', 'macadamia', 'nutty', 'floral', 'jasmine', 'rose',
  'lavender', 'hibiscus', 'chamomile', 'elderflower', 'honeysuckle', 'tea', 'cinnamon',
  'clove', 'nutmeg', 'cardamom', 'ginger', 'anise', 'licorice', 'wine', 'winey', 'port',
  'whiskey', 'rum', 'cola', 'tobacco', 'cedar', 'malt', 'graham', 'cookie', 'shortbread',
  'biscuit', 'brioche', 'stone', 'tropical', 'jammy', 'juicy',
  // texture / structure descriptors roasters use as notes (e.g. "Crisp—Sweet—Clean")
  'sweet', 'crisp', 'clean', 'bright', 'balanced', 'smooth', 'silky', 'creamy',
  'velvety', 'syrupy', 'round', 'delicate', 'complex', 'lively', 'elegant', 'tart']);
function looksLikeFlavor(part) {
  const p = part.toLowerCase();
  for (const w of FLAVOR_WORDS) if (p.includes(w)) return true;
  return false;
}
// find the tasting-note line: a short bullet- or comma-separated list, taken
// either as a clean word list (bullets) or one dominated by flavour words
// (so a bare comma line like "Strawberry, blood orange, Rainier cherry" is
// recognised, while "Caturra, Bourbon" or "Colombia, Huila" are not)
function tastingNotesFromDom(doc) {
  const sep = /\s*[•·,—–]\s*| and /i;   // bullets, dots, commas, em/en dashes
  const wordish = p => /^[A-Za-z][A-Za-z' &-]{1,24}$/.test(p);
  // note-chip lists: each note in its own element, e.g. Onyx's
  // <span class="note">Peach</span><span class="note">Winey</span>
  const chips = [...doc.querySelectorAll('span.note, li.note')]
    .map(n => clean(n.textContent)).filter(Boolean);
  if (chips.length >= 2 && chips.length <= 8 && chips.every(wordish) &&
      chips.filter(looksLikeFlavor).length / chips.length >= 0.5)
    return [...new Set(chips)].join(', ');
  const cands = doc.querySelectorAll(
    'p, span, li, h3, h4, h5, h6, rte-formatter, div, [class*="note"], [class*="flavor"], [class*="flavour"]');
  // some shops print the notes in a plain <div> (Heart's ProductMeta__Text),
  // but a *wrapper* div would glue its children together into a fake list
  // ("Jhonny AlvaradoBrunca, Costa Ricahoney, starfruit"), so only take a div
  // that holds the line itself — no block-level children.
  const BLOCKISH = 'div,p,h1,h2,h3,h4,h5,h6,ul,ol,li,table,section,article,header,footer,figure,form,nav,script,style,noscript,template';
  for (const n of cands) {
    if (n.tagName === 'DIV' && n.querySelector(BLOCKISH)) continue;
    // "Notes of Red Fruit, Citrus…" -> "Red Fruit, Citrus…"
    const t = clean(n.textContent).replace(/^notes?\s+of\s+/i, '');
    if (!t || t.length > 70 || /flavou?rs?\s+of/i.test(t) || /[.!?:]/.test(t)) continue;
    const parts = t.split(sep).map(s => s.trim()).filter(Boolean);
    if (parts.length < 2 || parts.length > 6) continue;
    // a short bullet/dash-separated word list of 3+ items is almost always
    // notes (e.g. "Almond • Brown Sugar • Caramel", "Crisp—Sweet—Clean")
    if (parts.length >= 3 && /[•·—–]/.test(t) && parts.every(wordish)) return parts.join(', ');
    // otherwise require the items to be recognised flavour/texture words
    const flav = parts.filter(looksLikeFlavor).length;
    if (flav >= 2 && flav / parts.length >= 0.6) return parts.join(', ');
  }
  return '';
}
// "Flavours of brown sugar and honeydew melon." -> "brown sugar, honeydew melon"
function flavourNotes(text) {
  const m = text.match(/flavou?rs?\s+of\s+([^.;\n|]{3,80})/i);
  if (!m) return '';
  return clean(m[1]).replace(/\s+and\s+/gi, ', ').replace(/,\s*,/g, ',');
}
function clean(s) { return String(s || '').replace(/\s+/g, ' ').trim(); }
function nonEmpty(o) { const r = {}; for (const k in o) if (o[k]) r[k] = o[k]; return r; }

function firstStr(v) {
  if (Array.isArray(v)) return firstStr(v[0]);
  if (v && typeof v === 'object') return firstStr(v.name || v['@value'] || '');
  return (v == null ? '' : String(v)).trim();
}
function stripTags(s) {
  return String(s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}
function textContent(doc) {
  if (!doc.body) return '';
  // textContent includes <script>/<style> text, and app-framework storefronts
  // (Remix/Next) serialise their whole page state into a script tag. That blob
  // leaks into the heuristics below — Passenger's glossary line "…the flavors
  // of certain coffees express the…" made flavourNotes() return
  // 'certain coffees express the \",\"b998f7c0d188\",[297],[],{\"_37\":298'.
  // Clone so the live doc keeps its scripts for any other extractor.
  const body = doc.body.cloneNode(true);
  body.querySelectorAll('script, style, noscript, template').forEach(n => n.remove());
  // Go via innerHTML rather than textContent: textContent butts adjacent
  // elements together ("Browning Sugars" + "Washed Process" -> "SugarsWashed"),
  // which hides the word from the \b-anchored matches above. stripTags turns
  // every tag into a space, so word boundaries survive.
  return stripTags(body.innerHTML).slice(0, 20000);
}
function firstMatch(hay, list) {
  for (const term of list) {
    const re = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (re.test(hay)) return term;
  }
  return '';
}
function matchAll(hay, list) {
  const found = [];
  for (const term of list) {
    const re = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (re.test(hay) && !found.some(f => f.toLowerCase() === term.toLowerCase()))
      found.push(term);
  }
  return found.slice(0, 3).join(', ');
}
// try to isolate a "tasting notes: a, b, c" style phrase, else fall back.
// the value ends at the next "Capitalized:" label, a sentence break, or 90 chars.
function findTastingNotes(desc, hay) {
  const m = (desc || hay).match(
    /(?:tasting notes?|flavou?r notes?|cup(?:ping)? notes?|notes?|we taste|flavou?rs?)\s*[:\-–]\s*(.+?)(?=\s*[A-Z][a-z]+\s*[:\-–]|[.\n|]|$)/i);
  if (m) {
    const val = clean(m[1]).replace(/[;,]\s*$/, '');
    if (/[a-z]/i.test(val) && val.length <= 90) return val;
  }
  return '';
}

// Parse run-together "Label: value" specs from a single string, where each
// value ends where the next Capitalized label begins:
//   "…Notes: Jasmine, PomeloProducer: SolisCountry: Costa Rica…"
function parseLabeledText(text) {
  const out = {};
  if (!text) return out;
  const FIELD = {
    notes:   /^(tasting notes?|flavou?r notes?|cup(?:ping)? notes?|notes)$/i,
    farm:    /^(producers?|farms?|estate|grower)$/i,
    region:  /^(regions?)$/i,
    country: /^(country|origin)$/i,
    variety: /^(varietals?|variety|cultivars?)$/i,
    process: /^(process(?:ing)?(?: method)?)$/i,
  };
  const re = /([A-Za-z][A-Za-z ]{1,20}?)\s*:\s*(.+?)(?=\s*[A-Z][a-z]+\s*:|$)/g;
  let m;
  while ((m = re.exec(text))) {
    const label = clean(m[1]), val = clean(m[2]).replace(/[;,]\s*$/, '');
    if (!val || val.length > 80) continue;
    for (const [field, re2] of Object.entries(FIELD)) {
      if (!out[field] && re2.test(label)) out[field] = val;
    }
  }
  return out;
}

function markAutofilled(name) {
  const input = form[name];
  if (input) input.classList.add('autofilled');
}
function clearAutofillMarks() {
  form.querySelectorAll('.autofilled').forEach(i => i.classList.remove('autofilled'));
}
function setFetchStatus(msg, kind) {
  const s = el('fetchStatus');
  s.textContent = msg;
  s.className = 'fetch-status ' + (kind || '');
  s.hidden = false;
}
function hideFetchStatus() { el('fetchStatus').hidden = true; }

async function autofillFromUrl() {
  const url = el('fetchUrl').value.trim();
  if (!/^https?:\/\//i.test(url)) {
    setFetchStatus('Enter a full URL starting with http(s)://', 'err');
    return;
  }
  const btn = el('fetchBtn');
  btn.setAttribute('aria-busy', 'true');
  setFetchStatus('Fetching…', '');
  try {
    // Clean base from Shopify's product JSON (open CORS, always reliable) …
    const product = await fetchShopifyProduct(url);
    const base = product ? extractFromShopify(product, url) : {};
    // … then the full HTML for the richer, theme-rendered fields
    // (tasting notes, varietal, producer) that the JSON leaves out.
    const html = await fetchPageHtml(url);
    const rich = html ? extractFromHtml(html, url) : {};
    if (!product && !html) {
      throw new Error('could not load the page (start serve.py for reliable fetching)');
    }
    // rich (page) overrides base where present, but keep the JSON's clean
    // name/roaster which are tidier than a scraped <title>
    const data = { ...base, ...nonEmpty(rich) };
    if (base.coffee) data.coffee = base.coffee;
    if (base.roaster) data.roaster = base.roaster;
    data.bought_from = data.bought_from || base.roaster || rich.roaster || '';

    // only fill fields the user hasn't already typed into; mark what we set
    clearAutofillMarks();
    const map = ['coffee','roaster','country','variety','process','farm','tasting_notes','bought_from'];
    const filled = [];
    for (const f of map) {
      if (data[f] && !form[f].value.trim()) {
        form[f].value = data[f];
        markAutofilled(f);
        filled.push(f);
      }
    }
    if (filled.length) {
      setFetchStatus(`Filled ${filled.length} field${filled.length === 1 ? '' : 's'} — review the highlighted ones before saving.`, 'ok');
    } else {
      setFetchStatus("Couldn't pull structured details from that page. Fill it in manually.", 'warn');
    }
  } catch (e) {
    setFetchStatus('Fetch failed: ' + e.message + '. The site may block proxies — enter details manually.', 'err');
  } finally {
    btn.removeAttribute('aria-busy');
  }
}

/* ---------- wiring ---------- */
el('addBtn').onclick = () => openModal(null);
el('checkStockBtn').onclick = checkAllStock;
el('fetchBtn').onclick = autofillFromUrl;
el('fetchUrl').addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.preventDefault(); autofillFromUrl(); }
});
form.addEventListener('input', e => e.target.classList.remove('autofilled'));
el('modalClose').onclick = closeModal;
el('cancelBtn').onclick = closeModal;
modal.onclick = e => { if (e.target === modal) closeModal(); };
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !modal.hidden) closeModal(); });

document.querySelectorAll('.tab').forEach(t =>
  t.onclick = () => switchView(t.dataset.view));

el('search').oninput = render;
el('filterCountry').onchange = render;
el('filterProcess').onchange = render;
el('chartYear').onchange = renderChart;
wireOriginToggle();

const menuPanel = el('menuPanel');
el('menuBtn').onclick = e => { e.stopPropagation(); menuPanel.hidden = !menuPanel.hidden; };
document.addEventListener('click', () => menuPanel.hidden = true);
menuPanel.onclick = e => e.stopPropagation();
el('exportBtn').onclick = () => { exportData(); menuPanel.hidden = true; };
el('importBtn').onclick = () => { el('importFile').click(); menuPanel.hidden = true; };
el('resetBtn').onclick = () => { resetData(); menuPanel.hidden = true; };

// strip the editing and recommendation UI from the published build
if (PUBLIC) {
  ['addBtn', 'recosView', 'modal', 'importFile'].forEach(id => el(id).remove());
  document.querySelector('.topbar-actions').remove();
  document.querySelector('.tab[data-view="recos"]').remove();
  document.querySelector('.count-row .hint-inline').textContent = 'Click a column header to sort';
}

coffees = load();
refreshAux();
render();
switchView(location.hash.slice(1));
updateStoreNote();
