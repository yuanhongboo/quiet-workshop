import test from 'node:test';
import assert from 'node:assert/strict';
import { SEASONS, SEASON_SIX, SEASON_FIVE, seasonLevelIds } from '../src/season.mjs';
import { getLevel } from '../src/levels.mjs';
import { makeState } from '../src/core.mjs';
import { saveLevel, resetLevel, seasonProgress, levelUnlocked } from '../src/progress.mjs';
import { chapterVisitKey, markChapterVisited, pendingChapterVisit, seenChapters } from '../src/chapter-progress.mjs';
const memory = () => { const entries=new Map(); return {entries,getItem:key=>entries.get(key)??null,setItem:(key,value)=>entries.set(key,value)}; };
function finish(storage,id) {
  const level=getLevel(id),state=makeState(null,level);
  state.surfaces.forEach(field=>field.finish()); level.items.forEach(item=>state.placed.add(item.id));
  state.taskFields.forEach(field=>field.finish()); for(const task of level.operation.tasks||[])state.taskValues[task.id]=task.target??1;
  state.operationValue=level.operation.target??state.operationValue;state.brewTime=level.operation.duration;state.completed=true;
  assert.equal(saveLevel(storage,state),true);
}
test('five completed seasons remain byte-identical while the sixth starts empty',()=>{
  const storage=memory();
  for(const season of SEASONS.slice(0,SEASONS.indexOf(SEASON_SIX)))for(const id of seasonLevelIds(season))finish(storage,id);
  markChapterVisited(storage,SEASON_FIVE,SEASON_FIVE.chapters[0].id);
  const oldEntries=[...storage.entries];
  assert.equal(seasonProgress(storage,SEASON_SIX).completedIds.size,0);
  assert.equal(levelUnlocked(storage,getLevel(SEASON_SIX.openingId)),false);
  assert.equal(pendingChapterVisit(storage,SEASON_SIX),null);
  const chapter=SEASON_SIX.chapters[0];
  for(const id of chapter.levelIds)finish(storage,id);
  assert.equal(pendingChapterVisit(storage,SEASON_SIX),chapter);
  assert.equal(markChapterVisited(storage,SEASON_SIX,chapter.id),true);
  for(const [key,value] of oldEntries)assert.equal(storage.getItem(key),value,key);
  assert.notEqual(chapterVisitKey(SEASON_SIX),chapterVisitKey(SEASON_FIVE));
});
test('bakery chapter returns and its completed storefront remain earned across replay',()=>{
  const storage=memory();
  const [first,second]=SEASON_SIX.chapters;
  for(const id of [...first.levelIds,...second.levelIds])finish(storage,id);
  assert.equal(pendingChapterVisit(storage,SEASON_SIX),first);
  markChapterVisited(storage,SEASON_SIX,first.id);
  assert.equal(pendingChapterVisit(storage,SEASON_SIX),second);
  markChapterVisited(storage,SEASON_SIX,second.id);
  for(const id of SEASON_SIX.restorationIds)finish(storage,id);
  assert.equal(levelUnlocked(storage,getLevel(SEASON_SIX.openingId)),true);
  resetLevel(storage,getLevel('bake-oven'));
  assert.equal(seasonProgress(storage,SEASON_SIX).restoredIds.size,8);
  assert.equal(pendingChapterVisit(storage,SEASON_SIX),null);
  assert.equal(seenChapters(storage,SEASON_SIX).size,2);
  finish(storage,SEASON_SIX.openingId);
  assert.equal(seasonProgress(storage,SEASON_SIX).finished,true);
  for(const season of SEASONS.filter(season=>season!==SEASON_SIX))assert.equal(seasonProgress(storage,season).completedIds.size,0);
});
