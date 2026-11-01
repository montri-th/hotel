# CityMETER Hotel 0.1.0 — verification

What was checked for this release, how, and what was not. Results are from 2026-11-01 (Asia/Bangkok). The code verified
here is commit `cf8fa6b` (cache tag `?v=20261101-r2`); the commit that adds this file changes documentation only. The final
live attestation of the published commit is recorded in `RELEASE_RECEIPT.json` of the handoff bundle (it cannot live in
the commit it attests).

## 1. Unit tests on the real data — 94 pass, 0 fail

`npm test` (Node 22, `node --test tests/*.test.js`):

| File | What it holds |
|---|---|
| `data.test.js` | 30,729 rows decode, ids unique, alias row out; Σ rooms 996,784 from 30,477 known; unknown rooms never 0; membership counts = `meta.counts`; points with roles; brand → group by id and the “no group” partition; rail/retail straight-line distances recomputed within 1.5 m; publication hygiene; 928 districts / 77 provinces / 78 receipts bound by hash |
| `insight.test.js` | first Aha fixtures (rooms: Bangkok 44,897/130,608, rail 19,577/30,071 vs 24,305/64,530, outside บางละมุง 61,480; records: Phuket top 2 of 3 = 1,886/2,222); tie rule; spread; filters; EVID-05 (68 measured zeros, no_data for unknown-only rooms); province frames; level words |
| `views.test.js` | every view (×2 measures) ends with one provenance line and the unit clause, with no located-inside / sales / share / occupancy / ADR / density claim; first-screen text; district, station, chain and hotel panels; comparison-set rule; missing stays missing; charts (incl. unknown-room cells); breadcrumb `?d=hotel`; series binding (no star); list order; Google actions; filter chips |
| `scales.test.js` | `li.supply` and `count` LUTs, anchors, scaleVersions, same HEX both themes; 41-sample rank ramp; legend; ink/plate |
| `pins.test.js` | one symbol per row with a point, size cue by rooms, detail pins, co-located slots |
| `release.test.js` | one cache tag on every entry and module (import map), one product version, publication hygiene of the tree, handoff JSON against schema 1.5.0 |
| `icons.test.js` | pictogram font bytes and manifest (15 glyphs, sha256 `2b59e62a…`), cache tags on icon fonts |
| `camera`, `massing`, `venue-xray`, `building-join`, `maplibre-guard`, `frames`, `geometry`, `mvt`, `map-style` | the building view, massing, x-ray, join, MapLibre 5.6.2 tile-cover guard and frame loading carried over from Fitness 0.3.1 |

## 2. LDS and Location Intelligence parity — 124 ok, 0 failed

`node scripts/check-lds-parity.mjs --lds Landometer-Design-System-v0.9.7.md --li Location-Intelligence-Profile-for-LDS-v0.9.7.md`:
base file SHA-256 `d3085cbc…96` (approved), profile SHA-256 `5d485604…3c` (approved) with `baseDocument.sha256` = the base;
`count` light+dark (LUT 41, anchors, scaleVersion, classes 3/5/7/9, noData/zeroOutline); `li.supply` light+dark (LUT 41,
anchors, scaleVersion `671112f3…c497`, role HEX `#278E94`); theme.css foundation, map roles, dataState, series 1–10 for both
themes; cue shapes in LDS order. The two source files are not distributed in this repository.

## 3. Rendered harness (build container)

Playwright + Chromium + MapLibre GL 5.6.2 from the npm package. OpenFreeMap and unpkg are blocked in the container, so the
TileJSON is a stub with empty tiles (no basemap, no OSM buildings there); MapLibre is served from the npm package. Views:
home (rooms), `?metric=count`, `?station=RAILCAT:BTS_SUKHUMVIT:E4`, `?hotel=HT-1be94951-…`, `?view=mix`, `?view=chains`
at 1440×900 and 390×844 / 390×700, light and dark. No page error or console error other than the stub's missing source
layers. Found and fixed there: the pictogram font probe asked for a glyph the new subset no longer has (icons stayed
hidden); the “500 ม.” metric tile of the station panel wrapped; the phone Aha card overlapped the taller legend (`--legend-height`).

## 4. Live

- GitHub Pages: source `main` / root, enabled 2026-11-01 in the repository settings; site https://montri-th.github.io/hotel/.
- Byte attestation (`npm run verify:live`): 161 published files of commit `cf8fa6b` fetched from GitHub Pages, 161 identical
  (SHA-256), 0 failed (2026-11-01T07:33:56Z).
- Live walk in Chrome (real OpenFreeMap basemap and OSM buildings), desktop viewport 1568×749, theme Auto (dark): first
  screen (34% · คลองเตย ราชเทวี วัฒนา · rail 65% vs 38% · บางละมุง), measure switch to records (Phuket 85%, camera moves,
  URL `?metric=count`), hotel deep link (two-point building view with the x-ray, fact chips, comparison set), a
  comparison-set hotel (The Twin Tower: reframed on its tower and podium), station Asok (selected ring, dashed 500 m radius,
  focus massing, panel), province Chonburi (89% in บางละมุง · เมืองชลบุรี · สัตหีบ, no rail line).
- Phone width on the live site: same-origin 390×700 frames, light and dark — home, hotel sheet, Phuket records, station
  sheet, district sheet. Found and fixed in this walk (release r2): at zoom 8–9 the Phuket province chip covered the กะทู้
  district chip — province chips now keep clear of district chips.

## 5. Not verified

A physical phone or tablet, Safari and Firefox, a full screen-reader pass, colour-vision simulation, performance on
low-end devices, and the accuracy of the sources themselves (recorded rooms and prices are as the sources state them;
operation is not revalidated — `DATA_METHOD.md` §2, §9).
