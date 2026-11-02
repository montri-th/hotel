# CityMETER · Hotel — data and method

How `data/hotels.json` is built, what one row and one figure mean, and what the demo never claims. Every number below is
a snapshot of release 0.3.3 (data built 2026-11-01 from the export of 2026-11-01, unchanged since 0.3.1); the page computes everything from the data
at run time, so these are fixtures, not constants.

## วิธีนับ — อ่านตัวเลขในหน้าอย่างไร

หน้าจอไม่มีคำเตือน (เจ้าของ 1 พ.ย. 2569: “ไม่มี caveats เลย”) ทุกบรรทัดที่มาท้ายหน้ามีลิงก์ “วิธีนับ” มาที่นี่ ขอบเขตของตัวเลขอยู่ตรงนี้ที่เดียว

- **ห้อง** = จำนวนห้องที่แหล่งบันทึก (`rooms_selected`) รวมต่อพื้นที่ ไม่ใช่ห้องว่างต่อคืน อัตราการเข้าพัก หรือขนาดตลาด ที่พักที่ไม่ทราบจำนวนห้องไม่นับเป็น 0 ห้อง (แท่ง “ไม่ทราบ” ลายทแยง)
- **แห่ง** = รายการที่พักหนึ่งรายการตามแหล่ง ยังไม่ได้ตรวจภาคสนามว่ายังเปิดอยู่ ชุดข้อมูลเป็น research master ไม่ใช่สำมะโนที่พักทั้งประเทศ
- **สัดส่วนของจังหวัด** = ห้อง (หรือแห่ง) ในพื้นที่ ÷ ทั้งจังหวัดในตัวกรอง รวมที่พักที่แหล่งระบุได้แค่จังหวัด ซึ่งนับในยอดจังหวัดแต่ไม่อยู่ในสีของเขต/อำเภอใด
- **ใกล้รถไฟฟ้า** = ห่างจุดอ้างอิงของสถานีที่เปิดแล้วไม่เกิน 500 ม. เป็นระยะตรง ไม่ใช่ระยะเดินหรือเวลาเดินทาง นับเฉพาะที่พักที่มีพิกัด (ตัวตั้งและตัวหารอยู่ในคำอธิบายของแต่ละแท่ง)
- **ราคาที่บันทึก** = ต่ำสุด สูงสุด เฉลี่ยต่อคืนตามที่ CityMETER Hotel V3 บันทึก ไม่ทราบช่วงเวลา ไม่ใช่ราคาวันนี้ ADR หรือรายได้ แสดงรายโรงแรมเท่านั้น ตัวเลขจากคำตอบของ Google ที่ปุ่ม “ถาม Google AI” เปิดให้ไม่ถูกนำมาใส่ในหน้านี้
- **คู่เทียบ** = ที่พักประเภทเดียวกัน ห้องครึ่งเท่าถึงสองเท่า ในระยะตรง 2 กม. เรียงใกล้ก่อน เป็นรายชื่อเริ่มต้นสำหรับเทียบ ไม่ใช่ชุดคู่แข่งที่ยืนยันแล้ว
- **เครือ** = จากแบรนด์ที่ชุดข้อมูลบันทึกพร้อมหลักฐาน ที่พักที่ไม่มีแบรนด์ไม่ได้แปลว่าเป็นโรงแรมอิสระ
- **อาคาร** = อาคารบนแผนที่ (CityMETER Building V4 หรือ OpenStreetMap ตามพื้นที่) ความสูง “สูงราว” เป็นค่าประมาณของชุดข้อมูล ไม่ใช่ผลรังวัด “ที่พักในอาคารนี้” = หมุดของที่พักอยู่ในขอบอาคาร
- **อาคารใกล้หมุด** = เมื่อหมุดของที่พักไม่อยู่ในขอบอาคารใด มุมมองอาคาร 3 มิติเปิดที่อาคารบนแผนที่ที่ใกล้หมุดที่สุดภายใน 300 ม. (ไม่มีก็ขยายเป็น 800 ม.) โดยมีหมุดอยู่ในภาพด้วย เป็นการเลือกมุมกล้องเท่านั้น ไม่ได้ยืนยันว่าที่พักอยู่ในอาคารนั้น และไม่นับใน “ที่พักในอาคารนี้” ถ้าในระยะ 800 ม. ไม่มีอาคารบนแผนที่ ภาพแสดงพื้นที่รอบหมุด
- **ภูมิประเทศ** = พื้นดินรอบหมุดของที่พัก (รัศมี 500 ม. ต้นไม้ 300 ม.) จาก SRTM 30 ม. (สำรวจปี 2543) และแผนที่ OSM ไม่ใช่การยืนยันวิว ราคา หรือความเสี่ยง
- **สถานีที่กำลังสร้าง** = โครงการ ยังไม่ใช่บริการ

