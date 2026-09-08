import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { makeState } from '../src/core.mjs';
import { SIGN } from '../src/finishing-levels.mjs';
import { buildFinishingScene } from '../src/finishing-scenes.mjs';
import { WorkshopView } from '../src/scene.mjs';

test('mobile frame polishing accepts a near-edge touch and does not assist at the group origin', () => {
  const original = {
    document: globalThis.document,
    width: globalThis.innerWidth,
    height: globalThis.innerHeight,
  };
  const gradient = { addColorStop() {} };
  const context = new Proxy(
    {},
    {
      get: (_, key) =>
        key === 'createLinearGradient' || key === 'createRadialGradient'
          ? () => gradient
          : () => {},
      set: () => true,
    },
  );
  globalThis.document = {
    createElement: () => ({ width: 0, height: 0, getContext: () => context }),
  };
  globalThis.innerWidth = 390;
  globalThis.innerHeight = 844;
  const state = makeState(null, SIGN);
  state.surfaces.forEach((field) => field.finish());
  SIGN.items.forEach((item) => state.placed.add(item.id));
  const view = Object.assign(Object.create(WorkshopView.prototype), {
    level: SIGN,
    state,
    scene: new THREE.Scene(),
    items: new Map(),
    slots: new Map(),
    actionTargets: new Map(),
    actionSurfaces: [],
    wood: new THREE.Texture(),
    pointer: new THREE.Vector2(),
    raycaster: new THREE.Raycaster(),
    camera: new THREE.PerspectiveCamera(32, 390 / 844, 0.05, 60),
    surface(id, geometry, settings, position, rotation) {
      const object = new THREE.Mesh(geometry, new THREE.MeshPhysicalMaterial(settings));
      object.position.set(...position);
      object.rotation.set(...rotation);
      this.scene.add(object);
      return object;
    },
    taskSurface(...args) {
      return this.surface(...args);
    },
  });
  try {
    buildFinishingScene(view);
    view.scene.updateMatrixWorld(true);
    const group = view.actionTargets.get('polish-frame').object;
    const edge = group.children.find(
      (object) => object.position.x === 1.315 && object.position.y === 1.23,
    );
    assert.ok(edge, 'the target must correspond to the actual right brass edge');
    assert.deepEqual(
      view.actionPosition('polish-frame').toArray(),
      edge.getWorldPosition(new THREE.Vector3()).toArray(),
    );
    assert.deepEqual(group.getWorldPosition(new THREE.Vector3()).toArray(), [0, 0, 0]);
    const settings = SIGN.cameras.mobile.finale;
    const screen = (point) => {
      const p = point.clone().project(view.camera);
      return [(p.x + 1) * 195, (1 - p.y) * 422];
    };
    for (const angle of [0.28, -0.16, 0.04]) {
      view.camera.position.set(
        Math.sin(angle) * settings.distance + settings.lookX,
        settings.height,
        Math.cos(angle) * settings.distance,
      );
      view.camera.lookAt(settings.lookX, settings.lookY, settings.lookZ);
      view.camera.updateMatrixWorld(true);
      const point = screen(edge.getWorldPosition(new THREE.Vector3()));
      // Touch 25 px inside the sign, missing the narrow physical frame itself.
      const nearEdge = [point[0] - 25, point[1]];
      view.pointer.set((nearEdge[0] / 390) * 2 - 1, 1 - (nearEdge[1] / 844) * 2);
      view.raycaster.setFromCamera(view.pointer, view.camera);
      assert.equal(
        view.raycaster.intersectObjects([group], true).length,
        0,
        'this touch must exercise assistance, not a direct mesh hit',
      );
      assert.equal(
        view.hitAction(...nearEdge),
        null,
        'unfinished paint must still block polishing',
      );
      state.taskFields[0].finish();
      state.taskValues['paint-sign'] = 1;
      assert.equal(view.hitAction(...nearEdge), 'polish-frame');
      const origin = screen(group.getWorldPosition(new THREE.Vector3()));
      assert.equal(
        view.hitAction(...origin),
        null,
        'the old table-origin assistance must be removed',
      );
      state.taskValues['polish-frame'] = 1;
      assert.equal(
        view.hitAction(...nearEdge),
        null,
        'completed polish must not remain interactive',
      );
      state.taskValues['polish-frame'] = 0;
      state.taskFields[0] = makeState(null, SIGN).taskFields[0];
      state.taskValues['paint-sign'] = 0;
    }
    // Other targets retain the existing object-position path.
    const other = new THREE.Group();
    other.position.set(0.4, 0.7, 0.2);
    view.scene.add(other);
    view.actionTargets.set('unconfigured-target', { object: other });
    assert.deepEqual(view.actionPosition('unconfigured-target').toArray(), [0.4, 0.7, 0.2]);
    assert.equal(view.actionPosition('missing'), null);
  } finally {
    globalThis.document = original.document;
    globalThis.innerWidth = original.width;
    globalThis.innerHeight = original.height;
  }
});
