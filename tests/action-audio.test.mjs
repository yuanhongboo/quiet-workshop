import test from 'node:test';
import assert from 'node:assert/strict';
import { ActionController } from '../src/action-controller.mjs';
import { makeState } from '../src/core.mjs';

test('configured task cues play once after prerequisites and never on blocked repeat input', () => {
  const level={id:'cue-fixture',surfaces:[],items:[],operation:{kind:'tasks',tasks:[
    {id:'first',mode:'tap',target:1,sound:'bell'},
    {id:'second',mode:'tap',target:1,requires:['first'],sound:'whistle'},
  ]}};
  const state=makeState(null,level),events=[];
  const controller=Object.assign(Object.create(ActionController.prototype),{
    context:()=>({state}),audio:{play:(...args)=>events.push(args)},stop(){},changed(){},
  });
  controller.tap('second');assert.equal(events.length,0);
  controller.tap('first');controller.tap('first');
  assert.equal(events.length,1);assert.equal(events[0][3],'bell');
  controller.tap('second');controller.tap('second');
  assert.equal(events.length,2);assert.equal(events[1][3],'whistle');
});
