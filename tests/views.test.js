import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from './helpers.js';
import {buildOverview, buildAreaProfile, buildHotelDetail, buildBuildingProfile, buildChainProfile, buildStationProfile, stationsOf, compsetOf, listOrder, unplacedOf, COMPSET_RADIUS_M} from '../js/profile-model.js';
import {renderOverview, renderArea, renderBuilding, renderHotel, renderStation, renderChainCard, renderFilterChips, provenance, pct, meters, summarizeIndustries} from '../js/panel.js';
import {summarizeAreaInsight, filterAreaRows} from '../js/area-insight.js';
import {summarize, productionLink, filterRows, unitWords, hasPoint, stationLink, retailLink} from '../js/model.js';
import {buildChartModel, areaMatrix, chainRanking} from '../js/chart-model.js';
import {buildBreadcrumb, renderBreadcrumb, breadcrumbText, productionHref} from '../js/breadcrumb.js';
import {CUES, CUE_PATHS, GROUP_SERIES, cueMarkup, seriesOf} from '../js/cues.js';
import {contextActions} from '../js/ask.js';

const text = html => html.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ');
const ctxFor = (data, index, metric = 'rooms', filtered = false) => ({meta: data.meta, unit: unitWords(metric), index, filtered});
const HOTEL = 'HT-1be94951-fa9a-4284-88b9-1dbf3411de54';

function views(metric = 'rooms') {
  const {data, index} = load();
  const rows = data.rows, ctx = ctxFor(data, index, metric);
  const insight = summarizeAreaInsight(rows, index, {metric});
  const hotel = rows.find(r => r.id === HOTEL);
  const asok = data.stations.find(s => s.name === 'อโศก');
  const accor = data.chains.find(c => c.name === 'Accor');
  return {
    overview: renderOverview({insight, summary: summarize(filterAreaRows(rows, new Set(insight.areaIds))), overview: buildOverview(rows, index, {groups: data.groups, metric}),
      focusMode: 'auto', provinces: [], unknownProvince: 0, province: '', stations: stationsOf(rows, metric), ctx}),
    area: renderArea(buildAreaProfile(rows, '1039', index, data.groups, {metric}), () => '#000', ctx),
    hotel: renderHotel(buildHotelDetail(hotel, {scopeRows: rows, allRows: rows, index, groups: data.groups}), ctx),
    station: renderStation(buildStationProfile(asok, {scopeRows: rows, groups: data.groups, metric}), ctx),
    building: renderBuilding(buildBuildingProfile({key: 'osm:1', kind: 'osm', rows: rows.filter(hasPoint).slice(0, 3), height: 24}, index, data.groups), ctx),
    chain: renderOverview({insight: summarizeAreaInsight(filterRows(rows, {chain: accor.id}), index, {metric}), summary: summarize(rows),
      overview: buildOverview(filterRows(rows, {chain: accor.id}), index, {groups: data.groups, metric}), focusMode: 'auto', province: '',
      chainCard: renderChainCard(buildChainProfile(accor.id, {allRows: rows, scopeRows: filterRows(rows, {chain: accor.id}), index, data, metric}), ctx), ctx}),
  };
}

test('every panel view ends with dataset · source · date · boundary and says what one counted unit is', () => {
  for (const metric of ['rooms', 'count']) {
    for (const [name, html] of Object.entries(views(metric))) {
      const t = text(html);
      assert.ok(t.includes('ชุดข้อมูล CityMETER Hotel'), `${name}: dataset`);
      assert.ok(t.includes('แหล่ง CityMETER Hotel V3 ทะเบียนที่พัก ททท. และหน้าทางการ'), `${name}: source`);
      assert.ok(t.includes('ตรวจ 25 ต.ค. 2569'), `${name}: date`);
      assert.ok(/ขอบเขต \S/.test(t), `${name}: boundary`);
      assert.ok(t.includes(metric === 'rooms' ? 'ห้อง = จำนวนห้องที่แหล่งบันทึก ไม่ใช่ห้องว่างต่อคืน' : 'แห่ง = ที่พักหนึ่งรายการตามแหล่ง ยังไม่ได้ตรวจว่ายังเปิดอยู่'), `${name}: unit (${metric})`);
      assert.equal((html.match(/class="hint panel-foot provenance"/g) || []).length, 1, `${name}: exactly one provenance line`);
      assert.ok(!/ตั้งอยู่ใน|ยอดขาย|ส่วนแบ่งตลาด|อัตราการเข้าพัก|ADR [0-9]|รายได้ [0-9]|ความหนาแน่น/.test(t.replace('ไม่ใช่ราคาวันนี้ ADR หรือรายได้', '')), `${name}: no located-inside, sales, share, occupancy, ADR, revenue or density claim`);
    }
  }
});

