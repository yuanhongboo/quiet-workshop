const NORMAL_GAIN = 1;
const DUCKED_GAIN = .55;

const mediaFailure = (error) => ({
  kind: ({ 1: 'aborted', 2: 'network', 3: 'decode', 4: 'unsupported' })[error?.code] || 'media',
  code: error?.code || 0,
  message: error?.message || 'The music could not be loaded.',
});

// One streamed recording and one Web Audio bus. The browser owns its media
// decoder; this player never fetches or decodes the full song into AudioBuffers.
export class RecordedMusic {
  constructor(context, destination, { url, title, audioFactory = () => new Audio() }) {
    if (!url || !title) throw new TypeError('A music URL and title are required');
    this.context = context;
    this.title = title;
    this.theme = 'street-shop';
    this.enabled = true;
    this.active = false;
    this.ducked = false;
    this.unlocked = false;
    this.disposed = false;
    this.status = 'idle';
    this.error = null;
    this.generation = 0;
    this.pending = null;
    this.resumePending = false;
    this.playing = false;
    this.position = 0;
    this.pendingSeek = null;
    this.playRequests = 0;
    this.listeners = [];
    this.media = audioFactory();
    this.media.preload = 'none';
    this.media.loop = true;
    this.media.crossOrigin = 'anonymous';
    this.media.setAttribute('playsinline', '');
    this.output = context.createGain();
    this.output.gain.value = 0;
    this.source = context.createMediaElementSource(this.media);
    this.source.connect(this.output).connect(destination);
    const listen = (name, handler) => {
      this.media.addEventListener(name, handler);
      this.listeners.push([name, handler]);
    };
    listen('loadstart', () => { if (!this.error && !this.pending) this.status = 'loading'; });
    listen('loadedmetadata', () => {
      this.restorePosition();
      if (!this.error && !this.pending && !this.playing) this.status = 'ready';
    });
    listen('canplay', () => {
      if (!this.error && !this.pending && !this.playing) this.status = 'ready';
    });
    listen('playing', () => {
      if (!this.allowsMediaPlayback() || this.error) {
        this.stop();
        return;
      }
      this.playing = true;
      this.status = this.context.state === 'running' ? 'playing' : 'resuming';
      this.setGain(true);
    });
    listen('waiting', () => {
      this.playing = false;
      if (!this.error && this.wantsPlayback()) this.status = 'buffering';
    });
    listen('pause', () => {
      this.playing = false;
      if (!this.error && !this.pending) this.status = 'paused';
    });
    listen('error', () => this.fail(mediaFailure(this.media.error)));
    this.onContextState = () => {
      // Any subsequent suspension is a new pause, never part of the gesture
      // that was waiting for its first resume.
      this.resumePending = false;
      if (this.context.state === 'running') this.sync();
      else this.stop();
    };
    this.context.addEventListener('statechange', this.onContextState);
    this.media.src = url;
  }

  wantsPlayback() {
    return !this.disposed && this.enabled && this.active && this.unlocked;
  }
  allowsMediaPlayback() {
    return this.wantsPlayback() && (this.context.state === 'running'
      || (this.context.state === 'suspended' && this.resumePending));
  }
  setTheme(theme) {
    if (!this.disposed) this.theme = theme;
  }
  setEnabled(enabled) {
    if (this.disposed) return;
    this.enabled = Boolean(enabled);
    this.sync();
  }
  setActive(active) {
    if (this.disposed) return;
    this.active = Boolean(active);
    this.sync();
  }
  setDucked(ducked) {
    if (this.disposed || this.ducked === Boolean(ducked)) return;
    this.ducked = Boolean(ducked);
    if (this.playing) this.setGain(true);
  }
  setGain(audible) {
    audible = audible && this.wantsPlayback() && this.context.state === 'running';
    const parameter = this.output.gain;
    const now = this.context.currentTime;
    parameter.cancelScheduledValues(now);
    parameter.setValueAtTime(parameter.value, now);
    if (audible) parameter.setTargetAtTime(this.ducked ? DUCKED_GAIN : NORMAL_GAIN, now, .12);
    else parameter.setValueAtTime(0, now);
  }