## 1. Sources

| Input | What it is | Published here? |
|---|---|---|
| Research master | Google Sheets “CityMETER Hotel — Venue, Branch & Building Research Master 2026-10-24” (registry id `research.TH.hotel`, internal). Tabs read: `01_VENUES`, `13_BUILDING_LINKS`, `16_BRANCH_SPATIAL_CANDIDATES`, `17_BRANDS`, `19_AFFILIATIONS`, `23_TYPE_ASSIGNMENTS`, `37_IDENTITY_ALIASES`, and (0.2.0) `47_ROOM_RESOLUTION` (dates of the room re-checks written back to `01_VENUES`) and `48_LOGO_LIBRARY` (brand identities and logo hashes) | No. Only the SHA-256 of the .xlsx export (`meta.exportSha256`) and the derived columns in `data/hotels.json` |
| CityMETER production base info | `https://landometer.com/api/v2/citymeter-v3/base/info/lv0` and `…/lv1/{uuid}` (77 provinces, 928 districts, production codes, Thai names, areaSqm), fetched by `scripts/fetch-base.py` | Receipts only (`data/boundary-receipts.json`: url, status, bytes, sha256, retrievedAt for 78 responses) |
| District outlines | Display geometry per province (`data/frames/{CODE}.json`) and province frames (`data/provinces.geojson`), built by `scripts/build-boundaries.py` | Yes |
| CityMETER · Transit | `montri-th/transit` `data/transit.json`, commit and SHA-256 in `meta.context.rail` (release `transit-data-2026-10-31-r1`, as of 2026-10-31): 195 operating and 79 under-construction stations referenced | Station id, name, line labels, status and reference point of the referenced stations |
| CityMETER Shopping centers | `montri-th/shoppingcenter` `data/venues.json`, commit and SHA-256 in `meta.context.retail` (as of 2026-10-26): 584 venues referenced | Venue id, names, group and reference point of the referenced venues |

The rows themselves come from the sources the research master lists (`sources[]`): CityMETER Hotel V3 (the hotel dataset
of CityMETER production, 28,381 rows), the TAT accommodation register on the TAT Data Catalog (2,040 rows), official group
and property pages, and provincial lists published on data.go.th.

## 2. One row, two measures

**One row = one row of `01_VENUES`**: a source-listed accommodation record, as the sheet defines it — not a field-verified
census of operating hotels (`operation_status = operation_not_revalidated` for 30,525 rows,
`official_listing_not_field_verified` for 205). Nothing is merged, split or moved. The alias row of `37_IDENTITY_ALIASES`
(an earlier record of the same current property, `accepted_same_current_post2024_property`) is kept out of every figure
(`meta.aliases`), as the sheet's own rule says. **30,729 rows** remain.

| Measure | Definition | Words on screen | Colour family |
|---|---|---|---|
| `rooms` (default) | Σ `rooms_selected` — the room count the sheet selected from its sources. Recorded stock, not rooms available per night, occupancy or demand | “ห้อง” | LI `li.supply` (capacity) |
| `count` | accommodation records | “แห่ง” | LDS `count` |

