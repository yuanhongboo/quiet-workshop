import test from 'node:test';
import assert from 'node:assert/strict';
import {
  makeState,
  packState,
  unpackState,
  stageFor,
  beginFinale,
  advanceFinale,
} from '../src/core.mjs';
import { PLANT, CLOCK } from '../src/restoration-levels.mjs';
import { WINDOW, SIGN } from '../src/finishing-levels.mjs';
import { OPENING } from '../src/shop-level.mjs';
import {
  taskComplete,
  taskAvailable,
  canWorkOnTasks,
  nextTask,
  completeTask,
  setTaskValue,
  advanceTask,
  scrubTask,
  taskLabel,
} from '../src/task-actions.mjs';

function organized(level) {
  const state = makeState(null, level);
  state.surfaces.forEach((field) => field.finish());
  level.items.forEach((item) => state.placed.add(item.id));
  return state;
}
function reload(state) {
  const saved = unpackState(packState(state), state.level);
  assert.ok(saved, `${state.level.id} valid progress must survive a refresh`);
  return makeState(saved, state.level);
}
function paintAll(state, id) {
  for (let pass = 0; pass < 5 && !taskComplete(state, id); pass++) {
    for (let v = 0; v <= 1.03; v += 0.05)
      for (let u = 0; u <= 1.03; u += 0.05) scrubTask(state, id, u, v, 0.25, 0.05);
  }
}

test('tap, hold, dial and brush cannot run before both cleaning and placement finish', () => {
  for (const [level, id, mutate] of [
    [PLANT, 'prune-left', (state) => completeTask(state, 'prune-left')],
    [WINDOW, 'open-curtain', (state) => advanceTask(state, 'open-curtain', 0.1)],
    [CLOCK, 'set-time', (state) => setTaskValue(state, 'set-time', 610)],
    [SIGN, 'paint-sign', (state) => scrubTask(state, 'paint-sign', 0.1, 0.1, 0.2, 0.05)],
  ]) {
    const state = makeState(null, level),
      initial = state.taskValues[id];
    assert.equal(canWorkOnTasks(state), false);
    assert.ok(!mutate(state));
    assert.equal(state.taskValues[id], initial);
    state.surfaces.forEach((field) => field.finish());
    assert.ok(!mutate(state), `${level.id} should require placement too`);
    assert.equal(state.taskValues[id], initial);
  }
});

test('three independent pruning taps unlock watering only when all three are complete', () => {
  const state = organized(PLANT);
  assert.equal(stageFor(state), 'operate');
  assert.equal(beginFinale(state), false);
  assert.equal(nextTask(state).id, 'prune-left');
  assert.equal(advanceTask(state, 'water', 0.1), false);
  assert.equal(completeTask(state, 'prune-low'), true);
  assert.equal(completeTask(state, 'prune-left'), true);
  assert.equal(completeTask(state, 'prune-left'), false, 'a second tap must not count twice');
  assert.equal(taskAvailable(state, 'water'), false);
  assert.equal(completeTask(state, 'prune-right'), true);
  assert.equal(nextTask(state).id, 'water');
  assert.equal(advanceTask(state, 'water', 0.1), true);
});

test('a held action pauses without losing progress, survives refresh, and caps background frame gaps', () => {
  let state = organized(WINDOW);
  completeTask(state, 'sew-button');
  for (let i = 0; i < 8; i++) advanceTask(state, 'open-curtain', 0.08);
  const partial = state.taskValues['open-curtain'];
  assert.ok(partial > 0 && partial < 1);
  for (let i = 0; i < 300; i++) advanceFinale(state, 0.1);
  assert.equal(
    state.taskValues['open-curtain'],
    partial,
    'no held input means no automatic progress',
  );
  state = reload(state);
  assert.equal(state.taskValues['open-curtain'], partial);
  for (const dt of [NaN, Infinity, -0.1, 0])
    assert.equal(advanceTask(state, 'open-curtain', dt), false);
  assert.equal(advanceTask(state, 'open-curtain', 600), true);
  assert.ok(
    Math.abs(state.taskValues['open-curtain'] - partial - 0.027) < 1e-10,
    'a delayed frame must advance at most 100 ms',
  );
  for (let i = 0; i < 100; i++) advanceTask(state, 'open-curtain', 0.1);
  assert.equal(state.taskValues['open-curtain'], 1);
  assert.equal(stageFor(state), 'ready');
  assert.equal(beginFinale(state), true);
  assert.equal(advanceTask(state, 'open-curtain', 0.1), false);
  for (let i = 0; i < 50; i++) advanceFinale(state, 0.1);
  assert.equal(stageFor(reload(state)), 'done');
});

test('dial clamps bounds, rejects invalid input and only accepts the visible 10:10 tolerance', () => {
  const state = organized(CLOCK);
  assert.equal(setTaskValue(state, 'set-time', NaN), false);
  assert.equal(setTaskValue(state, 'set-time', Infinity), false);
  assert.equal(setTaskValue(state, 'set-time', -100), true);
  assert.equal(state.taskValues['set-time'], 540);
  assert.equal(setTaskValue(state, 'set-time', 999), true);
  assert.equal(state.taskValues['set-time'], 660);
  assert.equal(stageFor(state), 'operate');
  setTaskValue(state, 'set-time', 606);
  assert.equal(taskComplete(state, 'set-time'), false);
  assert.equal(reload(state).taskValues['set-time'], 606);
  setTaskValue(state, 'set-time', 607);
  assert.equal(taskComplete(state, 'set-time'), true);
  assert.equal(stageFor(state), 'ready');
  assert.equal(taskLabel(CLOCK.operation.tasks[0], 610), '10:10');
  assert.equal(completeTask(state, 'set-time'), false, 'dial must not be completed by a tap');
});

