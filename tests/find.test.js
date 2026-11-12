/**
 * The search box of CityMETER · Hotel (0.8.0; owner 2026-11-12 12:05, VERBATIM: “ศึกษาแนวคิดเรื่อง Fuzzy search แล้ว
 * implement กับ demo web ให้ได้ user benefit สูงสุดตาม user intent ในขณะนั้น และตาม product statement”): the names
 * js/find.js gives js/shell/fuzzy.js, read from the shipped data, and what a name typed opens.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {load, ROOT} from './helpers.js';
import {createIndex, STEP} from '../js/shell/fuzzy.js';
import {SEARCH_KINDS, SEARCH_HEADS, SEARCH_HINT, searchEntries, searchNote} from '../js/find.js';
import {filterRows} from '../js/model.js';
import {translate, translateIn, registerDictionary} from '../js/shell/i18n.js';
import HOTEL_EN from '../js/lang-en.js';

let built = null;
function index() {
  if (!built) {
    const {data, index: areas} = load();
    const idx = createIndex({kinds: SEARCH_KINDS, heads: SEARCH_HEADS});
    idx.addAll(searchEntries({data, index: areas}));
    built = {idx, data, areas};
  }
  return built;
}
const top = (result, n = 5) => result.items.slice(0, n).map(i => `${i.entry.kind}:${i.entry.id}`);

test('every province, เขต/อำเภอ, station, group, brand, type and stay of the data can be found by name', () => {
  const {idx, data, areas} = index();
  const expected = areas.provinceById.size + areas.byId.size + data.stations.length + data.chains.length + data.brands.length + data.groups.length + data.rows.length;
  assert.ok(expected - idx.size >= 0 && expected - idx.size <= data.rows.filter(r => !r.name && !r.nameEn).length, `${idx.size} of ${expected} entries: only a stay without a name is left out`);
  // A stay is found by its own name, typed as written (the first screen of results).
  let missed = 0;
  const rows = data.rows.filter(r => r.name).filter((_, i) => i % 97 === 0);
  for (const r of rows) if (!idx.search(r.name).items.slice(0, 40).some(i => i.entry.kind === 'hotel' && i.entry.id === r.id)) missed++;
  assert.equal(missed, 0, `${rows.length} stays typed as written`);
});

test('a name typed opens the level that answers it: a place before a stay, one exact place chosen ahead', () => {
  const {idx} = index();
  let r = idx.search('วัฒนา');
  assert.deepEqual([top(r, 1)[0], r.preselect?.id], ['area:1039', '1039']);
  r = idx.search('จ.ภูเก็ต');
  assert.deepEqual([top(r, 1)[0], r.preselect?.kind, r.total], ['province:PKT', 'province', 1]);
  r = idx.search('หาดใหญ่ สงขลา');
  assert.deepEqual([top(r, 1)[0], r.items[0].step, r.preselect?.kind], ['area:9011', STEP.within, 'area']);
  r = idx.search('accor');
  assert.deepEqual([r.items[0].entry.kind, r.items[0].entry.name, r.preselect?.kind], ['chain', 'Accor', 'chain']);
  r = idx.search('novotel');
  assert.deepEqual([r.items[0].entry.kind, r.items[0].entry.name], ['brand', 'Novotel']);
  r = idx.search('รีสอร์ท');
  assert.equal(r.items[0].entry.kind, 'group', 'a type of stay is a filter');
  r = idx.search('สยาม');
  assert.ok(r.items.slice(0, 3).some(i => i.entry.kind === 'station'), 'a station by its name');
  assert.equal(r.preselect, null, 'two lines share the name: the reader says which');
  // Owner 2026-11-02 (“ทำไม novotel กะรน ใช้ logo Holiday Inn?”): the stay is still found by the name it was recorded under.
  r = idx.search('novotel karon');
  assert.ok(r.items.slice(0, 3).some(i => i.entry.kind === 'hotel' && /Holiday Inn Resort Phuket Karon Beach/.test(i.entry.name + i.entry.nameEn)), top(r).join(' '));
});

test('a name typed another way is still found, and a guess is said to be one', () => {
  const {idx} = index();
  let r = idx.search('เชียงใหม');
  assert.deepEqual([top(r, 1)[0], r.items[0].show], ['province:CMI', 'spelling']);
  r = idx.search('โนโวเทว');
  assert.ok(r.guessed && r.sure === 0 && r.total > 0 && r.items.every(i => i.show === 'near') && r.preselect === null);
  assert.ok(/โนโวเทล|Novotel/.test(r.items[0].entry.name + (r.items[0].entry.aka || []).join(' ')), r.items[0].entry.name);
  r = idx.search("g=up'.s,j");
  assert.deepEqual([r.layout, top(r, 1)[0], r.items[0].show], ['เชียงใหม่', 'province:CMI', 'near']);
  r = idx.search('ืนอนะำส');
  assert.deepEqual([r.layout, r.items[0].entry.name], ['novotel', 'Novotel']);
  assert.equal(idx.search('zzzzqq').total, 0);
});

test('the list says what an entry is and where; the page opens every kind it lists; the words filter as before', () => {
  const {idx, data, areas} = index();
  const note = entry => searchNote(entry, {index: areas, data});
  const of = (typed, kind) => idx.search(typed).items.find(i => i.entry.kind === kind).entry;
  assert.equal(note(of('ภูเก็ต', 'province')), 'จังหวัด');
  assert.equal(note(of('วัฒนา', 'area')), 'เขต · กรุงเทพมหานคร');
  assert.equal(note(of('หาดใหญ่', 'area')), 'อำเภอ · สงขลา');
  assert.match(note(of('สยาม', 'station')), /^สถานีรถไฟฟ้า · /);
  assert.equal(note(of('accor', 'chain')), 'เครือโรงแรม');
  assert.equal(note(of('novotel', 'brand')), 'แบรนด์ · Accor');
  assert.equal(note(of('รีสอร์ท', 'group')), 'ประเภทที่พัก');
  const stay = note(of('novotel karon', 'hotel'));
  assert.equal(stay.split(' · ').length, 3, stay);
  // No number and no caveat stands in a row; every part has English on an English page.
  for (const typed of ['วัฒนา', 'สยาม', 'novotel', 'รีสอร์ท', 'บางขุนนนท์']) for (const i of idx.search(typed).items.slice(0, 12)) {
    const line = note(i.entry);
    assert.ok(line && !/\d/.test(line.replace(/\(.+?\)/g, '')) && !/ไม่ใช่|อาจ|ยังไม่/.test(line), line);
  }
  registerDictionary(HOTEL_EN);
  for (const th of ['จังหวัด', 'เขต', 'อำเภอ', 'สถานีรถไฟฟ้า', 'กำลังสร้าง', 'เครือโรงแรม', 'ประเภทที่พัก', 'แบรนด์ / เครือ', SEARCH_HINT]) assert.ok(translate(th), th);
  // One entry, so the singular: a part of the row's line is read by where it stands.
  const part = {matches: selector => selector === '.find-where'};
  assert.deepEqual(['สถานีรถไฟฟ้า', 'เครือโรงแรม', 'แบรนด์', 'ประเภทที่พัก', 'จังหวัด'].map(th => translateIn(part, th)), ['Rail station', 'Hotel chain', 'Brand', 'Property type', 'Province']);
  const app = readFileSync(join(ROOT, 'js/app.js'), 'utf8');
  for (const k of SEARCH_KINDS) assert.ok(app.includes(`entry.kind === '${k.id}'`), `js/app.js opens a ${k.id}`);
  // The words still keep rows the way the box always did (js/model.js#filterRows).
  assert.ok(filterRows(data.rows, {search: 'novotel karon'}).length >= 1);
});
