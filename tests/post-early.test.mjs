import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { POST_EARLY_LEVELS, POST_BOX, POST_SORTER, POST_STAMP } from '../src/post-early-levels.mjs';
import { buildPostEarlyScene } from '../src/post-early-scenes.mjs';
import { makeState, packState, unpackState, stageFor, beginFinale, advanceFinale, canPlaceItem } from '../src/core.mjs';
import { completeTask, advanceTask, setTaskValue, taskAvailable } from '../src/task-actions.mjs';
import { createPropsPhysics } from '../src/physics.mjs';

function organized(level) {
  const state = makeState(null, level); state.surfaces.forEach(field => field.finish());
  level.items.forEach(item => state.placed.add(item.id)); return state;
}
function finishTask(state, task) {
  if (task.mode === 'tap') return completeTask(state, task.id);
  if (task.mode === 'dial') return setTaskValue(state, task.id, task.target);
  for (let n = 0; n < 100; n++) advanceTask(state, task.id, 0.1);
}
function fixture(level, state = organized(level)) {
  const oldDocument = globalThis.document;
  const context = new Proxy({}, { get: (target, key) => target[key] ?? (() => {}), set: (target, key, val) => ((target[key] = val), true) });
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
  const extra = buildPostEarlyScene(view);
  for (const item of level.items) if (state.placed.has(item.id)) {
    view.items.get(item.id).position.set(...item.slot); view.items.get(item.id).rotation.set(...item.slotRotation);
  }
  return { view, extra, dispose() {
    extra.dispose?.();
    const textures = new Set(), materials = new Set(), geometries = new Set();
    view.scene.traverse(object => {
      if (object.geometry) geometries.add(object.geometry);
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) if (material) {
        materials.add(material); Object.values(material).forEach(v => { if (v?.isTexture) textures.add(v); });
      }
    });
    geometries.forEach(v => v.dispose()); materials.forEach(v => v.dispose()); textures.forEach(v => v.dispose());
    globalThis.document = oldDocument;
  } };
}
function mobileCamera(level, phase = 'tidy') {
  const settings = level.cameras.mobile[phase], camera = new THREE.PerspectiveCamera(32, 390 / 844, 0.05, 60);
  const angle = 0.28, x = settings.lookX || 0, z = settings.lookZ || 0;
  camera.position.set(x + Math.sin(angle) * settings.distance, settings.height, z + Math.cos(angle) * settings.distance);
  camera.lookAt(x, settings.lookY, z); camera.updateMatrixWorld(true); return camera;
}
function projectedBounds(root, camera) {
  const bounds = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };
  root.traverse(object => {
    if (!object.isMesh) return;
    for (let p = object; p; p = p.parent) if (!p.visible) return;
    const positions = object.geometry.getAttribute('position'); assert.ok([...positions.array].every(Number.isFinite));
    for (let i = 0; i < positions.count; i++) {
      const point = new THREE.Vector3().fromBufferAttribute(positions, i).applyMatrix4(object.matrixWorld).project(camera);
      const x = (point.x + 1) * 195, y = (1 - point.y) * 422;
      bounds.minX = Math.min(bounds.minX, x); bounds.maxX = Math.max(bounds.maxX, x);
      bounds.minY = Math.min(bounds.minY, y); bounds.maxY = Math.max(bounds.maxY, y);
    }
  }); return bounds;
}
for (const level of POST_EARLY_LEVELS) {
  test(`${level.id}: ordered finishing, partial saves, forged endings and complete ending`, () => {
    const state = organized(level); assert.equal(stageFor(state), 'operate');
    const gated = level.operation.tasks.find(task => task.requires?.length); assert.equal(taskAvailable(state, gated.id), false);
    for (const task of level.operation.tasks) {
      if (task.mode === 'hold') {
        for (let n = 0; n < 9; n++) advanceTask(state, task.id, 0.1);
        const reloaded = makeState(unpackState(packState(state), level), level);
        assert.equal(reloaded.taskValues[task.id], state.taskValues[task.id]);
        assert.ok(reloaded.taskValues[task.id] > 0 && reloaded.taskValues[task.id] < 1);
        const forged = JSON.parse(packState(state)); forged.completed = true; forged.brewTime = level.operation.duration;
        assert.equal(unpackState(JSON.stringify(forged), level), null);
      }
      finishTask(state, task);
    }
    assert.equal(stageFor(state), 'ready'); assert.equal(beginFinale(state), true);
    for (let n = 0; n < 60; n++) advanceFinale(state, 0.1);
    assert.equal(stageFor(state), 'done'); assert.equal(makeState(unpackState(packState(state), level), level).completed, true);
  });
  test(`${level.id}: props settle, remain grabbable and fit all slots without recovery`, async () => {
    const state = makeState(null, level); state.surfaces.forEach(field => field.finish());
    const physics = await createPropsPhysics(state);
    try {
      for (const item of level.items) {
        const body = physics.bodies.get(item.id); assert.equal(physics.recoveryReason(body), null);
        assert.ok(body.translation().y > -0.02); assert.equal(canPlaceItem(state, item.id), true);
        assert.equal(physics.pick(item.id), true); physics.move({ x: item.slot[0], y: item.dragHeight, z: item.slot[2] }, item.id);
        for (let i = 0; i < 160; i++) physics.step();
        assert.equal(physics.held, item.id); assert.equal(physics.release(), item.id);
        for (let i = 0; i < 40; i++) physics.step();
        const p = body.translation(); assert.ok(Math.hypot(p.x - item.slot[0], p.y - item.slot[1], p.z - item.slot[2]) < 0.001);
      }
      assert.equal(stageFor(state), 'operate'); assert.ok(unpackState(packState(state), level));
      assert.equal(physics.events.some(event => event.type === 'recover'), false);
    } finally { physics.dispose(); }
  });
  test(`${level.id}: phone framing, scene targets, and rays can pick every loose prop`, async () => {
    const state = makeState(null, level), physics = await createPropsPhysics(state), scene = fixture(level, state);
    const { view, extra } = scene;
    try {
      assert.equal(view.items.size, level.items.length); assert.equal(view.dirtyMeshes.length, level.surfaces.length);
      for (const task of level.operation.tasks) assert.ok(view.actionTargets.has(task.id));
      const camera = mobileCamera(level);
      for (const item of level.items) {
        const group = view.items.get(item.id), body = physics.bodies.get(item.id);
        group.position.copy(body.translation()); group.quaternion.copy(body.rotation());
      }
      extra.update(0.1, 1, { before: false, stage: 'tidy' }); view.scene.updateMatrixWorld(true);
      for (const item of level.items) {
        const group = view.items.get(item.id), bounds = projectedBounds(group, camera);
        assert.ok(bounds.minX >= 8 && bounds.maxX <= 382, `${item.id} clipped at ${bounds.minX}..${bounds.maxX}`);
        const center = new THREE.Box3().setFromObject(group).getCenter(new THREE.Vector3());
        const ray = new THREE.Raycaster(camera.position, center.sub(camera.position).normalize());
        assert.ok(ray.intersectObject(group, true).length, `${item.id} cannot be grabbed through its real mesh`);
      }
      for (const item of level.items) {
        physics.snap(item.id, false); view.items.get(item.id).position.set(...item.slot); view.items.get(item.id).rotation.set(...item.slotRotation);
      }
      for (const task of level.operation.tasks) finishTask(state, task);
      extra.update(0.1, 1, { before: false, stage: 'done' }); view.scene.updateMatrixWorld(true);
      const bounds = projectedBounds(view.scene, mobileCamera(level, 'finale'));
      assert.ok(bounds.minX >= 10 && bounds.maxX <= 380, `${level.id} finished model clipped at ${bounds.minX}..${bounds.maxX}`);
      assert.ok(bounds.minY > 180 && bounds.maxY < 740, `${level.id} phone vertical frame lost: ${bounds.minY}..${bounds.maxY}`);
    } finally { physics.dispose(); scene.dispose(); }
  });
}