test('painting synchronizes every stroke to its mask, resumes exactly and gates the frame polish', () => {
  let state = organized(SIGN);
  assert.equal(completeTask(state, 'paint-sign'), false);
  assert.equal(advanceTask(state, 'polish-frame', 0.1), false);
  const removed = scrubTask(state, 'paint-sign', 0.12, 0.12, 0.22, 0.05);
  assert.ok(removed > 0);
  assert.equal(state.taskValues['paint-sign'], state.taskFields[0].progress);
  const pixels = state.taskFields[0].mask.slice(),
    progress = state.taskValues['paint-sign'];
  state = reload(state);
  assert.deepEqual(state.taskFields[0].mask, pixels);
  assert.equal(state.taskValues['paint-sign'], progress);
  for (const args of [
    [NaN, 0.2, 0.2, 0.05],
    [0.2, 0.2, -1, 0.05],
    [0.2, 0.2, 0.2, 0],
  ]) {
    assert.equal(scrubTask(state, 'paint-sign', ...args), 0);
    assert.equal(state.taskValues['paint-sign'], progress);
  }
  paintAll(state, 'paint-sign');
  assert.equal(state.taskFields[0].done, true);
  assert.equal(state.taskValues['paint-sign'], 1);
  assert.equal(taskAvailable(state, 'polish-frame'), true);
  assert.equal(advanceTask(state, 'polish-frame', 0.1), true);
  assert.equal(reload(state).taskFields[0].done, true);
});

test('unknown actions, wrong modes and completed workbenches never mutate progress', () => {
  const state = organized(WINDOW);
  assert.equal(completeTask(state, 'missing'), false);
  assert.equal(advanceTask(state, 'sew-button', 0.1), false);
  assert.equal(setTaskValue(state, 'sew-button', 1), false);
  assert.equal(scrubTask(state, 'sew-button', 0.5, 0.5, 0.3, 0.05), 0);
  assert.equal(completeTask(state, 'open-curtain'), false);
  state.completed = true;
  assert.equal(completeTask(state, 'sew-button'), false);
  assert.equal(canWorkOnTasks(state), false);
});

test('corrupt task values, brush masks and prerequisite violations are rejected on refresh', () => {
  const pristine = JSON.parse(packState(organized(SIGN)));
  const mutations = [
    (saved) => {
      saved.taskValues['paint-sign'] = 0.5;
    },
    (saved) => {
      saved.taskValues['polish-frame'] = 0.2;
    },
    (saved) => {
      delete saved.taskValues['paint-sign'];
    },
    (saved) => {
      saved.taskValues.extra = 0;
    },
    (saved) => {
      saved.taskValues['paint-sign'] = null;
    },
    (saved) => {
      saved.taskValues['polish-frame'] = -1;
    },
    (saved) => {
      saved.taskValues['polish-frame'] = 1.1;
    },
    (saved) => {
      saved.taskSurfaces['paint-sign'].pop();
    },
    (saved) => {
      saved.taskSurfaces['paint-sign'][0] = 256;
    },
    (saved) => {
      saved.taskSurfaces['paint-sign'][0] = 0.5;
    },
    (saved) => {
      saved.taskSurfaces['paint-sign'].fill(0);
    },
    (saved) => {
      saved.taskSurfaces.extra = [];
    },
    (saved) => {
      saved.brewTime = 0.5;
    },
    (saved) => {
      saved.completed = true;
    },
  ];
  for (const mutate of mutations) {
    const saved = structuredClone(pristine);
    mutate(saved);
    assert.equal(unpackState(JSON.stringify(saved), SIGN), null, mutate.toString());
  }
  const dirty = JSON.parse(packState(makeState(null, WINDOW)));
  dirty.taskValues['sew-button'] = 1;
  assert.equal(unpackState(JSON.stringify(dirty), WINDOW), null);
  const premature = JSON.parse(packState(organized(WINDOW)));
  premature.taskValues['open-curtain'] = 0.2;
  assert.equal(unpackState(JSON.stringify(premature), WINDOW), null);
  premature.taskValues['open-curtain'] = 0;
  premature.taskValues['sew-button'] = 0.5;
  assert.equal(unpackState(JSON.stringify(premature), WINDOW), null);
});

test('opening intentionally skips cleaning and placement, but all three rituals must finish', () => {
  const state = makeState(null, OPENING);
  assert.deepEqual(state.surfaces, []);
  assert.equal(state.placed.size, 0);
  assert.equal(stageFor(state), 'operate');
  assert.equal(beginFinale(state), false);
  for (const task of OPENING.operation.tasks) {
    assert.equal(completeTask(state, task.id), true);
    assert.ok(unpackState(packState(state), OPENING));
  }
  assert.equal(stageFor(state), 'ready');
  assert.equal(beginFinale(state), true);
  for (let i = 0; i < 70; i++) advanceFinale(state, 0.1);
  assert.equal(reload(state).completed, true);
});

test('a clock drag entering the green zone gently aligns to the exact promised time', () => {
  const state = makeState(null, CLOCK);
  state.surfaces.forEach((field) => field.finish());
  CLOCK.items.forEach((item) => state.placed.add(item.id));
  assert.equal(setTaskValue(state, 'set-time', 606), true);
  assert.equal(state.taskValues['set-time'], 606);
  assert.equal(stageFor(state), 'operate');
  assert.equal(setTaskValue(state, 'set-time', 607), true);
  assert.equal(state.taskValues['set-time'], 610);
  assert.equal(stageFor(state), 'ready');
  assert.equal(makeState(unpackState(packState(state), CLOCK), CLOCK).taskValues['set-time'], 610);
});
