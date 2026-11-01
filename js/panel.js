/**
 * Reading panel views as HTML strings. Pure: no DOM access, no map.
 *
 * Every actionable element carries data-action (+ data-id / data-value); the app binds one delegated handler.
 * Actions: select-area · select-hotel · select-building · select-station · select-province · filter-chain ·
 * filter-group · set-metric · back · explore-top · clear-focus · open-charts · open-table · clear-filter · leave-area.
 *
 * Copy is short, natural Thai. Two measures (js/model.js#METRICS): ห้อง = rooms the sources record (default) ·
 * แห่ง = accommodation records. A record with unknown rooms is never shown as 0 rooms (“ไม่ทราบจำนวนห้อง”). Recorded
 * prices are shown per hotel only, with “ราคาที่บันทึก” and “ไม่ทราบช่วงเวลา”, never summed or averaged across
 * hotels. Distances are straight lines (“ระยะตรง”). Building wording: “จุดตกในอาคาร”, never “ตั้งอยู่ใน”. Every view
 * ends with one provenance line (dataset · source · date · boundary) and one clause on what the counted unit is.
 * Metric tiles and headings carry the pictogram subset (js/navigation.js PICTOGRAM_CONTRACT); the text is the
 * meaning. Sources, methods and ids sit in one closed <details> block.
 */
import {productionLink, provinceByCode, hasPoint, stationLink, retailLink, SIZE_BANDS, metricOf} from './model.js';
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

export function link(url, label, cls = 'source-link') {
  const u = safeURL(url);
  return u ? `<a class="${cls}" href="${esc(u)}" target="_blank" rel="noopener">${esc(label)}</a>` : '';
}

export function thaiDate(iso) {
  if (!/^\d{4}-\d{2}-\d{2}/.test(iso || '')) return iso || '';
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  return `${d} ${months[m - 1]} ${y + 543}`;
}

/** Metric tile with a decorative pictogram; value may be a preformatted string. */
export function metricTile(value, label, kind = '') {
  const shown = typeof value === 'string' ? value : num(value);
  return `<div class="metric${kind ? ` metric-${kind}` : ''}"><i class="metric-symbol pictogram pic-${esc(kind || 'plain')}" aria-hidden="true"></i><strong class="data-number">${esc(shown)}</strong><span>${esc(label)}</span></div>`;
}
export const heading = (kind, text, id = '') => `<h3${id ? ` id="${esc(id)}"` : ''}><i class="pictogram pic-${esc(kind)}" aria-hidden="true"></i>${esc(text)}</h3>`;

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
const stationName = s => (s ? `สถานี${s.name}${s.lines?.length ? ` (${s.lines.join(' · ')})` : ''}` : '');

/* ---------- vocabularies ---------- */

/** How the row's district was matched at build time (row.admin). */
export const ADMIN_TH = Object.freeze({
  source: 'เขต/อำเภอที่ CityMETER Hotel V3 จัดที่พักนี้ไว้',
  name: 'ชื่อเขต/อำเภอในข้อมูลของที่พักเอง',
  point: 'จากจุดของที่พัก (อยู่ในขอบเขตเขต/อำเภอของจังหวัดเดียวกัน)',
  province: 'แหล่งระบุได้แค่จังหวัด จึงไม่อยู่ในสีของเขต/อำเภอใด',
  conflict: 'จุดของที่พักอยู่คนละจังหวัดกับข้อมูล จึงยังไม่ระบุพื้นที่',
  none: 'แหล่งไม่ระบุจังหวัด',
});
/** What a building-mass status of the research master says (13_BUILDING_LINKS), in reader words. */
const MASS_TH = Object.freeze({
  identity: 'งานวิจัยผูกที่พักกับอาคารแล้ว (ตรวจตัวตน)', spatial: 'จุดของที่พักตกในอาคารที่งานวิจัยเก็บไว้',
  conflict: 'ข้อมูลอาคารขัดกัน ยังไม่ใช้', none_in_area: 'ยังไม่พบอาคารที่ผูกได้ในบริเวณนี้',
  not_acquired: 'ยังไม่ได้เก็บข้อมูลอาคาร', not_checked: 'ยังไม่ได้ตรวจอาคาร',
});

/**
 * Every view that shows numbers ends with dataset · source · date · boundary, and what one counted unit is.
 * ctx = {meta, unit, roomsUnknown?, rail?, retail?}
 */
export function provenance(ctx = {}, boundary = '', {rail = false, retail = false, roomsUnknown = 0, terrain = false} = {}) {
  const meta = ctx.meta || {}, unit = ctx.unit || metricOf('rooms');
  const extra = [rail ? `สถานีจาก CityMETER Transit ณ ${thaiDate(meta.context?.rail?.asOf || '')}` : '', retail ? 'ศูนย์การค้าจาก CityMETER Shopping centers' : '',
    terrain ? `ภูมิประเทศจาก SRTM 30 ม. (สำรวจปี 2543) ผ่าน Terrain Tiles on AWS และแผนที่ OpenStreetMap${ctx.osmDate ? ` ณ ${thaiDate(ctx.osmDate)}` : ''}` : ''].filter(Boolean);
  const clause = unit.id === 'count'
    ? 'แห่ง = ที่พักหนึ่งรายการตามแหล่ง ยังไม่ได้ตรวจว่ายังเปิดอยู่ ไม่ใช่ทุกที่พักในประเทศ'
    : `ห้อง = จำนวนห้องที่แหล่งบันทึก ไม่ใช่ห้องว่างต่อคืน${roomsUnknown ? ` · ${num(roomsUnknown)} แห่งไม่ทราบจำนวนห้อง ไม่นับเป็น 0` : ''}`;
  return `<p class="hint panel-foot provenance"><span>ชุดข้อมูล CityMETER Hotel</span> · <span>แหล่ง CityMETER Hotel V3 ทะเบียนที่พัก ททท. และหน้าทางการ${extra.length ? ` · ${esc(extra.join(' · '))}` : ''}</span> · <span>ตรวจ ${esc(thaiDate(meta.checkedOn || ''))}</span> · <span>ขอบเขต ${esc(boundary)}</span>${rail || retail || terrain ? '<br><span>ระยะ = ระยะตรงระหว่างจุดอ้างอิง ไม่ใช่ระยะเดิน</span>' : ''}${terrain ? '<br><span>ภูมิประเทศ = พื้นดินในรัศมี 500 ม. (ต้นไม้ 300 ม.) รอบจุดของที่พัก ไม่ใช่การยืนยันวิว</span>' : ''}<br>${esc(clause)}</p>`;
}

