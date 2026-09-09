import {
  tasksFor,
  taskComplete,
  taskAvailable,
  nextTask,
  completeTask,
  setTaskValue,
  advanceTask,
  scrubTask,
  taskLabel,
} from './task-actions.mjs';
const $ = (id) => document.getElementById(id);
export class ActionController {
  constructor(context, changed, audio) {
    this.context = context;
    this.changed = changed;
    this.audio = audio;
    this.selected = null;
    this.holding = null;
    this.pointer = null;
    this.painting = null;
    this.paintContact = false;
    this.point = null;
    this.controlPointer = null;
    // A gesture keeps the task it began on, even when finish() selects the next task.
    // Pointer ownership outlives capture: finish() releases capture before the eventual click.
    let pointerGesture = null, keyboardGesture = null;
    const snapshot = (task) => ({ id: task.id, mode: task.mode, state: this.context().state });
    const activate = (gesture) => {
      if (!gesture.canceled && gesture.mode === 'tap' &&
          gesture.state === this.context().state && this.enabled()) this.tap(gesture.id);
    };
    $('action-button').addEventListener('click', (event) => {
      const owner = pointerGesture &&
        (event.pointerId === pointerGesture.pointerId || event.detail > 0)
        ? pointerGesture : null;
      if (owner) {
        pointerGesture = null;
        event.preventDefault();
        activate(owner);
        return;
      }
      // Detail-zero clicks with no key gesture include assistive technology activation.
      // Keyboard gestures are handled below so browser key-repeat cannot click a new task.
      if (keyboardGesture) return;
      const task = this.current();
      if (task?.mode === 'tap' && this.enabled()) this.tap(task.id);
    });
    $('action-button').addEventListener('pointerdown', (event) => {
      if ((event.button !== undefined && event.button !== 0) || event.isPrimary === false ||
          this.controlPointer !== null || this.pointer !== null) return;
      const task = this.current();
      pointerGesture = task && this.enabled()
        ? { ...snapshot(task), pointerId: event.pointerId }
        : { pointerId: event.pointerId, canceled: true };
      if (task?.mode !== 'hold' || pointerGesture.canceled) return;
      event.preventDefault();
      this.holding = task.id;
      this.controlPointer = event.pointerId;
      $('action-button').setPointerCapture(event.pointerId);
    });
    for (const name of ['pointerup', 'pointercancel', 'lostpointercapture'])
      $('action-button').addEventListener(name, (event) => {
        if (name === 'pointercancel' && pointerGesture?.pointerId === event.pointerId)
          pointerGesture.canceled = true;
        if (this.controlPointer === event.pointerId) {
          if (name === 'lostpointercapture' && pointerGesture?.pointerId === event.pointerId)
            pointerGesture.canceled = true;
          this.stop();
          this.changed(true);
        }
      });
    $('action-button').addEventListener('keydown', (event) => {
      if (!['Space', 'Enter'].includes(event.code)) return;
      event.preventDefault();
      if (event.repeat || this.pointer !== null ||
          (this.controlPointer !== null && this.controlPointer !== 'keyboard') ||
          (keyboardGesture && keyboardGesture.code !== event.code)) return;
      const task = this.current();
      keyboardGesture = task && this.enabled() && ['tap', 'hold'].includes(task.mode)
        ? { ...snapshot(task), code: event.code } : null;
      if (!keyboardGesture) return;
      if (task.mode === 'hold') {
        this.holding = task.id;
        this.controlPointer = 'keyboard';
      } else if (event.code === 'Enter') activate(keyboardGesture);
    });
    $('action-button').addEventListener('keyup', (event) => {
      if (!['Space', 'Enter'].includes(event.code)) return;
      // Always cancel the native keyup click, including a key canceled by blur or rebind.
      event.preventDefault();
      if (keyboardGesture?.code !== event.code) return;
      const owner = keyboardGesture;
      keyboardGesture = null;
      if (this.controlPointer === 'keyboard') {
        this.stop();
        this.changed(true);
      }
      if (event.code === 'Space') activate(owner);
    });
    $('action-button').addEventListener('blur', () => {
      if (pointerGesture) pointerGesture.canceled = true;
      keyboardGesture = null;
      if (this.controlPointer !== null) {
        this.stop();
        this.changed(true);
      }
    });
    $('action-range').addEventListener('input', (event) => {
      const task = this.current(),
        { state } = this.context();
      if (!task || !this.enabled() || !setTaskValue(state, task.id, Number(event.target.value)))
        return;
      if (taskComplete(state, task.id)) this.finish(task.id);
      else this.changed(false);
    });
    $('action-range').addEventListener('change', () => this.changed(true));
    $('world').addEventListener('pointerdown', (event) => this.down(event));
    $('world').addEventListener('pointermove', (event) => {
      if (event.pointerId !== this.pointer) return;
      this.move(event.clientX, event.clientY);
    });
    $('world').addEventListener('pointerup', (event) => {
      if (event.pointerId !== this.pointer) return;
      this.move(event.clientX, event.clientY);
      this.stop();
      this.changed(true);
    });
    for (const name of ['pointercancel', 'lostpointercapture'])
      $('world').addEventListener(name, (event) => {
        if (event.pointerId === this.pointer) {
          this.stop();
          this.changed(true);
        }
      });
  }
  enabled() {
    const c = this.context();
    return (
      !c.loading &&
      c.started &&
      !c.paused &&
      c.stage === 'operate' &&
      c.state?.level.operation.kind === 'tasks'
    );
  }
  current() {
    const { state } = this.context();
    if (!state) return null;
    return (
      tasksFor(state.level).find(
        (task) => task.id === this.selected && taskAvailable(state, task.id),
      ) || nextTask(state)
    );
  }
  mount() {
    this.stop();
    this.selected = null;
    this.renderedTask = null;
    $('action-steps').replaceChildren();
    const { state } = this.context();
    for (const [index, task] of tasksFor(state.level).entries()) {
      const button = document.createElement('button');
      button.className = 'action-step';
      button.dataset.task = task.id;
      button.setAttribute('aria-label', task.name);
      button.title = task.name;
      button.textContent = String(index + 1);
      button.addEventListener('click', () => {
        if (!this.enabled() || !taskAvailable(state, task.id)) return;
        this.stop();
        this.selected = task.id;
        this.changed(false);
      });
      $('action-steps').append(button);
    }
  }
  tap(id) {
    const { state } = this.context();
    if (completeTask(state, id)) this.finish(id);
  }
  finish(id) {
    const cue = tasksFor(this.context().state.level).find(task => task.id === id)?.sound;
    this.audio.play('task', id, .7, cue);
    this.stop();
    this.selected = nextTask(this.context().state)?.id || null;
    this.changed(true);
  }
  down(event) {
    if (!this.enabled() || this.pointer !== null || this.controlPointer !== null) return;
    const { state, view } = this.context();
    let task = this.current();
    if (!task) return;
    const hitId = view.hitAction(event.clientX, event.clientY);
    if (hitId) {
      task = tasksFor(state.level).find((task) => task.id === hitId);
      this.selected = hitId;
    }
    if (task.mode === 'tap') {
      if (hitId) {
        event.preventDefault();
        this.tap(task.id);
      }
      return;
    }
    if (task.mode === 'dial') {
      if (hitId) this.changed(false);
      return;
    }
    if (task.mode === 'brush' && !view.hitActionSurface(event.clientX, event.clientY, task.id))
      return;
    if (task.mode === 'hold' && !hitId) return;
    event.preventDefault();
    this.pointer = event.pointerId;
    this.point = { x: event.clientX, y: event.clientY };
    $('world').setPointerCapture(event.pointerId);
    if (task.mode === 'brush') {
      this.painting = task.id;
      this.brushAt(this.point.x, this.point.y, 0.03);
    } else this.holding = task.id;
  }
  brushAt(x, y, dt) {
    if (!this.painting) return;
    const { state, view } = this.context(),
      id = this.painting,
      hit = view.hitActionSurface(x, y, id);
    view.hit = hit;
    this.paintContact = !!hit;
    if (!hit) return;
    const field = hit.object.userData.field,
      radius = innerWidth < 700 ? 0.3 : 0.23;
    scrubTask(state, id, hit.uv.x, hit.uv.y, radius, dt);
    if (field.done) this.finish(id);
  }
  move(x, y) {
    const old = this.point || { x, y };
    this.point = { x, y };
    if (!this.painting) return;
    const count = Math.min(220, Math.max(1, Math.ceil(Math.hypot(x - old.x, y - old.y) / 9)));
    for (let i = 1; i <= count && this.painting; i++)
      this.brushAt(old.x + ((x - old.x) * i) / count, old.y + ((y - old.y) * i) / count, 1 / 60);
  }
  tick(dt) {
    if (!this.enabled()) {
      if (this.pointer !== null || this.controlPointer !== null) this.stop();
      return;
    }
    if (this.holding) {
      const id = this.holding,
        { state } = this.context();
      advanceTask(state, id, dt);
      if (taskComplete(state, id)) this.finish(id);
    }
    if (this.painting && this.point) this.brushAt(this.point.x, this.point.y, dt);
  }
  stop() {
    const pointer = this.pointer,
      control = this.controlPointer;
    this.pointer = null;
    this.controlPointer = null;
    this.holding = null;
    this.painting = null;
    this.paintContact = false;
    this.point = null;
    try {
      if (pointer !== null) $('world').releasePointerCapture(pointer);
    } catch {}
    try {
      if (control !== null && control !== 'keyboard')
        $('action-button').releasePointerCapture(control);
    } catch {}
    this.context().view?.positionTool(null, false);
  }
  render() {
    const { state, stage } = this.context();
    if (!state) return;
    $('task-controls').hidden = state.level.operation.kind !== 'tasks' || stage !== 'operate';
    const task = this.current();
    if (!task) return;
    const value = state.taskValues[task.id] ?? task.initial ?? 0;
    for (const [index, item] of tasksFor(state.level).entries()) {
      const button = document.querySelector(`[data-task="${item.id}"]`),
        done = taskComplete(state, item.id);
      if (!button) continue;
      button.classList.toggle('complete', done);
      button.classList.toggle('active', item.id === task.id);
      button.disabled = !taskAvailable(state, item.id);
      button.textContent = done ? '✓' : String(index + 1);
      button.setAttribute('aria-current', String(item.id === task.id));
    }
    $('action-title').textContent = task.name;
    $('action-description').textContent = task.hint;
    $('action-value').textContent = taskLabel(task, value);
    $('action-button').hidden = !['tap', 'hold'].includes(task.mode);
    $('action-button').textContent =
      task.mode === 'hold' ? `按住${task.buttonLabel || task.name}` : task.buttonLabel || task.name;
    $('action-button').classList.toggle('pouring', this.holding === task.id);
    $('action-range-wrap').hidden = task.mode !== 'dial';
    $('action-progress').hidden = task.mode === 'dial';
    $('action-progress-fill').style.width =
      `${task.mode === 'tap' ? 0 : (value / (task.target ?? 1)) * 100}%`;
    $('action-brush-note').hidden = task.mode !== 'brush';
    if (this.renderedTask !== task.id) {
      this.renderedTask = task.id;
      if (task.mode === 'dial') {
        Object.assign($('action-range'), {
          min: task.min ?? 0,
          max: task.max ?? task.target,
          step: task.step ?? 1,
          value,
        });
        $('action-range').setAttribute('aria-label', task.name);
        const width = (task.max ?? task.target) - (task.min ?? 0);
        $('action-zone').style.left =
          `${((task.target - (task.tolerance ?? 0) - (task.min ?? 0)) / width) * 100}%`;
        $('action-zone').style.width = `${(((task.tolerance ?? 0) * 2) / width) * 100}%`;
      }
    }
    if (task.mode === 'dial')
      $('action-range').setAttribute('aria-valuetext', taskLabel(task, value));
  }
  get activeId() {
    return this.current()?.id || null;
  }
  get actionId() {
    return this.holding || (this.painting && this.paintContact ? this.painting : null);
  }
}
