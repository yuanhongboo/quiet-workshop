import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { POST_FINALE_LEVELS, POST_BICYCLE, POST_BEACON, POST_OPENING } from '../src/post-finale-levels.mjs';
import { buildPostFinaleScene, POST_OVERVIEW_IDS } from '../src/post-finale-scenes.mjs';
import { GrimeField, makeState, packState, unpackState, stageFor, beginFinale } from '../src/core.mjs';
import { completeTask, advanceTask, setTaskValue } from '../src/task-actions.mjs';
import { createPropsPhysics } from '../src/physics.mjs';

function organized(level) {
  const state = makeState(null, level);
  state.surfaces.forEach((field) => field.finish());
  for (const item of level.items) state.placed.add(item.id);
  return state;
}
function finish(state, task) {
  if (task.mode === 'tap') return completeTask(state, task.id);
  if (task.mode === 'dial') return setTaskValue(state, task.id, task.target);
  if (task.mode === 'hold') { for (let i = 0; i < 60; i++) advanceTask(state, task.id, 0.1); return true; }
}
for (const level of POST_FINALE_LEVELS) {
  test(`${level.id}: tasks respect dependencies and partial saves resume through completion`, () => {
    let state = organized(level);
    assert.equal(beginFinale(state), false);
    assert.equal(completeTask(state, level.operation.tasks.at(-1).id), false);
    for (const task of level.operation.tasks) {
      if (task.mode === 'hold') {
        for (let i = 0; i < 9; i++) advanceTask(state, task.id, 0.1);
        const partial = state.taskValues[task.id];
        assert.ok(partial > 0 && partial < 1);
        state = makeState(unpackState(packState(state), level), level);
        assert.equal(state.taskValues[task.id], partial);
      }
      assert.equal(finish(state, task), true);
    }
    assert.equal(stageFor(state), 'ready');
    assert.equal(beginFinale(state), true);
  });
}
for (const level of [POST_BICYCLE, POST_BEACON]) {
  test(`${level.id}: dirt remains playable and fitted parts are stable across physics reload`, async () => {
    for (const spec of level.surfaces) {
      const field = new GrimeField(spec);
      for (let pass = 0; pass < 6 && !field.done; pass++) for (let v = 0; v <= 1.025; v += 0.035) for (let u = 0; u <= 1.025; u += 0.035) field.scrub(u, v, 0.18, 0.05);
      assert.equal(field.done, true, spec.id);
    }
    const state = makeState(null, level); state.surfaces.forEach((field) => field.finish());
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
      assert.equal(physics.events.filter((event) => event.type === 'recover').length, 0);
    } finally { physics.dispose(); }
    const resumed = makeState(unpackState(packState(state), level), level);
    const resumedPhysics = await createPropsPhysics(resumed);
    try {
      for (const item of level.items) {
        const position = resumedPhysics.bodies.get(item.id).translation();
        assert.ok(Math.abs(position.x - item.slot[0]) < 0.001 && Math.abs(position.y - item.slot[1]) < 0.001);
      }
    } finally { resumedPhysics.dispose(); }
  });
  test(`${level.id}: misplaced dependent assembly does not grant a part or task`, async () => {
    const state = makeState(null, level); state.surfaces.forEach((field) => field.finish());
    const physics = await createPropsPhysics(state);
    try {
      const item = level.items.find((item) => item.requires?.length);
      physics.pick(item.id); physics.move({ x: item.slot[0], y: item.dragHeight, z: item.slot[2] }, item.id);
      assert.equal(physics.release(), null);
      assert.equal(state.placed.size, 0);
      assert.ok(physics.events.some((event) => event.type === 'placement-hint'));
      assert.equal(advanceTask(state, level.operation.tasks.find((task) => task.mode === 'hold').id, 0.1), false);
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
      object.position.set(...position); object.rotation.set(...rotation); object.name = id;
      this.scene.add(object); this.dirtyMeshes.push(object); return object;
    },
  };
  const extra = buildPostFinaleScene(view);
  return { view, extra, restore() { globalThis.document = oldDocument; } };
}
for (const level of POST_FINALE_LEVELS) {
  test(`${level.id}: physical and interaction targets exist with finite geometry`, () => {
    const { view, extra, restore } = fixture(level);
    try {
      assert.equal(view.items.size, level.items.length);
      assert.equal(view.dirtyMeshes.length, level.surfaces.length);
      for (const task of level.operation.tasks) assert.ok(view.actionTargets.has(task.id), task.id);
      extra.update(0.016, 2, { before: false, stage: 'operate' });
      let meshes = 0;
      view.scene.traverse((object) => {
        if (!object.isMesh) return; meshes++;
        assert.ok([...object.geometry.attributes.position.array].every(Number.isFinite));
      });
      assert.ok(meshes > 30 && meshes < 800, `${meshes} meshes`);
    } finally { restore(); }
  });
}

