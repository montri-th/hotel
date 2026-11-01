# CityMETER Hotel 0.3.1 — verification

What was checked for releases 0.3.0 and 0.3.1, how, and what was not. Results are from 2026-11-01 (Asia/Bangkok). The
code verified here is commit `8a05b44` (cache tag `?v=20261101-r7`); the commit that adds this file changes documentation
only. Release 0.3.0 (commit `0016573`, tag `r6`) was verified live the same day before 0.3.1 replaced it. The final live
attestation of the published commit is recorded in `RELEASE_RECEIPT.json` of the handoff bundle (it cannot live in the
commit it attests). Earlier releases: 0.2.0 (`6e699b7`, `r5`), 0.1.0 (`cf8fa6b`, `r2`).

## 1. Unit tests on the real data — 114 pass, 0 fail

`npm test` (Node 22, `node --test tests/*.test.js`):

| File | What it holds |
|---|---|
| `views.test.js` | **0.3.1:** every view (×2 measures) ends with one provenance line — dataset · source · date · boundary as `data-prov` parts (checked 1 พ.ย. 2569), then the “วิธีนับ” link — and carries **no caveat on screen** (no “ไม่ใช่…”, “ยังไม่ได้ตรวจ…”, “อาจเป็น…”, “ไม่ได้แปลว่า…”, “ไม่ทราบช่วงเวลา”, “ค่าประมาณ”, “นับในยอดรวม”) and no located-inside / sales / share / occupancy / ADR / revenue / density claim; first screen “35% ของห้องพักกรุงเทพมหานคร อยู่ใน 3 เขตนี้ · 53,516 จาก 153,200 ห้อง”, rail bars with both bases in the accessible text, “อันดับ 1 นอกกรุงเทพมหานคร”; unknown rooms as a “ไม่ทราบ” size bar; share tiles with numerator and denominator; station radius with the distance pictogram; hotel chips, price date as a source-details field, comparison rule as chips; missing stays missing; charts; breadcrumb; Google actions; filter chips |
| `insight.test.js` | first Aha fixtures — **0.3.1:** the share of the province's whole total (rooms: 53,516 / 153,200 = 35 %, placed total 152,864; records: Phuket 1,886 / 2,223); rail 25,768/38,690 vs 32,732/77,957; outside บางละมุง 62,561; tie rule; spread; filters; EVID-05; province frames; level words |
| `building-units.test.js` | **0.3.0:** focus-tier shaping with zones, OSM parts kept, context; CityMETER tiles drawn once (home tile, shared geometry), heights from `height_m`; request plan (nearest first, national slots); store and file validation; `installMassing` end-to-end on a fake map incl. the OSM fallback of a failed tile; shipped files follow the 15 % rule from their recorded counts, Bangkok by เขต, unique slots, hygiene; **0.3.1:** building panel “สูงราว”, the source in the title and the provenance line |
| `camera.test.js` · `terrain.test.js` · `venue-xray.test.js` | **0.3.0:** terrain fit on the anchor's ground plane; still-camera scheduler for terrain changes; draw order with the context and credit layers |
| `icons.test.js` | **0.3.1:** pictogram font bytes and manifest (24 glyphs: rank, date, distance, construction and dataset added; sha256 `0e68b6b0…`), cache tags on icon fonts |
| `release.test.js` | one cache tag on every entry and module (import map incl. `building-units.js`), one product version (0.3.1), publication hygiene of the tree, handoff JSON against schema 1.5.0 |
| `data`, `pins`, `labels`, `logos`, `scales`, `massing`, `building-join`, `maplibre-guard`, `frames`, `geometry`, `mvt`, `map-style` | contracts carried over from 0.2.0 |

## 2. LDS and Location Intelligence parity — 124 ok, 0 failed

`node scripts/check-lds-parity.mjs --lds Landometer-Design-System-v0.9.7.md --li Location-Intelligence-Profile-for-LDS-v0.9.7.md`:
base SHA-256 `d3085cbc…96`, profile SHA-256 `5d485604…3c` (`baseDocument.sha256` = the base). 0.3.0 and 0.3.1 add no data
colour: CityMETER buildings use the massing tokens of OSM buildings; the rail bars use the neutral foundation fill of the
ordinal bars; the “ไม่ทราบ” bar uses the EVID-05 no-data hatch (`--data-no-data`); chips and the provenance line read
border and text tokens.

## 3. Preview (raw.githack, real basemap, terrain and CityMETER tiles)

- 0.3.0 (`preview-0.3.0`): Sri Panwa (terrain on, 150 CityMETER buildings on the hill), Amari Phuket (x-ray on terrain,
  ground 44 m), Patong (16,698 CityMETER buildings), Bangkok วัฒนา (CityMETER, terrain off). Found and fixed there: the
  closed-ring simplification that voided polygon counts; the terrain fit diverging on slopes (now a plane at the anchor's
  ground); MapLibre's render loop stopping when terrain was set during an ease (terrain changes now wait for a still
  camera); terrain switching on in Bangkok (the site's relief at probe scale decides in the building view); the CityMETER
  building highlight lost after a focus change (national tile-unit slots); terrain facts waiting for an idle map.
- 0.3.1 (`preview-0.3.1`): first screen, hotel, district, station and building panels, light and dark, 1710 px and
  390×700 frames. Found and fixed there: the station radius tile split “500 / ม.” (number and unit now apart); the method
  link's separator underlined; a count split from its word in the map card (“3 / เขตนี้”); sea and tree chips missing
  after choosing a stay far from the camera (the basemap is read only once loaded at the stay, then read again).

## 4. Live

- GitHub Pages: `main` / root. Byte attestation (`npm run verify:live`): 0.3.0 — 352 published files of `0016573`, 352
  identical; 0.3.1 — 352 published files of `8a05b44`, 352 identical (SHA-256), 0 failed (2026-11-01).
- Live walk in Chrome, desktop 1710 px CSS: 0.3.0 dark — Sri Panwa (terrain ×1.5, ground 70.9 m exaggerated, 150
  CityMETER buildings, attribution “อาคาร: CityMETER Building V4 | ภูมิประเทศ: Terrain Tiles on AWS”), Amari Phuket
  (x-ray on the hillside), The Key Bangkok building panel; 0.3.0 light — Sri Panwa, Kathu district (19,367 CityMETER + 7
  OSM buildings), Patong at zoom 15.2 (16,698 CityMETER, terrain on). 0.3.1 light — first screen, Mercure Bangkok Siam
  (top and comparison set), เขตวัฒนา; no console error.
- Phone width on the live site: same-origin 390×700 frames, 0.3.0 Sri Panwa and เขตวัฒนา; 0.3.1 checked on the preview
  of the same code (dark and light, first screen, hotel, district).

## 5. Known limits found in the walk (not fixed in 0.3.1)

- On a steep slope the building camera frames the building on the anchor's ground plane; its near corner can sit up to
  ~25 px under the legend (Amari Phuket).
- Switching the theme at the moment a far stay is selected can leave the camera where it was (the style reload ends
  the flight); selecting again flies.
- A few CityMETER buildings carry one-storey estimates where a hotel is taller (Amari Phuket 3.66 m; OSM has 5 m there).

## 6. Not verified

A physical phone or tablet, Safari and Firefox, a full screen-reader pass, colour-vision simulation, performance on
low-end devices, the accuracy of the sources themselves, of CityMETER building heights, and of SRTM elevation or OSM
water and land cover around each stay.
