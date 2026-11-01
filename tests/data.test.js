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
