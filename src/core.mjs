import { tasksFor, taskComplete } from './task-actions.mjs';
export const CONFIG = Object.freeze({
  grid: 128,
  brushRadius: 0.23,
  mobileBrushRadius: 0.3,
  cleanRate: 7.5,
  completionThreshold: 0.93,
  saveKey: 'quiet-workshop:coffee:1',
  saveVersion: 2,
  physicsStep: 1 / 60,
  snapDistance: 0.48,
  itemAngularDamping: 2,
  grabAngularDamping: 12,
  maxItemSpeed: 80,
  maxItemSpin: 200,
  recoveryBounds: { x: 4, minY: -0.8, maxY: 6, z: 3 },
});
export const SURFACES = Object.freeze([
  { id: 'enamel', name: '搪瓷机身', width: 1.88, height: 1.55, weight: 0.4, seed: 1986 },
  { id: 'tray', name: '金属托盘', width: 1.84, height: 0.82, weight: 0.22, seed: 672 },
  {
    id: 'counter',
    name: '橡木台面',
    width: 4.7,
    height: 1.5,
    weight: 0.38,
    seed: 172,
    completionThreshold: 0.82,
  },
]);
export const ITEMS = Object.freeze([
  {
    id: 'cup',
    name: '咖啡杯',
    hint: '放到出水口下方',
    mass: 0.38,
    size: [0.36, 0.31, 0.36],
    start: [-1.78, 0.22, 0.62],
    slot: [-0.27, 0.32, 0.54],
    yaw: -0.3,
  },
  {
    id: 'filter',
    name: '滤柄',
    hint: '装回咖啡机的冲煮头',
    mass: 0.52,
    size: [0.85, 0.13, 0.27],
    start: [1.63, 0.15, 0.58],
    slot: [-0.02, 0.885, 0.49],
    yaw: 0.65,
  },
  {
    id: 'jar',
    name: '咖啡豆罐',
    hint: '放回左侧圆形木垫',
    mass: 0.65,
    size: [0.42, 0.62, 0.42],
    start: [1.68, 0.34, -0.12],
    slot: [-1.62, 0.318, -0.61],
    yaw: 0,
  },
]);
export const COFFEE = Object.freeze({
  id: 'coffee',
  number: '01',
  name: '咖啡角',
  title: '一杯咖啡<br/>之前。',
  description: '擦去积灰，收好器具。<br/>让旧物重新变得好用。',
  tags: '清洁 · 归位',
  color: '#80a38f',
  icon: 'coffee',
  revision: 1,
  steps: ['擦洗表面', '器具归位', '冲一杯咖啡'],
  surfaces: SURFACES,
  items: ITEMS,
  tidyTitle: '让每件东西，<br/>回到原位。',
  tidyHint: '拖动器具，放到对应的光圈里。',
  actionTitle: '都收拾好了。',
  actionHint: '按下按钮，听听熟悉的声音。',
  actionLabel: '冲一杯咖啡',
  runningTitle: '等一杯，<br/>热咖啡。',
  runningHint: '它又开始工作了。',
  finishedTitle: '干净的桌面。<br/>热乎的咖啡。',
  finishedDescription: '三件器具各就各位，<br/>旧咖啡机又开始工作了。',
  caption: ['RESTO 1986', 'COFFEE CORNER'],
  operation: { kind: 'click', initial: 0, duration: 4 },
  obstacles: [
    { half: [1.02, 0.94, 0.475], position: [0, 1.12, -0.36] },
    { half: [0.98, 0.09, 0.46], position: [0, 0.075, 0.65] },
  ],
});
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export function random(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let n = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    n = (n + Math.imul(n ^ (n >>> 7), 61 | n)) ^ n;
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
  };
}