test('bicycle drivetrain and beacon light respond to restored task progress and before view', () => {
  for (const level of [POST_BICYCLE, POST_BEACON]) {
    const { view, extra, restore } = fixture(level);
    try {
      const target = view.scene.getObjectByName(level === POST_BICYCLE ? 'post-bicycle-crank' : 'post-beacon-light');
      const read = () => level === POST_BICYCLE ? target.rotation.z : target.intensity;
      extra.update(0.1, 2, { before: true }); const initial = read();
      for (const task of level.operation.tasks) view.state.taskValues[task.id] = task.target;
      extra.update(0.1, 2, { before: false }); assert.notEqual(read(), initial);
      const powered = read(); extra.update(0.1, 3, { before: false });
      if (level === POST_BICYCLE) assert.notEqual(read(), powered);
      if (level === POST_BEACON) assert.equal(view.scene.getObjectByName('post-beacon-beam').visible, true);
      extra.update(0.1, 2, { before: true }); assert.equal(read(), initial);
      if (level === POST_BEACON) assert.equal(view.scene.getObjectByName('post-beacon-beam').visible, false);
    } finally { restore(); }
  }
});

test('overview accumulates exactly 3, 6 and 8 fixtures, with read-only chapter highlights', () => {
  const { view, extra, restore } = fixture(POST_OPENING);
  try {
    for (const count of [0, 3, 6, 8]) {
      view.state.seasonRestored = new Set(POST_OVERVIEW_IDS.slice(0, count));
      view.state.chapterHighlights = new Set(POST_OVERVIEW_IDS.slice(Math.max(0, count - 3), count));
      const saved = JSON.stringify(packState(view.state)), restored = [...view.state.seasonRestored], highlights = [...view.state.chapterHighlights];
      extra.update(0.1, 2, { stage: 'overview' });
      for (const [index, id] of POST_OVERVIEW_IDS.entries()) {
        assert.equal(view.scene.getObjectByName(`restored-${id}`).visible, index < count);
        assert.equal(view.scene.getObjectByName(`placeholder-${id}`).visible, index >= count);
        assert.equal(view.scene.getObjectByName(`chapter-highlight-${id}`).visible, view.state.chapterHighlights.has(id));
      }
      assert.equal(JSON.stringify(packState(view.state)), saved);
      assert.deepEqual([...view.state.seasonRestored], restored);
      assert.deepEqual([...view.state.chapterHighlights], highlights);
      extra.update(0.1, 3, { stage: 'overview', before: true });
      for (const id of POST_OVERVIEW_IDS) assert.equal(view.scene.getObjectByName(`restored-${id}`).visible, false);
    }
  } finally { restore(); }
});

