/**
 * Hotel · page language (citymeter-shell 0.5.1, js/shell/i18n.js). js/app.js imports this module first, so an
 * English page is translated before anything renders. The words are in js/lang-en.js. Names come from the data's own
 * English and are never translated here (demo-platform-review §5.8): provinces and districts from the area index
 * (OpenGISData-Thailand names, DOPA-credited, data/area-index.json metadata.englishNames), stations from their nameEn,
 * shopping centres from their nameEn (CityMETER Shopping centers), accommodation groups from groups[].en, a stay from
 * its English name (cols.nameEn) or the name its brand lists now (data.currentNames). A name without English stays
 * Thai (keepThai).
 */
import {LANG, registerDictionary, registerNames, keepThai, startTranslation} from './shell/i18n.js';
import HOTEL_EN from './lang-en.js';

const THAI = /[ก-ฺเ-๎]/;

if (LANG === 'en') {
  registerDictionary(HOTEL_EN);
  startTranslation();
  // The English is a draft until reviewed (demo-platform-review §5.8): the help dialog says so.
  const note = () => {
    const intro = document.querySelector('.usage-dialog .help-intro');
    if (!intro || document.getElementById('draft-english-note')) return;
    const p = document.createElement('p');
    p.id = 'draft-english-note';
    p.className = 'help-intro';
    p.textContent = 'English is a draft translation from the Thai. Names with no English in the data stay in Thai, and the product statement is in Thai.';
    intro.after(p);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', note, {once: true}); else note();
}

/** Register the English the data carries. index = js/areas.js buildAreaIndex, data = js/model.js decodeDataset. */
export function registerDataNames({index, data}) {
  if (LANG !== 'en') return;
  const labels = {};
  for (const g of data?.groups || []) if (g.th && g.en) labels[g.th] = g.en;
  registerDictionary({exact: labels});
  const pairs = [];
  for (const p of index?.provinces || []) if (p.nameEn) pairs.push([p.name, p.nameEn], [`จังหวัด${p.name}`, p.nameEn]);
  const bangkok = (index?.provinces || []).find(p => p.id === 'BKK')?.nameEn;
  if (bangkok) pairs.push(['กรุงเทพฯ', bangkok], ['กรุงเทพ', bangkok]);
  for (const a of index?.areas || []) {
    if (!a.nameEn) continue;
    pairs.push([a.name, a.nameEn], [`${a.province === 'BKK' ? 'เขต' : 'อำเภอ'}${a.name}`, a.nameEn]);
  }
  // Stations: the name alone, with “สถานี”, and with their lines as js/panel.js writes them (“อโศก (สุขุมวิท)”).
  const lineEn = l => (THAI.test(l) ? HOTEL_EN.exact[l] || null : l);
  const thaiStations = [];
  for (const s of data?.stations || []) {
    if (!s.nameEn) {
      // A station without English stays Thai, with its lines as js/panel.js writes them.
      const th = s.lines?.length ? `${s.name} (${s.lines.join(' · ')})` : '';
      thaiStations.push(s.name, `สถานี${s.name}`, ...(th ? [th, `สถานี${th}`] : []));
      continue;
    }
    pairs.push([s.name, s.nameEn], [`สถานี${s.name}`, `${s.nameEn} station`]);
    const lines = (s.lines || []).map(lineEn);
    if (s.lines?.length && lines.every(Boolean)) {
      const th = `${s.name} (${s.lines.join(' · ')})`, en = `(${lines.join(' · ')})`;
      pairs.push([th, `${s.nameEn} ${en}`], [`สถานี${th}`, `${s.nameEn} station ${en}`]);
    }
  }
  for (const v of data?.retail || []) if (v.name && v.nameEn) pairs.push([v.name, v.nameEn]);
  // A stay reads its English name; a Thai name without one stays Thai, and so does a recorded name in Thai.
  const thaiNames = [];
  for (const r of data?.rows || []) {
    if (r.name && THAI.test(r.name)) (r.nameEn && !THAI.test(r.nameEn) ? pairs.push([r.name, r.nameEn]) : thaiNames.push(r.name));
    if (r.recorded?.name && THAI.test(r.recorded.name)) thaiNames.push(r.recorded.name);
  }
  registerNames(pairs);
  keepThai([...thaiNames, ...thaiStations]);
}

/** On an English page the line under a stay's English heading is its Thai name, marked as Thai and left alone. */
export const thaiSubName = r => (LANG === 'en' && !r?.recorded && r?.name && THAI.test(r.name) && r.nameEn && !THAI.test(r.nameEn) ? r.name : '');
