import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { STATION_MIDDLE_LEVELS, STATION_BOARD, STATION_LUGGAGE, STATION_SIGNAL } from '../src/station-middle-levels.mjs';
import { buildStationMiddleScene } from '../src/station-middle-scenes.mjs';
import { makeState, packState, unpackState, stageFor, beginFinale, advanceFinale, canPlaceItem } from '../src/core.mjs';
import { completeTask, advanceTask, setTaskValue, taskAvailable } from '../src/task-actions.mjs';
import { createPropsPhysics } from '../src/physics.mjs';

function organized(level) {
  const state = makeState(null, level);
  state.surfaces.forEach(field => field.finish());
  level.items.forEach(item => state.placed.add(item.id));
  return state;
}
function finishTask(state, task) {
  if (task.mode === 'tap') assert.equal(completeTask(state, task.id), true);
  if (task.mode === 'dial') assert.equal(setTaskValue(state, task.id, task.target), true);
  if (task.mode === 'hold') for (let i = 0; i < 100; i++) advanceTask(state, task.id, 0.1);
}
function sceneFixture(level, state = organized(level)) {
  const previousDocument = globalThis.document;
  const context = new Proxy({}, { get: (object, key) => object[key] ?? (() => {}), set: (object, key, v) => ((object[key] = v), true) });
  globalThis.document = { createElement: () => ({ getContext: () => context }) };
  const view = {
    level, state, scene: new THREE.Scene(), actionTargets: new Map(), items: new Map(), slots: new Map(), dirtyMeshes: [], wood: new THREE.Texture(),
    surface(id, geometry, settings, position, rotation) {
      const object = new THREE.Mesh(geometry, new THREE.MeshPhysicalMaterial(settings));
      object.position.set(...position); object.rotation.set(...rotation);
      object.userData.field = state.surfaces.find(field => field.spec.id === id);
      this.dirtyMeshes.push(object); this.scene.add(object); return object;
    },
  };
  const extra = buildStationMiddleScene(view);
  for (const item of level.items) if (state.placed.has(item.id)) {
    view.items.get(item.id).position.set(...item.slot);
    view.items.get(item.id).rotation.set(...item.slotRotation);
  }
  return { view, extra, restore() {
    const geometries = new Set(), materials = new Set(), textures = new Set();
    view.scene.traverse(object => {
      if (object.geometry) geometries.add(object.geometry);
      if (object.material) for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material);
    });
    materials.forEach(material => { for (const v of Object.values(material)) if (v?.isTexture) textures.add(v); material.dispose(); });
    geometries.forEach(geometry => geometry.dispose()); textures.forEach(texture => texture.dispose());
    globalThis.document = previousDocument;
  } };
}
function phoneCamera(level, mode = 'tidy') {
  const settings = level.cameras.mobile[mode], camera = new THREE.PerspectiveCamera(32, 390 / 844, 0.05, 60), angle = 0.28;
  camera.position.set(Math.sin(angle) * settings.distance, settings.height, Math.cos(angle) * settings.distance + settings.lookZ);
  camera.lookAt(settings.lookX || 0, settings.lookY, settings.lookZ); camera.updateMatrixWorld(true); return camera;
}
function boundsOnScreen(root, camera) {
  let minX = Infinity, maxX = -Infinity;
  root.traverse(object => {
    if (!object.isMesh) return;
    for (let parent = object; parent; parent = parent.parent) if (!parent.visible) return;
    const positions = object.geometry.getAttribute('position');
    assert.ok([...positions.array].every(Number.isFinite));
    for (let i = 0; i < positions.count; i++) {
      const point = new THREE.Vector3().fromBufferAttribute(positions, i).applyMatrix4(object.matrixWorld).project(camera);
      const x = (point.x + 1) * 195; minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    }
  });
  return { minX, maxX };
}
for (const level of STATION_MIDDLE_LEVELS) {
  test(`${level.id}: no finishing shortcut, interrupted progress resumes and completion survives reload`, () => {
    const dirty = makeState(null, level);
    assert.equal(stageFor(dirty), 'clean');
    assert.equal(beginFinale(dirty), false);
    const first = level.operation.tasks[0];
    assert.equal(setTaskValue(dirty, first.id, first.target), false);
    const state = organized(level);
    assert.equal(stageFor(state), 'operate');
    const gated = level.operation.tasks.find(task => task.requires?.length);
    assert.equal(taskAvailable(state, gated.id), false);
    for (const task of level.operation.tasks) {
      if (task.mode === 'hold') {
        for (let i = 0; i < 8; i++) advanceTask(state, task.id, 0.1);
        const resumed = makeState(unpackState(packState(state), level), level);
        assert.equal(resumed.taskValues[task.id], state.taskValues[task.id]);
        assert.ok(resumed.taskValues[task.id] > 0 && resumed.taskValues[task.id] < 1);
        assert.equal(beginFinale(resumed), false);
        const forged = JSON.parse(packState(state)); forged.completed = true; forged.brewTime = level.operation.duration;
        assert.equal(unpackState(JSON.stringify(forged), level), null);
      }
      finishTask(state, task);
    }
    assert.equal(stageFor(state), 'ready');
    assert.equal(beginFinale(state), true);
    for (let i = 0; i < 80; i++) advanceFinale(state, 0.1);
    assert.equal(stageFor(state), 'done');
    assert.equal(makeState(unpackState(packState(state), level), level).completed, true);
  });

  test(`${level.id}: actual rigid bodies settle, remain held and assemble into all three slots`, async () => {
    const state = makeState(null, level); state.surfaces.forEach(field => field.finish());
    const physics = await createPropsPhysics(state);
    try {
      for (const item of level.items) {
        const body = physics.bodies.get(item.id);
        assert.equal(physics.recoveryReason(body), null);
        assert.ok(body.translation().y > -0.015);
        assert.equal(canPlaceItem(state, item.id), true);
        assert.equal(physics.pick(item.id), true);
        physics.move({ x: item.slot[0], y: item.dragHeight, z: item.slot[2] }, item.id);
        for (let i = 0; i < 180; i++) physics.step();
        assert.equal(physics.held, item.id);
        assert.equal(physics.release(), item.id);
        for (let i = 0; i < 30; i++) physics.step();
        const actual = body.translation();
        assert.ok(Math.hypot(actual.x - item.slot[0], actual.y - item.slot[1], actual.z - item.slot[2]) < 0.001);
      }
      assert.equal(stageFor(state), 'operate');
      assert.equal(makeState(unpackState(packState(state), level), level).placed.size, 3);
    } finally { physics.dispose(); }
  });

  test(`${level.id}: visible action geometry and complete mobile framing before and after assembly`, async () => {
    const state = makeState(null, level), physics = await createPropsPhysics(state);
    const { view, extra, restore } = sceneFixture(level, state);
    try {
      assert.equal(view.items.size, level.items.length);
      assert.equal(view.dirtyMeshes.length, level.surfaces.length);
      for (const task of level.operation.tasks) {
        const target = view.actionTargets.get(task.id)?.object;
        assert.ok(target, `Missing scene target for ${task.id}`);
        let hitMeshes = 0; target.traverse(child => { if (child.isMesh && child.userData.actionId === task.id) hitMeshes++; });
        assert.ok(hitMeshes > 0);
      }
      for (const pose of ['initial', 'assembled']) {
        if (pose === 'assembled') for (const item of level.items) physics.snap(item.id, false);
        for (const item of level.items) {
          const model = view.items.get(item.id), body = physics.bodies.get(item.id);
          model.position.copy(body.translation()); model.quaternion.copy(body.rotation());
        }
        extra.update(0.1, 1, { before: false, stage: 'tidy' }); view.scene.updateMatrixWorld(true);
        const camera = phoneCamera(level);
        for (const item of level.items) {
          const { minX, maxX } = boundsOnScreen(view.items.get(item.id), camera);
          assert.ok(minX >= 10 && maxX <= 380, `${pose} ${item.id}: clipped ${minX}..${maxX}`);
        }
      }
      state.surfaces.forEach(field => field.finish());
      for (const task of level.operation.tasks) finishTask(state, task);
      extra.update(0.1, 1, { before: false, stage: 'done' }); view.scene.updateMatrixWorld(true);
      const { minX, maxX } = boundsOnScreen(view.scene, phoneCamera(level, 'finale'));
      assert.ok(minX >= 10 && maxX <= 380, `Finished ${level.id}: clipped ${minX}..${maxX}`);
    } finally { physics.dispose(); restore(); }
  });
}