  // Call synchronously inside a real user gesture, after setting the desired
  // active/enabled state. play() must happen before awaiting context.resume().
  unlock() {
    if (this.disposed) return Promise.resolve(false);
    this.unlocked = true;
    if (this.error) {
      const reload = !!this.media.error || ['network', 'decode', 'unsupported', 'media'].includes(this.error.kind);
      this.error = null;
      this.status = 'ready';
      if (reload) {
        this.pendingSeek = this.position;
        this.media.load();
        this.restorePosition();
      }
    }
    // A resume request may still be pending. The gain stays silent until the
    // context runs, while this synchronous media play call receives the gesture.
    if (this.wantsPlayback() && ['running', 'suspended'].includes(this.context.state)) {
      this.resumePending = this.context.state === 'suspended';
      return this.start();
    }
    this.sync();
    return Promise.resolve(false);
  }
  restorePosition() {
    if (this.pendingSeek === null || this.media.readyState < 1) return;
    try {
      const duration = this.media.duration;
      this.media.currentTime = Number.isFinite(duration) && duration > 0
        ? Math.min(this.pendingSeek, Math.max(0, duration - .05)) : this.pendingSeek;
      this.pendingSeek = null;
    } catch { /* A subsequent loadedmetadata event can apply the saved position. */ }
  }
  sync() {
    if (this.disposed) return;
    if (!this.allowsMediaPlayback()) { this.stop(); return; }
    if (this.context.state !== 'running') return;
    this.resumePending = false;
    if (this.playing && !this.media.paused && this.status === 'resuming') {
      this.status = 'playing';
      this.setGain(true);
    } else if (!this.error && !this.pending && this.media.paused) this.start();
  }
  start() {
    if (this.pending) return this.pending.promise;
    if (!this.media.paused) return Promise.resolve(this.playing);
    const request = { id: ++this.generation, promise: null };
    this.pending = request;
    this.status = 'starting';
    this.playRequests++;
    let result;
    try { result = this.media.play(); }
    catch (error) { result = Promise.reject(error); }
    request.promise = Promise.resolve(result).then(() => {
      if (request.id !== this.generation || this.disposed) {
        // A late result may not revive a paused/disposed player. If a newer
        // request is now valid, it owns this same element and must be left alone.
        if (!this.allowsMediaPlayback()) this.media.pause();
        return false;
      }
      this.pending = null;
      if (!this.allowsMediaPlayback()) {
        this.stop();
        return false;
      }
      if (this.media.error) {
        this.fail(mediaFailure(this.media.error));
        return false;
      }
      this.playing = !this.media.paused && this.media.readyState >= 2;
      this.status = this.playing ? (this.context.state === 'running' ? 'playing' : 'resuming') : 'buffering';
      this.setGain(this.playing);
      return this.playing;
    }, (error) => {
      if (request.id !== this.generation || this.disposed) return false;
      this.pending = null;
      if (!this.wantsPlayback()) { this.stop(); return false; }
      this.fail({
        kind: error?.name === 'NotAllowedError' ? 'autoplay' : error?.name === 'AbortError' ? 'interrupted' : 'playback',
        name: error?.name || 'Error',
        message: error?.message || 'The music could not start.',
      });
      return false;
    });
    return request.promise;
  }
  stop() {
    if (this.disposed) return;
    this.resumePending = false;
    this.position = Number.isFinite(this.media.currentTime) ? this.media.currentTime : this.position;
    if (this.pending || this.playing || !this.media.paused) {
      this.generation++;
      this.pending = null;
      this.playing = false;
      this.media.pause();
    }
    if (this.output.gain.value !== 0) this.setGain(false);
    if (!this.error && this.status !== 'idle') this.status = 'paused';
  }
  fail(error) {
    if (this.disposed) return;
    this.error = error;
    this.stop();
    this.status = error.kind === 'autoplay' ? 'blocked' : 'error';
    if (error.kind === 'autoplay') this.unlocked = false;
  }
  update() { this.sync(); }
  get diagnostics() {
    const position = this.disposed ? this.position : this.media.currentTime;
    const duration = this.media.duration;
    return {
      theme: this.theme, title: this.title, enabled: this.enabled, active: this.active,
      ducked: this.ducked, unlocked: this.unlocked, status: this.status,
      awaitingContext: this.resumePending,
      playing: this.playing && this.wantsPlayback() && this.context.state === 'running' && !this.media.paused && !this.media.error,
      position: Number((Number.isFinite(position) ? position : 0).toFixed(2)),
      loopSeconds: Number.isFinite(duration) ? duration : 0, loop: this.media.loop,
      readyState: this.media.readyState, networkState: this.media.networkState,
      playRequests: this.playRequests, error: this.error ? { ...this.error } : null,
      streaming: true,
    };
  }
  dispose() {
    if (this.disposed) return;
    this.stop();
    this.generation++;
    this.disposed = true;
    this.status = 'disposed';
    for (const [name, handler] of this.listeners) this.media.removeEventListener(name, handler);
    this.listeners = [];
    this.context.removeEventListener('statechange', this.onContextState);
    this.source.disconnect();
    this.output.disconnect();
    this.media.removeAttribute('src');
    this.media.load();
  }
}
