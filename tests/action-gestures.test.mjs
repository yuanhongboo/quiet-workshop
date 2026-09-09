import test from 'node:test';
import assert from 'node:assert/strict';
import { ActionController } from '../src/action-controller.mjs';
import { makeState } from '../src/core.mjs';

class Control extends EventTarget {
  captures = new Set();
  children = [];
  dataset = {};
  setPointerCapture(id) { this.captures.add(id); }
  releasePointerCapture(id) {
    if (this.captures.delete(id)) this.send('lostpointercapture', { pointerId: id });
  }
  send(type, fields = {}) {
    const event = new Event(type, { cancelable: true });
    for (const [key, value] of Object.entries(fields)) Object.defineProperty(event, key, { value });
    this.dispatchEvent(event); return event;
  }
  replaceChildren() { this.children = []; }
  append(child) { this.children.push(child); }
  setAttribute() {}
}
function fixture() {
  const level = { id: 'gesture-fixture', surfaces: [], items: [], operation: { kind: 'tasks', tasks: [
    { id: 'hold', name: 'Hold', mode: 'hold', initial: 0, target: 1, rate: 10, sound: 'polish' },
    { id: 'tap', name: 'Tap', mode: 'tap', initial: 0, target: 1, requires: ['hold'], sound: 'bell' },
    { id: 'last', name: 'Last tap', mode: 'tap', initial: 0, target: 1, requires: ['tap'] },
  ] } };
  const controls = new Map(), previousDocument = globalThis.document, audio = [];
  globalThis.document = {
    getElementById(id) { if (!controls.has(id)) controls.set(id, new Control()); return controls.get(id); },
    createElement() { return new Control(); },
  };
  const context = { state: makeState(null, level), stage: 'operate', started: true, paused: false, loading: false, view: { positionTool() {} } };
  const controller = new ActionController(() => context, () => {}, { play(...args) { audio.push(args); } });
  const button = controls.get('action-button');
  const pointer = (type, id = 1) => button.send(type, { pointerId: id, button: 0, detail: type === 'click' ? 1 : 0 });
  const key = (type, code, repeat = false) => {
    const event = button.send(type, { code, repeat });
    // Native buttons activate on Enter keydown and Space keyup, unless canceled.
    if (!event.defaultPrevented && ((type === 'keydown' && code === 'Enter') || (type === 'keyup' && code === 'Space')))
      button.send('click', { detail: 0 });
    return event;
  };
  return { controller, context, button, pointer, key, audio, level, dispose() { controller.stop(); globalThis.document = previousDocument; } };
}

test('the pointer gesture that finishes a hold cannot click the following tap', () => {
  const f = fixture();
  try {
    f.pointer('pointerdown'); f.controller.tick(0.1);
    assert.equal(f.context.state.taskValues.hold, 1); assert.equal(f.controller.controlPointer, null);
    assert.equal(f.controller.current().id, 'tap');
    f.pointer('pointerup'); f.pointer('click');
    assert.equal(f.context.state.taskValues.tap, 0, 'Releasing the old hold must not activate the newly selected tap.');
    f.pointer('pointerdown', 2); f.pointer('pointerup', 2); f.pointer('click', 2);
    assert.equal(f.context.state.taskValues.tap, 1); assert.equal(f.context.state.taskValues.last, 0);
    assert.deepEqual(f.audio.map(event => event[3]), ['polish', 'bell'], 'The existing task sound forwarding remains intact.');
  } finally { f.dispose(); }
});

for (const code of ['Enter', 'Space']) test(`${code}: finishing a hold owns repeats and release; the next fresh key still activates`, () => {
  const f = fixture();
  try {
    assert.equal(f.key('keydown', code).defaultPrevented, true); f.controller.tick(0.1);
    assert.equal(f.context.state.taskValues.hold, 1);
    assert.equal(f.key('keydown', code, true).defaultPrevented, true);
    assert.equal(f.context.state.taskValues.tap, 0, 'Key repeat after hold completion must not enter the next action.');
    assert.equal(f.key('keyup', code).defaultPrevented, true);
    assert.equal(f.context.state.taskValues.tap, 0, 'The old key release must not activate the next action.');
    f.key('keydown', code);
    assert.equal(f.context.state.taskValues.tap, code === 'Enter' ? 1 : 0);
    f.key('keydown', code, true); f.key('keyup', code);
    assert.equal(f.context.state.taskValues.tap, 1); assert.equal(f.context.state.taskValues.last, 0);
    f.button.send('click', { detail: 0 }); assert.equal(f.context.state.taskValues.last, 1, 'Assistive activation after key release must remain available.');
  } finally { f.dispose(); }
});