for (const level of STATION_MIDDLE_LEVELS) test(`${level.id}: surface focus exposes cleaning patches and loose and placed props remain visible`, async () => {
  const state = makeState(null, level), physics = await createPropsPhysics(state);
  const { view, extra, restore } = sceneFixture(level, state);
  try {
    for (const item of level.items) {
      const body = physics.bodies.get(item.id), object = view.items.get(item.id);
      object.position.copy(body.translation()); object.quaternion.copy(body.rotation());
    }
    extra.update(0.1, 1, { before: false, stage: 'clean' }); view.scene.updateMatrixWorld(true);
    const visible = object => {
      for (let parent = object; parent; parent = parent.parent) if (!parent.visible) return false;
      return !object.material?.transparent;
    };
    const firstHit = (from, to) => {
      const ray = new THREE.Raycaster(from, to.clone().sub(from).normalize()); ray.far = from.distanceTo(to) + 0.03;
      return ray.intersectObjects(view.scene.children, true).find(hit => visible(hit.object));
    };
    for (const surface of view.dirtyMeshes) {
      const spec = surface.userData.field.spec, settings = spec.camera;
      const camera = new THREE.Vector3(Math.sin(settings.angle) * settings.distance + (settings.lookX || 0), settings.height, Math.cos(settings.angle) * settings.distance + settings.lookZ);
      let available = 0;
      for (const [u, v] of [[0, 0], [-0.28, -0.28], [0.28, -0.28], [-0.28, 0.28], [0.28, 0.28]]) {
        const point = new THREE.Vector3(u * spec.width, v * spec.height, 0).applyMatrix4(surface.matrixWorld);
        if (firstHit(camera, point)?.object === surface) available++;
      }
      assert.ok(available >= 4, `${spec.id} exposes only ${available} of 5 cleaning patches`);
    }
    const camera = phoneCamera(level).position;
    for (const pose of ['initial', 'assembled']) {
    if (pose === 'assembled') {
      for (const item of level.items) { physics.snap(item.id, false); const body = physics.bodies.get(item.id), object = view.items.get(item.id); object.position.copy(body.translation()); object.quaternion.copy(body.rotation()); }
      extra.update(0.1, 1, { before: false, stage: 'tidy' }); view.scene.updateMatrixWorld(true);
    }
    for (const item of level.items) {
      const root = view.items.get(item.id); let available = 0;
      root.traverse(object => {
        if (!object.isMesh || !visible(object)) return;
        object.geometry.computeBoundingSphere();
        const center = object.geometry.boundingSphere.center.clone().applyMatrix4(object.matrixWorld);
        const hit = firstHit(camera, center);
        if (hit?.object.userData.itemId === item.id) available++;
      });
      assert.ok(available > 0, `${pose} ${item.id} is hidden behind the main object`);
    }
    }
  } finally { physics.dispose(); restore(); }
});

