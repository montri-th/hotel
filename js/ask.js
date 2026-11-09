/**
 * Contextual outbound actions: the next question a reader has at each view, answered outside the demo.
 *
 *  - ถาม Google AI — Google Search with a question written for the view: a hotel (is it still open, rates now, recent
 *    reviews, getting there), a district or a station (where to stay, prices, what is near), a hotel group (its brands
 *    and openings), a building, or the country/province overview (supply and occupancy news). Google answers at the
 *    top of the results (AI Overview) and its AI Mode tab carries the question on. Never a link straight into AI Mode
 *    (`udm=50`): Google stops one that comes from another site at “Continue with this search?” (Hotel 0.3.3, measured
 *    2026-11-02 for long and short questions, with or without a referrer; a typed address or Google's own AI Mode tab
 *    opens without it). Owner 2026-11-02: “ทำให้มันตอบทันเลยได้มั้ย”;
 *  - Street View — only where the view has a point (a hotel's selected point, or a station's reference point, which
 *    is not an entrance: the label says "ใกล้");
 *  - Google Maps — a search by hotel name + district + province (or "โรงแรม" + place).
 *
 * Pure: builds labels and https URLs from public names only (no user data, no internal ids). The Google names on the
 * buttons say where the answers come from (owner 2026-11-01: no caveat lines).
 * An English page (citymeter-shell 0.5.1) asks in English, with the English names the data gives (js/lang.js); the
 * button labels are translated by js/shell/i18n.js like the rest of the page.
 */
import {LANG, englishName} from './shell/i18n.js';

const enc = encodeURIComponent;
export const googleAskURL = q => `https://www.google.com/search?q=${enc(q)}`;
export const mapsSearchURL = q => `https://www.google.com/maps/search/?api=1&query=${enc(q)}`;
export const streetViewURL = (lat, lon) => (Number.isFinite(lat) && Number.isFinite(lon)
  ? `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat.toFixed(6)},${lon.toFixed(6)}` : '');

const clean = s => String(s ?? '').replace(/\s+/g, ' ').trim();
const join = (...parts) => clean(parts.filter(Boolean).join(' '));
/**
 * ctx: {kind: 'hotel'|'building'|'area'|'station'|'chain'|'overview', row?, area?: {place, province}, station?, chain?,
 *       province?, point?: {lat, lon, role}, rows?}
 * → [{id, label, href, note}] in display order (only the actions that apply).
 */
export function contextActions(ctx = {}, lang = LANG) {
  if (lang === 'en') return contextActionsEnglish(ctx);
  const out = [], place = ctx.area ? join(ctx.area.place, ctx.area.province) : '';
  const add = (id, label, href, note = '') => { if (href) out.push({id, label, href, note}); };
  if (ctx.kind === 'hotel' && ctx.row) {
    const r = ctx.row, name = clean(r.name || r.nameEn);
    add('ai', 'ถาม Google AI', googleAskURL(`${join(name, place ? `(${place})` : '')} ยังเปิดให้บริการอยู่ไหม ราคาห้องพักช่วงนี้เท่าไร รีวิวล่าสุดเป็นอย่างไร และเดินทางจากสนามบินหรือสถานีอย่างไร`));
    add('maps', 'Google Maps', mapsSearchURL(join(name, ctx.area?.place, ctx.area?.province)));
  } else if (ctx.kind === 'building') {
    const names = [...new Set((ctx.rows || []).map(r => clean(r.name || r.nameEn)).filter(Boolean))].slice(0, 2);
    add('ai', 'ถาม Google AI', googleAskURL(`${join(names.join(' และ '), place)} อยู่อาคารเดียวกันไหม และในอาคารนี้มีอะไรอีกบ้าง`));
  } else if (ctx.kind === 'area' && ctx.area) {
    add('ai', 'ถาม Google AI', googleAskURL(`โรงแรมและที่พักใน${clean(ctx.area.place)} ${clean(ctx.area.province)} ย่านไหนน่าพัก ราคาช่วงนี้ประมาณเท่าไร และใกล้รถไฟฟ้าหรือแหล่งท่องเที่ยวอะไร`));
    add('maps', 'Google Maps', mapsSearchURL(`โรงแรม ${join(ctx.area.place, ctx.area.province)}`));
  } else if (ctx.kind === 'station' && ctx.station) {
    const s = ctx.station, line = (s.lines || []).join(' ');
    add('ai', 'ถาม Google AI', googleAskURL(`โรงแรมใกล้สถานี${clean(s.name)}${line ? ` (${clean(line)})` : ''} มีที่ไหนบ้าง เดินไปกี่นาที ราคาช่วงนี้และรีวิวเป็นอย่างไร`));
    add('maps', 'Google Maps', mapsSearchURL(`โรงแรมใกล้สถานี${clean(s.name)}`));
  } else if (ctx.kind === 'chain' && ctx.chain) {
    add('ai', 'ถาม Google AI', googleAskURL(`${clean(ctx.chain.name)} ในประเทศไทยมีโรงแรมกี่แห่ง แบรนด์อะไรบ้าง และประกาศเปิดโรงแรมใหม่ที่ไหนบ้าง`));
  } else if (ctx.kind === 'overview') {
    const where = clean(ctx.province) || 'ประเทศไทย';
    add('ai', 'ถาม Google AI', googleAskURL(`ภาพรวมห้องพักโรงแรมใน${where}ล่าสุด อัตราการเข้าพักเป็นอย่างไร และมีโรงแรมใหม่เปิดหรือประกาศเปิดที่ไหนบ้าง`));
  }
  const p = ctx.point;
  if (p && Number.isFinite(p.lat) && Number.isFinite(p.lon)) {
    add('streetview', p.role === 'station' ? 'Street View ใกล้สถานี' : 'Street View', streetViewURL(p.lat, p.lon));
  }
  return out;
}

