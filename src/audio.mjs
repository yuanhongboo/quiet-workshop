import { RecordedMusic } from './recorded-music.mjs';
export class WorkshopAudio {
  constructor(musicTrack = null) {
    this.musicTrack = musicTrack;
    this.enabled = true;
    this.musicEnabled = true;
    this.backgroundMusic = null;
    this.scrubActive = false;
    this.context = null;
    this.events = {};
    this.transients = new Set();
    this.peak = 0;
    this.sceneAudible = false;
    this.sceneLevel = null;
    this.coffeeUntil = 0;
  }
  async unlock({ musicActive = false } = {}) {
    if (!this.context || this.context.state === 'closed') this.init();
    const resumed = this.context.state !== 'running' ? this.context.resume() : Promise.resolve();
    this.setEnabled(this.enabled);
    if (this.backgroundMusic) {
      this.backgroundMusic.setEnabled(this.musicEnabled);
      this.backgroundMusic.setActive(musicActive && this.enabled);
      if (musicActive && this.enabled && this.musicEnabled)
        this.backgroundMusic.unlock().catch(() => {});
    }
    // Audio loading must never delay the player's game start.
    await resumed;
  }
  init() {
    this.backgroundMusic?.dispose();
    this.backgroundMusic = null;
    const c = (this.context = new AudioContext());
    this.master = c.createGain();
    this.master.gain.value = 0.38;
    const limit = c.createDynamicsCompressor();
    limit.threshold.value = -12;
    limit.ratio.value = 5;
    this.analyser = c.createAnalyser();
    this.analyser.fftSize = 512;
    this.samples = new Float32Array(512);
    this.master.connect(limit).connect(this.analyser).connect(c.destination);
    if (this.musicTrack) this.backgroundMusic = new RecordedMusic(c, this.master, this.musicTrack);
    this.noise = c.createBuffer(1, c.sampleRate * 4, c.sampleRate);
    const data = this.noise.getChannelData(0);
    let previous = 0;
    for (let i = 0; i < data.length; i++) {
      previous = previous * 0.89 + (Math.random() * 2 - 1) * 0.12;
      data[i] = previous;
    }
    const source = c.createBufferSource();
    source.buffer = this.noise;
    source.loop = true;
    this.filter = c.createBiquadFilter();
    this.filter.type = 'bandpass';
    this.filter.frequency.value = 1800;
    this.filter.Q.value = 0.6;
    this.scrub = c.createGain();
    this.scrub.gain.value = 0;
    source.connect(this.filter).connect(this.scrub).connect(this.master);
    source.start();
    const motor = c.createOscillator();
    motor.type = 'sine';
    motor.frequency.value = 72;
    this.motor = c.createGain();
    this.motor.gain.value = 0;
    motor.connect(this.motor).connect(this.master);
    motor.start();
    const waterSource = c.createBufferSource();
    waterSource.buffer = this.noise;
    waterSource.loop = true;
    const waterFilter = c.createBiquadFilter();
    waterFilter.type = 'lowpass';
    waterFilter.frequency.value = 1600;
    this.water = c.createGain();
    this.water.gain.value = 0;
    waterSource.connect(waterFilter).connect(this.water).connect(this.master);
    waterSource.start();
    const clothSource = c.createBufferSource();
    clothSource.buffer = this.noise;
    clothSource.loop = true;
    this.frictionFilter = c.createBiquadFilter();
    this.frictionFilter.type = 'bandpass';
    this.frictionFilter.frequency.value = 800;
    this.frictionFilter.Q.value = 0.48;
    this.friction = c.createGain();
    this.friction.gain.value = 0;
    clothSource.connect(this.frictionFilter).connect(this.friction).connect(this.master);
    clothSource.start();
    this.nextNote = 0;
    this.noteIndex = 0;
    this.nextTick = 0;
    this.tickIndex = 0;
  }
  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) this.stopEffects();
    if (this.master)
      this.master.gain.setTargetAtTime(enabled ? 0.38 : 0, this.context.currentTime, 0.06);
  }
  setMusicEnabled(enabled) {
    this.musicEnabled = !!enabled;
    this.backgroundMusic?.setEnabled(this.musicEnabled);
  }
  setScrub(active, material = 'enamel', movement = 1) {
    this.scrubActive = !!active;
    if (!this.context) return;
    this.scrub.gain.setTargetAtTime(
      active ? 0.55 + Math.min(movement, 1) * 0.4 : 0,
      this.context.currentTime,
      0.035,
    );
    this.filter.frequency.setTargetAtTime(
      ['tray', 'metal', 'platter'].includes(material)
        ? 2600
        : ['counter', 'wood', 'bamboo', 'linen', 'leather'].includes(material)
          ? 1000
          : 1700,
      this.context.currentTime,
      0.08,
    );
  }
  setBrew(active) {
    if (!this.context) return;
    this.motor.gain.setTargetAtTime(active ? 0.07 : 0, this.context.currentTime, 0.2);
    if (active) this.setScrub(true, 'counter', 0.2);
  }
  setWater(active) {
    if (this.water)
      this.water.gain.setTargetAtTime(active ? 0.45 : 0, this.context.currentTime, 0.06);
  }
  setFriction(kind = null) {
    if (!this.friction) return;
    const settings = {
      curtain: [680, 0.16],
      paint: [850, 0.13],
      polish: [1450, 0.1],
    }[kind];
    this.friction.gain.setTargetAtTime(settings?.[1] || 0, this.context.currentTime, 0.06);
    if (settings)
      this.frictionFilter.frequency.setTargetAtTime(settings[0], this.context.currentTime, 0.1);
  }
  stopEffects() {
    this.backgroundMusic?.setActive(false);
    this.setScrub(false);
    this.setBrew(false);
    this.setWater(false);
    this.setFriction();
    this.nextNote = 0;
    this.nextTick = 0;
    this.noteIndex = 0;
    this.tickIndex = 0;
    this.coffeeUntil = 0;
    this.sceneAudible = false;
    if (this.context)
      for (const node of [this.scrub, this.motor, this.water, this.friction]) {
        node?.gain.cancelScheduledValues(this.context.currentTime);
        node?.gain.setValueAtTime(0, this.context.currentTime);
      }
    for (const source of this.transients) {
      try {
        source.stop();
      } catch {}
    }
    this.transients.clear();
  }
  setSceneSound(level, stage, rpm, progress, pouring, actionId = null, taskValues = {}, profile = {}) {
    if (!this.context) return;
    const active = this.enabled && stage !== 'idle' && this.context.state === 'running';
    if ((this.sceneLevel !== null && this.sceneLevel !== level) || (!active && this.sceneAudible))
      this.stopEffects();
    this.sceneLevel = level;
    this.sceneAudible = active;
    const now = this.context.currentTime;
    const coffee =
      active &&
      ((level === 'coffee' && stage === 'brew') ||
        (level === 'opening' &&
          (taskValues['opening-coffee'] || 0) >= 1 &&
          now < this.coffeeUntil));
    const record =
      active && level === 'record' && ['operate', 'ready', 'brew', 'done'].includes(stage);
    this.motor.gain.setTargetAtTime(
      coffee ? 0.07 : record ? 0.018 : 0,
      this.context.currentTime,
      0.2,
    );
    this.setWater(
      active &&
        (pouring || coffee || (level === 'plant' && stage === 'operate' && actionId === 'water') || (stage === 'operate' && profile.actionSound === 'water') || (profile.waterTask && (taskValues[profile.waterTask] || 0) >= 1)),
    );
    this.setFriction(
      active && stage === 'operate'
        ? ['curtain','polish','paint'].includes(profile.actionSound) ? profile.actionSound : level === 'window' && actionId === 'open-curtain'
          ? 'curtain'
          : level === 'sign' && actionId === 'paint-sign'
            ? 'paint'
            : level === 'sign' && actionId === 'polish-frame'
              ? 'polish'
              : null
        : null,
    );
    const music =
      active &&
      ((level === 'record' && ['brew', 'done'].includes(stage) && progress >= 2.1) ||
        (level === 'opening' && (taskValues['opening-music'] || 0) >= 1));
    if (music && !this.musicTrack && now >= this.nextNote) {
      // Original, unhurried major-seventh arpeggios; nothing is fetched or autoplayed.
      const sequence = [261.63, 329.63, 392, 493.88, 293.66, 349.23, 440, 523.25];
      this.tone(
        sequence[this.noteIndex++ % sequence.length],
        1.4,
        level === 'opening' ? 0.018 : 0.023,
      );
      if (this.noteIndex % 4 === 1)
        this.tone(sequence[(this.noteIndex - 1) % sequence.length] / 2, 2.8, 0.018);
      this.nextNote = now + 0.7;
    }
    if (this.backgroundMusic && profile.musicTheme) {
      this.backgroundMusic.setTheme(profile.musicTheme);
      this.backgroundMusic.setEnabled(this.musicEnabled);
      this.backgroundMusic.setActive(this.enabled && stage !== 'idle');
      this.backgroundMusic.setDucked(this.scrubActive || pouring || coffee || (music && !this.musicTrack) || !!(active && actionId && profile.actionSound));
    }
    const clock = active && level === 'clock' && ['brew', 'done'].includes(stage);
    if (clock && now >= this.nextTick) {
      const alternating = this.tickIndex++ % 2;
      this.noiseTap(0.075, 0.028, alternating ? 1480 : 1820);
      this.tone(alternating ? 510 : 590, 0.035, 0.008);
      this.nextTick = now + 2 / 3;
    }
  }
  tone(frequency, duration, volume, delay = 0, attack = 0.005) {
    if (!this.context || !this.enabled) return;
    const c = this.context,
      t = c.currentTime + delay,
      o = c.createOscillator(),
      g = c.createGain();
    o.frequency.value = frequency;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(volume, t + Math.min(attack, duration * .5));
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    o.connect(g).connect(this.master);
    this.transients.add(o);
    o.start(t);
    o.stop(t + duration + 0.02);
    o.onended = () => {
      this.transients.delete(o);
      o.disconnect();
      g.disconnect();
    };
  }
  noiseTap(volume, duration, frequency = 1800) {
    if (!this.context || !this.enabled) return;
    const c = this.context,
      t = c.currentTime,
      s = c.createBufferSource(),
      g = c.createGain(),
      f = c.createBiquadFilter();
    s.buffer = this.noise;
    f.type = 'bandpass';
    f.frequency.value = frequency;
    f.Q.value = 0.7;
    g.gain.setValueAtTime(volume, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    s.connect(f).connect(g).connect(this.master);
    this.transients.add(s);
    s.start(t, Math.random() * 2);
    s.stop(t + duration);
    s.onended = () => {
      this.transients.delete(s);
      s.disconnect();
      f.disconnect();
      g.disconnect();
    };
  }
  play(type, id, strength = 0.7, cue = null) {
    if (!this.context) return;
    this.events[type] = (this.events[type] || 0) + 1;
    if (!this.enabled) return;
    if (type === 'task') {
      if (cue === 'whistle') {
        this.noiseTap(.025, .65, 1300);
        this.tone(392, 1.1, .036, 0, .13);
        this.tone(523.25, 1.05, .021, .04, .14);
      } else if (cue === 'bell') {
        this.noiseTap(.04, .035, 2100);
        this.tone(659.25, 1.7, .032);
        this.tone(1321, .85, .012);
        this.tone(1816, .4, .004);
      } else if (id?.startsWith('prune-')) {
        this.noiseTap(0.18, 0.045, 2800);
        this.tone(970, 0.032, 0.007);
      } else if (id === 'opening-lamp') {
        this.noiseTap(0.18, 0.045, 560);
        this.tone(330, 0.13, 0.012);
      } else if (id === 'opening-music') {
        this.noiseTap(0.09, 0.11, 1150);
        this.nextNote = this.context.currentTime + 0.14;
      } else if (id === 'opening-coffee') {
        this.coffeeUntil = this.context.currentTime + 2.4;
        this.noiseTap(0.18, 0.05, 480);
      } else if (id === 'set-time') {
        this.noiseTap(0.07, 0.025, 1600);
        this.tone(659.25, 0.24, 0.013);
      } else if (id === 'water') {
        this.tone(392, 0.45, 0.014);
        this.tone(523.25, 0.6, 0.009, 0.12);
      } else if (id === 'sew-button' || id === 'open-curtain') {
        this.noiseTap(0.12, 0.08, 530);
        this.tone(260, 0.09, 0.01);
      } else {
        this.noiseTap(0.12, 0.09, 1150);
        this.tone(523.25, 0.3, 0.01);
      }
    } else if (type === 'clean') {
      this.tone(523.25, 0.4, 0.025);
      this.tone(783.99, 0.6, 0.02, 0.09);
      this.noiseTap(0.28, 0.13, 2400);
    } else if (type === 'place' || type === 'clink') {
      const f = id === 'cup' ? 1130 : id === 'filter' ? 640 : 280;
      this.tone(f, 0.19, 0.07 * strength);
      this.tone(f * 1.56, 0.26, 0.025 * strength);
      this.noiseTap(0.4 * strength, 0.055, 1100);
    } else if (type === 'switch') {
      this.noiseTap(0.28, 0.07, 480);
      this.tone(180, 0.1, 0.025);
    } else if (type === 'done') {
      for (const [i, f] of [261.63, 329.63, 392, 523.25].entries())
        this.tone(f, 1.5, 0.028, i * 0.14);
    } else if (type === 'pick') this.noiseTap(0.28, 0.08, 400);
  }
  update() {
    if (!this.context || this.context.state !== 'running') return;
    this.backgroundMusic?.update();
    this.analyser.getFloatTimeDomainData(this.samples);
    this.rms = Math.sqrt(this.samples.reduce((sum, v) => sum + v * v, 0) / this.samples.length);
    this.peak = Math.max(this.peak, this.rms);
  }
  async suspend() {
    this.stopEffects();
    if (this.context?.state === 'running') {
      await this.context.suspend();
    }
  }
}