test('board flips individual large glyph tiles, holds them in a saved position, and before restores blank flaps', () => {
  const { view, extra, restore } = sceneFixture(STATION_BOARD);
  try {
    const alignment = view.scene.getObjectByName('station-board-alignment'), flap = view.scene.getObjectByName('station-board-flap-0');
    extra.update(0.1, 0, { before: false });
    assert.ok(alignment.rotation.z > 0);
    assert.equal(view.scene.getObjectByName('station-board-glyph-0').visible, false);
    setTaskValue(view.state, 'board-align', 0);
    for (let i = 0; i < 20; i++) advanceTask(view.state, 'board-flip', 0.1);
    view.state = makeState(unpackState(packState(view.state), STATION_BOARD), STATION_BOARD);
    extra.update(0.1, 1, { before: false });
    assert.equal(Math.abs(alignment.rotation.z), 0);
    assert.ok(flap.rotation.x < 0 && flap.rotation.x > -Math.PI * 2);
    assert.equal(view.scene.getObjectByName('station-board-glyph-0').visible, true);
    assert.equal(view.scene.getObjectByName('station-board-glyph-4').visible, false);
    finishTask(view.state, STATION_BOARD.operation.tasks[1]); completeTask(view.state, 'board-lock');
    extra.update(0.1, 2, { before: false });
    for (let i = 0; i < 5; i++) assert.equal(view.scene.getObjectByName(`station-board-glyph-${i}`).visible, true);
    assert.equal(flap.rotation.x, -Math.PI * 2);
    assert.equal(view.scene.getObjectByName('station-board-latch').rotation.z, Math.PI / 2);
    extra.update(0.1, 2, { before: true });
    assert.equal(Math.abs(flap.rotation.x), 0);
    assert.equal(view.scene.getObjectByName('station-board-glyph-0').visible, false);
    assert.ok(alignment.rotation.z > 0);
  } finally { restore(); }
});