/** The same actions for an English page: English questions, English names where the data has them. */
function contextActionsEnglish(ctx = {}) {
  const out = [], N = s => englishName(clean(s));
  const add = (id, label, href) => { if (href) out.push({id, label, href, note: ''}); };
  const where = ctx.area ? [N(ctx.area.place), N(ctx.area.province)].filter(Boolean).join(', ') : '';
  if (ctx.kind === 'hotel' && ctx.row) {
    const r = ctx.row, name = N(r.name || r.nameEn);
    add('ai', 'ถาม Google AI', googleAskURL(`${name}${where ? ` (${where})` : ''}: is it still open, what are room rates now, what do recent reviews say, and how do I get there from the airport or a station?`));
    add('maps', 'Google Maps', mapsSearchURL(join(name, N(ctx.area?.place), N(ctx.area?.province))));
  } else if (ctx.kind === 'building') {
    const names = [...new Set((ctx.rows || []).map(r => N(r.name || r.nameEn)).filter(Boolean))].slice(0, 2);
    add('ai', 'ถาม Google AI', googleAskURL(`Are ${names.join(' and ')}${where ? ` (${where})` : ''} in the same building, and what else is in it?`));
  } else if (ctx.kind === 'area' && ctx.area) {
    add('ai', 'ถาม Google AI', googleAskURL(`Hotels and places to stay in ${where}: which neighbourhoods are good to stay in, what are prices now, and which rail lines or sights are near?`));
    add('maps', 'Google Maps', mapsSearchURL(`hotel ${where}`));
  } else if (ctx.kind === 'station' && ctx.station) {
    const s = ctx.station, station = N(s.name);
    add('ai', 'ถาม Google AI', googleAskURL(`Hotels near ${station} station: where are they, how many minutes' walk, and what are prices and reviews now?`));
    add('maps', 'Google Maps', mapsSearchURL(`hotel near ${station} station`));
  } else if (ctx.kind === 'chain' && ctx.chain) {
    add('ai', 'ถาม Google AI', googleAskURL(`How many hotels does ${clean(ctx.chain.name)} have in Thailand, which brands, and where has it announced new hotels?`));
  } else if (ctx.kind === 'overview') {
    const place = N(ctx.province) || 'Thailand';
    add('ai', 'ถาม Google AI', googleAskURL(`Latest overview of hotel rooms in ${place}: how is occupancy, and where have new hotels opened or been announced?`));
  }
  const p = ctx.point;
  if (p && Number.isFinite(p.lat) && Number.isFinite(p.lon)) add('streetview', p.role === 'station' ? 'Street View ใกล้สถานี' : 'Street View', streetViewURL(p.lat, p.lon));
  return out;
}

const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));

/** The action bar (icon + short label). '' when nothing applies. */
export function actionBar(ctx) {
  const list = contextActions(ctx);
  if (!list.length) return '';
  return `<div class="ask-bar" role="group" aria-label="ค้นต่อใน Google">${list.map(a => `<a class="ask-link ask-${esc(a.id)}" href="${esc(a.href)}" target="_blank" rel="noopener noreferrer"${a.note ? ` title="${esc(a.note)}"` : ''}><i class="pictogram pic-${a.id === 'ai' ? 'ai' : a.id === 'streetview' ? 'streetview' : 'maps'}" aria-hidden="true"></i><span>${esc(a.label)}</span></a>`).join('')}</div>`;
}
