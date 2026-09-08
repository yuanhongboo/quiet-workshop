import test from 'node:test';
import assert from 'node:assert/strict';
import { BackgroundMusic, createMusicToneBuffer, renderMusicSample } from '../src/background-music.mjs';
import { MUSIC_THEMES } from '../src/music-score.mjs';

class Param {
  constructor(value = 0) { this.value = value; this.events = []; }
  setValueAtTime(value, time) { this.events.push(['set', value, time]); this.value = value; }
  linearRampToValueAtTime(value, time) { this.events.push(['ramp', value, time]); this.value = value; }
  setTargetAtTime(value, time, constant) { this.events.push(['target', value, time, constant]); this.value = value; }
  cancelScheduledValues(time) { this.events.push(['cancel', time]); }
}
class Node {
  constructor() {
    this.gain = new Param(1); this.frequency = new Param(); this.Q = new Param();
    this.threshold = new Param(); this.ratio = new Param(); this.knee = new Param();
    this.attack = new Param(); this.release = new Param(); this.delayTime = new Param(); this.pan = new Param();
    this.playbackRate = new Param(1); this.connections = []; this.disconnected = false;
  }
  connect(node) { this.connections.push(node); return node; }
  disconnect() { this.disconnected = true; this.connections = []; }
  start(time) { this.startTime = time; }
  stop(time = 0) { this.stopTime = time; }
}
class Context {
  constructor() { this.currentTime = 0; this.state = 'running'; this.sampleRate = 44100; this.destination = new Node(); this.nodes = []; this.sources = []; }
  node() { const node = new Node(); this.nodes.push(node); return node; }
  createGain() { return this.node(); }
  createBiquadFilter() { return this.node(); }
  createDelay() { return this.node(); }
  createDynamicsCompressor() { return this.node(); }
  createStereoPanner() { return this.node(); }
  createBufferSource() { const source = this.node(); this.sources.push(source); return source; }
  createBuffer(channels, length, sampleRate) {
    const data = Array.from({ length: channels }, () => new Float32Array(length));
    return { length, sampleRate, duration: length / sampleRate, getChannelData: (channel) => data[channel] };
  }
  advance(seconds) {
    this.currentTime += seconds;
    for (const source of this.sources) if (!source.ended && source.stopTime <= this.currentTime) { source.ended = true; source.onended?.(); }
  }
}
const playingMusic = (theme = 'street-shop') => {
  const context = new Context();
  const music = new BackgroundMusic(context, context.destination);
  music.setTheme(theme); music.setActive(true); music.update();
  return { context, music };
};

test('both original scores have complete, distinct long-form arrangements', () => {
  for (const score of Object.values(MUSIC_THEMES)) {
    assert.equal(score.bars, 32);
    assert.ok(score.duration >= 90);
    assert.ok(score.events.length > 200);
    assert.equal(new Set(score.events.map((event) => Math.floor(event.beat / score.beatsPerBar))).size, 32);
    assert.ok(score.events.every((event) => event.beat >= 0 && event.beat < score.beats && event.duration > 0 && event.velocity > 0 && event.velocity <= .65));
    assert.ok(score.events.every((event, index) => !index || event.beat >= score.events[index - 1].beat));
    const lastMelody = score.events.filter((event) => ['piano', 'wood'].includes(event.instrument) && event.beat >= 24 * score.beatsPerBar).map((event) => event.note);
    const firstMelody = score.events.filter((event) => ['piano', 'wood'].includes(event.instrument) && event.beat < 8 * score.beatsPerBar).map((event) => event.note);
    assert.notDeepEqual(firstMelody, lastMelody);
  }
  assert.notEqual(MUSIC_THEMES['street-shop'].duration, MUSIC_THEMES['rain-garden'].duration);
});

test('music is silent until active, handles a suspended context, and starts after unlock', () => {
  const context = new Context(); context.state = 'suspended';
  const music = new BackgroundMusic(context, context.destination);
  music.setActive(true); music.update();
  assert.equal(music.diagnostics.playing, false);
  assert.equal(context.sources.length, 0);
  context.state = 'running'; music.update();
  assert.equal(music.diagnostics.playing, true);
  assert.ok(context.sources.length > 0);
  music.dispose();
});

test('a full loop schedules continuously, crosses its boundary, and stays bounded on mobile', () => {
  const { context, music } = playingMusic('rain-garden');
  const duration = music.diagnostics.loopSeconds;
  for (let time = 0; time < duration + 2; time += .05) { context.advance(.05); music.update(); }
  assert.ok(music.diagnostics.scheduledNotes > MUSIC_THEMES['rain-garden'].events.length);
  assert.equal(music.diagnostics.droppedNotes, 0);
  assert.ok(music.diagnostics.maxVoices <= 36);
  assert.ok(music.diagnostics.sampleBytes < 8 * 1024 * 1024);
  assert.ok(music.diagnostics.position < 3);
  music.dispose();
});

test('pausing cancels queued and sounding sources, then resumes one transport without stacking', () => {
  const { context, music } = playingMusic();
  context.advance(.1); music.update();
  const previous = [...context.sources];
  music.setActive(false);
  const pausedPosition = music.diagnostics.position;
  const scheduled = music.diagnostics.scheduledNotes;
  assert.equal(music.diagnostics.voices, 0);
  assert.equal(music.diagnostics.playing, false);
  assert.ok(previous.every((source) => source.stopTime <= context.currentTime + .041));
  context.advance(20); music.update();
  assert.equal(music.diagnostics.scheduledNotes, scheduled);
  assert.equal(music.diagnostics.position, pausedPosition);
  music.setActive(true); music.update();
  assert.equal(music.diagnostics.playing, true);
  assert.ok(Math.abs(music.diagnostics.position - pausedPosition) < .051);
  assert.ok(previous.every((source) => source.disconnected));
  assert.ok(music.diagnostics.voices < 12);
  music.dispose();
});

