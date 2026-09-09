import test from 'node:test';
import assert from 'node:assert/strict';
import { ALL_LEVELS, GARDEN_LEVELS, POST_LEVELS, STATION_LEVELS, BOOK_LEVELS, LEVELS, getLevel, nextLevel } from '../src/levels.mjs';
import { SEASON, SEASON_TWO, SEASON_THREE, SEASON_FOUR, SEASONS, seasonForLevel, seasonLevelIds } from '../src/season.mjs';
import { makeState, packState, unpackState } from '../src/core.mjs';
import { readLevel, saveLevel, resetLevel, seasonProgress, collectionStatus, levelUnlocked, seasonSaveKey } from '../src/progress.mjs';
import { nearestAngle, nextInspectionAngle } from '../src/inspection.mjs';
const storage=()=>{const data=new Map();return {getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)}};
const finished=level=>{const s=makeState(null,level);s.surfaces.forEach(f=>f.finish());level.items.forEach(i=>s.placed.add(i.id));s.taskFields.forEach(f=>f.finish());for(const t of level.operation.tasks||[])s.taskValues[t.id]=t.target??1;s.operationValue=level.operation.target??s.operationValue;s.brewTime=level.operation.duration;s.completed=true;return s;};

test('all catalogs keep stable earlier IDs and route 45 levels within their own season',()=>{
 assert.equal(LEVELS.length,9);assert.equal(GARDEN_LEVELS.length,9);assert.equal(POST_LEVELS.length,9);assert.equal(STATION_LEVELS.length,9);assert.equal(BOOK_LEVELS.length,9);assert.equal(new Set(ALL_LEVELS.map(l=>l.id)).size,45);
 for(const season of SEASONS){assert.equal(season.chapters.length,3);assert.equal(seasonLevelIds(season).length,9);for(const id of seasonLevelIds(season)){assert.equal(getLevel(id).id,id);assert.equal(seasonForLevel(id),season);assert.equal(seasonForLevel(nextLevel(id)),season);}}
 assert.equal(nextLevel('opening').id,'coffee');assert.equal(nextLevel('garden-awakening').id,'garden-pot');assert.equal(nextLevel('post-opening').id,'post-box');assert.equal(nextLevel('station-opening').id,'station-sign');assert.equal(nextLevel('book-opening').id,'book-cover');
});
test('finishing all of season one cannot unlock or grant any second-season restoration',()=>{
 const store=storage();for(const l of LEVELS)assert.equal(saveLevel(store,finished(l)),true);
 assert.equal(seasonProgress(store,SEASON).finished,true);assert.equal(seasonProgress(store,SEASON_TWO).completedIds.size,0);
 assert.equal(levelUnlocked(store,getLevel('garden-awakening')),false);assert.equal(collectionStatus(store,SEASON_TWO).length,9);
});
test('second-season replay retains its earned stamp without changing first-season saves',()=>{
 const store=storage();const coffee=finished(getLevel('coffee'));saveLevel(store,coffee);
 const old=packState(makeState(readLevel(store,getLevel('coffee')),getLevel('coffee')));
 for(const id of SEASON_TWO.restorationIds)saveLevel(store,finished(getLevel(id)));
 assert.equal(seasonProgress(store,SEASON_TWO).canOpen,true);assert.equal(seasonProgress(store,SEASON).completedIds.size,1);
 assert.equal(resetLevel(store,getLevel('garden-pot')),true);assert.equal(readLevel(store,getLevel('garden-pot')).completed,false);
 assert.equal(seasonProgress(store,SEASON_TWO).completedIds.size,8);assert.equal(levelUnlocked(store,getLevel('garden-awakening')),true);
 assert.equal(packState(makeState(readLevel(store,getLevel('coffee')),getLevel('coffee'))),old);
 assert.notEqual(seasonSaveKey(SEASON),seasonSaveKey(SEASON_TWO));
});
test('partial cleaning and finished states resume for each new level without crossing IDs',()=>{
 for(const level of GARDEN_LEVELS){const state=makeState(null,level);state.surfaces[0]?.scrub(.3,.4,.2,.08);const raw=packState(state);const restored=unpackState(raw,level);assert.ok(restored,level.id);assert.equal(unpackState(raw,getLevel('coffee')),null);assert.ok(unpackState(packState(finished(level)),level),level.id);}
});
test('inspection takes the short arc across wrap and visits the reverse side',()=>{
 assert.ok(Math.abs(nearestAngle(Math.PI-.1,-Math.PI+.1)-(Math.PI+.1))<1e-9);
 let angle=.28;const normals=[];for(let i=0;i<4;i++){angle=nextInspectionAngle(angle);normals.push(Math.cos(angle));}
 assert.ok(normals.some(x=>x<-.99));assert.ok(Math.abs(nearestAngle(angle,.28)-angle)<1e-9);
 assert.equal(nearestAngle(NaN,0),0);
});
