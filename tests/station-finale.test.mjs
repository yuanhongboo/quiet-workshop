import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { STATION_FINALE_LEVELS, STATION_TRACK, STATION_TRAIN, STATION_OPENING } from '../src/station-finale-levels.mjs';
import { buildStationFinaleScene, STATION_OVERVIEW_IDS } from '../src/station-finale-scenes.mjs';
import { GrimeField, makeState, packState, unpackState, stageFor, beginFinale } from '../src/core.mjs';
import { completeTask, advanceTask, setTaskValue } from '../src/task-actions.mjs';
import { createPropsPhysics } from '../src/physics.mjs';

function organized(level) {
  const state = makeState(null, level); state.surfaces.forEach(field => field.finish());
  level.items.forEach(item => state.placed.add(item.id)); return state;
}
function finish(state, task) {
  if (task.mode === 'tap') return completeTask(state, task.id);
  if (task.mode === 'dial') return setTaskValue(state, task.id, task.target);
  for (let i = 0; i < 90; i++) advanceTask(state, task.id, 0.1);
  return state.taskValues[task.id] >= task.target;
}
for (const level of STATION_FINALE_LEVELS) {
  test(`${level.id}: ordered task chain saves midway and reaches the real finale`, () => {
    let state = organized(level);
    assert.equal(beginFinale(state), false);
    const last = level.operation.tasks.at(-1);
    assert.equal(last.mode === 'dial' ? setTaskValue(state, last.id, last.target) : completeTask(state, last.id), false);
    for (const task of level.operation.tasks) {
      if (task.mode === 'hold') {
        for (let i = 0; i < 7; i++) advanceTask(state, task.id, 0.1);
        const partial = state.taskValues[task.id]; assert.ok(partial > 0 && partial < 1);
        state = makeState(unpackState(packState(state), level), level); assert.equal(state.taskValues[task.id], partial);
      }
      assert.equal(finish(state, task), true, task.id);
    }
    assert.equal(stageFor(state), 'ready'); assert.equal(beginFinale(state), true);
  });
}
for (const level of [STATION_TRACK, STATION_TRAIN]) {
  test(`${level.id}: cleaning and Rapier placements complete and survive reload`, async () => {
    for (const spec of level.surfaces) {
      const field = new GrimeField(spec);
      for (let pass = 0; pass < 6 && !field.done; pass++) for (let v = 0; v <= 1.025; v += 0.035) for (let u = 0; u <= 1.025; u += 0.035) field.scrub(u, v, 0.18, 0.05);
      assert.equal(field.done, true, spec.id);
    }
    const state = makeState(null, level); state.surfaces.forEach(field => field.finish());
    const physics = await createPropsPhysics(state);
    try {
      for (const item of level.items) {
        assert.equal(physics.recoveryReason(physics.bodies.get(item.id)), null);
        assert.equal(physics.pick(item.id), true);
        physics.move({ x: item.slot[0], y: item.dragHeight, z: item.slot[2] }, item.id);
        for (let i = 0; i < 180; i++) physics.step();
        assert.equal(physics.release(), item.id);
        for (let i = 0; i < 60; i++) physics.step();
        assert.ok(Math.abs(physics.bodies.get(item.id).translation().y - item.slot[1]) < 0.001);
      }
      assert.equal(state.placed.size, level.items.length);
      assert.equal(physics.events.filter(event => event.type === 'recover').length, 0);
    } finally { physics.dispose(); }
    const resumedPhysics = await createPropsPhysics(makeState(unpackState(packState(state), level), level));
    try { for (const item of level.items) assert.ok(Math.abs(resumedPhysics.bodies.get(item.id).translation().x - item.slot[0]) < 0.001); }
    finally { resumedPhysics.dispose(); }
  });
  test(`${level.id}: dependent parts cannot attach early or unlock an operation`, async () => {
    const state = makeState(null, level); state.surfaces.forEach(field => field.finish());
    const physics = await createPropsPhysics(state);
    try {
      const item = level.items.find(item => item.requires?.length); physics.pick(item.id);
      physics.move({ x: item.slot[0], y: item.dragHeight, z: item.slot[2] }, item.id);
      assert.equal(physics.release(), null); assert.equal(state.placed.size, 0);
      assert.ok(physics.events.some(event => event.type === 'placement-hint'));
      assert.equal(advanceTask(state, level.operation.tasks[0].id, 0.1), false);
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
  const extra = buildStationFinaleScene(view);
  return { view, extra, restore() {
    const geometries = new Set(), materials = new Set(), textures = new Set();
    view.scene.traverse(object => { if (object.geometry) geometries.add(object.geometry); if (object.material) for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material); });
    for (const material of materials) for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
    geometries.forEach(value => value.dispose()); materials.forEach(value => value.dispose()); textures.forEach(value => value.dispose());
    globalThis.document = oldDocument;
  } };
}
for (const level of STATION_FINALE_LEVELS) {
  test(`${level.id}: all interaction meshes exist within the phone geometry budget`, () => {
    const { view, extra, restore } = fixture(level);
    try {
      assert.equal(view.items.size, level.items.length); assert.equal(view.dirtyMeshes.length, level.surfaces.length);
      level.operation.tasks.forEach(task => assert.ok(view.actionTargets.has(task.id), task.id));
      extra.update(0.016, 2, { before: false, stage: 'operate' });
      let meshes = 0, triangles = 0;
      view.scene.traverse(object => {
        if (!object.isMesh) return; meshes++;
        assert.ok([...object.geometry.attributes.position.array].every(Number.isFinite));
        triangles += (object.geometry.index?.count || object.geometry.attributes.position.count) / 3;
      });
      assert.ok(meshes > 40 && meshes < (level.stationOverview ? 350 : 150), `${meshes} meshes`);
      assert.ok(triangles < (level.stationOverview ? 210000 : 120000), `${triangles} triangles`);
    } finally { restore(); }
  });
}
test('track switch and locomotive drivetrain respond to saved progress and before comparison', () => {
  for (const level of [STATION_TRACK, STATION_TRAIN]) {
    const { view, extra, restore } = fixture(level);
    try {
      const target = view.scene.getObjectByName(level === STATION_TRACK ? 'station-track-points' : 'station-train-wheels-rod');
      const read = () => level === STATION_TRACK ? target.rotation.y : target.position.y;
      extra.update(0.1, 2, { before: true }); const initial = read();
      if (level === STATION_TRACK) { finish(view.state, level.operation.tasks[0]); finish(view.state, level.operation.tasks[1]); setTaskValue(view.state, 'track-switch', 60); }
      else { finish(view.state, level.operation.tasks[0]); view.state.taskValues['train-wheels'] = 0.47; }
      extra.update(0.1, 2, { before: false }); assert.notEqual(read(), initial);
      if (level === STATION_TRACK) assert.equal(target.userData.connected, true);
      else assert.equal(view.scene.getObjectByName('station-train-steam').visible, false);
      const current = read(), saved = makeState(unpackState(packState(view.state), level), level); view.state = saved;
      extra.update(0.1, 2, { before: false }); assert.equal(read(), current);
      if (level === STATION_TRAIN) { finish(view.state, level.operation.tasks[1]); finish(view.state, level.operation.tasks[2]); extra.update(0.1, 2, { before: false }); assert.equal(view.scene.getObjectByName('station-train-steam').visible, true); }
      extra.update(0.1, 2, { before: true }); assert.equal(read(), initial);
      if (level === STATION_TRAIN) assert.equal(view.scene.getObjectByName('station-train-steam').visible, false);
    } finally { restore(); }
  }
});
test('station overview shows exactly 0, 3, 6 and 8 restored fixtures and never changes saves', () => {
  const { view, extra, restore } = fixture(STATION_OPENING);
  try {
    for (const count of [0, 3, 6, 8]) {
      view.state.seasonRestored = new Set(STATION_OVERVIEW_IDS.slice(0, count));
      view.state.chapterHighlights = new Set(STATION_OVERVIEW_IDS.slice(Math.max(0, count - 3), count));
      const saved = JSON.stringify(packState(view.state)), ledger = [...view.state.seasonRestored], highlights = [...view.state.chapterHighlights];
      extra.update(0.1, 2, { stage: 'overview' });
      for (const [i, id] of STATION_OVERVIEW_IDS.entries()) {
        assert.equal(view.scene.getObjectByName(`restored-${id}`).visible, i < count);
        assert.equal(view.scene.getObjectByName(`placeholder-${id}`).visible, i >= count);
        assert.equal(view.scene.getObjectByName(`chapter-highlight-${id}`).visible, highlights.includes(id));
      }
      assert.equal(JSON.stringify(packState(view.state)), saved); assert.deepEqual([...view.state.seasonRestored], ledger); assert.deepEqual([...view.state.chapterHighlights], highlights);
      extra.update(0.1, 3, { stage: 'overview', before: true });
      for (const id of STATION_OVERVIEW_IDS) assert.equal(view.scene.getObjectByName(`restored-${id}`).visible, false);
    }
  } finally { restore(); }
});
test('arrival unfolds shutters, signals, a moving train and a fully stopped saved finale', () => {
  const { view, extra, restore } = fixture(STATION_OPENING);
  try {
    view.state.seasonRestored = new Set(STATION_OVERVIEW_IDS);
    const shutters = view.scene.getObjectByName('station-overview-shutters'), train = view.scene.getObjectByName('restored-station-train'), bell = view.scene.getObjectByName('station-overview-arrival-bell');
    extra.update(0.1, 1, { stage: 'operate' }); const initial = train.position.x;
    assert.equal(shutters.userData.openAmount, 0); assert.equal(bell.userData.rung, false);
    view.state.taskValues['station-open-shutters'] = 1; view.state.taskValues['station-set-signal'] = 1; view.state.taskValues['station-arrive-train'] = 0.4;
    extra.update(0.1, 2, { stage: 'operate' }); const partial = train.position.x;
    assert.equal(shutters.userData.openAmount, 1); assert.ok(partial > initial + 0.5); assert.equal(train.userData.stopped, false);
    const saved = makeState(unpackState(packState(view.state), STATION_OPENING), STATION_OPENING); saved.seasonRestored = new Set(STATION_OVERVIEW_IDS); view.state = saved;
    extra.update(0.1, 3, { stage: 'operate' }); assert.equal(train.position.x, partial);
    view.state.taskValues['station-arrive-train'] = 0.8; extra.update(0.1, 4, { stage: 'operate' }); const later = train.position.x;
    view.state.taskValues['station-arrive-train'] = 1; view.state.taskValues['station-arrival-bell'] = 1;
    extra.update(0.1, 5, { stage: 'operate' }); const end = train.position.clone();
    assert.equal(train.userData.stopped, true); assert.equal(bell.userData.rung, true);
    assert.ok(end.x - later < later - partial, 'the train must decelerate near the platform');
    extra.update(0.1, 12, { stage: 'done' }); assert.deepEqual(train.position.toArray(), end.toArray());
    extra.update(0.1, 12, { before: true, stage: 'done' }); assert.equal(train.position.x, initial); assert.equal(shutters.userData.openAmount, 0);
  } finally { restore(); }
});
function cameraFor(settings, width = 390, height = 844) {
  const camera = new THREE.PerspectiveCamera(32, width / height, 0.05, 60), angle = settings.angle ?? 0.28;
  camera.position.set(Math.sin(angle) * settings.distance + (settings.lookX || 0), settings.height, Math.cos(angle) * settings.distance + (settings.lookZ || 0));
  camera.lookAt(settings.lookX || 0, settings.lookY, settings.lookZ || 0); camera.updateMatrixWorld(true); return camera;
}
function projectedBounds(object, camera) {
  const bounds = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };
  object.traverse(child => {
    if (!child.isMesh) return;
    const vertices = child.geometry.getAttribute('position');
    for (let i = 0; i < vertices.count; i++) {
      const v = new THREE.Vector3().fromBufferAttribute(vertices, i).applyMatrix4(child.matrixWorld).project(camera), x = (v.x + 1) * 195, y = (1 - v.y) * 422;
      bounds.minX = Math.min(bounds.minX, x); bounds.maxX = Math.max(bounds.maxX, x); bounds.minY = Math.min(bounds.minY, y); bounds.maxY = Math.max(bounds.maxY, y);
    }
  }); return bounds;
}
function visible(object) {
  for (let current = object; current; current = current.parent) if (!current.visible) return false;
  return !object.material?.transparent || object.material.opacity > 0.8;
}
for (const level of [STATION_TRACK, STATION_TRAIN]) {
  test(`${level.id}: phone tidy camera contains and can directly pick each loose prop`, async () => {
    const { view, restore } = fixture(level); view.state.placed.clear();
    const physics = await createPropsPhysics(view.state);
    try {
      const camera = cameraFor(level.cameras.mobile.tidy);
      for (const phase of ['initial', 'fitted']) {
        if (phase === 'fitted') for (const item of level.items) physics.snap(item.id, false);
        for (const item of level.items) {
          const model = view.items.get(item.id), body = physics.bodies.get(item.id); model.position.copy(body.translation()); model.quaternion.copy(body.rotation());
        }
        view.scene.updateMatrixWorld(true);
        for (const item of level.items) {
          const model = view.items.get(item.id), bounds = projectedBounds(model, camera);
          assert.ok(bounds.minX >= 8 && bounds.maxX <= 382, `${phase} ${item.id} x: ${bounds.minX}..${bounds.maxX}`);
          assert.ok(bounds.minY >= 190 && bounds.maxY <= 690, `${phase} ${item.id} y: ${bounds.minY}..${bounds.maxY}`);
          if (phase === 'initial') {
            let pickable = false;
            model.traverse(child => {
              if (!child.isMesh) return;
              const target = child.getWorldPosition(new THREE.Vector3()), ray = new THREE.Raycaster(camera.position, target.clone().sub(camera.position).normalize()); ray.far = camera.position.distanceTo(target) + 0.04;
              const hit = ray.intersectObjects(view.scene.children, true).find(entry => visible(entry.object));
              if (hit?.object.userData.itemId === item.id) pickable = true;
            });
            assert.ok(pickable, `${item.id} is behind opaque geometry`);
          }
        }
      }
    } finally { physics.dispose(); restore(); }
  });
  test(`${level.id}: cleaning patches sit in front of their opaque modeled faces`, () => {
    const { view, restore } = fixture(level);
    try {
      view.items.forEach(item => { item.visible = false; }); view.scene.updateMatrixWorld(true);
      for (const spec of level.surfaces) {
        const patch = view.scene.getObjectByName(spec.id), camera = cameraFor(spec.camera);
        let open = 0;
        for (const [u, v] of [[0, 0], [-0.28, 0], [0.28, 0], [0, -0.25], [0, 0.25]]) {
          const target = new THREE.Vector3(u * spec.width, v * spec.height, 0).applyMatrix4(patch.matrixWorld);
          const ray = new THREE.Raycaster(camera.position, target.clone().sub(camera.position).normalize()); ray.far = camera.position.distanceTo(target) + 0.025;
          const hit = ray.intersectObjects(view.scene.children, true).find(entry => visible(entry.object));
          if (hit?.object === patch) open++;
        }
        assert.ok(open >= 4, `${spec.id}: ${open}/5 clear samples`);
      }
    } finally { restore(); }
  });
}
test('phone overview contains all eight accomplishments throughout the train arrival', () => {
  const { view, extra, restore } = fixture(STATION_OPENING);
  try {
    view.state.seasonRestored = new Set(STATION_OVERVIEW_IDS); const camera = cameraFor(STATION_OPENING.cameras.mobile.overview);
    for (const arrival of [0, 0.5, 1]) {
      view.state.taskValues['station-arrive-train'] = arrival; extra.update(0.1, 3, { stage: 'operate' }); view.scene.updateMatrixWorld(true);
      for (const id of STATION_OVERVIEW_IDS) {
        const bounds = projectedBounds(view.scene.getObjectByName(`restored-${id}`), camera);
        assert.ok(bounds.minX >= 6 && bounds.maxX <= 384, `${arrival} ${id} x: ${bounds.minX}..${bounds.maxX}`);
        assert.ok(bounds.minY >= 185 && bounds.maxY <= 680, `${arrival} ${id} y: ${bounds.minY}..${bounds.maxY}`);
      }
    }
  } finally { restore(); }
});

test('all four final station controls can be reached through their visible meshes', () => {
  const { view, extra, restore } = fixture(STATION_OPENING);
  try {
    view.state.seasonRestored = new Set(STATION_OVERVIEW_IDS);
    extra.update(0.1, 1, { stage: 'operate' }); view.scene.updateMatrixWorld(true);
    for (const screen of ['desktop', 'mobile']) {
      const camera = cameraFor(STATION_OPENING.cameras[screen].default, screen === 'mobile' ? 390 : 1280, screen === 'mobile' ? 844 : 720);
      for (const [id, { object }] of view.actionTargets) {
        let reached = false;
        object.traverse(child => {
          if (!child.isMesh) return;
          const vertices = child.geometry.getAttribute('position');
          for (let i = 0; i < vertices.count && !reached; i += Math.max(1, Math.floor(vertices.count / 40))) {
            const target = new THREE.Vector3().fromBufferAttribute(vertices, i).applyMatrix4(child.matrixWorld);
            const ray = new THREE.Raycaster(camera.position, target.clone().sub(camera.position).normalize()); ray.far = camera.position.distanceTo(target) + 0.02;
            const hit = ray.intersectObjects(view.scene.children, true).find(entry => visible(entry.object));
            if (hit?.object.userData.actionId === id) reached = true;
          }
        });
        assert.ok(reached, `${screen} ${id} must be visible in front of the station furniture`);
      }
    }
  } finally { restore(); }
});