test('independent music mute stops scheduling and enables again without enabling inactive playback', () => {
  const { context, music } = playingMusic();
  music.setEnabled(false);
  const scheduled = music.diagnostics.scheduledNotes;
  context.advance(2); music.update();
  assert.equal(music.diagnostics.playing, false);
  assert.equal(music.diagnostics.scheduledNotes, scheduled);
  music.setActive(false); music.setEnabled(true); music.update();
  assert.equal(music.diagnostics.playing, false);
  music.setActive(true); music.update();
  assert.equal(music.diagnostics.playing, true);
  music.dispose();
});

test('same theme does not restart, theme changes retire the old audio graph', () => {
  const { context, music } = playingMusic();
  context.advance(4); music.update();
  const position = music.diagnostics.position;
  const graph = music.graph;
  music.setTheme('street-shop');
  assert.equal(music.graph, graph);
  assert.equal(music.diagnostics.position, position);
  music.setTheme('rain-garden'); music.update();
  assert.notEqual(music.graph, graph);
  assert.equal(music.diagnostics.theme, 'rain-garden');
  assert.equal(music.diagnostics.position, 0);
  context.advance(.1); music.update();
  assert.ok(graph.nodes.every((node) => node.disconnected));
  assert.ok(music.diagnostics.voices < 15);
  music.dispose();
});

test('a long frame skips missed music instead of bursting a backlog', () => {
  const { context, music } = playingMusic();
  const before = context.sources.length;
  context.advance(80); music.update();
  const resumedSources = context.sources.slice(before);
  assert.ok(resumedSources.length <= 10);
  assert.ok(resumedSources.every((source) => source.startTime >= context.currentTime && source.startTime <= context.currentTime + .3));
  assert.equal(music.diagnostics.droppedNotes, 0);
  music.dispose();
});

test('ducking changes the music gain by about four dB without restarting notes', () => {
  const { music } = playingMusic();
  const graph = music.graph;
  const count = music.diagnostics.scheduledNotes;
  const normal = graph.output.gain.value;
  music.setDucked(true);
  const attenuation = 20 * Math.log10(graph.output.gain.value / normal);
  assert.ok(attenuation < -3 && attenuation > -5);
  assert.ok(graph.output.gain.events.some(([type]) => type === 'cancel'), 'ducking replaces a pending initial fade');
  assert.equal(music.graph, graph);
  assert.equal(music.diagnostics.scheduledNotes, count);
  music.setDucked(false);
  assert.equal(graph.output.gain.value, normal);
  music.dispose();
});

test('sampled instruments have finite bounded waveforms, softened edges and harmonic richness', () => {
  const context = new Context();
  for (const instrument of ['piano', 'felt', 'wood', 'pluck', 'bass', 'pad']) {
    const buffer = createMusicToneBuffer(context, instrument, instrument === 'bass' ? 36 : 60);
    const data = buffer.getChannelData(0);
    let peak = 0, square = 0, maxStep = 0;
    for (let i = 0; i < data.length; i++) {
      assert.ok(Number.isFinite(data[i]));
      peak = Math.max(peak, Math.abs(data[i])); square += data[i] ** 2;
      if (i) maxStep = Math.max(maxStep, Math.abs(data[i] - data[i - 1]));
    }
    assert.ok(peak > .8 && peak < .821);
    assert.ok(Math.sqrt(square / data.length) > .025);
    assert.ok(maxStep < .2, `${instrument} has no step discontinuity`);
    assert.equal(Math.abs(data[0]), 0); assert.equal(Math.abs(data.at(-1)), 0);
    assert.ok(Math.abs(data[1]) < .001);
    const root = instrument === 'bass' ? 36 : 60;
    const fundamental = 440 * 2 ** ((root - 69) / 12);
    const magnitude = (frequency) => {
      let real = 0, imaginary = 0;
      const length = 8192, offset = 2205;
      for (let i = 0; i < length; i++) {
        const window = .5 - .5 * Math.cos(2 * Math.PI * i / (length - 1));
        const angle = 2 * Math.PI * frequency * (offset + i) / buffer.sampleRate;
        real += data[offset + i] * Math.cos(angle) * window;
        imaginary += data[offset + i] * Math.sin(angle) * window;
      }
      return Math.hypot(real, imaginary);
    };
    assert.ok(magnitude(2 * fundamental) / magnitude(fundamental) > .025, `${instrument} contains audible overtones, not only a sine wave`);
  }
});

test('dispose disconnects all owned nodes and prevents any future playback', () => {
  const { context, music } = playingMusic();
  music.setTheme('rain-garden'); music.update();
  music.dispose();
  const count = context.sources.length;
  music.setEnabled(true); music.setActive(true); music.setTheme('street-shop'); music.update();
  assert.equal(context.sources.length, count);
  assert.equal(music.diagnostics.playing, false);
  assert.equal(music.diagnostics.voices, 0);
  assert.equal(music.diagnostics.sampleBytes, 0);
  assert.ok(context.nodes.every((node) => node.disconnected));
});

test('offline audition schedules the same full arrangement and rejects unbounded duration', async () => {
  const context = new Context();
  context.startRendering = async () => context.createBuffer(2, 44100, 44100);
  const result = await renderMusicSample(context, 'rain-garden', 30);
  assert.equal(result.duration, 1);
  const expected = MUSIC_THEMES['rain-garden'].events.filter((event) => event.beat < 30).length;
  assert.equal(context.sources.length, expected);
  assert.ok(context.nodes.every((node) => node.disconnected));
  await assert.rejects(() => renderMusicSample(context, 'rain-garden', Infinity));
});
