import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CONFIG,
  COFFEE,
  makeState,
  packState,
  unpackState,
  stageFor,
  cleanProgress,
  setOperationValue,
  advancePour,
  beginFinale,
  advanceFinale,
} from '../src/core.mjs';
import { LEVELS, DESK, TEA, RECORD } from '../src/levels.mjs';
import {
  readLevel,
  saveLevel,
  resetLevel,
  levelSaveKey,
  rememberLevel,
  selectedLevel,
  collectionStatus,
} from '../src/progress.mjs';
import { createPropsPhysics } from '../src/physics.mjs';
function storage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
}
function organized(level) {
  const state = makeState(null, level);
  state.surfaces.forEach((field) => field.finish());
  level.items.forEach((item) => state.placed.add(item.id));
  return state;
}
const restorationLevels = LEVELS.filter((level) => level.id !== 'opening');
for (const level of restorationLevels)
  test(`${level.name}: every counted patch can be cleaned and survives an independent save`, () => {
    const state = makeState(null, level);
    assert.ok(Math.abs(level.surfaces.reduce((sum, s) => sum + s.weight, 0) - 1) < 1e-9);
    for (const field of state.surfaces) {
      for (let y = 0; y <= 1; y += 0.07)
        for (let x = 0; x <= 1; x += 0.07) field.scrub(x, y, 0.34, 0.05);
      assert.equal(field.done, true, field.spec.id);
    }
    assert.equal(stageFor(state), 'tidy');
    assert.ok(unpackState(packState(state), level));
    assert.ok(packState(state).length < 240000);
  });
test('switching workbenches keeps eight independent partial saves and selection', () => {
  const store = storage();
  for (const [i, level] of restorationLevels.entries()) {
    const state = makeState(null, level);
    state.surfaces[i % 3].finish();
    saveLevel(store, state);
    rememberLevel(store, level);
    assert.equal(selectedLevel(store).id, level.id);
  }
  for (const [i, level] of restorationLevels.entries()) {
    const restored = makeState(readLevel(store, level), level);
    assert.equal(restored.surfaces[i % 3].done, true);
    assert.equal(restored.surfaces[(i + 1) % 3].done, false);
  }
  assert.equal(collectionStatus(store).filter((s) => s.started).length, restorationLevels.length);
  assert.equal(unpackState(store.getItem(levelSaveKey(TEA)), DESK), null);
});
test('legacy completed coffee imports once; replay cannot resurrect it or erase another level', () => {
  const store = storage(),
    coffee = organized(COFFEE);
  coffee.completed = true;
  coffee.brewTime = 4;
  const v1 = JSON.parse(packState(coffee));
  v1.version = 1;
  delete v1.levelId;
  delete v1.levelRevision;
  delete v1.brewTime;
  delete v1.operationValue;
  const legacy = JSON.stringify(v1);
  store.setItem(CONFIG.saveKey, legacy);
  assert.equal(makeState(readLevel(store, COFFEE), COFFEE).brewTime, 4);
  saveLevel(store, organized(DESK));
  resetLevel(store, COFFEE);
  assert.equal(cleanProgress(makeState(readLevel(store, COFFEE), COFFEE)), 0);
  assert.equal(readLevel(store, DESK).placed.length, 4);
  assert.equal(store.getItem(CONFIG.saveKey), legacy);
});
test('tea holds retain water across interruptions and automatically become ready at the target', () => {
  const state = organized(TEA);
  assert.equal(stageFor(state), 'operate');
  assert.equal(beginFinale(state), false);
  for (let i = 0; i < 15; i++) advancePour(state, 0.08);
  const value = state.operationValue,
    restored = makeState(unpackState(packState(state), TEA), TEA);
  assert.equal(restored.operationValue, value);
  for (const dt of [NaN, -1, 0]) assert.equal(advancePour(restored, dt), false);
  assert.equal(restored.operationValue, value);
  for (let i = 0; i < 100; i++) advancePour(restored, 0.08);
  assert.equal(restored.operationValue, TEA.operation.target);
  assert.equal(beginFinale(restored), true);
  assert.equal(setOperationValue(restored, 0), false);
  for (let i = 0; i < 50; i++) advanceFinale(restored, 0.08);
  assert.equal(restored.completed, true);
  assert.equal(stageFor(makeState(unpackState(packState(restored), TEA), TEA)), 'done');
});
test('turntable calibration gates needle placement and malformed final saves are rejected', () => {
  const state = organized(RECORD);
  assert.equal(beginFinale(state), false);
  assert.equal(setOperationValue(state, NaN), false);
  setOperationValue(state, 45);
  assert.equal(beginFinale(state), false);
  setOperationValue(state, 33.3);
  assert.equal(stageFor(state), 'ready');
  assert.equal(beginFinale(state), true);
  assert.equal(setOperationValue(state, 25), false);
  const invalid = JSON.parse(packState(state));
  invalid.operationValue = 25;
  assert.equal(unpackState(JSON.stringify(invalid), RECORD), null);
  for (let i = 0; i < 60; i++) advanceFinale(state, 0.08);
  assert.equal(state.completed, true);
  assert.ok(unpackState(packState(state), RECORD));
});
test('wrong book position and premature record assembly return a usable item without false progress', async () => {
  for (const [level, id, target] of [
    [DESK, 'book-2', 'book-1'],
    [RECORD, 'record-disc', 'record-disc'],
    [RECORD, 'cartridge', 'cartridge'],
  ]) {
    const state = makeState(null, level);
    state.surfaces.forEach((f) => f.finish());
    const physics = await createPropsPhysics(state);
    try {
      const item = level.items.find((i) => i.id === id);
      physics.pick(id);
      physics.move({ x: item.slot[0], y: 1, z: item.slot[2] }, target);
      assert.equal(physics.release(), null);
      assert.equal(state.placed.size, 0);
      assert.equal(physics.held, null);
      assert.ok(physics.events.some((e) => e.type === 'placement-hint'));
      assert.equal(physics.recoveryReason(physics.bodies.get(id)), null);
      assert.equal(physics.pick(id), true);
    } finally {
      physics.dispose();
    }
  }
});
for (const level of [DESK, TEA, RECORD])
  test(`${level.name}: accessories remain finite through a long hold, assemble and restore`, async () => {
    const state = makeState(null, level);
    state.surfaces.forEach((f) => f.finish());
    const physics = await createPropsPhysics(state);
    try {
      for (const item of level.items) {
        assert.equal(physics.pick(item.id), true);
        physics.move({ x: item.slot[0], y: item.dragHeight ?? 1, z: item.slot[2] }, item.id);
        for (let i = 0; i < 600; i++) physics.step();
        assert.equal(physics.held, item.id);
        assert.equal(physics.recoveryReason(physics.bodies.get(item.id)), null);
        assert.equal(physics.release(), item.id);
        for (let i = 0; i < 60; i++) physics.step();
        const p = physics.bodies.get(item.id).translation();
        assert.ok(Math.abs(p.y - item.slot[1]) < 0.001);
      }
      assert.equal(state.placed.size, level.items.length);
      const restored = unpackState(packState(state), level);
      assert.ok(restored);
      assert.equal(restored.placed.length, level.items.length);
    } finally {
      physics.dispose();
    }
  });
