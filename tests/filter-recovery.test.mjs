import test from 'node:test';
import assert from 'node:assert/strict';
import { createPropsPhysics } from '../src/physics.mjs';
import { ITEMS, makeState, packState, stageFor } from '../src/core.mjs';

function progress66() {
  const state = makeState();
  state.surfaces.forEach((surface) => surface.finish());
  state.placed.add('cup');
  state.placed.add('jar');
  return state;
}

test('holding the filter past six seconds stays finite and can still be placed', async () => {
  const state = progress66(),
    physics = await createPropsPhysics(state);
  try {
    physics.pick('filter');
    physics.move({ x: 1.4, y: 1.25, z: 0.12 });
    for (let i = 0; i < 900; i++) {
      physics.step();
      const body = physics.bodies.get('filter');
      assert.ok(
        [
          ...Object.values(body.translation()),
          ...Object.values(body.rotation()),
          ...Object.values(body.angvel()),
        ].every(Number.isFinite),
        `filter pose became invalid after ${i + 1} frames`,
      );
      assert.ok(
        Math.hypot(...Object.values(body.angvel())) < 200,
        `unstable filter rotation after ${i + 1} frames`,
      );
    }
    assert.equal(physics.held, 'filter');
    assert.equal(
      physics.events.some((e) => e.type === 'recover'),
      false,
    );
    const filter = ITEMS.find((item) => item.id === 'filter');
    physics.move({ x: filter.slot[0], y: 1.25, z: filter.slot[2] });
    assert.equal(physics.release(), 'filter');
    for (let i = 0; i < 60; i++) physics.step();
    assert.equal(stageFor(state), 'ready');
  } finally {
    physics.dispose();
  }
});

test('invalid coordinates are recovered without losing completed progress', async () => {
  const state = progress66(),
    physics = await createPropsPhysics(state),
    saved = packState(state);
  try {
    const oldBody = physics.bodies.get('filter');
    oldBody.setTranslation({ x: NaN, y: NaN, z: NaN }, true);
    physics.step();
    const recovered = physics.bodies.get('filter'),
      position = recovered.translation();
    assert.notEqual(recovered, oldBody);
    assert.ok(Object.values(position).every(Number.isFinite));
    assert.ok(Math.abs(position.x - ITEMS[1].start[0]) < 0.01);
    assert.equal(packState(state), saved);
    assert.equal(stageFor(state), 'tidy');
    assert.ok(physics.events.some((e) => e.type === 'recover' && e.id === 'filter'));
  } finally {
    physics.dispose();
  }
});

test('excessive spin and an off-table fall restore a usable upright accessory', async () => {
  const state = progress66(),
    physics = await createPropsPhysics(state);
  try {
    physics.pick('filter');
    physics.bodies.get('filter').setAngvel({ x: 1e12, y: 0, z: 0 }, true);
    physics.step();
    assert.equal(physics.held, null);
    assert.equal(physics.bodies.get('filter').gravityScale(), 1);
    physics.bodies.get('filter').setTranslation({ x: 1, y: -1, z: 0.6 }, true);
    physics.step();
    const body = physics.bodies.get('filter');
    assert.ok(Object.values(body.rotation()).every(Number.isFinite));
    assert.ok(body.translation().y > 0);
    assert.equal(state.placed.size, 2);
  } finally {
    physics.dispose();
  }
});

test('finding loose accessories leaves the cup, jar and cleaning progress intact', async () => {
  const state = progress66(),
    physics = await createPropsPhysics(state),
    saved = packState(state);
  try {
    const cup = physics.bodies.get('cup').translation(),
      jar = physics.bodies.get('jar').translation();
    physics.bodies.get('filter').setTranslation({ x: 0, y: 0.1, z: -1.2 }, true);
    assert.deepEqual(physics.recoverUnplaced(), ['filter']);
    for (let i = 0; i < 60; i++) physics.step();
    assert.deepEqual(physics.bodies.get('cup').translation(), cup);
    assert.deepEqual(physics.bodies.get('jar').translation(), jar);
    assert.equal(packState(state), saved);
    assert.ok(Math.abs(physics.bodies.get('filter').translation().x - ITEMS[1].start[0]) < 0.05);
    assert.equal(physics.recoverItem('cup'), false);
  } finally {
    physics.dispose();
  }
});
