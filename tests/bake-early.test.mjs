import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { BAKE_EARLY_LEVELS, BAKE_OVEN, BAKE_MILL, BAKE_SCALE } from '../src/bake-early-levels.mjs';
import { buildBakeEarlyScene } from '../src/bake-early-scenes.mjs';
import { makeState, packState, unpackState, stageFor, beginFinale, advanceFinale, canPlaceItem } from '../src/core.mjs';
import { completeTask, advanceTask, setTaskValue, taskAvailable } from '../src/task-actions.mjs';
import { buildBakeEnvironment } from '../src/bake-environment.mjs';
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
function finishScene(state) { assert.equal(stageFor(state), 'ready'); assert.equal(beginFinale(state), true); for (let i = 0; i < 80; i++) advanceFinale(state, 0.1); assert.equal(stageFor(state), 'done'); }
function fixture(level, state = organized(level)) {
  const original = globalThis.document;
  const context = new Proxy({ createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }) }, { get: (target, key) => target[key] ?? (() => {}), set: (target, key, value) => ((target[key] = value), true) });
  globalThis.document = { createElement: () => ({ getContext: () => context }) };
  const view = {
    level, state, angle: 0.28, renderer: {}, scene: new THREE.Scene(), actionTargets: new Map(), items: new Map(), slots: new Map(), dirtyMeshes: [], wood: new THREE.Texture(),
    surface(id, geometry, settings, position, rotation) {
      const object = new THREE.Mesh(geometry, new THREE.MeshPhysicalMaterial(settings));
      object.position.set(...position); object.rotation.set(...rotation); object.userData.field = state.surfaces.find(field => field.spec.id === id);
      this.dirtyMeshes.push(object); this.scene.add(object); return object;
    },
  };
  const environment = buildBakeEnvironment(view);
  const sceneExtra = buildBakeEarlyScene(view);
  const extra = { update(dt, time, options) { environment.update(dt, time, options); sceneExtra.update(dt, time, options); } };
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
    for (let parent = object; parent; parent = parent.parent) if (parent.name === 'bake-environment') return;
    const positions = object.geometry.attributes.position;
    assert.ok([...positions.array].every(Number.isFinite));
    for (let i = 0; i < positions.count; i++) {
      const p = new THREE.Vector3().fromBufferAttribute(positions, i).applyMatrix4(object.matrixWorld).project(camera), x = (p.x + 1) * 195, y = (1 - p.y) * 422;
      result.minX = Math.min(result.minX, x); result.maxX = Math.max(result.maxX, x); result.minY = Math.min(result.minY, y); result.maxY = Math.max(result.maxY, y);
    }
  }); return result;
}
for (const level of BAKE_EARLY_LEVELS) {
  test(`${level.id}: contract, saved partial operation and earned ending`, () => {
    assert.equal(level.seasonId, 'evening-bakery'); assert.equal(level.sceneFamily, 'bake');
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
        assert.ok(frame.minX >= 8 && frame.maxX <= 382 && frame.minY > 180 && frame.maxY < 740, `${item.id} phone bounds ${JSON.stringify(frame)}`);
        const center = new THREE.Box3().setFromObject(group).getCenter(new THREE.Vector3());
        const candidates = [center]; group.traverse(object => { if (object.isMesh && visible(object)) candidates.push(object.getWorldPosition(new THREE.Vector3())); });
        const first = candidates.map(point => firstOpaque(view, camera.position, point)).find(object => object?.userData.itemId === item.id);
        const bodyPoint = new THREE.Vector3().copy(physics.bodies.get(item.id).translation());
        const physicalHit = physics.world.castRay(new RAPIER.Ray(camera.position, bodyPoint.clone().sub(camera.position).normalize()), camera.position.distanceTo(bodyPoint) + 0.05, true);
        assert.equal(physicalHit?.collider.parent()?.handle, physics.bodies.get(item.id).handle, `${item.id} actual initial collider ray is blocked`);
        assert.equal(first?.userData.itemId, item.id, `${item.id} covered by ${first?.name || first?.parent?.name || first?.geometry?.type}`);
      }
      const initialFrame = bounds(view.scene, camera); assert.ok(initialFrame.minX >= 8 && initialFrame.maxX <= 382 && initialFrame.minY > 180 && initialFrame.maxY < 740, `${level.id} initial scene bounds ${JSON.stringify(initialFrame)}`);
      for (const item of level.items) { physics.snap(item.id, false); view.items.get(item.id).position.set(...item.slot); view.items.get(item.id).rotation.set(...item.slotRotation); }
      state.surfaces.forEach(field => field.finish());
      for (const task of level.operation.tasks) finish(state, task);
      assert.equal(stageFor(state), 'ready'); assert.equal(beginFinale(state), true);
      for (let i = 0; i < 60; i++) advanceFinale(state, 0.1); assert.equal(stageFor(state), 'done');
      const saved = packState(state); extra.update(0.1, 1, { before: false, stage: 'done' }); assert.equal(packState(state), saved); view.scene.updateMatrixWorld(true);
      const frame = bounds(view.scene, cameraFor(level, 'finale'));
      assert.ok(frame.minX >= 10 && frame.maxX <= 380 && frame.minY > 180 && frame.maxY < 740, `${level.id} complete bounds ${JSON.stringify(frame)}`);
      let count = 0, triangles = 0;
      view.scene.traverse(object => { for (let p = object; p; p = p.parent) if (p.name === 'bake-environment') return; if (object.isMesh) { count++; triangles += (object.geometry.index?.count || object.geometry.attributes.position.count) / 3; } });
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
        const spec = surface.userData.field.spec, camera = cameraFor(level, 'default', spec.camera); view.angle = spec.camera.angle ?? 0.28; extra.update(0.1, 1, { before: false, stage: 'clean' }); view.scene.updateMatrixWorld(true);
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


for (const level of BAKE_EARLY_LEVELS) test(`${level.id}: active real-object task targets remain reachable with every part fitted`, () => {
  const scene = fixture(level), { view, extra } = scene;
  try {
    for (const task of level.operation.tasks) {
      assert.equal(taskAvailable(view.state, task.id), true);
      extra.update(0.1, 1, { before: false, stage: 'operate', actionId: task.id }); view.scene.updateMatrixWorld(true);
      const target = view.actionTargets.get(task.id).object, points = [];
      target.traverse(object => { if (object.isMesh && visible(object)) {
        points.push(object.getWorldPosition(new THREE.Vector3()));
        const positions = object.geometry.attributes.position;
        for (let i = 0; i < positions.count; i += Math.max(1, Math.floor(positions.count / 24))) points.push(new THREE.Vector3().fromBufferAttribute(positions, i).applyMatrix4(object.matrixWorld));
      } });
      const camera = cameraFor(level, 'default');
      assert.ok(points.some(point => firstOpaque(view, camera.position, point)?.userData.actionId === task.id), `${task.id} needs an unobstructed visible interaction surface`);
      finish(view.state, task);
    }
    assert.equal(stageFor(view.state), 'ready');
  } finally { scene.dispose(); }
});
test('oven door, dryness and warm light resume exactly from saved task state', () => {
  const scene = fixture(BAKE_OVEN), { view, extra } = scene;
  try {
    const hinge = view.scene.getObjectByName('bake-oven-door-hinge'), dry = view.scene.getObjectByName('bake-oven-dry-hinge'), bulb = view.scene.getObjectByName('bake-oven-warm-bulb');
    extra.update(0.1, 0, { before: false }); assert.equal(hinge.rotation.x, 0.30); assert.equal(bulb.material.emissiveIntensity, 0);
    for (let i = 0; i < 15; i++) advanceTask(view.state, 'bake-oven-oil', 0.1);
    extra.update(0.1, 1, { before: false }); const partial = dry.scale.y; assert.ok(partial > 0 && partial < 1);
    view.state = makeState(unpackState(packState(view.state), BAKE_OVEN), BAKE_OVEN); extra.update(0.1, 1, { before: false }); assert.equal(dry.scale.y, partial);
    finish(view.state, BAKE_OVEN.operation.tasks[0]); completeTask(view.state, 'bake-oven-close'); completeTask(view.state, 'bake-oven-light');
    finishScene(view.state); const saved = packState(view.state); extra.update(0.1, 1, { before: false }); assert.equal(packState(view.state), saved);
    assert.equal(hinge.rotation.x, 0); assert.equal(dry.visible, false); assert.equal(bulb.material.emissiveIntensity, 2.8);
    assert.equal(view.scene.getObjectByName('bake-oven-golden-interior').material.opacity, 0.42);
    view.scene.updateMatrixWorld(true);
    for (const screen of ['mobile', 'desktop']) {
      const camera = cameraFor(BAKE_OVEN, 'finale', BAKE_OVEN.cameras[screen].finale, screen === 'mobile' ? 390 / 844 : 1280 / 720);
      assert.equal(firstOpaque(view, camera.position, bulb.getWorldPosition(new THREE.Vector3())), bulb, `${screen}: the lit bulb must be visible through the door glass, clear of the control fascia and frame.`);
    }
    extra.update(0.1, 1, { before: true }); assert.equal(hinge.rotation.x, 0.30); assert.equal(bulb.material.emissiveIntensity, 0); assert.equal(dry.visible, true);
  } finally { scene.dispose(); }
});
test('mill crank rotates, wheat decreases and collected flour stays in the extracted drawer after reload', () => {
  const scene = fixture(BAKE_MILL), { view, extra } = scene;
  try {
    const crank = view.scene.getObjectByName('bake-mill-turning-crank'), wheat = view.scene.getObjectByName('bake-mill-wheat'), pile = view.scene.getObjectByName('bake-mill-collected-flour'), drawer = view.scene.getObjectByName('bake-mill-flour-drawer');
    extra.update(0.1, 0, { before: false }); assert.equal(pile.visible, false); assert.equal(wheat.visible, true);
    completeTask(view.state, 'bake-mill-latch'); for (let i = 0; i < 17; i++) advanceTask(view.state, 'bake-mill-grind', 0.1);
    extra.update(0.1, 1, { before: false, actionId: 'bake-mill-grind' }); const partial = { turn: crank.rotation.z, wheat: wheat.position.y, flour: pile.scale.y };
    assert.ok(partial.turn < 0 && partial.wheat < 0.13 && partial.flour > 0); assert.equal(view.scene.getObjectByName('bake-mill-falling-flour').visible, true);
    view.state = makeState(unpackState(packState(view.state), BAKE_MILL), BAKE_MILL); extra.update(0.1, 1, { before: false }); assert.deepEqual({ turn: crank.rotation.z, wheat: wheat.position.y, flour: pile.scale.y }, partial);
    assert.equal(view.scene.getObjectByName('bake-mill-falling-flour').visible, false);
    finish(view.state, BAKE_MILL.operation.tasks[1]); completeTask(view.state, 'bake-mill-drawer'); finishScene(view.state); extra.update(0.1, 1, { before: false });
    assert.equal(wheat.visible, false); assert.equal(pile.visible, true); assert.ok(Math.abs(drawer.position.z - 0.92) < 1e-9);
    view.scene.updateMatrixWorld(true); const camera = cameraFor(BAKE_MILL, 'finale');
    const point = pile.localToWorld(new THREE.Vector3(0, 0.40, 0.15));
    assert.equal(firstOpaque(view, camera.position, point), pile, 'The extracted drawer must expose real visible flour.');
    extra.update(0.1, 1, { before: true }); assert.equal(pile.visible, false); assert.equal(wheat.visible, true);
  } finally { scene.dispose(); }
});
test('scale needle and pan settle as the bag fills; folded label is upright and state restores', () => {
  const scene = fixture(BAKE_SCALE), { view, extra } = scene;
  try {
    const needle = view.scene.getObjectByName('bake-scale-needle'), flour = view.scene.getObjectByName('bake-scale-bag-flour'), flap = view.scene.getObjectByName('bake-scale-folded-mouth'), pan = view.scene.getObjectByName('bake-scale-weighing-pan');
    extra.update(0.1, 0, { before: false }); assert.ok(needle.rotation.z > 0); assert.equal(flour.visible, false);
    setTaskValue(view.state, 'bake-scale-zero', 0); extra.update(0.1, 0, { before: false }); assert.equal(needle.rotation.z, 0);
    for (let i = 0; i < 15; i++) advanceTask(view.state, 'bake-scale-fill', 0.1);
    extra.update(0.1, 1, { before: false }); const partial = { needle: needle.rotation.z, flour: flour.scale.y, pan: pan.position.y };
    assert.ok(partial.needle < 0 && partial.flour > 0 && partial.pan < 1.58);
    view.state = makeState(unpackState(packState(view.state), BAKE_SCALE), BAKE_SCALE); extra.update(0.1, 1, { before: false }); assert.deepEqual({ needle: needle.rotation.z, flour: flour.scale.y, pan: pan.position.y }, partial);
    finish(view.state, BAKE_SCALE.operation.tasks[1]); completeTask(view.state, 'bake-scale-fold'); finishScene(view.state); extra.update(0.1, 1, { before: false }); assert.equal(needle.rotation.z, -0.81); assert.ok(Math.abs(flap.rotation.x) < 1e-9);
    view.scene.updateMatrixWorld(true); const camera = cameraFor(BAKE_SCALE, 'finale');
    for (const name of ['bake-scale-readable-face', 'bake-scale-bag-label', 'bake-scale-fold-label']) {
      const label = view.scene.getObjectByName(name); assert.equal(label.material.toneMapped, false);
      assert.ok(new THREE.Vector3(1, 0, 0).transformDirection(label.matrixWorld).x > 0.99, `${name} reads left to right`);
      assert.equal(firstOpaque(view, camera.position, label.getWorldPosition(new THREE.Vector3())), label, `${name} is visible on the completed scale`);
    }
    extra.update(0.1, 1, { before: true }); assert.equal(flour.visible, false); assert.equal(flap.rotation.x, -Math.PI / 2);
  } finally { scene.dispose(); }
});
