# CityMETER Hotel — Implementation Plan (0.3.3)

คู่กับ `implementation-plan.json`

## สถาปัตยกรรม

Static site บน GitHub Pages · ES modules ผ่าน import map (ทุกโมดูลมี `?v=` เดียวกัน) · ไม่มี build step · Node ≥ 20 สำหรับ tests · Python 3 สำหรับสร้างข้อมูล · MapLibre GL JS 5.6.2 จาก unpkg (ล็อกรุ่น) · tiles/glyphs จาก OpenFreeMap

| โมดูล | หน้าที่ |
|---|---|
| `js/app.js` | ประสาน state, row scopes, โหมดแผง, URL, กล้อง, คลิกบนแผนที่ |
| `js/model.js` | decode `data/hotels.json`, มาตรวัด, ตัวกรอง, สรุป, ลิงก์ production/Transit/Shopping centers |
| `js/area-insight.js` | ข้อค้นพบแรก (กฎ tie และ N − 1, บรรทัดรถไฟฟ้า) |
| `js/profile-model.js` | โมเดลแผง: overview, area, station, building, hotel, chain, compset |
| `js/panel.js` | HTML ของแผงทุกโหมด + provenance |
| `js/charts.js` · `js/chart-model.js` | กราฟ areas / mix / chains |
| `js/scales.js` · `js/cues.js` | สเกล `li.supply` + `count` 41 ระดับ, series + shape cue |
| `js/map-layers.js` · `js/provinces.js` · `js/frames.js` · `js/areas.js` | choropleth เขต/อำเภอ, กรอบจังหวัด, ขอบเขตรายจังหวัด, ดัชนีพื้นที่ |
| `js/pins.js` · `js/stations.js` | หมุดที่พัก (ขนาดตามห้อง), สถานีรถไฟฟ้าและวงรัศมี |
| `js/ask.js` · `js/breadcrumb.js` · `js/navigation.js` | ปุ่ม Google (0.3.3: Google Search + AI Overview แทนลิงก์ตรงเข้า AI Mode), เส้นทาง, ไอคอนและวิธีใช้ |
| `js/massing.js` · `js/camera.js` · `js/venue-xray.js` · `js/building-join.js` · `js/maplibre-guard.js` · `js/map-style.js` · `js/mvt.js` · `js/geometry.js` | มวลอาคาร กล้อง มุมมองอาคาร (สืบทอดจาก Fitness 0.3.1) · 0.3.0: อาคาร CityMETER Building V4 ในพื้นที่ที่ใช้ และกล้อง/x-ray บนภูมิประเทศ · 0.3.2: ที่พัก → อาคารที่หมุดอยู่ในขอบ หรืออาคารใกล้หมุด (`nearestBuilding`, 300/800 ม.), กดแล้วเปิด 3 มิติ, วางกล้องลงพื้นหลัง ease (`guardElevationFreeze`), ฐาน x-ray ที่พื้นต่ำสุด, shift lens (`lensPadding`) และตรวจกล้องจมเนิน (`withoutLift`) |
| `js/building-units.js` | 0.3.0: แหล่งอาคารราย อปท./เขต (`data/building-units/`) — โหลดรายจังหวัด, ขอบเขตพื้นที่ CityMETER, URL tile production, attribution |
| `js/labels.js` · `js/logos.js` · `js/terrain.js` | 0.2.0: ชื่อกลางจอ, โลโก้เครือ, ภูมิประเทศ (0.3.0: รวมรอบอาคารที่เปิด) |

## งาน (ทั้งหมดเสร็จในรุ่นนี้)

T1 สร้างข้อมูล · T2 สัญญามาตรวัดและสี · T3 ข้อค้นพบแรก · T4 สถานี/โรงแรม/คู่เทียบ/เครือ · T5 กราฟ ตาราง ปุ่ม Google ไอคอน · T6 มุมมองอาคาร (สืบทอด) · T7 เอกสาร · T8 เผยแพร่และตรวจ live · 0.3.0: นับอาคาร OSM/CityMETER ราย อปท./เขต แล้วเลือกแหล่งตามเกณฑ์ 15% (`scripts/build-building-units.py`) · อาคารบนภูมิประเทศในมุมมองอาคาร · 0.3.1: ปรับภาษาทั้งหน้า (สั้น สัญลักษณ์ กราฟแท่ง ไม่มีคำเตือน บรรทัดที่มา + วิธีนับ) และตัวหารสัดส่วนเป็นยอดทั้งจังหวัด · 0.3.2: กดที่พักที่มีพิกัดแล้วเห็นอาคาร 3 มิติแบบ 2-point ทุกครั้ง (อาคารของหมุด หรืออาคารใกล้หมุด)

## Acceptance criteria

A1 decode ครบ ไม่หลุด · A2 ความเป็นส่วนตัวของข้อมูล · A3 Σ ห้องและไม่ทราบ ≠ 0 · A4 parity สี · A5 จอแรก · A6 แผงสถานี · A7 คู่เทียบ · A8 provenance และภาษาไทยทุกจอ · A9 live · A10 tie · A11 กฎ N − 1 · A12 การจับคู่เขต · A13 มุมมองอาคาร · A14 จอโทรศัพท์ — รายละเอียดและวิธีตรวจใน JSON

## Backlog

B1 ราคาสังเกตรายวัน (`46_PRICE_OBSERVATIONS`) เพื่อฤดูกาล · B2 มวลอาคารวิจัย 642 ชิ้น · B3 ผูก 20 แบรนด์ที่ยังไม่มีเครือในชีต · B4 Locale Insight และ Population รายเขต · B5 feed สำหรับ agent รายเขต · B6 ตรวจสถานะการเปิดดำเนินงานรอบใหม่ · B7 ผูกที่พักหลายอาคารกับขอบเขตไซต์ (ทีมวิจัยตรวจ 300 แห่งแรกใน `49_SITE_BOUNDARY_CHECK`)
