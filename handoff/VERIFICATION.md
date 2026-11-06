# CityMETER Hotel 0.3.7 — verification

Release 0.3.7 (commit `cfa3b9f`, cache tag `?v=20261106-r17`; published by `594b3f1`, an empty commit that re-ran the
Pages deploy) opens eleven more stays on every building of their site, from an OpenStreetMap area of the stay checked
with its layout; section 0 records how it was checked. Section 0a records 0.3.6 (three Karon resorts from parcels), 0b
0.3.5 (more map on a phone), 0c 0.3.4 (current names, light water, every search word), 0d 0.3.3 (one link) and sections
1–6 record 0.3.2, whose camera and building code is unchanged since. Results are from 2026-11-06 (Asia/Bangkok). The
commit that adds this file changes documentation only; the final live attestation of the published commit is recorded
in `RELEASE_RECEIPT.json` of the handoff bundle (it cannot live in the commit it attests).

## 0. Release 0.3.7 — sites from OpenStreetMap areas

Owner 2026-11-06 20:39 “approve” (to adding `osm_polygon+site_layout` as the third source of `49_SITE_BOUNDARY_CHECK`)
and 21:01 “please continue”.

- Research sheet: eleven rows of `49_SITE_BOUNDARY_CHECK` written in place, columns O–W only (ranks 9, 10, 29, 87, 127,
  145, 150, 208, 210, 285, 287 at sheet rows rank + 1), each row's `venue_id` read in the Name Box and formula bar before
  writing; every row read back through the sheet's query view, the neighbouring rows unchanged; the tab then read
  checked `dol_parcels+site_layout` 3 · checked `osm_polygon+site_layout` 11 · todo 286. Each site is the OSM area of
  the stay's own (skill osm-area-site-join, class `own`, one OSM way each, OSM data of 2026-11-06 from the main
  Overpass server; element and date in the notes) compared with the stay's layout page on Esri World Imagery before
  writing; buildings the layout does not show as the stay's were left out (Sea Sand Sun: four buildings dropped) and
  every row's points pass `scripts/site-candidates.mjs check`. Held, not written: Diamond Cliff (the frame misses the
  Grand Wing and the Diamond Villas on the resort's own map), Royal Ping Garden (no layout found), Duangjitt (waits on
  a deed decision).
