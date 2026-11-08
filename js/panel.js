/**
 * Reading panel views as HTML strings. Pure: no DOM access, no map.
 *
 * Every actionable element carries data-action (+ data-id / data-value); the app binds one delegated handler.
 * Actions: select-area · select-hotel · select-building · select-station · select-province · filter-chain ·
 * filter-group · set-metric · back · explore-top · clear-focus · open-charts · open-table · clear-filter · leave-area.
 *
 * Copy (owner 2026-11-01, “เรื่องภาษา ขอที่ กระชับอ่านเข้าใจง่าย ใช้ symbol, logo, icon, charts มาช่วยทำให้ text
 * กระชับ … ตรงกับ context ของ ICP ตาม product statement ไม่มี caveats เลย และเป็นธรรมชาติ”): short Thai in the words of
 * the people deciding on hotel land, chains and visitor capacity; pictograms, logos and small bar charts carry what a
 * sentence used to; no caveat on screen. Exactness comes from the names themselves — “ราคาที่บันทึก”, “สูงราว”, a rank
 * “จาก N”, the numerator and denominator of every share (visible, or in the tile's title and accessible name) — and
 * from one provenance line per view: dataset · source · date · boundary, then “วิธีนับ” (DATA_METHOD.md, where the
 * method and its limits live). Two measures (js/model.js#METRICS): ห้อง (default) · แห่ง. Unknown rooms are never 0
 * (“ไม่ทราบจำนวนห้อง”, a hatched “ไม่ทราบ” bar). Recorded prices per hotel only, never summed or averaged across hotels.
 * Distances are straight lines (the distance pictogram; “ระยะตรง” in titles). A stay's pin inside a drawn building is
 * “ที่พักในอาคารนี้” / “อีก N แห่งในอาคารนี้”, never “ตั้งอยู่ใน”. Sources, methods and ids sit in one closed <details>.
 */
import {productionLink, provinceByCode, hasPoint, stationLink, retailLink, SIZE_BANDS, subName, RECORDED_NAME} from './model.js';
import {areaWord} from './areas.js';
import {cueMarkup} from './cues.js';
import {actionBar} from './ask.js';
import {logoMarkup} from './logos.js';

const NUMBER = new Intl.NumberFormat('th-TH', {maximumFractionDigits: 0});
export const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
export const num = n => NUMBER.format(n);
/** Whole-number share; a non-zero part never prints as 0% ("<1%"). */
export const pct = (part, whole) => (!whole ? '—' : part && Math.round((part / whole) * 100) === 0 ? '<1%' : `${NUMBER.format(Math.round((part / whole) * 100))}%`);
/** A number and its unit never split across lines in running text. */
const nw = html => `<span class="nowrap">${html}</span>`;
const safeURL = value => { try { const u = new URL(value); return u.protocol === 'https:' ? u.href : ''; } catch { return ''; } };
/** Straight-line distance for display: "320 ม." / "1.4 กม.". */
export const meters = m => (!Number.isFinite(m) ? '' : m < 1000 ? `${num(Math.round(m / 10) * 10)} ม.` : `${(m / 1000).toLocaleString('th-TH', {maximumFractionDigits: 1})} กม.`);
const baht = v => `฿${num(v)}`;
/** A decorative pictogram of the approved subset (js/navigation.js PICTOGRAM_CONTRACT); the text carries the meaning. */
const pic = (kind, cls = '') => `<i class="${cls ? `${cls} ` : ''}pictogram pic-${esc(kind)}" aria-hidden="true"></i>`;
/** The method and its limits (one link at the end of every provenance line). */
export const METHOD_URL = 'DATA_METHOD.md';

export function link(url, label, cls = 'source-link') {
  const u = safeURL(url);
  return u ? `<a class="${cls}" href="${esc(u)}" target="_blank" rel="noopener">${esc(label)}</a>` : '';
}

/**
 * The line under a stay's name (model.js#subName): its recorded name, labelled, when the stay is shown under the name its
 * brand lists now; else its English name.
 */
export function subLine(r, cls, tag = 'p') {
  const sub = subName(r);
  if (!sub) return '';
  return r.recorded
    ? `<${tag} class="${cls} recorded-name"><span class="recorded-label">${RECORDED_NAME}</span> ${esc(sub)}</${tag}>`
    : `<${tag} class="${cls}">${esc(sub)}</${tag}>`;
}

export function thaiDate(iso) {
  if (!/^\d{4}-\d{2}-\d{2}/.test(iso || '')) return iso || '';
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  return `${d} ${months[m - 1]} ${y + 543}`;
}

/** Metric tile with a decorative pictogram; value may be a preformatted string. `detail` (numerator and denominator)
 *  is the tile's title and part of its accessible text. */
export function metricTile(value, label, kind = '', detail = '') {
  const shown = typeof value === 'string' ? value : num(value);
  return `<div class="metric${kind ? ` metric-${kind}` : ''}"${detail ? ` title="${esc(detail)}"` : ''}>${pic(kind || 'plain', 'metric-symbol')}<strong class="data-number">${esc(shown)}</strong><span>${esc(label)}</span>${detail ? `<span class="sr-only">${esc(detail)}</span>` : ''}</div>`;
}
export const heading = (kind, text, id = '') => `<h3${id ? ` id="${esc(id)}"` : ''}>${pic(kind)}${esc(text)}</h3>`;

const provinceName = code => provinceByCode(code)?.th || code || '';
/** "เขตวัฒนา" / "อำเภอเมืองภูเก็ต". */
const placeName = a => (a ? `${areaWord(a.province)}${a.name}` : '');
/** One word for a list of districts: เขต (all Bangkok), อำเภอ (none), else เขต/อำเภอ. */
export const words = areas => {
  const p = new Set(areas.map(a => a.province));
  return p.size === 1 ? areaWord([...p][0]) : 'เขต/อำเภอ';
};
const valueText = (v, unit) => nw(`<strong class="data-number">${num(v)}</strong> ${esc(unit.one)}`);
const roomsText = r => (r?.rooms ? `${num(r.rooms)} ห้อง` : 'ไม่ทราบจำนวนห้อง');
/** "อโศก (สุขุมวิท)" — next to the rail pictogram; "สถานีอโศก (สุขุมวิท)" in running text. */
const stationShort = s => (s ? `${s.name}${s.lines?.length ? ` (${s.lines.join(' · ')})` : ''}` : '');
const stationName = s => (s ? `สถานี${stationShort(s)}` : '');

/* ---------- vocabularies (source details only) ---------- */

