# CityMETER Hotel 0.2.0 — verification

What was checked for this release, how, and what was not. Results are from 2026-11-01 (Asia/Bangkok). The code verified
here is commit `6e699b7` (cache tag `?v=20261101-r5`); the commit that adds this file changes documentation only. The final
live attestation of the published commit is recorded in `RELEASE_RECEIPT.json` of the handoff bundle (it cannot live in
the commit it attests). Release 0.1.0 was verified the same way (commit `cf8fa6b`, tag `r2`).

## 1. Unit tests on the real data — 105 pass, 0 fail

`npm test` (Node 22, `node --test tests/*.test.js`):

| File | What it holds |
|---|---|
| `data.test.js` | 30,729 rows decode, ids unique, alias row out; Σ rooms 1,033,157 from 30,650 known; unknown rooms never 0; membership counts = `meta.counts`; points with roles; brand → group by id and the “no group” partition; rail/retail straight-line distances recomputed within 1.5 m; publication hygiene; 928 districts / 77 provinces / 78 receipts bound by hash |
| `insight.test.js` | first Aha fixtures (rooms: Bangkok 53,516/152,864 = 35 %, rail 25,768/38,690 vs 32,732/77,957, outside บางละมุง 62,561; records: Phuket top 2 of 3 = 1,886/2,222); tie rule; spread; filters; EVID-05 (68 measured zeros, no_data for unknown-only rooms); province frames; level words |
| `views.test.js` | every view (×2 measures) ends with one provenance line (checked 1 พ.ย. 2569) and the unit clause, with no located-inside / sales / share / occupancy / ADR / density claim; first-screen text; district, station, chain and hotel panels; comparison-set rule; missing stays missing; charts; breadcrumb `?d=hotel`; series binding (no star); list order; Google actions; filter chips |
| `pins.test.js` | one symbol per row with a point; **0.2.0:** symbol area ∝ rooms at every zoom, cap, unknown = the 50-room size (hollow), zoom stays the top-level input, context radius capped; label importance (rooms + recorded price percentiles, a missing price never guessed); detail pins; co-located slots |
| `labels.test.js` | **new:** importance-then-centre ranking; short names (type, place and generic words, brand words); text labels — brand over site, no logo in a label; central-ellipse candidates; placement off blockers and other labels, capped |
| `logos.test.js` | **new:** every logo file exists with its SHA-256 and size, a public https source page or a recorded note, no private links, theme-invariant backing, SVGs without scripts or handlers; markup escaped and cache-tagged; files only from `assets/brand-logos/` |
| `terrain.test.js` | **new:** terrarium decoding; facts of the ground (elevation, relief, higher/lower); chips short with the sentence in the title, unknown and 0 % tree cover left out, never a view/price/risk; terrain thresholds; the fill switch is a hard step, never a fade; hillshade tones |
| `release.test.js` | one cache tag on every entry and module (import map incl. `labels.js`, `logos.js`, `terrain.js`), one product version (0.2.0), publication hygiene of the tree, handoff JSON against schema 1.5.0 |
| `icons.test.js` | pictogram font bytes and manifest (19 glyphs, sha256 `3121db92…`), cache tags on icon fonts |
| `scales`, `camera`, `massing`, `venue-xray`, `building-join`, `maplibre-guard`, `frames`, `geometry`, `mvt`, `map-style` | unchanged contracts carried over from 0.1.0 |

## 2. LDS and Location Intelligence parity — 124 ok, 0 failed

`node scripts/check-lds-parity.mjs --lds Landometer-Design-System-v0.9.7.md --li Location-Intelligence-Profile-for-LDS-v0.9.7.md`:
base SHA-256 `d3085cbc…96`, profile SHA-256 `5d485604…3c` (`baseDocument.sha256` = the base). 0.2.0 adds no data colour:
the hillshade reads basemap tokens, labels and the card read surface and border tokens, the size key reads `--text-muted`
and `--map-marker-stroke`, hollow cues use the series fill unchanged. Logo backings are the library's recommended
surfaces (identity, not interface tokens).

## 3. Rendered harness (build container)

Playwright + Chromium + MapLibre GL 5.6.2 from the npm package; OpenFreeMap, unpkg and the terrain tiles are blocked in the
container (no basemap there). Home, `?metric=count`, a station, `?view3d=0&area=8302`, a hotel deep link and Patong at
site scale, 1400 px and 390 px, light and dark: no page error. Found and fixed there: hotel labels laid out before the
district chips of the same frame (now one frame later, chips keep priority); chain names held in the Thai name field
were not shortened.

## 4. Preview and live

- Preview from the branch `preview-0.2.0` through raw.githack (real basemap and terrain): Khao Kho terrain mode (3D ground,
  hillshade, fill off at site scale), the two-point camera with terrain on (it framed the hillside behind the resort —
  fixed: terrain switches off for the building camera, the panel carries the terrain facts), hover card terrain chips
  (“ต้นไม้ 0%” where OSM maps no wood — fixed: tree cover is shown only when above 0), Patong light theme.
- GitHub Pages: `main` / root. Byte attestation (`npm run verify:live`): 273 published files of commit `6e699b7` fetched
  from GitHub Pages, 273 identical (SHA-256), 0 failed (2026-11-01).
- Live walk in Chrome, desktop 1710 px CSS, dark and light: Bangkok first screen (35 % · คลองเตย วัฒนา ราชเทวี; terrain
  not loaded; hotel labels clear of the district chips), Khao Kho at site scale (terrain mode, nine labels), Patong
  (terrain, text labels with brand over site, hover card with the chain logo at 40 px and terrain chips).
- Phone width on the live site: same-origin 390×700 frames — Patong light and Khao Kho / Bangkok dark (five labels,
  two-line brand labels, terrain). Found and fixed in this walk: the new status style showed the status line on phones
  under the expanded attribution (r4: hidden on phones again, as in 0.1.0); owner review: logos in labels were too small
  to read (r5: labels are text, logos only in the card and the panel).

## 5. Not verified

A physical phone or tablet, Safari and Firefox, a full screen-reader pass, colour-vision simulation, performance on
low-end devices (terrain mode loads DEM tiles only at hilly sites), the accuracy of the sources themselves, and the
accuracy of SRTM elevation or OSM water and land cover around each stay (terrain facts describe those datasets).