test('first screen (rooms): the Aha with numerator and denominator, the rail comparison with both bases, the outside finding', () => {
  const o = text(views().overview);
  assert.ok(o.includes('34% ของห้องพักในกรุงเทพมหานครที่ระบุเขตได้ อยู่ใน 3 เขตนี้'), o.slice(0, 300));
  assert.ok(o.includes('คลองเตย · ราชเทวี · วัฒนา') && o.includes('44,897 จาก 130,608 ห้อง'));
  assert.ok(o.includes('ห่างสถานีรถไฟฟ้าที่เปิดแล้วไม่เกิน 500 ม.: 65% ของห้องพักใน 3 เขตนี้ (19,577/30,071) · เขตอื่นของกรุงเทพมหานคร 38% (24,305/64,530)'));
  assert.ok(o.includes('นอกกรุงเทพมหานครมากที่สุด: อำเภอบางละมุง ชลบุรี 61,480 ห้อง — มากกว่าเขตใดในกรุงเทพมหานคร'));
  assert.ok(o.includes('100 แห่งไม่ทราบจำนวนห้อง') && o.includes('สัดส่วนใกล้รถไฟฟ้านับเฉพาะที่พักที่มีพิกัด'));
  assert.ok(o.includes('ไม่อยู่ในอันดับ ระบุได้แค่จังหวัด 35 แห่ง (380 ห้อง) — นับในยอดรวม'));
  assert.ok(o.includes('สถานีรถไฟฟ้าที่มีห้องพักรอบ 500 ม. มากที่สุด') && o.includes('สถานีนานา (สุขุมวิท) 76 แห่ง · 6,193 ห้อง'));
  assert.ok(o.includes('ที่พักที่ไม่ระบุแบรนด์ไม่ได้แปลว่าเป็นโรงแรมอิสระ'));
  const c = text(views('count').overview);
  assert.ok(c.includes('85% ของที่พักในภูเก็ตที่ระบุอำเภอได้ อยู่ใน 2 อำเภอนี้') && c.includes('1,886 จาก 2,222 แห่ง'));
  assert.ok(!c.includes('ห่างสถานีรถไฟฟ้าที่เปิดแล้วไม่เกิน 500 ม.:'), 'no rail line where nothing is near an operating station');
});

