/**
 * Approved LDS nav-7 glyphs and the accessible help dialog.
 *
 * Codepoints were verified from this exact font's cmap + GSUB tables. The
 * registry approves only the seven names below; unsupported actions keep
 * visible text and explanatory titles instead of borrowing misleading symbols.
 * Decoration is idempotent and never touches pins, charts, filters or data.
 */
export const NAV_GLYPHS = Object.freeze({
  open_in_new: '', menu: '', close: '',
  light_mode: '', dark_mode: '', contrast: '', groups: '',
});
/**
 * Metric-tile pictograms (test exception approved by the owner 2026-10-22 for the
 * Luxury Brands demo; this demo builds its own subset from the same source font with
 * scripts/build-pictogram-font.py; to be registered in LDS if it proves itself). Same family and axes as nav-7, a separate subset so the
 * approved nav-7 bytes stay unchanged. Glyph → meaning in Hotel:
 * hotel = ที่พัก (records, แห่ง) · rooms (bed) = ห้องพัก · area (map) = เขต/อำเภอ · province (location_city) =
 * จังหวัด · segment (category) = ประเภทที่พัก · chain (account_tree) = เครือ/แบรนด์ · rail (train) = สถานีราง ·
 * venue (local_mall) = ศูนย์การค้า · meeting (groups) = ห้องประชุม · price (payments) = ราคาที่บันทึก ·
 * compare (compare_arrows) = ที่พักใกล้เคียงขนาดใกล้กัน · building (apartment) = อาคาร. No star glyph: it would read
 * as a hotel rating.
 */
export const PICTOGRAM_CONTRACT = Object.freeze({
  family: 'LDS Material Symbols Rounded Pictogram',
  file: 'assets/icons/material-pictogram-300.woff2', bytes: 2512,
  sha256: '2b59e62a84b9d3435c682b1995d4f5b55d1f0dc3188e1a0450e120da4fa8b5e7',
  manifest: 'assets/icons/material-pictogram-300.json',
  axes: Object.freeze({FILL: 0, wght: 300, GRAD: 0, opsz: 24}),
  glyphs: Object.freeze({area: '\uE55B', province: '\uE7F1', segment: '\uE72C', venue: '\uE54C', ai: '\uE65F', streetview: '\uE56E', maps: '\uE0C8', building: '\uEA40',
    hotel: '\uE53A', rooms: '\uEFDF', rail: '\uE570', meeting: '\uF233', price: '\uEF63', chain: '\uE97A', compare: '\uE915'}),
  status: 'test exception to LDS nav-7 (owner 2026-10-22; action and building glyphs 2026-10-29; hotel glyphs 2026-11-01)',
  fallback: 'Text labels carry the meaning; pictograms stay hidden until the font has loaded.',
});
export const NAV_ICON_CONTRACT = Object.freeze({
  assetId: 'icon.material-symbols-rounded.nav-7.300.01',
  file: 'assets/icons/material-nav-300.woff2', bytes: 2500,
  sha256: 'd7e283106ed2898726b24504c4e0f5ad524292984a90a4d29553c7dcf53b9657',
  axes: Object.freeze({FILL: 0, wght: 300, GRAD: 0, opsz: 24}),
  fallback: 'Visible labels remain usable; hide icon glyphs if the font cannot load.',
});

function makeIcon(name) {
  if (!Object.hasOwn(NAV_GLYPHS, name)) throw new Error(`Unapproved navigation glyph: ${name}`);
  const icon = document.createElement('span');
  icon.className = 'nav-icon';
  icon.dataset.navIcon = name;
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = NAV_GLYPHS[name];
  return icon;
}
function decorate(element, name) {
  if (!element) return;
  const current = [...element.children].find(child => child.classList.contains('nav-icon'));
  if (current?.dataset.navIcon === name) return;
  if (current) current.replaceWith(makeIcon(name)); else element.prepend(makeIcon(name));
  element.classList.add('nav-decorated');
}

