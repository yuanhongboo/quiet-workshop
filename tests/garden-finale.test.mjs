import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { GARDEN_FINALE_LEVELS, GARDEN_LANTERN, GARDEN_BENCH, GARDEN_AWAKENING } from '../src/garden-finale-levels.mjs';
import { buildGardenFinaleScene } from '../src/garden-finale-scenes.mjs';
import { GrimeField, makeState, packState, unpackState, stageFor, beginFinale } from '../src/core.mjs';
import { completeTask, advanceTask, setTaskValue } from '../src/task-actions.mjs';
import { createPropsPhysics } from '../src/physics.mjs';

function organized(level) {
  const state = makeState(null, level);
  state.surfaces.forEach((field) => field.finish());
  for (const item of level.items) state.placed.add(item.id);
  return state;
}

for (const level of GARDEN_FINALE_LEVELS) {
  test(`${level.id}: finishing actions cannot be skipped and partial progress survives refresh`, () => {
    let state = organized(level);
    assert.equal(beginFinale(state), false);
    for (const task of level.operation.tasks) {
      if (task.mode === 'tap') assert.equal(completeTask(state, task.id), true);
      if (task.mode === 'dial') assert.equal(setTaskValue(state, task.id, task.target), true);
      if (task.mode === 'hold') {
        for (let i = 0; i < 10; i++) advanceTask(state, task.id, 0.1);
        const partial = state.taskValues[task.id];
        assert.ok(partial > 0 && partial < 1);
        const resumed = makeState(unpackState(packState(state), level), level);
        assert.equal(resumed.taskValues[task.id], partial);
        state = resumed;
        for (let i = 0; i < 50; i++) advanceTask(state, task.id, 0.1);
      }
    }
    assert.equal(stageFor(state), 'ready');
    assert.ok(unpackState(packState(state), level));
    assert.equal(beginFinale(state), true);
  });
}

for (const level of [GARDEN_LANTERN, GARDEN_BENCH]) {
  test(`${level.id}: grime can be fully scrubbed and props assemble without recovery`, async () => {
    for (const spec of level.surfaces) {
      const field = new GrimeField(spec);
      for (let pass = 0; pass < 6 && !field.done; pass++) {
        for (let v = 0; v <= 1.025; v += 0.035)
          for (let u = 0; u <= 1.025; u += 0.035) field.scrub(u, v, 0.18, 0.05);
      }
      assert.equal(field.done, true, spec.id);
    }
    const state = makeState(null, level);
    state.surfaces.forEach((field) => field.finish());
    const physics = await createPropsPhysics(state);
    try {
      for (const item of level.items) {
        assert.equal(physics.recoveryReason(physics.bodies.get(item.id)), null);
        assert.equal(physics.pick(item.id), true);
        physics.move({ x: item.slot[0], y: item.dragHeight, z: item.slot[2] }, item.id);
        for (let i = 0; i < 180; i++) physics.step();
        assert.equal(physics.held, item.id);
        assert.equal(physics.release(), item.id);
        for (let i = 0; i < 60; i++) physics.step();
        assert.ok(Math.abs(physics.bodies.get(item.id).translation().y - item.slot[1]) < 0.001);
      }
      assert.equal(state.placed.size, level.items.length);
    } finally { physics.dispose(); }
  });
}

function fixture(level) {
  const oldDocument = globalThis.document;
  const context = new Proxy({}, { get: (_, key) => key === 'createLinearGradient' ? () => ({ addColorStop() {} }) : () => {}, set: () => true });
  globalThis.document = { createElement: () => ({ getContext: () => context }) };
  const state = organized(level);
  const view = {
    level, state, scene: new THREE.Scene(), wood: new THREE.Texture(), items: new Map(), slots: new Map(), actionTargets: new Map(), dirtyMeshes: [],
    surface(id, geometry, settings, position, rotation) {
      const object = new THREE.Mesh(geometry, new THREE.MeshPhysicalMaterial(settings));
      object.position.set(...position); object.rotation.set(...rotation);
      this.scene.add(object); this.dirtyMeshes.push(object);
      return object;
    },
  };
  const extra = buildGardenFinaleScene(view);
  return { view, extra, restore() { globalThis.document = oldDocument; } };
}

