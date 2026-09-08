import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { GARDEN_MIDDLE_LEVELS, GARDEN_SHELF, GARDEN_GLASS, GARDEN_FOUNTAIN } from '../src/garden-middle-levels.mjs';
import { buildGardenMiddleScene } from '../src/garden-middle-scenes.mjs';
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
  if (task.mode === 'tap') completeTask(state, task.id);
  if (task.mode === 'dial') setTaskValue(state, task.id, task.target);
  if (task.mode === 'hold') for (let i = 0; i < 100; i++) advanceTask(state, task.id, 0.1);
}
function sceneFixture(level, state = organized(level)) {
  const previousDocument = globalThis.document;
  const context = new Proxy({}, { get: (object, key) => object[key] ?? (() => {}), set: (object, key, value) => ((object[key] = value), true) });
  globalThis.document = { createElement: () => ({ getContext: () => context }) };
  const view = {
    level, state, scene: new THREE.Scene(), actionTargets: new Map(), items: new Map(), slots: new Map(), dirtyMeshes: [],
    wood: new THREE.Texture(), brass: new THREE.MeshPhysicalMaterial(), chrome: new THREE.MeshPhysicalMaterial(),
    surface(id, geometry, settings, position, rotation) {
      const object = new THREE.Mesh(geometry, new THREE.MeshPhysicalMaterial(settings));
      object.position.set(...position); object.rotation.set(...rotation);
      object.userData.field = state.surfaces.find(field => field.spec.id === id);
      this.dirtyMeshes.push(object); this.scene.add(object); return object;
    },
  };
  const extra = buildGardenMiddleScene(view);
  for (const item of level.items) if (state.placed.has(item.id)) {
    view.items.get(item.id).position.set(...item.slot);
    view.items.get(item.id).rotation.set(...item.slotRotation);
  }
  return { view, extra, restore: () => { globalThis.document = previousDocument; } };
}

for (const level of GARDEN_MIDDLE_LEVELS) {
  test(`${level.id}: finishing dependencies, partial resume, invalid completion and real ending`, () => {
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
        const forged = JSON.parse(packState(state)); forged.completed = true; forged.brewTime = level.operation.duration;
        assert.equal(unpackState(JSON.stringify(forged), level), null);
      }
      finishTask(state, task);
    }
    assert.equal(stageFor(state), 'ready');
    assert.equal(beginFinale(state), true);
    for (let i = 0; i < 70; i++) advanceFinale(state, 0.1);
    assert.equal(stageFor(state), 'done');
    assert.equal(makeState(unpackState(packState(state), level), level).completed, true);
  });

  test(`${level.id}: physical props settle, remain held and fit their assembly slots`, async () => {
    const state = makeState(null, level); state.surfaces.forEach(field => field.finish());
    const physics = await createPropsPhysics(state);
    try {
      for (const item of level.items) {
        const body = physics.bodies.get(item.id);
        assert.equal(physics.recoveryReason(body), null);
        assert.ok(body.translation().y > -0.02);
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
      assert.ok(unpackState(packState(state), level));
    } finally { physics.dispose(); }
  });

  test(`${level.id}: scene resources, action targets and phone prop framing`, async () => {
    const state = makeState(null, level), physics = await createPropsPhysics(state);
    const { view, extra, restore } = sceneFixture(level, state);
    try {
      assert.equal(view.items.size, level.items.length);
      assert.equal(view.dirtyMeshes.length, level.surfaces.length);
      for (const task of level.operation.tasks) assert.ok(view.actionTargets.has(task.id));
      const cameraSettings = level.cameras.mobile.tidy, camera = new THREE.PerspectiveCamera(32, 390 / 844, 0.05, 60);
      camera.position.set(Math.sin(0.28) * cameraSettings.distance, cameraSettings.height, Math.cos(0.28) * cameraSettings.distance);
      camera.lookAt(cameraSettings.lookX || 0, cameraSettings.lookY, cameraSettings.lookZ); camera.updateMatrixWorld(true);
      for (const pose of ['initial', 'assembled']) {
        if (pose === 'assembled') for (const item of level.items) physics.snap(item.id, false);
        for (const item of level.items) {
          const group = view.items.get(item.id), body = physics.bodies.get(item.id);
          group.position.copy(body.translation()); group.quaternion.copy(body.rotation());
        }
        extra.update(1 / 60, 1, { before: false, stage: 'tidy' });
        view.scene.updateMatrixWorld(true);
        for (const item of level.items) {
          let minX = Infinity, maxX = -Infinity;
          view.items.get(item.id).traverse(object => {
            if (!object.isMesh) return;
            const position = object.geometry.getAttribute('position');
            assert.ok([...position.array].every(Number.isFinite));
            for (let i = 0; i < position.count; i++) {
              const point = new THREE.Vector3().fromBufferAttribute(position, i).applyMatrix4(object.matrixWorld).project(camera);
              const x = (point.x + 1) * 195; minX = Math.min(minX, x); maxX = Math.max(maxX, x);
            }
          });
          assert.ok(minX >= 8 && maxX <= 382, `${pose} ${item.id}: clipped ${minX}..${maxX}`);
        }
      }
    } finally { physics.dispose(); restore(); }
  });
}