const TITLES = {
  'fit-map': 'ปรับแผนที่ให้เห็นพื้นที่ที่โฟกัสหรือพื้นที่ที่เลือก',
  'country-map': 'ดูทั้งประเทศ: กรอบจังหวัดแสดงห้องพักหรือที่พัก ทุกพื้นที่มีสี (ล้างตัวกรองจังหวัดและโฟกัส)',
  'toggle-3d': 'สลับมุมมอง 3 มิติ (อาคารทั้งเมือง) กับแผนผัง 2 มิติ',
  'toggle-neighborhoods': 'แสดงหรือซ่อนสีและขอบเขตเขต/อำเภอ',
  'mobile-panel': 'เปิดแผงข้อมูลและตัวกรอง',
  'open-help': 'เปิดวิธีใช้',
  'open-help-sheet': 'เปิดวิธีใช้',
  'toggle-insights': 'เปิดหรือย่อกราฟเปรียบเทียบพื้นที่',
  'open-table': 'เปิดตารางที่พักตามตัวกรอง',
  'toggle-table': 'ปิดตารางและกลับไปแผนที่',
  'search': 'ค้นหาชื่อที่พัก แบรนด์ เครือ เขต/อำเภอ หรือจังหวัด',
  'group': 'กรองตามประเภทที่พัก (จัดกลุ่มจากประเภทในชีตวิจัย)',
  'size': 'กรองตามขนาด (จำนวนห้องที่แหล่งบันทึก)',
  'province': 'กรองตามจังหวัด',
  'chain': 'กรองตามเครือโรงแรม (จากแบรนด์ที่ชุดข้อมูลบันทึก) หรือที่พักที่ไม่ระบุเครือ',
  'prev-page': 'ดูหน้าก่อนหน้าของตาราง',
  'next-page': 'ดูหน้าถัดไปของตาราง',
  'tab-areas': 'เปรียบเทียบห้องพักหรือที่พักของแต่ละเขต/อำเภอ',
  'tab-mix': 'ดูประเภทที่พักในแต่ละเขต/อำเภอ',
  'tab-chains': 'เปรียบเทียบห้องพักหรือที่พักของแต่ละเครือ',
};

function decorateNavigation() {
  const byId = (id, name) => decorate(document.getElementById(id), name);
  byId('close-help', 'close');
  byId('mobile-panel', 'menu');
  byId('close-mobile-panel', 'close');
  byId('toggle-table', 'close');
  const mode = document.getElementById('theme');
  if (mode) decorate(mode.closest('label'), mode.value === 'dark' ? 'dark_mode' : mode.value === 'light' ? 'light_mode' : 'contrast');
  for (const anchor of document.querySelectorAll('.source-link[target="_blank"], .usage-dialog a[target="_blank"], .top-actions a[target="_blank"], .links a[target="_blank"]')) {
    // This glyph only marks destinations that really open a new browsing context.
    decorate(anchor, 'open_in_new');
  }
  for (const [id, title] of Object.entries(TITLES)) {
    const element = document.getElementById(id);
    if (element && element.title !== title) element.title = title;
  }
  const reset = document.querySelector('#filters button[type="reset"]');
  if (reset) reset.title = 'ล้างตัวกรอง';
}

function installHelp() {
  // Two openers: the map toolbar (desktop) and the information sheet (phone portrait, where six toolbar
  // buttons do not fit in 330 px — live walk 2026-10-23).
  const dialog = document.getElementById('usage-help'), close = document.getElementById('close-help');
  const openers = ['open-help', 'open-help-sheet'].map(id => document.getElementById(id)).filter(Boolean);
  if (!dialog || !openers.length || !close) return;
  const shown = el => el?.isConnected && el.getClientRects().length > 0;
  let returnFocus = openers[0];
  for (const opener of openers) opener.addEventListener('click', () => {
    returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : opener;
    if (!dialog.open) dialog.showModal();
    close.focus({preventScroll: true});
  });
  close.addEventListener('click', () => dialog.close());
  // Native dialog supplies modal focus containment and Escape/cancel behavior.
  dialog.addEventListener('close', () => { const target = shown(returnFocus) ? returnFocus : openers.find(shown) || openers[0]; target.focus({preventScroll: true}); });
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  });
}

export function installNavigation() {
  decorateNavigation();
  installHelp();
  document.getElementById('theme')?.addEventListener('change', decorateNavigation);
  let queued = false;
  const observer = new MutationObserver(() => {
    if (queued) return;
    queued = true;
    queueMicrotask(() => { queued = false; decorateNavigation(); });
  });
  observer.observe(document.body, {childList: true, subtree: true, attributes: true, attributeFilter: ['aria-expanded']});
  if (document.fonts?.load) {
    document.fonts.load('300 24px "LDS Material Symbols Rounded Nav"', '')
      .then(faces => { document.documentElement.classList.add(faces.length ? 'nav-icons-ready' : 'nav-icons-unavailable'); })
      .catch(() => document.documentElement.classList.add('nav-icons-unavailable'));
    document.fonts.load('300 20px "LDS Material Symbols Rounded Pictogram"', PICTOGRAM_CONTRACT.glyphs.hotel)
      .then(faces => { document.documentElement.classList.add(faces.length ? 'pictograms-ready' : 'pictograms-unavailable'); })
      .catch(() => document.documentElement.classList.add('pictograms-unavailable'));
  } else document.documentElement.classList.add('nav-icons-unavailable', 'pictograms-unavailable');
  return () => observer.disconnect();
}

if (typeof document !== 'undefined') installNavigation();
