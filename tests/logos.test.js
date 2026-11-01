import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {setLogos, logoMarkup, logoOf} from '../js/logos.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const reg = JSON.parse(readFileSync(join(ROOT, 'data/brand-logos.json'), 'utf8'));
const hotels = JSON.parse(readFileSync(join(ROOT, 'data/hotels.json'), 'utf8'));

test('brand logos: every file exists with its SHA-256, a display size, a public https source page or a recorded note', () => {
  const brands = new Set(hotels.brands.map(b => b.id));
  assert.ok(reg.logos.length > 50);
  for (const l of reg.logos) {
    assert.ok(brands.has(l.brand), `${l.brand} is a brand of this release`);
    const bytes = readFileSync(join(ROOT, l.file));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), l.sha256, l.file);
    assert.equal(bytes.length, l.bytes);
    assert.ok(l.mime === 'image/svg+xml' || (l.width <= 512 && l.height <= 512), `${l.file}: display size`);
    assert.ok(/^https:\/\//.test(l.sourcePage) || l.sourceNote, `${l.brand}: source page`);
    assert.ok(!/drive\.google|docs\.google|googleusercontent/.test(JSON.stringify(l)), 'no private document links');
    assert.match(l.backing, /^#[0-9A-F]{6}$/, 'theme-invariant backing');
    if (l.mime === 'image/svg+xml') assert.ok(!/<script|<foreignObject|\son[a-z]+\s*=/i.test(bytes.toString('utf8')), `${l.file}: no script or handlers`);
  }
  assert.equal(new Set(reg.logos.map(l => l.brand)).size, reg.logos.length, 'one logo per brand');
  assert.ok(existsSync(join(ROOT, 'assets/brand-logos')));
});

test('logo markup: identity mark on its backing, escaped, cache-tagged by its hash; none → empty (the name stays)', () => {
  setLogos(reg);
  const l = reg.logos[0];
  const html = logoMarkup(l.brand);
  assert.ok(html.includes(`${l.file}?v=${l.sha256.slice(0, 8)}`) && html.includes(`--logo-backing:${l.backing}`) && html.includes('alt=""'));
  assert.equal(logoMarkup('no-such-brand'), '');
  assert.equal(logoOf('no-such-brand'), null);
  setLogos({logos: [{brand: 'x', file: 'https://evil.example/x.svg', sha256: 'a'.repeat(64), backing: '#FFFFFF'}]});
  assert.equal(logoMarkup('x'), '', 'only files under assets/brand-logos are used');
});