A record with unknown rooms (blank `rooms_selected`, **79 rows** after the research team's room re-check of 1 Nov 2026 —
`47_ROOM_RESOLUTION`, 258 tasks, 178 written back; raw zeros the sheet left unselected stay unknown) adds nothing to a room total and is counted apart (“ไม่ทราบจำนวนห้อง”) — never as 0 rooms. A district whose
records all have unknown rooms is `no_data` under the rooms measure (hatch), never a measured 0. Known rooms:
**1,033,157 rooms in 30,650 records**.

No ratio to area or population is drawn. Recorded rooms per km² or per person would read as a density or a market
measure the data does not support.

**Recorded prices** (`min/max/avg_price_raw_thb`, 28,381 CityMETER Hotel V3 rows, `price_period = unknown`) are shown
per hotel as “ราคาที่บันทึก” (the unknown period is the “วันที่ราคา · ไม่ระบุในแหล่ง” field of the hotel's source
details and a line of “วิธีนับ”), in the table and in the comparison set — never summed, averaged across
hotels or called a rate, an ADR or revenue (owner decision 2026-11-01: publish per hotel, including the recorded prices).
Prices are never taken from a search engine's AI answer (owner question 2026-11-02): it states no stay date, room,
occupancy or tax basis, gives different figures from one ask to the next (Sri Panwa the same morning: 8,999–20,382 บาท
per night in an AI Overview, 19,000–24,000 for its cheapest zone and a THB 17,159 map pin in AI Mode) and its sources
are third-party pages. Dated prices come only from `46_PRICE_OBSERVATIONS` of the research sheet — each quote with its
publisher, stay dates, room, occupancy, tax basis, status, source URL and capture hash (59 quotes for 13 hotels, checked
2026-10-25, not yet published) — rebuilt like every other field.
Star ratings are not published (64 rows only, `source_recorded_not_certification_verified`; a star would read as a rating).

## 3. District membership (build time, never re-assigned on screen)

The first method that applies (`row.admin`, `meta.adminMethods`):

| Method | Rule | Rows |
|---|---|---|
| `source` | CityMETER Hotel V3 rows: the production DISTRICT the source API listed the row under (`…/hotel/info/beeSwarm/DISTRICT/{uuid}` → production code) | 28,380 |
| `name` | the row's own district name is a production district of its province | 2,117 |
| `point` | the row's selected point lies in a production district of its province (display outline) | 197 |
| `province` | province only — in every total, in no district colour | 35 |
| `conflict` | the point lies in another province than the row's own: placed nowhere, reported | 0 |

A source district that disagrees with the row's point is kept (the production listing is the membership) and reported
for research (`meta.checks.sourcePointDisagree` = 7, ids in `sourcePointDisagreeSample`). A source district in another
province than the row's own province is not used: the row falls through to the name or point method of its own province
(`meta.counts["source.provinceDisagree"]` = 1). Two district-name spellings
that do not match production fall through to the point method. **860 of 928** districts hold at least one record; the
other 68 are measured zeros of this dataset (EVID-05: every district is in the register's national scope).

## 4. Points

The sheet's selected point (`latitude`/`longitude`) with its role (`coordinate_status` → `cols.coord`, four values in
`vocab.coord`): 29,149 rows. Points outside Thailand's box are dropped (none in this export). Rows the sheet holds or
quarantines (`held_identity_location_conflict`, `known_wrong_selected_point_quarantined_owner_point_pending`) carry no
selected point and are not drawn. A row without a point is still counted in its district.

## 5. Context from the same registry (straight lines, build time)

Distances are straight lines between the hotel's selected point and the other dataset's reference point — never a
walking route, a travel time or a catchment.

- **Rail** (`cols.rail`, `railM`): the nearest operating station of CityMETER · Transit within 2,000 m (1,472 rows);
  `rail2`/`rail2M`: the nearest station under construction within 2,000 m (973 rows; a project, not a service).
  Operating = on the operator roster of CityMETER · Transit (the Bangkok metropolitan rail network in this release).
