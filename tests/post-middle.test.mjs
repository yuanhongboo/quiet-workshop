import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { POST_MIDDLE_LEVELS, POST_TYPEWRITER, POST_PARCEL, POST_RADIO } from '../src/post-middle-levels.mjs';
import { buildPostMiddleScene } from '../src/post-middle-scenes.mjs';
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
  const extra = buildPostMiddleScene(view);
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
for (const level of POST_MIDDLE_LEVELS) {
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

test('typewriter physically feeds paper, reveals sequential glyphs and returns carriage; before hides completed work', () => {
  const { view, extra, restore } = sceneFixture(POST_TYPEWRITER);
  try {
    const paper = view.scene.getObjectByName('typewriter-fed-paper'), carriage = view.scene.getObjectByName('typewriter-carriage');
    extra.update(0.1, 0, { before: false });
    assert.equal(paper.position.y, 0);
    setTaskValue(view.state, 'type-feed', 180);
    for (let i = 0; i < 25; i++) advanceTask(view.state, 'type-words', 0.1);
    view.state = makeState(unpackState(packState(view.state), POST_TYPEWRITER), POST_TYPEWRITER);
    extra.update(0.1, 0.05, { before: false, actionId: 'type-words' });
    assert.ok(paper.position.y > 0.17); assert.ok(carriage.position.x < 0);
    const glyphs = view.scene.getObjectByName('typewriter-letter-ink').children;
    assert.equal(glyphs.filter(glyph => glyph.visible).length, 3);
    assert.notEqual(view.scene.getObjectByName('typewriter-typebar').rotation.x, -0.46);
    finishTask(view.state, POST_TYPEWRITER.operation.tasks[1]); completeTask(view.state, 'type-return');
    extra.update(0.1, 2, { before: false });
    assert.equal(carriage.position.x, 0); assert.equal(glyphs.filter(glyph => glyph.visible).length, 7);
    assert.ok(paper.position.y > 0.26);
    extra.update(0.1, 2, { before: true });
    assert.equal(paper.position.y, 0); assert.equal(view.scene.getObjectByName('typewriter-letter-ink').visible, false);
  } finally { restore(); }
});

test('parcel calibration, progressive string geometry, final knot and stamp restore from saved task values', () => {
  const { view, extra, restore } = sceneFixture(POST_PARCEL);
  try {
    const needle = view.scene.getObjectByName('parcel-scale-needle'), first = view.scene.getObjectByName('parcel-cross-string-0'), second = view.scene.getObjectByName('parcel-cross-string-1');
    extra.update(0.1, 0, { before: false });
    assert.ok(needle.rotation.z > 0); assert.equal(first.visible, false);
    setTaskValue(view.state, 'parcel-balance', 0);
    for (let i = 0; i < 12; i++) advanceTask(view.state, 'parcel-wrap', 0.1);
    view.state = makeState(unpackState(packState(view.state), POST_PARCEL), POST_PARCEL);
    extra.update(0.1, 1, { before: false });
    assert.equal(Math.abs(needle.rotation.z), 0); assert.equal(first.visible, true); assert.equal(second.visible, false);
    assert.ok(first.geometry.drawRange.count > 0 && first.geometry.drawRange.count < first.geometry.index.count);
    finishTask(view.state, POST_PARCEL.operation.tasks[1]); completeTask(view.state, 'parcel-stamp');
    extra.update(0.1, 2, { before: false });
    assert.equal(second.geometry.drawRange.count, second.geometry.index.count);
    assert.equal(view.scene.getObjectByName('parcel-tied-knot').visible, true);
    assert.equal(view.scene.getObjectByName('parcel-applied-stamp').visible, true);
    extra.update(0.1, 3, { before: true });
    assert.ok(needle.rotation.z > 0); assert.equal(first.visible, false); assert.equal(view.scene.getObjectByName('parcel-applied-stamp').visible, false);
  } finally { restore(); }
});

test('radio pointer, tuned lamp and receiving bars show saved state; before restores initial frequency', () => {
  const { view, extra, restore } = sceneFixture(POST_RADIO);
  try {
    const needle = view.scene.getObjectByName('radio-frequency-needle'), lamp = view.scene.getObjectByName('radio-tuned-lamp');
    extra.update(0.1, 0, { before: false });
    const initialX = needle.position.x; assert.equal(lamp.material.emissiveIntensity, 0);
    setTaskValue(view.state, 'radio-tune', 62); setTaskValue(view.state, 'radio-volume', 4);
    for (let i = 0; i < 14; i++) advanceTask(view.state, 'radio-receive', 0.1);
    view.state = makeState(unpackState(packState(view.state), POST_RADIO), POST_RADIO);
    extra.update(0.1, 1, { before: false, stage: 'operate', actionId: 'radio-receive' });
    assert.ok(needle.position.x > initialX); assert.ok(lamp.material.emissiveIntensity > 0);
    assert.equal(view.scene.getObjectByName('radio-signal-bars').children.filter(bar => bar.material.emissiveIntensity > 0).length, 2);
    assert.notEqual(view.scene.getObjectByName('radio-speaker-cone').position.z, 0.032);
    finishTask(view.state, POST_RADIO.operation.tasks[2]);
    extra.update(0.1, 1, { before: false, stage: 'done' });
    assert.equal(view.scene.getObjectByName('radio-signal-bars').children.filter(bar => bar.material.emissiveIntensity > 0).length, 7);
    extra.update(0.1, 1, { before: true, stage: 'done' });
    assert.equal(needle.position.x, initialX); assert.equal(lamp.material.emissiveIntensity, 0);
    assert.equal(view.scene.getObjectByName('radio-connected-cord').visible, false);
  } finally { restore(); }
});

for (const level of POST_MIDDLE_LEVELS) test(`${level.id}: surface focus exposes cleaning patches and all initial props have an unobstructed grab point`, async () => {
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
    for (const item of level.items) {
      const root = view.items.get(item.id); let available = 0;
      root.traverse(object => {
        if (!object.isMesh || !visible(object)) return;
        object.geometry.computeBoundingSphere();
        const center = object.geometry.boundingSphere.center.clone().applyMatrix4(object.matrixWorld);
        const hit = firstHit(camera, center);
        if (hit?.object.userData.itemId === item.id) available++;
      });
      assert.ok(available > 0, `${item.id} is hidden behind the main object`);
    }
  } finally { physics.dispose(); restore(); }
});
