// Reusable, interruptible finishing actions. State belongs to a workbench, never the scene.
export const tasksFor = (level) => level.operation.tasks || [];
export function taskComplete(state, id) {
  const task = tasksFor(state.level).find((task) => task.id === id);
  if (!task) return false;
  const value = state.taskValues?.[id] ?? task.initial ?? 0;
  if (task.mode === 'brush') return !!state.taskFields?.find((field) => field.spec.id === id)?.done;
  if (task.mode === 'dial') return Math.abs(value - task.target) <= (task.tolerance ?? 0);
  return value >= (task.target ?? 1);
}
export function taskAvailable(state, id) {
  const task = tasksFor(state.level).find((task) => task.id === id);
  return (
    !!task &&
    !taskComplete(state, id) &&
    (task.requires || []).every((required) => taskComplete(state, required))
  );
}
export function canWorkOnTasks(state) {
  return (
    state.level.operation.kind === 'tasks' &&
    !state.completed &&
    state.brewTime === 0 &&
    state.surfaces.every((field) => field.done) &&
    state.placed.size === state.level.items.length
  );
}
export function nextTask(state) {
  return tasksFor(state.level).find((task) => taskAvailable(state, task.id)) || null;
}
export function completeTask(state, id) {
  const task = tasksFor(state.level).find((task) => task.id === id);
  if (!canWorkOnTasks(state) || !taskAvailable(state, id) || task.mode !== 'tap') return false;
  state.taskValues[id] = task.target ?? 1;
  return true;
}
export function setTaskValue(state, id, value) {
  const task = tasksFor(state.level).find((task) => task.id === id);
  if (
    !canWorkOnTasks(state) ||
    !taskAvailable(state, id) ||
    !Number.isFinite(value) ||
    task.mode !== 'dial'
  )
    return false;
  const clamped = Math.max(task.min ?? 0, Math.min(task.max ?? task.target ?? 1, value));
  state.taskValues[id] =
    Math.abs(clamped - task.target) <= (task.tolerance ?? 0) ? task.target : clamped;
  return true;
}
export function advanceTask(state, id, dt) {
  const task = tasksFor(state.level).find((task) => task.id === id);
  if (
    !canWorkOnTasks(state) ||
    !taskAvailable(state, id) ||
    !Number.isFinite(dt) ||
    dt <= 0 ||
    task.mode !== 'hold'
  )
    return false;
  state.taskValues[id] = Math.min(
    task.target ?? 1,
    (state.taskValues[id] ?? task.initial ?? 0) + Math.min(dt, 0.1) * (task.rate ?? 0.3),
  );
  return true;
}
export function scrubTask(state, id, u, v, radius, dt) {
  const field = state.taskFields?.find((field) => field.spec.id === id);
  if (!canWorkOnTasks(state) || !taskAvailable(state, id) || !field) return 0;
  const removed = field.scrub(u, v, radius, dt);
  state.taskValues[id] = field.progress;
  return removed;
}
export function taskLabel(task, value) {
  if (task.format === 'time') {
    const minutes = Math.round(value);
    return `${String(Math.floor(minutes / 60) % 12 || 12).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
  }
  if (task.mode === 'dial')
    return `${Number(value).toFixed(task.decimals ?? 0)}${task.unit ? ` ${task.unit}` : ''}`;
  return `${Math.floor((value / (task.target ?? 1)) * 100)}%`;
}