test('opening tasks physically open curtains, send the fictional letter and turn the sign', () => {
  const { view, extra, restore } = fixture(POST_OPENING);
  try {
    view.state.seasonRestored = new Set(POST_OVERVIEW_IDS);
    extra.update(0.1, 1, { stage: 'operate' });
    const curtain = view.scene.getObjectByName('post-overview-curtain'), letter = view.scene.getObjectByName('post-overview-letter'), sign = view.scene.getObjectByName('post-overview-sign-board');
    assert.equal(curtain.userData.openAmount, 0); assert.equal(letter.visible, true); assert.equal(sign.rotation.y, Math.PI);
    const start = letter.position.clone();
    view.state.taskValues['post-open-curtain'] = 1; view.state.taskValues['post-light-beacon'] = 1; view.state.taskValues['post-send-letter'] = 0.5;
    extra.update(0.1, 2, { stage: 'operate' });
    assert.equal(curtain.userData.openAmount, 1); assert.ok(letter.position.distanceTo(start) > 0.3);
    assert.ok(view.scene.getObjectByName('post-overview-beacon-light').intensity > 0);
    view.state.taskValues['post-send-letter'] = 1; view.state.taskValues['post-open-sign'] = 1;
    extra.update(0.1, 3, { stage: 'operate' });
    assert.equal(letter.visible, false); assert.equal(sign.rotation.y, 0);
  } finally { restore(); }
});

function cameraFor(settings, width = 390, height = 844) {
  const camera = new THREE.PerspectiveCamera(32, width / height, 0.05, 60), angle = 0.28;
  camera.position.set(Math.sin(angle) * settings.distance + (settings.lookX || 0), settings.height, Math.cos(angle) * settings.distance + settings.lookZ);
  camera.lookAt(settings.lookX || 0, settings.lookY, settings.lookZ); camera.updateMatrixWorld(true); return camera;
}
function bounds(object, camera, width = 390, height = 844) {
  const result = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };
  object.traverse((child) => {
    if (!child.isMesh) return;
    const vertices = child.geometry.getAttribute('position');
    for (let i = 0; i < vertices.count; i++) {
      const vertex = new THREE.Vector3().fromBufferAttribute(vertices, i).applyMatrix4(child.matrixWorld).project(camera);
      const x = (vertex.x + 1) * width / 2, y = (1 - vertex.y) * height / 2;
      result.minX = Math.min(result.minX, x); result.maxX = Math.max(result.maxX, x);
      result.minY = Math.min(result.minY, y); result.maxY = Math.max(result.maxY, y);
    }
  });
  return result;
}
for (const level of [POST_BICYCLE, POST_BEACON]) {
  test(`${level.id}: phone tidy view contains initial and fitted parts`, async () => {
    const { view, restore } = fixture(level); view.state.placed.clear();
    const physics = await createPropsPhysics(view.state);
    try {
      const camera = cameraFor(level.cameras.mobile.tidy);
      for (const phase of ['initial', 'fitted']) {
        if (phase === 'fitted') for (const item of level.items) physics.snap(item.id, false);
        for (const item of level.items) {
          const model = view.items.get(item.id), body = physics.bodies.get(item.id);
          model.position.copy(body.translation()); model.quaternion.copy(body.rotation());
        }
        view.scene.updateMatrixWorld(true);
        for (const item of level.items) {
          const box = bounds(view.items.get(item.id), camera);
          assert.ok(box.minX >= 8 && box.maxX <= 382, `${phase} ${item.id}: ${box.minX}..${box.maxX}`);
          assert.ok(box.minY >= 190 && box.maxY <= 690, `${phase} ${item.id} vertical: ${box.minY}..${box.maxY}`);
        }
      }
    } finally { physics.dispose(); restore(); }
  });
}

test('phone overview keeps every earned object in view without hiding the lighthouse', () => {
  const { view, extra, restore } = fixture(POST_OPENING);
  try {
    view.state.seasonRestored = new Set(POST_OVERVIEW_IDS); extra.update(0.1, 3, { stage: 'overview' }); view.scene.updateMatrixWorld(true);
    const camera = cameraFor(POST_OPENING.cameras.mobile.overview);
    for (const id of POST_OVERVIEW_IDS) {
      const box = bounds(view.scene.getObjectByName(`restored-${id}`), camera);
      assert.ok(box.minX >= 6 && box.maxX <= 384, `${id}: ${box.minX}..${box.maxX}`);
      assert.ok(box.minY >= 185 && box.maxY <= 680, `${id}: ${box.minY}..${box.maxY}`);
    }
  } finally { restore(); }
});
