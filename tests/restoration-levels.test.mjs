import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { PLANT, CLOCK } from '../src/restoration-levels.mjs';
import { buildRestorationScene } from '../src/restoration-scenes.mjs';
import { makeState, packState, unpackState, stageFor, beginFinale } from '../src/core.mjs';
import { completeTask, advanceTask, setTaskValue } from '../src/task-actions.mjs';
import { createPropsPhysics } from '../src/physics.mjs';

function organized(level) {
  const state = makeState(null, level);
  state.surfaces.forEach((field) => field.finish());
  level.items.forEach((item) => state.placed.add(item.id));
  return state;
}

test('pruning gates watering, partial watering resumes, and premature completed plant saves are rejected', () => {
  const state = organized(PLANT);
  assert.equal(advanceTask(state, 'water', 0.1), false);
  for (const id of ['prune-left', 'prune-low', 'prune-right'])
    assert.equal(completeTask(state, id), true);
  for (let i = 0; i < 12; i++) advanceTask(state, 'water', 0.1);
  const restored = makeState(unpackState(packState(state), PLANT), PLANT);
  assert.equal(restored.taskValues.water, state.taskValues.water);
  assert.ok(restored.taskValues.water > 0.2 && restored.taskValues.water < 0.4);
  const invalid = JSON.parse(packState(state));
  invalid.completed = true;
  invalid.brewTime = PLANT.operation.duration;
  assert.equal(unpackState(JSON.stringify(invalid), PLANT), null);
  for (let i = 0; i < 80; i++) advanceTask(restored, 'water', 0.1);
  assert.equal(stageFor(restored), 'ready');
  assert.equal(beginFinale(restored), true);
});

test('clock calibration cannot start the mechanism outside 10:10 tolerance and remains stable after finishing', () => {
  const state = organized(CLOCK);
  assert.equal(beginFinale(state), false);
  setTaskValue(state, 'set-time', 590);
  assert.equal(stageFor(state), 'operate');
  setTaskValue(state, 'set-time', 610);
  assert.equal(stageFor(state), 'ready');
  assert.equal(setTaskValue(state, 'set-time', 540), false);
  const restored = makeState(unpackState(packState(state), CLOCK), CLOCK);
  assert.equal(restored.taskValues['set-time'], 610);
  assert.equal(beginFinale(restored), true);
});

for (const level of [PLANT, CLOCK]) {
  test(`${level.name}: every prop survives a held pointer, assembles and restores`, async () => {
    const state = makeState(null, level);
    state.surfaces.forEach((field) => field.finish());
    const physics = await createPropsPhysics(state);
    try {
      for (const item of level.items) {
        assert.equal(physics.pick(item.id), true);
        physics.move({ x: item.slot[0], y: item.dragHeight, z: item.slot[2] }, item.id);
        for (let i = 0; i < 180; i++) physics.step();
        assert.equal(physics.held, item.id);
        assert.equal(physics.recoveryReason(physics.bodies.get(item.id)), null);
        assert.equal(physics.release(), item.id);
        for (let i = 0; i < 60; i++) physics.step();
        const pose = physics.bodies.get(item.id).translation();
        assert.ok(Math.abs(pose.y - item.slot[1]) < 0.001);
      }
      assert.equal(state.placed.size, level.items.length);
      assert.ok(unpackState(packState(state), level));
    } finally {
      physics.dispose();
    }
  });
}

// Geometry-only rendering uses the real Three.js scene graph, with a no-op canvas
// for procedural texture painting. It deliberately does not claim WebGL/image QA.
function sceneFixture(level, state) {
  const previousDocument = globalThis.document;
  const context = new Proxy(
    {},
    {
      get: (object, key) => object[key] ?? (() => {}),
      set: (object, key, value) => ((object[key] = value), true),
    },
  );
  globalThis.document = { createElement: () => ({ getContext: () => context }) };
  const view = {
    level,
    state,
    scene: new THREE.Scene(),
    actionTargets: new Map(),
    items: new Map(),
    slots: new Map(),
    dirtyMeshes: [],
    wood: new THREE.Texture(),
    brass: new THREE.MeshPhysicalMaterial(),
    chrome: new THREE.MeshPhysicalMaterial(),
    surface(id, geometry, settings, position, rotation) {
      const object = new THREE.Mesh(geometry, new THREE.MeshPhysicalMaterial(settings));
      object.position.set(...position);
      object.rotation.set(...rotation);
      object.userData.field = state.surfaces.find((field) => field.spec.id === id);
      this.dirtyMeshes.push(object);
      this.scene.add(object);
      return object;
    },
  };
  const extra = buildRestorationScene(view);
  for (const item of level.items)
    if (state.placed.has(item.id)) {
      view.items.get(item.id).position.set(...item.slot);
      view.items.get(item.id).rotation.set(...(item.slotRotation || [0, 0, 0]));
    }
  return {
    view,
    extra,
    restore: () => {
      globalThis.document = previousDocument;
    },
  };
}

