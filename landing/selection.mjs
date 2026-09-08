import { seasonLevelIds } from '../src/season.mjs';

// The landing page only chooses a route. Earned stamps and attempt saves are
// owned by the game and are never rewritten here.
export function landingSelection(season, rows, selectedId) {
  const ids=seasonLevelIds(season);
  const completed=rows.filter(row=>row.restored).length;
  const eligible=rows.filter(row=>row.unlocked);
  const recent=eligible.find(row=>row.level.id===selectedId&&row.started&&!row.completed);
  const partial=recent||eligible.find(row=>row.started&&!row.completed);
  if(partial)return {id:partial.level.id,label:'继续收拾',started:true};
  if(completed===ids.length)return {id:season.openingId,label:`看看我的${season.overviewName||'小店'}`,started:true};
  const next=eligible.find(row=>!row.restored);
  return {id:next?.level.id||season.openingId,label:completed?'接着收拾':'开始收拾',started:completed>0};
}