test('district, station, chain and hotel panels: ranks, shares, straight-line context and the comparison set', () => {
  const v = views();
  const a = text(v.area);
  assert.ok(a.includes('เขตวัฒนา') && a.includes('อันดับ 10 จาก 860 ทั่วประเทศ · 3 จาก 50 ในกรุงเทพมหานคร'), a.slice(0, 240));
  assert.ok(a.includes('11% = 13,865 จาก 130,608 ห้อง ในกรุงเทพมหานครที่ระบุเขตได้'));
  assert.ok(a.includes('ทะเบียน ททท. ระบุห้องประชุมใน 7 แห่ง'));
  assert.ok(!/ BWH Hotels 0 |The Ascott Limited \/ ASR 0 /.test(a), 'a group whose rooms are unknown never reads 0 rooms');
  const s = text(v.station);
  assert.ok(s.includes('สถานีอโศก') && s.includes('2,525 ห้อง') && s.includes('48 แห่ง') && s.includes('(ระยะตรง ไม่ใช่ระยะเดิน)'));
  const h = text(v.hotel);
  assert.ok(h.includes('378 ห้อง · 300+') && h.includes('Mercure · Accor') && h.includes('สถานีสนามกีฬาแห่งชาติ (สีลม) · 80 ม.'));
  assert.ok(h.includes('฿1,980–2,500 ที่บันทึก') && h.includes('ไม่ทราบช่วงเวลาของราคา ไม่ใช่ราคาวันนี้ ADR หรือรายได้'), 'a recorded price is labelled as recorded, period unknown');
  assert.ok(h.includes('ที่พักใกล้เคียงขนาดใกล้กัน 8 แห่ง') && h.includes('ประเภทเดียวกัน 189–756 ห้อง ในระยะตรง 2 กม.') && h.includes('ไม่ใช่คู่แข่งที่ยืนยันแล้ว'));
  assert.ok(h.includes('รอบ 2 กม. มีที่พักทุกประเภท 214 แห่ง 14,964 ห้อง · 21 แห่งไม่ทราบจำนวนห้อง'));
  assert.ok(h.includes('อาคารเดียวกันตามงานวิจัย: ร้านค้าปลีกอาหาร 1'));
  const ch = text(v.chain);
  assert.ok(ch.includes('Accor') && ch.includes('10,093 ห้อง') && ch.includes('ที่พักที่ไม่ระบุแบรนด์อาจเป็นของเครือนี้ก็ได้'));
  assert.ok(!/MGallery 0 /.test(ch), 'a brand whose rooms are unknown reads in records');
  assert.equal(summarizeIndustries([['ร้านอาหาร', ''], ['ฟิตเนส', 'Jetts'], ['ร้านอาหาร', '']]), 'ร้านอาหาร 2 · ฟิตเนส 1');
  assert.deepEqual([meters(84), meters(1291), meters(2000)], ['80 ม.', '1.3 กม.', '2 กม.']);
});

test('comparison set: same group, known rooms within ½–2×, straight line ≤ 2 km, nearest first; never itself; no point → none', () => {
  const {data} = load();
  const h = data.rows.find(r => r.id === HOTEL);
  const c = compsetOf(h, data.rows);
  assert.equal(c.radius, COMPSET_RADIUS_M);
  assert.deepEqual(c.rule, {group: h.group, min: 189, max: 756});
  assert.ok(c.rows.every(x => x.row !== h && x.row.group === h.group && x.row.rooms >= 189 && x.row.rooms <= 756 && x.m <= 2000));
  for (let i = 1; i < c.rows.length; i++) assert.ok(c.rows[i - 1].m <= c.rows[i].m);
  assert.equal(compsetOf({...h, latitude: null, longitude: null}, data.rows), null);
});

test('missing stays missing: no point, province only, unknown rooms — each says so, never 0 or a guessed place', () => {
  const {data, index} = load();
  const ctx = ctxFor(data, index);
  const noPoint = data.rows.find(r => !hasPoint(r) && r.area);
  const t = text(renderHotel(buildHotelDetail(noPoint, {scopeRows: data.rows, allRows: data.rows, index, groups: data.groups}), ctx));
  assert.ok(t.includes('ไม่มีพิกัด') && t.includes('ยังหาที่พักรอบ ๆ ไม่ได้'));
  const provinceOnly = data.rows.find(r => r.admin === 'province');
  assert.ok(text(renderHotel(buildHotelDetail(provinceOnly, {scopeRows: data.rows, allRows: data.rows, index, groups: data.groups}), ctx)).includes('ระบุได้แค่จังหวัด'));
  const unknown = data.rows.find(r => !r.rooms);
  assert.ok(text(renderHotel(buildHotelDetail(unknown, {scopeRows: data.rows, allRows: data.rows, index, groups: data.groups}), ctx)).includes('ไม่ทราบจำนวนห้อง'));
  const u = unplacedOf(data.rows);
  assert.deepEqual([u.noArea, u.noProvince, u.conflict], [35, 0, 0]);
  const empty = buildAreaProfile([], '1039', index, data.groups);
  assert.equal(empty.coverageState, 'measured_zero');
  assert.ok(text(renderArea(empty, () => '#000', ctx)).includes('ชุดข้อมูลนี้ไม่มีที่พักที่แหล่งจัดไว้ในพื้นที่นี้'));
});

