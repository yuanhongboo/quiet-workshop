import test from 'node:test';
import assert from 'node:assert/strict';
import { RecordedMusic } from '../src/recorded-music.mjs';

class Target {
  constructor() { this.listeners = new Map(); }
  addEventListener(name, callback) {
    if (!this.listeners.has(name)) this.listeners.set(name, new Set());
    this.listeners.get(name).add(callback);
  }
  removeEventListener(name, callback) { this.listeners.get(name)?.delete(callback); }
  emit(name) { for (const callback of this.listeners.get(name) || []) callback(); }
  get listenerCount() { return [...this.listeners.values()].reduce((sum, set) => sum + set.size, 0); }
}
class Param {
  constructor() { this.value = 1; this.events = []; }
  cancelScheduledValues(time) { this.events.push(['cancel', time]); }
  setValueAtTime(value, time) { this.value = value; this.events.push(['set', value, time]); }
  setTargetAtTime(value, time, constant) { this.value = value; this.events.push(['target', value, time, constant]); }
}
class Node {
  constructor() { this.gain = new Param(); this.connections = []; this.disconnected = false; }
  connect(node) { this.connections.push(node); return node; }
  disconnect() { this.disconnected = true; this.connections = []; }
}
class Context extends Target {
  constructor() { super(); this.state = 'running'; this.currentTime = 0; this.destination = new Node(); this.mediaSources = []; }
  createGain() { return new Node(); }
  createMediaElementSource(media) { const node = new Node(); node.media = media; this.mediaSources.push(node); return node; }
  changeState(state) { this.state = state; this.emit('statechange'); }
}
class Media extends Target {
  constructor() {
    super(); this.paused = true; this.currentTime = 0; this.duration = NaN; this.readyState = 0;
    this.networkState = 0; this.error = null; this.attributes = new Map(); this.requests = [];
    this.pauseCalls = 0; this.loadCalls = 0;
  }
  setAttribute(name, value) { this.attributes.set(name, value); }
  removeAttribute(name) { this.attributes.delete(name); if (name === 'src') this.src = ''; }
  play() {
    const request = {};
    this.requests.push(request);
    return new Promise((resolve, reject) => { request.resolve = resolve; request.reject = reject; });
  }
  complete(index = this.requests.length - 1) {
    this.paused = false; this.readyState = 4; this.duration = 122;
    this.emit('playing'); this.requests[index].resolve();
  }
  reject(name, index = this.requests.length - 1) {
    this.requests[index].reject(Object.assign(new Error(name), { name }));
  }
  pause() { this.pauseCalls++; this.paused = true; this.emit('pause'); }
  load() { this.loadCalls++; this.error = null; this.currentTime = 0; this.readyState = 0; this.emit('loadstart'); }
  metadata() { this.readyState = 1; this.duration = 122; this.emit('loadedmetadata'); }
  fail(code) { this.error = { code, message: `Media error ${code}` }; this.emit('error'); }
}
const setup = () => {
  const context = new Context(); const media = new Media();
  const music = new RecordedMusic(context, context.destination, {
    url: '/music/after-the-light.mp3', title: '光落在窗台', audioFactory: () => media,
  });
  return { context, media, music };
};
const settle = async () => { await Promise.resolve(); await Promise.resolve(); };
const playing = async () => {
  const result = setup(); result.music.setActive(true);
  const promise = result.music.unlock(); result.media.complete(); await promise;
  return result;
};

test('constructs one streaming media source without playback or an application audio buffer', async () => {
  const { context, media, music } = setup();
  assert.equal(media.preload, 'none');
  assert.equal(media.loop, true);
  assert.equal(context.mediaSources.length, 1);
  assert.equal(context.mediaSources[0].media, media);
  assert.equal(media.loadCalls, 0);
  music.setActive(true); music.update();
  assert.equal(media.requests.length, 0, 'active alone does not autoplay');
  music.setActive(false); await music.unlock(); music.update();
  assert.equal(media.requests.length, 0, 'a gesture alone does not play an inactive scene');
  music.setActive(true);
  assert.equal(media.requests.length, 1);
  assert.equal(music.diagnostics.playing, false, 'requesting play is not successful playback');
  media.complete(); await settle();
  assert.equal(music.diagnostics.playing, true);
  assert.equal(music.diagnostics.title, '光落在窗台');
  assert.equal(music.diagnostics.loopSeconds, 122);
  music.dispose();
});

