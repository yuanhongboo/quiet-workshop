import test from 'node:test';
import assert from 'node:assert/strict';
import { GrimeField, makeState, packState } from '../src/core.mjs';
import { findCleaningHint } from '../src/cleaning-hints.mjs';

function emptyField(settings = {}) {
  const field = new GrimeField({ id: 'hint-test', width: 2, height: 1, seed: 19, ...settings });
  field.mask.fill(0);
  return field;
}

function patch(field, x, y, width = 6, height = 6, amount = 120) {
  for (let dy = 0; dy < height; dy++)
    for (let dx = 0; dx < width; dx++) field.mask[(y + dy) * field.size + x + dx] = amount;
}

function grimeAt(field, hint) {
  return field.mask[
    Math.round(hint.v * (field.size - 1)) * field.size + Math.round(hint.u * (field.size - 1))
  ];
}

test('clean and completed surfaces need no cleaning hint', () => {
  const field = emptyField();
  assert.equal(findCleaningHint(field), null);
  patch(field, 10, 10);
  field.done = true;
  assert.equal(findCleaningHint(field), null);
});

test('a corner residue is still locatable without changing cleaning progress or a save', () => {
  const state = makeState();
  const field = state.surfaces[0];
  field.mask.fill(0);
  patch(field, 0, 0, 4, 4);
  const before = packState(state);
  const hint = findCleaningHint(field);
  assert.ok(hint.u < 0.04 && hint.v < 0.04);
  assert.ok(grimeAt(field, hint) > 0);
  assert.equal(packState(state), before);
  assert.deepEqual(findCleaningHint(field), hint, 'repeat clicks have a stable target');
});

test('two distant residues never produce a hint in the empty space between them', () => {
  const field = emptyField();
  patch(field, 10, 55);
  patch(field, 110, 55);
  const hint = findCleaningHint(field);
  assert.ok(hint.u < 0.2 || hint.u > 0.8);
  assert.ok(grimeAt(field, hint) > 0);
});

test('a dense remaining patch is preferred to one isolated darker pixel', () => {
  const field = emptyField();
  patch(field, 20, 20, 8, 8, 100);
  patch(field, 100, 100, 1, 1, 255);
  const hint = findCleaningHint(field);
  assert.ok(hint.u < 0.3 && hint.v < 0.3);
});

test('disc holes and rectangular exclusions never become cleaning targets', () => {
  for (const mask of [{ kind: 'disc', hole: 0.25 }, { rects: [[0.25, 0.25, 0.75, 0.75]] }]) {
    const field = new GrimeField({ id: 'masked', width: 1, height: 1, seed: 14, mask });
    const hint = findCleaningHint(field);
    assert.ok(grimeAt(field, hint) > 0);
    if (mask.kind === 'disc') {
      const distance = Math.hypot(hint.u - 0.5, hint.v - 0.5);
      assert.ok(distance >= mask.hole && distance <= 0.5);
    } else {
      assert.ok(hint.u <= 0.25 || hint.u >= 0.75 || hint.v <= 0.25 || hint.v >= 0.75);
    }
  }
});

test('the hint radius uses surface world units and fits small surfaces', () => {
  const regular = emptyField();
  const tiny = emptyField({ width: 0.1, height: 0.2 });
  patch(regular, 60, 60);
  patch(tiny, 60, 60);
  assert.ok(findCleaningHint(regular).radius >= 0.12 && findCleaningHint(regular).radius <= 0.25);
  assert.ok(findCleaningHint(tiny).radius <= 0.05);
});

test('invalid surface geometry cannot create non-finite scene coordinates', () => {
  for (const width of [0, -1, NaN, Infinity]) {
    const field = emptyField();
    patch(field, 60, 60);
    field.spec.width = width;
    assert.equal(findCleaningHint(field), null);
  }
});
