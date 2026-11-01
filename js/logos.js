/**
 * Brand logos next to hotel names (owner 2026-11-01: the research team's chain-brand logo library, prepared with
 * ChatGPT, “เฉพาะแบรน hotel ที่เป็น chain”).
 *
 * data/brand-logos.json (scripts/build-logos.py): one display file per brand of this release, every byte SHA-256
 * checked against the library manifest and the sheet tab 48_LOGO_LIBRARY. Logos are identity marks, not icons
 * (LDS ICON-01): never recoloured, cropped, traced or redrawn; each sits on its theme-invariant backing (the
 * library's recommended surface), so it reads the same in light and dark. A brand without a logo shows its name
 * only. The hotel and brand names stay the record of identity: a logo always has its name beside it or in the
 * accessible name of its control. The file URL carries the first 8 hex of its SHA-256 (cache tag).
 */
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));

let registry = new Map(), meta = null, loading = null;

/** Load the registry once; resolves to the number of logos (0 when the file is unavailable — names stay). */
export function loadLogos(url = 'data/brand-logos.json', fetchImpl = (...a) => fetch(...a)) {
  loading ||= fetchImpl(url).then(r => (r.ok ? r.json() : Promise.reject(new Error(`brand logos ${r.status}`)))).then(json => {
    setLogos(json);
    return registry.size;
  }).catch(e => { console.warn('Brand logos unavailable', e); return 0; });
  return loading;
}

/** Install a registry object ({meta, logos}) directly (tests, prebuilt data). */
export function setLogos(json) {
  meta = json?.meta || null;
  registry = new Map((json?.logos || []).filter(l => l?.brand && /^assets\/brand-logos\/[a-z0-9._-]+$/.test(l.file || '')).map(l => [l.brand, Object.freeze(l)]));
}

export const logoOf = brandId => (brandId && registry.get(brandId)) || null;
export const logoMeta = () => meta;

/**
 * A logo on its backing, or '' when the brand has none. `alt` is empty by default: the brand or hotel name next to
 * it (or the control's accessible name) carries the identity.
 */
export function logoMarkup(brandId, {className = 'brand-logo', alt = ''} = {}) {
  const l = logoOf(brandId);
  if (!l) return '';
  const ratio = l.width && l.height ? Math.max(0.4, Math.min(4.5, l.width / l.height)) : 2;
  return `<span class="${esc(className)}${l.opaque ? ' is-opaque' : ''}" data-brand="${esc(l.brand)}" style="--logo-backing:${esc(l.backing)};--logo-ratio:${ratio.toFixed(3)}"><img src="${esc(l.file)}?v=${esc((l.sha256 || '').slice(0, 8))}" alt="${esc(alt)}" decoding="async" loading="lazy" draggable="false"></span>`;
}