test('luggage straps tighten sequentially, wheels and entire assembled load travel together, and brake settles', () => {
  const { view, extra, restore } = sceneFixture(STATION_LUGGAGE);
  try {
    const frame = view.scene.getObjectByName('station-luggage-frame'), first = view.scene.getObjectByName('station-luggage-strap-0'), second = view.scene.getObjectByName('station-luggage-strap-1');
    extra.update(0.1, 0, { before: false });
    assert.equal(first.visible, false);
    for (let i = 0; i < 10; i++) advanceTask(view.state, 'luggage-strap', 0.1);
    view.state = makeState(unpackState(packState(view.state), STATION_LUGGAGE), STATION_LUGGAGE);
    extra.update(0.1, 1, { before: false });
    assert.equal(first.visible, true); assert.equal(second.visible, false);
    assert.ok(first.scale.y > 0 && first.scale.y < 1);
    finishTask(view.state, STATION_LUGGAGE.operation.tasks[0]);
    for (let i = 0; i < 12; i++) advanceTask(view.state, 'luggage-roll', 0.1);
    extra.update(0.1, 2, { before: false });
    assert.ok(frame.position.x > 0 && frame.position.x < 0.24);
    assert.equal(view.scene.getObjectByName('luggage-case-visual').position.x, frame.position.x);
    assert.equal(view.scene.getObjectByName('luggage-handle-visual').position.x, frame.position.x);
    assert.ok(view.scene.getObjectByName('station-luggage-right-wheel').rotation.x > 0);
    assert.equal(view.scene.getObjectByName('station-luggage-buckles').visible, true);
    for (const surface of view.dirtyMeshes) assert.equal(surface.position.x, surface.userData.field.spec.position[0] + frame.position.x);
    finishTask(view.state, STATION_LUGGAGE.operation.tasks[1]); completeTask(view.state, 'luggage-brake');
    extra.update(0.1, 3, { before: false });
    assert.equal(frame.position.x, 0.24); assert.equal(view.scene.getObjectByName('station-luggage-brake').rotation.x, -0.3);
    extra.update(0.1, 3, { before: true });
    assert.equal(frame.position.x, 0); assert.equal(first.visible, false);
    assert.equal(view.scene.getObjectByName('luggage-case-visual').position.x, 0);
  } finally { restore(); }
});

