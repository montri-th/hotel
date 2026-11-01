import test from 'node:test';
import assert from 'node:assert/strict';
import {rankLabelCandidates, shortName, labelParts, centreCandidates, placeLabels, LABEL_MIN_ZOOM, LABEL_MAX} from '../js/labels.js';

// Owner 2026-11-01 (point 5): names near the middle of the view, most important first (rooms + recorded price),
// short (icons before words), never covering the chrome or each other.
test('labels: importance first, then nearness to the centre; stable', () => {
  const c = [{row: {id: 'b', importance: 0.5}, d: 0.1}, {row: {id: 'a', importance: 0.9}, d: 0.9}, {row: {id: 'c', importance: 0.5}, d: 0.05}];
  assert.deepEqual(rankLabelCandidates(c).map(x => x.row.id), ['a', 'c', 'b']);
  assert.ok(LABEL_MIN_ZOOM >= 12 && LABEL_MAX.phone < LABEL_MAX.desktop);
});

test('short names drop what the map already says: type words, the place, generic endings, the logo brand', () => {
  const P = ['ภูเก็ต', 'Phuket'];
  assert.equal(shortName({name: 'โรงแรมภูเก็ต เกรซแลนด์ รีสอร์ท แอนด์ สปา', nameEn: 'Phuket Graceland Resort and Spa'}, {places: P}), 'เกรซแลนด์');
  assert.equal(shortName({name: 'ดับเบิ้ลทรี', nameEn: 'DoubleTree by Hilton Phuket Banthai Resort', brand: {name: 'DoubleTree by Hilton'}}, {hasLogo: true, places: P}), 'Banthai Resort');
  assert.equal(shortName({name: 'ดิ เอม โฮเทล', nameEn: ''}, {places: P}), 'ดิ เอม');
  assert.equal(shortName({name: 'โรงแรม', nameEn: ''}, {places: P}), 'โรงแรม', 'never shorter than 3 characters: the full name stays');
  assert.equal(shortName({name: 'บ้านสวน', nameEn: 'Baan Suan'}, {hasLogo: false}), 'บ้านสวน', 'without a logo the Thai name reads');
});

test('candidates come from the central ellipse only; placement avoids blockers and other labels and respects the cap', () => {
  const rows = Array.from({length: 30}, (_, i) => ({id: `h${i}`, longitude: i, latitude: 0, importance: 1 - i / 30}));
  const box = {left: 0, right: 1000, top: 0, bottom: 600};
  const project = ([x]) => ({x: 100 + x * 30, y: 300});
  const cands = centreCandidates(rows, project, box, {skip: 'h3'});
  assert.ok(cands.every(c => Math.abs(c.x - 500) <= 360) && !cands.some(c => c.row.id === 'h3'));
  const blockers = [{left: 380, right: 520, top: 0, bottom: 600}];
  const placed = placeLabels(rankLabelCandidates(cands), () => ({w: 80, h: 20}), () => 5, box, {max: 4, blockers});
  assert.ok(placed.length <= 4);
  const overlaps = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
  for (const p of placed) assert.ok(!blockers.some(b => overlaps(p.box, b)), 'never on the chrome');
  for (let i = 0; i < placed.length; i++) for (let j = i + 1; j < placed.length; j++) assert.ok(!overlaps(placed[i].box, placed[j].box), 'never on another label');
});

test('label text: a branded stay reads brand + site as text (logos are too small for a label); others one short name', () => {
  // Owner 2026-11-01: “ป้าย logo เล็กไปก็มองไม่ออก … หาแบบที่ user อ่านง่าย เห็นเข้าใจเร็ว”.
  const P = ['ภูเก็ต', 'Phuket'];
  assert.deepEqual(labelParts({name: 'Grand Mercure Phuket Patong', nameEn: '', rooms: 314, brand: {name: 'Grand Mercure'}}, {places: P}), {brand: 'Grand Mercure', site: 'Patong', rooms: 314});
  assert.deepEqual(labelParts({name: 'Holiday Inn Resort', nameEn: '', rooms: null, brand: {name: 'Holiday Inn Resort'}}, {places: P}), {brand: 'Holiday Inn Resort', site: '', rooms: null}, 'no site line when it would repeat the brand; unknown rooms → no number');
  assert.deepEqual(labelParts({name: 'โรงแรมภูเก็ต เกรซแลนด์ รีสอร์ท แอนด์ สปา', nameEn: 'Phuket Graceland Resort and Spa', rooms: 600, brand: null}, {places: P}), {brand: '', site: 'เกรซแลนด์', rooms: 600});
});
