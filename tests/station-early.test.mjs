import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { STATION_EARLY_LEVELS, STATION_SIGN, STATION_BENCH, STATION_TICKET } from '../src/station-early-levels.mjs';
import { buildStationEarlyScene } from '../src/station-early-scenes.mjs';
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
  const extra = buildStationEarlyScene(view);
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
  return ray.intersectObjects(view.scene.children, true).find(hit => visible(hit.object) && !hit.object.material?.transparent)?.object;
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
for (const level of STATION_EARLY_LEVELS) {
  test(`${level.id}: contract, saved partial operation and earned ending`, () => {
    assert.equal(level.seasonId, 'mountain-station'); assert.equal(level.sceneFamily, 'station');
    assert.equal(level.inspection, true); assert.equal(level.room.custom, true);
    assert.ok(level.surfaces.length >= 2 && level.items.length >= 2); assert.equal(level.operation.tasks.length, 3);
    const state = organized(level); assert.equal(stageFor(state), 'operate');
    for (const task of level.operation.tasks) {
      if (task.requires) assert.equal(taskAvailable(organized(level), task.id), false);
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
  test(`${level.id}: all loose props are visible and reachable on a 390px phone`, async () => {
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
        assert.equal(first?.userData.itemId, item.id, `${item.id} covered by ${first?.name || first?.parent?.name || first?.geometry?.type}`);
      }
      for (const item of level.items) { physics.snap(item.id, false); view.items.get(item.id).position.set(...item.slot); view.items.get(item.id).rotation.set(...item.slotRotation); }
      for (const task of level.operation.tasks) finish(state, task);
      extra.update(0.1, 1, { before: false, stage: 'done' }); view.scene.updateMatrixWorld(true);
      const frame = bounds(view.scene, cameraFor(level, 'finale'));
      assert.ok(frame.minX >= 10 && frame.maxX <= 380 && frame.minY > 180 && frame.maxY < 740, `${level.id} complete bounds ${JSON.stringify(frame)}`);
      let count = 0, triangles = 0;
      view.scene.traverse(object => { if (object.isMesh) { count++; triangles += (object.geometry.index?.count || object.geometry.attributes.position.count) / 3; } });
      assert.ok(count < 150 && triangles < 120000, `Scene cost ${count} meshes, ${triangles} triangles`);
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

test('station sign remembers partial screw fitting, aligned name and the direction pointer', () => {
  const scene = fixture(STATION_SIGN), { view, extra } = scene;
  try {
    const name = view.scene.getObjectByName('station-sign-straight-name'), pointer = view.scene.getObjectByName('station-sign-direction-pointer');
    extra.update(0.1, 0, { before: false }); assert.ok(name.rotation.z < 0); assert.equal(pointer.rotation.z, -0.42);
    setTaskValue(view.state, 'station-sign-align', 0); for (let i = 0; i < 7; i++) advanceTask(view.state, 'station-sign-tighten', 0.1);
    const saved = packState(view.state); extra.update(0.1, 1, { before: false }); const screws = view.actionTargets.get('station-sign-tighten').object.children.map(object => object.position.z);
    view.state = makeState(unpackState(saved, STATION_SIGN), STATION_SIGN); extra.update(0.1, 1, { before: false });
    assert.deepEqual(view.actionTargets.get('station-sign-tighten').object.children.map(object => object.position.z), screws);
    for (const task of STATION_SIGN.operation.tasks) finish(view.state, task); extra.update(0.1, 1, { before: false }); assert.equal(Math.abs(name.rotation.z), 0); assert.equal(Math.abs(pointer.rotation.z), 0);
    view.scene.updateMatrixWorld(true); const face = view.scene.getObjectByName('station-sign-readable-name');
    assert.equal(firstOpaque(view, cameraFor(STATION_SIGN, 'finale').position, face.getWorldPosition(new THREE.Vector3())), face);
    extra.update(0.1, 1, { before: true }); assert.ok(name.rotation.z < 0); assert.equal(pointer.rotation.z, -0.42);
  } finally { scene.dispose(); }
});
test('bench sanding removes the scuffs and persisted oil visibly changes the same wood', () => {
  const scene = fixture(STATION_BENCH), { view, extra } = scene;
  try {
    const scars = view.scene.getObjectByName('station-bench-wood-scuffs'), seat = view.actionTargets.get('station-bench-oil').object;
    extra.update(0.1, 0, { before: false }); const initial = seat.material.color.getHex(), roughness = seat.material.roughness; assert.equal(scars.visible, true);
    finish(view.state, STATION_BENCH.operation.tasks[0]); finish(view.state, STATION_BENCH.operation.tasks[1]);
    for (let i = 0; i < 12; i++) advanceTask(view.state, 'station-bench-oil', 0.1);
    extra.update(0.1, 1, { before: false }); assert.equal(scars.visible, false); assert.ok(seat.material.roughness < roughness); assert.notEqual(seat.material.color.getHex(), initial);
    const partial = seat.material.color.getHex(); view.state = makeState(unpackState(packState(view.state), STATION_BENCH), STATION_BENCH); extra.update(0.1, 1, { before: false }); assert.equal(seat.material.color.getHex(), partial);
    finish(view.state, STATION_BENCH.operation.tasks[2]); extra.update(0.1, 1, { before: false }); assert.ok(seat.material.clearcoat > 0.5);
    extra.update(0.1, 1, { before: true }); assert.equal(scars.visible, true); assert.equal(seat.material.color.getHex(), initial);
  } finally { scene.dispose(); }
});
test('ticket roll turns, press lifts and true paper holes survive refresh and before comparison', () => {
  const scene = fixture(STATION_TICKET), { view, extra } = scene;
  try {
    const paper = view.scene.getObjectByName('station-ticket-presented-paper'), punched = view.scene.getObjectByName('station-ticket-punched-paper');
    const pins = view.scene.getObjectByName('station-ticket-descending-pins'), lever = view.scene.getObjectByName('station-ticket-press-lever');
    extra.update(0.1, 0, { before: false }); assert.equal(paper.visible, false);
    for (let i = 0; i < 12; i++) advanceTask(view.state, 'station-ticket-feed', 0.1);
    extra.update(0.1, 1, { before: false }); const partial = paper.position.z; assert.equal(paper.visible, true); assert.ok(view.scene.getObjectByName('station-ticket-moving-reel').rotation.z < 0);
    view.state = makeState(unpackState(packState(view.state), STATION_TICKET), STATION_TICKET); extra.update(0.1, 1, { before: false }); assert.equal(paper.position.z, partial);
    finish(view.state, STATION_TICKET.operation.tasks[0]); for (let i = 0; i < 18; i++) advanceTask(view.state, 'station-ticket-punch', 0.1);
    extra.update(0.1, 1, { before: false }); assert.ok(pins.position.y < -0.05 && lever.rotation.z < -0.3); assert.equal(punched.visible, false);
    finish(view.state, STATION_TICKET.operation.tasks[1]); finish(view.state, STATION_TICKET.operation.tasks[2]); extra.update(0.1, 1, { before: false });
    assert.equal(Math.abs(pins.position.y), 0); assert.equal(Math.abs(lever.rotation.z), 0); assert.equal(punched.visible, true); assert.equal(punched.geometry.parameters.shapes.holes.length, 2);
    view.state = makeState(unpackState(packState(view.state), STATION_TICKET), STATION_TICKET); extra.update(0.1, 1, { before: false }); assert.equal(punched.visible, true);
    view.scene.updateMatrixWorld(true); const camera = cameraFor(STATION_TICKET, 'finale');
    assert.equal(firstOpaque(view, camera.position, punched.localToWorld(new THREE.Vector3(0, 0.08, 0))), punched, 'The finished printed ticket must be readable in front of the raised punch.');
    for (const x of [-0.19, 0.19]) {
      const point = punched.localToWorld(new THREE.Vector3(x, -0.355, 0)); const ray = new THREE.Raycaster(point.clone().add(new THREE.Vector3(0, 0.05, 0)), new THREE.Vector3(0, -1, 0));
      assert.equal(ray.intersectObject(punched, false).length, 0, 'Punched circles must be actual geometry holes.');
    }
    extra.update(0.1, 1, { before: true }); assert.equal(paper.visible, false); assert.equal(punched.visible, false);
  } finally { scene.dispose(); }
});
