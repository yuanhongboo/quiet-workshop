import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { GrimeField, makeState } from '../src/core.mjs';
import { createPropsPhysics } from '../src/physics.mjs';
import { WINDOW, SIGN } from '../src/finishing-levels.mjs';
import { buildFinishingScene } from '../src/finishing-scenes.mjs';

for (const level of [WINDOW, SIGN]) {
  test(`${level.id}: a full brush sweep can finish every cleaning and painting surface`, () => {
    const specs = [
      ...level.surfaces,
      ...level.operation.tasks.flatMap((task) =>
        task.field ? [{ ...task.field, kind: 'paint' }] : [],
      ),
    ];
    for (const spec of specs) {
      const field = new GrimeField(spec);
      assert.ok(field.initialAmount > 0, `${spec.id} needs a usable surface`);
      for (let pass = 0; pass < 6 && !field.done; pass++) {
        for (let v = 0; v <= 1.025; v += 0.035) {
          for (let u = 0; u <= 1.025; u += 0.035) field.scrub(u, v, 0.18, 0.05);
        }
      }
      assert.equal(field.done, true, `${spec.id} remained incomplete after coverage`);
    }
  });

  test(`${level.id}: accessories remain stable and can be placed in dependency order`, async () => {
    const state = makeState(undefined, level);
    state.surfaces.forEach((field) => field.finish());
    const physics = await createPropsPhysics(state);
    try {
      for (const item of level.items) {
        const start = physics.bodies.get(item.id).translation();
        assert.ok(Object.values(start).every(Number.isFinite));
        assert.ok(start.y > -0.1, `${item.id} fell beneath the table`);
        physics.pick(item.id);
        physics.move({ x: item.start[0], y: item.dragHeight, z: 0.95 }, null);
        for (let i = 0; i < 420; i++) physics.step();
        assert.equal(physics.held, item.id, `${item.id} became unstable while held`);
        physics.move({ x: item.slot[0], y: item.dragHeight, z: item.slot[2] }, item.id);
        assert.equal(physics.release(), item.id);
        for (let i = 0; i < 60; i++) physics.step();
        assert.ok(state.placed.has(item.id));
        const actual = physics.bodies.get(item.id).translation();
        assert.ok(
          Math.hypot(actual.x - item.slot[0], actual.y - item.slot[1], actual.z - item.slot[2]) <
            0.02,
        );
      }
    } finally {
      physics.dispose();
    }
  });
}

test('paint excludes the surfaces hidden by the three installed letter modules', () => {
  const task = SIGN.operation.tasks.find((task) => task.id === 'paint-sign');
  const field = new GrimeField({ ...task.field, kind: 'paint' });
  for (const item of SIGN.items) {
    const u = (item.slot[0] - task.field.position[0]) / task.field.width + 0.5;
    const v = (item.slot[1] - task.field.position[1]) / task.field.height + 0.5;
    assert.equal(field.mask[Math.round(v * 127) * 128 + Math.round(u * 127)], 0);
  }
  assert.ok(
    field.initialAmount < field.size ** 2 * 255 * 0.75,
    'hidden paint area should not count toward completion',
  );
});

test('finishing scenes build finite geometry, register real targets, and restore the before state', () => {
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
  const oldDocument = globalThis.document;
  globalThis.document = {
    createElement: () => ({ width: 0, height: 0, getContext: () => context }),
  };
  try {
    for (const level of [WINDOW, SIGN]) {
      const view = {
        scene: new THREE.Scene(),
        level,
        state: {
          taskValues: Object.fromEntries(level.operation.tasks.map((task) => [task.id, 1])),
          brewTime: level.operation.duration,
        },
        items: new Map(),
        slots: new Map(),
        actionTargets: new Map(),
        wood: new THREE.Texture(),
        surfaces: new Set(),
        taskSurfaces: new Set(),
        surface(id, geometry, settings, position, rotation) {
          this.surfaces.add(id);
          const m = new THREE.Mesh(geometry, new THREE.MeshPhysicalMaterial(settings));
          m.position.set(...position);
          m.rotation.set(...rotation);
          this.scene.add(m);
        },
        taskSurface(id, geometry, settings, position, rotation) {
          this.taskSurfaces.add(id);
          this.surface(id, geometry, settings, position, rotation);
        },
      };
      const scene = buildFinishingScene(view);
      assert.equal(view.items.size, level.items.length);
      for (const spec of level.surfaces) assert.ok(view.surfaces.has(spec.id));
      for (const task of level.operation.tasks)
        assert.ok(
          task.mode === 'brush' ? view.taskSurfaces.has(task.id) : view.actionTargets.has(task.id),
        );
      scene.update(1 / 60, 12, { stage: 'done', before: false });
      let lit = 0,
        count = 0;
      view.scene.traverse((object) => {
        if (object.isLight) lit += object.intensity;
        if (!object.isMesh) return;
        count++;
        assert.ok([...object.geometry.attributes.position.array].every(Number.isFinite));
      });
      assert.ok(count < 160, `${level.id} has an unnecessarily dense scene: ${count} meshes`);
      assert.ok(lit > 0, `${level.id} finale needs a lighting change`);
      scene.update(1 / 60, 12, { stage: 'done', before: true });
      view.scene.traverse((object) => {
        if (object.isLight) assert.equal(object.intensity, 0);
      });
    }
  } finally {
    globalThis.document = oldDocument;
  }
});
