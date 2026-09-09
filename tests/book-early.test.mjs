import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { BOOK_EARLY_LEVELS, BOOK_COVER, BOOK_BINDING, BOOK_PRESS } from '../src/book-early-levels.mjs';
import { buildBookEarlyScene } from '../src/book-early-scenes.mjs';
import { makeState, packState, unpackState, stageFor, beginFinale, advanceFinale, canPlaceItem } from '../src/core.mjs';
import { completeTask, advanceTask, setTaskValue, taskAvailable } from '../src/task-actions.mjs';
import { createPropsPhysics } from '../src/physics.mjs';

const organized = level => {
  const state = makeState(null, level); state.surfaces.forEach(field => field.finish());
  level.items.forEach(item => state.placed.add(item.id)); return state;
};
function finish(state, task) {
  if (task.mode === 'tap') return completeTask(state, task.id);
  if (task.mode === 'dial') return setTaskValue(state, task.id, task.target);
  for (let i = 0; i < 100; i++) advanceTask(state, task.id, 0.1);
}
function fixture(level, state = organized(level)) {
  const original = globalThis.document;
  const context = new Proxy({}, { get: (target, key) => target[key] ?? (() => {}), set: (target, key, value) => ((target[key] = value), true) });
  globalThis.document = { createElement: () => ({ getContext: () => context }) };
  const view = {
    level, state, scene: new THREE.Scene(), actionTargets: new Map(), items: new Map(), slots: new Map(), dirtyMeshes: [], wood: new THREE.Texture(),
    surface(id, geometry, settings, position, rotation) {
      const object = new THREE.Mesh(geometry, new THREE.MeshPhysicalMaterial(settings));
      object.position.set(...position); object.rotation.set(...rotation); object.userData.field = state.surfaces.find(field => field.spec.id === id);
      this.dirtyMeshes.push(object); this.scene.add(object); return object;
    },
  };
  const extra = buildBookEarlyScene(view);
  for (const item of level.items) if (state.placed.has(item.id)) {
    view.items.get(item.id).position.set(...item.slot); view.items.get(item.id).rotation.set(...item.slotRotation);
  }
  return { view, extra, dispose() {
    const textures = new Set(), materials = new Set(), geometries = new Set();
    view.scene.traverse(object => {
      if (object.geometry) geometries.add(object.geometry);
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) if (material) {
        materials.add(material); Object.values(material).forEach(value => { if (value?.isTexture) textures.add(value); });
      }
    });
    geometries.forEach(value => value.dispose()); materials.forEach(value => value.dispose()); textures.forEach(value => value.dispose()); globalThis.document = original;
  } };
}
function cameraFor(level, phase = 'tidy', settings = level.cameras.mobile[phase], aspect = 390 / 844) {
  const camera = new THREE.PerspectiveCamera(32, aspect, 0.05, 60), angle = settings.angle ?? 0.28;
  camera.position.set((settings.lookX || 0) + Math.sin(angle) * settings.distance, settings.height, (settings.lookZ || 0) + Math.cos(angle) * settings.distance);
  camera.lookAt(settings.lookX || 0, settings.lookY, settings.lookZ || 0); camera.updateMatrixWorld(true); return camera;
}
const visible = object => { for (let p = object; p; p = p.parent) if (!p.visible) return false; return true; };
function firstOpaque(view, from, point) {
  const ray = new THREE.Raycaster(from, point.clone().sub(from).normalize()); ray.far = from.distanceTo(point) + 0.02;
  return ray.intersectObjects(view.scene.children, true).find(hit => visible(hit.object) && !(hit.object.material?.transparent && hit.object.material.opacity < 0.35))?.object;
}
function bounds(root, camera) {
  const result = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };
  root.traverse(object => {
    if (!object.isMesh || !visible(object)) return;
    const positions = object.geometry.attributes.position;
    assert.ok([...positions.array].every(Number.isFinite));
    for (let i = 0; i < positions.count; i++) {
      const p = new THREE.Vector3().fromBufferAttribute(positions, i).applyMatrix4(object.matrixWorld).project(camera), x = (p.x + 1) * 195, y = (1 - p.y) * 422;
      result.minX = Math.min(result.minX, x); result.maxX = Math.max(result.maxX, x); result.minY = Math.min(result.minY, y); result.maxY = Math.max(result.maxY, y);
    }
  }); return result;
}
for (const level of BOOK_EARLY_LEVELS) {
  test(`${level.id}: contract, saved partial operation and earned ending`, () => {
    assert.equal(level.seasonId, 'hillside-library'); assert.equal(level.sceneFamily, 'book');
    assert.equal(level.inspection, true); assert.equal(level.room.custom, true);
    assert.ok(level.surfaces.length >= 2 && level.items.length >= 2); assert.equal(level.operation.tasks.length, 3);
    const dirty = makeState(null, level); assert.equal(stageFor(dirty), 'clean'); assert.equal(beginFinale(dirty), false);
    const state = organized(level); assert.equal(stageFor(state), 'operate');
    for (const task of level.operation.tasks) {
      if (task.requires?.length) assert.equal(taskAvailable(organized(level), task.id), false);
      if (task.mode === 'hold') {
        for (let i = 0; i < 8; i++) advanceTask(state, task.id, 0.1);
        const resumed = makeState(unpackState(packState(state), level), level);
        assert.equal(resumed.taskValues[task.id], state.taskValues[task.id]); assert.ok(state.taskValues[task.id] > 0 && state.taskValues[task.id] < 1);
        const forged = JSON.parse(packState(state)); forged.completed = true; forged.brewTime = level.operation.duration;
        assert.equal(unpackState(JSON.stringify(forged), level), null);
      }
      finish(state, task);
    }
    assert.equal(stageFor(state), 'ready'); assert.equal(beginFinale(state), true);
    for (let i = 0; i < 60; i++) advanceFinale(state, 0.1);
    assert.equal(stageFor(state), 'done'); assert.equal(makeState(unpackState(packState(state), level), level).completed, true);
  });
  test(`${level.id}: actual Rapier pickup, settling and every fitted part`, async () => {
    const state = makeState(null, level); state.surfaces.forEach(field => field.finish()); const physics = await createPropsPhysics(state);
    try {
      for (const item of level.items) {
        const body = physics.bodies.get(item.id); assert.equal(physics.recoveryReason(body), null); assert.ok(body.translation().y > -0.02);
        assert.equal(canPlaceItem(state, item.id), true); assert.equal(physics.pick(item.id), true);
        physics.move({ x: item.slot[0], y: item.dragHeight, z: item.slot[2] }, item.id);
        for (let i = 0; i < 160; i++) physics.step();
        assert.equal(physics.held, item.id); assert.equal(physics.release(), item.id);
        for (let i = 0; i < 40; i++) physics.step();
        const point = body.translation(); assert.ok(Math.hypot(point.x - item.slot[0], point.y - item.slot[1], point.z - item.slot[2]) < 0.001);
      }
      assert.equal(stageFor(state), 'operate'); assert.equal(physics.events.some(event => event.type === 'recover'), false);
    } finally { physics.dispose(); }
  });
  test(`${level.id}: all loose props are visible and reachable on a 390px phone`, async t => {
    const state = makeState(null, level), physics = await createPropsPhysics(state), scene = fixture(level, state), { view, extra } = scene;
    try {
      for (const task of level.operation.tasks) assert.ok(view.actionTargets.has(task.id));
      for (const item of level.items) {
        const body = physics.bodies.get(item.id), group = view.items.get(item.id); group.position.copy(body.translation()); group.quaternion.copy(body.rotation());
      }
      extra.update(0.1, 1, { before: false, stage: 'tidy' }); view.scene.updateMatrixWorld(true); const camera = cameraFor(level);
      for (const item of level.items) {
        const group = view.items.get(item.id), frame = bounds(group, camera);
        assert.ok(frame.minX >= 8 && frame.maxX <= 382, `${item.id} phone bounds ${JSON.stringify(frame)}`);
        const center = new THREE.Box3().setFromObject(group).getCenter(new THREE.Vector3());
        const first = firstOpaque(view, camera.position, center);
        const bodyPoint = new THREE.Vector3().copy(physics.bodies.get(item.id).translation());
        const physicalHit = physics.world.castRay(new RAPIER.Ray(camera.position, bodyPoint.clone().sub(camera.position).normalize()), camera.position.distanceTo(bodyPoint) + 0.05, true);
        assert.equal(physicalHit?.collider.parent()?.handle, physics.bodies.get(item.id).handle, `${item.id} actual initial collider ray is blocked`);
        assert.equal(first?.userData.itemId, item.id, `${item.id} covered by ${first?.name || first?.parent?.name || first?.geometry?.type}`);
      }
      for (const item of level.items) { physics.snap(item.id, false); view.items.get(item.id).position.set(...item.slot); view.items.get(item.id).rotation.set(...item.slotRotation); }
      state.surfaces.forEach(field => field.finish());
      for (const task of level.operation.tasks) finish(state, task);
      assert.equal(stageFor(state), 'ready'); assert.equal(beginFinale(state), true);
      for (let i = 0; i < 60; i++) advanceFinale(state, 0.1); assert.equal(stageFor(state), 'done');
      const saved = packState(state); extra.update(0.1, 1, { before: false, stage: 'done' }); assert.equal(packState(state), saved); view.scene.updateMatrixWorld(true);
      const frame = bounds(view.scene, cameraFor(level, 'finale'));
      assert.ok(frame.minX >= 10 && frame.maxX <= 380 && frame.minY > 180 && frame.maxY < 740, `${level.id} complete bounds ${JSON.stringify(frame)}`);
      let count = 0, triangles = 0;
      view.scene.traverse(object => { if (object.isMesh) { count++; triangles += (object.geometry.index?.count || object.geometry.attributes.position.count) / 3; } });
      assert.ok(count < 150 && triangles < 100000, `Scene cost ${count} meshes, ${triangles} triangles`);
      t.diagnostic(`${level.id}: ${count} meshes / ${triangles} triangles; phone bounds ${JSON.stringify(frame)}`);
    } finally { physics.dispose(); scene.dispose(); }
  });
  test(`${level.id}: every cleaning patch has an unobstructed focus view`, async () => {
    const state = makeState(null, level), physics = await createPropsPhysics(state), scene = fixture(level, state), { view, extra } = scene;
    try {
      for (const item of level.items) { const body = physics.bodies.get(item.id), group = view.items.get(item.id); group.position.copy(body.translation()); group.quaternion.copy(body.rotation()); }
      extra.update(0.1, 1, { before: false, stage: 'clean' }); view.scene.updateMatrixWorld(true);
      for (const surface of view.dirtyMeshes) {
        const spec = surface.userData.field.spec, camera = cameraFor(level, 'default', spec.camera);
        let clear = 0;
        for (const x of [-0.38, 0, 0.38]) for (const y of [-0.35, 0, 0.35]) {
          const point = new THREE.Vector3(x * spec.width, y * spec.height, 0).applyMatrix4(surface.matrixWorld);
          if (firstOpaque(view, camera.position, point) === surface) clear++;
        }
        assert.ok(clear >= 8, `${spec.id} only ${clear}/9 visible cleaning patches`);
      }
    } finally { physics.dispose(); scene.dispose(); }
  });
}