for (const level of GARDEN_FINALE_LEVELS) {
  test(`${level.id}: scene builds physical targets and finite geometry`, () => {
    const { view, extra, restore } = fixture(level);
    try {
      assert.equal(view.items.size, level.items.length);
      assert.equal(view.dirtyMeshes.length, level.surfaces.length);
      for (const task of level.operation.tasks) assert.ok(view.actionTargets.has(task.id), task.id);
      extra.update(0.016, 2, { before: false, stage: 'operate' });
      let meshes = 0;
      view.scene.traverse((object) => {
        if (!object.isMesh) return;
        meshes++;
        assert.ok([...object.geometry.attributes.position.array].every(Number.isFinite));
      });
      assert.ok(meshes > 25 && meshes < 500, `${meshes} meshes`);
    } finally { restore(); }
  });
}

test('lantern light and bench cushion visibly respond to saved task values and reset in before view', () => {
  for (const level of [GARDEN_LANTERN, GARDEN_BENCH]) {
    const { view, extra, restore } = fixture(level);
    try {
      const target = view.scene.getObjectByName(level === GARDEN_LANTERN ? 'garden-lantern-light' : 'garden-bench-soft-cushion');
      const read = () => level === GARDEN_LANTERN ? target.intensity : target.scale.y;
      extra.update(0.1, 1, { before: true });
      const initial = read();
      for (const task of level.operation.tasks) view.state.taskValues[task.id] = task.target;
      extra.update(0.1, 1, { before: false });
      assert.ok(read() > initial);
      extra.update(0.1, 1, { before: true });
      assert.equal(read(), initial);
    } finally { restore(); }
  }
});

test('garden overview displays only earned fixtures and opening physically moves roof and shade', () => {
  const { view, extra, restore } = fixture(GARDEN_AWAKENING);
  try {
    view.state.seasonRestored = new Set(['garden-pot', 'garden-lantern']);
    extra.update(0.1, 1, { stage: 'overview' });
    assert.equal(view.scene.getObjectByName('restored-garden-pot').visible, true);
    assert.equal(view.scene.getObjectByName('placeholder-garden-pot').visible, false);
    assert.equal(view.scene.getObjectByName('restored-garden-bench').visible, false);
    assert.equal(view.scene.getObjectByName('placeholder-garden-bench').visible, true);
    const roof = view.scene.getObjectByName('garden-opening-roof');
    const shade = view.scene.getObjectByName('garden-roller-shade');
    const opened = roof.rotation.x;
    assert.ok(shade.scale.y < 0.1);
    extra.update(0.1, 1, { before: true, stage: 'overview' });
    assert.notEqual(roof.rotation.x, opened);
    assert.equal(shade.scale.y, 1);
    assert.equal(view.scene.getObjectByName('restored-garden-pot').visible, false);
  } finally { restore(); }
});

for (const level of [GARDEN_LANTERN, GARDEN_BENCH]) {
  test(`${level.id}: phone tidy view contains initial and fitted item geometry`, async () => {
    const { view, restore } = fixture(level);
    view.state.placed.clear();
    const physics = await createPropsPhysics(view.state);
    try {
      const width = 390, height = 844, angle = 0.28;
      const settings = level.cameras.mobile.tidy;
      const camera = new THREE.PerspectiveCamera(32, width / height, 0.05, 60);
      camera.position.set(Math.sin(angle) * settings.distance + (settings.lookX || 0), settings.height, Math.cos(angle) * settings.distance + settings.lookZ);
      camera.lookAt(settings.lookX || 0, settings.lookY, settings.lookZ);
      camera.updateMatrixWorld(true);
      for (const phase of ['initial', 'fitted']) {
        if (phase === 'fitted') for (const item of level.items) physics.snap(item.id, false);
        for (const item of level.items) {
          const model = view.items.get(item.id), body = physics.bodies.get(item.id);
          model.position.copy(body.translation()); model.quaternion.copy(body.rotation());
        }
        view.scene.updateMatrixWorld(true);
        for (const item of level.items) {
          let minX = Infinity, maxX = -Infinity;
          view.items.get(item.id).traverse((object) => {
            if (!object.isMesh) return;
            const vertices = object.geometry.getAttribute('position');
            for (let i = 0; i < vertices.count; i++) {
              const vertex = new THREE.Vector3().fromBufferAttribute(vertices, i).applyMatrix4(object.matrixWorld).project(camera);
              const x = (vertex.x + 1) * width / 2;
              minX = Math.min(minX, x); maxX = Math.max(maxX, x);
            }
          });
          assert.ok(minX >= 8 && maxX <= width - 8, `${phase} ${item.id}: ${minX}..${maxX}`);
        }
      }
    } finally { physics.dispose(); restore(); }
  });
}
