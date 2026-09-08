import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { GARDEN_EARLY_LEVELS } from '../src/garden-early-levels.mjs';
import { buildGardenEarlyScene } from '../src/garden-early-scenes.mjs';
import { makeState, packState, unpackState, stageFor, beginFinale, advanceFinale } from '../src/core.mjs';
import { completeTask, advanceTask, setTaskValue, taskComplete, nextTask } from '../src/task-actions.mjs';
import { createPropsPhysics } from '../src/physics.mjs';

function reload(state) {
  const saved = unpackState(packState(state), state.level);
  assert.ok(saved, `${state.level.id} progress should survive refresh`);
  return makeState(saved, state.level);
}
function organized(level) {
  const state = makeState(null, level);
  state.surfaces.forEach((surface) => surface.finish());
  level.items.forEach((item) => state.placed.add(item.id));
  return state;
}
function finish(state, task) {
  if (task.mode === 'tap') assert.equal(completeTask(state, task.id), true);
  if (task.mode === 'dial') assert.equal(setTaskValue(state, task.id, task.target), true);
  if (task.mode === 'hold') for (let i = 0; i < 100 && !taskComplete(state, task.id); i++) advanceTask(state, task.id, 0.1);
  assert.equal(taskComplete(state, task.id), true);
}
function fixture(level, state) {
  const previousDocument = globalThis.document;
  const context = new Proxy({}, { get: (object, key) => object[key] ?? (() => {}), set: (object, key, data) => ((object[key] = data), true) });
  globalThis.document = { createElement: () => ({ getContext: () => context }) };
  const view = {
    level, state, scene: new THREE.Scene(), actionTargets: new Map(), items: new Map(), slots: new Map(), dirtyMeshes: [],
    wood: new THREE.Texture(), brass: new THREE.MeshPhysicalMaterial(), chrome: new THREE.MeshPhysicalMaterial(),
    surface(id, geometry, settings, position, rotation) {
      const object = new THREE.Mesh(geometry, new THREE.MeshPhysicalMaterial(settings));
      object.position.set(...position); object.rotation.set(...rotation);
      object.userData.field = state.surfaces.find((field) => field.spec.id === id);
      this.dirtyMeshes.push(object); this.scene.add(object); return object;
    },
  };
  const extra = buildGardenEarlyScene(view);
  for (const item of level.items) if (state.placed.has(item.id)) {
    view.items.get(item.id).position.set(...item.slot);
    view.items.get(item.id).rotation.set(...item.slotRotation);
  }
  return { view, extra, restore: () => { globalThis.document = previousDocument; } };
}

test('first garden level offers real opposing front and rear cleaning views', () => {
  const [pot] = GARDEN_EARLY_LEVELS;
  const front = pot.surfaces.find((surface) => surface.id.endsWith('front'));
  const back = pot.surfaces.find((surface) => surface.id.endsWith('back'));
  assert.equal(back.camera.angle, Math.PI);
  assert.equal(back.rotation[1], Math.PI);
  assert.ok(back.position[2] < front.position[2]);
  for (const level of GARDEN_EARLY_LEVELS) {
    assert.equal(level.seasonId, 'rain-garden');
    assert.ok(Math.abs(level.surfaces.reduce((total, surface) => total + surface.weight, 0) - 1) < 1e-9);
  }
});