/** How the row's district was matched at build time (row.admin). */
export const ADMIN_TH = Object.freeze({
  source: 'ตาม CityMETER Hotel V3',
  name: 'จากชื่อเขต/อำเภอในข้อมูลของที่พัก',
  point: 'จากหมุดของที่พัก',
  province: 'ระบุได้แค่จังหวัด',
  conflict: 'หมุดกับข้อมูลอยู่คนละจังหวัด',
  none: 'ไม่ระบุจังหวัด',
});
/** The word of a stay's site chip by accommodation group (“ทั้งรีสอร์ท 20 อาคาร”); other groups read “ทั้งโครงการ”. */
const SITE_WORD = Object.freeze({resort: 'รีสอร์ท', hotel: 'โรงแรม', bungalow: 'บังกะโล'});
/** What a building-mass status of the research master says (13_BUILDING_LINKS), in reader words. */
const MASS_TH = Object.freeze({
  identity: 'ผูกกับอาคารแล้ว (ตรวจตัวตน)', spatial: 'ผูกกับอาคารจากหมุด',
  conflict: 'ข้อมูลอาคารขัดกัน', none_in_area: 'ไม่พบอาคารที่ผูกได้',
  not_acquired: 'ยังไม่มีข้อมูลอาคาร', not_checked: 'ยังไม่ตรวจอาคาร',
});

/**
 * The provenance line every view that shows numbers ends with: dataset · source · date · boundary (each part in
 * `data-prov`, its word for screen readers), then the method link. Rail, retail and terrain sources join the source
 * part when the view shows them.
 */
export function provenance(ctx = {}, boundary = '', {rail = false, retail = false, terrain = false, site = null} = {}) {
  const meta = ctx.meta || {};
  const sources = ['Hotel V3', 'ทะเบียน ททท.', 'เว็บทางการ',
    rail ? `CityMETER Transit ${thaiDate(meta.context?.rail?.asOf || '')}`.trim() : '',
    retail ? 'CityMETER Shopping centers' : '',
    terrain ? `SRTM 30 ม. (2543)${ctx.osmDate ? ` · OSM ${thaiDate(ctx.osmDate)}` : ''}` : '',
    site ? `ไซต์ ${site.source || 'งานวิจัย'} ${thaiDate(site.on || '')}`.trim() : ''].filter(Boolean);
  return `<p class="hint panel-foot provenance"><span class="prov-part" data-prov="dataset">${pic('dataset')}<span class="sr-only">ชุดข้อมูล </span>CityMETER Hotel</span> <span class="prov-part" data-prov="source"><span class="sr-only">แหล่ง</span>จาก ${esc(sources.join(' · '))}</span><span class="prov-part" data-prov="date">${pic('date')}<span class="sr-only">ตรวจ </span>${esc(thaiDate(meta.checkedOn || ''))}</span><span class="prov-part" data-prov="boundary">${pic('area')}<span class="sr-only">ขอบเขต </span>${esc(boundary)}</span><span class="prov-part prov-method"><a href="${METHOD_URL}" target="_blank" rel="noopener">วิธีนับ</a></span></p>`;
}

/* ---------- shared fragments ---------- */

/** Bars per accommodation group in the group's series colour + shape cue; value = the measure. */
function groupBars(byGroup, unit) {
  const val = g => (unit.id === 'count' ? g.count : g.rooms);
  const list = byGroup.filter(g => val(g) > 0).sort((a, b) => val(b) - val(a) || a.index - b.index);
  if (!list.length) return `<p class="hint">ไม่มี${esc(unit.subject)}</p>`;
  const max = Math.max(1, ...list.map(val));
  return `<ul class="mix-list" aria-label="ประเภทที่พัก (${esc(unit.one)})">${list.map(g => `
    <li><button type="button" class="mix-row" data-action="filter-group" data-value="${esc(g.id)}" title="ดูเฉพาะ${esc(g.th)}"><span class="mix-label">${cueMarkup(g.series)}${esc(g.th)}</span>
      <span class="mix-track" aria-hidden="true"><span class="mix-fill category-${g.series}" style="width:${Math.max(3, Math.round((val(g) / max) * 100))}%"></span></span>
      <span class="mix-value data-number">${num(val(g))}</span></button></li>`).join('')}</ul>`;
}

/** Records per room-size band; unknown rooms are their own hatched bar (never a 0-room band). */
function sizeBars(sizes) {
  if (!sizes.bands.some(b => b.count) && !sizes.unknown) return '';
  const max = Math.max(1, sizes.unknown || 0, ...sizes.bands.map(b => b.count));
  const width = n => (n ? Math.max(3, Math.round((n / max) * 100)) : 0);
  return `<ul class="mix-list size-list" aria-label="ขนาดที่พัก (แห่ง)">${sizes.bands.map(b => `
    <li><span class="mix-label">${esc(b.th)}</span>
      <span class="mix-track" aria-hidden="true"><span class="mix-fill size-fill" style="width:${width(b.count)}%"></span></span>
      <span class="mix-value data-number" title="${num(b.rooms)} ห้อง">${num(b.count)}</span></li>`).join('')}${sizes.unknown ? `
    <li title="ไม่ทราบจำนวนห้อง"><span class="mix-label">ไม่ทราบ</span>
      <span class="mix-track" aria-hidden="true"><span class="mix-fill legend-nodata" style="width:${width(sizes.unknown)}%"></span></span>
      <span class="mix-value data-number">${num(sizes.unknown)}</span></li>` : ''}</ul>`;
}

function rowMeta(r, {showArea = false, index = null, distance = null} = {}) {
  const area = showArea && index && r.area ? index.byId.get(r.area) : null;
  const d = distance?.get?.(r.id);
  return [roomsText(r), r.brand ? r.brand.name : '', area ? placeName(area) : showArea && !r.area ? (r.province ? provinceName(r.province) : 'ไม่ระบุจังหวัด') : '',
    Number.isFinite(d) ? meters(d) : ''].filter(Boolean).join(' · ');
}

/** Hotels: cue (accommodation group) + name, then rooms · brand · where · distance. */
export function hotelList(rows, opts = {}) {
  return `<ul class="outlet-list">${rows.map(r => `<li><button type="button" class="brand-row" data-action="select-hotel" data-id="${esc(r.id)}">${cueMarkup(r.series, {className: 'row-cue'})}<span class="row-text"><strong>${esc(r.name || r.nameEn || 'ไม่มีชื่อ')}</strong>${subLine(r, 'row-branch', 'span')}<span class="row-meta">${esc(rowMeta(r, opts))}</span></span></button></li>`).join('')}</ul>`;
}

/** "ดูทั้งหมด 193 แห่ง" under a shortened list. */
const moreButton = count => `<p class="list-more"><button type="button" class="link-button" data-action="open-table">ดูทั้งหมด ${num(count)} แห่ง</button></p>`;

