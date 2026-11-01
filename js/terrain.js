/**
 * Terrain context for stays where the land shapes the stay (owner 2026-11-01, point 2: “โรงแรมประเภทรีสอร์ท จะ
 * sensitive กับวิวสวยไม่สวย การอยู่ติดทะเล อยู่บนเนินเขา ที่สูง หุบเขา ในป่า … แค่พอดูออกว่าภูมิประเทศที่ตั้งอยู่เป็นอย่างไร”).
 *
 * Terrain mode switches on by itself at site scale only where the land has relief: 3D view on, not a building or a
 * stay being looked at (the two-point camera frames flat ground: the panel carries the terrain facts), zoom ≥ TERRAIN.minZoom
 * and the visible ground spans at least TERRAIN.reliefOn metres (p95 − p5 of a DEM sample of the view; off again
 * below TERRAIN.reliefOff or below TERRAIN.offZoom). Flat cities (Bangkok) never load terrain. In terrain mode:
 *  - the ground is 3D (MapLibre terrain, heights exaggerated × TERRAIN.exaggeration — the legend says so);
 *  - a quiet hillshade under water and roads (foundation tones of the theme, never a data colour);
 *  - the เขต/อำเภอ choropleth switches off from TERRAIN.minZoom (a hard switch, never a fade: data colours keep
 *    their opacity, LDS) so the relief is readable; outlines, pins, labels and buildings carry the reading.
 *
 * Terrain facts of a stay (hover card, hotel panel) are read on demand from the same DEM tiles and from the OSM
 * water and land-cover polygons the basemap has loaded: ground elevation, relief within 500 m, position against the
 * ring around it, the nearest ring (straight line) that reaches the sea, and tree cover within 300 m. They describe
 * the ground, never a view, a price or a risk.
 *
 * DEM: Terrain Tiles on AWS (Mapzen/Tilezen terrarium; SRTM 30 m over Thailand), fetched by the browser.
 */
import {SOURCE_ID} from './map-style.js';

export const TERRAIN = Object.freeze({exaggeration: 1.5, minZoom: 12.5, offZoom: 12.2, reliefOn: 30, reliefOff: 20, probeZoom: 11, factZoom: 13, demMaxZoom: 14});
export const DEM_TILES = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';
export const DEM_ATTRIBUTION = 'ภูมิประเทศ: <a href="https://registry.opendata.aws/terrain-tiles/" target="_blank" rel="noopener">Terrain Tiles on AWS</a> (Mapzen · SRTM)';
export const TERRAIN_SOURCES = Object.freeze({terrain: 'terrain-dem', hillshade: 'terrain-hillshade-dem'});
export const HILLSHADE_LAYER = 'terrain-hillshade';
/** Rings (m, straight line) tested for the sea, nearest first; none within the last → no sea chip. */
export const SEA_RINGS = Object.freeze([0, 150, 300, 600, 1200]);
export const RELIEF_RADIUS_M = 500;
export const TREE_RADIUS_M = 300;
/** |ground − mean of the 500 m ring| below this reads as level with its surroundings. */
export const POSITION_STEP_M = 15;

/** Terrarium RGB → metres. */
export const terrarium = (r, g, b) => r * 256 + g + b / 256 - 32768;

const tileOf = (lon, lat, z) => {
  const n = 2 ** z, s = Math.sin((lat * Math.PI) / 180);
  const xf = ((lon + 180) / 360) * n, yf = (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * n;
  return {x: Math.floor(xf), y: Math.floor(yf), px: Math.min(255, Math.floor((xf - Math.floor(xf)) * 256)), py: Math.min(255, Math.floor((yf - Math.floor(yf)) * 256))};
};

const demCache = new Map();
/** Decoded DEM tile (RGBA bytes of 256 × 256) or null when it cannot be read. Browser only. */
export function demTile(z, x, y) {
  const key = `${z}/${x}/${y}`;
  if (!demCache.has(key)) {
    demCache.set(key, new Promise(resolve => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.decoding = 'async';
      img.onload = () => {
        try {
          const canvas = typeof OffscreenCanvas === 'function' ? new OffscreenCanvas(256, 256) : Object.assign(document.createElement('canvas'), {width: 256, height: 256});
          const ctx = canvas.getContext('2d', {willReadFrequently: true});
          ctx.drawImage(img, 0, 0);
          resolve(ctx.getImageData(0, 0, 256, 256).data);
        } catch { resolve(null); }
      };
      img.onerror = () => resolve(null);
      img.src = DEM_TILES.replace('{z}', z).replace('{x}', x).replace('{y}', y);
    }));
    if (demCache.size > 400) demCache.delete(demCache.keys().next().value);
  }
  return demCache.get(key);
}

