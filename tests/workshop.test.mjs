import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CONFIG,
  SURFACES,
  ITEMS,
  GrimeField,
  makeState,
  cleanProgress,
  packState,
  unpackState,
  stageFor,
} from '../src/core.mjs';
import { createPropsPhysics } from '../src/physics.mjs';

function clean(field) {
  for (let y = 0; y <= 1.01; y += 0.075)
    for (let x = 0; x <= 1.01; x += 0.075) field.scrub(x, y, 0.34, 0.05);
}
test('a local wipe exposes the touched patch while leaving remote dirt intact', () => {
  const field = new GrimeField(SURFACES[0]),
    corner = field.mask[0];
  for (let i = 0; i < 12; i++) field.scrub(0.5, 0.5, 0.23, 1 / 60);
  assert.equal(field.mask[64 * 128 + 64], 0);
  assert.equal(field.mask[0], corner);
  assert.ok(field.progress > 0.01 && field.progress < 0.2);
});
test('invalid and off-surface strokes cannot produce progress', () => {
  const field = new GrimeField(SURFACES[0]);
  for (const args of [
    [NaN, 0.5, 0.2, 0.1],
    [0.5, 0.5, 0, 0.1],
    [0.5, 0.5, 0.2, 0],
    [5, 5, 0.2, 0.1],
  ])
    assert.equal(field.scrub(...args), 0);
  assert.equal(field.progress, 0);
});
test('all counted dirt is reachable with a normal sweep and the last residue resolves cleanly', () => {
  const state = makeState();
  for (const field of state.surfaces) {
    clean(field);
    assert.equal(field.done, true, field.spec.id);
    assert.equal(field.remaining, 0);
    assert.equal(field.progress, 1);
  }
  assert.equal(cleanProgress(state), 1);
  assert.equal(stageFor(state), 'tidy');
});
test('a partly cleaned workbench survives a save and load without changing progress', () => {
  const a = makeState();
  for (let i = 0; i < 14; i++) a.surfaces[0].scrub(0.3, 0.5, 0.3, 0.04);
  const raw = packState(a),
    decoded = unpackState(raw);
  assert.ok(decoded);
  const b = makeState(decoded);
  assert.equal(cleanProgress(a), cleanProgress(b));
  assert.deepEqual(a.surfaces[0].mask, b.surfaces[0].mask);
  assert.ok(raw.length < 240000);
});
test('corrupt, oversized and impossible completed saves are rejected', () => {
  assert.equal(unpackState('oops'), null);
  assert.equal(unpackState(' '.repeat(240001)), null);
  const raw = JSON.parse(packState(makeState()));
  raw.completed = true;
  assert.equal(unpackState(JSON.stringify(raw)), null);
  raw.completed = false;
  raw.placed = ['cup', 'cup'];
  assert.equal(unpackState(JSON.stringify(raw)), null);
  raw.placed = [];
  raw.surfaces.enamel[1] = Infinity;
  assert.equal(unpackState(JSON.stringify(raw)), null);
});
test('the full clean, organize, brew and reload sequence retains the finished cup of coffee', () => {
  const state = makeState();
  state.surfaces.forEach(clean);
  ITEMS.forEach((i) => state.placed.add(i.id));
  assert.equal(stageFor(state), 'ready');
  state.brewTime = 0.1;
  assert.equal(stageFor(state), 'brew');
  state.brewTime = 4;
  state.completed = true;
  assert.equal(stageFor(state), 'done');
  const restored = makeState(unpackState(packState(state)));
  assert.equal(stageFor(restored), 'done');
  assert.equal(restored.brewTime, 4);
});
test('loose accessories settle onto the physical tabletop and remain finite', async () => {
  const state = makeState(),
    physics = await createPropsPhysics(state);
  try {
    for (let i = 0; i < 300; i++) physics.step();
    for (const item of ITEMS) {
      const body = physics.bodies.get(item.id),
        p = body.translation();
      assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z));
      assert.ok(p.y > 0 && p.y < 0.45, `${item.id}: ${p.y}`);
    }
  } finally {
    physics.dispose();
  }
});
test('a misplaced item falls back naturally; a valid drop smoothly snaps once and survives reload', async () => {
  const state = makeState();
  state.surfaces.forEach(clean);
  const physics = await createPropsPhysics(state);
  try {
    assert.equal(physics.pick('cup'), true);
    physics.move({ x: -2, y: 0.65, z: 1.2 });
    assert.equal(physics.release(), null);
    assert.equal(state.placed.size, 0);
    assert.equal(physics.bodies.get('cup').gravityScale(), 1);
    physics.pick('cup');
    const cup = ITEMS[0];
    physics.move({ x: cup.slot[0], y: 0.65, z: cup.slot[2] });
    assert.equal(physics.release(), 'cup');
    assert.equal(state.placed.size, 1);
    for (let i = 0; i < 25; i++) physics.step();
    const p = physics.bodies.get('cup').translation();
    assert.ok(Math.abs(p.x - cup.slot[0]) < 0.001 && Math.abs(p.y - cup.slot[1]) < 0.001);
    assert.equal(physics.pick('cup'), false);
    assert.equal(physics.events.filter((e) => e.type === 'place').length, 1);
    assert.ok(unpackState(packState(state)));
  } finally {
    physics.dispose();
  }
});
test('canceling a drag always restores gravity and clears the held item', async () => {
  const physics = await createPropsPhysics(makeState());
  try {
    physics.pick('filter');
    physics.move({ x: 1, y: 1, z: 0.8 });
    physics.cancel();
    assert.equal(physics.held, null);
    assert.equal(physics.bodies.get('filter').gravityScale(), 1);
  } finally {
    physics.dispose();
  }
});

test('a restored finished scene retains distinct settled original poses for the before comparison', async () => {
  const state = makeState();
  state.surfaces.forEach(clean);
  ITEMS.forEach((item) => state.placed.add(item.id));
  state.completed = true;
  const physics = await createPropsPhysics(state);
  try {
    for (const item of ITEMS) {
      const current = physics.bodies.get(item.id).translation(),
        original = physics.initialPoses.get(item.id).position;
      assert.ok(Math.abs(current.x - item.slot[0]) < 0.001);
      assert.ok(Math.abs(original.x - item.start[0]) < 0.01);
      assert.ok(original.y > 0 && original.y < item.start[1]);
    }
  } finally {
    physics.dispose();
  }
});

test('assisted placement carries the jar around the machine instead of through its housing', async () => {
  const state = makeState();
  state.surfaces.forEach(clean);
  const physics = await createPropsPhysics(state);
  try {
    const jar = ITEMS.find((i) => i.id === 'jar');
    physics.pick('jar');
    physics.move({ x: jar.slot[0], y: 0.65, z: jar.slot[2] });
    physics.release();
    for (let i = 0; i < 60; i++) {
      physics.step();
      const p = physics.bodies.get('jar').translation();
      if (Math.abs(p.x) < 1.3)
        assert.ok(p.z >= 1.33, `jar intersects housing: ${JSON.stringify(p)}`);
    }
    assert.ok(Math.abs(physics.bodies.get('jar').translation().z - jar.slot[2]) < 0.001);
  } finally {
    physics.dispose();
  }
});
