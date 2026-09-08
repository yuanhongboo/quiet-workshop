import { resolveMusicTheme } from './music-score.mjs';

const SAMPLE_RATE = 22050;
const LOOKAHEAD = 0.3;
const NORMAL_GAIN = 0.9;
const DUCKED_GAIN = 0.57;
const MAX_VOICES = 36;
const INSTRUMENTS = {
  piano: { seconds: 5.8, attack: .012, noise: .007, roots: [48, 60, 72], partials: [[1,1,2.4],[2.002,.27,1.35],[3.006,.12,.85],[4.013,.055,.5],[5.02,.026,.3],[1.0017,.12,1.8]] },
  felt: { seconds: 5.6, attack: .021, noise: .008, roots: [48, 60, 72], partials: [[1,1,2.1],[2.002,.2,1.1],[3.004,.085,.66],[4.01,.025,.4],[.9987,.09,1.5]] },
  wood: { seconds: 4.2, attack: .009, noise: .003, roots: [60, 72], partials: [[1,1,1.85],[2,.08,1.1],[3.99,.15,.35],[9.8,.022,.09]] },
  pluck: { seconds: 3.8, attack: .006, noise: .008, roots: [60, 72], partials: [[1,1,1.4],[2,.32,.75],[3,.16,.45],[4,.07,.3],[5,.03,.19]] },
  bass: { seconds: 6.8, attack: .038, noise: .001, roots: [36, 48], partials: [[1,1,3.1],[2,.28,1.8],[3,.095,1.2],[4,.025,.7]] },
  pad: { seconds: 9, attack: .55, noise: 0, roots: [48, 60], partials: [[1,.55,18],[.9983,.24,17],[1.0017,.24,17],[2,.13,10],[3,.035,8]] },
};
const frequency = (note) => 440 * 2 ** ((note - 69) / 12);
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

// A tiny original physical-style sampler: struck, slightly inharmonic partials,
// frequency-dependent damping and a soft contact transient. Buffers are shared
// across voices. No oscillator, random score, network fetch or timer per note.
export function createMusicToneBuffer(context, instrument, root) {
  const spec = INSTRUMENTS[instrument];
  if (!spec || !Number.isFinite(root)) throw new TypeError('Invalid music instrument or pitch');
  const buffer = context.createBuffer(1, Math.ceil(spec.seconds * SAMPLE_RATE), SAMPLE_RATE);
  const data = buffer.getChannelData(0);
  const fundamental = frequency(root);
  const partials = spec.partials.filter(([ratio]) => fundamental * ratio < SAMPLE_RATE * .43).map(([ratio, amplitude, decay], index) => {
    const angle = 2 * Math.PI * fundamental * ratio / SAMPLE_RATE;
    // High keys lose their upper partials a little faster, like a damped string.
    return { s: 0, c: 1, sin: Math.sin(angle), cos: Math.cos(angle), amplitude, damping: Math.exp(-1 / (decay * (1 - index * .025) * SAMPLE_RATE)) };
  });
  let seed = 971 + root * 41 + instrument.charCodeAt(0), previousNoise = 0, peak = 0;
  const attackFrames = spec.attack * SAMPLE_RATE;
  const releaseFrames = (instrument === 'pad' ? 1.2 : .22) * SAMPLE_RATE;
  const contactDecay = Math.exp(-1 / (.055 * SAMPLE_RATE));
  let contact = spec.noise;
  for (let i = 0; i < data.length; i++) {
    let sample = 0;
    for (const partial of partials) {
      sample += partial.s * partial.amplitude;
      const nextS = partial.s * partial.cos + partial.c * partial.sin;
      partial.c = partial.c * partial.cos - partial.s * partial.sin;
      partial.s = nextS;
      partial.amplitude *= partial.damping;
    }
    seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
    previousNoise = previousNoise * .7 + (seed / 2147483648) * .3;
    contact *= contactDecay;
    const attack = Math.min(1, i / attackFrames);
    const release = Math.min(1, (data.length - 1 - i) / releaseFrames);
    // Raised cosine edges avoid clicks even when a low bass note is transposed.
    const envelope = (0.5 - 0.5 * Math.cos(Math.PI * attack)) * release * release;
    data[i] = (sample + previousNoise * contact) * envelope;
    peak = Math.max(peak, Math.abs(data[i]));
  }
  const normalization = peak > 0 ? .82 / peak : 1;
  for (let i = 0; i < data.length; i++) data[i] *= normalization;
  return buffer;
}

function disconnect(nodes) {
  for (const node of nodes) { try { node.disconnect(); } catch {} }
}

export class BackgroundMusic {
  constructor(context, destination) {
    this.context = context;
    this.destination = destination;
    this.score = resolveMusicTheme('street-shop');
    this.enabled = true;
    this.active = false;
    this.ducked = false;
    this.playing = false;
    this.disposed = false;
    this.position = 0;
    this.startTime = 0;
    this.nextIndex = 0;
    this.nextLoop = 0;
    this.voices = new Set();
    this.retired = [];
    this.buffers = new Map();
    this.graph = null;
    this.scheduledNotes = 0;
    this.droppedNotes = 0;
    this.maxVoices = 0;
  }