test('mailbox restores hinge sheen, an open mouth and the raised flag; before restores all three', () => {
  const scene = fixture(POST_BOX), { view, extra } = scene;
  try {
    extra.update(0.1, 0, { before: false });
    const lid = view.scene.getObjectByName('post-box-opening-lid'), flag = view.scene.getObjectByName('post-box-raised-flag');
    assert.equal(Math.abs(lid.rotation.x), 0); assert.equal(flag.rotation.z, -Math.PI / 2);
    for (const task of POST_BOX.operation.tasks) finishTask(view.state, task);
    view.state = makeState(unpackState(packState(view.state), POST_BOX), POST_BOX); extra.update(0.1, 1, { before: false });
    assert.equal(lid.rotation.x, -1.16); assert.equal(Math.abs(flag.rotation.z), 0);
    extra.update(0.1, 1, { before: true }); assert.equal(Math.abs(lid.rotation.x), 0); assert.equal(flag.rotation.z, -Math.PI / 2);
  } finally { scene.dispose(); }
});
test('sorter labels sit flush and its partly open drawer persists exactly after refresh', () => {
  const scene = fixture(POST_SORTER), { view, extra } = scene;
  try {
    const drawer = view.scene.getObjectByName('post-sorter-open-drawer'); extra.update(0.1, 0, { before: false });
    const closed = drawer.position.z;
    for (const task of POST_SORTER.operation.tasks.slice(0, 3)) finishTask(view.state, task);
    for (let n = 0; n < 12; n++) advanceTask(view.state, 'post-sorter-drawer', 0.1);
    extra.update(0.1, 1, { before: false }); const partial = drawer.position.z; assert.ok(partial > closed && partial < 0.14);
    view.state = makeState(unpackState(packState(view.state), POST_SORTER), POST_SORTER); extra.update(0.1, 1, { before: false });
    assert.equal(drawer.position.z, partial);
    for (const task of POST_SORTER.operation.tasks.slice(0, 3)) assert.equal(Math.abs(view.scene.getObjectByName(task.id + '-label').rotation.z), 0);
    finishTask(view.state, POST_SORTER.operation.tasks[3]); extra.update(0.1, 2, { before: false }); assert.ok(drawer.position.z > partial);
    extra.update(0.1, 2, { before: true }); assert.equal(drawer.position.z, closed);
  } finally { scene.dispose(); }
});
test('stamp calibrates, presses visibly and lifts to reveal its persistent impression', () => {
  const scene = fixture(POST_STAMP), { view, extra } = scene;
  try {
    const head = view.scene.getObjectByName('post-stamp-moving-head'), rotor = view.scene.getObjectByName('post-stamp-date-rotor'), mark = view.scene.getObjectByName('post-stamp-paper-impression');
    extra.update(0.1, 0, { before: false }); assert.equal(mark.visible, false);
    setTaskValue(view.state, 'post-stamp-align', 30);
    for (let n = 0; n < 22; n++) advanceTask(view.state, 'post-stamp-press', 0.1);
    extra.update(0.1, 1, { before: false }); const partial = head.position.y;
    assert.ok(partial < -0.1); assert.equal(rotor.rotation.z, -Math.PI / 6);
    view.state = makeState(unpackState(packState(view.state), POST_STAMP), POST_STAMP); extra.update(0.1, 1, { before: false }); assert.equal(head.position.y, partial);
    finishTask(view.state, POST_STAMP.operation.tasks[1]); extra.update(0.1, 2, { before: false });
    assert.equal(head.position.y, 0); assert.equal(mark.visible, true); assert.ok(mark.material.opacity > 0.8);
    view.state = makeState(unpackState(packState(view.state), POST_STAMP), POST_STAMP); extra.update(0.1, 2, { before: false }); assert.equal(mark.visible, true);
    view.scene.updateMatrixWorld(true);
    const camera = mobileCamera(POST_STAMP, 'finale'), markCenter = mark.getWorldPosition(new THREE.Vector3());
    const ray = new THREE.Raycaster(camera.position, markCenter.clone().sub(camera.position).normalize());
    const first = ray.intersectObjects(view.scene.children, true).find(hit => !hit.object.material.transparent || hit.object === mark);
    assert.equal(first?.object, mark, 'Lifted print head must reveal the circular postmark from the phone camera.');
    extra.update(0.1, 2, { before: true }); assert.equal(mark.visible, false); assert.equal(Math.abs(rotor.rotation.z), 0);
  } finally { scene.dispose(); }
});

