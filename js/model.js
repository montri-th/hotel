/**
 * Dataset vocabulary, decoding, shared filter and summary helpers.
 *
 * Rows are the accommodation records of “CityMETER Hotel — Venue, Branch & Building Research Master 2026-10-24”
 * (data/hotels.json, built by scripts/build-data.py). One row = one row of the sheet's 01_VENUES: a source-listed
 * accommodation record (CityMETER Hotel V3, the TAT accommodation register, official group and property pages,
 * provincial lists). Nothing here merges, moves or mutates a row.
 *
 * Two measures (a contract, see DATA_METHOD.md §2):
 *   rooms (default) — Σ rooms_selected: the room count the sheet selected from its sources (“ห้อง”). Recorded stock,
 *                     not rooms available per night. A record with unknown rooms adds nothing to a room total and is
 *                     counted apart (“ไม่ทราบจำนวนห้อง”), never as zero.
 *   count           — accommodation records (“แห่ง”).
 * Recorded prices (CityMETER Hotel V3, THB) have an unknown source period: shown per hotel as recorded, never
 * summed, averaged across hotels or called a rate, an ADR or revenue.
 *
 * Area = the เขต/อำเภอ (DISTRICT) of CityMETER production the build matched for the row (row.admin: source · name ·
 * point · province · conflict · none). Points are the sheet's selected points (row.coordRole says what they are).
 */
import {seriesOf} from './cues.js';

/** Short labels for tight places (matrix columns); the full Thai label stays in titles, legends and lists. */
export const GROUP_SHORT = Object.freeze({
  hotel: 'โรงแรม', resort: 'รีสอร์ท', apartment: 'อพาร์ตเมนต์', guesthouse: 'เกสต์เฮาส์', bungalow: 'บังกะโล', homestay: 'โฮมสเตย์', other: 'อื่น ๆ',
});

/** Measures: `rooms` (default) and `count`. */
export const METRICS = Object.freeze({
  rooms: Object.freeze({id: 'rooms', one: 'ห้อง', label: 'ห้องพัก', subject: 'ห้องพัก', per: 'ห้อง'}),
  count: Object.freeze({id: 'count', one: 'แห่ง', label: 'ที่พัก', subject: 'ที่พัก', per: 'แห่ง'}),
});
export const metricOf = id => METRICS[id] || METRICS.rooms;
/** Unit words for a measure ('' = rooms). */
export const unitWords = (metric = '') => ({...metricOf(metric), mode: metricOf(metric).id});

/** Room-size bands of the record (rooms_selected); unknown rooms are in none. */
export const SIZE_BANDS = Object.freeze([
  Object.freeze({id: 's1', th: 'ไม่ถึง 20 ห้อง', short: '<20', min: 1, max: 19}),
  Object.freeze({id: 's2', th: '20–49 ห้อง', short: '20–49', min: 20, max: 49}),
  Object.freeze({id: 's3', th: '50–99 ห้อง', short: '50–99', min: 50, max: 99}),
  Object.freeze({id: 's4', th: '100–199 ห้อง', short: '100–199', min: 100, max: 199}),
  Object.freeze({id: 's5', th: '200–299 ห้อง', short: '200–299', min: 200, max: 299}),
  Object.freeze({id: 's6', th: '300 ห้องขึ้นไป', short: '300+', min: 300, max: Infinity}),
]);
export const sizeOf = rooms => (Number.isFinite(rooms) && rooms > 0 ? SIZE_BANDS.find(b => rooms >= b.min && rooms <= b.max)?.id || '' : '');
/**
 * Symbol size on the map (owner 2026-11-01: “โรงแรมจำนวนห้องมากน้อย … เท่ากันหมด”): the symbol's AREA grows with the
 * recorded rooms — radius = k(zoom) · √(rooms / 100), rooms capped at ROOMS_SIZE_CAP (above it the cap size), never
 * below PIN_MIN_RADIUS. A record with unknown rooms is drawn hollow at the 50-room size (EVID-05: never a measured 0).
 * PIN_SCALE gives k (px of radius for 100 rooms) by zoom; the legend and the HTML pins use the same numbers.
 */