/* ---------- shared fragments ---------- */

/** Bars per accommodation group in the group's series colour + shape cue; value = the measure. */
function groupBars(byGroup, unit) {
  const val = g => (unit.id === 'count' ? g.count : g.rooms);
  const list = byGroup.filter(g => val(g) > 0).sort((a, b) => val(b) - val(a) || a.index - b.index);
  // Rooms: a group whose records all have unknown rooms has no bar, and is named apart (never a 0 bar).
  const unknown = unit.id === 'count' ? [] : byGroup.filter(g => g.count > 0 && !g.rooms);
  const unknownNote = unknown.length ? `<p class="hint">ไม่ทราบจำนวนห้อง: ${unknown.map(g => `${esc(g.th)} ${nw(`${num(g.count)} แห่ง`)}`).join(' · ')}</p>` : '';
  if (!list.length) return unknownNote || `<p class="hint">ไม่มี${esc(unit.subject)}</p>`;
  const max = Math.max(1, ...list.map(val));
  return `<ul class="mix-list" aria-label="ประเภทที่พัก (${esc(unit.one)})">${list.map(g => `
    <li><button type="button" class="mix-row" data-action="filter-group" data-value="${esc(g.id)}" title="ดูเฉพาะ${esc(g.th)}"><span class="mix-label">${cueMarkup(g.series)}${esc(g.th)}</span>
      <span class="mix-track" aria-hidden="true"><span class="mix-fill category-${g.series}" style="width:${Math.max(3, Math.round((val(g) / max) * 100))}%"></span></span>
      <span class="mix-value data-number">${num(val(g))}</span></button></li>`).join('')}</ul>${unknownNote}`;
}

/** Records and rooms per room-size band; unknown rooms named apart. */
function sizeBars(sizes) {
  const max = Math.max(1, ...sizes.bands.map(b => b.count));
  if (!sizes.bands.some(b => b.count)) return '';
  return `<ul class="mix-list size-list" aria-label="ขนาดที่พัก (แห่ง)">${sizes.bands.map(b => `
    <li><span class="mix-label">${esc(b.th)}</span>
      <span class="mix-track" aria-hidden="true"><span class="mix-fill size-fill" style="width:${b.count ? Math.max(3, Math.round((b.count / max) * 100)) : 0}%"></span></span>
      <span class="mix-value data-number" title="${num(b.rooms)} ห้อง">${num(b.count)}</span></li>`).join('')}</ul>
    ${sizes.unknown ? `<p class="hint">ไม่ทราบจำนวนห้อง ${nw(`${num(sizes.unknown)} แห่ง`)}</p>` : ''}`;
}

function rowMeta(r, {showArea = false, index = null, distance = null} = {}) {
  const area = showArea && index && r.area ? index.byId.get(r.area) : null;
  const d = distance?.get?.(r.id);
  return [roomsText(r), r.brand ? r.brand.name : '', area ? placeName(area) : showArea && !r.area ? (r.province ? `${provinceName(r.province)} · ระบุได้แค่จังหวัด` : 'ไม่ระบุจังหวัด') : '',
    Number.isFinite(d) ? meters(d) : ''].filter(Boolean).join(' · ');
}

/** Hotels: cue (accommodation group) + name, then rooms · brand · where · distance. */
export function hotelList(rows, opts = {}) {
  return `<ul class="outlet-list">${rows.map(r => `<li><button type="button" class="brand-row" data-action="select-hotel" data-id="${esc(r.id)}">${cueMarkup(r.series, {className: 'row-cue'})}<span class="row-text"><strong>${esc(r.name || r.nameEn || 'ไม่มีชื่อในแหล่งข้อมูล')}</strong>${r.nameEn && r.nameEn !== r.name ? `<span class="row-branch">${esc(r.nameEn)}</span>` : ''}<span class="row-meta">${esc(rowMeta(r, opts))}</span></span></button></li>`).join('')}</ul>`;
}

/** The chip figure of a chain or brand: the measure; rooms unknown → its records (“2 แห่ง”), never “0”. */
const chipFigure = (x, unit) => (unit.id === 'count' ? num(x.count) : x.rooms ? num(x.rooms) : `${num(x.count)} แห่ง`);
const chipTitle = x => `${num(x.count)} แห่ง · ${x.rooms ? `${num(x.rooms)} ห้อง` : 'ไม่ทราบจำนวนห้อง'}`;