test('charts: districts by the measure, district × group matrix with equal cells, hotel groups by the measure', () => {
  const {data, index} = load();
  const m = buildChartModel(data.rows, index, data.groups);
  assert.equal(m.areas.length, 20);
  assert.equal(m.totalAreas, 860);
  assert.equal(m.unplacedValue, 380, 'rooms of rows placed only at province level stay out of the district chart');
  for (let i = 1; i < m.areas.length; i++) assert.ok(m.areas[i - 1].value >= m.areas[i].value);
  const mx = areaMatrix(m);
  assert.equal(mx.cells.length, 12 * data.groups.length);
  for (const a of mx.areas) assert.equal(mx.cells.filter(c => c.areaId === a.id).reduce((s, c) => s + c.value, 0), a.value, 'cells add up to the district');
  const counts = buildChartModel(data.rows, index, data.groups, {metric: 'count'});
  assert.equal(counts.areas[0].name, 'เมืองภูเก็ต');
  // A cell whose records all have unknown rooms is unknown (no data, a dash), never a measured 0.
  const one = {id: 'u', area: '1001', province: 'BKK', rooms: null, group: 5, groupId: 'homestay'};
  const um = areaMatrix({areas: [{id: '1001', name: 'พระนคร', province: 'BKK', value: 0, rows: [one]}], groups: data.groups, metric: 'rooms'});
  assert.deepEqual(um.cells.filter(c => c.unknown).map(c => [c.groupId, c.count, c.value]), [['homestay', 1, 0]]);
  assert.equal(areaMatrix({areas: [{id: '1001', name: 'พระนคร', province: 'BKK', value: 1, rows: [one]}], groups: data.groups, metric: 'count'}).cells.filter(c => c.unknown).length, 0);
  const ch = chainRanking(data.rows);
  assert.equal(ch.total, 18);
  assert.deepEqual(ch.chains.slice(0, 3).map(c => [c.chain.name, c.rooms]), [['Accor', 10093], ['Marriott International', 8454], ['IHG Hotels & Resorts', 5989]]);
});

test('breadcrumb follows production: ประเทศไทย › จังหวัด › เขต/อำเภอ with /D/ deep links and the hotel dataset', () => {
  const {index} = load();
  const area = index.byId.get('1039');
  const crumbs = buildBreadcrumb({province: 'BKK', area});
  assert.equal(breadcrumbText(crumbs), 'ประเทศไทย › กรุงเทพมหานคร › เขตวัฒนา');
  assert.equal(crumbs.at(-1).current, true);
  assert.equal(crumbs[2].href, 'https://landometer.com/v3/citymeter/BKK/D/1039?d=hotel');
  assert.equal(productionHref(crumbs), 'https://landometer.com/v3/citymeter/BKK/D/1039?d=hotel');
  assert.ok(renderBreadcrumb(crumbs).includes('aria-current="location"'));
  assert.equal(breadcrumbText(buildBreadcrumb({area: index.byId.get('8301')})), 'ประเทศไทย › ภูเก็ต › อำเภอเมืองภูเก็ต');
  assert.equal(productionLink(), 'https://landometer.com/v3/citymeter?d=hotel');
  assert.equal(productionLink({province: 'PKT'}), 'https://landometer.com/v3/citymeter/PKT?d=hotel');
  assert.equal(stationLink({id: 'RAILCAT:BTS_SUKHUMVIT:E4'}), 'https://montri-th.github.io/transit/?station=RAILCAT%3ABTS_SUKHUMVIT%3AE4');
  assert.equal(retailLink({id: 'SC-000034'}), 'https://montri-th.github.io/shoppingcenter/?venue=SC-000034');
});

