import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from './helpers.js';
import {summarizeAreaInsight, filterAreaRows, RAIL_M} from '../js/area-insight.js';
import {levelWords, areaLabel} from '../js/areas.js';
import {filterRows} from '../js/model.js';
import {buildAreaModel} from '../js/map-layers.js';
import {buildProvinceModel} from '../js/provinces.js';
import {SUPPLY_SCALE, COUNT_SCALE} from '../js/scales.js';

test('first Aha (snapshot fixture, rooms): the three เขต with the most recorded rooms in the province holding the most rooms placed at district level', () => {
  const {data, index} = load();
  const a = summarizeAreaInsight(data.rows, index);
  assert.equal(a.metric, 'rooms');
  assert.equal(a.home, 'BKK');
  assert.deepEqual(a.areas.map(x => [x.id, x.name, x.value]), [['1033', 'คลองเตย', 16886], ['1037', 'ราชเทวี', 14146], ['1039', 'วัฒนา', 13865]]);
  assert.deepEqual([a.value, a.homePlacedValue, Math.round(a.share)], [44897, 130608, 34]);
  assert.deepEqual([a.count, a.homePlaced, a.homeUnplacedValue, a.homeRoomsUnknown], [490, 1581, 0, 100]);
  // Rail (CityMETER · Transit): within 500 m of an operating station, rows with a point only; both bases stated.
  assert.equal(RAIL_M, 500);
  assert.deepEqual([a.rail.focus.within, a.rail.focus.base, a.rail.focus.noPoint], [19577, 30071, 14826]);
  assert.deepEqual([a.rail.rest.within, a.rail.rest.base, a.rail.rest.noPoint], [24305, 64530, 21181]);
  assert.equal(a.rail.focus.base + a.rail.focus.noPoint, a.value, 'rooms with and without a point add up to the focus');
  // The district with the most rooms outside Bangkok holds more than any Bangkok district.
  assert.deepEqual([a.outside.id, a.outside.name, a.outside.province, a.outside.value], ['2004', 'บางละมุง', 'CBI', 61480]);
  assert.ok(a.outside.value > a.areas[0].value);
  assert.deepEqual(filterAreaRows(data.rows, new Set(a.areaIds)).length, a.count);
});

test('records Aha: the focus is never every district holding the measure (Phuket has three: its top two are the focus)', () => {
  const {data, index} = load();
  const c = summarizeAreaInsight(data.rows, index, {metric: 'count'});
  assert.equal(c.home, 'PKT');
  assert.deepEqual(c.areas.map(x => [x.name, x.value]), [['เมืองภูเก็ต', 1024], ['กะทู้', 862]]);
  assert.deepEqual([c.value, c.homePlacedValue], [1886, 2222]);
  assert.equal(c.homeAreaIds.length, 3);
  assert.deepEqual([c.outside.name, c.outside.value], ['เมืองเชียงใหม่', 870]);
  assert.deepEqual([c.rail.focus.within, c.rail.rest.within], [0, 0], 'no operating station in Phuket: the panel hides the rail line');
});

test('the focus never cuts through a tie; a province where every district holds the same value is “spread”', () => {
  const {index} = load();
  const row = (area, rooms, i) => ({id: `t${area}-${i}`, area, province: index.byId.get(area).province, rooms, latitude: null, longitude: null});
  // Bangkok: 1033 (40), then 1037 and 1039 tied (20) above 1001 (10): only the district above the tie is the focus.
  const tie = [row('1033', 40, 1), row('1037', 20, 1), row('1039', 20, 1), row('1001', 10, 1)];
  assert.deepEqual(summarizeAreaInsight(tie, index).areas.map(a => a.id), ['1033', '1037', '1039'], 'the cut after three is above the tie');
  const tie4 = [...tie, row('1002', 20, 1)];
  assert.deepEqual(summarizeAreaInsight(tie4, index).areas.map(a => a.id), ['1033'], 'three districts tied at 20: only 1033 is above them');
  const spread = [row('1033', 5, 1), row('1037', 5, 1), row('1039', 5, 1), row('1001', 5, 1)];
  const s = summarizeAreaInsight(spread, index);
  assert.deepEqual(s.areas, []);
  assert.deepEqual(s.spread, {areas: 4, value: 5});
});