test('a tap pointer owns its original action if another input changes the selected task before click', () => {
  const f = fixture();
  try {
    f.context.state.taskValues.hold = 1; f.pointer('pointerdown');
    f.controller.tap('tap'); f.pointer('pointerup'); f.pointer('click');
    assert.equal(f.context.state.taskValues.last, 0);
    f.button.send('click', { detail: 0 }); assert.equal(f.context.state.taskValues.last, 1);
  } finally { f.dispose(); }
});

test('pointer cancellation and blur stop holding without blocking fresh input or accessibility clicks', () => {
  const f = fixture();
  try {
    f.pointer('pointerdown'); f.controller.tick(0.02); f.pointer('pointercancel');
    const stopped = f.context.state.taskValues.hold; f.controller.tick(0.1); assert.equal(f.context.state.taskValues.hold, stopped);
    f.pointer('pointerdown', 2); f.button.send('blur'); assert.equal(f.controller.holding, null);
    f.pointer('pointerdown', 3); f.controller.tick(0.1); f.pointer('pointerup', 3); f.pointer('click', 3);
    assert.equal(f.context.state.taskValues.tap, 0);
    f.button.send('click', { detail: 0 }); assert.equal(f.context.state.taskValues.tap, 1);
    f.pointer('pointerdown', 4); f.pointer('pointerup', 4); f.pointer('click', 4); assert.equal(f.context.state.taskValues.last, 1);
  } finally { f.dispose(); }
});

test('level rebind rejects the old release and permits a new pointer or keyboard gesture', () => {
  const f = fixture();
  try {
    f.pointer('pointerdown'); f.controller.tick(0.02);
    f.context.state = makeState(null, f.level); f.context.state.taskValues.hold = 1; f.controller.mount();
    f.pointer('pointerup'); f.pointer('click'); assert.equal(f.context.state.taskValues.tap, 0);
    f.pointer('pointerdown', 2); f.pointer('pointerup', 2); f.pointer('click', 2); assert.equal(f.context.state.taskValues.tap, 1);
    f.key('keydown', 'Space'); f.button.send('blur'); f.key('keyup', 'Space');
    assert.equal(f.context.state.taskValues.last, 0, 'A canceled Space release must not activate after focus loss.');
    f.key('keydown', 'Space'); f.key('keyup', 'Space'); assert.equal(f.context.state.taskValues.last, 1);
  } finally { f.dispose(); }
});

test('right-button input never starts a hold', () => {
  const f = fixture();
  try {
    f.button.send('pointerdown', { pointerId: 7, button: 2 }); f.controller.tick(0.1);
    assert.equal(f.context.state.taskValues.hold, 0); assert.equal(f.controller.holding, null);
  } finally { f.dispose(); }
});


test('a legacy mouse click still belongs to the pointer hold, and a paused press cannot activate on resume', () => {
  const f = fixture();
  try {
    f.pointer('pointerdown'); f.controller.tick(0.1); f.pointer('pointerup');
    f.button.send('click', { detail: 1 }); assert.equal(f.context.state.taskValues.tap, 0);
    f.context.paused = true; f.pointer('pointerdown', 2); f.context.paused = false;
    f.pointer('pointerup', 2); f.pointer('click', 2); assert.equal(f.context.state.taskValues.tap, 0);
    f.pointer('pointerdown', 3); f.pointer('pointerup', 3); f.pointer('click', 3); assert.equal(f.context.state.taskValues.tap, 1);
  } finally { f.dispose(); }
});