test('plant completion removes dry leaves and darkens soil; before view restores both', () => {
  const state = organized(PLANT),
    { view, extra, restore } = sceneFixture(PLANT, state);
  try {
    const dry = view.actionTargets.get('prune-left').object;
    const soil = view.actionTargets.get('water').object;
    view.scene.updateMatrixWorld(true);
    const aboveSoil = new THREE.Raycaster(
      new THREE.Vector3(-0.45, 0.79, -0.17),
      new THREE.Vector3(0, -1, 0),
    );
    assert.equal(
      aboveSoil.intersectObjects(view.scene.children, true)[0]?.object,
      soil,
      'The watering patch must be exposed through the pot rim, not covered by a ceramic lid.',
    );
    extra.update(0.05, 0, { before: false, stage: 'operate', actionId: null });
    const dryColor = soil.material.color.getHex();
    for (const task of PLANT.operation.tasks) state.taskValues[task.id] = 1;
    for (let i = 0; i < 20; i++)
      extra.update(0.05, i * 0.05, { before: false, stage: 'ready', actionId: null });
    assert.equal(dry.visible, false);
    assert.notEqual(soil.material.color.getHex(), dryColor);
    extra.update(0.05, 1, { before: true, stage: 'ready', actionId: null });
    assert.equal(dry.visible, true);
    assert.equal(dry.scale.x, 1);
    assert.equal(soil.material.color.getHex(), dryColor);
  } finally {
    restore();
  }
});

test('clock hands show the calibrated time and swinging pendulum keeps its eye on the shaft', () => {
  const state = organized(CLOCK),
    { view, extra, restore } = sceneFixture(CLOCK, state);
  try {
    state.taskValues['set-time'] = 610;
    extra.update(0.05, 0, { before: false, stage: 'ready' });
    assert.equal(
      view.scene.getObjectByName('clock-minute-hand').rotation.z,
      (-610 / 60) * Math.PI * 2,
    );
    state.brewTime = 1;
    extra.update(0.1, 0.1, { before: false, stage: 'brew' });
    view.scene.updateMatrixWorld(true);
    const pendulum = view.items.get('clock-pendulum');
    const eye = pendulum.localToWorld(new THREE.Vector3(0, 0.328, 0));
    assert.ok(eye.distanceTo(new THREE.Vector3(-0.2, 0.868, 0.175)) < 1e-8);
    assert.notEqual(pendulum.rotation.z, 0);
    extra.update(0.05, 1, { before: true, stage: 'done' });
    assert.equal(
      view.scene.getObjectByName('clock-minute-hand').rotation.z,
      (-540 / 60) * Math.PI * 2,
    );
  } finally {
    restore();
  }
});

for (const level of [PLANT, CLOCK])
  test(`${level.name}: mobile tidy keeps every initial and assembled prop inside the viewport`, async () => {
    const state = makeState(null, level),
      physics = await createPropsPhysics(state);
    const { view, restore } = sceneFixture(level, state);
    try {
      const width = 390,
        height = 844,
        angle = 0.28;
      const settings = level.cameras.mobile.tidy;
      const lookX = settings.lookX || 0;
      const camera = new THREE.PerspectiveCamera(32, width / height, 0.05, 60);
      camera.position.set(
        Math.sin(angle) * settings.distance + lookX,
        settings.height,
        Math.cos(angle) * settings.distance,
      );
      camera.lookAt(lookX, settings.lookY, settings.lookZ);
      camera.updateMatrixWorld(true);
      for (const pose of ['initial', 'assembled']) {
        if (pose === 'assembled') for (const item of level.items) physics.snap(item.id, false);
        for (const item of level.items) {
          const model = view.items.get(item.id),
            body = physics.bodies.get(item.id);
          // The constructor has settled the actual colliders for 80 frames.
          // Rendered geometry extends beyond a rigid body's center (notably the spout).
          model.position.copy(body.translation());
          model.quaternion.copy(body.rotation());
        }
        view.scene.updateMatrixWorld(true);
        for (const item of level.items) {
          let minX = Infinity,
            maxX = -Infinity;
          view.items.get(item.id).traverse((object) => {
            if (!object.isMesh) return;
            const positions = object.geometry.getAttribute('position');
            for (let i = 0; i < positions.count; i++) {
              const vertex = new THREE.Vector3()
                .fromBufferAttribute(positions, i)
                .applyMatrix4(object.matrixWorld)
                .project(camera);
              const x = ((vertex.x + 1) * width) / 2;
              minX = Math.min(minX, x);
              maxX = Math.max(maxX, x);
            }
          });
          assert.ok(
            minX >= 8 && maxX <= width - 8,
            `${pose} ${item.id} is clipped: x=${minX.toFixed(2)}..${maxX.toFixed(2)}`,
          );
        }
      }
    } finally {
      physics.dispose();
      restore();
    }
  });
