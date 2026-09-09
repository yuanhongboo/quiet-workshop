import test from 'node:test';
import assert from 'node:assert/strict';
import { SEASONS, SEASON_FOUR, SEASON_THREE, seasonLevelIds } from '../src/season.mjs';
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
test('three completed seasons remain byte-identical while the fourth starts empty',()=>{
  const storage=memory();
  for(const season of SEASONS.slice(0,SEASONS.indexOf(SEASON_FOUR)))for(const id of seasonLevelIds(season))finish(storage,id);
  markChapterVisited(storage,SEASON_THREE,SEASON_THREE.chapters[0].id);
  const oldEntries=[...storage.entries];
  assert.equal(seasonProgress(storage,SEASON_FOUR).completedIds.size,0);
  assert.equal(levelUnlocked(storage,getLevel(SEASON_FOUR.openingId)),false);
  assert.equal(pendingChapterVisit(storage,SEASON_FOUR),null);
  const chapter=SEASON_FOUR.chapters[0];
  for(const id of chapter.levelIds)finish(storage,id);
  assert.equal(pendingChapterVisit(storage,SEASON_FOUR),chapter);
  assert.equal(markChapterVisited(storage,SEASON_FOUR,chapter.id),true);
  for(const [key,value] of oldEntries)assert.equal(storage.getItem(key),value,key);
  assert.notEqual(chapterVisitKey(SEASON_FOUR),chapterVisitKey(SEASON_THREE));
});
test('station chapter returns and its final train remain earned across replay',()=>{
  const storage=memory();
  const [first,second]=SEASON_FOUR.chapters;
  for(const id of [...first.levelIds,...second.levelIds])finish(storage,id);
  assert.equal(pendingChapterVisit(storage,SEASON_FOUR),first);
  markChapterVisited(storage,SEASON_FOUR,first.id);
  assert.equal(pendingChapterVisit(storage,SEASON_FOUR),second);
  markChapterVisited(storage,SEASON_FOUR,second.id);
  for(const id of SEASON_FOUR.restorationIds)finish(storage,id);
  assert.equal(levelUnlocked(storage,getLevel(SEASON_FOUR.openingId)),true);
  resetLevel(storage,getLevel('station-sign'));
  assert.equal(seasonProgress(storage,SEASON_FOUR).restoredIds.size,8);
  assert.equal(pendingChapterVisit(storage,SEASON_FOUR),null);
  assert.equal(seenChapters(storage,SEASON_FOUR).size,2);
  finish(storage,SEASON_FOUR.openingId);
  assert.equal(seasonProgress(storage,SEASON_FOUR).finished,true);
  for(const season of SEASONS.filter(season=>season!==SEASON_FOUR))assert.equal(seasonProgress(storage,season).completedIds.size,0);
});