/** The chip figure of a chain or brand: the measure; rooms unknown → its records (“2 แห่ง”), never “0”. */
const chipFigure = (x, unit) => (unit.id === 'count' ? num(x.count) : x.rooms ? num(x.rooms) : `${num(x.count)} แห่ง`);
const chipTitle = x => `${num(x.count)} แห่ง · ${x.rooms ? `${num(x.rooms)} ห้อง` : 'ไม่ทราบจำนวนห้อง'}`;

/** Hotel groups (chains) as chips; each filters the map to that group. */
function chainChips(list, unit) {
  if (!list.length) return '<p class="hint">ไม่มีเครือในตัวกรองนี้</p>';
  return `<ul class="chip-list">${list.map(c => `<li><button type="button" class="brand-chip" data-action="filter-chain" data-value="${esc(c.chain.id)}" title="${esc(c.chain.name)} — ${chipTitle(c)} (ดูเฉพาะเครือนี้)">${pic('chain', 'chip-pic')}<span>${esc(c.chain.name)}</span><small class="data-number">${chipFigure(c, unit)}</small></button></li>`).join('')}</ul>`;
}

/** Districts ranked by the measure, bars in the map's 41-sample ramp colour (classOf). */
function areaRanking(list, classOf, unit, {title, note = '', limit = 10, showProvince = false, id = 'rank-title'} = {}) {
  const top = list.filter(a => a.value > 0).slice(0, limit);
  if (!top.length) return '';
  const max = Math.max(1, ...top.map(a => a.value));
  return `<section class="panel-section" aria-labelledby="${esc(id)}">
    <div class="section-heading">${heading('area', title, id)}<span class="hint">${esc(note)}</span></div>
    <ol class="rank-list">${top.map((a, i) => {
      const other = unit.id === 'count' ? `${num(a.rooms)} ห้อง` : `${num(a.count)} แห่ง`;
      const where = `${showProvince ? `${provinceName(a.province)} · ` : ''}${num(a.value)} ${unit.one} · ${other}`;
      return `<li><button type="button" class="rank-row" data-action="select-area" data-id="${esc(a.id)}" aria-label="อันดับ ${i + 1} ${esc(placeName(a))} ${showProvince ? esc(provinceName(a.province)) : ''} ${num(a.value)} ${esc(unit.one)} ${esc(other)}">
        <span class="rank-index data-number" aria-hidden="true">${i + 1}</span>
        <span class="rank-name">${esc(placeName(a))}<small>${esc(where)}</small></span>
        <span class="rank-track" aria-hidden="true"><span class="rank-fill" style="width:${Math.max(3, Math.round((a.value / max) * 100))}%;background:${esc(classOf(a))}"></span></span>
        <span class="rank-value data-number" aria-hidden="true">${num(a.value)}</span></button></li>`;
    }).join('')}</ol>
  </section>`;
}

/** Stations of CityMETER · Transit whose 500 m holds the most of the measure (each row at its nearest station). */
function stationRanking(list, unit, {title = 'สถานีที่มีห้องพักรอบ ๆ มากที่สุด', limit = 6} = {}) {
  const top = list.slice(0, limit);
  if (!top.length) return '';
  const max = Math.max(1, ...top.map(s => s.value));
  return `<section class="panel-section"><div class="section-heading">${heading('rail', title)}<span class="hint" title="ระยะตรงจากสถานีที่เปิดแล้ว">${pic('distance', 'hint-pic')}≤ 500 ม.</span></div>
    <ol class="rank-list">${top.map((s, i) => `<li><button type="button" class="rank-row" data-action="select-station" data-id="${esc(s.station.id)}" aria-label="${esc(stationName(s.station))} ${num(s.value)} ${esc(unit.one)}">
      <span class="rank-index data-number" aria-hidden="true">${i + 1}</span>
      <span class="rank-name">${esc(stationShort(s.station))}<small>${esc(`${num(s.count)} แห่ง · ${num(s.rooms)} ห้อง`)}</small></span>
      <span class="rank-track" aria-hidden="true"><span class="rank-fill rail-fill" style="width:${Math.max(3, Math.round((s.value / max) * 100))}%"></span></span>
      <span class="rank-value data-number" aria-hidden="true">${num(s.value)}</span></button></li>`).join('')}</ol></section>`;
}

/** "x จาก y ห้อง ห่างสถานีที่เปิดแล้วไม่เกิน 500 ม." — the title and accessible text of a rail share. */
const railDetail = (s, unit) => `${num(s.within)} จาก ${num(s.base)} ${unit.one} ห่างสถานีรถไฟฟ้าที่เปิดแล้วไม่เกิน 500 ม. (ระยะตรง)`;

/* ---------- Chain card (chain filter) ---------- */

export function renderChainCard(p, ctx = {}) {
  if (!p) return '';
  const unit = ctx.unit, c = p.chain;
  const brandList = p.brands.length ? `<ul class="chip-list">${p.brands.map(b => `<li><span class="brand-chip is-static" title="${esc(b.brand.name)} — ${chipTitle(b)}"><span>${esc(b.brand.name)}</span><small class="data-number">${chipFigure(b, unit)}</small></span></li>`).join('')}</ul>` : '';
  const rail = p.rail?.base ? metricTile(pct(p.rail.within, p.rail.base), 'ใกล้รถไฟฟ้า', 'rail', railDetail(p.rail, unit)) : '';
  return `<section class="brand-card detail-head" aria-labelledby="chain-title">
      <div class="identity">${pic('chain', 'identity-pic')}<div>
        <p class="eyebrow">เครือโรงแรม</p>
        <h2 id="chain-title">${esc(c.name)}</h2></div></div>
      ${p.scopeCount ? `<div class="metrics compact">${metricTile(p.scopeRooms, 'ห้อง', 'rooms')}${metricTile(p.scopeCount, 'แห่ง', 'hotel')}${metricTile(p.provinces, 'จังหวัด', 'province')}${rail}</div>` : ''}
      ${brandList}
      ${actionBar({kind: 'chain', chain: c})}
      <div class="detail-actions"><button type="button" class="btn quiet" data-action="clear-filter" data-id="chain">ดูทุกเครือ</button></div>
    </section>`;
}

/* ---------- Overview ---------- */