test('shelf pins move into mortises and wood oil persists as visible sheen; before restores dry wood', () => {
  const { view, extra, restore } = sceneFixture(GARDEN_SHELF);
  try {
    extra.update(0.1, 0, { before: false });
    const peg = view.scene.getObjectByName('shelf-pin-left'), dryZ = peg.position.z;
    const back = view.actionTargets.get('shelf-oil').object, dryRoughness = back.material.roughness;
    for (const task of GARDEN_SHELF.operation.tasks) finishTask(view.state, task);
    extra.update(0.1, 1, { before: false });
    assert.ok(peg.position.z < dryZ);
    assert.ok(back.material.roughness < dryRoughness);
    extra.update(0.1, 1, { before: true });
    assert.equal(peg.position.z, dryZ); assert.equal(back.material.roughness, dryRoughness);
    const fernBounds = new THREE.Box3().setFromObject(view.items.get('shelf-fern'));
    const topBounds = new THREE.Box3().setFromObject(view.scene.getObjectByName('shelf-top-board'));
    assert.ok(fernBounds.max.y < topBounds.min.y, 'The upper fern must not intersect the solid top shelf.');
  } finally { restore(); }
});

test('glass roof opens at the calibrated angle and completed mist restores condensation after reload', () => {
  const state = organized(GARDEN_GLASS);
  for (const task of GARDEN_GLASS.operation.tasks) finishTask(state, task);
  const resumed = makeState(unpackState(packState(state), GARDEN_GLASS), GARDEN_GLASS);
  const { view, extra, restore } = sceneFixture(GARDEN_GLASS, resumed);
  try {
    extra.update(0.1, 1, { before: false, stage: 'ready' });
    const roof = view.scene.getObjectByName('case-opening-roof');
    assert.equal(roof.rotation.x, -35 * Math.PI / 180);
    assert.equal(view.scene.getObjectByName('case-condensation').visible, true);
    extra.update(0.1, 1, { before: true, stage: 'ready' });
    assert.equal(Math.abs(roof.rotation.x), 0); assert.equal(view.scene.getObjectByName('case-condensation').visible, false);
  } finally { restore(); }
});