export class GrimeField {
  constructor(spec, saved) {
    this.spec = spec;
    this.size = CONFIG.grid;
    this.mask = new Uint8Array(this.size ** 2);
    const rng = random(spec.seed),
      spots = [];
    for (let i = 0; i < 14; i++)
      spots.push({ x: rng(), y: rng(), radius: 0.05 + rng() * 0.19, strength: 0.15 + rng() * 0.5 });
    this.initialAmount = 0;
    for (let y = 0; y < this.size; y++)
      for (let x = 0; x < this.size; x++) {
        const u = x / (this.size - 1),
          v = y / (this.size - 1);
        let grime =
          0.32 +
          0.12 * Math.sin(u * 17 + Math.sin(v * 11)) +
          0.11 * Math.cos(v * 21 + u * 6) +
          rng() * 0.08;
        for (const spot of spots)
          grime +=
            Math.exp(-((u - spot.x) ** 2 + (v - spot.y) ** 2) / spot.radius ** 2) * spot.strength;
        if (spec.id === 'counter')
          for (const [cx, cy] of [
            [0.14, 0.5],
            [0.87, 0.32],
          ]) {
            const d = Math.hypot((u - cx) * spec.width, (v - cy) * spec.height);
            grime += Math.exp(-Math.pow((d - 0.19) / 0.02, 2)) * 0.5;
          }
        const behindMachine =
          spec.id === 'counter' &&
          Math.abs((u - 0.5) * spec.width) < 1.1 &&
          0.67 - (v - 0.5) * spec.height < 1.16;
        const radius = Math.hypot(u - 0.5, v - 0.5);
        const outsideShape =
          spec.mask?.kind === 'disc' && (radius > 0.5 || radius < (spec.mask.hole || 0));
        const excluded = spec.mask?.rects?.some(
          (r) => u > r[0] && u < r[2] && v > r[1] && v < r[3],
        );
        const amount =
          behindMachine || outsideShape || excluded
            ? 0
            : spec.kind === 'paint'
              ? 255
              : Math.round(clamp(grime, 0.2, 0.97) * 255);
        this.mask[y * this.size + x] = amount;
        this.initialAmount += amount;
      }
    this.initial = this.mask.slice();
    if (saved?.length === this.mask.length)
      this.mask.set(saved.map((value, i) => (value < 32 ? 0 : clamp(value, 0, this.initial[i]))));
    this.remaining = this.mask.reduce((sum, value) => sum + value, 0);
    this.done = this.progress >= (spec.completionThreshold ?? CONFIG.completionThreshold);
    if (this.done) this.finish();
    this.revision = 0;
  }
  get progress() {
    return clamp(1 - this.remaining / this.initialAmount, 0, 1);
  }
  finish() {
    this.mask.fill(0);
    this.remaining = 0;
    this.done = true;
    this.revision++;
  }
  scrub(u, v, radius, dt) {
    if (this.done || ![u, v, radius, dt].every(Number.isFinite) || radius <= 0 || dt <= 0) return 0;
    const rx = radius / this.spec.width,
      ry = radius / this.spec.height;
    const x0 = Math.max(0, Math.floor((u - rx) * this.size)),
      x1 = Math.min(this.size - 1, Math.ceil((u + rx) * this.size));
    const y0 = Math.max(0, Math.floor((v - ry) * this.size)),
      y1 = Math.min(this.size - 1, Math.ceil((v + ry) * this.size));
    let removed = 0;
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) {
        const d = Math.hypot((x / (this.size - 1) - u) / rx, (y / (this.size - 1) - v) / ry);
        if (d >= 1) continue;
        const i = y * this.size + x,
          before = this.mask[i],
          amount = Math.ceil(255 * CONFIG.cleanRate * Math.min(dt, 0.05) * (1 - d * d));
        const next = Math.max(0, before - amount);
        this.mask[i] = next < 32 ? 0 : next;
        removed += before - this.mask[i];
      }
    if (removed) {
      this.remaining -= removed;
      this.revision++;
      if (this.progress >= (this.spec.completionThreshold ?? CONFIG.completionThreshold))
        this.finish();
    }
    return removed / this.initialAmount;
  }
}

