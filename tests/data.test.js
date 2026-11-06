import test from 'node:test';
import assert from 'node:assert/strict';
import {load, readJSON, frameFiles, sha256} from './helpers.js';
import {hasPoint, filterRows, summarize, rowValue, unitWords, sizeOf, pinSizeOf, SIZE_BANDS} from '../js/model.js';
import {distanceM} from '../js/profile-model.js';

test('hotels.json decodes to every canonical row of 01_VENUES, nothing dropped, ids unique; the alias row stays out', () => {
  const {raw, data} = load();
  assert.equal(data.dropped, 0);
  assert.equal(data.rows.length, raw.meta.rows);
  assert.equal(data.rows.length, raw.meta.counts.rows);
  assert.equal(new Set(data.rows.map(r => r.id)).size, data.rows.length);
  assert.equal(raw.meta.counts['alias.excluded'], raw.meta.aliases.length);
  for (const a of raw.meta.aliases) assert.ok(!data.rows.some(r => r.id === a.venue), `alias ${a.venue} is not a row`);
  assert.match(raw.meta.exportSha256, /^[a-f0-9]{64}$/);
  assert.equal(raw.meta.registryId, 'research.TH.hotel');
  assert.match(raw.meta.checkedOn, /^\d{4}-\d{2}-\d{2}$/);
});

test('measure contract: rooms are the recorded rooms_selected, unknown stays unknown (never 0); records count once', () => {
  const {raw, data} = load();
  const known = data.rows.filter(r => r.rooms);
  assert.equal(known.length, raw.meta.counts['rooms.known']);
  assert.equal(known.reduce((s, r) => s + r.rooms, 0), raw.meta.counts['rooms.sum']);
  assert.ok(data.rows.every(r => r.rooms === null || (Number.isInteger(r.rooms) && r.rooms > 0)), 'no 0-room row: unknown is null');
  const s = summarize(data.rows);
  assert.equal(s.rooms, raw.meta.counts['rooms.sum']);
  assert.equal(s.roomsUnknown, data.rows.length - known.length);
  assert.equal(rowValue({rooms: null}, 'rooms'), 0, 'an unknown adds nothing to a room total');
  assert.equal(rowValue({rooms: null}, 'count'), 1);
  assert.deepEqual([unitWords('rooms').one, unitWords('count').one, unitWords('').one], ['ห้อง', 'แห่ง', 'ห้อง']);
  assert.equal(sizeOf(null), '');
  assert.deepEqual([19, 20, 99, 100, 300].map(sizeOf), ['s1', 's2', 's3', 's4', 's6']);
  assert.deepEqual([null, 49, 50, 199, 200].map(pinSizeOf), [0, 0, 1, 1, 2]);
  assert.equal(SIZE_BANDS.length, 6);
});

test('membership: a placed row sits in an existing production district of its own province; the rest stop at province or none', () => {
  const {raw, data, index} = load();
  const by = {};
  for (const r of data.rows) {
    by[r.admin] = (by[r.admin] || 0) + 1;
    if (r.area) {
      const a = index.byId.get(r.area);
      assert.ok(a, r.id);
      assert.equal(a.province, r.province, `${r.id} district in its own province`);
      assert.ok(['source', 'name', 'point'].includes(r.admin));
    } else assert.ok(['province', 'conflict', 'none'].includes(r.admin), r.id);
  }
  for (const k of ['source', 'name', 'point', 'province']) assert.equal(by[k] || 0, raw.meta.counts[`admin.${k}`] || 0, k);
  assert.equal(raw.meta.conflicts.length, by.conflict || 0);
});

test('points are the sheet’s selected points, inside Thailand, with their role; never invented', () => {
  const {raw, data} = load();
  const pts = data.rows.filter(hasPoint);
  assert.equal(pts.length, raw.meta.counts.points);
  assert.ok(pts.every(r => r.coordRole), 'every drawn point says what it is');
  assert.ok(data.rows.filter(r => !hasPoint(r)).every(r => r.latitude === null && r.longitude === null));
});

test('brands and groups join by id only; the group filters and “no group” partition the rows', () => {
  const {raw, data} = load();
  assert.ok(data.brands.every(b => b.chainRec === null || data.chains.includes(b.chainRec)), 'a brand links to a listed group or to none');
  assert.ok(data.rows.every(r => (r.chain === null) === (r.brand === null || r.brand.chainRec === null)));
  assert.equal(new Set(data.chains.map(c => c.id)).size, data.chains.length);
  assert.equal(data.rows.filter(r => r.brand).length, raw.meta.counts.brand);
  const none = filterRows(data.rows, {chain: 'none'}).length;
  const chained = data.chains.reduce((s, c) => s + filterRows(data.rows, {chain: c.id}).length, 0);
  assert.equal(none + chained, data.rows.length);
});