- **Retail** (`cols.shop`, `shopM`): the nearest countable, located CityMETER Shopping centers venue of the groups
  mall · community · outlet · component · hoststore with status `supply`, within 1,500 m (7,108 rows). The panel links
  to the same venue in CityMETER Shopping centers by its id.
- **Same building (research)** (`inBuilding`): rows of `16_BRANCH_SPATIAL_CANDIDATES` qualified
  `spatial_candidate_requires_identity_review` — a branch of another CityMETER research dataset (restaurants, grocery,
  pharmacy, …) whose source point falls in the same research building mass as the hotel's point (93 hotels). Published as
  industry and public brand only; it is not a tenancy, floor or located-in claim.
- **Meeting rooms** (`cols.meet`): the meeting-room count of the TAT accommodation register (2,115 rows).
- **Groups** (`brands[]`, `chains[]`): the brand name the sheet selected with evidence (468 rows), joined to the brand
  register `17_BRANDS` and its group by id. 20 selected brand names (34 rows) have no group in the register yet; they read
  as “ไม่ระบุเครือ” and are listed for research (§9). A record without a brand is not proof of an independent hotel.

## 6. What the page computes

- **First Aha** (`js/area-insight.js`): the leading province = the province with the most of the measure among rows
  placed at district level; up to three of its districts with the most of it, never cutting through a tie and never
  every district that holds the measure (a province with N ≤ 3 such districts shows its top N − 1); share =
  Σ focus ÷ the province's whole total in the selection (`homeValue`: placed rows and rows placed only at province
  level; since 0.3.1, so the sentence reads “35% ของห้องพักกรุงเทพมหานคร” without a qualifier). The district panel's
  share of its province uses the same denominator. Rail comparison: share of the measure within 500 m of an operating station
  among the focus rows with a point vs the rest of the province's placed rows with a point. Outside finding: the
  district(s) with the most of the measure outside that province.
  Snapshot (rooms): Bangkok · คลองเตย 20,679 · วัฒนา 17,774 · ราชเทวี 15,063 = 53,516 / 153,200 (35%; placed
  total 152,864 + 336 rooms placed only at province level); rail 67%
  (25,768/38,690) vs 42% (32,732/77,957); outside: บางละมุง ชลบุรี 62,561. Snapshot (records): Phuket · เมืองภูเก็ต
  1,024 · กะทู้ 862 = 1,886 / 2,223 (85%).
- **Station panel** (`buildStationProfile`): rows with a point within 500 m of the station's reference point (a row near
  two stations is listed at both). **Station ranking** (`stationsOf`): each row counted once, at its nearest operating
  station.
- **Comparison set** (`compsetOf`): rows with a point within 2,000 m, of the same accommodation group, whose known rooms
  are within ½–2× the hotel's own (both known), nearest first, up to 10; plus every record within 2,000 m of any group.
  Reads every row of the dataset, so it does not move with the filters. A screening aid, not an STR competitive set.

## 7. Colour and categorical rules

- Rooms → Location Intelligence Profile for LDS 0.9.7 `li.supply` (scaleVersion `671112f3…c497`); records → LDS 0.9.7
  `count` (`4ff5c1fb…0980`). All 41 samples by rank among the measured nonzero values being read (owner standing rule),
  the same HEX on both themes; EVID-05 treatments from the base `dataState`. `npm run check:lds -- --lds <base> --li
  <profile>` compares every shipped value with both source files (124 checks).
- Accommodation groups bind by stable id to `landometer-series-10-v8` with the series shape cue (`js/cues.js#GROUP_SERIES`):
  hotel 2 · resort 1 · apartment 3 · guesthouse 4 · bungalow 5 · homestay 10 · other 9 (no series 6 / star).