test('unlock invokes media play synchronously while AudioContext resume is pending', async () => {
  const { context, media, music } = setup();
  context.state = 'suspended'; music.setActive(true);
  const unlocked = music.unlock();
  assert.equal(media.requests.length, 1, 'play happens in the gesture, before any await');
  assert.equal(music.output.gain.value, 0);
  context.changeState('running');
  assert.equal(media.requests.length, 1, 'resuming context does not duplicate the pending request');
  media.complete(); await unlocked;
  assert.equal(music.diagnostics.playing, true);
  music.dispose();
});

test('mute and inactive state pause the media immediately and retain musical position', async () => {
  const { media, music } = await playing();
  media.currentTime = 37.5;
  music.setEnabled(false);
  assert.equal(media.paused, true); assert.equal(music.output.gain.value, 0);
  assert.equal(music.diagnostics.position, 37.5);
  music.setActive(false); music.setEnabled(true); music.update();
  assert.equal(media.requests.length, 1);
  music.setActive(true); media.complete(); await settle();
  assert.equal(music.diagnostics.position, 37.5);
  assert.equal(music.diagnostics.playing, true);
  music.setActive(false);
  assert.equal(media.paused, true);
  music.dispose();
});

test('theme changes and ducking keep the same recording and position', async () => {
  const { context, media, music } = await playing();
  media.currentTime = 52;
  music.setDucked(true); music.setTheme('rain-garden'); music.update();
  assert.equal(music.output.gain.value, .55);
  assert.equal(music.diagnostics.theme, 'rain-garden');
  assert.equal(music.diagnostics.position, 52);
  assert.equal(media.requests.length, 1); assert.equal(context.mediaSources.length, 1);
  music.setDucked(false);
  assert.equal(music.output.gain.value, 1);
  music.dispose();
});

test('a play result arriving after pause cannot revive playback', async () => {
  const { media, music } = setup();
  music.setActive(true); const promise = music.unlock();
  music.setActive(false); media.complete(); await promise;
  assert.equal(media.paused, true);
  assert.equal(music.diagnostics.playing, false);
  assert.equal(music.output.gain.value, 0);
  music.dispose();
});

test('rapid toggle ignores obsolete rejections and leaves only the current request audible', async () => {
  const { media, context, music } = setup();
  music.setActive(true); const first = music.unlock();
  music.setEnabled(false); music.setEnabled(true);
  assert.equal(media.requests.length, 2);
  media.complete(1); await settle();
  media.reject('AbortError', 0); await first;
  assert.equal(music.diagnostics.playing, true);
  assert.equal(music.diagnostics.error, null);
  assert.equal(context.mediaSources.length, 1);
  music.dispose();
});

test('obsolete successful play cannot interrupt a newer legitimate request', async () => {
  const { media, music } = setup();
  music.setActive(true); const first = music.unlock();
  music.setActive(false); music.setActive(true);
  media.complete(1); await settle();
  const pauses = media.pauseCalls;
  media.complete(0); await first;
  assert.equal(media.pauseCalls, pauses);
  assert.equal(music.diagnostics.playing, true);
  music.dispose();
});

test('background context suspension stops the media and resumes at the same place', async () => {
  const { context, media, music } = await playing();
  media.currentTime = 19;
  context.changeState('suspended');
  assert.equal(media.paused, true); assert.equal(music.diagnostics.playing, false);
  assert.equal(music.diagnostics.position, 19);
  context.changeState('running'); media.complete(); await settle();
  assert.equal(music.diagnostics.playing, true);
  assert.equal(music.diagnostics.position, 19);
  music.dispose();
});

test('metadata and pending requests never report playing, buffering reflects media events', async () => {
  const { media, music } = setup();
  media.metadata();
  assert.equal(music.diagnostics.status, 'ready'); assert.equal(music.diagnostics.playing, false);
  music.setActive(true); const promise = music.unlock();
  assert.equal(music.diagnostics.status, 'starting'); assert.equal(music.diagnostics.playing, false);
  media.complete(); await promise;
  media.emit('waiting');
  assert.equal(music.diagnostics.status, 'buffering'); assert.equal(music.diagnostics.playing, false);
  media.emit('playing');
  assert.equal(music.diagnostics.playing, true);
  music.dispose();
});

test('autoplay rejection is diagnosed without unhandled rejection or automatic retries', async () => {
  const { media, music } = setup();
  music.setActive(true); const promise = music.unlock();
  media.reject('NotAllowedError'); assert.equal(await promise, false);
  assert.equal(music.diagnostics.status, 'blocked');
  assert.equal(music.diagnostics.error.kind, 'autoplay');
  for (let i = 0; i < 5; i++) music.update();
  assert.equal(media.requests.length, 1);
  const retry = music.unlock(); media.complete(); assert.equal(await retry, true);
  assert.equal(media.loadCalls, 0);
  assert.equal(music.diagnostics.error, null);
  music.dispose();
});

