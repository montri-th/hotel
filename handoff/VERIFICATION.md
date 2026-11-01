# CityMETER Hotel 0.3.2 — verification

What was checked for release 0.3.2, how, and what was not. Results are from 2026-11-02 (Asia/Bangkok). The code verified
here is commit `7aa0cee` (cache tag `?v=20261102-r10`); the commit that adds this file changes documentation only. The
tag went live as `r8` (`f006daa`) and `r9` (`4ba1bbe`) the same morning before the walk found the two fixes below
(phone fit, free-box refit, names off the building); each push was attested. The final live attestation of the
published commit is recorded in `RELEASE_RECEIPT.json` of the handoff bundle (it cannot live in the commit it attests).
Earlier releases: 0.3.1 (`8a05b44`, `r7`), 0.3.0 (`0016573`, `r6`), 0.2.0 (`6e699b7`, `r5`), 0.1.0 (`cf8fa6b`, `r2`).

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