test('fountain water rises, flows only after its switch, restores after reload and leaves basin uncovered', () => {
  const { view, extra, restore } = sceneFixture(GARDEN_FOUNTAIN);
  try {
    const water = view.scene.getObjectByName('fountain-water-level'), stream = view.scene.getObjectByName('fountain-running-water');
    extra.update(0.1, 0, { before: false, stage: 'operate' });
    assert.equal(water.visible, false); assert.equal(stream.visible, false);
    setTaskValue(view.state, 'fountain-valve', 40);
    for (let i = 0; i < 15; i++) advanceTask(view.state, 'fountain-fill', 0.1);
    extra.update(0.1, 1, { before: false, stage: 'operate', actionId: 'fountain-fill' });
    const partialHeight = water.position.y;
    assert.equal(stream.visible, true); assert.ok(partialHeight > 0.19 && partialHeight < 0.535);
    finishTask(view.state, GARDEN_FOUNTAIN.operation.tasks[1]);
    extra.update(0.1, 2, { before: false, stage: 'operate', actionId: null });
    assert.equal(stream.visible, false); assert.ok(water.position.y > partialHeight);
    completeTask(view.state, 'fountain-flow');
    view.state = makeState(unpackState(packState(view.state), GARDEN_FOUNTAIN), GARDEN_FOUNTAIN);
    extra.update(0.1, 3, { before: false, stage: 'ready' });
    assert.equal(stream.visible, true);
    view.scene.updateMatrixWorld(true);
    const ray = new THREE.Raycaster(new THREE.Vector3(-0.37, 0.7, -0.44), new THREE.Vector3(0, -1, 0));
    assert.ok(ray.intersectObjects(view.scene.children, true).find(hit => hit.object === water || !hit.object.material.transparent)?.object === water, 'The clean stone rim must not cover the inner water basin.');
    extra.update(0.1, 3, { before: true, stage: 'done' });
    assert.equal(stream.visible, false); assert.equal(water.visible, false);
  } finally { restore(); }
});

function phoneFinaleCamera(level) {
  const settings = level.cameras.mobile.finale, angle = 0.28;
  const camera = new THREE.PerspectiveCamera(32, 390 / 844, 0.05, 60);
  camera.position.set(Math.sin(angle) * settings.distance + (settings.lookX || 0), settings.height, Math.cos(angle) * settings.distance + settings.lookZ);
  camera.lookAt(settings.lookX || 0, settings.lookY, settings.lookZ); camera.updateMatrixWorld(true); return camera;
}

test('fountain phone ending keeps the complete control unit and bamboo pipe inside the screen', () => {
  const { view, extra, restore } = sceneFixture(GARDEN_FOUNTAIN);
  try {
    for (const task of GARDEN_FOUNTAIN.operation.tasks) finishTask(view.state, task);
    extra.update(0.1, 1, { before: false, stage: 'done' });
    view.scene.updateMatrixWorld(true);
    const camera = phoneFinaleCamera(GARDEN_FOUNTAIN);
    let minX = Infinity, maxX = -Infinity;
    view.scene.traverse(object => {
      if (!object.isMesh) return;
      for (let parent = object; parent; parent = parent.parent) if (!parent.visible) return;
      const position = object.geometry.getAttribute('position');
      for (let i = 0; i < position.count; i++) {
        const point = new THREE.Vector3().fromBufferAttribute(position, i).applyMatrix4(object.matrixWorld).project(camera);
        const x = (point.x + 1) * 195; minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      }
    });
    assert.ok(minX >= 12 && maxX <= 378, `The finished water garden is clipped: ${minX}..${maxX}`);
  } finally { restore(); }
});

test('shelf phone ending exposes every upper frond crown in front of its top board', () => {
  const { view, restore } = sceneFixture(GARDEN_SHELF);
  try {
    view.scene.updateMatrixWorld(true);
    const camera = phoneFinaleCamera(GARDEN_SHELF), plant = view.scene.getObjectByName('shelf-fern-foliage');
    const belongsToPlant = object => { for (let parent = object; parent; parent = parent.parent) if (parent === plant) return true; return false; };
    let crowns = 0, visible = 0;
    plant.traverse(object => {
      if (!object.isMesh || object.geometry.type !== 'BufferGeometry') return;
      const positions = object.geometry.getAttribute('position');
      let highest = new THREE.Vector3(0, -Infinity, 0);
      for (let i = 0; i < positions.count; i++) {
        const candidate = new THREE.Vector3().fromBufferAttribute(positions, i).applyMatrix4(object.matrixWorld);
        if (candidate.y > highest.y) highest = candidate;
      }
      const ray = new THREE.Raycaster(camera.position, highest.clone().sub(camera.position).normalize());
      ray.far = camera.position.distanceTo(highest) + 0.02;
      const first = ray.intersectObjects(view.scene.children, true).find(hit => !hit.object.material.transparent);
      crowns++; if (!first || belongsToPlant(first.object)) visible++;
    });
    assert.equal(crowns, 7);
    assert.equal(visible, crowns, 'The shelf top board must not hide the upper fern crowns.');
  } finally { restore(); }
});
