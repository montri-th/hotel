/**
 * Chart models — every chart describes scopeRows (filters before any area selection) over the same membership as
 * the map (the row's own matched district) and the same measure (rooms recorded, or records). Ranking and top-N
 * trimming happen only after every district has been summarised.
 */
import {rankAreas, chainsIn} from './profile-model.js';
import {rowValue} from './model.js';

export function buildChartModel(rows, index, groups, {limit = 20, metric = 'rooms'} = {}) {
  const list = Array.isArray(rows) ? rows : [];
  const ranking = rankAreas(list, index, {metric}).filter(a => a.value > 0);
  const unplaced = list.filter(r => !r.area);
  return {metric, areas: ranking.slice(0, limit), totalAreas: ranking.length, values: ranking.map(a => a.value), groups, totalRows: list.length,
    placedRows: list.length - unplaced.length, unplacedValue: unplaced.reduce((s, r) => s + rowValue(r, metric), 0)};
}

/** District × accommodation group matrix of the measure (equal cells; zero is a measured 0 in this selection). */
export function areaMatrix(model, {areaLimit = 12} = {}) {
  const areas = model.areas.slice(0, areaLimit);
  const groups = model.groups;
  const cells = areas.flatMap(a => {
    const values = new Array(groups.length).fill(0), counts = new Array(groups.length).fill(0);
    for (const r of a.rows) { values[r.group] += rowValue(r, model.metric); counts[r.group]++; }
    // Rooms: a cell whose records all have unknown rooms is unknown, never a measured 0.
    return groups.map(g => ({areaId: a.id, areaName: a.name, groupId: g.id, group: g.index, groupName: g.th, value: values[g.index], count: counts[g.index],
      unknown: model.metric === 'rooms' && counts[g.index] > 0 && !values[g.index], total: a.value}));
  });
  return {areas, groups, cells, max: Math.max(0, ...cells.map(c => c.value))};
}

/** Hotel groups (chains) of the selection ranked by the measure; every group counted, the list cut after ranking. */
export function chainRanking(rows, {limit = 20, metric = 'rooms'} = {}) {
  const all = chainsIn(Array.isArray(rows) ? rows : [], Infinity, metric);
  return {chains: all.slice(0, limit), total: all.length};
}