  setTheme(theme) {
    if (this.disposed) return;
    const score = resolveMusicTheme(theme);
    if (score.id === this.score.id) return;
    this.stop();
    this.score = score;
    this.position = 0;
    this.sync();
  }
  setEnabled(enabled) {
    if (this.disposed || this.enabled === Boolean(enabled)) return;
    this.enabled = Boolean(enabled);
    this.sync();
  }
  setActive(active) {
    if (this.disposed || this.active === Boolean(active)) return;
    this.active = Boolean(active);
    this.sync();
  }
  setDucked(ducked) {
    if (this.disposed || this.ducked === Boolean(ducked)) return;
    this.ducked = Boolean(ducked);
    if (this.graph) {
      const parameter = this.graph.output.gain;
      const now = this.context.currentTime;
      // Preserve the currently audible level and replace a pending fade-in too.
      // Otherwise an early cleaning gesture could be overridden by that ramp.
      const current = parameter.value;
      parameter.cancelScheduledValues(now);
      parameter.setValueAtTime(current, now);
      parameter.setTargetAtTime(this.ducked ? DUCKED_GAIN : NORMAL_GAIN, now, .12);
    }
  }

  createGraph() {
    const c = this.context;
    const filter = c.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = this.score.id === 'rain-garden' ? 3900 : 3100;
    filter.Q.value = .45;
    const dry = c.createGain();
    dry.gain.value = .92;
    const delay = c.createDelay(.8);
    delay.delayTime.value = this.score.id === 'rain-garden' ? .233 : .197;
    const wet = c.createGain();
    wet.gain.value = .17;
    const diffuser = c.createBiquadFilter();
    diffuser.type = 'lowpass';
    diffuser.frequency.value = 1800;
    const compressor = c.createDynamicsCompressor();
    compressor.threshold.value = -14;
    compressor.knee.value = 18;
    compressor.ratio.value = 2.4;
    compressor.attack.value = .012;
    compressor.release.value = .24;
    const output = c.createGain();
    output.gain.value = 0;
    filter.connect(dry).connect(compressor);
    filter.connect(delay).connect(diffuser).connect(wet).connect(compressor);
    compressor.connect(output).connect(this.destination);
    return { input: filter, output, nodes: [filter, dry, delay, wet, diffuser, compressor, output] };
  }

  sync() {
    this.cleanup();
    const shouldPlay = !this.disposed && this.active && this.enabled && this.context.state === 'running';
    if (shouldPlay && !this.playing) this.start();
    else if (!shouldPlay && this.playing) this.stop();
  }
  start() {
    const now = this.context.currentTime;
    this.graph = this.createGraph();
    this.graph.output.gain.setValueAtTime(0, now);
    this.graph.output.gain.linearRampToValueAtTime(this.ducked ? DUCKED_GAIN : NORMAL_GAIN, now + .18);
    this.startTime = now + .035 - this.position;
    this.seek(this.position);
    this.playing = true;
  }
  seek(seconds) {
    const loopSeconds = this.score.duration;
    this.nextLoop = Math.floor(seconds / loopSeconds);
    const within = seconds % loopSeconds;
    this.nextIndex = this.score.events.findIndex((event) => event.beat * 60 / this.score.tempo >= within - .00001);
    if (this.nextIndex < 0) { this.nextIndex = 0; this.nextLoop++; }
  }
  stop() {
    if (!this.playing && !this.graph) return;
    const now = this.context.currentTime;
    this.position = Math.max(0, now - this.startTime) % this.score.duration;
    this.playing = false;
    for (const voice of this.voices) {
      try {
        voice.gain.gain.cancelScheduledValues(now);
        voice.gain.gain.setTargetAtTime(0, now, .008);
        // stop() also cancels a source whose start lies in the future.
        voice.source.stop(voice.start > now ? now : now + .04);
      } catch {}
    }
    const oldVoices = [...this.voices];
    this.voices.clear();
    if (this.graph) {
      this.graph.output.gain.cancelScheduledValues(now);
      this.graph.output.gain.setTargetAtTime(0, now, .008);
      this.retired.push({ nodes: [...this.graph.nodes, ...oldVoices.flatMap((voice) => voice.nodes)], end: now + .08 });
      this.graph = null;
    }
    // A rapid toggle can keep at most two fading graphs alive.
    while (this.retired.length > 2) disconnect(this.retired.shift().nodes);
  }