/** Ground elevation (m) at a point, or null. */
export async function elevationAt(lon, lat, z = TERRAIN.factZoom) {
  const t = tileOf(lon, lat, z);
  const d = await demTile(z, t.x, t.y);
  if (!d) return null;
  const i = (t.py * 256 + t.px) * 4;
  return terrarium(d[i], d[i + 1], d[i + 2]);
}

/** Robust relief of a lon/lat box: p95 − p5 of an n × n sample (m), or null. */
export async function reliefOf([west, south, east, north], {z = TERRAIN.probeZoom, n = 14} = {}) {
  const values = [];
  const jobs = [];
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const lon = west + ((i + 0.5) / n) * (east - west), lat = south + ((j + 0.5) / n) * (north - south);
    jobs.push(elevationAt(lon, lat, z).then(v => { if (Number.isFinite(v) && v > -50) values.push(v); }));
  }
  await Promise.all(jobs);
  if (values.length < n) return null;
  values.sort((a, b) => a - b);
  const q = p => values[Math.min(values.length - 1, Math.floor(p * values.length))];
  return q(0.95) - q(0.05);
}

const offset = (lon, lat, dx, dy) => [lon + dx / (111320 * Math.cos((lat * Math.PI) / 180)), lat + dy / 110540];
const ring = (lon, lat, r, n) => Array.from({length: n}, (_, i) => offset(lon, lat, r * Math.cos((2 * Math.PI * i) / n), r * Math.sin((2 * Math.PI * i) / n)));
const inRing = ([x, y], r) => { let a = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, yi] = r[i], [xj, yj] = r[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) a = !a; } return a; };
const polys = g => (!g ? [] : g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : []);
const inGeom = (pt, g) => polys(g).some(p => inRing(pt, p[0]) && !p.slice(1).some(h => inRing(pt, h)));

/**
 * Pure: the facts from the samples. elevations = {at, ring500: [16], ring250: [8]}; seaBand = first ring (m) reaching
 * the sea or null; treeShare = share 0–1 of the 300 m grid under tree cover, or null when the land cover is unmapped.
 */
export function factsFrom({at, ring500 = [], ring250 = []}, {seaBand = null, treeShare = null} = {}) {
  if (!Number.isFinite(at)) return null;
  const all = [at, ...ring500, ...ring250].filter(Number.isFinite);
  const outer = ring500.filter(Number.isFinite);
  const mean = outer.length ? outer.reduce((a, b) => a + b, 0) / outer.length : at;
  const above = at - mean;
  return {
    elevation: Math.round(Math.max(0, at)), relief: Math.round(Math.max(...all) - Math.min(...all)),
    above: Math.round(above), position: above >= POSITION_STEP_M ? 'higher' : above <= -POSITION_STEP_M ? 'lower' : 'level',
    seaBand, treeShare: treeShare === null ? null : Math.round(treeShare * 100) / 100,
  };
}

/**
 * Short icon chips for a card or the panel (owner 2026-11-01: icons instead of long text). Each chip:
 * {kind: pictogram role, text, title}. Unknown facts are left out, never shown as 0.
 */