/** The district(s) with the most of the measure outside the leading province — every district tied at that value. */
function outsideLine(insight, home, unit, province) {
  const o = insight.outside;
  if (!o || province || o.value < 2) return '';
  const linkTo = a => `<button type="button" class="link-button" data-action="select-area" data-id="${esc(a.id)}">${esc(placeName(a))}</button> ${esc(provinceName(a.province))}`;
  const tied = o.tied || [o];
  const top = insight.areas[0];
  const lead = `${pic('rank')}อันดับ 1 นอก${esc(home)}`;
  if (tied.length === 1) {
    const more = top && o.value > top.value ? ` · มากกว่าทุก${esc(areaWord(insight.home))}ของ${esc(home)}` : '';
    return `<p class="aha-secondary">${lead}: ${linkTo(tied[0])} ${valueText(o.value, unit)}${more}</p>`;
  }
  const shown = tied.slice(0, 3), rest = tied.length - shown.length;
  return `<p class="aha-secondary">${lead} (เท่ากัน ${num(tied.length)} พื้นที่): ${shown.map(linkTo).join(' · ')}${rest ? ` +${num(rest)}` : ''} · ${valueText(o.value, unit)}</p>`;
}

/** Rail comparison of the Aha as two bars: the focus vs the rest of the province (bases in the title and for screen
 *  readers); hidden when nothing is near rail. */
function railCompare(insight, unit, count, w) {
  const f = insight.rail?.focus, r = insight.rail?.rest;
  if (!f || !r || !f.base || !r.base || !(f.within + r.within)) return '';
  const here = count === 1 ? placeName(insight.areas[0]) : `${num(count)} ${w}นี้`;
  const bar = (label, s) => `<li title="${esc(railDetail(s, unit))}"><span class="mix-label">${esc(label)}</span>
      <span class="mix-track" aria-hidden="true"><span class="mix-fill rail-fill" style="width:${Math.max(2, Math.round((s.within / s.base) * 100))}%"></span></span>
      <span class="mix-value data-number">${pct(s.within, s.base)}</span><span class="sr-only">${esc(railDetail(s, unit))}</span></li>`;
  return `<div class="aha-rail"><p class="aha-rail-title">${pic('rail')}ใกล้รถไฟฟ้า ≤ 500 ม.</p>
    <ul class="mix-list rail-compare">${bar(here, f)}${bar(`${w}อื่น`, r)}</ul></div>`;
}

/**
 * focusMode: 'auto' (default top districts) · 'explicit' (user-chosen) · 'none' (every district).
 */
export function renderOverview({insight, summary, overview, focusMode = 'auto', classOf = () => 'var(--scale-count-3)', provinces = [], unknownProvince = 0,
  province = '', chainCard = '', stations = [], ctx = {}}) {
  const unit = ctx.unit;
  const count = insight.areas.length;
  const w = words(insight.areas);
  const names = insight.areas.map(a => `<button type="button" class="link-button" data-action="select-area" data-id="${esc(a.id)}">${esc(a.name)}</button>`).join(' · ');
  const home = provinceName(insight.home);
  let aha;
  if (!summary.count && focusMode !== 'explicit') {
    aha = `<section class="aha" aria-label="ข้อค้นพบ"><p class="eyebrow">ข้อค้นพบ</p><h2>ไม่พบที่พักตามตัวกรองนี้</h2>
      <div class="aha-actions"><button type="button" data-action="clear-filter" data-id="all" class="btn">ล้างตัวกรอง</button></div></section>`;
  } else if (focusMode === 'explicit') {
    aha = `<section class="aha is-focused" aria-label="ข้อค้นพบ"><p class="eyebrow">โฟกัส ${num(count)} ${esc(w)}</p>
      <h2>${insight.areas.map(a => esc(a.name)).join(' · ')}</h2>
      <p class="aha-copy">${valueText(insight.value, unit)}${unit.id === 'count' ? '' : ` · ${nw(`${num(insight.count)} แห่ง`)}`}</p>
      <div class="aha-actions"><button type="button" data-action="clear-focus" class="btn">ดูทุกพื้นที่</button><button type="button" data-action="open-charts" class="btn quiet">เปรียบเทียบพื้นที่</button></div></section>`;
  } else if (!count && insight.spread) {
    const sw = areaWord(insight.home), sp = insight.spread;
    aha = `<section class="aha" aria-label="ข้อค้นพบ"><p class="eyebrow">ข้อค้นพบ</p>
      <h2><span class="aha-number data-number">${num(sp.areas)}</span><span class="aha-headline">${esc(sw)}ใน${esc(home)} มี${esc(unit.subject)}เท่ากัน ${esc(sw)}ละ ${num(sp.value)} ${esc(unit.one)}</span></h2>
      ${outsideLine(insight, home, unit, province)}
      <div class="aha-actions"><button type="button" data-action="open-charts" class="btn quiet">เปรียบเทียบพื้นที่</button></div></section>`;
  } else if (!count) {
    aha = `<section class="aha" aria-label="ข้อค้นพบ"><p class="eyebrow">ข้อค้นพบ</p><h2><span class="aha-number data-number">${num(summary.count)}</span><span class="aha-headline">แห่ง · ไม่ระบุเขต/อำเภอ</span></h2>
      <div class="aha-actions"><button type="button" data-action="open-table" class="btn">ดูรายชื่อ</button></div></section>`;
  } else {
    const toggle = focusMode === 'auto'
      ? '<button type="button" data-action="clear-focus" class="btn">ดูทุกพื้นที่</button>'
      : `<button type="button" data-action="explore-top" class="btn primary">โฟกัส ${num(count)} ${esc(w)}นี้</button>`;
    const where = count === 1 ? esc(placeName(insight.areas[0])) : ` ${nw(`${num(count)} ${esc(w)}นี้`)}`;
    const total = insight.homeValue ?? insight.homePlacedValue;
    aha = `<section class="aha${focusMode === 'auto' ? ' is-auto' : ''}" aria-label="ข้อค้นพบ"><p class="eyebrow">ข้อค้นพบ</p>
      <h2><span class="aha-number data-number">${pct(insight.value, total)}</span><span class="aha-headline">ของ${esc(unit.subject)}${esc(home)} อยู่ใน${where}</span></h2>
      <p class="aha-copy">${names}<br>${nw(`<strong class="data-number">${num(insight.value)}</strong> จาก ${num(total)} ${esc(unit.one)}`)}</p>
      ${railCompare(insight, unit, count, w)}${outsideLine(insight, home, unit, province)}
      <div class="aha-actions">${toggle}<button type="button" data-action="open-charts" class="btn quiet">เปรียบเทียบพื้นที่</button></div></section>`;
  }
  const narrowed = focusMode !== 'none' && count > 0 && summary.count !== overview.count;
  const metrics = `<section class="metrics" aria-label="${narrowed ? 'ตัวเลขของพื้นที่ที่โฟกัส' : 'ตัวเลขรวมของข้อมูลที่เลือก'}">
    ${metricTile(summary.rooms, `ห้อง${narrowed ? ' ในโฟกัส' : ''}`, 'rooms')}
    ${metricTile(summary.count, `แห่ง${narrowed ? ' ในโฟกัส' : ''}`, 'hotel')}
    ${metricTile(summary.areas, narrowed ? w : 'เขต/อำเภอ', 'area')}
    ${metricTile(summary.provinces, 'จังหวัด', 'province')}
  </section>`;
  const scopeText = province ? provinceName(province) : 'ประเทศไทย';
  const provinceRows = p => `<li><button type="button" class="province-row" data-action="select-province" data-id="${esc(p.code)}" aria-label="${esc(p.name)} ${num(p.value)} ${esc(unit.one)} กดเพื่อดูจังหวัด"><i class="province-swatch" style="background:${esc(p.fill)}" aria-hidden="true"></i><span class="province-name">${esc(p.name)}</span><span class="province-count data-number">${num(p.value)}<small>${esc(unit.one)}</small></span></button></li>`;
  const shown = provinces.slice(0, 8), rest = provinces.slice(8);
  const unknown = unknownProvince ? `<p class="hint">ไม่ระบุจังหวัด ${nw(`${num(unknownProvince)} แห่ง`)}</p>` : '';
  const provinceList = provinces.length > 1 ? `<section class="panel-section" aria-labelledby="province-title">
    <div class="section-heading">${heading('province', `จังหวัดที่มี${unit.subject}มากที่สุด`, 'province-title')}<span class="hint">${num(provinces.length)} จังหวัด</span></div>
    <ul class="province-list">${shown.map(provinceRows).join('')}</ul>
    ${rest.length ? `<details class="more-provinces"><summary>อีก ${num(rest.length)} จังหวัด</summary><ul class="province-list">${rest.map(provinceRows).join('')}</ul></details>` : ''}
    ${unknown}</section>` : '';
  const rw = province ? areaWord(province) : 'เขต/อำเภอ';
  const ranking = areaRanking(overview.ranking, classOf, unit, {title: `${rw}ที่มี${unit.subject}มากที่สุด`, note: `${num(overview.ranking.filter(a => a.value > 0).length)} ${rw}`, showProvince: !province});
  const mix = overview.count ? `<section class="panel-section"><div class="section-heading">${heading('segment', 'ประเภทที่พัก')}<span class="hint">${esc(unit.one)}</span></div>${groupBars(overview.mix.byGroup, unit)}</section>` : '';
  const sizes = overview.count ? `<section class="panel-section"><div class="section-heading">${heading('rooms', 'ขนาด')}<span class="hint">แห่ง</span></div>${sizeBars(overview.sizes)}</section>` : '';
  const chains = overview.chains.length && !chainCard ? `<section class="panel-section"><div class="section-heading">${heading('chain', `เครือที่มี${unit.subject}มากที่สุด`)}<span class="hint"><button type="button" class="link-button" data-action="open-charts" data-value="chains">ดูทุกเครือ</button></span></div>${chainChips(overview.chains, unit)}
    <p class="fact-line">${pic('chain', 'fact-icon')}มีแบรนด์ ${nw(`<strong class="data-number">${num(overview.branded.count)}</strong> แห่ง`)} · ${nw(`${num(overview.branded.rooms)} ห้อง`)}</p></section>` : '';
  const rail = stationRanking(stations, unit, {title: `สถานีที่มี${unit.subject}รอบ ๆ มากที่สุด`});
  return `${chainCard}${aha}${metrics}${provinceList}${ranking}${rail}${mix}${sizes}${chains}${chainCard ? '' : actionBar({kind: 'overview', province: province ? provinceName(province) : ''})}${provenance(ctx, scopeText, {rail: Boolean(rail || insight.rail?.focus?.within)})}`;
}