  getBuffer(instrument, note) {
    const spec = INSTRUMENTS[instrument];
    const root = spec.roots.reduce((best, pitch) => Math.abs(pitch - note) < Math.abs(best - note) ? pitch : best);
    const key = `${instrument}:${root}`;
    if (!this.buffers.has(key)) this.buffers.set(key, createMusicToneBuffer(this.context, instrument, root));
    return { buffer: this.buffers.get(key), rate: 2 ** ((note - root) / 12) };
  }
  schedule(event, when, { offline = false } = {}) {
    if (!this.graph || (!offline && this.voices.size >= MAX_VOICES)) { this.droppedNotes++; return; }
    const c = this.context;
    const { buffer, rate } = this.getBuffer(event.instrument, event.note);
    const source = c.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = rate;
    const gain = c.createGain();
    const pan = c.createStereoPanner();
    pan.pan.value = clamp(event.pan + (event.note - 60) * .007, -.6, .6);
    const secondsPerBeat = 60 / this.score.tempo;
    const naturalDuration = buffer.duration / rate;
    const duration = Math.min(naturalDuration, event.duration * secondsPerBeat + (event.instrument === 'pad' ? .75 : event.instrument === 'bass' ? .3 : .65));
    const end = when + duration;
    gain.gain.setValueAtTime(clamp(event.velocity, 0, .65), when);
    gain.gain.setValueAtTime(clamp(event.velocity, 0, .65), Math.max(when, end - .12));
    gain.gain.linearRampToValueAtTime(0, end);
    source.connect(gain).connect(pan).connect(this.graph.input);
    const voice = { source, gain, nodes: [source, gain, pan], start: when, end };
    this.voices.add(voice);
    this.scheduledNotes++;
    this.maxVoices = Math.max(this.maxVoices, this.voices.size);
    source.onended = () => { this.voices.delete(voice); disconnect(voice.nodes); };
    source.start(when);
    source.stop(end + .01);
  }
  cleanup() {
    const now = this.context.currentTime;
    for (const voice of this.voices) if (voice.end + .05 < now) { this.voices.delete(voice); disconnect(voice.nodes); }
    this.retired = this.retired.filter((graph) => {
      if (graph.end > now) return true;
      disconnect(graph.nodes);
      return false;
    });
  }
  update() {
    if (this.disposed) return;
    this.sync();
    if (!this.playing) return;
    const now = this.context.currentTime;
    const transport = Math.max(0, now - this.startTime);
    const upcoming = this.nextLoop * this.score.duration + this.score.events[this.nextIndex].beat * 60 / this.score.tempo;
    // A throttled tab or a long frame must not burst all missed notes at once.
    // Drop missed events and continue at the current musical position.
    if (upcoming < transport - .06) this.seek(transport);
    const horizon = now + LOOKAHEAD;
    for (let count = 0; count < 64; count++) {
      const event = this.score.events[this.nextIndex];
      const when = this.startTime + this.nextLoop * this.score.duration + event.beat * 60 / this.score.tempo;
      if (when > horizon) break;
      if (when >= now - .005) this.schedule(event, Math.max(now, when));
      this.nextIndex++;
      if (this.nextIndex >= this.score.events.length) { this.nextIndex = 0; this.nextLoop++; }
    }
  }
  get diagnostics() {
    const position = this.playing ? Math.max(0, this.context.currentTime - this.startTime) % this.score.duration : this.position;
    return {
      theme: this.score.id, title: this.score.title, playing: this.playing, enabled: this.enabled,
      active: this.active, ducked: this.ducked, voices: this.voices.size,
      scheduledNotes: this.scheduledNotes, droppedNotes: this.droppedNotes, maxVoices: this.maxVoices,
      bar: Math.min(this.score.bars, 1 + Math.floor(position / (60 / this.score.tempo * this.score.beatsPerBar))),
      bars: this.score.bars, loopSeconds: this.score.duration, position: Number(position.toFixed(2)),
      sampleBytes: [...this.buffers.values()].reduce((bytes, buffer) => bytes + buffer.length * 4, 0),
    };
  }
  dispose() {
    if (this.disposed) return;
    this.stop();
    this.disposed = true;
    for (const graph of this.retired) disconnect(graph.nodes);
    this.retired = [];
    this.buffers.clear();
  }
}

// Offline QA uses exactly the gameplay score, buffers and signal chain. Pass an
// OfflineAudioContext with the desired duration; no autoplay or network involved.
export async function renderMusicSample(context, theme = 'street-shop', seconds = 30) {
  if (typeof context.startRendering !== 'function' || !Number.isFinite(seconds) || seconds <= 0 || seconds > 300) throw new TypeError('An OfflineAudioContext and 0–300 second duration are required');
  const music = new BackgroundMusic(context, context.destination);
  music.score = resolveMusicTheme(theme);
  music.graph = music.createGraph();
  music.graph.output.gain.setValueAtTime(0, 0);
  music.graph.output.gain.linearRampToValueAtTime(NORMAL_GAIN, .18);
  music.graph.output.gain.setValueAtTime(NORMAL_GAIN, Math.max(.2, seconds - .8));
  music.graph.output.gain.linearRampToValueAtTime(0, seconds);
  for (let loop = 0; loop * music.score.duration < seconds; loop++) {
    for (const event of music.score.events) {
      const when = loop * music.score.duration + event.beat * 60 / music.score.tempo;
      if (when >= seconds) break;
      music.schedule(event, when, { offline: true });
    }
  }
  try { return await context.startRendering(); }
  finally { music.dispose(); }
}
