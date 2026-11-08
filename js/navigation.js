/**
 * This demo's navigation on the shared header code: the titles of its controls and its pictogram subset. The
 * nav-7 glyphs and the help dialog are js/shell/navigation.js, the dataset picker js/shell/header.js
 * (citymeter-shell: edit those in every repository at once, js/shell/manifest.json).
 */
import {installNavigation, NAV_GLYPHS, NAV_ICON_CONTRACT} from './shell/navigation.js';
import {installHeader} from './shell/header.js';

export {NAV_GLYPHS, NAV_ICON_CONTRACT};

/**
 * Metric-tile pictograms (test exception approved by the owner 2026-10-22 for the
 * Luxury Brands demo; this demo builds its own subset from the same source font with
 * scripts/build-pictogram-font.py; to be registered in LDS if it proves itself). Same family and axes as nav-7, a separate subset so the
 * approved nav-7 bytes stay unchanged. Glyph → meaning in Hotel:
 * hotel = ที่พัก (records, แห่ง) · rooms (bed) = ห้องพัก · area (map) = เขต/อำเภอ · province (location_city) =
 * จังหวัด · segment (category) = ประเภทที่พัก · chain (account_tree) = เครือ/แบรนด์ · rail (train) = สถานีราง ·
 * venue (local_mall) = ศูนย์การค้า · meeting (groups) = ห้องประชุม · price (payments) = ราคาที่บันทึก ·
 * compare (compare_arrows) = ที่พักใกล้เคียงขนาดใกล้กัน · building (apartment) = อาคาร · sea (waves) = ระยะถึงทะเล ·
 * elevation (landscape) = ความสูงพื้นดิน · relief (height) = ต่างระดับรอบที่พัก · forest = ต้นไม้รอบที่พัก (0.2.0, owner
 * 2026-11-01: icons instead of long text on the map). No star glyph: it would read as a hotel rating.
 */
export const PICTOGRAM_CONTRACT = Object.freeze({
  family: 'LDS Material Symbols Rounded Pictogram',
  file: 'assets/icons/material-pictogram-300.woff2', bytes: 3540,
  sha256: '0e68b6b0207bf62a5c592dba7dfb5149dceb951e5548c931289192cb1244f52b',
  manifest: 'assets/icons/material-pictogram-300.json',
  axes: Object.freeze({FILL: 0, wght: 300, GRAD: 0, opsz: 24}),
  glyphs: Object.freeze({area: '\uE55B', province: '\uE7F1', segment: '\uE72C', venue: '\uE54C', ai: '\uE65F', streetview: '\uE56E', maps: '\uE0C8', building: '\uEA40',
    hotel: '\uE53A', rooms: '\uEFDF', rail: '\uE570', meeting: '\uF233', price: '\uEF63', chain: '\uE97A', compare: '\uE915',
    sea: '\uE176', elevation: '\uE564', relief: '\uEA16', forest: '\uEA99',
    rank: '\uF20C', date: '\uE878', distance: '\uE41C', construction: '\uEA3C', dataset: '\uF20E'}),
  status: 'test exception to LDS nav-7 (owner 2026-10-22; action and building glyphs 2026-10-29; hotel glyphs 2026-11-01; terrain glyphs 2026-11-01; rank, date, distance, construction and dataset glyphs 2026-11-01 for short copy)',
  fallback: 'Text labels carry the meaning; pictograms stay hidden until the font has loaded.',
});
const TITLES = {
  'fit-map': 'ปรับแผนที่ให้เห็นพื้นที่ที่โฟกัสหรือพื้นที่ที่เลือก',
  'country-map': 'ดูทั้งประเทศรายจังหวัด',
  'toggle-3d': 'สลับ 3 มิติ / 2 มิติ',
  'toggle-neighborhoods': 'แสดงหรือซ่อนสีและขอบเขตเขต/อำเภอ',
  'mobile-panel': 'เปิดแผงข้อมูลและตัวกรอง',
  'open-help': 'เปิดวิธีใช้',
  'open-help-sheet': 'เปิดวิธีใช้',
  'toggle-insights': 'เปิดหรือย่อกราฟเปรียบเทียบพื้นที่',
  'open-table': 'เปิดตารางที่พักตามตัวกรอง',
  'toggle-table': 'ปิดตารางและกลับไปแผนที่',
  'search': 'ค้นหาชื่อที่พัก แบรนด์ เครือ เขต/อำเภอ หรือจังหวัด',
  'group': 'กรองตามประเภทที่พัก',
  'size': 'กรองตามขนาด (จำนวนห้อง)',
  'province': 'กรองตามจังหวัด',
  'chain': 'กรองตามเครือโรงแรม',
  'prev-page': 'ดูหน้าก่อนหน้าของตาราง',
  'next-page': 'ดูหน้าถัดไปของตาราง',
  'tab-areas': 'เปรียบเทียบห้องพักหรือที่พักของแต่ละเขต/อำเภอ',
  'tab-mix': 'ดูประเภทที่พักในแต่ละเขต/อำเภอ',
  'tab-chains': 'เปรียบเทียบห้องพักหรือที่พักของแต่ละเครือ',
};

if (typeof document !== 'undefined') {
  installNavigation({titles: TITLES, pictogramProbe: PICTOGRAM_CONTRACT.glyphs.hotel});
  installHeader();
}
