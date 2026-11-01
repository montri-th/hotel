import test from 'node:test';
import assert from 'node:assert/strict';
import {terrarium, factsFrom, terrainChips, TERRAIN, hillshadePaint, POSITION_STEP_M, SEA_RINGS} from '../js/terrain.js';
import {gateExpression, FILL_MAX_ZOOM} from '../js/map-layers.js';

// Owner 2026-11-01 (point 2): show whether a stay sits by the sea, on a hill, in a valley or among trees — facts of
// the ground only (never a view, a price or a risk), switched on at hilly sites.
test('terrarium decoding and the facts of the ground', () => {
  assert.equal(terrarium(128, 0, 0), 0);
  assert.equal(terrarium(129, 44, 128), 300.5);
  const f = factsFrom({at: 420, ring500: Array(16).fill(380), ring250: Array(8).fill(400)}, {seaBand: 600, treeShare: 0.4166});
  assert.deepEqual([f.elevation, f.relief, f.above, f.position, f.seaBand, f.treeShare], [420, 40, 40, 'higher', 600, 0.42]);
  assert.equal(factsFrom({at: 10, ring500: Array(16).fill(10 + POSITION_STEP_M - 1)}).position, 'level');
  assert.equal(factsFrom({at: null}), null);
  assert.deepEqual(SEA_RINGS[0], 0);
});

test('terrain chips: icon + short text; unknown sea or tree cover is left out, never 0', () => {
  const chips = terrainChips(factsFrom({at: 3, ring500: Array(16).fill(2), ring250: Array(8).fill(3)}, {seaBand: null, treeShare: null}));
  assert.deepEqual(chips.map(c => c.kind), ['elevation']);
  const noWood = terrainChips(factsFrom({at: 3, ring500: Array(16).fill(2), ring250: Array(8).fill(3)}, {seaBand: null, treeShare: 0}));
  assert.ok(!noWood.some(c => c.kind === 'forest'), 'no OSM wood around a stay is not 0 % trees: no chip');
  const all = terrainChips(factsFrom({at: 520, ring500: Array(16).fill(560), ring250: Array(8).fill(540)}, {seaBand: 150, treeShare: 0.3}));
  assert.deepEqual(all.map(c => c.kind), ['elevation', 'relief', 'relief', 'sea', 'forest']);
  assert.ok(all.every(c => c.text.length <= 22 && c.title.length > c.text.length), 'short on the chip, the sentence in the title');
  assert.ok(!all.some(c => /วิว|ราคา|เสี่ยง/.test(c.text + c.title)), 'never a view, a price or a risk');
});

test('terrain mode: site scale only, exaggeration disclosed, hard switch of the fill (never a fade), theme tones', () => {
  assert.ok(TERRAIN.minZoom >= 12 && TERRAIN.offZoom < TERRAIN.minZoom && TERRAIN.reliefOff < TERRAIN.reliefOn);
  assert.equal(TERRAIN.exaggeration, 1.5);
  const on = gateExpression(['case', ['boolean', ['feature-state', 'filled'], false], 1, 0], TERRAIN.minZoom);
  assert.deepEqual(on.slice(-2), [TERRAIN.minZoom, 0], 'a step to 0 at the switch zoom: data colours keep their opacity');
  assert.ok(!JSON.stringify(on).includes('interpolate'));
  assert.equal(gateExpression(1, FILL_MAX_ZOOM).length, 5, 'off: the original gate');
  const p = hillshadePaint({shadow: '#5F635A', highlight: '#F6F7F3', accent: '#7B877D'});
  assert.equal(p['hillshade-shadow-color'], '#5F635A');
});
