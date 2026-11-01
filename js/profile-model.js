/**
 * Reading-panel view models. Pure: no DOM, no map.
 *
 * Every profile reads `scopeRows` (filters before any area selection) so ranks and comparisons keep the whole
 * selection as reference. A row is one accommodation record of the research master (01_VENUES); the default measure
 * is rooms recorded (Σ rooms_selected), the other is records (“แห่ง”). Brand and group links are the sheet's own
 * selected brand names joined to its brand register (17_BRANDS) by the build; nothing is joined by a hotel name.
 * Points are the sheet's selected points and are never upgraded; district membership is the matched production code
 * (row.admin says how).
 *
 * Distances (compset, station surroundings) are straight lines between reference points, computed here from the
 * published coordinates; they are not walking routes, travel times or catchments.
 */
import {mixOf, sizeMixOf, hasPoint, valueOf, rowValue, railShare} from './model.js';
import {summarizeAreas, byMetric, levelWords} from './areas.js';

const COLLATOR = new Intl.Collator('th');
/** Lists: most rooms first (unknown rooms last), then name — the recorded size is the order users scan by. */
export const listOrder = (a, b) => (b.rooms || 0) - (a.rooms || 0) || COLLATOR.compare(a.name, b.name) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

export function distanceM(lat1, lon1, lat2, lon2) {
  const R = 6371008.8, rad = Math.PI / 180;
  const p1 = lat1 * rad, p2 = lat2 * rad, dp = (lat2 - lat1) * rad, dl = (lon2 - lon1) * rad;
  const h = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Groups (chains) present in rows, most of the measure first (then the other measure, then name). */
export function chainsIn(rows, limit = 12, metric = 'rooms') {
  const m = new Map();
  for (const r of rows) if (r.chain) { const e = m.get(r.chain.id) || {chain: r.chain, count: 0, rooms: 0, brands: new Set()}; e.count++; e.rooms += r.rooms || 0; e.brands.add(r.brand.id); m.set(r.chain.id, e); }
  const key = metric === 'count' ? ['count', 'rooms'] : ['rooms', 'count'];
  return [...m.values()].map(e => ({...e, brands: e.brands.size, value: e[key[0]]}))
    .sort((a, b) => b[key[0]] - a[key[0]] || b[key[1]] - a[key[1]] || COLLATOR.compare(a.chain.name, b.chain.name)).slice(0, limit);
}

/** Records with a brand in the data, and their rooms. */
export function brandedOf(rows) {
  let count = 0, rooms = 0;
  for (const r of rows) if (r.brand) { count++; rooms += r.rooms || 0; }
  return {count, rooms};
}

/** Districts of a selection ranked by the measure (ties: the other measure, then name). */
export function rankAreas(rows, index, {province = '', metric = 'rooms'} = {}) {
  return summarizeAreas(rows, index, {province}).map(a => ({...a, value: valueOf(a, metric)})).sort(byMetric(metric));
}

/** Rows of the selection that no district holds, by reason (rows are never placed by name). */
export function unplacedOf(rows) {
  let noArea = 0, noProvince = 0, conflict = 0, rooms = 0;
  for (const r of rows) {
    if (r.area) continue;
    rooms += r.rooms || 0;
    if (r.admin === 'conflict') conflict++;
    else if (r.province) noArea++;
    else noProvince++;
  }
  return {noArea, noProvince, conflict, rooms, total: noArea + noProvince + conflict};
}

const sum = (rows, metric) => rows.reduce((s, r) => s + rowValue(r, metric), 0);

export function buildOverview(scopeRows, index, {province = '', groups = [], metric = 'rooms'} = {}) {
  return {ranking: rankAreas(scopeRows, index, {province, metric}), chains: chainsIn(scopeRows, 12, metric), branded: brandedOf(scopeRows), unplaced: unplacedOf(scopeRows),
    mix: mixOf(scopeRows, groups), sizes: sizeMixOf(scopeRows), count: scopeRows.length, rooms: sum(scopeRows, 'rooms'),
    roomsUnknown: scopeRows.filter(r => !r.rooms).length, rail: railShare(scopeRows, metric)};
}

/**
 * EVID-05 state of a selection: every district is in the national scope of the register, so a district with no
 * record is a measured zero of this dataset (“0 ที่พบ”), never no_data.
 */
const selectionState = count => (count ? 'measured' : 'measured_zero');

/**
 * Stations whose 500 m straight-line radius holds the most of the measure among `rows` (each row counted at its
 * nearest operating station only, so the list never adds a row twice).
 */
export function stationsOf(rows, metric = 'rooms', m = 500, limit = 6) {
  const by = new Map();
  for (const r of rows) {
    if (!r.rail || r.rail.m > m) continue;
    const s = r.rail.station, e = by.get(s.id) || {station: s, count: 0, rooms: 0, value: 0};
    e.count++; e.rooms += r.rooms || 0; e.value += rowValue(r, metric); by.set(s.id, e);
  }
  return [...by.values()].sort((a, b) => b.value - a.value || COLLATOR.compare(a.station.name, b.station.name)).slice(0, limit);
}

export function buildAreaProfile(scopeRows, areaId, index, groups, {metric = 'rooms'} = {}) {
  const area = index.byId.get(areaId);
  if (!area) return null;
  const ranking = rankAreas(scopeRows, index, {metric});
  const inProvince = ranking.filter(a => a.province === area.province);
  const mine = scopeRows.filter(r => r.area === areaId);
  const provincePlaced = scopeRows.filter(r => r.province === area.province && r.area);
  const pos = ranking.findIndex(a => a.id === areaId);
  const posProvince = inProvince.findIndex(a => a.id === areaId);
  const value = sum(mine, metric), provinceValue = sum(provincePlaced, metric);
  return {
    area, words: levelWords(area.province), metric, value, count: mine.length, rooms: sum(mine, 'rooms'), roomsUnknown: mine.filter(r => !r.rooms).length,
    km2: area.km2, coverageState: selectionState(mine.length), scopeCount: scopeRows.length,
    rank: pos >= 0 && value > 0 ? pos + 1 : null, rankOf: ranking.filter(a => a.value > 0).length,
    rankProvince: posProvince >= 0 && value > 0 ? posProvince + 1 : null, rankProvinceOf: inProvince.filter(a => a.value > 0).length,
    provinceValue, share: provinceValue ? (value / provinceValue) * 100 : null,
    points: mine.filter(hasPoint).length, ...mixOf(mine, groups), sizes: sizeMixOf(mine), chains: chainsIn(mine, 12, metric), branded: brandedOf(mine),
    rail: railShare(mine, metric), stations: stationsOf(mine, metric), meeting: mine.filter(r => r.meeting).length,
    rows: [...mine].sort(listOrder),
  };
}

/** Group (chain) card: its brands in the data, its records in the scope and where they are. */
export function buildChainProfile(chainId, {allRows, scopeRows, index, data, metric = 'rooms'}) {
  const chain = data.chains.find(c => c.id === chainId);
  if (!chain) return null;
  const all = allRows.filter(r => r.chain?.id === chainId);
  const inScope = scopeRows.filter(r => r.chain?.id === chainId);
  const brands = new Map();
  for (const r of inScope) { const e = brands.get(r.brand.id) || {brand: r.brand, count: 0, rooms: 0}; e.count++; e.rooms += r.rooms || 0; brands.set(r.brand.id, e); }
  return {chain, all: all.length, allRooms: sum(all, 'rooms'), scopeCount: inScope.length, scopeRooms: sum(inScope, 'rooms'),
    brands: [...brands.values()].sort((a, b) => b.rooms - a.rooms || b.count - a.count || COLLATOR.compare(a.brand.name, b.brand.name)),
    areas: rankAreas(inScope, index, {metric}), provinces: new Set(inScope.map(r => r.province).filter(Boolean)).size,
    points: inScope.filter(hasPoint).length, placed: inScope.filter(r => r.area).length, rail: railShare(inScope, metric),
    rows: [...inScope].sort(listOrder)};
}

/**
 * A building the map draws, with the rows whose points fall inside it (building-join.js):
 * sel = {key, kind: 'osm', rows, height}. Not a venue: no name.
 */
export function buildBuildingProfile(sel, index, groups) {
  if (!sel?.rows?.length) return null;
  const rows = [...sel.rows].sort(listOrder);
  const area = index.byId.get(rows[0].area) || null;
  const areaIds = [...new Set(rows.map(r => r.area))];
  return {key: sel.key, kind: sel.kind || 'osm', rows, count: rows.length, rooms: sum(rows, 'rooms'), roomsUnknown: rows.filter(r => !r.rooms).length,
    area, areaCount: areaIds.length, words: levelWords(rows[0].province), height: Number.isFinite(sel.height) ? sel.height : null,
    chains: chainsIn(rows, 6), ...mixOf(rows, groups)};
}

export const COMPSET_RADIUS_M = 2000;
export const COMPSET_LIMIT = 10;

/**
 * Nearby comparison set of a hotel (a screening aid, not an STR competitive set): records with a point within
 * COMPSET_RADIUS_M in a straight line, of the same accommodation group, whose known rooms are within half to double
 * the hotel's own (both known), nearest first. The supply around the hotel (every record within the radius, any group)
 * is stated beside it. Reads every row of the dataset (`allRows`), so the set does not move with the filters.
 */
export function compsetOf(row, allRows, {radius = COMPSET_RADIUS_M, limit = COMPSET_LIMIT} = {}) {
  if (!hasPoint(row)) return null;
  const dLat = radius / 110574, dLon = radius / (111320 * Math.cos((row.latitude * Math.PI) / 180));
  const near = [];
  let count = 0, rooms = 0, unknown = 0;
  for (const r of allRows) {
    if (r === row || !hasPoint(r)) continue;
    if (Math.abs(r.latitude - row.latitude) > dLat || Math.abs(r.longitude - row.longitude) > dLon) continue;
    const m = distanceM(row.latitude, row.longitude, r.latitude, r.longitude);
    if (m > radius) continue;
    count++; if (r.rooms) rooms += r.rooms; else unknown++;
    const sizeOK = row.rooms && r.rooms ? r.rooms >= row.rooms / 2 && r.rooms <= row.rooms * 2 : !row.rooms;
    if (r.group === row.group && sizeOK) near.push({row: r, m});
  }
  near.sort((a, b) => a.m - b.m || listOrder(a.row, b.row));
  return {radius, around: {count, rooms, unknown}, matches: near.length, rows: near.slice(0, limit),
    rule: row.rooms ? {group: row.group, min: Math.ceil(row.rooms / 2), max: row.rooms * 2} : {group: row.group, min: null, max: null}};
}

/** Hotel detail: the comparison set, the other hotels of its group (chain), and its rail / retail context. */
export function buildHotelDetail(row, {scopeRows, allRows, index, groups, building = null}) {
  if (!row) return null;
  const area = row.area ? index.byId.get(row.area) || null : null;
  const sameChain = row.chain ? allRows.filter(r => r.chain?.id === row.chain.id && r.id !== row.id) : [];
  const sameArea = row.area ? scopeRows.filter(r => r.area === row.area && r.id !== row.id) : [];
  return {row, area, words: levelWords(row.province), group: groups[row.group], building,
    compset: compsetOf(row, allRows),
    sameChain: {count: sameChain.length, rooms: sum(sameChain, 'rooms'), provinces: new Set(sameChain.map(r => r.province).filter(Boolean)).size},
    sameArea: {count: sameArea.length, rooms: sum(sameArea, 'rooms')}};
}

export const STATION_RADIUS_M = 500;

/**
 * A rail station of CityMETER · Transit and the records whose points lie within STATION_RADIUS_M of its reference
 * point (straight line; a record near two stations is listed at both — this view never adds stations together).
 */
export function buildStationProfile(station, {scopeRows, groups, radius = STATION_RADIUS_M, metric = 'rooms'}) {
  if (!station) return null;
  const rows = [];
  const dLat = radius / 110574, dLon = radius / (111320 * Math.cos((station.lat * Math.PI) / 180));
  for (const r of scopeRows) {
    if (!hasPoint(r) || Math.abs(r.latitude - station.lat) > dLat || Math.abs(r.longitude - station.lon) > dLon) continue;
    const m = distanceM(station.lat, station.lon, r.latitude, r.longitude);
    if (m <= radius) rows.push({row: r, m});
  }
  rows.sort((a, b) => listOrder(a.row, b.row));
  const list = rows.map(x => x.row);
  return {station, radius, metric, count: list.length, rooms: sum(list, 'rooms'), roomsUnknown: list.filter(r => !r.rooms).length,
    value: sum(list, metric), ...mixOf(list, groups), sizes: sizeMixOf(list), chains: chainsIn(list, 8, metric), rows: list, distance: new Map(rows.map(x => [x.row.id, x.m]))};
}
