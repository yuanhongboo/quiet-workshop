import test from 'node:test';
import assert from 'node:assert/strict';
import { landingSelection } from '../landing/selection.mjs';
import { SEASON, SEASON_TWO, seasonLevelIds } from '../src/season.mjs';
const rows=season=>seasonLevelIds(season).map(id=>({level:{id},completed:false,restored:false,unlocked:id!==season.openingId,started:false}));
test('new visitors start each season in its first unlocked level',()=>{for(const season of [SEASON,SEASON_TWO])assert.equal(landingSelection(season,rows(season),'unknown').id,seasonLevelIds(season)[0]);});
test('continue prioritizes a selected partial attempt and never selects a locked finale',()=>{const list=rows(SEASON_TWO);list[1].started=true;list[4].started=true;list[8].started=true;assert.equal(landingSelection(SEASON_TWO,list,list[4].level.id).id,list[4].level.id);assert.equal(landingSelection(SEASON_TWO,list,list[8].level.id).id,list[1].level.id);});
test('a partial replay stays resumable after every permanent stamp is earned',()=>{const list=rows(SEASON_TWO).map(row=>({...row,unlocked:true,restored:true,completed:true}));list[3].completed=false;list[3].started=true;const copy=JSON.stringify(list);assert.equal(landingSelection(SEASON_TWO,list,list[3].level.id).label,'继续收拾');assert.equal(landingSelection(SEASON_TWO,list,list[3].level.id).id,list[3].level.id);assert.equal(JSON.stringify(list),copy);});
test('earned results suggest the next unrestored scene and a finished season opens its overview',()=>{const list=rows(SEASON);list[0].restored=true;list[0].completed=true;assert.equal(landingSelection(SEASON,list,'coffee').id,'desk');list.forEach(row=>Object.assign(row,{unlocked:true,restored:true,completed:true}));assert.equal(landingSelection(SEASON,list,'coffee').id,SEASON.openingId);});