export function terrainChips(f, {num = v => String(v)} = {}) {
  if (!f) return [];
  const chips = [{kind: 'elevation', text: `${num(f.elevation)} ม.`, title: `พื้นดินสูงจากระดับทะเลราว ${num(f.elevation)} ม.`}];
  if (f.relief >= 5) chips.push({kind: 'relief', text: `ต่างระดับ ${num(f.relief)} ม.`, title: `ความสูงพื้นดินต่างกัน ${num(f.relief)} ม. ในรัศมี ${num(RELIEF_RADIUS_M)} ม.`});
  if (f.position !== 'level') chips.push({kind: 'relief', text: f.position === 'higher' ? `สูงกว่ารอบข้าง ${num(f.above)} ม.` : `ต่ำกว่ารอบข้าง ${num(-f.above)} ม.`,
    title: `เทียบกับค่าเฉลี่ยของวงรัศมี ${num(RELIEF_RADIUS_M)} ม.`});
  if (f.seaBand !== null) chips.push({kind: 'sea', text: f.seaBand === 0 ? 'จุดอยู่บนทะเล' : `ทะเล ≤ ${num(f.seaBand)} ม.`, title: f.seaBand === 0 ? 'จุดของที่พักอยู่บนพื้นน้ำทะเลในแผนที่' : `มีทะเลภายใน ${num(f.seaBand)} ม. (ระยะตรง)`});
  // Tree cover is positive evidence only: OSM land cover missing around a stay is not 0 % trees.
  if (f.treeShare > 0) chips.push({kind: 'forest', text: `ต้นไม้ ${Math.round(f.treeShare * 100)}%`, title: `สัดส่วนพื้นที่ป่าและต้นไม้ในรัศมี ${num(TREE_RADIUS_M)} ม. ตามแผนที่ OSM`});
  return chips;
}

const factCache = new Map();
/**
 * Terrain facts of a row with a point (cached per row). The sea and tree cover come from the basemap tiles loaded
 * for the current view, so they are read while the stay is on screen; outside the loaded area they stay unknown.
 */
export async function terrainFacts(map, row) {
  if (!row || !Number.isFinite(row.longitude) || !Number.isFinite(row.latitude)) return null;
  if (factCache.has(row.id)) return factCache.get(row.id);
  const {longitude: lon, latitude: lat} = row;
  const [at, ring500, ring250] = await Promise.all([elevationAt(lon, lat), Promise.all(ring(lon, lat, RELIEF_RADIUS_M, 16).map(([x, y]) => elevationAt(x, y))), Promise.all(ring(lon, lat, 250, 8).map(([x, y]) => elevationAt(x, y)))]);
  let seaBand = null, treeShare = null;
  try {
    const sea = map.querySourceFeatures(SOURCE_ID, {sourceLayer: 'water', filter: ['==', ['get', 'class'], 'ocean']});
    if (sea.length) for (const d of SEA_RINGS) {
      const pts = d ? ring(lon, lat, d, 24) : [[lon, lat]];
      if (pts.some(p => sea.some(f => inGeom(p, f.geometry)))) { seaBand = d; break; }
    }
    const cover = map.querySourceFeatures(SOURCE_ID, {sourceLayer: 'landcover'});
    if (cover.length) {
      const wood = cover.filter(f => f.properties?.class === 'wood');
      const grid = [];
      for (let dx = -TREE_RADIUS_M; dx <= TREE_RADIUS_M; dx += 75) for (let dy = -TREE_RADIUS_M; dy <= TREE_RADIUS_M; dy += 75) if (dx * dx + dy * dy <= TREE_RADIUS_M ** 2) grid.push(offset(lon, lat, dx, dy));
      treeShare = grid.filter(p => wood.some(f => inGeom(p, f.geometry))).length / grid.length;
    }
  } catch { /* the basemap is not ready: sea and trees stay unknown */ }
  const facts = factsFrom({at, ring500, ring250}, {seaBand, treeShare});
  if (facts && (seaBand !== null || treeShare !== null)) factCache.set(row.id, facts);
  return facts;
}

/**
 * Mount terrain mode on a map (after style.load). options.colors: {shadow, highlight, accent}; options.onChange(active).
 * Returns {setEnabled(on3d), evaluate(), active(), retheme(colors), dispose()}.
 */