test('context from CityMETER Transit and Shopping centers: straight-line distances agree with the published points', () => {
  const {raw, data} = load();
  assert.match(raw.meta.context.rail.commit, /^[0-9a-f]{40}$/);
  assert.match(raw.meta.context.rail.sha256, /^[0-9a-f]{64}$/);
  assert.match(raw.meta.context.retail.commit, /^[0-9a-f]{40}$/);
  let checked = 0;
  for (const r of data.rows) {
    if (r.rail) {
      assert.ok(hasPoint(r) && r.rail.station.status === 'operating' && r.rail.m <= 2000, r.id);
      if (checked++ < 400) assert.ok(Math.abs(distanceM(r.latitude, r.longitude, r.rail.station.lat, r.rail.station.lon) - r.rail.m) <= 1.5, r.id);
    }
    if (r.railNext) assert.equal(r.railNext.station.status, 'construction');
    if (r.shop) { assert.ok(hasPoint(r) && r.shop.m <= 1500); assert.match(r.shop.venue.id, /^(SC-[0-9A-Z-]+|VN-[0-9a-f]{14})$/, 'a CityMETER Shopping centers venue id'); }
  }
  assert.ok(checked > 100);
});

test('publication hygiene: no phone, address, raw record or researcher text; links are https and never a private document', () => {
  const {raw} = load();
  for (const f of ['address', 'telephone', 'notes', 'source_record_id', 'README text']) assert.ok(raw.meta.excludedFields.includes(f), f);
  const text = JSON.stringify(raw);
  for (const k of ['phone', 'address', 'notes', 'star', 'latitude', 'longitude']) assert.ok(!Object.keys(raw.cols).includes(k), k);
  assert.ok(!/(docs|drive)\.google\.com/.test(text), 'no Google document link');
  assert.ok(!/google\.[a-z.]+\/maps|maps\.app\.goo\.gl/.test(text), 'no map links');
  assert.ok(!/landometer\.com\/api\//.test(raw.urls.join(' ')), 'no internal API link as a source link');
  assert.ok(raw.urls.every(u => /^https:\/\//.test(u)), 'source links are https');
  assert.ok(!/\b0\d{1,2}[- ]?\d{3}[- ]?\d{4}\b/.test(text), 'no telephone-like numbers');
  assert.ok(Object.values(raw.inBuilding).every(list => list.every(x => x.length === 2)), 'in-building: industry and brand only');
});

test('boundaries: 928 districts and 77 provinces from production; per-province frames match the index; receipts bound by hash', () => {
  const {index, indexJSON, provincesGeo} = load();
  assert.equal(index.areas.length, 928);
  assert.equal(index.provinces.length, 77);
  assert.equal(provincesGeo.features.length, 77);
  assert.ok(index.areas.every(a => a.km2 > 0 && Array.isArray(a.label) && Array.isArray(a.bbox)), 'production area, label and bbox for every district');
  const files = frameFiles();
  assert.equal(files.length, 77);
  let areas = 0;
  for (const f of files) {
    const code = f.replace('.json', ''), frame = readJSON(`data/frames/${f}`), p = index.provinceById.get(code);
    assert.ok(p, code);
    assert.equal(frame.areas.features.length, p.areaTotal, `${code} districts`);
    for (const ft of frame.areas.features) assert.equal(index.byId.get(String(ft.id ?? ft.properties.id))?.province, code);
    areas += frame.areas.features.length;
  }
  assert.equal(areas, 928);
  const receipts = readJSON('data/boundary-receipts.json');
  assert.equal(Object.keys(receipts.base).length, 78, 'the country list + 77 province base-info responses');
  assert.equal(indexJSON.metadata.receipts, 78);
  for (const r of Object.values(receipts.base)) {
    assert.match(r.sha256, /^[a-f0-9]{64}$/);
    assert.match(r.url, /^https:\/\/landometer\.com\/api\/v2\/citymeter-v3\/base\/info\//);
    assert.equal(r.status, 200);
  }
  const py = v => (Array.isArray(v) ? `[${v.map(py).join(', ')}]` : v && typeof v === 'object'
    ? `{${Object.keys(v).sort().map(k => `${JSON.stringify(k)}: ${py(v[k])}`).join(', ')}}` : JSON.stringify(v));
  assert.equal(sha256(Buffer.from(py(receipts.base))), receipts.baseSha256);
  assert.equal(indexJSON.metadata.receiptsSha256, receipts.baseSha256);
});

test('current name (owner 2026-11-02 “ทำไม novotel กะรน ใช้ logo Holiday Inn?”): a rebranded record reads under the name its brand lists, its own name kept and searchable', () => {
  const {raw, data} = load();
  const fold = s => ` ${String(s || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/&/g, ' and ').match(/[0-9a-z]+/g)?.join(' ') || ''} `;
  const shown = data.rows.filter(r => r.recorded);
  assert.equal(shown.length, raw.meta.counts['name.current']);
  assert.equal(shown.length, Object.keys(raw.currentNames).length);
  assert.equal(raw.meta.currentNames.rows, shown.length);
  for (const r of shown) {
    assert.ok(r.brand, `${r.id}: only a branded record`);
    const record = r.recorded.nameEn || r.recorded.name;
    assert.match(record, /[A-Za-z]/, `${r.id}: the record has a Latin name to compare`);
    assert.ok(![r.brand.name, ...(r.brand.labels || [])].some(l => fold(l).trim().length >= 2 && fold(record).includes(fold(l))), `${r.id}: the record's name carries no label of its brand`);
    assert.notEqual(fold(r.name), fold(record), `${r.id}: the listed name differs`);
    assert.match(r.nameSource.url, /^https:\/\//, `${r.id}: the listing is a public https page`);
    assert.match(r.nameSource.on, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(r.nameSource.on <= raw.meta.checkedOn, `${r.id}: listed on or before the check date`);
    assert.equal(r.nameEn, '', 'one name shown; the record names are kept apart');
  }
  const karon = data.rows.find(r => r.id === 'HOTEL-TAT-20160504143431473963');
  assert.equal(karon.name, 'Holiday Inn Resort Phuket Karon Beach');
  assert.deepEqual(karon.recorded, {name: 'โนโวเทล ภูเก็ต กะรน บีช รีสอร์ท แอนด์ สปา', nameEn: 'Novotel Phuket Karon Beach Resort and Spa'});
  assert.equal(karon.brand.name, 'Holiday Inn Resort');
  assert.match(karon.nameSource.url, /^https:\/\/www\.ihg\.com\//);
  assert.ok(filterRows(data.rows, {search: 'novotel phuket karon'}).includes(karon), 'the recorded name still finds it');
  assert.ok(filterRows(data.rows, {search: 'holiday inn resort phuket karon'}).includes(karon), 'the listed name finds it');
  assert.ok(filterRows(data.rows, {search: 'novotel karon'}).includes(karon), 'every word, in any place: the way people type a name');
  assert.ok(filterRows(data.rows, {search: 'โนโวเทล กะรน'}).includes(karon), 'Thai words separated by a space');
  assert.ok(filterRows(data.rows, {search: 'novotel karon'}).every(r => /novotel/i.test(r.haystack) && /karon/i.test(r.haystack)));
  assert.equal(filterRows(data.rows, {search: '   '}).length, data.rows.length, 'a blank search filters nothing');
  const naka = data.rows.find(r => r.id === 'HOTEL-TAT-20160413120525455474');
  assert.equal(naka.name, 'The Naka Island, a Luxury Collection Resort & Spa, Phuket', 'a listing in capitals reads in title case');
  // A record that carries its brand keeps its own name (Thai-only names are read as written).
  const hopInn = data.rows.find(r => r.brand?.name === 'HOP INN' && !/[A-Za-z]/.test(r.name) && !r.nameEn);
  assert.ok(hopInn && !hopInn.recorded);
  assert.ok(data.rows.filter(r => !r.recorded).every(r => !r.nameSource));
  assert.ok(!data.rows.some(r => /&amp;|&quot;/.test(`${r.name} ${r.nameEn}`)), 'source HTML entities read as characters');
});

test('site groups (owner 2026-11-03 “พี่เลือกโฉนดให้เลย มาสร้างขอบเขตอาคาร ร่วมกับ site layout ของโรงแรม/รีสอท”): a checked site publishes its buildings as points — no parcel, deed or note', () => {
  const {raw, data} = load();
  const meta = raw.meta.siteGroups, groups = Object.entries(raw.siteGroups);
  assert.equal(meta.tab, '49_SITE_BOUNDARY_CHECK');
  assert.equal(groups.length, meta.rows);
  assert.equal(groups.length, raw.meta.counts['site.groups']);
  assert.equal(groups.reduce((s, [, v]) => s + v.n, 0), meta.buildings);
  assert.ok(meta.file === null || /^[a-f0-9]{64}$/.test(meta.file.sha256), 'the live tab read is bound by its hash');
  for (const f of ['boundary_geojson', 'notes', 'main_building_note', 'checked_by']) assert.ok(raw.meta.excludedFields.includes(`49_SITE_BOUNDARY_CHECK.${f}`), f);
  const byId = new Map(data.rows.map(r => [r.id, r]));
  for (const [i, v] of groups) {
    const r = byId.get(raw.cols.key[Number(i)]);
    assert.deepEqual(Object.keys(v).sort(), ['n', 'on', 'pts', 'src', 'url'], 'points, count, date, source code and link only');
    assert.equal(v.n, v.pts.length);
    assert.equal(new Set(v.pts.map(p => p.join(','))).size, v.n, `${r.id}: one point per building`);
    assert.ok(meta.checkedOn.includes(v.on) && v.on <= raw.meta.checkedOn, `${r.id}: dated on or before the check`);
    assert.ok(v.src in meta.sources, `${r.id}: a known boundary source`);
    assert.ok(v.url === -1 || /^https:\/\//.test(raw.urls[v.url]), `${r.id}: the evidence is a public https page`);
    assert.ok(hasPoint(r), `${r.id}: only a stay with a point`);
    for (const [lon, lat] of v.pts) {
      assert.ok(Number.isFinite(lon) && Number.isFinite(lat) && Math.round(lon * 1e6) / 1e6 === lon && Math.round(lat * 1e6) / 1e6 === lat);
      assert.ok(distanceM(r.latitude, r.longitude, lat, lon) <= 600, `${r.id}: a site building within 600 m of the stay`);
    }
    assert.deepEqual(r.site.points, v.pts);
    assert.equal(r.site.source, meta.sources[v.src]);
  }
  assert.equal(data.rows.filter(r => r.site).length, groups.length, 'no other row carries a site');
  // The three pilots of the owner's request: the buildings inside each resort's site.
  const pilots = {'HOTEL-TAT-20160504143431473963': 20, 'HOTEL-TAT-20160428122116456581': 19, 'HOTEL-TAT-20160501120539473664': 21};
  for (const [id, n] of Object.entries(pilots)) assert.equal(byId.get(id).site?.n, n, id);
  assert.match(byId.get('HOTEL-TAT-20160428122116456581').site.url, /^https:\/\/theoldphuket\.com\//);
  // 0.3.7 (owner 2026-11-06 20:39 “approve”): eleven stays whose OpenStreetMap area was checked with their layout.
  const osm = {
    'HT-93bb06cb-d09d-4af6-ac33-435d2020346f': 26, 'HOTEL-TAT-20200930195143476289': 63, 'HOTEL-TAT-20201215151208694940': 6,
    'HOTEL-TAT-2014010111995': 26, 'HOTEL-TAT-20160107162547404922': 33, 'HT-27773b81-7842-4085-974a-e55d716eda62': 77,
    'HT-0c859087-ab21-4df7-abce-3b107f35b940': 33, 'HT-9570fb13-26b2-4cd6-8998-b3e32c67fc0c': 11,
    'HT-c007b5c2-46f8-4d08-89c6-31051a119c38': 32, 'HT-968e5362-a31c-4b2e-8c4f-547b51ae6d13': 33,
    'HT-7d03e9d8-01e7-4a61-8f27-88c4614d9c60': 14,
  };
  for (const [id, n] of Object.entries(osm)) {
    const r = byId.get(id);
    assert.equal(r.site?.n, n, id);
    assert.equal(r.site.source, 'กรอบ OpenStreetMap + ผังที่พัก', id);
    assert.deepEqual(r.site.credit, {text: '© OpenStreetMap contributors', url: 'https://www.openstreetmap.org/copyright'}, `${id}: the ODbL credit`);
  }
  assert.deepEqual(meta.credits['osm_polygon+site_layout'],
    {text: '© OpenStreetMap contributors', licence: 'ODbL 1.0', url: 'https://www.openstreetmap.org/copyright', note: 'the site follows an OpenStreetMap area of the stay'});
  for (const id of Object.keys(pilots)) assert.equal(byId.get(id).site.credit, null, `${id}: a parcel site carries no OSM credit`);
  assert.equal(data.rows.filter(r => r.site?.credit).length, groups.filter(([, v]) => v.src in meta.credits).length);
  // Nothing of the boundary, the deeds or the notes is published.
  const site = JSON.stringify([raw.siteGroups, meta]);
  assert.ok(!/geojson|Polygon|coordinates|โฉนด|ระวาง|เลขที่ดิน|ไร่/.test(site), 'no parcel shape, deed or sheet note');
  assert.ok(Object.values(raw.siteGroups).every(v => v.pts.flat().every(x => !Number.isInteger(x))), 'points only — no integer that could be a deed or parcel number');
  assert.ok(!Object.keys(raw).some(k => /parcel|deed|boundary/i.test(k)));
});