export const PIN_SCALE = Object.freeze([[6, 0.9], [8, 1.3], [10, 2.0], [12, 3.2], [14, 4.8], [16, 5.8], [18, 6.4]]);
export const ROOMS_SIZE_CAP = 1500;
export const PIN_MIN_RADIUS = 1.6;
export const UNKNOWN_ROOMS_SIZE = 50;
export function pinK(zoom) {
  const s = PIN_SCALE;
  if (!(zoom > s[0][0])) return s[0][1];
  for (let i = 1; i < s.length; i++) if (zoom <= s[i][0]) return s[i - 1][1] + (s[i][1] - s[i - 1][1]) * (zoom - s[i - 1][0]) / (s[i][0] - s[i - 1][0]);
  return s.at(-1)[1];
}
/** Symbol radius in px for a row's rooms at a zoom (unknown rooms → the 50-room size, drawn hollow by the caller). */
export const pinRadius = (rooms, zoom) => {
  const n = Number.isFinite(rooms) && rooms > 0 ? Math.min(rooms, ROOMS_SIZE_CAP) : UNKNOWN_ROOMS_SIZE;
  return Math.max(PIN_MIN_RADIUS, pinK(zoom) * Math.sqrt(n / 100));
};
/**
 * The same size as a MapLibre expression of feature property `r` (rooms, 0 = unknown): min(cap, `factor` × radius)
 * + `add` px (zoom stays the top-level input, as MapLibre requires).
 */
export function pinSizeExpression(factor = 1, add = 0, cap = 1e6) {
  const at = k => ['+', add, ['min', cap, ['*', factor, ['max', PIN_MIN_RADIUS, ['*', k, ['sqrt', ['/', ['case', ['>', ['get', 'r'], 0], ['min', ['get', 'r'], ROOMS_SIZE_CAP], UNKNOWN_ROOMS_SIZE], 100]]]]]]];
  return ['interpolate', ['linear'], ['zoom'], ...PIN_SCALE.flatMap(([z, k]) => [z, at(k)])];
}
/** Size class kept for HTML pins and lists: 0 small (< 50 rooms or unknown), 1 medium (50–199), 2 large (≥ 200). */
export const pinSizeOf = rooms => (Number.isFinite(rooms) && rooms >= 200 ? 2 : Number.isFinite(rooms) && rooms >= 50 ? 1 : 0);

/**
 * Importance of a record for labels (owner 2026-11-01: “เน้นให้แสดงโรงแรมที่สำคัญก่อน คือราคาสูงและจำนวนห้องมากก่อน”):
 * the mean of its percentile among all records by recorded rooms and by recorded price (avg, else max, else min).
 * A record without a recorded price uses its rooms percentile only (a price is never guessed); without rooms, its
 * price percentile only; with neither, 0. Ranking only — never shown as a figure.
 */
export function importanceScores(rows) {
  const priceOf = r => r.price ? (r.price.avg || r.price.max || r.price.min || null) : null;
  const pct = values => {
    const sorted = values.filter(v => Number.isFinite(v)).sort((a, b) => a - b);
    const n = sorted.length;
    return v => {
      if (!Number.isFinite(v) || !n) return null;
      let lo = 0, hi = n;
      while (lo < hi) { const mid = (lo + hi) >> 1; if (sorted[mid] <= v) lo = mid + 1; else hi = mid; }
      return lo / n;  // share of records at or below v
    };
  };
  const roomsPct = pct(rows.map(r => r.rooms)), pricePct = pct(rows.map(priceOf));
  return rows.map(r => {
    const parts = [roomsPct(r.rooms), pricePct(priceOf(r))].filter(v => v !== null);
    return parts.length ? parts.reduce((a, b) => a + b, 0) / parts.length : 0;
  });
}

/** The value a row adds to a measure: its rooms (known only) or 1 record. */
export const rowValue = (r, metric = 'rooms') => (metric === 'count' ? 1 : (Number.isFinite(r?.rooms) && r.rooms > 0 ? r.rooms : 0));
/** The value of an aggregate ({count, rooms}) under a measure. */
export const valueOf = (a, metric = 'rooms') => (metric === 'count' ? a?.count || 0 : a?.rooms || 0);

/** Every province of the production base info, keyed by the production route code (/v3/citymeter/{code}). */
let PROVINCE_LIST = [];
export function setProvinces(list) { PROVINCE_LIST = Object.freeze((list || []).map(p => Object.freeze({code: p.id, dopa: p.code, th: p.name, en: p.nameEn}))); }
export const provinces = () => PROVINCE_LIST;
export const provinceByCode = code => PROVINCE_LIST.find(p => p.code === String(code || '').toUpperCase()) || null;
/** Accept a production code (BKK), a DOPA code (10) or an English/Thai name; returns the production code or ''. */
export const provinceCodeFrom = value => {
  const v = String(value || '').trim();
  const p = PROVINCE_LIST.find(x => x.code === v.toUpperCase() || x.dopa === v || x.en.toLowerCase() === v.toLowerCase() || x.th === v);
  return p ? p.code : '';
};

/** A usable coordinate inside Thailand's bounding box (never invented). */
export const hasPoint = r => Number.isFinite(r?.latitude) && Number.isFinite(r?.longitude) &&
  r.latitude >= 5 && r.latitude <= 21 && r.longitude >= 97 && r.longitude <= 106;