export function installTerrain(map, {beforeId = 'water', colors = {}, onChange = null, exaggeration = TERRAIN.exaggeration} = {}) {
  let enabled = true, mode = false, token = 0, timer = 0, palette = colors;
  const hasLayer = id => Boolean(map.getLayer(id));
  function ensure() {
    if (!map.getSource(TERRAIN_SOURCES.terrain)) map.addSource(TERRAIN_SOURCES.terrain, {type: 'raster-dem', tiles: [DEM_TILES], encoding: 'terrarium', tileSize: 256, maxzoom: TERRAIN.demMaxZoom, attribution: DEM_ATTRIBUTION});
    // A second source for the hillshade (MapLibre recommends one raster-dem source per use).
    if (!map.getSource(TERRAIN_SOURCES.hillshade)) map.addSource(TERRAIN_SOURCES.hillshade, {type: 'raster-dem', tiles: [DEM_TILES], encoding: 'terrarium', tileSize: 256, maxzoom: TERRAIN.demMaxZoom});
    if (!hasLayer(HILLSHADE_LAYER)) {
      map.addLayer({id: HILLSHADE_LAYER, type: 'hillshade', source: TERRAIN_SOURCES.hillshade, layout: {visibility: 'none'}, paint: hillshadePaint(palette)}, map.getLayer(beforeId) ? beforeId : undefined);
    }
  }
  function setMode(on) {
    if (on === mode) return;
    mode = on;
    if (on) {
      ensure();
      map.setLayoutProperty(HILLSHADE_LAYER, 'visibility', 'visible');
      map.setTerrain({source: TERRAIN_SOURCES.terrain, exaggeration});
      // Symbols placed before the first DEM tile arrives can stay hidden until the terrain is set again (seen in
      // the mockup, MapLibre 5.6.2): re-apply once when the terrain source has loaded.
      const refresh = e => {
        if (e.sourceId !== TERRAIN_SOURCES.terrain || !e.isSourceLoaded) return;
        map.off('sourcedata', refresh);
        if (mode) { map.setTerrain(null); map.setTerrain({source: TERRAIN_SOURCES.terrain, exaggeration}); }
      };
      map.on('sourcedata', refresh);
    } else {
      map.setTerrain(null);
      if (hasLayer(HILLSHADE_LAYER)) map.setLayoutProperty(HILLSHADE_LAYER, 'visibility', 'none');
    }
    onChange?.(mode);
  }
  async function evaluate() {
    const my = ++token, zoom = map.getZoom();
    if (!enabled || zoom < TERRAIN.offZoom) { setMode(false); return; }
    if (zoom < TERRAIN.minZoom && !mode) return;
    const b = map.getBounds();
    const relief = await reliefOf([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()]);
    if (my !== token || relief === null) return;
    setMode(relief >= TERRAIN.reliefOn || (mode && relief >= TERRAIN.reliefOff));
  }
  const schedule = () => { clearTimeout(timer); timer = setTimeout(evaluate, 120); };
  map.on('moveend', schedule);
  return {
    /** Off at once (before a camera move: the building camera frames flat ground); on is decided at the next move end. */
    setEnabled(on) { enabled = Boolean(on); if (!enabled) { clearTimeout(timer); token++; setMode(false); } else schedule(); },
    evaluate,
    active: () => mode,
    retheme(next) { palette = next || palette; if (hasLayer(HILLSHADE_LAYER)) for (const [k, v] of Object.entries(hillshadePaint(palette))) map.setPaintProperty(HILLSHADE_LAYER, k, v); },
    dispose() {
      clearTimeout(timer); token++;
      map.off('moveend', schedule);
      try { if (mode) map.setTerrain(null); } catch { /* style already gone */ }
      if (hasLayer(HILLSHADE_LAYER)) map.removeLayer(HILLSHADE_LAYER);
      for (const id of Object.values(TERRAIN_SOURCES)) if (map.getSource(id)) map.removeSource(id);
      mode = false;
    },
  };
}

/** Quiet hillshade in the theme's foundation tones (light: ink shadow, white highlight; dark: black shadow). */
export function hillshadePaint({shadow = '#182327', highlight = '#FFFFFF', accent = '#7B877D', dark = false} = {}) {
  return {'hillshade-exaggeration': dark ? 0.7 : 0.55, 'hillshade-illumination-direction': 315, 'hillshade-shadow-color': shadow, 'hillshade-highlight-color': highlight, 'hillshade-accent-color': accent};
}