- Symbol size (0.2.0, owner 2026-11-01): the symbol's area grows with the recorded rooms — radius = k(zoom) · √(rooms ÷ 100),
  rooms capped at 1,500, never below 1.6 px (`js/model.js#pinRadius`, `PIN_SCALE`); the colour stays the group's. Unknown
  rooms: the same shape as an open outline at the 50-room size (EVID-05 no_data — never a small filled mark). Quiet context
  dots: grey, about half size, at most 6 px of radius.

## 7a. Names, logos and terrain on the map (0.2.0)

- **Which names show** (`js/labels.js`): from zoom 12.5, the focus rows whose point lies in the central ellipse of the
  visible map (36 % of its half-width and half-height), ranked by an importance score = the mean of the record's
  national percentile of recorded rooms and of recorded price (avg, else max, else min). A record without a recorded
  price ranks on its rooms alone and one without rooms on its price alone; the price is never guessed and the score is
  never shown. At most 9 labels on desktop and 5 on a phone, measured and placed so they never cover the map chrome,
  the district chips, the popup or each other.
- **Label text**: a branded stay reads as two lines of text — the brand in bold, then the site: its name (English when
  there is one) without the brand words, a leading type word (โรงแรม …), the province name (Thai or English, กรุงเทพฯ)
  and generic endings (รีสอร์ท แอนด์ สปา, Hotel …); other stays read as one such short name. Never shorter than 3
  characters; the full name is the accessible name and heads the card. Logos are not drawn in labels: at label size
  they cannot be read (owner 2026-11-01).
- **Chain logos** (`data/brand-logos.json`, `assets/brand-logos/`, `scripts/build-logos.py`): the research team's
  chain-brand logo library (`Hotel_Chain_Logos_Web`, checked 2026-11-01) joined by `48_LOGO_LIBRARY`; 107 of 112 brands
  of this release. Every file's SHA-256 matches the library manifest and the tab; SVGs are checked for scripts, handlers
  and external references; rasters above 512 px or 64 KB are scaled uniformly to 384 px (WebP) after a transparent
  margin is trimmed — never recoloured, cropped into the artwork, traced or upscaled. Each logo sits on the library's
  recommended surface (theme-invariant backing), at a readable size in the hover card (≈ 40 px tall) and the hotel
  panel (≈ 44 px). Rights stay with each owner; showing a mark to identify a brand is not
  an endorsement or a licence.
