import test from 'node:test';
import assert from 'node:assert/strict';
import { WorkshopAudio } from '../src/audio.mjs';

class AudioParamStub {
  value = 0;
  setTargetAtTime(value) {
    this.value = value;
  }
  setValueAtTime(value) {
    this.value = value;
  }
  exponentialRampToValueAtTime(value) {
    this.value = value;
  }
  cancelScheduledValues() {}
}
class AudioNodeStub {
  gain = new AudioParamStub();
  frequency = new AudioParamStub();
  Q = new AudioParamStub();
  threshold = new AudioParamStub();
  ratio = new AudioParamStub();
  stops = [];
  connect(node) {
    return node;
  }
  disconnect() {}
  start() {}
  stop(time) {
    this.stops.push(time);
  }
  getFloatTimeDomainData(values) {
    values.fill(0);
  }
}
class AudioContextStub {
  state = 'running';
  currentTime = 0;
  sampleRate = 8000;
  destination = new AudioNodeStub();
  createGain() {
    return new AudioNodeStub();
  }
  createDynamicsCompressor() {
    return new AudioNodeStub();
  }
  createAnalyser() {
    return new AudioNodeStub();
  }
  createBufferSource() {
    return new AudioNodeStub();
  }
  createBiquadFilter() {
    return new AudioNodeStub();
  }
  createOscillator() {
    return new AudioNodeStub();
  }
  createBuffer(channels, length) {
    return { getChannelData: () => new Float32Array(length) };
  }
  async suspend() {
    this.state = 'suspended';
  }
  async resume() {
    this.state = 'running';
  }
}
function audioFixture() {
  const old = globalThis.AudioContext;
  globalThis.AudioContext = AudioContextStub;
  const audio = new WorkshopAudio();
  audio.init();
  globalThis.AudioContext = old;
  return audio;
}

test('water, curtain and sign friction follow held actions and stop on release or idle', () => {
  const audio = audioFixture();
  audio.setSceneSound('plant', 'operate', 0, 0, false, 'water', {});
  assert.ok(audio.water.gain.value > 0);
  audio.setSceneSound('plant', 'operate', 0, 0, false, null, {});
  assert.equal(audio.water.gain.value, 0);
  for (const [level, action] of [
    ['window', 'open-curtain'],
    ['sign', 'paint-sign'],
    ['sign', 'polish-frame'],
  ]) {
    audio.setSceneSound(level, 'operate', 0, 0, false, action, {});
    assert.ok(audio.friction.gain.value > 0);
    audio.setSceneSound(level, 'idle', 0, 0, false, action, {});
    assert.equal(audio.friction.gain.value, 0);
  }
});

test('clock ticks are scheduled once per half swing and are cancelled when switching scenes', () => {
  const audio = audioFixture();
  audio.setSceneSound('clock', 'ready', 0, 0, false);
  assert.equal(audio.transients.size, 0);
  audio.setSceneSound('clock', 'brew', 0, 0.1, false);
  assert.equal(audio.tickIndex, 1);
  audio.context.currentTime = 0.2;
  audio.setSceneSound('clock', 'brew', 0, 0.3, false);
  assert.equal(audio.tickIndex, 1);
  audio.context.currentTime = 0.7;
  audio.setSceneSound('clock', 'brew', 0, 0.8, false);
  assert.equal(audio.tickIndex, 2);
  const sources = [...audio.transients];
  audio.setSceneSound('window', 'clean', 0, 0, false);
  assert.equal(audio.transients.size, 0);
  assert.ok(sources.every((source) => source.stops.includes(undefined)));
});

test('opening music starts after its task and coffee preparation is a bounded cue', () => {
  const audio = audioFixture();
  audio.setSceneSound('opening', 'operate', 0, 0, false, null, {});
  assert.equal(audio.noteIndex, 0);
  const tasks = { 'opening-music': 1, 'opening-coffee': 1 };
  audio.play('task', 'opening-music');
  audio.context.currentTime = 0.2;
  audio.setSceneSound('opening', 'operate', 0, 0, false, null, tasks);
  assert.equal(audio.noteIndex, 1);
  audio.play('task', 'opening-coffee');
  audio.setSceneSound('opening', 'ready', 0, 0, false, null, tasks);
  assert.ok(audio.water.gain.value > 0);
  audio.context.currentTime = 3;
  audio.setSceneSound('opening', 'ready', 0, 0, false, null, tasks);
  assert.equal(audio.water.gain.value, 0);
  assert.ok(audio.noteIndex > 1);
});

test('mute and pause clear transient voices and continuous gains before a resume', async () => {
  const audio = audioFixture();
  audio.setSceneSound('record', 'brew', 33.3, 3, false);
  assert.ok(audio.transients.size > 0);
  audio.setEnabled(false);
  assert.equal(audio.transients.size, 0);
  audio.setSceneSound('plant', 'operate', 0, 0, false, 'water', {});
  assert.equal(audio.water.gain.value, 0);
  audio.play('task', 'opening-coffee');
  assert.equal(audio.coffeeUntil, 0);
  audio.setEnabled(true);
  audio.setScrub(true);
  audio.setSceneSound('plant', 'operate', 0, 0, false, 'water', {});
  await audio.suspend();
  for (const channel of ['scrub', 'motor', 'water', 'friction'])
    assert.equal(audio[channel].gain.value, 0);
  assert.equal(audio.context.state, 'suspended');
  await audio.unlock();
  assert.equal(audio.context.state, 'running');
  assert.equal(audio.transients.size, 0);
});

test('coffee brewing and record needle timing keep their existing sound behavior', () => {
  const audio = audioFixture();
  audio.setSceneSound('coffee', 'brew', 0, 1, false);
  assert.equal(audio.motor.gain.value, 0.07);
  assert.ok(audio.water.gain.value > 0);
  audio.setSceneSound('record', 'operate', 33, 0, false);
  assert.equal(audio.motor.gain.value, 0.018);
  assert.equal(audio.water.gain.value, 0);
  assert.equal(audio.transients.size, 0);
  audio.setSceneSound('record', 'brew', 33, 1, false);
  assert.equal(audio.noteIndex, 0);
  audio.setSceneSound('record', 'brew', 33, 2.2, false);
  assert.equal(audio.noteIndex, 1);
});


test('metadata cues are bounded voices that mute and pause cancel without replaying', async () => {
  const audio = audioFixture();
  for (const cue of ['whistle', 'bell']) {
    audio.play('task', 'a-configured-task', .7, cue);
    const voices = [...audio.transients];
    assert.ok(voices.length > 0);
    assert.ok(voices.every(source => source.stops.some(end => end > 0 && end <= 2)), cue);
    audio.setEnabled(false);
    assert.equal(audio.transients.size, 0);
    assert.ok(voices.every(source => source.stops.includes(undefined)), cue);
    audio.play('task', 'a-configured-task', .7, cue);
    assert.equal(audio.transients.size, 0);
    audio.setEnabled(true);
    audio.play('task', 'another-configured-task', .7, cue);
    await audio.suspend();
    assert.equal(audio.transients.size, 0);
    await audio.unlock();
    assert.equal(audio.transients.size, 0);
  }
});