test('signal saves clear glass, aligned ring and physical lever with warm-to-green light; before removes restoration', () => {
  const { view, extra, restore } = sceneFixture(STATION_SIGNAL);
  try {
    const glass = view.scene.getObjectByName('station-signal-lens-glass'), light = view.scene.getObjectByName('station-signal-light'), beam = view.scene.getObjectByName('station-signal-soft-beam');
    extra.update(0.1, 0, { before: false });
    const warm = light.material.color.getHex(); assert.equal(beam.visible, false);
    for (let i = 0; i < 12; i++) advanceTask(view.state, 'signal-polish', 0.1);
    view.state = makeState(unpackState(packState(view.state), STATION_SIGNAL), STATION_SIGNAL);
    extra.update(0.1, 1, { before: false });
    assert.ok(glass.material.opacity < 0.64 && glass.material.opacity > 0.22);
    finishTask(view.state, STATION_SIGNAL.operation.tasks[0]); setTaskValue(view.state, 'signal-align', 45); completeTask(view.state, 'signal-pull');
    extra.update(0.1, 2, { before: false });
    assert.notEqual(light.material.color.getHex(), warm);
    assert.equal(view.scene.getObjectByName('station-signal-alignment').rotation.z, -Math.PI / 4);
    assert.equal(view.scene.getObjectByName('station-signal-lever').rotation.x, -0.92);
    assert.ok(light.material.emissiveIntensity > 0.7); assert.equal(beam.visible, true);
    extra.update(0.1, 2, { before: true });
    assert.equal(glass.material.opacity, 0.64); assert.equal(light.material.color.getHex(), warm);
    assert.equal(light.material.emissiveIntensity, 0); assert.equal(beam.visible, false);
  } finally { restore(); }
});

for (const level of STATION_MIDDLE_LEVELS) test(`${level.id}: rendering is read-only and stays within mobile geometry budget`, () => {
  const { view, extra, restore } = sceneFixture(level);
  try {
    level.operation.tasks.forEach(task => finishTask(view.state, task));
    const save = packState(view.state); let meshes = 0, triangles = 0;
    view.scene.traverse(object => { if (object.isMesh) { meshes++; triangles += (object.geometry.index?.count ?? object.geometry.getAttribute('position').count) / 3; } });
    assert.ok(meshes <= 150, `${meshes} meshes`); assert.ok(triangles < 120000, `${triangles} triangles`);
    for (let i = 0; i < 20; i++) extra.update(0.1, i * 0.1, { before: i % 2 === 0, stage: 'done', actionId: level.operation.tasks[i % 3].id });
    assert.equal(packState(view.state), save);
  } finally { restore(); }
});

test('board destination and greeting glyphs are in front of opaque cabinet trims at the phone finale view', () => {
  const { view, extra, restore } = sceneFixture(STATION_BOARD);
  try {
    STATION_BOARD.operation.tasks.forEach(task => finishTask(view.state, task));
    extra.update(0.1, 1, { before: false, stage: 'done' }); view.scene.updateMatrixWorld(true);
    const camera = phoneCamera(STATION_BOARD, 'finale').position;
    for (let i = 0; i < 5; i++) {
      const glyph = view.scene.getObjectByName(`station-board-glyph-${i}`);
      // Test each half so the deliberately visible centre hinge does not mask this check.
      for (const y of [-0.08, 0.08]) {
        const target = new THREE.Vector3(0, y, 0).applyMatrix4(glyph.matrixWorld);
        const ray = new THREE.Raycaster(camera, target.clone().sub(camera).normalize()); ray.far = camera.distanceTo(target) + 0.001;
        const hit = ray.intersectObjects(view.scene.children, true).find(({ object }) => {
          for (let parent = object; parent; parent = parent.parent) if (!parent.visible) return false;
          return !object.material?.transparent;
        });
        assert.equal(hit?.object, glyph, `glyph ${i} is buried in a cabinet or hinge`);
      }
    }
  } finally { restore(); }
});
