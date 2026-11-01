# CityMETER · Hotel — data and method

How `data/hotels.json` is built, what one row and one figure mean, and what the demo never claims. Every number below is
a snapshot of release 0.1.0 (built 2026-11-01 from the export of 2026-11-01); the page computes everything from the data
at run time, so these are fixtures, not constants.

## 1. Sources

| Input | What it is | Published here? |
|---|---|---|
| Research master | Google Sheets “CityMETER Hotel — Venue, Branch & Building Research Master 2026-10-24” (registry id `research.TH.hotel`, internal). Tabs read: `01_VENUES`, `13_BUILDING_LINKS`, `16_BRANCH_SPATIAL_CANDIDATES`, `17_BRANDS`, `19_AFFILIATIONS`, `23_TYPE_ASSIGNMENTS`, `37_IDENTITY_ALIASES` | No. Only the SHA-256 of the .xlsx export (`meta.exportSha256`) and the derived columns in `data/hotels.json` |
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

A record with unknown rooms (blank `rooms_selected`, **252 rows**; the 41 raw zeros the sheet left unselected stay
unknown) adds nothing to a room total and is counted apart (“ไม่ทราบจำนวนห้อง”) — never as 0 rooms. A district whose
records all have unknown rooms is `no_data` under the rooms measure (hatch), never a measured 0. Known rooms:
**996,784 rooms in 30,477 records**.

No ratio to area or population is drawn. Recorded rooms per km² or per person would read as a density or a market
measure the data does not support.

**Recorded prices** (`min/max/avg_price_raw_thb`, 28,381 CityMETER Hotel V3 rows, `price_period = unknown`) are shown
per hotel as “ราคาที่บันทึก … ไม่ทราบช่วงเวลา”, in the table and in the comparison set — never summed, averaged across
hotels or called a rate, an ADR or revenue (owner decision 2026-11-01: publish per hotel, including the recorded prices).
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
  Σ focus ÷ the province's placed total. Rail comparison: share of the measure within 500 m of an operating station
  among the focus rows with a point vs the rest of the province's placed rows with a point. Outside finding: the
  district(s) with the most of the measure outside that province.
  Snapshot (rooms): Bangkok · คลองเตย 16,886 · ราชเทวี 14,146 · วัฒนา 13,865 = 44,897 / 130,608 (34%); rail 65%
  (19,577/30,071) vs 38% (24,305/64,530); outside: บางละมุง ชลบุรี 61,480. Snapshot (records): Phuket · เมืองภูเก็ต
  1,024 · กะทู้ 862 = 1,886 / 2,222 (85%).
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
- Pin size = a size cue by recorded rooms (< 50 or unknown · 50–199 · 200+); the colour stays the group's.

## 8. Not published

Addresses, sub-districts, phone numbers, raw coordinates, operator names, source record ids, researcher notes, quality
flags, review statuses, star fields, building source ids, branch names of other datasets, the sheet's README text, the
internal sheet or its export, and private Drive/Sheet URLs (`meta.excludedFields`). Source links are public https pages;
CityMETER Hotel V3 rows link to CityMETER production (`?d=hotel`), never to its API.

## 9. Research follow-ups (reported, not patched in `data/`)

- 7 rows whose selected point lies in another district than the one CityMETER Hotel V3 lists (`meta.checks`), and 1 row
  whose listed district lies in another province than the row's own.
- 20 brand names selected in `01_VENUES` with no group in `17_BRANDS` (e.g. Design Hotels, Banyan Tree, Homm,
  Renaissance Hotels, Kempinski) — link them in the sheet, then rebuild.
- 267 rows with `star6_semantics_unresolved`; 41 raw zero-room rows left unselected.
- `46_PRICE_OBSERVATIONS` (dated price quotes) is not used in this release; it is the path to seasonality.
- 642 research building masses (Drive bundle `hotel-building-mass.geojson`) are not drawn in this release; the map draws
  OpenStreetMap massing as context.

## 10. Rebuild

```sh
python3 -I scripts/fetch-base.py --out $BUILD/api
python3 -I scripts/build-boundaries.py --pharmacy <montri-th/pharmacy> --api $BUILD/api --ogd <ogd dir> --out .
python3 -I scripts/build-receipts.py --api $BUILD/api --out .
python3 -I scripts/build-data.py --sheet <research master .xlsx> [--csv <tab csv dir>] --api $BUILD/api \
    --index data/area-index.json --frames data/frames --transit <montri-th/transit> --shopping <montri-th/shoppingcenter> --out .
npm test
```

Link changes are made in the research sheet itself, then re-exported and rebuilt — never patched in `data/`.