test('the Aha follows the filters: a province, a group, nothing', () => {
  const {data, index} = load();
  const cmi = summarizeAreaInsight(filterRows(data.rows, {province: 'CMI'}), index);
  assert.equal(cmi.home, 'CMI');
  assert.equal(cmi.areas[0].name, 'เมืองเชียงใหม่');
  assert.equal(cmi.outside, null, 'a one-province selection has no outside finding');
  const resorts = summarizeAreaInsight(filterRows(data.rows, {group: 'resort'}), index);
  assert.ok(resorts.areas.length > 0 && resorts.home !== '');
  const none = summarizeAreaInsight([], index);
  assert.deepEqual([none.areas.length, none.share, none.home], [0, 0, '']);
});

test('district model: EVID-05 — an empty district is a measured zero; records with no known rooms are no data for rooms, never 0', () => {
  const {data, index} = load();
  const rooms = buildAreaModel(data.rows, index);
  assert.equal(rooms.areas.length, 928);
  assert.equal(rooms.zeroCount, 68, '860 districts hold at least one record');
  assert.equal(rooms.ramp.scaleId, SUPPLY_SCALE.scaleId);
  assert.deepEqual([rooms.ramp.min, rooms.ramp.max, rooms.ramp.steps], [4, 61480, 41]);
  assert.equal(rooms.byId.get('2004').fill, SUPPLY_SCALE.lut[40], 'บางละมุง (the national maximum) closes the ramp on sample 40');
  assert.ok(rooms.areas.filter(a => a.state === 'measured_zero').every(a => a.count === 0));
  const count = buildAreaModel(data.rows, index, {metric: 'count'});
  assert.equal(count.ramp.scaleId, COUNT_SCALE.scaleId);
  assert.equal(count.zeroCount, 68);
  // A district whose records all have unknown rooms: no_data under rooms, a measured value under records.
  const unknown = [{id: 'u1', area: '1001', province: 'BKK', rooms: null}, {id: 'k1', area: '1033', province: 'BKK', rooms: 120}];
  assert.equal(buildAreaModel(unknown, index, {province: 'BKK'}).byId.get('1001').state, 'no_data');
  assert.equal(buildAreaModel(unknown, index, {province: 'BKK', metric: 'count'}).byId.get('1001').state, 'measured');
});

test('province frames total the measure per province; rows without a province are on no frame', () => {
  const {data, provincesGeo} = load();
  const m = buildProvinceModel(data.rows, provincesGeo);
  assert.equal(m.provinces.length, 77);
  const by = new Map();
  for (const r of data.rows) if (r.province) by.set(r.province, (by.get(r.province) || 0) + (r.rooms || 0));
  for (const p of m.provinces) assert.equal(p.value, by.get(p.code) || 0, p.code);
  assert.equal(m.provinces.find(p => p.code === 'BKK').fill, SUPPLY_SCALE.lut[40], 'Bangkok closes the province ramp');
  assert.equal(m.zeroCount, 0, 'every province holds a record');
  const none = buildProvinceModel([], provincesGeo);
  assert.ok(none.provinces.every(p => p.state === 'measured_zero'));
});

test('level words follow the province: เขต in Bangkok, อำเภอ elsewhere', () => {
  const {index} = load();
  assert.deepEqual(levelWords('BKK'), {area: 'เขต'});
  assert.deepEqual(levelWords('PKT'), {area: 'อำเภอ'});
  assert.equal(areaLabel(index.byId.get('1039')), 'เขตวัฒนา');
  assert.equal(areaLabel(index.byId.get('8301')), 'อำเภอเมืองภูเก็ต');
});