for (const level of [POST_BOX, POST_SORTER, POST_STAMP]) test(`${level.id}: key cleaning patches are in front of opaque geometry`, async () => {
  const state = makeState(null, level), physics = await createPropsPhysics(state), scene = fixture(level, state);
  const { view, extra } = scene;
  try {
    for (const item of level.items) {
      const body = physics.bodies.get(item.id), model = view.items.get(item.id);
      model.position.copy(body.translation()); model.quaternion.copy(body.rotation());
    }
    extra.update(0.1, 1, { before: false, stage: 'clean' }); view.scene.updateMatrixWorld(true);
    const selected = level.id === 'post-box' ? ['post-box-lip'] : level.id === 'post-stamp' ? ['post-stamp-ink'] : level.surfaces.map(s => s.id);
    for (const id of selected) {
      const surface = view.dirtyMeshes.find(m => m.userData.field.spec.id === id), spec = surface.userData.field.spec;
      for (const mode of ['desktop', 'phone-focus']) {
        const settings = mode === 'desktop' ? level.cameras.desktop.default : spec.camera || level.cameras.mobile.default;
        const angle = spec.camera?.angle ?? 0.28;
        const from = new THREE.Vector3((settings.lookX || 0) + Math.sin(angle) * settings.distance, settings.height, (settings.lookZ || 0) + Math.cos(angle) * settings.distance);
        for (const u of [-0.4, 0, 0.4]) for (const v of [-0.4, 0, 0.4]) {
          const point = new THREE.Vector3(u * spec.width, v * spec.height, 0).applyMatrix4(surface.matrixWorld);
          const ray = new THREE.Raycaster(from, point.clone().sub(from).normalize()); ray.far = from.distanceTo(point) + 0.02;
          const hit = ray.intersectObjects(view.scene.children, true).find(h => {
            for (let object = h.object; object; object = object.parent) if (!object.visible) return false;
            return !h.object.material?.transparent;
          });
          assert.ok(hit?.object === surface, `${mode} ${id} cleaning patch ${u},${v} is obscured by ${hit?.object?.parent?.name || hit?.object?.geometry?.type}`);
        }
      }
    }
  } finally { physics.dispose(); scene.dispose(); }
});

test('restored sorter labels sit in front of the top rail and show their center text', () => {
  const scene = fixture(POST_SORTER), { view, extra } = scene;
  try {
    for (const task of POST_SORTER.operation.tasks) finishTask(view.state, task);
    extra.update(0.1, 1, { before: false, stage: 'done' }); view.scene.updateMatrixWorld(true);
    const camera = mobileCamera(POST_SORTER, 'finale');
    for (const task of POST_SORTER.operation.tasks.slice(0, 3)) {
      const card = view.scene.getObjectByName(task.id + '-label');
      const printedFace = card.children.find(object => object.geometry?.type === 'PlaneGeometry');
      const position = printedFace.getWorldPosition(new THREE.Vector3());
      const ray = new THREE.Raycaster(camera.position, position.clone().sub(camera.position).normalize());
      ray.far = camera.position.distanceTo(position) + 0.03;
      const hit = ray.intersectObjects(view.scene.children, true).find(entry => {
        for (let object = entry.object; object; object = object.parent) if (!object.visible) return false;
        return !entry.object.material?.transparent;
      });
      assert.ok(hit?.object === printedFace, `${task.id} printed label is hidden behind the wooden rail`);
    }
  } finally { scene.dispose(); }
});