- **Terrain mode** (`js/terrain.js`): at site scale (zoom ≥ 12.5, 3D view), when the visible ground spans at least 30 m
  (p95 − p5 of a 14 × 14 sample of the DEM at zoom 11; off below 20 m or zoom 12.2), the map shows 3D ground exaggerated
  × 1.5 (said in the legend) and a hillshade in basemap tones; the district fill switches off from zoom 12.5 (a hard
  switch). Since 0.3.0 (owner 2026-11-01: “อยากให้เห็นอาคารบนภูมิประเทศ”) the building or stay being looked at keeps
  terrain too: its site decides — p95 − p5 of a 12 × 12 sample at zoom 11 over ±1 km ≥ 30 m (Sri Panwa 31 m, above
  Patong 154 m; Bangkok's towers read 16–20 m) — and the building camera, the x-ray and the pins stand on the drawn
  ground. Terrain is switched on or off only while the camera is still (MapLibre 5.6.2 stops rendering when a terrain
  is set during a camera move). DEM: Terrain Tiles on AWS (Mapzen/Tilezen terrarium; SRTM 30 m, acquired 2000, over
  Thailand).
- **Terrain facts of a stay** (card and panel): ground elevation at the point (DEM zoom 13); relief = max − min of the
  point and 24 points on rings of 250 m and 500 m; higher/lower than its surroundings when the point differs from the
  mean of the 500 m ring by ≥ 15 m; the nearest of the rings 0 · 150 · 300 · 600 · 1,200 m (straight line) that reaches
  an OSM ocean polygon of the loaded basemap tiles; tree cover = share of a 75 m grid within 300 m under OSM `wood`
  land cover, shown only when above 0 (absent land cover is not 0 % trees). Facts of the ground only — never a view,
  a price or a risk; unknown is left out.

## 7b. Buildings per area (0.3.0)

Owner decision 2026-11-01 (point 3): “ใช้เกณฑ์ 15% … ได้”, “กรุงเทพฯ ใช้เขตเป็นหน่วย … ได้”, with the question first
answered whether CityMETER keeps OpenStreetMap's multi-part (LOD2+) buildings.

- **Unit**: every อปท. (CityMETER production `municipalityInfos`) that holds at least one stay with a point, by its
  production outline; in Bangkok the เขต (production `districtInfos`, outlines = the page's district frames). The
  production building tiles clip Bangkok by แขวง, so a เขต is read through its แขวง.
- **Rule**: CityMETER Building V4 where its building count in the unit (production `building/info/lv1/{province}?version=V4`)
  is at least 1.15 × the OpenStreetMap count of the same unit; otherwise OpenStreetMap. OSM count = ways tagged
  `building=*` in the unit polygon (Overpass API `out count`, outer rings minus holes, polygons simplified to ≤ 200
  vertices with a closed-ring Douglas–Peucker). The count in the unit's bounding box is an upper bound: where
  1.15 × it is still ≤ the CityMETER count, or it is 0, it decides without a polygon count. A unit whose OSM count
  could not be read stays on OSM. Units where both sources hold fewer than 10 buildings are flagged `gap`.
- **Result** (counts of 2026-11-01, `data/building-units/index.json`): 3,947 units hold a stay with a point (3,897 อปท. and
  the 50 เขต). CityMETER Building V4 is drawn in 3,900 of them, OpenStreetMap in 47 (stays with a point: 27,816 in
  CityMETER units, 1,206 in OSM units). Bangkok: 46 of 50 เขต on CityMETER; บางรัก, ป้อมปราบศัตรูพ่าย, สัมพันธวงศ์ and
  ยานนาวา stay on OSM. The OSM units are mostly old towns and islands OSM maps closely (เชียงคาน, เกาะช้าง, เกาะเต่า,
  ศาลาด่าน, ปาย, พระนครศรีอยุธยา). OSM counts: 3,330 units decided by the bounding-box upper bound, 437 with no OSM building
  in the box, 180 by polygon count; 28 units were counted on an Overpass mirror holding OSM of 2026-06-01, the rest on
  OSM of 2026-11-01 (`meta.osm.osmBaseDays`). 3 units hold fewer than 10 buildings in both sources (`gap`). Reported,
  not patched: a few CityMETER counts look low for a town (เทศบาลตำบลเชียงคาน 98, เทศบาลเมืองนครพนม 72).
- **On the map** (`js/building-units.js`, `js/massing.js`): inside a CityMETER unit the focus tier draws the unit's
  CityMETER Building V4 buildings — production tiles `building/detailMvt/14/{x}/{y}` read per อปท. (Bangkok: per แขวง),
  every building drawn once from the tile that holds its interior point — with the same rounded, slightly enlarged
  shape as OSM buildings; height = `height_m`, the dataset's model estimate (3 m when missing). OSM buildings whose
  interior point falls inside the unit are left out of the focus and hidden from the quiet city tier (a hidden
  OpenFreeMap feature's buildings outside the focus are redrawn as quiet context). Context outside the focus stays
  OSM. A CityMETER tile that fails or exceeds the request bound (40 per focus) leaves its part of the unit on OSM.
- **Parts override (LOD2)**: inside a CityMETER unit, buildings OSM maps in parts (`building:part`; OpenMapTiles hides
  their outline in 3D, `hide_3d`) stay OSM, and the CityMETER buildings whose interior point stands in such an outline
  are left out. Basis (Observed fact, OSM at 2026-11-01 13:47 UTC and taginfo Geofabrik to 2026-10-31): OSM 1.77
  million buildings in Thailand vs CityMETER V4 29.86 million; 2,175 `building:part` pieces; 2,236 buildings with a
  roof shape, 92 % of them with a CityMETER footprint (median height difference 0.5 m); 71 % of the parts lie inside a
  CityMETER footprint and 23 % more within 20 m; 231 multi-level buildings (141 with ≥ 5 m between levels, mostly
  central Bangkok) would lose their levels as CityMETER prisms. MapLibre fill-extrusion draws no roof shapes, so the
  levels are what the override keeps.
- **Wording**: the attribution names “อาคาร: CityMETER Building V4” while any of its buildings is drawn; the building
  panel says “สูงราว” with the source in its title and in the provenance line (“หมุดในขอบอาคาร CityMETER Building V4”);
  the join of stays to buildings (a pin inside the outline: “ที่พักในอาคารนี้”) is the same for both sources (keys
  `osm:` / `cm:`).

## 8. Not published

Addresses, sub-districts, phone numbers, raw coordinates, operator names, source record ids, researcher notes, quality
flags, review statuses, star fields, building source ids, branch names of other datasets, the sheet's README text, the
internal sheet or its export, and private Drive/Sheet URLs (`meta.excludedFields`). Source links are public https pages;
CityMETER Hotel V3 rows link to CityMETER production (`?d=hotel`), never to its API.

## 9. Research follow-ups (reported, not patched in `data/`)

- 7 rows whose selected point lies in another district than the one CityMETER Hotel V3 lists (`meta.checks`), and 1 row
  whose listed district lies in another province than the row's own.
- 14 brands with no group in `17_BRANDS` (Design Hotels, Banyan Tree, Homm, Garrya, Kempinski, Eastin Grand, Prince
  Palace, LiT Bangkok, Cassia, YOTEL, GO Hotel, Kacha, Angsana, Meliá) — link them in the sheet, then rebuild. (0.2.0:
  six brand names that differed from `17_BRANDS` — Curio, DoubleTree, Four Points, MGallery, Renaissance, W — now join
  through the logo library identities of `48_LOGO_LIBRARY`.) Five brands have no accepted logo (Novotel Living, Eastin
  Grand: not found; Prince Palace, LiT Bangkok, Kacha: no library identity).
- 267 rows with `star6_semantics_unresolved`; 79 rows with unknown rooms after the 47_ROOM_RESOLUTION re-check (80 tasks held, `selection_status = hold_*`).
- `46_PRICE_OBSERVATIONS` (dated price quotes) is not used in this release; it is the path to seasonality.
- 642 research building masses (Drive bundle `hotel-building-mass.geojson`) are not drawn in this release; the map draws
  OpenStreetMap or CityMETER Building V4 massing per area (§7b). The research team checks the site boundaries of the 300
  most important resorts and pool villas in `49_SITE_BOUNDARY_CHECK` (owner 2026-11-01); a stay spread over several
  buildings is joined to one building until those boundaries are in.

## 10. Rebuild

```sh
python3 -I scripts/fetch-base.py --out $BUILD/api
python3 -I scripts/build-boundaries.py --pharmacy <montri-th/pharmacy> --api $BUILD/api --ogd <ogd dir> --out .
python3 -I scripts/build-receipts.py --api $BUILD/api --out .
python3 -I scripts/build-data.py --sheet <research master .xlsx> [--csv <tab csv dir>] --api $BUILD/api \
    --index data/area-index.json --frames data/frames --transit <montri-th/transit> --shopping <montri-th/shoppingcenter> \
    --logos <Hotel_Chain_Logos_Web> --out .
python3 -I scripts/build-logos.py --package <Hotel_Chain_Logos_Web> --tab <48_LOGO_LIBRARY.csv> --data data/hotels.json --out .
python3 scripts/build-pictogram-font.py <MaterialSymbolsRounded[FILL,GRAD,opsz,wght].ttf>
python3 -I scripts/build-building-units.py --api $BUILD/api --geom <LAO geometry cache> --counts <building counts .json> --out .
npm test
```

Link changes are made in the research sheet itself, then re-exported and rebuilt — never patched in `data/`.