/* ---------- Empty selections (EVID-05) ---------- */

/**
 * measured_zero: every district is in the register's national scope, so a district with no record under the
 * filters is a measured 0 of this dataset — offered with where the same filters match. Never "no data".
 */
function selectionNote(p, place, ctx) {
  if (p.coverageState !== 'measured_zero') return '';
  const elsewhere = p.scopeCount > 0
    ? `<span>พบในพื้นที่อื่น <strong class="data-number">${num(p.scopeCount)}</strong> แห่ง</span><button type="button" class="btn quiet" data-action="leave-area">ดูพื้นที่ที่พบ</button>`
    : '';
  return `<div class="empty-note" role="note"><strong>ไม่พบที่พักใน${esc(place)}${ctx.filtered ? 'ตามตัวกรองนี้' : ''}</strong>${elsewhere}</div>`;
}

/* ---------- District (เขต/อำเภอ) ---------- */

export function renderArea(p, classOf, ctx = {}) {
  if (!p) return '';
  const unit = ctx.unit, a = p.area, w = p.words;
  const place = `${w.area}${a.name}`, prov = provinceName(a.province);
  const rank = p.rank ? `<p class="rank-line">${pic('rank')}อันดับ ${num(p.rank)} จาก ${num(p.rankOf)} ทั่วประเทศ${p.rankProvince && p.rankProvinceOf > 1 ? ` · ${num(p.rankProvince)} จาก ${num(p.rankProvinceOf)} ใน${esc(prov)}` : ''}</p>` : '';
  const listLimit = 30;
  const share = p.count && p.provinceValue ? pct(p.value, p.provinceValue) : '—';
  const shareDetail = p.count && p.provinceValue ? `${num(p.value)} จาก ${num(p.provinceValue)} ${unit.one}ของ${prov}` : '';
  const railShare = p.rail?.base ? pct(p.rail.within, p.rail.base) : '—';
  const head = `<section class="detail-head">
      <button type="button" class="btn quiet back" data-action="back">กลับ</button>
      <p class="eyebrow">${esc(w.area)} · <button type="button" class="link-button" data-action="select-province" data-id="${esc(a.province)}">${esc(prov)}</button></p>
      <h2>${esc(place)}</h2>${a.nameEn ? `<p class="subtle">${esc(a.nameEn)}</p>` : ''}
      ${rank}
      <div class="metrics compact">${metricTile(p.rooms, 'ห้อง', 'rooms')}${metricTile(p.count, 'แห่ง', 'hotel')}${metricTile(share, `ของ${prov}`, 'province', shareDetail)}${metricTile(railShare, 'ใกล้รถไฟฟ้า', 'rail', p.rail?.base ? railDetail(p.rail, unit) : '')}</div>
      ${selectionNote(p, place, ctx)}
      ${actionBar({kind: 'area', area: {place, province: prov}})}
      <div class="detail-actions">${p.count ? '<button type="button" class="btn" data-action="open-table">ดูรายชื่อ</button><button type="button" class="btn quiet" data-action="open-charts">เปรียบเทียบพื้นที่</button>' : ''}${link(productionLink({province: a.province, area: a.id}), 'ดูใน CityMETER', 'btn quiet source-link')}</div>
    </section>
`;
  const boundary = `${place} ${prov}`;
  if (!p.count) return `${head}${provenance(ctx, boundary)}`;
  const chains = p.chains.length ? `<section class="panel-section"><div class="section-heading">${heading('chain', 'เครือโรงแรม')}<span class="hint">มีแบรนด์ ${num(p.branded.count)} แห่ง</span></div>${chainChips(p.chains, unit)}</section>` : '';
  const meeting = p.meeting ? `<p class="fact-line" title="ห้องประชุมตามทะเบียนที่พัก ททท.">${pic('meeting', 'fact-icon')}มีห้องประชุม ${nw(`${num(p.meeting)} แห่ง`)}</p>` : '';
  return `${head}    <section class="panel-section"><div class="section-heading">${heading('segment', 'ประเภทที่พัก')}<span class="hint">${esc(unit.one)}</span></div>${groupBars(p.byGroup, unit)}</section>
    <section class="panel-section"><div class="section-heading">${heading('rooms', 'ขนาด')}<span class="hint">แห่ง</span></div>${sizeBars(p.sizes)}${meeting}</section>
    ${stationRanking(p.stations, unit, {title: 'สถานีใกล้ที่พัก'})}
    ${chains}
    <section class="panel-section"><div class="section-heading">${heading('hotel', 'ที่พัก')}<span class="hint">เรียงตามห้อง</span></div>${hotelList(p.rows.slice(0, listLimit))}
      ${p.count > listLimit ? moreButton(p.count) : ''}</section>
    ${provenance(ctx, boundary, {rail: Boolean(p.rail?.base)})}`;
}