test('accommodation groups bind to LDS series by stable id with the series shape cue; no star (it would read as a rating)', () => {
  const {data} = load();
  assert.deepEqual(CUES, ['circle', 'square', 'triangle', 'diamond', 'cross', 'star', 'hexagon', 'ring', 'dash', 'plus']);
  assert.deepEqual(GROUP_SERIES, {hotel: 2, resort: 1, apartment: 3, guesthouse: 4, bungalow: 5, homestay: 10, other: 9});
  assert.ok(!Object.values(GROUP_SERIES).includes(6));
  assert.equal(new Set(Object.values(GROUP_SERIES)).size, 7, 'one series per group');
  for (const g of data.groups) assert.equal(g.series, seriesOf(g.id));
  for (const name of CUES) assert.ok(CUE_PATHS[name].startsWith('M'));
  assert.match(cueMarkup(2), /class="cue-shape category-2".*data-cue="square".*aria-hidden="true"/);
});

test('lists put the most recorded rooms first (unknown last), then name — deterministic', () => {
  const {data} = load();
  const rows = data.rows.filter(r => r.area === '1039').sort(listOrder);
  assert.deepEqual([...rows].reverse().sort(listOrder).map(r => r.id), rows.map(r => r.id), 'deterministic');
  for (let i = 1; i < rows.length; i++) assert.ok((rows[i - 1].rooms || 0) >= (rows[i].rooms || 0));
});

test('Google actions: public names and points only, https, the question of the view; Street View only with a point', () => {
  const {data} = load();
  const h = data.rows.find(r => r.id === HOTEL);
  const acts = contextActions({kind: 'hotel', row: h, area: {place: 'เขตปทุมวัน', province: 'กรุงเทพมหานคร'}, point: {lat: h.latitude, lon: h.longitude, role: 'point'}});
  assert.deepEqual(acts.map(a => a.id), ['ai', 'maps', 'streetview']);
  assert.ok(acts.every(a => a.href.startsWith('https://www.google.com/')));
  assert.ok(decodeURIComponent(acts[0].href).includes('ยังเปิดให้บริการอยู่ไหม'));
  assert.ok(!acts.some(a => a.href.includes(h.id)), 'no internal id leaves the page');
  assert.deepEqual(contextActions({kind: 'area', area: {place: 'เขตวัฒนา', province: 'กรุงเทพมหานคร'}}).map(a => a.id), ['ai', 'maps']);
  const st = contextActions({kind: 'station', station: {name: 'อโศก', lines: ['สุขุมวิท']}, point: {lat: 13.737, lon: 100.56, role: 'station'}});
  assert.equal(st.at(-1).label, 'Street View ใกล้สถานี');
});

test('filter chips escape user text, name the filters and offer one clear-all', () => {
  const html = renderFilterChips({search: '<b>ไอบิส</b>', group: 'resort', size: 's4', province: 'BKK', chain: 'none'},
    {group: {resort: 'รีสอร์ท'}, size: {s4: '100–199 ห้อง'}, province: {BKK: 'กรุงเทพมหานคร'}, chain: {}});
  assert.ok(!html.includes('<b>'));
  for (const w of ['รีสอร์ท', '100–199 ห้อง', 'กรุงเทพมหานคร', 'ไม่ระบุเครือ']) assert.ok(text(html).includes(w), w);
  assert.equal((html.match(/data-id="all"/g) || []).length, 1);
});

test('shares print whole percentages; a non-zero part never prints as 0%', () => {
  assert.equal(pct(44897, 130608), '34%');
  assert.equal(pct(1, 352), '<1%');
  assert.equal(pct(0, 10), '0%');
  assert.equal(pct(3, 0), '—');
  assert.ok(text(provenance({meta: {checkedOn: '2026-10-25', context: {rail: {asOf: '2026-10-31'}}}, unit: unitWords('rooms')}, 'x', {rail: true, roomsUnknown: 3})).includes('สถานีจาก CityMETER Transit ณ 31 ต.ค. 2569'));
});