export function makeState(saved, level = COFFEE) {
  return {
    level,
    surfaces: level.surfaces.map((spec) => new GrimeField(spec, saved?.surfaces?.[spec.id])),
    placed: new Set(saved?.placed || []),
    stage: 'clean',
    brewTime: saved?.brewTime ?? (saved?.completed ? level.operation.duration : 0),
    operationValue: saved?.operationValue ?? level.operation.initial ?? 0,
    taskValues: Object.fromEntries(
      tasksFor(level).map((task) => [task.id, saved?.taskValues?.[task.id] ?? task.initial ?? 0]),
    ),
    taskFields: tasksFor(level)
      .filter((task) => task.field)
      .map(
        (task) =>
          new GrimeField(
            { ...task.field, id: task.id, kind: 'paint' },
            saved?.taskSurfaces?.[task.id],
          ),
      ),
    completed: !!saved?.completed,
    events: [],
    strokes: 0,
  };
}
export function cleanProgress(state) {
  if (!state.surfaces.length) return 1;
  return state.surfaces.reduce((sum, field) => sum + field.progress * field.spec.weight, 0);
}
export function stageFor(state) {
  if (state.completed) return 'done';
  if (!state.surfaces.every((s) => s.done)) return 'clean';
  if (state.placed.size < state.level.items.length) return 'tidy';
  if (!operationReady(state)) return 'operate';
  return state.brewTime > 0 ? 'brew' : 'ready';
}
export function canPlaceItem(state, id) {
  const item = state.level.items.find((item) => item.id === id);
  return !!item && (item.requires || []).every((required) => state.placed.has(required));
}
export function operationReady(state) {
  const op = state.level.operation;
  if (op.kind === 'tasks')
    return tasksFor(state.level).every((task) => taskComplete(state, task.id));
  return (
    op.kind === 'click' ||
    (op.kind === 'pour'
      ? state.operationValue >= op.target
      : Math.abs(state.operationValue - op.target) <= op.tolerance)
  );
}
export function setOperationValue(state, value) {
  if (
    !Number.isFinite(value) ||
    state.completed ||
    state.brewTime > 0 ||
    state.surfaces.some((s) => !s.done) ||
    state.placed.size < state.level.items.length
  )
    return false;
  const op = state.level.operation;
  if (!['dial', 'pour'].includes(op.kind)) return false;
  state.operationValue = clamp(value, op.min ?? 0, op.max ?? op.target);
  return true;
}
export function advancePour(state, dt) {
  if (state.level.operation.kind !== 'pour' || !Number.isFinite(dt) || dt <= 0) return false;
  return setOperationValue(
    state,
    state.operationValue + Math.min(dt, 0.1) * state.level.operation.rate,
  );
}
export function beginFinale(state) {
  if (stageFor(state) !== 'ready') return false;
  state.brewTime = 0.001;
  return true;
}
export function advanceFinale(state, dt) {
  if (stageFor(state) !== 'brew' || !Number.isFinite(dt) || dt <= 0) return false;
  state.brewTime = Math.min(state.level.operation.duration, state.brewTime + Math.min(dt, 0.1));
  if (state.brewTime >= state.level.operation.duration) state.completed = true;
  return state.completed;
}
export function packState(state) {
  return JSON.stringify({
    version: CONFIG.saveVersion,
    levelId: state.level.id,
    levelRevision: state.level.revision,
    surfaces: Object.fromEntries(state.surfaces.map((s) => [s.spec.id, Array.from(s.mask)])),
    placed: [...state.placed],
    completed: state.completed,
    brewTime: state.brewTime,
    operationValue: state.operationValue,
    ...(tasksFor(state.level).length
      ? {
          taskValues: state.taskValues,
          taskSurfaces: Object.fromEntries(
            state.taskFields.map((field) => [field.spec.id, Array.from(field.mask)]),
          ),
        }
      : {}),
  });
}
export function unpackState(raw, level = COFFEE) {
  try {
    if (typeof raw !== 'string' || raw.length > (tasksFor(level).length ? 600000 : 240000))
      return null;
    const saved = JSON.parse(raw);
    if (
      ![1, CONFIG.saveVersion].includes(saved.version) ||
      typeof saved.completed !== 'boolean' ||
      !Array.isArray(saved.placed) ||
      saved.placed.length > level.items.length ||
      new Set(saved.placed).size !== saved.placed.length ||
      saved.placed.some((id) => !level.items.some((item) => item.id === id))
    )
      return null;
    if (saved.version === 1 && level.id !== 'coffee') return null;
    if (
      saved.version === 2 &&
      (saved.levelId !== level.id || saved.levelRevision !== level.revision)
    )
      return null;
    if (saved.version === 2) {
      if (
        !Number.isFinite(saved.brewTime) ||
        saved.brewTime < 0 ||
        saved.brewTime > level.operation.duration ||
        !Number.isFinite(saved.operationValue)
      )
        return null;
      const op = level.operation;
      if (saved.operationValue < (op.min ?? 0) || saved.operationValue > (op.max ?? op.target ?? 0))
        return null;
    }
    if (
      !saved.surfaces ||
      Array.isArray(saved.surfaces) ||
      Object.keys(saved.surfaces).length !== level.surfaces.length
    )
      return null;
    for (const spec of level.surfaces) {
      const field = saved.surfaces?.[spec.id];
      if (
        !Array.isArray(field) ||
        field.length !== CONFIG.grid ** 2 ||
        field.some((v) => !Number.isInteger(v) || v < 0 || v > 255)
      )
        return null;
    }
    const tasks = tasksFor(level);
    if (tasks.length) {
      if (
        !saved.taskValues ||
        Array.isArray(saved.taskValues) ||
        Object.keys(saved.taskValues).length !== tasks.length
      )
        return null;
      const brushTasks = tasks.filter((task) => task.field);
      if (!saved.taskSurfaces || Object.keys(saved.taskSurfaces).length !== brushTasks.length)
        return null;
      for (const task of tasks) {
        const value = saved.taskValues[task.id];
        if (
          !Number.isFinite(value) ||
          value < (task.min ?? 0) ||
          value > (task.max ?? task.target ?? 1)
        )
          return null;
        if (task.mode === 'tap' && ![task.initial ?? 0, task.target ?? 1].includes(value))
          return null;
        if (task.field) {
          const data = saved.taskSurfaces[task.id];
          if (
            !Array.isArray(data) ||
            data.length !== CONFIG.grid ** 2 ||
            data.some((v) => !Number.isInteger(v) || v < 0 || v > 255)
          )
            return null;
        }
      }
    }
    const allClean = Object.values(saved.surfaces).every((array) => array.every((v) => v === 0));
    if (
      (saved.placed.length > 0 && !allClean) ||
      (saved.completed && saved.placed.length !== level.items.length) ||
      (saved.brewTime > 0 && (!allClean || saved.placed.length !== level.items.length))
    )
      return null;
    for (const id of saved.placed) {
      const item = level.items.find((item) => item.id === id);
      if (item.requires?.some((required) => !saved.placed.includes(required))) return null;
    }
    const restored = tasks.length
      ? makeState(saved, level)
      : { level, operationValue: saved.operationValue };
    if (tasks.length) {
      for (const task of tasks) {
        const progressed = saved.taskValues[task.id] !== (task.initial ?? 0);
        if (progressed && (!allClean || saved.placed.length !== level.items.length)) return null;
        if (progressed && (task.requires || []).some((id) => !taskComplete(restored, id)))
          return null;
        if (
          task.field &&
          Math.abs(
            restored.taskFields.find((field) => field.spec.id === task.id).progress -
              saved.taskValues[task.id],
          ) > 0.0001
        )
          return null;
      }
    }
    if (saved.version === 2 && (saved.completed || saved.brewTime > 0) && !operationReady(restored))
      return null;
    return saved;
  } catch {
    return null;
  }
}