/* ---------- Station (CityMETER · Transit) ---------- */

export function renderStation(p, ctx = {}) {
  if (!p) return '';
  const unit = ctx.unit, s = p.station;
  const building = s.status !== 'operating';
  const listLimit = 40;
  const head = `<section class="detail-head station">
      <button type="button" class="btn quiet back" data-action="back">กลับ</button>
      <div class="identity">${pic('rail', 'identity-pic')}<div>
        <p class="eyebrow">สถานีรถไฟฟ้า${s.lines?.length ? ` · ${esc(s.lines.join(' · '))}` : ''}${building ? ` · ${pic('construction')}กำลังสร้าง` : ''}</p>
        <h2>สถานี${esc(s.name)}</h2>${s.nameEn ? `<p class="subtle">${esc(s.nameEn)}</p>` : ''}</div></div>
      <div class="metrics compact">${metricTile(p.rooms, 'ห้อง', 'rooms')}${metricTile(p.count, 'แห่ง', 'hotel')}${metricTile(p.radius, 'ม. รอบสถานี', 'distance', `ระยะตรงจากจุดอ้างอิงของสถานี ${meters(p.radius)}`)}</div>
      ${actionBar({kind: 'station', station: s, point: {lat: s.lat, lon: s.lon, role: 'station'}})}
      <div class="detail-actions">${link(stationLink(s), 'ดูใน CityMETER Transit', 'btn quiet source-link')}</div>
    </section>
`;
  const boundary = `รัศมี ${meters(p.radius)} จากสถานี${s.name}`;
  if (!p.count) return `${head}<div class="empty-note" role="note"><strong>ไม่พบที่พักรอบสถานีนี้</strong></div>${provenance(ctx, boundary, {rail: true})}`;
  return `${head}    <section class="panel-section"><div class="section-heading">${heading('segment', 'ประเภทที่พัก')}<span class="hint">${esc(unit.one)}</span></div>${groupBars(p.byGroup, unit)}</section>
    ${p.chains.length ? `<section class="panel-section"><div class="section-heading">${heading('chain', 'เครือโรงแรม')}</div>${chainChips(p.chains, unit)}</section>` : ''}
    <section class="panel-section"><div class="section-heading">${heading('hotel', 'ที่พัก')}<span class="hint">เรียงตามห้อง</span></div>${hotelList(p.rows.slice(0, listLimit), {showArea: true, index: ctx.index, distance: p.distance})}
      ${p.count > listLimit ? moreButton(p.count) : ''}</section>
    ${provenance(ctx, boundary, {rail: true})}`;
}

/* ---------- Building (display-time spatial join) ---------- */

/** Where a drawn building's outline and height come from (owner 2026-11-01, point 3: per อปท./เขต). */
export const BUILDING_SOURCE_TH = Object.freeze({osm: 'OpenStreetMap', cm: 'CityMETER Building V4'});

export function renderBuilding(b, ctx = {}) {
  if (!b) return '';
  const w = b.words;
  const area = b.area ? `${w.area}${b.area.name}` : '';
  const source = BUILDING_SOURCE_TH[b.kind] || BUILDING_SOURCE_TH.osm;
  // “สูงราว”: a CityMETER height is the dataset's model estimate, an OSM height a tag or the schema's default; the
  // source is named in the title and in the provenance line.
  const height = b.height != null ? `<span title="ความสูงจาก ${esc(source)}">สูงราว ${num(Math.round(b.height))} ม.</span>` : '';
  const withPoint = b.rows.find(hasPoint);
  return `<section class="detail-head building">
      <button type="button" class="btn quiet back" data-action="back">กลับ</button>
      <p class="eyebrow">${pic('building')} ${b.area ? `<button type="button" class="link-button" data-action="select-area" data-id="${esc(b.area.id)}">${esc(area)}</button>` : 'อาคาร'}${height ? ` · ${height}` : ''}</p>
      <h2>ที่พักในอาคารนี้</h2>
      <div class="metrics compact">${metricTile(b.rooms, 'ห้อง', 'rooms')}${metricTile(b.count, 'แห่ง', 'hotel')}</div>
      ${actionBar({kind: 'building', rows: b.rows, area: b.area ? {place: area, province: provinceName(b.area.province)} : null,
        point: withPoint ? {lat: withPoint.latitude, lon: withPoint.longitude, role: 'point'} : null})}
    </section>
    <section class="panel-section"><div class="section-heading">${heading('hotel', 'ที่พัก')}<span class="hint">${num(b.count)}</span></div>${hotelList(b.rows.slice(0, 40), {showArea: b.areaCount > 1, index: ctx.index})}
      ${b.count > 40 ? moreButton(b.count) : ''}</section>
    ${provenance(ctx, `หมุดในขอบอาคาร ${source}${area ? ` · ${area}` : ''}`)}`;
}

/* ---------- Hotel ---------- */

export function priceText(price) {
  if (!price) return '';
  const lo = price.min || price.avg, hi = price.max || price.avg;
  return lo && hi && lo !== hi ? `${baht(lo)}–${num(hi)}` : baht(lo || hi);
}