const lower = v => String(v || '').toLocaleLowerCase('th-TH');
const pos = v => (Number.isFinite(v) && v > 0 ? v : null);
/** Source names sometimes hold HTML entities (“Siam Society Hotel &amp; Resort”); the screen reads the character. */
const plain = v => String(v || '').replace(/&quot;/g, '"').replace(/&amp;/g, '&');

/** Label of the record's own name when the brand's listing names the stay differently (data.currentNames). */
export const RECORDED_NAME = 'ชื่อที่บันทึก';
/**
 * The line under a stay's name: the record's own name (ชื่อที่บันทึก) when the stay is shown under the name its brand
 * lists now, else its English name when that differs. '' when there is none.
 */
export const subName = r => (r?.recorded ? r.recorded.name || r.recorded.nameEn : r?.nameEn && r.nameEn !== r.name ? r.nameEn : '');

/**
 * Decode data/hotels.json into row objects plus dictionaries.
 * `index` is the area index (js/areas.js#buildAreaIndex): every placed district code must exist there.
 */
export function decodeDataset(json, index) {
  if (!json?.cols || !Array.isArray(json.cols.key)) throw new Error('Invalid hotel dataset');
  const c = json.cols, n = c.key.length, V = json.vocab || {};
  const groups = (json.groups || []).map((g, i) => ({...g, index: i, series: seriesOf(g.id), short: GROUP_SHORT[g.id] || g.th}));
  const chains = (json.chains || []).map((x, i) => ({...x, index: i}));
  const brands = (json.brands || []).map((b, i) => ({...b, index: i, chainRec: chains[b.chain] || null}));
  const sources = json.sources || [];
  const stations = (json.stations || []).map((s, i) => ({...s, index: i}));
  const retail = (json.retail || []).map((v, i) => ({...v, index: i}));
  const inBuilding = json.inBuilding || {}, collections = json.collections || {}, current = json.currentNames || {};
  const rows = [];
  let dropped = 0;
  for (let i = 0; i < n; i++) {
    const area = c.district[i] >= 0 ? json.districts[c.district[i]] : '';
    const province = c.province[i] >= 0 ? json.provinces[c.province[i]] : '';
    if (area && !index?.byId.has(area)) { dropped++; continue; }
    const group = groups[c.group[i]] || groups.at(-1);
    const brand = brands[c.brand[i]] || null;
    const rooms = pos(c.rooms[i]);
    const price = pos(c.pavg[i]) || pos(c.pmin[i]) || pos(c.pmax[i]) ? {min: pos(c.pmin[i]), max: pos(c.pmax[i]), avg: pos(c.pavg[i])} : null;
    const source = sources[c.src[i]] || {id: '', th: '', url: ''};
    const lat = c.lat[i], lon = c.lon[i];
    const row = {
      id: c.key[i], name: plain(c.name[i]), nameEn: plain(c.nameEn[i]), index: i,
      group: group.index, groupId: group.id, series: group.series, rawType: json.rawTypes?.[c.raw[i]] || '',
      rooms, size: sizeOf(rooms), price,
      brand, chain: brand?.chainRec || null,
      area, province, admin: V.admin?.[c.admin[i]] || 'none',
      longitude: Number.isFinite(lon) ? lon : null, latitude: Number.isFinite(lat) ? lat : null, coordRole: c.coord[i] >= 0 ? V.coord?.[c.coord[i]] || '' : '',
      source, url: c.url[i] >= 0 ? json.urls[c.url[i]] : '',
      meeting: c.meet[i] > 0 ? c.meet[i] : null, mass: V.mass?.[c.mass[i]] || 'not_checked',
      rail: c.rail[i] >= 0 ? {station: stations[c.rail[i]], m: c.railM[i]} : null,
      railNext: c.rail2[i] >= 0 ? {station: stations[c.rail2[i]], m: c.rail2M[i]} : null,
      shop: c.shop[i] >= 0 ? {venue: retail[c.shop[i]], m: c.shopM[i]} : null,
      inBuilding: inBuilding[String(i)] || [], collections: collections[String(i)] || [],
    };
    // The name the stay's brand lists now (owner 2026-11-02 “ทำไม novotel กะรน ใช้ logo Holiday Inn?”): the record keeps
    // its own names as the recorded name, shown under the heading and found by search.
    const now = current[String(i)];
    if (now?.[0]) {
      row.recorded = {name: row.name, nameEn: row.nameEn};
      row.name = now[0];
      row.nameEn = '';
      row.nameSource = {url: now[1] >= 0 ? json.urls?.[now[1]] || '' : '', on: now[2] || ''};
    }
    const a = area ? index.byId.get(area) : null;
    const p = province ? PROVINCE_LIST.find(x => x.code === province) : null;
    row.haystack = lower([row.name, row.nameEn, row.recorded?.name, row.recorded?.nameEn, brand?.name, row.chain?.name, a?.name, a?.nameEn, p?.th, p?.en, group.th, row.rawType].filter(Boolean).join(' '));
    rows.push(row);
  }
  const scores = importanceScores(rows);
  rows.forEach((r, i) => { r.importance = scores[i]; });
  return {meta: json.meta || {}, rows, groups, brands, chains, stations, retail, sources, dropped};
}