- Build: `--sites` read the live tab's header and 14 checked rows (28,325 bytes, SHA-256 `4b795675…16173df85c1597ede3ecfa06e`,
  `meta.siteGroups.file`); the export (SHA-256 `ec460c81…`) is unchanged, so the figures of 0.3.1 stand; the diff
  against 0.3.6 data is `siteGroups` (3 → 14 sites, 60 → 414 buildings), 11 evidence links and the site metadata
  (`meta.siteGroups.credits`: © OpenStreetMap contributors, ODbL 1.0, https://www.openstreetmap.org/copyright).
- `npm test` 129 pass (new: the eleven OSM sites with their counts, source words and credit; a parcel site carries no
  credit; an OSM site's view names the source, links the layout page and the credit; the provenance date follows the
  sheet's latest check, 6 พ.ย. 2569).
- Pages: run #34 built the site in 24 s but its deploy step stopped at “Timeout reached, aborting!” after 10 minutes, and
  its re-run stayed queued for 20 minutes; the empty commit `594b3f1` (run #35) deployed. r17 was live at
  2026-11-06 15:41 UTC; `npm run verify:live` 352 ok, 0 failed against the manifest of `594b3f1`.
- Live walk (montri-th.github.io, Chrome, desktop 1710 × 876 dark): every site opens with all its buildings found and
  framed at pitch 75 (Amari Vogue pitch 64 on its slope), chip, “ไซต์” row and provenance as built — Pullman 26/26
  (zoom 17.8) · Mida Grande 63/63 (18.1) · ANA ANAN 6/6 (19.1) · The Imperial Phukaew Hill 26/26 (17.6, on terrain) ·
  Sea Two 33/33 (18.5, “ทั้งโรงแรม”) · Silavadee 77/77 (18.7) · Banyan Tree Krabi 33/33 (17.9) · Navana 11/11 (19.4) ·
  The Gems 32/32 (18.5) · Sea Sand Sun 33/33 (18.1) · Amari Vogue 14/14 (19.1); the eleven read “… · กรอบ OpenStreetMap +
  ผังที่พัก · หน้าอ้างอิง · © OpenStreetMap contributors · 6 พ.ย. 2569”, the credit linking the OSM copyright page,
  and the provenance “ไซต์ กรอบ OpenStreetMap + ผังที่พัก 6 พ.ย. 2569”. The three parcel sites as in 0.3.6 (Holiday
  Inn 20/20, Phuket Orchid 21/21, The Old Phuket 19/19), no credit, “… 3 พ.ย. 2569”. Every view's date part reads
  “ตรวจ 6 พ.ย. 2569”. Same-origin frames: Silavadee 390 × 740 dark (zoom 16.8) and light (16.8), the whole site in the
  strip above the sheet with its pin, the chip on one line, the “ไซต์” row in three lines with the date kept whole;
  Pullman 1400 × 720 light 26/26 (17.5). No console errors on load.

Observed, not changed in 0.3.7: switching the theme while a site is open refits it one step tighter (Silavadee 390 px
light 17.5 after the switch, 16.8 on a fresh load), so the west edge of the site meets the edge of the strip. The Pullman
record keeps its register's Thai name (ฮิลตัน ภูเก็ต อาเคเดีย …) with the Pullman name in English under it; its Latin
name carries the brand, so the current-name rule (§2a) does not rename it — a sheet fix. The source details of a site
read “อาคาร · ยังไม่มีข้อมูลอาคาร” (the research building-mass field) above “ไซต์ N อาคาร”.

## 0a. Release 0.3.6 — resort sites

Owner request (2026-11-03 08:08): “ไม่ต้องทำเครื่องมือเลือกอาคาร แต่พี่เลือกโฉนดให้เลย มาสร้างขอบเขตอาคาร ร่วมกับ site
layout ของโรงแรม/รีสอท ทดลองกับสามแห่งนี้ก่อน”.

- Research sheet: `49_SITE_BOUNDARY_CHECK` rows 4 (Phuket Orchid Resort & Spa), 42 (Holiday Inn Resort Phuket Karon
  Beach, recorded as Novotel) and 61 (The Old Phuket Karon Beach Resort) written in place, columns O–W
  (`boundary_status` todo → checked; source, evidence page, boundary GeoJSON, building points, main building, checker,
  date, notes), each row's id checked before writing and every cell read back through the sheet's CSV view; the
  neighbouring rows unchanged. The build read the tab's header and checked rows (5,928 bytes, SHA-256
  `245eafce…8ac4a49e`, `meta.siteGroups.file`).
- Overlay on Esri World Imagery (z18) before writing: every published point stands on a building inside its site;
  the buildings left out are a neighbouring resort's bungalows (east of Holiday Inn) and the buildings beyond the
  parcels; Phuket Orchid matches Kata Group's map (convention hall and parking to the north).
- `npm test` 128 pass (new: `buildingsAtPoints`, site-group data invariants, site copy) · LDS + LI parity 124 ok.
- Preview (raw.githack `b679d02`), desktop 1440 × 723 light: `focusTarget()` holds 20 of 20 (Holiday Inn), 19 of 19
  (The Old Phuket) and 21 of 21 (Phuket Orchid) site buildings, all highlighted, x-rayed and framed at pitch 75
  (zoom 18.7 · 18.4 · 18.2); legend “อาคารของที่พัก”; chip “ทั้งรีสอร์ท N อาคาร”; source details “ไซต์ 20 อาคาร ·
  รูปแปลงกรมที่ดิน + ผังที่พัก · หน้าอ้างอิง · 3 พ.ย. 2569”; provenance “… · ไซต์ รูปแปลงกรมที่ดิน + ผังที่พัก 3 พ.ย. 2569”.
  Frames 393 × 852 and 360 × 740: the whole site in the strip above the sheet (Holiday Inn light, zoom 17.0 / 16.9;
  Phuket Orchid dark, 16.6 / 16.5), the chip on one line. A stay without a site (Mercure Ibis Bangkok Siam) still
  opens on the building its pin falls in (`cm:` key, one building, no site words).
- Live r15 (`b679d02`): the same counts on montri-th.github.io (Holiday Inn light desktop 20/20, The Old Phuket dark
  desktop 19/19, Phuket Orchid 393 × 852 light 21/21, The Old Phuket 360 × 740 light 19/19), no console errors;
  `npm run verify:live` 351/352 (the one difference: this file, then uncommitted). Found in the walk: The Old
  Phuket's pin stands at the parking end of its site, past the last building, so at 360 px the site frame left the
  pin at the edge (and behind a wing on desktop dark). r16 frames a site with the stay's pin, as 0.3.2 does for the
  nearest building (`focusShape`).
- Preview r16 (`dace007`), dark frames: the pin inside the free box in every frame — The Old Phuket 360 × 740 (19/19,
  zoom 16.6), Holiday Inn 393 × 852 (20/20, 17.0), Phuket Orchid 560 × 723 (21/21, 17.2).
- Live r16 (`dace007`), walked 2026-11-03: The Old Phuket desktop light 19/19 with its pin at the parking end in the
  frame (zoom 18.2, pitch 75) and 393 × 852 dark 19/19 (pin 336, 233 in the free box 12–346 × 58–317); Holiday Inn
  360 × 740 dark 20/20; Phuket Orchid 360 × 740 dark 21/21 (pin in the free box); no console errors. A frame that had
  cached the r15 `index.html` (GitHub Pages serves it for 10 minutes) ran r15 until reloaded with a fresh query.
- `npm run verify:live` checks the live files against the handoff manifest: run `node scripts/build-handoff.mjs`
  first, on the published commit (a manifest of `b679d02` read 7 files of r16 as mismatches).

Observed in the data, not changed: one CityMETER Building V4 footprint inside the Phuket Orchid site (369 m², height
estimate 14.8 m) stands where the Esri imagery shows the pool; the site shows it as CityMETER draws it.

## 0b. Release 0.3.5 — more map on a phone

Owner request (2026-11-02 23:11, with a phone screenshot of the country view in Safari): “ในมือถือ เหลือพื้นที่ map
น้อยมาก ช่วยปรับปรุงด้วย”. The screenshot also showed the legend ticks “11,026” and “153,200” written over each other.

Measured in Chrome on same-origin frames (`window.__citymeter`), free map = from the toolbar's foot to the top of the
first thing covering the map from below:

| Frame | 0.3.4 (live `r13`) | 0.3.5 (preview, then live `r14`) |
|---|---|---|
| 393 × 852, first screen, attribution open (on load) | 449 px (53 %): Aha 101 px + legend 93 px + attribution 40 px | 544 px (64 %): one dock 106 px over the attribution |
| 393 × 852, after the first drag (attribution folded to (i)) | 449 px (53 %) | 590 px (70 %): the dock on the tray, the (i) in its corner |
| 360 × 740, country view, attribution folded | — | 478 px; ramp 164 px, ticks 1,104 · 3,821 · 6,785 · 153,200 apart |
| 393 × 852, Holiday Inn Resort Phuket Karon Beach (sheet open) | sheet 64 %, heading under the dataset title and search | sheet 56 % (top at 373 px), the stay's heading 277 px into the sheet; the building fills the strip above at pitch 75 |
| 1710 px desktop | legend 380 × 152 at the bottom left | unchanged (`#map-dock` is `display: contents`); ticks 4 · 60 · 179 · 549 · 62,561 |

Ticks: `rampTicks` now spaces labels by their width for the 204 px ramp (the old rule counted samples only: 8 samples
are 40 px, less than half of “11,026” plus the whole of the end-anchored “153,200”); `spaceTicks` hides, on the ramp's own width, a tick that would still touch
(the highest value keeps its tick). `tests/scales.test.js` holds three value sets with no label closer than 5 px at
204 px. `npm test` 125 pass · LDS + LI parity 124 ok.

Live `r14` (commit `b12352c`), walked 2026-11-03 in same-origin frames of montri-th.github.io/hotel: 393 × 852 light
544 px on load and 590 px once the attribution folds; dark the same (dock 106 px, ticks 4 · 60 · 179 · 549 · 62,561,
Thai legible); Holiday Inn Resort Phuket Karon Beach opens the sheet at 373 px (475 px tall, the stay's heading in it,
search off); desktop unchanged; no console errors. `npm run verify:live` 352/352 files at `b12352c` (one rerun after a
transient 503 on three building-unit files).

Not checked in a frame: the zoom buttons step aside only for a coarse pointer (a touch phone); Chrome's desktop frames
keep them, so the free box there stops left of them while a phone's does not.

## 0c. Release 0.3.4 — current names, light water, every search word

Owner questions (2026-11-02 21:38–21:39): “ทำไม novotel กะรน ใช้ logo Holiday Inn?” · “ใน light theme ทำให้ทะเล/water
body ดูเหมือนน้ำมากกว่านี้ได้มั้ย แต่ยัง clean and quiet อยู่นะ” · “โรงแรม รีสอท ที่เป็นกลุ่มหลายอาคาร เช่น บังงกาโลว์ หรือ
pool villa สามารถ ทำ spatial join เป็นกลุ่มอาคารเลยได้มั้ย ถึงจะสมจริง”.

**Cause of the Novotel / Holiday Inn pair.** `01_VENUES` row `HOTEL-TAT-20160504143431473963` keeps the TAT register name
(Novotel Phuket Karon Beach Resort and Spa) with `brand_name` Holiday Inn Resort; its `19_AFFILIATIONS` row is IHG's own
listing (ihg.com hotel detail, retrieved 2026-10-24) naming the property Holiday Inn Resort Phuket Karon Beach, matched by
the research team on address, telephone and point. The panel showed the register name beside the brand's logo.

| Check | Result |
|---|---|
| Rebuild reproducibility | `scripts/build-data.py` on the same export (SHA-256 `ec460c81…2d2e`, its CSV tabs) before the change: `data/hotels.json` identical to 0.3.3 except `meta.builtOn` |
| Rebuild with the rule | only `meta.builtOn`, `meta.counts['name.current']` (24), `meta.currentNames`, `currentNames` (24 rows) and 24 listing links appended to `urls` (216 → 240; row link indices unchanged) differ |
| The 24 rows | 13 renamed or rebranded properties, 11 records spelled without the brand's words or with a broken character (`DATA_METHOD.md` §2a); V Villas Phuket – MGallery keeps its name once every label of the brand is known (an early build judged it before the label “MGallery” arrived; fixed by judging after all rows) |
| Unit tests | `npm test` 124 pass: the rule's invariants on every renamed row, Karon's names and IHG link, a capitals listing in title case, Thai-only HOP INN names kept, HTML entities read as characters, “novotel karon” and “โนโวเทล กะรน” find the stay; the panel heading, recorded line and brand link; the map label reads Holiday Inn Resort / Karon Beach |
| LDS + LI parity | 124 ok, 0 failed (no LDS value changed; the water and shore are basemap-only tokens) |

**Water.** Light `--basemap-water` #CFDDE7 (CIELAB L 87, C 7, h 247) stands 1.22:1 from the ground (#EEF1EE; the
surface.blueTint it replaces stood 1.08:1); the shore line `water-shore` #B2C7D6 stands 1.26:1 from the water and draws
above the district fill. Dark keeps #18333E with a quiet shore #1F3F4C. Candidates were compared on the live tiles in
Chrome at Phuket (zoom 5.6, 8.2, 9.3, 12.6 and 15.2 in 3D with terrain): no seam at tile edges or across the open sea.
The li.supply ramp is light blue at its low end (sample 6 #CFE2EB lies ΔE00 2.3 from the new water; the old water lay
2.2 from sample 2), so the coast line and the district outlines, not the hue, part the sea from a low district.

| Live (`r12`/`r13`, Chrome, signed-in profile) | Result |
|---|---|
| Phuket, desktop light | the sea reads as water; districts, chips and legend unchanged |
| Holiday Inn Resort Phuket Karon Beach, desktop light | heading = the listed name; “ชื่อที่บันทึก โนโวเทล ภูเก็ต กะรน บีช รีสอร์ท แอนด์ สปา” under it; source details: ชื่อ + หน้าแบรนด์ (ihg.com) + 24 ต.ค. 2569, ชื่อที่บันทึก in Thai and English; ถาม Google AI asks with the listed name; building view pitch 75 |
| Same stay, 390 × 700 frame, light | heading and recorded name wrap cleanly under the logo; the building sits in the strip above the sheet |
| Phuket overview, 390 × 700, light and dark | light: blue-grey sea, shore line; dark: unchanged sea |
| DoubleTree by Hilton Bangkok Ploenchit (recorded แมเจสติค แกรนด์, no point), desktop dark (preview) | heading, recorded line, district view as before for a stay without a point |
| Mamaka Phuket, Tapestry Collection by Hilton (recorded Hilton Garden Inn Phuket Bangtao) | heading, recorded line, nearest building at pitch 75 |
| `?search=novotel+karon` (`r13`) | one stay: Holiday Inn Resort Phuket Karon Beach; no console error |
| `npm run verify:live` | `b8762d2` (r12) 352 identical; `439c7ee` (r13) 352 identical (one transient 503 on a building-unit file in each first run, identical on the rerun) |

**Multi-building stays (answer, no code).** The live research sheet has the tab `49_SITE_BOUNDARY_CHECK` (read
2026-11-02 through the sheet's own query, nothing written): 300 stays ranked by importance — resort 282, hotel 14,
bungalow 2, other 2; signals resort_type 256, resort_type + villa in the name 26, villa in the name 18; 203 with a point —
with columns `boundary_status`, `boundary_source`, `boundary_evidence_url`, `boundary_geojson`, `buildings_in_boundary`,
`main_building_note`, `checked_by`, `checked_on`. Every row is `todo`, so no stay has a site boundary yet. CityMETER
Building V4 tiles carry `height_m`, `estimated_floor` and `height_class_code` only (no parcel or site key). An interim
check of OpenStreetMap resort outlines was not completed: overpass-api.de answered 406 to every request from the browser
and other instances did not answer within the tool's time limit.

Not checked: Safari, Firefox, a physical phone; the hover card of a renamed stay (its text comes from the same
`subName` as the panel, held by tests); whether each brand's listing is still current after 2026-10-25.

## 0d. Release 0.3.3 — ถาม Google AI answers at once

Owner question (2026-11-02 07:31): “ตอนนี้กด "ถาม Google AI" แล้วมันไม่เปิด result ที่ถามทันทีแต่มี dialogue มาแทรก …
ทำให้มันตอบทันเลยได้มั้ย”. Measured in Chrome (signed in to Google), 2026-11-02:

| Link | Opened by | Result |
|---|---|---|
| AI Mode `search?udm=50&q=` (0.3.2), the long hotel question | a click on the live site (`rel="noopener noreferrer"`) | “Continue with this search? Malicious queries could result in unsafe or harmful actions.” |
| AI Mode, a short question (“Sri Panwa Phuket”) | a click from the live site (referrer kept) | the same dialog |
| AI Mode, the same two questions | the address typed in the browser | the answer at once, no dialog |
| Google Search `search?q=` (0.3.3), the same long question | a click from the site | no dialog; AI Overview at the top |
| Google's own AI Mode tab on that results page | a click inside Google | AI Mode answers, no dialog |

So the dialog follows a link into AI Mode from another site, whatever the question or the referrer, and no URL form
avoids it; Google Search does not ask. The questions of all six views (hotel, building, district, station, group,
overview) each showed an AI Overview at the top of Google Search (hotel and district opened by a click from the site,
the others by address). `tests/views.test.js` holds every AI link to a plain
search with the question only. Live (`17f60b3`, r11): 352 published files identical (`npm run verify:live`); a click on
ถาม Google AI in เขตวัฒนา opened Google Search with an AI Overview and no dialog. Not checked: a signed-out browser, other
countries' Google, Safari and Firefox; whether Google shows an AI Overview is Google's call per question.

Prices in Google's answers are not copied into the data (owner question the same morning): the same Sri Panwa question
gave 8,999–20,382 บาท per night in an AI Overview and 19,000–24,000 (its cheapest zone) with a THB 17,159 map pin in AI
Mode, with no stay date, room or occupancy. Dated prices have their own path: `46_PRICE_OBSERVATIONS` (59 quotes, 13
hotels, checked 2026-10-25; not yet published).

## Release 0.3.2

The code verified for 0.3.2 is commit `7aa0cee` (cache tag `?v=20261102-r10`). The tag went live as `r8` (`f006daa`)
and `r9` (`4ba1bbe`) the same morning before the walk found the fixes below (phone fit, free-box refit, names off the
building); each push was attested. Earlier releases: 0.3.1 (`8a05b44`, `r7`), 0.3.0 (`0016573`, `r6`), 0.2.0
(`6e699b7`, `r5`), 0.1.0 (`cf8fa6b`, `r2`).

Owner rule for this release (2026-11-02 00:07): “เวลาคลิกที่ poi hotel แล้วต้องแสดง 2-point perspective ของ 3d building
mass ทุกกรณีสิ”.

## 1. Unit tests on the real data — 120 pass, 0 fail

`npm test` (Node 22, `node --test tests/*.test.js`). New or changed in 0.3.2:

| File | What it holds |
|---|---|
| `building-join.test.js` | `nearestBuilding`: a pin in no outline turns the camera to the drawn building nearest it — distance to the outline, the largest piece within 10 m of the nearest, nothing past the reach |
| `camera.test.js` | fit on terrain with each point's own ground (a small building down the slope from the pin); the target carries the centre's elevation; **shift lens** (principal point at a high free box's centre, never below the canvas centre); a camera MapLibre lifts out of the hill early in the fit is not kept (fails on 0.3.1's `fitBuilding`); when the asked corner stays inside the hill another corner keeps pitch 75, and alone the lifted frame still holds; MapLibre's lift method is restored after the fit |
| `maplibre-guard.test.js` | guard 2: a programmatic ease on terrain ends with the centre landed on the ground (MapLibre 5.6.2 leaves `_elevationFreeze` on); gestures and other versions untouched |
| `release.test.js` | one cache tag on every entry and module, one product version (0.3.2), handoff JSON against schema 1.5.0 |
| all others | contracts of 0.3.1 and earlier, unchanged |

## 2. LDS and Location Intelligence parity — 124 ok, 0 failed

`node scripts/check-lds-parity.mjs --lds Landometer-Design-System-v0.9.7.md --li Location-Intelligence-Profile-for-LDS-v0.9.7.md`:
base SHA-256 `d3085cbc…96`, profile SHA-256 `5d485604…3c`. 0.3.2 adds no colour: “อาคารใกล้หมุด” uses the x-ray roles of
“อาคารของที่พัก” (`map.activeLayer`, `map.selectedStroke`).

## 3. Preview (raw.githack, real basemap, terrain and building tiles)

Measured in Chrome with the page's own camera (`window.__citymeter`): the screen box of the building as drawn (fit
points at their ground) against the free box of the map, at 1710 px CSS and in same-origin 390 × 700 frames.

| Case | Building | Result |
|---|---|---|
| Sri Panwa (Phuket, pin outside every outline) | nearest drawn, “อาคารใกล้หมุด” | desktop: building and pin in the box (462–773 × 188–443 in 12–1223 × 58–574), zoom 20, pitch 75, camera on the ground (64.6 m); phone: inside the strip above the sheet |
| Amari Phuket (on the hillside) | pin inside | desktop 49–1186 × 80–554 in the box; phone 22–333 × 59–190 in 12–343 × 54–194 |
| Mercure Bangkok Siam (flat) | pin inside | desktop fills the box height (74–583 in 58–599); phone inside the strip |
| Bam Boo Lake (Khao Kho, 1,070 m up) | nearest drawn | desktop and phone in the box |
| `?view3d=0`, click on the pin | pin inside | switched to 3D, pitch 75, popup open |
| อำเภอเขาค้อ, 120 of its 357 stays with a point chosen one after another | — | every one opened a building in the two-point view (119 within 9 s; Bam Boo Lake when loaded on its own) |

Basis of the 300 m / 800 m reach (measured on the preview with the buildings loaded for each area): Bangkok เขตวัฒนา 124
of 179 pins inside an outline, the rest within 25 m; Kathu 363 of 805 inside, 439 of the 442 outside within 300 m;
Khao Kho 19 of 100 inside, 77 of the 81 outside within 300 m (a stay's own load reaches farther: all 120 above found one).

Found and fixed on the preview:

- the nearest building framed at zoom 21 with the building at the bottom → each fit point carries the ground it is drawn
  on; the nearest building one zoom step wider with the pin in the frame;
- the landed-camera rounds swinging between two centres on a steep slope → half steps;
- the camera elevation frozen after a programmatic ease (80.97 m vs 62.41 m ground at Sri Panwa) → `guardElevationFreeze`;
- the x-ray's fixed 10 m below ground showing through the slope → walls end at the lowest ground under the outline;
- on a phone (free strip above the sheet ~200 px above the canvas centre) Amari Phuket sat under the sheet: MapLibre
  had lifted the far camera out of the hill to 48° early in the fit; without the lift the pitch-75 fit did not
  converge (the building on a ray 7.5° under the horizon; the camera flew 9 km away) → shift lens (`lensPadding`) and
  the fit computed with the lift off, MapLibre's own check asked afterwards (`withoutLift`, other corners first);
- after a click from a district (2D), the legend shrank once the camera settled and the building filled 86 % of the
  box height → `watchFreeBox` refits once the camera is still;
- stays' name labels sitting on the building being looked at → they avoid its screen box, as the district chips do.

## 4. Live

- GitHub Pages: `main` / root. Byte attestation (`npm run verify:live`), 2026-11-02: `f006daa` (r8) 352 identical;
  `4ba1bbe` (r9) 352 identical; `7aa0cee` (r10) 352 published files, 352 identical (SHA-256), 0 failed.
- Live walk in Chrome, r10: first screen (light, no console error); a click on a hotel pin in Khlong Toei from the
  first screen → Grande Centre Point Terminal 21, its building (4 pieces) in the two-point view, filling the box height
  (74–582 in 58–599), names placed off the building, no console error. r9: Bangkok Marriott Marquis Queen's Park
  clicked from the first screen (74–583, refit once for the new legend). r8: Hotel Nikko Bangkok clicked in เขตวัฒนา
  at `view3d=0` → 3D, pitch 75, 86 % of the box height (the free-box refit of r9 came from this walk).
- Phone width on the live site, same-origin 390 × 700 frames: r10 dark — Sri Panwa, Bangkok Marriott Marquis Queen's
  Park, Amari Phuket; r9 light — the same three; r8 light and dark — Bam Boo Lake, Mercure Bangkok Siam, Amari Phuket.
  Every one at pitch 75, the building inside the strip above the sheet.

## 5. Known limits found in the walk (not fixed in 0.3.2)

- Pins of stays standing behind the building being looked at are drawn over it (the pin layer is above the x-ray, as
  in every release).
- Where no building is drawn within 800 m of a stay's pin, the two-point camera frames the ground round the pin (none
  met in the walk).
- On a hillside the x-ray walls go down to the lowest ground under the outline, so a small building on a steep slope
  reads taller than its neighbours drawn by MapLibre (whose downhill side floats).
- Switching the theme at the moment a far stay is selected can leave the camera where it was; selecting again flies.
- A few CityMETER buildings carry one-storey estimates where a hotel is taller (Amari Phuket 3.66 m; OSM has 5 m).

## 6. Not verified

A physical phone or tablet, Safari and Firefox, a full screen-reader pass, colour-vision simulation, performance on
low-end devices, every stay in the country (the walk covered the cases above and 120 of the 357 stays with a point in
อำเภอเขาค้อ), the accuracy of the sources themselves, of CityMETER building heights, and of SRTM elevation or OSM water
and land cover round each stay.