/** Comparison set: the rule as chips (type · rooms · radius), nearest first, and the whole supply round the hotel. */
function compsetSection(c, group) {
  if (!c) return '';
  const rule = [`${pic('segment')}${esc(group || 'ประเภทเดียวกัน')}`, `${pic('rooms')}${c.rule.min ? `${num(c.rule.min)}–${num(c.rule.max)} ห้อง` : 'ไม่ทราบจำนวนห้อง'}`,
    `${pic('distance')}≤ ${esc(meters(c.radius))}`].map(t => `<span class="rule-chip">${t}</span>`).join('');
  const list = c.rows.length
    ? `<ul class="outlet-list compset">${c.rows.map(({row: r, m}) => `<li><button type="button" class="brand-row" data-action="select-hotel" data-id="${esc(r.id)}">${cueMarkup(r.series, {className: 'row-cue'})}<span class="row-text"><strong>${esc(r.name || r.nameEn)}</strong><span class="row-meta">${esc([meters(m), roomsText(r), r.brand?.name || '', r.price ? `${priceText(r.price)} ที่บันทึก` : ''].filter(Boolean).join(' · '))}</span></span></button></li>`).join('')}</ul>`
    : '<p class="hint">ไม่พบที่พักตามเกณฑ์นี้</p>';
  return `<section class="panel-section"><div class="section-heading">${heading('compare', 'คู่เทียบ')}<span class="hint">${num(c.matches)} แห่ง</span></div>
    <p class="rule-chips" title="ประเภทเดียวกัน ห้องครึ่งเท่าถึงสองเท่า ในระยะตรง ${esc(meters(c.radius))} เรียงใกล้ก่อน">${rule}</p>${list}
    <p class="fact-line">${pic('hotel', 'fact-icon')}ที่พักทุกประเภทรอบ ${esc(meters(c.radius))} ${nw(`<strong class="data-number">${num(c.around.count)}</strong> แห่ง`)} · ${nw(`${num(c.around.rooms)} ห้อง`)}</p></section>`;
}