/** Hotel groups (chains) as chips; each filters the map to that group. */
function chainChips(list, unit) {
  if (!list.length) return '<p class="hint">ไม่มีที่พักที่ชุดข้อมูลระบุเครือในตัวกรองนี้</p>';
  return `<ul class="chip-list">${list.map(c => `<li><button type="button" class="brand-chip" data-action="filter-chain" data-value="${esc(c.chain.id)}" title="${esc(c.chain.name)} — ${chipTitle(c)} (ดูเฉพาะเครือนี้)"><i class="pictogram pic-chain chip-pic" aria-hidden="true"></i><span>${esc(c.chain.name)}</span><small class="data-number">${chipFigure(c, unit)}</small></button></li>`).join('')}</ul>`;
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

/** Rows no district holds, by reason — they stay in every total, never in a district colour. */
function unplacedNote(u) {
  if (!u?.total) return '';
  const parts = [u.noArea ? `ระบุได้แค่จังหวัด ${num(u.noArea)}` : '', u.noProvince ? `ไม่ระบุจังหวัด ${num(u.noProvince)}` : '', u.conflict ? `ข้อมูลจังหวัดขัดกัน ${num(u.conflict)}` : ''].filter(Boolean);
  return `<p class="hint">ไม่อยู่ในอันดับ ${parts.join(' · ')} แห่ง${u.rooms ? ` (${num(u.rooms)} ห้อง)` : ''} — นับในยอดรวม</p>`;
}

/** Stations of CityMETER · Transit whose 500 m holds the most of the measure (each row at its nearest station). */
function stationRanking(list, unit, {title = 'สถานีรถไฟฟ้าที่มีห้องพักรอบ 500 ม. มากที่สุด', limit = 6} = {}) {
  const top = list.slice(0, limit);
  if (!top.length) return '';
  const max = Math.max(1, ...top.map(s => s.value));
  return `<section class="panel-section"><div class="section-heading">${heading('rail', title)}<span class="hint">ระยะตรง ≤ 500 ม.</span></div>
    <ol class="rank-list">${top.map((s, i) => `<li><button type="button" class="rank-row" data-action="select-station" data-id="${esc(s.station.id)}" aria-label="${esc(stationName(s.station))} ${num(s.value)} ${esc(unit.one)}">
      <span class="rank-index data-number" aria-hidden="true">${i + 1}</span>
      <span class="rank-name">${esc(stationName(s.station))}<small>${esc(`${num(s.count)} แห่ง · ${num(s.rooms)} ห้อง`)}</small></span>
      <span class="rank-track" aria-hidden="true"><span class="rank-fill rail-fill" style="width:${Math.max(3, Math.round((s.value / max) * 100))}%"></span></span>
      <span class="rank-value data-number" aria-hidden="true">${num(s.value)}</span></button></li>`).join('')}</ol>
    <p class="hint">นับที่พักแต่ละแห่งที่สถานีที่ใกล้ที่สุดเพียงสถานีเดียว</p></section>`;
}

/** Rail line: share of the measure within 500 m of an operating station, among rows with a point. */
function railLine(rail, unit, label) {
  if (!rail || rail.share == null || !rail.base) return '';
  return `<p class="fact-line"><i class="fact-icon pictogram pic-rail" aria-hidden="true"></i>${esc(label)} ${nw(`<strong class="data-number">${pct(rail.within, rail.base)}</strong>`)} ของ${esc(unit.subject)}ที่มีพิกัด ${nw(`(${num(rail.within)}/${num(rail.base)} ${esc(unit.one)})`)} อยู่ห่างสถานีรถไฟฟ้าที่เปิดแล้วไม่เกิน 500 ม.</p>`;
}

/* ---------- Chain card (chain filter) ---------- */

export function renderChainCard(p, ctx = {}) {
  if (!p) return '';
  const unit = ctx.unit, c = p.chain;
  const brandList = p.brands.length ? `<ul class="chip-list">${p.brands.map(b => `<li><span class="brand-chip is-static" title="${esc(b.brand.name)} — ${chipTitle(b)}"><span>${esc(b.brand.name)}</span><small class="data-number">${chipFigure(b, unit)}</small></span></li>`).join('')}</ul>` : '';
  return `<section class="brand-card detail-head" aria-labelledby="chain-title">
      <div class="identity"><i class="pictogram pic-chain identity-pic" aria-hidden="true"></i><div>
        <p class="eyebrow">เครือโรงแรม · ตามชื่อแบรนด์ที่ชุดข้อมูลบันทึก</p>
        <h2 id="chain-title">${esc(c.name)}</h2></div></div>
      ${p.scopeCount ? `<div class="metrics compact">${metricTile(p.scopeRooms, 'ห้อง', 'rooms')}${metricTile(p.scopeCount, 'แห่ง', 'hotel')}${metricTile(p.provinces, 'จังหวัด', 'province')}${metricTile(p.placed, 'ระบุเขต/อำเภอได้', 'area')}</div>` : ''}
      ${railLine(p.rail, unit, 'ใกล้รถไฟฟ้า')}
      ${brandList}
      ${actionBar({kind: 'chain', chain: c})}
      <p class="hint">นับเฉพาะที่พักที่ชุดข้อมูลระบุแบรนด์ของเครือนี้ · ที่พักที่ไม่ระบุแบรนด์อาจเป็นของเครือนี้ก็ได้</p>
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
  const more = top && o.value > top.value ? ` — มากกว่า${esc(areaWord(insight.home))}ใดใน${esc(home)}` : '';
  if (tied.length === 1) return `<p class="aha-secondary">นอก${esc(home)}มากที่สุด: ${linkTo(tied[0])} ${valueText(o.value, unit)}${more}</p>`;
  const shown = tied.slice(0, 3), rest = tied.length - shown.length;
  return `<p class="aha-secondary">นอก${esc(home)}มากที่สุด ${valueText(o.value, unit)} เท่ากัน ${num(tied.length)} พื้นที่: ${shown.map(linkTo).join(' · ')}${rest ? ` และอีก ${num(rest)} พื้นที่` : ''}</p>`;
}

/** Rail comparison of the Aha: focus vs the rest of the province, both bases stated; hidden when nothing is near rail. */
function railCompare(insight, unit, count, w, home) {
  const f = insight.rail?.focus, r = insight.rail?.rest;
  if (!f || !r || !f.base || !r.base || !(f.within + r.within)) return '';
  const where = count === 1 ? placeName(insight.areas[0]) : ` ${num(count)} ${w}นี้`;
  return `<p class="aha-personality"><i class="pictogram pic-rail" aria-hidden="true"></i>ห่างสถานีรถไฟฟ้าที่เปิดแล้วไม่เกิน 500 ม.: ${nw(`<strong class="data-number">${pct(f.within, f.base)}</strong>`)} ของ${esc(unit.subject)}ใน${esc(where)} ${nw(`(${num(f.within)}/${num(f.base)})`)} · ${esc(w)}อื่นของ${esc(home)} ${nw(`<strong class="data-number">${pct(r.within, r.base)}</strong> (${num(r.within)}/${num(r.base)})`)}</p>`;
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
    aha = `<section class="aha" aria-label="ข้อค้นพบ"><p class="eyebrow">ข้อค้นพบแรก</p><h2>ไม่พบที่พักตามตัวกรองนี้</h2>
      <div class="aha-actions"><button type="button" data-action="clear-filter" data-id="all" class="btn">ล้างตัวกรอง</button></div></section>`;
  } else if (focusMode === 'explicit') {
    aha = `<section class="aha is-focused" aria-label="ข้อค้นพบ"><p class="eyebrow">กำลังสำรวจ ${num(count)} ${esc(w)}</p>
      <h2>${insight.areas.map(a => esc(a.name)).join(' · ')}</h2>
      <p class="aha-copy">${valueText(insight.value, unit)} · ${nw(`${num(insight.count)} แห่ง`)}</p>
      <div class="aha-actions"><button type="button" data-action="clear-focus" class="btn">ดูทุกพื้นที่</button><button type="button" data-action="open-charts" class="btn quiet">เปรียบเทียบพื้นที่</button></div></section>`;
  } else if (!count && insight.spread) {
    const sw = areaWord(insight.home), sp = insight.spread;
    aha = `<section class="aha" aria-label="ข้อค้นพบ"><p class="eyebrow">ข้อค้นพบแรก</p>
      <h2><span class="aha-number data-number">${num(sp.areas)}</span><span class="aha-headline">${esc(sw)}ใน${esc(home)} มี${esc(unit.subject)}${esc(sw)}ละ ${num(sp.value)} ${esc(unit.one)}เท่ากัน</span></h2>
      <p class="aha-copy">${esc(unit.subject)}กระจาย ไม่กระจุกใน${esc(sw)}ใด · ${valueText(insight.homePlacedValue, unit)}ที่ระบุ${esc(sw)}ได้</p>
      ${outsideLine(insight, home, unit, province)}
      <div class="aha-actions"><button type="button" data-action="open-charts" class="btn quiet">เปรียบเทียบพื้นที่</button></div></section>`;
  } else if (!count) {
    aha = `<section class="aha" aria-label="ข้อค้นพบ"><p class="eyebrow">ข้อค้นพบแรก</p><h2><span class="aha-number data-number">${num(summary.count)}</span><span class="aha-headline">แห่งตามตัวกรอง — ยังระบุเขต/อำเภอไม่ได้</span></h2>
      <p class="aha-copy">แหล่งระบุที่ตั้งของที่พักเหล่านี้ได้แค่จังหวัดหรือไม่ระบุเลย จึงยังจัดอันดับเขต/อำเภอไม่ได้</p>
      <div class="aha-actions"><button type="button" data-action="open-table" class="btn">ดูรายชื่อ</button></div></section>`;
  } else {
    const toggle = focusMode === 'auto'
      ? '<button type="button" data-action="clear-focus" class="btn">ดูทุกพื้นที่</button>'
      : `<button type="button" data-action="explore-top" class="btn primary">โฟกัส ${num(count)} ${esc(w)}นี้</button>`;
    const where = count === 1 ? esc(placeName(insight.areas[0])) : ` ${num(count)} ${esc(w)}นี้`;
    const unplaced = insight.homeUnplacedValue ? ` · อีก ${nw(`${num(insight.homeUnplacedValue)} ${esc(unit.one)}`)}ใน${esc(home)}ระบุได้แค่จังหวัด` : '';
    const rail = railCompare(insight, unit, count, w, home);
    aha = `<section class="aha${focusMode === 'auto' ? ' is-auto' : ''}" aria-label="ข้อค้นพบ"><p class="eyebrow">ข้อค้นพบแรก</p>
      <h2><span class="aha-number data-number">${pct(insight.value, insight.homePlacedValue)}</span><span class="aha-headline">ของ${esc(unit.subject)}ใน${esc(home)}ที่ระบุ${esc(w)}ได้ อยู่ใน${where}</span></h2>
      <p class="aha-copy">${names}<br>${nw(`<strong class="data-number">${num(insight.value)}</strong> จาก ${num(insight.homePlacedValue)} ${esc(unit.one)}`)}${unplaced}</p>
      ${rail}${outsideLine(insight, home, unit, province)}
      <p class="hint">${unit.id === 'count' ? 'นับที่พักที่ระบุ' + esc(w) + 'ได้' : `นับห้องที่แหล่งบันทึก ในที่พักที่ระบุ${esc(w)}ได้${insight.homeRoomsUnknown ? ` · ${num(insight.homeRoomsUnknown)} แห่งไม่ทราบจำนวนห้อง` : ''}`}${rail ? ' · สัดส่วนใกล้รถไฟฟ้านับเฉพาะที่พักที่มีพิกัด' : ''}</p>
      <div class="aha-actions">${toggle}<button type="button" data-action="open-charts" class="btn quiet">เปรียบเทียบพื้นที่</button></div></section>`;
  }
  const narrowed = focusMode !== 'none' && count > 0 && summary.count !== overview.count;
  const metrics = `<section class="metrics" aria-label="${narrowed ? 'ตัวเลขของพื้นที่ที่โฟกัส' : 'ตัวเลขรวมของข้อมูลที่เลือก'}">
    ${metricTile(summary.rooms, `ห้อง${narrowed ? ' ในโฟกัส' : ''}`, 'rooms')}
    ${metricTile(summary.count, `แห่ง${narrowed ? ' ในโฟกัส' : ''}`, 'hotel')}
    ${metricTile(summary.areas, `${narrowed ? esc(w) : 'เขต/อำเภอ'}ที่พบ`, 'area')}
    ${metricTile(summary.provinces, 'จังหวัดที่พบ', 'province')}
  </section>`;
  const scopeText = province ? `${provinceName(province)} · ${areaWord(province)}ตามขอบเขต CityMETER` : 'ประเทศไทย 77 จังหวัด · เขต/อำเภอตามขอบเขต CityMETER';
  const provinceRows = p => `<li><button type="button" class="province-row" data-action="select-province" data-id="${esc(p.code)}" aria-label="${esc(p.name)} ${num(p.value)} ${esc(unit.one)} กดเพื่อดูจังหวัด"><i class="province-swatch" style="background:${esc(p.fill)}" aria-hidden="true"></i><span class="province-name">${esc(p.name)}</span><span class="province-count data-number">${num(p.value)}<small>${esc(unit.one)}</small></span></button></li>`;
  const shown = provinces.slice(0, 8), rest = provinces.slice(8);
  const unknown = unknownProvince ? `<p class="hint">ไม่ระบุจังหวัด ${nw(`${num(unknownProvince)} แห่ง`)} — นับในยอดรวม ไม่อยู่บนแผนที่</p>` : '';
  const provinceList = provinces.length > 1 ? `<section class="panel-section" aria-labelledby="province-title">
    <div class="section-heading">${heading('province', `จังหวัดที่มี${unit.subject}มากที่สุด`, 'province-title')}<span class="hint">${num(provinces.length)} จังหวัด</span></div>
    <ul class="province-list">${shown.map(provinceRows).join('')}</ul>
    ${rest.length ? `<details class="more-provinces"><summary>อีก ${num(rest.length)} จังหวัด</summary><ul class="province-list">${rest.map(provinceRows).join('')}</ul></details>` : ''}
    ${unknown}</section>` : '';
  const rw = province ? areaWord(province) : 'เขต/อำเภอ';
  const rank = areaRanking(overview.ranking, classOf, unit, {title: `${rw}ที่มี${unit.subject}มากที่สุด`, note: `${num(overview.ranking.filter(a => a.value > 0).length)} ${rw}`, showProvince: !province});
  const ranking = rank ? rank.replace('</section>', `${unplacedNote(overview.unplaced)}</section>`) : '';
  const mix = overview.count ? `<section class="panel-section"><div class="section-heading">${heading('segment', 'ประเภทที่พัก')}<span class="hint">${esc(unit.one)}</span></div>${groupBars(overview.mix.byGroup, unit)}</section>` : '';
  const sizes = overview.count ? `<section class="panel-section"><div class="section-heading">${heading('rooms', 'ขนาดตามจำนวนห้อง')}<span class="hint">แห่ง</span></div>${sizeBars(overview.sizes)}</section>` : '';
  const chains = overview.chains.length && !chainCard ? `<section class="panel-section"><div class="section-heading">${heading('chain', `เครือที่มี${unit.subject}มากที่สุด`)}<span class="hint"><button type="button" class="link-button" data-action="open-charts" data-value="chains">ดูทุกเครือ</button></span></div>${chainChips(overview.chains, unit)}
    <p class="hint">ชุดข้อมูลระบุแบรนด์ ${nw(`${num(overview.branded.count)} แห่ง`)} (${nw(`${num(overview.branded.rooms)} ห้อง`)}) · ที่พักที่ไม่ระบุแบรนด์ไม่ได้แปลว่าเป็นโรงแรมอิสระ</p></section>` : '';
  const rail = stationRanking(stations, unit, {title: `สถานีรถไฟฟ้าที่มี${unit.subject}รอบ 500 ม. มากที่สุด`});
  return `${chainCard}${aha}${metrics}${provinceList}${ranking}${rail}${mix}${sizes}${chains}${chainCard ? '' : actionBar({kind: 'overview', province: province ? provinceName(province) : ''})}${provenance(ctx, scopeText, {rail: Boolean(rail || insight.rail?.focus?.within), roomsUnknown: unit.id === 'rooms' ? summary.roomsUnknown : 0})}`;
}

/* ---------- Empty selections (EVID-05) ---------- */

/**
 * measured_zero: every district is in the register's national scope, so a district with no record under the
 * filters is a measured 0 of this dataset — offered with where the same filters match. Never "no data".
 */
function selectionNote(p, place, ctx) {
  if (p.coverageState !== 'measured_zero') return '';
  const base = ctx.filtered ? '<span>0 แห่งภายใต้ตัวกรองนี้</span>' : '<span>ชุดข้อมูลนี้ไม่มีที่พักที่แหล่งจัดไว้ในพื้นที่นี้</span>';
  const elsewhere = p.scopeCount > 0
    ? `<span>ตัวกรองเดียวกันพบ <strong class="data-number">${num(p.scopeCount)}</strong> แห่งในพื้นที่อื่น</span><button type="button" class="btn quiet" data-action="leave-area">ดูพื้นที่ที่พบ</button>`
    : '';
  return `<div class="empty-note" role="note"><strong>ไม่พบที่พักใน${esc(place)}</strong>${base}${elsewhere}</div>`;
}

/* ---------- District (เขต/อำเภอ) ---------- */

export function renderArea(p, classOf, ctx = {}) {
  if (!p) return '';
  const unit = ctx.unit, a = p.area, w = p.words;
  const place = `${w.area}${a.name}`, prov = provinceName(a.province);
  const rankText = p.rank ? `อันดับ ${num(p.rank)} จาก ${num(p.rankOf)} ทั่วประเทศ${p.rankProvince && p.rankProvinceOf > 1 ? ` · ${num(p.rankProvince)} จาก ${num(p.rankProvinceOf)} ใน${prov}` : ''}` : '';
  const listLimit = 30;
  const railShare = p.rail?.base ? pct(p.rail.within, p.rail.base) : '—';
  const head = `<section class="detail-head">
      <button type="button" class="btn quiet back" data-action="back">กลับ</button>
      <p class="eyebrow">${esc(w.area)} · <button type="button" class="link-button" data-action="select-province" data-id="${esc(a.province)}">${esc(prov)}</button>${rankText ? ` · ${esc(rankText)}` : ''}</p>
      <h2>${esc(place)}</h2>${a.nameEn ? `<p class="subtle">${esc(a.nameEn)}</p>` : ''}
      <div class="metrics compact">${metricTile(p.rooms, 'ห้อง', 'rooms')}${metricTile(p.count, 'แห่ง', 'hotel')}${metricTile(p.count && p.provinceValue ? pct(p.value, p.provinceValue) : '—', `ของ${prov}`, 'province')}${metricTile(railShare, 'ใกล้รถไฟฟ้า', 'rail')}</div>
      ${selectionNote(p, place, ctx)}
      ${p.count && p.provinceValue ? `<p class="hint">${pct(p.value, p.provinceValue)} = ${nw(`${num(p.value)} จาก ${num(p.provinceValue)} ${esc(unit.one)}`)}ใน${esc(prov)}ที่ระบุ${esc(w.area)}ได้${p.rail?.base ? ` · ใกล้รถไฟฟ้า = ห่างสถานีที่เปิดแล้วไม่เกิน 500 ม. ${nw(`(${num(p.rail.within)}/${num(p.rail.base)} ${esc(unit.one)}ที่มีพิกัด)`)}` : ''}</p>` : ''}
      ${actionBar({kind: 'area', area: {place, province: prov}})}
      <div class="detail-actions">${p.count ? '<button type="button" class="btn" data-action="open-table">ดูรายชื่อ</button><button type="button" class="btn quiet" data-action="open-charts">เปรียบเทียบพื้นที่</button>' : ''}${link(productionLink({province: a.province, area: a.id}), 'ดูใน CityMETER', 'btn quiet source-link')}</div>
    </section>
`;
  const boundary = `${place} ${prov} (ขอบเขต CityMETER)`;
  if (!p.count) return `${head}${provenance(ctx, boundary)}`;
  const chains = p.chains.length ? `<section class="panel-section"><div class="section-heading">${heading('chain', 'เครือโรงแรม')}<span class="hint">${num(p.branded.count)} แห่งที่ระบุแบรนด์</span></div>${chainChips(p.chains, unit)}</section>` : '';
  const meeting = p.meeting ? `<p class="fact-line"><i class="fact-icon pictogram pic-meeting" aria-hidden="true"></i>ทะเบียน ททท. ระบุห้องประชุมใน ${nw(`${num(p.meeting)} แห่ง`)}ของ${esc(w.area)}นี้</p>` : '';
  return `${head}    <section class="panel-section"><div class="section-heading">${heading('segment', 'ประเภทที่พัก')}<span class="hint">${esc(unit.one)}</span></div>${groupBars(p.byGroup, unit)}</section>
    <section class="panel-section"><div class="section-heading">${heading('rooms', 'ขนาดตามจำนวนห้อง')}<span class="hint">แห่ง</span></div>${sizeBars(p.sizes)}${meeting}</section>
    ${stationRanking(p.stations, unit, {title: 'สถานีรถไฟฟ้าใกล้ที่พักในพื้นที่นี้'})}
    ${chains}
    <section class="panel-section"><div class="section-heading">${heading('hotel', 'ที่พัก เรียงตามจำนวนห้อง')}<span class="hint">${num(p.count)}</span></div>${hotelList(p.rows.slice(0, listLimit))}
      ${p.count > listLimit ? `<p class="hint">แสดง ${num(listLimit)} จาก ${num(p.count)} แห่ง · <button type="button" class="link-button" data-action="open-table">ดูทั้งหมดในตาราง</button></p>` : ''}</section>
    ${provenance(ctx, boundary, {rail: Boolean(p.rail?.base), roomsUnknown: unit.id === 'rooms' ? p.roomsUnknown : 0})}`;
}

/* ---------- Station (CityMETER · Transit) ---------- */

export function renderStation(p, ctx = {}) {
  if (!p) return '';
  const unit = ctx.unit, s = p.station;
  const status = s.status === 'operating' ? 'เปิดให้บริการ' : 'กำลังก่อสร้าง — โครงการ ไม่ใช่บริการ';
  const listLimit = 40;
  const head = `<section class="detail-head station">
      <button type="button" class="btn quiet back" data-action="back">กลับ</button>
      <div class="identity"><i class="pictogram pic-rail identity-pic" aria-hidden="true"></i><div>
        <p class="eyebrow">สถานีรถไฟฟ้า${s.lines?.length ? ` · ${esc(s.lines.join(' · '))}` : ''} · ${esc(status)}</p>
        <h2>สถานี${esc(s.name)}</h2>${s.nameEn ? `<p class="subtle">${esc(s.nameEn)}</p>` : ''}</div></div>
      <div class="metrics compact">${metricTile(p.rooms, 'ห้อง', 'rooms')}${metricTile(p.count, 'แห่ง', 'hotel')}${metricTile(p.radius, 'ม. รอบสถานี', 'rail')}</div>
      <p class="hint">ที่พักที่จุดอยู่ห่างจุดอ้างอิงของสถานีไม่เกิน ${esc(meters(p.radius))} (ระยะตรง ไม่ใช่ระยะเดิน)${p.roomsUnknown ? ` · ${num(p.roomsUnknown)} แห่งไม่ทราบจำนวนห้อง` : ''}</p>
      ${actionBar({kind: 'station', station: s, point: {lat: s.lat, lon: s.lon, role: 'station'}})}
      <div class="detail-actions">${link(stationLink(s), 'ดูสถานีนี้ใน CityMETER Transit', 'btn quiet source-link')}</div>
    </section>
`;
  const boundary = `รัศมี ${meters(p.radius)} จากสถานี${s.name}`;
  if (!p.count) return `${head}<div class="empty-note" role="note"><strong>ไม่พบที่พักที่มีพิกัดในรัศมีนี้ตามตัวกรอง</strong></div>${provenance(ctx, boundary, {rail: true})}`;
  return `${head}    <section class="panel-section"><div class="section-heading">${heading('segment', 'ประเภทที่พัก')}<span class="hint">${esc(unit.one)}</span></div>${groupBars(p.byGroup, unit)}</section>
    ${p.chains.length ? `<section class="panel-section"><div class="section-heading">${heading('chain', 'เครือโรงแรม')}</div>${chainChips(p.chains, unit)}</section>` : ''}
    <section class="panel-section"><div class="section-heading">${heading('hotel', 'ที่พัก เรียงตามจำนวนห้อง')}<span class="hint">${num(p.count)}</span></div>${hotelList(p.rows.slice(0, listLimit), {showArea: true, index: ctx.index, distance: p.distance})}
      ${p.count > listLimit ? `<p class="hint">แสดง ${num(listLimit)} จาก ${num(p.count)} แห่ง</p>` : ''}</section>
    ${provenance(ctx, boundary, {rail: true, roomsUnknown: unit.id === 'rooms' ? p.roomsUnknown : 0})}`;
}

/* ---------- Building (display-time spatial join) ---------- */

export function renderBuilding(b, ctx = {}) {
  if (!b) return '';
  const w = b.words;
  const area = b.area ? `${w.area}${b.area.name}` : '';
  const height = b.height != null ? `สูงราว ${num(Math.round(b.height))} ม. (OpenStreetMap)` : '';
  const withPoint = b.rows.find(hasPoint);
  return `<section class="detail-head building">
      <button type="button" class="btn quiet back" data-action="back">กลับ</button>
      <p class="eyebrow"><i class="pictogram pic-building" aria-hidden="true"></i> อาคารบนแผนที่${b.area ? ` · <button type="button" class="link-button" data-action="select-area" data-id="${esc(b.area.id)}">${esc(area)}</button>` : ''}${height ? ` · ${esc(height)}` : ''}</p>
      <h2>ที่พักที่จุดตกในอาคารนี้</h2>
      <div class="metrics compact">${metricTile(b.rooms, 'ห้อง', 'rooms')}${metricTile(b.count, 'แห่ง', 'hotel')}</div>
      ${actionBar({kind: 'building', rows: b.rows, area: b.area ? {place: area, province: provinceName(b.area.province)} : null,
        point: withPoint ? {lat: withPoint.latitude, lon: withPoint.longitude, role: 'point'} : null})}
    </section>
    <section class="panel-section"><div class="section-heading">${heading('hotel', 'ที่พัก')}<span class="hint">${num(b.count)}</span></div>${hotelList(b.rows.slice(0, 40), {showArea: b.areaCount > 1, index: ctx.index})}
      ${b.count > 40 ? `<p class="hint">แสดง ${num(40)} จาก ${num(b.count)} · ดูทั้งหมดในตาราง</p>` : ''}</section>
    ${provenance(ctx, `จุดของที่พักที่ตกในขอบอาคาร OpenStreetMap หนึ่งหลัง${area ? ` · ${area} (ขอบเขต CityMETER)` : ''}`, {roomsUnknown: ctx.unit?.id === 'rooms' ? b.roomsUnknown : 0})}`;
}

/* ---------- Hotel ---------- */

export function priceText(price) {
  if (!price) return '';
  const lo = price.min || price.avg, hi = price.max || price.avg;
  return lo && hi && lo !== hi ? `${baht(lo)}–${num(hi)}` : baht(lo || hi);
}

function compsetSection(c, row) {
  if (!c) return `<section class="panel-section"><div class="section-heading">${heading('compare', 'ที่พักใกล้เคียงขนาดใกล้กัน')}</div><p class="hint">ที่พักนี้ไม่มีพิกัดจากแหล่ง จึงยังหาที่พักรอบ ๆ ไม่ได้</p></section>`;
  const rule = c.rule.min ? `ประเภทเดียวกัน ${num(c.rule.min)}–${num(c.rule.max)} ห้อง ในระยะตรง ${meters(c.radius)}` : `ประเภทเดียวกัน ไม่ทราบจำนวนห้องเหมือนกัน ในระยะตรง ${meters(c.radius)}`;
  const list = c.rows.length
    ? `<ul class="outlet-list compset">${c.rows.map(({row: r, m}) => `<li><button type="button" class="brand-row" data-action="select-hotel" data-id="${esc(r.id)}">${cueMarkup(r.series, {className: 'row-cue'})}<span class="row-text"><strong>${esc(r.name || r.nameEn)}</strong><span class="row-meta">${esc([meters(m), roomsText(r), r.brand?.name || '', r.price ? `${priceText(r.price)} ที่บันทึก` : ''].filter(Boolean).join(' · '))}</span></span></button></li>`).join('')}</ul>`
    : '<p class="hint">ไม่พบที่พักตามเงื่อนไขนี้</p>';
  return `<section class="panel-section"><div class="section-heading">${heading('compare', 'ที่พักใกล้เคียงขนาดใกล้กัน')}<span class="hint">${num(c.matches)} แห่ง</span></div>
    <p class="hint">${esc(rule)} · ใกล้ที่สุดก่อน · เป็นรายชื่อเริ่มต้นสำหรับเทียบ ไม่ใช่คู่แข่งที่ยืนยันแล้ว</p>${list}
    <p class="fact-line"><i class="fact-icon pictogram pic-hotel" aria-hidden="true"></i>รอบ ${esc(meters(c.radius))} มีที่พักทุกประเภท ${nw(`<strong class="data-number">${num(c.around.count)}</strong> แห่ง`)} ${nw(`${num(c.around.rooms)} ห้อง`)}${c.around.unknown ? ` · ${num(c.around.unknown)} แห่งไม่ทราบจำนวนห้อง` : ''}</p></section>`;
}

export function renderHotel(d, ctx = {}) {
  if (!d) return '';
  const r = d.row, w = d.words;
  const prov = provinceName(r.province);
  const coords = hasPoint(r) ? `${r.latitude.toFixed(6)}, ${r.longitude.toFixed(6)}` : '';
  const areaChip = d.area
    ? `<button type="button" class="fact-chip" data-action="select-area" data-id="${esc(d.area.id)}"><i class="pictogram pic-area" aria-hidden="true"></i>${esc(w.area)}${esc(d.area.name)} · ${esc(prov)}</button>`
    : r.province ? `<button type="button" class="fact-chip" data-action="select-province" data-id="${esc(r.province)}"><i class="pictogram pic-province" aria-hidden="true"></i>${esc(prov)} · ระบุได้แค่จังหวัด</button>` : '<span class="fact-chip is-quiet">ไม่ระบุจังหวัด</span>';
  const size = SIZE_BANDS.find(b => b.id === r.size);
  const roomsChip = `<span class="fact-chip"><i class="pictogram pic-rooms" aria-hidden="true"></i>${esc(roomsText(r))}${size ? ` · ${esc(size.short)}` : ''}</span>`;
  const priceChip = r.price ? `<span class="fact-chip" title="ราคาที่ CityMETER Hotel V3 บันทึก ไม่ทราบช่วงเวลา ไม่ใช่ราคาวันนี้"><i class="pictogram pic-price" aria-hidden="true"></i>${esc(priceText(r.price))} ที่บันทึก</span>` : '';
  const meetingChip = r.meeting ? `<span class="fact-chip" title="จำนวนห้องประชุมตามทะเบียนที่พัก ททท."><i class="pictogram pic-meeting" aria-hidden="true"></i>ห้องประชุม ${num(r.meeting)} ห้อง</span>` : '';
  const railChip = r.rail ? `<button type="button" class="fact-chip" data-action="select-station" data-id="${esc(r.rail.station.id)}" title="สถานีรถไฟฟ้าที่เปิดแล้วที่ใกล้ที่สุด (ระยะตรง)"><i class="pictogram pic-rail" aria-hidden="true"></i>${esc(stationName(r.rail.station))} · ${esc(meters(r.rail.m))}</button>` : '';
  const shopChip = r.shop ? `<a class="fact-chip" href="${esc(retailLink(r.shop.venue))}" target="_blank" rel="noopener" title="ศูนย์การค้าที่ใกล้ที่สุดในทะเบียน CityMETER (ระยะตรง) — เปิด CityMETER Shopping centers"><i class="pictogram pic-venue" aria-hidden="true"></i>${esc(r.shop.venue.name)} · ${esc(meters(r.shop.m))}</a>` : '';
  const chainChip = r.chain ? `<button type="button" class="fact-chip" data-action="filter-chain" data-value="${esc(r.chain.id)}" title="ดูทุกที่พักของเครือนี้"><i class="pictogram pic-chain" aria-hidden="true"></i>${esc(r.brand.name)}${r.chain.name !== r.brand.name ? ` · ${esc(r.chain.name)}` : ''}</button>` : r.brand ? `<span class="fact-chip"><i class="pictogram pic-chain" aria-hidden="true"></i>${esc(r.brand.name)}</span>` : '';
  const bd = d.building;
  const buildingChip = bd?.others ? `<button type="button" class="fact-chip" data-action="select-building" data-id="${esc(bd.key)}"><i class="pictogram pic-building" aria-hidden="true"></i>จุดตกในอาคารเดียวกับอีก ${num(bd.others)} แห่ง</button>` : '';
  const neighbours = r.inBuilding.length
    ? `<p class="fact-line"><i class="fact-icon pictogram pic-building" aria-hidden="true"></i>อาคารเดียวกันตามงานวิจัย: ${esc(summarizeIndustries(r.inBuilding))}</p>` : '';
  const sameChain = r.chain && d.sameChain.count ? `<p class="fact-line"><i class="fact-icon pictogram pic-chain" aria-hidden="true"></i>${esc(r.chain.name)} ในชุดข้อมูลอีก ${nw(`<button type="button" class="link-button" data-action="filter-chain" data-value="${esc(r.chain.id)}">${num(d.sameChain.count)} แห่ง</button>`)} ${nw(`${num(d.sameChain.rooms)} ห้อง`)} ใน ${num(d.sameChain.provinces)} จังหวัด</p>` : '';
  const construction = r.railNext && (!r.rail || r.railNext.m < r.rail.m) ? `<p class="hint">สถานีที่กำลังก่อสร้างใกล้ที่สุด: ${esc(stationName(r.railNext.station))} ${esc(meters(r.railNext.m))} — โครงการ ไม่ใช่บริการ</p>` : '';
  const point = coords
    ? `<span class="data-number">${esc(coords)}</span><br><span class="hint">${esc(r.coordRole || 'จุดจากแหล่งข้อมูล')}</span>`
    : '<span>แหล่งไม่มีพิกัด</span><br><span class="hint">จึงไม่มีหมุดบนแผนที่ ที่พักยังนับอยู่ในพื้นที่ตามที่แหล่งจัดไว้</span>';
  const price = r.price ? `ต่ำสุด ${baht(r.price.min || r.price.avg)} · สูงสุด ${baht(r.price.max || r.price.avg)}${r.price.avg ? ` · เฉลี่ย ${baht(r.price.avg)}` : ''} ต่อคืนตามที่ CityMETER Hotel V3 บันทึก<br><span class="hint">ไม่ทราบช่วงเวลาของราคา ไม่ใช่ราคาวันนี้ ADR หรือรายได้</span>` : '';
  return `<section class="detail-head store">
      <button type="button" class="btn quiet back" data-action="back">กลับ</button>
      <div class="identity"><span class="identity-cue">${cueMarkup(r.series)}</span><div>
        ${r.brand && logoMarkup(r.brand.id) ? `<p class="identity-logo">${logoMarkup(r.brand.id, {className: 'brand-logo panel-logo'})}<span class="sr-only">${esc(r.brand.name)}</span></p>` : ''}
        <p class="eyebrow eyebrow-cue">${esc(d.group?.th || '')}${r.rawType && r.rawType !== d.group?.th ? ` · ${esc(r.rawType)}` : ''}</p>
        <h2>${esc(r.name || r.nameEn || 'ไม่มีชื่อในแหล่งข้อมูล')}</h2>
        ${r.nameEn && r.nameEn !== r.name ? `<p class="branch-name">${esc(r.nameEn)}</p>` : ''}</div></div>
      <div class="fact-chips">${roomsChip}${chainChip}${areaChip}${priceChip}${meetingChip}${railChip}${shopChip}${buildingChip}${coords ? '' : '<span class="fact-chip is-quiet" title="แหล่งไม่มีพิกัด จึงไม่มีหมุดบนแผนที่">ไม่มีพิกัด</span>'}</div>
      ${construction}${neighbours}${sameChain}
      ${actionBar({kind: 'hotel', row: r, area: d.area ? {place: `${w.area}${d.area.name}`, province: prov} : r.province ? {place: '', province: prov} : null,
        point: hasPoint(r) ? {lat: r.latitude, lon: r.longitude, role: 'point'} : null})}
      <details class="source-details"><summary>แหล่ง พื้นที่ และพิกัด</summary>
        <dl class="facts">
          <dt>แหล่ง</dt><dd>${esc(r.source?.th || 'แหล่งทางการ')}${r.url ? ` · ${link(r.url, 'หน้าแหล่ง')}` : ''}</dd>
          <dt>พื้นที่</dt><dd>${esc(ADMIN_TH[r.admin] || '')}</dd>
          <dt>พิกัด</dt><dd>${point}</dd>
          ${price ? `<dt>ราคาที่บันทึก</dt><dd>${price}</dd>` : ''}
          <dt>อาคาร</dt><dd>${esc(MASS_TH[r.mass] || MASS_TH.not_checked)}</dd>
          ${r.collections.length ? `<dt>คอลเลกชัน</dt><dd>${esc(r.collections.join(' · '))}</dd>` : ''}
          <dt>รหัส</dt><dd><span class="hint data-number">${esc(r.id)}</span></dd>
        </dl>
        <p class="links">${d.area ? link(productionLink({province: r.province, area: r.area}), 'ดูพื้นที่นี้ใน CityMETER') : ''}</p>
      </details>
    </section>
    ${hasPoint(r) ? `<section class="panel-section terrain-section"><div class="section-heading">${heading('elevation', 'ภูมิประเทศรอบที่พัก')}</div>
      <div class="fact-chips terrain-chips" data-terrain-for="${esc(r.id)}"><span class="hint">กำลังอ่านภูมิประเทศ</span></div></section>` : ''}
    ${compsetSection(d.compset, r)}
    ${provenance(ctx, d.area ? `${w.area}${d.area.name} ${prov} (ขอบเขต CityMETER)` : prov || 'ไม่ระบุจังหวัด', {rail: Boolean(r.rail || r.railNext), retail: Boolean(r.shop), terrain: hasPoint(r)})}`;
}

/** Terrain chips (js/terrain.js#terrainChips) as fact chips; '' when nothing is known. */
export function terrainChipsHTML(chips) {
  return chips.map(c => `<span class="fact-chip" title="${esc(c.title)}"><i class="pictogram pic-${esc(c.kind)}" aria-hidden="true"></i>${esc(c.text)}</span>`).join('');
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