for (const level of GARDEN_EARLY_LEVELS) {
  test(`${level.id}: partial actions, dependency gates and finished saves restore`, () => {
    let state = makeState(null, level);
    const first = level.operation.tasks[0];
    assert.equal(first.mode === 'tap' ? completeTask(state, first.id) : advanceTask(state, first.id, 0.1), false);
    state = organized(level);
    assert.equal(stageFor(state), 'operate');
    for (const task of level.operation.tasks) {
      for (const later of level.operation.tasks.filter((candidate) => candidate.requires?.includes(task.id)))
        assert.equal(later.mode === 'tap' ? completeTask(state, later.id) : advanceTask(state, later.id, 0.1), false);
      if (task.mode === 'hold') {
        advanceTask(state, task.id, 0.1);
        const partial = state.taskValues[task.id];
        assert.ok(partial > 0 && partial < 1);
        state = reload(state);
        assert.equal(state.taskValues[task.id], partial);
      }
      finish(state, task);
      state = reload(state);
    }
    assert.equal(nextTask(state), null);
    assert.equal(stageFor(state), 'ready');
    assert.equal(beginFinale(state), true);
    for (let i = 0; i < 60; i++) advanceFinale(state, 0.1);
    assert.equal(stageFor(reload(state)), 'done');
  });

  test(`${level.id}: every item remains stable during drag and assembles at its marker`, async () => {
    const state = makeState(null, level);
    state.surfaces.forEach((field) => field.finish());
    const physics = await createPropsPhysics(state);
    try {
      for (const item of level.items) {
        assert.equal(physics.recoveryReason(physics.bodies.get(item.id)), null);
        assert.equal(physics.pick(item.id), true);
        physics.move({ x: item.slot[0], y: item.dragHeight, z: item.slot[2] }, item.id);
        for (let i = 0; i < 100; i++) physics.step();
        assert.equal(physics.held, item.id);
        assert.equal(physics.release(), item.id);
        for (let i = 0; i < 60; i++) physics.step();
        assert.ok(Math.abs(physics.bodies.get(item.id).translation().y - item.slot[1]) < 1e-3);
      }
      assert.equal(stageFor(reload(state)), 'operate');
    } finally { physics.dispose(); }
  });

  test(`${level.id}: every operation has a rendered target and restores its finished scene`, () => {
    const state = organized(level), { view, extra, restore } = fixture(level, state);
    try {
      assert.equal(view.items.size, level.items.length);
      assert.equal(view.dirtyMeshes.length, level.surfaces.length);
      for (const task of level.operation.tasks) assert.ok(view.actionTargets.has(task.id), task.id);
      for (const task of level.operation.tasks) finish(state, task);
      const packed = packState(state);
      for (let i = 0; i < 10; i++) extra.update(0.1, i * 0.1, { before: false, stage: 'ready' });
      extra.update(0.1, 1, { before: true, stage: 'ready' });
      extra.update(0.1, 2, { before: false, stage: 'ready' });
      assert.equal(packState(state), packed, 'rendering and before/after comparison must be read-only');
      view.scene.updateMatrixWorld(true);
      view.scene.traverse((object) => assert.ok(object.matrixWorld.elements.every(Number.isFinite), 'scene transforms remain finite'));
    } finally { restore(); }
  });
}

test('watering changes exposed pot soil and the before view returns dry material', () => {
  const [level] = GARDEN_EARLY_LEVELS, state = organized(level), { view, extra, restore } = fixture(level, state);
  try {
    const soil = view.actionTargets.get('pot-settle').object;
    const dry = soil.material.color.getHex();
    state.taskValues['pot-settle'] = 1; state.taskValues['pot-water'] = 1;
    extra.update(0.1, 0, { before: false, stage: 'ready' });
    assert.notEqual(soil.material.color.getHex(), dry);
    extra.update(0.1, 1, { before: true, stage: 'ready' });
    assert.equal(soil.material.color.getHex(), dry);
    view.scene.updateMatrixWorld(true);
    const ray = new THREE.Raycaster(new THREE.Vector3(-0.8, 0.88, 0.02), new THREE.Vector3(0, -1, 0));
    assert.equal(ray.intersectObjects(view.scene.children, true)[0]?.object, soil, 'ceramic walls must not cap the soil');
  } finally { restore(); }
});

test('the cleaned nursery lid remains transparent and closes over, rather than through, the soil', () => {
  const level = GARDEN_EARLY_LEVELS[2], state = organized(level), { view, extra, restore } = fixture(level, state);
  try {
    for (const task of level.operation.tasks) finish(state, task);
    for (let i = 0; i < 40; i++) extra.update(0.1, i * 0.1, { before: false, stage: 'ready' });
    const pane = view.dirtyMeshes.find((entry) => entry.userData.field.spec.id === 'garden-seed-lid');
    assert.ok(pane.material.opacity < 0.25);
    assert.ok(Math.abs(pane.parent.rotation.x - Math.PI / 2) < 1e-5);
    view.scene.updateMatrixWorld(true);
    assert.ok(pane.getWorldPosition(new THREE.Vector3()).y > 0.45);
  } finally { restore(); }
});