test('cover crease, fitted corner and title follow the hinged cloth cover without save mutation', () => {
  const scene = fixture(BOOK_COVER), { view, extra } = scene;
  try {
    const hinge = view.scene.getObjectByName('book-cover-hinge'), crease = view.scene.getObjectByName('book-cover-repaired-crease');
    extra.update(0.1, 0, { before: false }); assert.equal(hinge.rotation.z, 0); assert.equal(crease.visible, true);
    completeTask(view.state, 'book-cover-corner');
    for (let i = 0; i < 15; i++) advanceTask(view.state, 'book-cover-smooth', 0.1);
    extra.update(0.1, 1, { before: false }); const partial = crease.scale.z; assert.ok(partial > 0 && partial < 1);
    view.state = makeState(unpackState(packState(view.state), BOOK_COVER), BOOK_COVER); extra.update(0.1, 1, { before: false }); assert.equal(crease.scale.z, partial);
    finish(view.state, BOOK_COVER.operation.tasks[1]); completeTask(view.state, 'book-cover-open'); const saved = packState(view.state);
    extra.update(0.1, 1, { before: false }); assert.equal(packState(view.state), saved); assert.equal(crease.visible, false); assert.equal(hinge.rotation.z, 2.94);
    assert.ok(view.items.get('book-cover-label').position.x < -1); view.scene.updateMatrixWorld(true);
    const page = view.scene.getObjectByName('book-cover-first-page');
    assert.equal(firstOpaque(view, cameraFor(BOOK_COVER, 'finale').position, page.getWorldPosition(new THREE.Vector3())), page);
    assert.equal(page.material.toneMapped, false);
    const inside = view.scene.getObjectByName('book-cover-inside-label');
    // Once opened, both printed faces must read left-to-right and upright together.
    for (const axis of [[1, 0, 0], [0, 1, 0]]) {
      const labelDirection = new THREE.Vector3(...axis).transformDirection(inside.matrixWorld);
      const pageDirection = new THREE.Vector3(...axis).transformDirection(page.matrixWorld);
      assert.ok(labelDirection.dot(pageDirection) > 0.9, 'Opened inner-cover lettering must share the page reading orientation.');
    }
    assert.equal(firstOpaque(view, cameraFor(BOOK_COVER, 'finale').position, inside.getWorldPosition(new THREE.Vector3())), inside);
    extra.update(0.1, 1, { before: true }); assert.equal(hinge.rotation.z, 0); assert.equal(crease.visible, true); assert.equal(crease.scale.z, 1);
  } finally { scene.dispose(); }
});
test('binding builds six actual stitches, trims the free tail and restores the tied loop on reload', () => {
  const scene = fixture(BOOK_BINDING), { view, extra } = scene;
  try {
    const stitches = view.scene.getObjectByName('book-binding-stitch-path'), tail = view.scene.getObjectByName('book-binding-untrimmed-tail'), knot = view.scene.getObjectByName('book-binding-knot-loop');
    extra.update(0.1, 0, { before: false }); assert.equal(stitches.visible, false); assert.equal(knot.visible, false);
    for (let i = 0; i < 16; i++) advanceTask(view.state, 'book-binding-stitch', 0.1);
    extra.update(0.1, 1, { before: false }); const counts = stitches.children.map(object => object.geometry.drawRange.count);
    assert.ok(counts.some(count => count > 0) && counts.some(count => count === 0));
    view.state = makeState(unpackState(packState(view.state), BOOK_BINDING), BOOK_BINDING); extra.update(0.1, 1, { before: false }); assert.deepEqual(stitches.children.map(object => object.geometry.drawRange.count), counts);
    finish(view.state, BOOK_BINDING.operation.tasks[0]); extra.update(0.1, 1, { before: false }); assert.equal(tail.visible, true);
    completeTask(view.state, 'book-binding-trim'); extra.update(0.1, 1, { before: false }); assert.equal(tail.visible, false); assert.equal(knot.visible, true);
    finish(view.state, BOOK_BINDING.operation.tasks[2]); extra.update(0.1, 1, { before: false }); assert.equal(knot.scale.x, 0.36);
    view.state = makeState(unpackState(packState(view.state), BOOK_BINDING), BOOK_BINDING); extra.update(0.1, 1, { before: false }); assert.equal(knot.scale.x, 0.36);
    view.scene.updateMatrixWorld(true); const page = view.scene.getObjectByName('book-binding-readable-pages');
    assert.equal(firstOpaque(view, cameraFor(BOOK_BINDING, 'finale').position, page.getWorldPosition(new THREE.Vector3())), page); assert.equal(page.material.toneMapped, false);
    extra.update(0.1, 1, { before: true }); assert.equal(stitches.visible, false); assert.equal(tail.visible, false); assert.equal(knot.visible, false);
  } finally { scene.dispose(); }
});
test('press lowers its screw and platen, physically flattens vertices, then raises to reveal the book', () => {
  const scene = fixture(BOOK_PRESS), { view, extra } = scene;
  try {
    const screw = view.scene.getObjectByName('book-press-screw'), platen = view.scene.getObjectByName('book-press-moving-platen'), curl = view.scene.getObjectByName('book-press-curling-page');
    const rise = () => Math.max(...Array.from({ length: curl.geometry.attributes.position.count }, (_, i) => curl.geometry.attributes.position.getZ(i)));
    extra.update(0.1, 0, { before: false }); const initial = rise(); assert.ok(initial > 0.14);
    setTaskValue(view.state, 'book-press-turn', 180);
    for (let i = 0; i < 19; i++) advanceTask(view.state, 'book-press-flatten', 0.1);
    extra.update(0.1, 1, { before: false }); const progress = { platen: platen.position.y, screw: screw.position.y, rise: rise() };
    assert.ok(platen.position.y < 1 && rise() < initial);
    view.state = makeState(unpackState(packState(view.state), BOOK_PRESS), BOOK_PRESS); extra.update(0.1, 1, { before: false }); assert.deepEqual({ platen: platen.position.y, screw: screw.position.y, rise: rise() }, progress);
    finish(view.state, BOOK_PRESS.operation.tasks[1]); extra.update(0.1, 1, { before: false }); assert.equal(rise(), 0); assert.ok(Math.abs(platen.position.y - 0.51) < 0.0001);
    completeTask(view.state, 'book-press-release'); extra.update(0.1, 1, { before: false }); assert.equal(platen.position.y, 1.12); assert.equal(rise(), 0);
    view.scene.updateMatrixWorld(true); assert.equal(curl.material.toneMapped, false);
    const camera = cameraFor(BOOK_PRESS, 'finale'), point = curl.localToWorld(new THREE.Vector3(0, -0.40, 0));
    assert.equal(firstOpaque(view, camera.position, point), curl, 'The released paper must emerge visibly ahead of the platen.');
    extra.update(0.1, 1, { before: true }); assert.equal(rise(), initial); assert.equal(screw.position.y, 1.56);
  } finally { scene.dispose(); }
});
