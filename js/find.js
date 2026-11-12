/**
 * What the search box of CityMETER · Hotel knows by name: the entries js/shell/fuzzy.js matches and js/shell/search.js
 * lists (release 0.8.0; owner 2026-11-12 12:05, VERBATIM: “ศึกษาแนวคิดเรื่อง Fuzzy search แล้ว implement กับ demo web
 * ให้ได้ user benefit สูงสุดตาม user intent ในขณะนั้น และตาม product statement”).
 *
 * The product statement asks “เขตไหน ห้องเท่าไร ใกล้อะไร เทียบกับใคร” in one screen. So a name typed here opens the
 * level that answers it: a province or a district (the rooms there), a rail station (the stays around it), a hotel
 * group, a brand or a type (where it is), or one stay (its profile and its comparison set). The order below is the
 * order among equal matches: places first, as the statement reads an area before a stay.
 *
 * Pure: entries from the decoded dataset; no DOM, no numbers shown (a row names what it is and where).
 */
import {areaWord} from './areas.js';
import {provinces} from './model.js';
import {PROVINCE_AKA, withoutMueang} from './shell/fuzzy.js';

export const SEARCH_KINDS = Object.freeze([
  {id: 'province', level: 'province', auto: true}, {id: 'area', level: 'district', auto: true}, {id: 'station', level: 'station', auto: true},
  {id: 'chain', auto: true}, {id: 'brand', auto: true}, {id: 'group', auto: true}, {id: 'hotel'},
]);
/** Words a stay's name may begin with, or carry, that people add or leave out; an array is one word written several ways. */
export const SEARCH_HEADS = Object.freeze([['โรงแรม', 'รร.'], ['รีสอร์ท', 'รีสอร์ต'], ['โฮเทล', 'โฮเต็ล', 'โฮเท็ล'], 'เดอะ', 'hotel', 'the', 'resort']);

/** What to try when nothing is found: the kinds of name this demo knows. */
export const SEARCH_HINT = 'ลองชื่อที่พัก แบรนด์ เครือ สถานี เขต/อำเภอ หรือจังหวัด';

/** Every entry, the few places and filters first, then the stays. */
export function* searchEntries({data, index}) {
  const byCode = new Map(provinces().map(p => [p.code, p]));
  for (const p of provinces()) yield {id: p.code, kind: 'province', name: p.th, nameEn: p.en, aka: PROVINCE_AKA[p.th], codes: [p.code, p.dopa], province: p.code};
  const places = new Map();
  for (const a of index.byId.values()) {
    const p = byCode.get(a.province);
    places.set(a.id, [a.name, a.nameEn, p?.th, p?.en]);
    yield {id: a.id, kind: 'area', name: a.name, nameEn: a.nameEn, also: withoutMueang(a.name), codes: [a.id], within: [p?.th, p?.en], province: a.province, area: a.id};
  }
  for (const s of data.stations) yield {id: s.id, kind: 'station', name: s.name, nameEn: s.nameEn, station: s};
  for (const c of data.chains) yield {id: c.id, kind: 'chain', name: c.name};
  for (const b of data.brands) yield {id: b.id, kind: 'brand', name: b.name, aka: b.labels, brand: b};
  for (const g of data.groups) yield {id: g.id, kind: 'group', name: g.th, nameEn: g.en};
  const provinceOnly = new Map();
  for (const r of data.rows) {
    let within = r.area ? places.get(r.area) : provinceOnly.get(r.province);
    if (!within) { const p = byCode.get(r.province); within = [p?.th, p?.en]; provinceOnly.set(r.province, within); }
    yield {id: r.id, kind: 'hotel', name: r.name, nameEn: r.nameEn, aka: r.recorded ? [r.recorded.name, r.recorded.nameEn] : undefined, within, province: r.province, area: r.area, weight: r.rooms || 0, row: r};
  }
}

/** The line under a name in the list: what it is and where. Thai; an English page translates it part by part. */
export function searchNote(entry, {index, data}) {
  const province = code => provinces().find(p => p.code === code)?.th || '';
  if (entry.kind === 'province') return 'จังหวัด';
  if (entry.kind === 'area') return [areaWord(entry.province), province(entry.province)].filter(Boolean).join(' · ');
  // A station reads as the head of its own panel does: the word, its lines, “กำลังสร้าง” while it is being built.
  if (entry.kind === 'station') return ['สถานีรถไฟฟ้า', ...(entry.station.lines || []), entry.station.status === 'construction' ? 'กำลังสร้าง' : ''].filter(Boolean).join(' · ');
  if (entry.kind === 'chain') return 'เครือโรงแรม';
  if (entry.kind === 'brand') return ['แบรนด์', entry.brand.chainRec?.name].filter(Boolean).join(' · ');
  if (entry.kind === 'group') return 'ประเภทที่พัก';
  const r = entry.row, a = r.area ? index.byId.get(r.area) : null;
  return [data.groups[r.group]?.short, a?.name, province(r.province)].filter(Boolean).join(' · ');
}
