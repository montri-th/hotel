# CityMETER Hotel — Implementation Plan (0.1.0)

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
| `js/ask.js` · `js/breadcrumb.js` · `js/navigation.js` | ปุ่ม Google, เส้นทาง, ไอคอนและวิธีใช้ |
| `js/massing.js` · `js/camera.js` · `js/venue-xray.js` · `js/building-join.js` · `js/maplibre-guard.js` · `js/map-style.js` · `js/mvt.js` · `js/geometry.js` | มวลอาคาร กล้อง มุมมองอาคาร (สืบทอดจาก Fitness 0.3.1) |

## งาน (ทั้งหมดเสร็จในรุ่นนี้)

T1 สร้างข้อมูล · T2 สัญญามาตรวัดและสี · T3 ข้อค้นพบแรก · T4 สถานี/โรงแรม/คู่เทียบ/เครือ · T5 กราฟ ตาราง ปุ่ม Google ไอคอน · T6 มุมมองอาคาร (สืบทอด) · T7 เอกสาร · T8 เผยแพร่และตรวจ live

## Acceptance criteria

A1 decode ครบ ไม่หลุด · A2 ความเป็นส่วนตัวของข้อมูล · A3 Σ ห้องและไม่ทราบ ≠ 0 · A4 parity สี · A5 จอแรก · A6 แผงสถานี · A7 คู่เทียบ · A8 provenance และภาษาไทยทุกจอ · A9 live · A10 tie · A11 กฎ N − 1 · A12 การจับคู่เขต · A13 มุมมองอาคาร · A14 จอโทรศัพท์ — รายละเอียดและวิธีตรวจใน JSON

## Backlog

B1 ราคาสังเกตรายวัน (`46_PRICE_OBSERVATIONS`) เพื่อฤดูกาล · B2 มวลอาคารวิจัย 642 ชิ้น · B3 ผูก 20 แบรนด์ที่ยังไม่มีเครือในชีต · B4 Locale Insight และ Population รายเขต · B5 feed สำหรับ agent รายเขต · B6 ตรวจสถานะการเปิดดำเนินงานรอบใหม่