/**
 * Shared filter used by map, counters, charts, panel and table.
 * f = {search, group, size, province, chain}; chain 'none' = records with no hotel group in the data (no brand, or a
 * brand the brand register links to no group).
 * Area selection and area focus are applied by the caller (row scopes, see app.js).
 */
export function filterRows(rows, f = {}) {
  // Every word of the search, anywhere in the stay's names, brand, group, area or type (0.3.4: “novotel karon” finds
  // Novotel Phuket Karon Beach…); Thai written without spaces is one word, matched as before.
  const terms = lower(f.search).trim().split(/\s+/).filter(Boolean);
  return rows.filter(r => {
    if (f.group && r.groupId !== f.group) return false;
    if (f.size && r.size !== f.size) return false;
    if (f.province && r.province !== f.province) return false;
    if (f.chain === 'none' ? r.chain : f.chain && r.chain?.id !== f.chain) return false;
    return terms.every(t => r.haystack.includes(t));
  });
}

/** Totals for a selection: records, known rooms, records with unknown rooms, points, placement, chains. */
export function summarize(rows) {
  let points = 0, placed = 0, provinced = 0, rooms = 0, roomsUnknown = 0, branded = 0;
  const chains = new Set(), areas = new Set(), provinces = new Set();
  for (const r of rows) {
    if (hasPoint(r)) points++;
    if (r.area) { placed++; areas.add(r.area); }
    if (r.province) { provinced++; provinces.add(r.province); }
    if (r.rooms) rooms += r.rooms; else roomsUnknown++;
    if (r.brand) branded++;
    if (r.chain) chains.add(r.chain.id);
  }
  return {count: rows.length, rooms, roomsUnknown, points, placed, provinced, branded, chains: chains.size, areas: areas.size, provinces: provinces.size};
}

/** Records and rooms per group for a selection (every group listed, zero kept as a measured 0). */
export function mixOf(rows, groups) {
  const byGroup = groups.map(g => ({id: g.id, index: g.index, series: g.series, th: g.th, short: g.short, count: 0, rooms: 0}));
  for (const r of rows) { const g = byGroup[r.group]; g.count++; g.rooms += r.rooms || 0; }
  return {byGroup};
}

/** Records and rooms per room-size band (unknown rooms apart). */
export function sizeMixOf(rows) {
  const bands = SIZE_BANDS.map(b => ({...b, count: 0, rooms: 0}));
  let unknown = 0;
  for (const r of rows) {
    const b = r.size ? bands.find(x => x.id === r.size) : null;
    if (b) { b.count++; b.rooms += r.rooms; } else unknown++;
  }
  return {bands, unknown};
}

/** Share of the measure that lies within `m` metres (straight line) of an operating rail station; rows with a point only. */
export function railShare(rows, metric = 'rooms', m = 500) {
  let within = 0, base = 0, noPoint = 0;
  for (const r of rows) {
    const v = rowValue(r, metric);
    if (!hasPoint(r)) { noPoint += v; continue; }
    base += v;
    if (r.rail && r.rail.m <= m) within += v;
  }
  return {within, base, noPoint, share: base ? (within / base) * 100 : null};
}

export const safeURL = value => {
  try { const u = new URL(value); return u.protocol === 'https:' ? u.href : ''; }
  catch { return ''; }
};

/**
 * Production CityMETER deep links (route scheme observed in the production bundle, 2026-10-22). Production has a
 * hotel dataset (`?d=hotel`), so the link opens the same area with it.
 */
export const PRODUCTION = 'https://landometer.com/v3/citymeter';
export function productionLink({province = '', area = ''} = {}) {
  if (!province) return `${PRODUCTION}?d=hotel`;
  if (area) return `${PRODUCTION}/${province}/D/${area}?d=hotel`;
  return `${PRODUCTION}/${province}?d=hotel`;
}
/** CityMETER sibling demos linked by registry id. */
export const TRANSIT_SITE = 'https://montri-th.github.io/transit/';
export const SHOPPING_SITE = 'https://montri-th.github.io/shoppingcenter/';
export const stationLink = s => (s?.id ? `${TRANSIT_SITE}?station=${encodeURIComponent(s.id)}` : '');
export const retailLink = v => (v?.id ? `${SHOPPING_SITE}?venue=${encodeURIComponent(v.id)}` : '');