for (const [code, kind] of [[2, 'network'], [3, 'decode'], [4, 'unsupported']]) {
  test(`${kind} failure stays silent and retries only on another unlock, retaining position`, async () => {
    const { media, music } = await playing();
    media.currentTime = 44; media.fail(code);
    assert.equal(music.diagnostics.error.kind, kind);
    assert.equal(music.diagnostics.playing, false); assert.equal(media.paused, true);
    music.update(); music.setActive(false); music.setActive(true);
    assert.equal(media.requests.length, 1);
    const retry = music.unlock();
    assert.equal(media.loadCalls, 1);
    media.metadata(); assert.equal(media.currentTime, 44);
    media.complete(); assert.equal(await retry, true);
    assert.equal(music.diagnostics.error, null);
    music.dispose();
  });
}

test('dispose removes listeners and graph, releases the resource and rejects late playback', async () => {
  const { context, media, music } = setup();
  music.setActive(true); const promise = music.unlock();
  music.dispose();
  assert.equal(media.listenerCount, 0); assert.equal(context.listenerCount, 0);
  assert.equal(music.source.disconnected, true); assert.equal(music.output.disconnected, true);
  assert.equal(media.src, ''); assert.equal(media.loadCalls, 1);
  media.complete(); await promise;
  assert.equal(media.paused, true); assert.equal(music.diagnostics.playing, false);
  assert.equal(music.diagnostics.status, 'disposed');
  music.setEnabled(true); music.setActive(true); music.update(); await music.unlock();
  assert.equal(media.requests.length, 1);
  music.dispose();
});

test('a late rejected play after disposal is absorbed', async () => {
  const { media, music } = setup();
  music.setActive(true); const promise = music.unlock();
  music.dispose(); media.reject('AbortError');
  assert.equal(await promise, false);
  assert.equal(music.diagnostics.status, 'disposed');
});

test('the first gesture survives repeated syncs and media completion before context resume', async () => {
  const { context, media, music } = setup();
  context.state = 'suspended'; music.setActive(true);
  const promise = music.unlock();
  for (let i = 0; i < 5; i++) {
    music.setEnabled(true); music.setActive(true); music.update();
  }
  assert.equal(media.requests.length, 1);
  assert.equal(media.pauseCalls, 0, 'frame updates retain the gesture-bearing play request');
  media.complete(); await promise;
  music.setDucked(true);
  for (let i = 0; i < 5; i++) music.update();
  assert.equal(media.paused, false, 'the successful media gesture remains acquired');
  assert.equal(music.diagnostics.status, 'resuming');
  assert.equal(music.diagnostics.awaitingContext, true);
  assert.equal(music.diagnostics.playing, false);
  assert.equal(music.output.gain.value, 0, 'even duck changes leave the suspended bus silent');
  context.changeState('running');
  assert.equal(media.requests.length, 1, 'the original request starts the music');
  assert.equal(music.diagnostics.playing, true);
  assert.equal(music.diagnostics.awaitingContext, false);
  assert.equal(music.output.gain.value, .55);
  music.dispose();
});

for (const [name, cancel] of [
  ['inactive', ({ music }) => music.setActive(false)],
  ['disabled', ({ music }) => music.setEnabled(false)],
  ['disposed', ({ music }) => music.dispose()],
  ['suspended again', ({ context }) => context.changeState('suspended')],
]) {
  test(`${name} cancels the initial-resume exception before a late successful play`, async () => {
    const state = setup(); const { context, media, music } = state;
    context.state = 'suspended'; music.setActive(true);
    const promise = music.unlock();
    cancel(state); media.complete(); await promise;
    for (let i = 0; i < 3; i++) music.update();
    assert.equal(music.diagnostics.awaitingContext, false);
    assert.equal(media.paused, true);
    assert.equal(music.diagnostics.playing, false);
    assert.equal(music.output.gain.value, 0);
    assert.equal(media.requests.length, 1, 'no background retry recreates the exception');
    music.dispose();
  });

  test(`${name} also cancels a successful media play still waiting for context resume`, async () => {
    const state = setup(); const { context, media, music } = state;
    context.state = 'suspended'; music.setActive(true);
    const promise = music.unlock(); media.complete(); await promise;
    assert.equal(media.paused, false);
    cancel(state); music.update();
    assert.equal(music.diagnostics.awaitingContext, false);
    assert.equal(media.paused, true);
    assert.equal(music.diagnostics.playing, false);
    assert.equal(music.output.gain.value, 0);
    music.dispose();
  });
}