export function renderHotel(d, ctx = {}) {
  if (!d) return '';
  const r = d.row, w = d.words;
  const prov = provinceName(r.province);
  const coords = hasPoint(r) ? `${r.latitude.toFixed(6)}, ${r.longitude.toFixed(6)}` : '';
  const areaChip = d.area
    ? `<button type="button" class="fact-chip" data-action="select-area" data-id="${esc(d.area.id)}">${pic('area')}${esc(w.area)}${esc(d.area.name)} · ${esc(prov)}</button>`
    : r.province ? `<button type="button" class="fact-chip" data-action="select-province" data-id="${esc(r.province)}">${pic('province')}${esc(prov)}</button>` : '<span class="fact-chip is-quiet">ไม่ระบุจังหวัด</span>';
  const size = SIZE_BANDS.find(b => b.id === r.size);
  const roomsChip = `<span class="fact-chip">${pic('rooms')}${esc(roomsText(r))}${size ? ` · ${esc(size.short)}` : ''}</span>`;
  const priceChip = r.price ? `<span class="fact-chip" title="ราคาต่อคืนที่บันทึก">${pic('price')}${esc(priceText(r.price))} ที่บันทึก</span>` : '';
  const meetingChip = r.meeting ? `<span class="fact-chip" title="ห้องประชุมตามทะเบียนที่พัก ททท.">${pic('meeting')}ห้องประชุม ${num(r.meeting)} ห้อง</span>` : '';
  const railChip = r.rail ? `<button type="button" class="fact-chip" data-action="select-station" data-id="${esc(r.rail.station.id)}" title="สถานีที่เปิดแล้วที่ใกล้ที่สุด · ระยะตรง">${pic('rail')}${esc(stationShort(r.rail.station))} ${nw(esc(meters(r.rail.m)))}</button>` : '';
  const nextChip = r.railNext && (!r.rail || r.railNext.m < r.rail.m)
    ? `<span class="fact-chip" title="สถานีที่กำลังสร้างที่ใกล้ที่สุด · ระยะตรง">${pic('construction')}${esc(stationShort(r.railNext.station))} ${nw(esc(meters(r.railNext.m)))} · กำลังสร้าง</span>` : '';
  const shopChip = r.shop ? `<a class="fact-chip" href="${esc(retailLink(r.shop.venue))}" target="_blank" rel="noopener" title="ศูนย์การค้าที่ใกล้ที่สุด · ระยะตรง · เปิดใน CityMETER Shopping centers">${pic('venue')}${esc(r.shop.venue.name)} ${nw(esc(meters(r.shop.m)))}</a>` : '';
  const chainChip = r.chain ? `<button type="button" class="fact-chip" data-action="filter-chain" data-value="${esc(r.chain.id)}" title="ดูทุกที่พักของเครือนี้">${pic('chain')}${esc(r.brand.name)}${r.chain.name !== r.brand.name ? ` · ${esc(r.chain.name)}` : ''}</button>` : r.brand ? `<span class="fact-chip">${pic('chain')}${esc(r.brand.name)}</span>` : '';
  const bd = d.building;
  const buildingChip = bd?.others ? `<button type="button" class="fact-chip" data-action="select-building" data-id="${esc(bd.key)}" title="หมุดของที่พักอีก ${num(bd.others)} แห่งอยู่ในอาคารนี้บนแผนที่">${pic('building')}อีก ${num(bd.others)} แห่งในอาคารนี้</button>` : '';
  // The stay's site (49_SITE_BOUNDARY_CHECK): its buildings, as the map shows them together.
  const siteWord = SITE_WORD[d.group?.id] || 'โครงการ';
  const siteChip = r.site ? `<span class="fact-chip" title="อาคารในขอบเขตไซต์ของที่พัก · ${esc(r.site.source || 'งานวิจัย')}${r.site.on ? ` · ${esc(thaiDate(r.site.on))}` : ''}">${pic('building')}ทั้ง${esc(siteWord)} ${nw(`${num(r.site.n)} อาคาร`)}</span>` : '';
  const neighbours = r.inBuilding.length
    ? `<p class="fact-line">${pic('building', 'fact-icon')}อาคารเดียวกัน (งานวิจัย): ${esc(summarizeIndustries(r.inBuilding))}</p>` : '';
  const sameChain = r.chain && d.sameChain.count ? `<p class="fact-line">${pic('chain', 'fact-icon')}${esc(r.chain.name)} อีก ${nw(`<button type="button" class="link-button" data-action="filter-chain" data-value="${esc(r.chain.id)}">${num(d.sameChain.count)} แห่ง</button>`)} · ${nw(`${num(d.sameChain.rooms)} ห้อง`)} · ${nw(`${num(d.sameChain.provinces)} จังหวัด`)}</p>` : '';
  const point = coords
    ? `<span class="data-number">${esc(coords)}</span>${r.coordRole ? `<br><span class="hint">${esc(r.coordRole)}</span>` : ''}`
    : '<span>ไม่มีพิกัด</span>';
  const price = r.price ? `ต่ำสุด ${baht(r.price.min || r.price.avg)} · สูงสุด ${baht(r.price.max || r.price.avg)}${r.price.avg ? ` · เฉลี่ย ${baht(r.price.avg)}` : ''} ต่อคืน · CityMETER Hotel V3` : '';
  return `<section class="detail-head store">
      <button type="button" class="btn quiet back" data-action="back">กลับ</button>
      <div class="identity"><span class="identity-cue">${cueMarkup(r.series)}</span><div>
        ${r.brand && logoMarkup(r.brand.id) ? `<p class="identity-logo">${logoMarkup(r.brand.id, {className: 'brand-logo panel-logo'})}<span class="sr-only">${esc(r.brand.name)}</span></p>` : ''}
        <p class="eyebrow eyebrow-cue">${esc(d.group?.th || '')}${r.rawType && r.rawType !== d.group?.th ? ` · ${esc(r.rawType)}` : ''}</p>
        <h2>${esc(r.name || r.nameEn || 'ไม่มีชื่อ')}</h2>
        ${subLine(r, 'branch-name', 'p')}</div></div>
      <div class="fact-chips">${roomsChip}${chainChip}${areaChip}${siteChip}${priceChip}${meetingChip}${railChip}${nextChip}${shopChip}${buildingChip}${coords ? '' : '<span class="fact-chip is-quiet">ไม่มีพิกัด</span>'}</div>
      ${neighbours}${sameChain}
      ${actionBar({kind: 'hotel', row: r, area: d.area ? {place: `${w.area}${d.area.name}`, province: prov} : r.province ? {place: '', province: prov} : null,
        point: hasPoint(r) ? {lat: r.latitude, lon: r.longitude, role: 'point'} : null})}
      <details class="source-details"><summary>ที่มาและพิกัด</summary>
        <dl class="facts">
          <dt>แหล่ง</dt><dd>${esc(r.source?.th || 'แหล่งทางการ')}${r.url ? ` · ${link(r.url, 'หน้าแหล่ง')}` : ''}</dd>
          ${r.recorded ? `<dt>ชื่อ</dt><dd>${esc(r.name)}${r.nameSource?.url ? ` · ${link(r.nameSource.url, 'หน้าแบรนด์')}` : ''}${r.nameSource?.on ? ` · ${nw(esc(thaiDate(r.nameSource.on)))}` : ''}</dd>
          <dt>${RECORDED_NAME}</dt><dd>${esc([r.recorded.name, r.recorded.nameEn].filter(Boolean).join(' · '))}</dd>` : ''}
          <dt>พื้นที่</dt><dd>${esc(ADMIN_TH[r.admin] || '')}</dd>
          <dt>พิกัด</dt><dd>${point}</dd>
          ${price ? `<dt>ราคาที่บันทึก</dt><dd>${price}</dd><dt>วันที่ราคา</dt><dd>ไม่ระบุในแหล่ง</dd>` : ''}
          <dt>อาคาร</dt><dd>${esc(MASS_TH[r.mass] || MASS_TH.not_checked)}</dd>
          ${r.site ? `<dt>ไซต์</dt><dd>${nw(`${num(r.site.n)} อาคาร`)} · ${esc(r.site.source || 'งานวิจัย')}${r.site.url ? ` · ${link(r.site.url, 'หน้าอ้างอิง')}` : ''}${r.site.credit ? ` · ${link(r.site.credit.url, r.site.credit.text)}` : ''}${r.site.on ? ` · ${nw(esc(thaiDate(r.site.on)))}` : ''}</dd>` : ''}
          ${r.collections.length ? `<dt>คอลเลกชัน</dt><dd>${esc(r.collections.join(' · '))}</dd>` : ''}
          <dt>รหัส</dt><dd><span class="hint data-number">${esc(r.id)}</span></dd>
        </dl>
        <p class="links">${d.area ? link(productionLink({province: r.province, area: r.area}), 'ดูพื้นที่นี้ใน CityMETER') : ''}</p>
      </details>
    </section>
    ${hasPoint(r) ? `<section class="panel-section terrain-section"><div class="section-heading">${heading('elevation', 'ภูมิประเทศ')}</div>
      <div class="fact-chips terrain-chips" data-terrain-for="${esc(r.id)}"><span class="hint">กำลังอ่านภูมิประเทศ</span></div></section>` : ''}
    ${compsetSection(d.compset, d.group?.th)}
    ${provenance(ctx, d.area ? `${w.area}${d.area.name} ${prov}` : prov || 'ไม่ระบุจังหวัด', {rail: Boolean(r.rail || r.railNext), retail: Boolean(r.shop), terrain: hasPoint(r), site: r.site || null})}`;
}

/** Terrain chips (js/shell/terrain.js#terrainChips) as fact chips; '' when nothing is known. */
export function terrainChipsHTML(chips) {
  return chips.map(c => `<span class="fact-chip" title="${esc(c.title)}">${pic(c.kind)}${esc(c.text)}</span>`).join('');
}

/** "ร้านอาหาร 3 · ฟิตเนส 1" from 16_BRANCH_SPATIAL_CANDIDATES rows of the same building mass. */
export function summarizeIndustries(list) {
  const m = new Map();
  for (const [industry] of list) m.set(industry || 'อื่น ๆ', (m.get(industry || 'อื่น ๆ') || 0) + 1);
  return [...m].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'th')).map(([k, v]) => `${k} ${num(v)}`).join(' · ');
}

/* ---------- Active filter chips ---------- */

export function renderFilterChips(values, labels) {
  const chips = [];
  const push = (key, text) => chips.push(`<li><button type="button" class="filter-chip" data-action="clear-filter" data-id="${esc(key)}" aria-label="ล้างตัวกรอง ${esc(text)}"><span>${esc(text)}</span><i aria-hidden="true">×</i></button></li>`);
  if (values.search) push('search', `ค้นหา “${values.search}”`);
  if (values.group) push('group', labels.group[values.group] || values.group);
  if (values.size) push('size', labels.size[values.size] || values.size);
  if (values.province) push('province', labels.province[values.province] || values.province);
  if (values.chain) push('chain', values.chain === 'none' ? 'ไม่ระบุเครือ' : labels.chain[values.chain] || values.chain);
  return chips.length ? `<ul class="filter-chips" aria-label="ตัวกรองที่ใช้อยู่">${chips.join('')}<li><button type="button" class="filter-chip clear-all" data-action="clear-filter" data-id="all">ล้างทั้งหมด</button></li></ul>` : '';
}
