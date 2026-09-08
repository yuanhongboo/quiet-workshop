import { readAudioPreferences, saveAudioPreferences } from './audio-preferences.mjs';
import { seasonArtwork } from './season-art.mjs';
import { ActionController } from './action-controller.mjs';
import { SEASON as SEASON_ONE, SEASON_TWO, SEASONS, seasonLevelIds, seasonForLevel, seasonLabel, getSeason } from './season.mjs';
import { gardenArtwork } from './garden-art.mjs';
import { tasksFor, taskComplete } from './task-actions.mjs';
import {
  CONFIG,
  makeState,
  cleanProgress,
  stageFor,
  clamp,
  canPlaceItem,
  operationReady,
  setOperationValue,
  advancePour,
  beginFinale,
  advanceFinale,
} from './core.mjs';
import { LEVELS, getLevel, nextLevel } from './levels.mjs';
import {
  COLLECTION_KEY,
  readLevel,
  saveLevel,
  resetLevel,
  selectedLevel,
  rememberLevel,
  collectionStatus,
  seasonProgress,
  seasonSaveKey,
  rememberSeason,
  levelUnlocked,
} from './progress.mjs';
import { WorkshopView } from './scene.mjs';
import { createPropsPhysics } from './physics.mjs';
import { WorkshopAudio } from './audio.mjs';
import { Vector3 } from 'three';
import { version } from '../package.json';
const $ = (id) => document.getElementById(id),
  audio = new WorkshopAudio(),
  params = new URLSearchParams(location.search);
const storage = (() => {
  try {
    return localStorage;
  } catch {
    return {
      getItem: () => null,
      setItem: () => {
        throw new Error('Storage unavailable');
      },
    };
  }
})();
const audioPreferences = readAudioPreferences(storage);
audio.setEnabled(audioPreferences.enabled);
audio.setMusicEnabled(audioPreferences.musicEnabled);
let state,
  level,
  stage,
  view,
  physics,
  loading = true,
  started = false,
  paused = false,
  before = false,
  pointerId = null,
  pourPointer = null,
  pouring = false;
let point = { x: 0, y: 0 },
  lastHit = null,
  lastTime = 0,
  accumulator = 0,
  time = 0,
  lastHud = 0,
  lastSave = 0,
  toastUntil = 0,
  nextDiagnostics = 0,
  frameTimes = [],
  galleryWasPaused = false,
  completedCount = 0,
  seasonState = null,
  shopPreview = false,
  activeSeason = SEASON_ONE,
  gallerySeason = SEASON_ONE;
const diagnostics = params.has('diagnostics');
$('diagnostics').hidden = !diagnostics;
document.body.dataset.version = version;
document.body.append($('toast'));
const actions = new ActionController(
  () => ({ state, view, stage, started, paused, loading }),
  (save) => {
    if (!state || loading) return;
    switchStage();
    if (save) persist();
    updateHud();
  },
  audio,
);
function refreshSeason() {
  seasonState = seasonProgress(storage, activeSeason);
  completedCount = seasonState.completedIds.size;
  if (state) state.seasonRestored = seasonState.restoredIds;
}
function nextSuggestion() {
  const levels = seasonLevelIds(activeSeason).map(getLevel),
    index = levels.findIndex((item) => item.id === level.id),
    sequence = [...levels.slice(index + 1), ...levels.slice(0, index + 1)];
  return (
    sequence.find(
      (item) =>
        !seasonState.completedIds.has(item.id) &&
        (item.id !== activeSeason.openingId || seasonState.canOpen),
    ) || getLevel(activeSeason.openingId)
  );
}
async function showShop(season = activeSeason) {
  await audio.unlock().catch(() => {});
  return loadLevel(getLevel(season.openingId), { preview: true });
}
function refreshShop() {
  const count = seasonState.restoredIds.size;
  $('shop-description').textContent = seasonState.finished
    ? '九处风景都收拾好了。这里留下你亲手恢复的样子。'
    : `已有 ${count} 处回到${activeSeason.overviewName || '小店'}。收好前 8 处，就能${activeSeason === SEASON_TWO ? '让花房苏醒' : '一起开门'}。`;
  $('shop-milestones').replaceChildren();
  for (const id of activeSeason.restorationIds) {
    const item = getLevel(id),
      button = document.createElement('button');
    button.className = 'shop-milestone';
    button.classList.toggle('restored', seasonState.restoredIds.has(id));
    button.textContent = `${seasonState.restoredIds.has(id) ? '✓' : '○'} ${item.name}`;
    button.addEventListener('click', () => loadLevel(item));
    $('shop-milestones').append(button);
  }
  $('begin-opening').disabled = !seasonState.canOpen;
  $('begin-opening').innerHTML = seasonState.finished
    ? `重温${activeSeason === SEASON_TWO ? '花房苏醒' : '小店开张'} <span>↗</span>`
    : seasonState.canOpen
      ? `${activeSeason === SEASON_TWO ? '唤醒花房' : '准备开门'} <span>↗</span>`
      : `还差 ${activeSeason.restorationIds.length - count} 处焕新`;
}
function notify(text) {
  $('toast').textContent = text;
  $('toast').classList.add('visible');
  toastUntil = time + 3;
}
function persist() {
  if (!state || loading || !started) return false;
  const success = saveLevel(storage, state);
  $('save-status').textContent = success ? '进度已保存' : '本次进度未保存';
  return success;
}
function failure(cause) {
  console.error(cause);
  $('error-message').textContent = cause.message;
  $('error').hidden = false;
  document.body.dataset.state = 'error';
}
function makeLists() {
  $('surface-list').replaceChildren();
  $('item-list').replaceChildren();
  for (const spec of level.surfaces) {
    const button = document.createElement('button');
    button.className = 'surface';
    button.dataset.surface = spec.id;
    button.setAttribute('aria-label', `查看${spec.name}`);
    button.title = `点击定位${spec.name}和剩余污渍`;
    button.innerHTML = `<span class="surface-icon">○</span><span class="surface-label">${spec.name}</span><small>0%</small>`;
    button.addEventListener('click', () => {
      stopPointer();
      view.focus = spec.id;
      view.surfaceGuide.show(spec.id);
      updateHud();
    });
    $('surface-list').append(button);
  }
  for (const item of level.items) {
    const row = document.createElement('div');
    row.className = 'item-row';
    row.dataset.item = item.id;
    row.innerHTML = `<b>○</b><span>${item.name}</span>`;
    $('item-list').append(row);
  }
}
async function loadLevel(next, { reset = false, play = false, preview = false } = {}) {
  if (loading && state) return;
  stopInteractions();
  persist();
  if (reset && !resetLevel(storage, next)) {
    const message = '浏览器暂时无法保存，已保留原来的完成记录。';
    notify(message);
    if ($('pause-dialog').open)
      $('pause-dialog').querySelector('p:not(.eyebrow)').textContent = message;
    return;
  }
  if (next.id === seasonForLevel(next).openingId && !levelUnlocked(storage, next)) preview = true;
  loading = true;
  document.body.dataset.state = 'loading';
  $('start').disabled = true;
  audio.stopEffects();
  await audio.suspend().catch(() => {});
  $('level-dialog').close();
  $('pause-dialog').close();
  view?.dispose();
  physics?.dispose();
  view = null;
  physics = null;
  level = next;
  activeSeason = seasonForLevel(level);
  gallerySeason = activeSeason;
  const seasonName = seasonLabel(activeSeason);
  const placeName = activeSeason.overviewName || '小店';
  document.body.dataset.season = activeSeason.id;
  document.title = `好好收拾 · ${seasonName}：${activeSeason.title}`;
  document.querySelector('.brand small').textContent = `${seasonName} · ${activeSeason.title}`;
  document.querySelector('#shop-panel .eyebrow').textContent = `${seasonName} / ${activeSeason.title}`;
  document.querySelector('#shop-panel h2').innerHTML = activeSeason === SEASON_TWO ? '让一座花房，<br/>慢慢苏醒。' : '一点点，<br/>恢复日常。';
  $('finished-shop').textContent = `看看我的${placeName}`;
  $('shop-milestones').setAttribute('aria-label', `${placeName}恢复进度`);
  $('inspect').hidden = activeSeason !== SEASON_TWO;
  shopPreview = preview;
  started = false;
  paused = false;
  before = false;
  accumulator = 0;
  frameTimes = [];
  const saved = reset ? null : readLevel(storage, level);
  state = makeState(saved, level);
  refreshSeason();
  state.shopPreview = shopPreview;
  stage = stageFor(state);
  try {
    physics = await createPropsPhysics(state);
    view = new WorkshopView($('world'), state);
    view.focus =
      state.surfaces.find((s) => !s.done)?.spec.id || level.surfaces[0]?.id || 'overview';
    makeLists();
    actions.mount();
    if (!shopPreview) rememberLevel(storage, level);
    rememberSeason(storage, activeSeason);
    params.set('level', level.id);
    params.set('season', activeSeason.id);
    history.replaceState(null, '', `${location.pathname}?${params}`);
    $('world').setAttribute('aria-label', `可清洁整理的${level.name}`);
    $('level-label').textContent = `${seasonName} · 第 ${level.number} 关 / ${level.name}`;
    $('intro-title').innerHTML = level.title;
    $('intro-title').style.setProperty(
      '--title-glyphs',
      String(Array.from(level.title.replace(/<[^>]*>/g, '')).length),
    );
    $('intro-description').innerHTML = level.description;
    $('intro-steps').innerHTML = level.steps
      .map((text, i) => `<span><i>0${i + 1}</i>${text}</span>`)
      .join('');
    $('finished-title').innerHTML = level.finishedTitle;
    $('finished-description').innerHTML = level.finishedDescription;
    $('stamp-name').textContent = `工作台 ${level.number}`;
    document
      .querySelectorAll('.scene-caption span')
      .forEach((el, i) => (el.textContent = level.caption[i]));
    $('start-label').textContent = state.completed
      ? '看看工作台'
      : saved && cleanProgress(state) > 0.001
        ? '继续收拾'
        : '开始收拾';
    if (level.id === activeSeason.openingId)
      $('start-label').textContent = state.completed ? `看看${placeName}` : saved ? '继续准备' : activeSeason === SEASON_TWO ? '唤醒花房' : '准备开门';
    $('intro').hidden = shopPreview;
    $('shop-panel').hidden = !shopPreview;
    refreshShop();
    $('hud').hidden = true;
    $('finished').hidden = true;
    $('pause').hidden = true;
    $('comparison-label').hidden = true;
    $('compare').textContent = '看看整理前';
    $('compare').setAttribute('aria-pressed', 'false');
    document.body.dataset.comparison = 'after';
    $('toast').classList.remove('visible');
    $('toast').textContent = '';
    $('save-status').textContent = '进度自动保存';
    if (level.operation.kind === 'dial') {
      const op = level.operation;
      Object.assign($('speed'), {
        min: op.min,
        max: op.max,
        step: op.step,
        value: state.operationValue,
      });
      $('speed-zone').style.left =
        `${((op.target - op.tolerance - op.min) / (op.max - op.min)) * 100}%`;
      $('speed-zone').style.width = `${((2 * op.tolerance) / (op.max - op.min)) * 100}%`;
    }
    loading = false;
    refreshSeason();
    $('start').disabled = false;
    lastTime = performance.now();
    updateHud();
    if (shopPreview && audio.context) await audio.unlock().catch(() => {});
    if (play && !shopPreview) await start();
  } catch (cause) {
    loading = false;
    failure(cause);
  }
}
function switchStage() {
  const next = stageFor(state);
  if (next === stage) return;
  stage = next;
  nextDiagnostics = 0;
  stopPointer(false);
  actions.stop();
  if (stage === 'tidy') notify(`擦干净了。${level.tidyHint}`);
  if (stage === 'ready' && level.operation.kind === 'click') notify(level.actionHint);
  if (['operate', 'ready'].includes(stage) && level.operation.kind !== 'click') {
    $('toast').classList.remove('visible');
    $('toast').textContent = '';
    toastUntil = 0;
  }
  if (stage === 'done') {
    stopPour();
    audio.stopEffects();
    audio.play('done');
    $('hud').hidden = true;
    $('finished').hidden = false;
  }
  persist();
  if (stage === 'done') refreshSeason();
  updateHud();
}
function updateHud() {
  if (loading || !view || !physics) return;
  const progress =
    stage === 'clean'
      ? cleanProgress(state)
      : level.items.length
        ? state.placed.size / level.items.length
        : 1;
  $('progress-value').textContent = String(Math.floor(progress * 100));
  $('progress-fill').style.width = `${progress * 100}%`;
  $('progress-name').textContent = stage === 'clean' ? '清洁进度' : '归位进度';
  const copy = {
    clean: [
      `第一步 / ${level.steps[0]}`,
      '一点点，<br/>变干净。',
      '按住并拖动，擦去表面的污垢。',
      '湿海绵',
      '按住拖动，擦过的地方会恢复光泽',
    ],
    tidy: [
      `第二步 / ${level.steps[1]}`,
      level.tidyTitle,
      level.tidyHint,
      '收拾器具',
      '拖到对应光圈，松手归位',
    ],
    operate: [
      `第三步 / ${level.steps[2]}`,
      level.actionTitle,
      level.actionHint,
      level.operation.kind === 'tasks'
        ? '照顾旧物'
        : level.operation.kind === 'pour'
          ? '慢慢注水'
          : '校准唱机',
      level.operation.kind === 'tasks'
        ? '每做好一件，就离开门近一点'
        : level.operation.kind === 'pour'
          ? '按住注水，松手暂停'
          : '将转速调进绿区',
    ],
    ready: [
      `第三步 / ${level.steps[2]}`,
      level.actionTitle,
      level.actionHint,
      '准备就绪',
      '工作台已经焕新',
    ],
    brew: [
      `第三步 / ${level.steps[2]}`,
      level.runningTitle,
      level.runningHint,
      '稍等片刻',
      '这一点小事，就快完成',
    ],
    done: ['已经收拾好', level.finishedTitle, '', '完成', ''],
  }[stage];
  if (stage === 'ready' && level.operation.kind === 'tasks') {
    copy[1] = level.id === activeSeason.openingId ? `${activeSeason.overviewName || '小店'}准备好了。` : '小事都做好了。';
    copy[2] =
      level.id === activeSeason.openingId ? (activeSeason === SEASON_TWO ? '让阳光，慢慢照进花房。' : '打开门，让日常重新开始。') : `最后，${level.actionLabel}。`;
  }
  $('stage-label').textContent = copy[0];
  $('task-title').innerHTML = copy[1];
  $('task-description').textContent = copy[2];
  $('tool-name').textContent = copy[3];
  $('tool-tip').textContent = copy[4];
  $('surface-list').hidden = stage !== 'clean';
  $('item-list').hidden = stage !== 'tidy';
  document.querySelector('.progress-heading').hidden = !['clean', 'tidy'].includes(stage);
  document.querySelector('.progress-track').hidden = !['clean', 'tidy'].includes(stage);
  $('recover-loose').hidden = stage !== 'tidy';
  const operating = ['operate', 'ready'].includes(stage),
    op = level.operation;
  $('operation-panel').hidden = !operating;
  $('pour-controls').hidden = op.kind !== 'pour';
  $('dial-controls').hidden = op.kind !== 'dial';
  $('brew').hidden = !operating || op.kind === 'pour';
  $('brew').disabled = stage !== 'ready';
  $('brew').innerHTML = `${level.actionLabel} <span>↗</span>`;
  if (op.kind === 'tasks') $('brew').hidden = stage !== 'ready';
  actions.render();
  if (op.kind === 'pour') {
    $('pour-value').textContent = `${Math.floor((state.operationValue / op.target) * 100)}%`;
    $('pour-fill').style.width = `${(state.operationValue / op.target) * 100}%`;
    $('pour-button').classList.toggle('pouring', pouring);
  }
  if (op.kind === 'dial') {
    $('speed-value').textContent = `${state.operationValue.toFixed(1)} RPM`;
    $('speed').setAttribute('aria-valuetext', `${state.operationValue.toFixed(1)} RPM`);
    $('speed-hint').textContent = operationReady(state)
      ? '转速稳了，可以放下唱针。'
      : '目标 33⅓ RPM · 调进绿区';
    $('dial-controls').classList.toggle('calibrated', operationReady(state));
  }
  for (const field of state.surfaces) {
    const button = document.querySelector(`[data-surface="${field.spec.id}"]`);
    button.classList.toggle('done', field.done);
    button.classList.toggle('active', field.spec.id === view.focus && !field.done);
    button.querySelector('.surface-icon').textContent = field.done ? '✓' : '○';
    button.querySelector('small').textContent = field.done
      ? '完成'
      : `${Math.floor(field.progress * 100)}%`;
  }
  for (const item of level.items) {
    const row = document.querySelector(`[data-item="${item.id}"]`);
    row.classList.toggle('placed', state.placed.has(item.id));
    row.querySelector('b').textContent = state.placed.has(item.id) ? '✓' : '○';
  }
  if (physics.held) {
    const item = level.items.find((i) => i.id === physics.held);
    $('object-label').hidden = false;
    $('item-name').textContent = item.name;
    $('item-hint').textContent = physics.nearSlot() ? '松手，就放好了' : item.hint;
  } else $('object-label').hidden = true;
  $('inspect').hidden = activeSeason !== SEASON_TWO || shopPreview;
  $('inspect').setAttribute('aria-pressed', String(!!view.inspectClose));
  $('inspect').setAttribute('aria-label', view.inspectClose ? '回到全景' : '凑近看看');
  $('view').setAttribute('aria-label', activeSeason === SEASON_TWO ? '转到另一面' : '换个角度');
  $('view').title = activeSeason === SEASON_TWO ? '转到另一面 · 前 / 侧 / 后 / 侧' : '换个角度';
  $('collection-count').textContent = `${completedCount} / ${seasonLevelIds(activeSeason).length} 已完成`;
  $('next-level').innerHTML = seasonState.finished
    ? `回到我的${activeSeason.overviewName || '小店'} <span>↗</span>`
    : `接下来 · ${nextSuggestion().name} <span>↗</span>`;
  Object.assign(document.body.dataset, {
    state: shopPreview ? 'overview' : started ? (paused ? 'paused' : stage) : 'ready',
    level: level.id,
    held: physics.held || '',
    progress: String(Math.round(cleanProgress(state) * 100)),
  });
  if (time > toastUntil) $('toast').classList.remove('visible');
  if (diagnostics && time > nextDiagnostics) {
    nextDiagnostics = time + 0.1;
    $('diagnostic-data').textContent = JSON.stringify(
      {
        version,
        season: {
          id: activeSeason.id,
          restored: [...seasonState.restoredIds],
          completed: [...seasonState.completedIds],
          canOpen: seasonState.canOpen,
          finished: seasonState.finished,
          preview: shopPreview,
        },
        tasks: tasksFor(level).map((task) => ({
          id: task.id,
          mode: task.mode,
          value: state.taskValues[task.id],
          done: taskComplete(state, task.id),
          screen: (() => {
            const p = view.actionPosition(task.id);
            return p ? screen(p.toArray()) : null;
          })(),
        })),
        taskSurfacesScreen: view.actionSurfaces.map((m) => ({
          id: m.userData.actionId,
          corners: [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 1],
          ].map(([u, v]) => {
            const p = m.localToWorld(
              new Vector3(
                (u - 0.5) * m.userData.field.spec.width,
                (v - 0.5) * m.userData.field.spec.height,
                0,
              ),
            );
            return screen(p.toArray());
          }),
        })),
        action: actions.actionId,
        activeTask: actions.activeId,
        level: level.id,
        stage,
        started,
        paused,
        before,
        progress: cleanProgress(state),
        operation: state.operationValue,
        brewTime: state.brewTime,
        pouring,
        surfaces: state.surfaces.map((s) => ({
          id: s.spec.id,
          progress: s.progress,
          done: s.done,
        })),
        placed: [...state.placed],
        held: physics.held,
        audio: {
          state: audio.context?.state || 'locked',
          enabled: audio.enabled,
          peakRms: audio.peak,
          currentRms: audio.rms || 0,
          events: audio.events,
          music: audio.backgroundMusic?.diagnostics || { playing: false, enabled: audio.musicEnabled },
        },
        view: {
          width: innerWidth,
          height: innerHeight,
          dpr: view.renderer.getPixelRatio(),
          calls: view.renderer.info.render.calls,
          triangles: view.renderer.info.render.triangles,
          memory: view.renderer.info.memory,
          p95FrameMs:
            [...frameTimes].sort((a, b) => a - b)[Math.floor(frameTimes.length * 0.95)] || 0,
          samples: frameTimes.length,
        },
        surfacesScreen: view.dirtyMeshes.map((m) => ({
          id: m.userData.field.spec.id,
          corners: [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 1],
          ].map(([u, v]) => {
            const p = m.localToWorld(
              new Vector3(
                (u - 0.5) * m.userData.field.spec.width,
                (v - 0.5) * m.userData.field.spec.height,
                0,
              ),
            );
            return screen([p.x, p.y, p.z]);
          }),
        })),
        items: level.items.map((item) => {
          const p = physics.bodies.get(item.id).translation();
          return {
            id: item.id,
            position: p,
            screen: screen([p.x, p.y, p.z]),
            slot: screen(view.slots.get(item.id).position.toArray()),
          };
        }),
      },
      null,
      2,
    );
  }
}
function screen(position) {
  const p = view.project(position);
  return { x: ((p.x + 1) / 2) * innerWidth, y: ((1 - p.y) / 2) * innerHeight };
}
function scrubAt(x, y, dt, interpolate = true) {
  if (stage !== 'clean') return;
  const hit = view.hitSurface(x, y);
  view.hit = hit;
  if (!hit || hit.object.userData.field.done) {
    lastHit = null;
    audio.setScrub(false);
    return;
  }
  const field = hit.object.userData.field,
    radius =
      innerWidth < 700
        ? field.spec.width > 4
          ? 0.43
          : CONFIG.mobileBrushRadius
        : CONFIG.brushRadius;
  const old = lastHit?.field === field ? lastHit : null,
    distance = old
      ? Math.hypot((hit.uv.x - old.u) * field.spec.width, (hit.uv.y - old.v) * field.spec.height)
      : 0;
  const steps = interpolate ? Math.min(100, Math.max(1, Math.ceil(distance / (radius * 0.23)))) : 1;
  let removed = 0;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps,
      u = old ? old.u + (hit.uv.x - old.u) * t : hit.uv.x,
      v = old ? old.v + (hit.uv.y - old.v) * t : hit.uv.y;
    removed += field.scrub(u, v, radius, Math.max(dt, interpolate ? 1 / 60 : 0));
  }
  lastHit = { field, u: hit.uv.x, v: hit.uv.y };
  audio.setScrub(true, field.spec.material || field.spec.id, distance * 10);
  if (removed) {
    state.strokes++;
    if (field.done) {
      audio.play('clean', field.spec.id);
      notify(`${field.spec.name}，干净了。`);
      view.focus =
        state.surfaces.find((s) => !s.done)?.spec.id || level.surfaces[0]?.id || 'overview';
      stopPointer(false);
      persist();
    }
  }
  switchStage();
}
function stopPointer(cancel = true) {
  if (pointerId !== null) {
    try {
      $('world').releasePointerCapture(pointerId);
    } catch {}
  }
  pointerId = null;
  lastHit = null;
  view?.positionTool(null, false);
  audio.setScrub(false);
  if (cancel) physics?.cancel();
}
function stopPour() {
  const id = pourPointer;
  pourPointer = null;
  pouring = false;
  if (id !== null && id !== 'keyboard') {
    try {
      $('pour-button').releasePointerCapture(id);
    } catch {}
  }
  audio.setWater(false);
}
function stopInteractions() {
  actions.stop();
  stopPointer();
  stopPour();
}
function moveItem(x, y) {
  if (!physics.held) return;
  const item = level.items.find((i) => i.id === physics.held),
    height = item.dragHeight ?? (item.id === 'filter' ? 1.25 : 0.65);
  let target = view.planePoint(x, y, height),
    nearest = innerWidth < 700 ? 42 : 38,
    dropTarget = null;
  for (const other of level.items) {
    if (state.placed.has(other.id)) continue;
    const slot = screen(view.slots.get(other.id).position.toArray()),
      d = Math.hypot(x - slot.x, y - slot.y);
    if (d < nearest) {
      dropTarget = other.id;
      nearest = d;
    }
  }
  if (dropTarget === item.id && canPlaceItem(state, item.id))
    target = { x: item.slot[0], y: height, z: item.slot[2] };
  physics.move(target, dropTarget);
}
function sweepTo(x, y) {
  const previous = point;
  point = { x, y };
  const samples = Math.min(
    220,
    Math.max(1, Math.ceil(Math.hypot(x - previous.x, y - previous.y) / 9)),
  );
  for (let i = 1; i <= samples; i++) {
    if (pointerId === null || stage !== 'clean') break;
    const t = i / samples;
    scrubAt(previous.x + (x - previous.x) * t, previous.y + (y - previous.y) * t, 1 / 60, false);
  }
}
$('world').addEventListener('pointerdown', (event) => {
  if (
    loading ||
    !started ||
    paused ||
    pointerId !== null ||
    before ||
    !['clean', 'tidy'].includes(stage)
  )
    return;
  event.preventDefault();
  pointerId = event.pointerId;
  point = { x: event.clientX, y: event.clientY };
  $('world').setPointerCapture(pointerId);
  if (stage === 'clean') scrubAt(point.x, point.y, 0.03);
  else {
    let id = view.hitItem(point.x, point.y)?.object.userData.itemId;
    if (!id) {
      let nearest = innerWidth < 700 ? 36 : 23;
      for (const item of level.items) {
        if (state.placed.has(item.id)) continue;
        const p = physics.bodies.get(item.id).translation(),
          pos = screen([p.x, p.y, p.z]),
          d = Math.hypot(pos.x - point.x, pos.y - point.y);
        if (d < nearest) {
          id = item.id;
          nearest = d;
        }
      }
    }
    if (id && physics.pick(id)) {
      audio.play('pick', id);
      moveItem(point.x, point.y);
    }
  }
});
$('world').addEventListener('pointermove', (event) => {
  if (event.pointerId !== pointerId) return;
  if (stage === 'clean') sweepTo(event.clientX, event.clientY);
  else if (stage === 'tidy') {
    point = { x: event.clientX, y: event.clientY };
    moveItem(point.x, point.y);
  }
});
$('world').addEventListener('pointerup', (event) => {
  if (event.pointerId !== pointerId) return;
  if (stage === 'clean') sweepTo(event.clientX, event.clientY);
  else if (stage === 'tidy') {
    moveItem(event.clientX, event.clientY);
    const placed = physics.release();
    if (placed) notify(`${level.items.find((i) => i.id === placed).name}，归位。`);
  }
  stopPointer(false);
  persist();
  switchStage();
});
for (const name of ['pointercancel', 'lostpointercapture'])
  $('world').addEventListener(name, (event) => {
    if (event.pointerId === pointerId) {
      stopPointer();
      persist();
    }
  });
$('world').addEventListener('contextmenu', (event) => event.preventDefault());
async function start() {
  if (loading || shopPreview) return;
  await audio.unlock().catch(() => {});
  started = true;
  paused = false;
  $('intro').hidden = true;
  $('pause').hidden = false;
  $('hud').hidden = stage === 'done';
  $('finished').hidden = stage !== 'done';
  lastTime = performance.now();
  updateHud();
}
$('start').addEventListener('click', start);
function pause() {
  if (!started || paused || loading) return;
  paused = true;
  stopInteractions();
  persist();
  audio.stopEffects();
  audio.suspend();
  if (document.visibilityState === 'visible' && !$('pause-dialog').open && !$('level-dialog').open)
    $('pause-dialog').showModal();
  updateHud();
}
async function resume() {
  await audio.unlock().catch(() => {});
  $('pause-dialog').close();
  paused = false;
  lastTime = performance.now();
  accumulator = 0;
  updateHud();
}
$('pause').addEventListener('click', pause);
$('resume').addEventListener('click', resume);
$('pause-dialog').addEventListener('cancel', (event) => {
  event.preventDefault();
  resume();
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    if (started) pause();
    else audio.suspend().catch(() => {});
  }
  else if (shopPreview && !paused) audio.unlock().catch(() => {});
  else if (started && paused && !$('pause-dialog').open && !$('level-dialog').open)
    $('pause-dialog').showModal();
});
window.addEventListener('blur', () => {
  stopInteractions();
  persist();
});
window.addEventListener('pagehide', () => {
  stopInteractions();
  persist();
  audio.suspend();
});
window.addEventListener('keydown', (event) => {
  if (event.code === 'Escape' && !$('level-dialog').open) pause();
});
function updateAudioControls() {
  document.querySelector('#intro .quiet-note').textContent = audio.enabled && audio.musicEnabled
    ? '没有倒计时。点击开始，让音乐轻轻陪着你。'
    : '没有倒计时。随时停下，下次继续。';
  $('sound').setAttribute('aria-label', audio.enabled ? '关闭声音' : '开启声音');
  $('sound').setAttribute('aria-pressed', String(audio.enabled));
  $('sound').style.opacity = audio.enabled ? '1' : '.5';
  $('music').setAttribute('aria-label', audio.musicEnabled ? '关闭背景音乐' : '开启背景音乐');
  $('music').setAttribute('aria-pressed', String(audio.musicEnabled));
  $('music').title = audio.musicEnabled ? (audio.enabled ? '背景音乐已开启' : '音乐已开启，总声音已关闭') : '背景音乐已关闭，保留操作音效';
  $('music').style.opacity = audio.musicEnabled && audio.enabled ? '1' : '.5';
}
$('sound').addEventListener('click', async () => {
  await audio.unlock().catch(() => {});
  audio.setEnabled(!audio.enabled);
  saveAudioPreferences(storage, audio);
  updateAudioControls();
});
$('music').addEventListener('click', async () => {
  await audio.unlock().catch(() => {});
  audio.setMusicEnabled(!audio.musicEnabled);
  saveAudioPreferences(storage, audio);
  updateAudioControls();
  if (started) notify(audio.musicEnabled ? (audio.enabled ? '让音乐，轻轻陪着你。' : '音乐已开启，点扬声器可以打开声音。') : '音乐已关闭，留下擦洗和流水的声音。');
});
updateAudioControls();
$('view').addEventListener('click', () => {
  if (loading) return;
  stopInteractions();
  view.nextView();
});
$('recover-loose').addEventListener('click', () => {
  if (!started || paused || stage !== 'tidy') return;
  stopPointer();
  physics.recoverUnplaced();
  notify('未归位器具已放回台面。');
  persist();
  updateHud();
});
$('restart').addEventListener('click', () => loadLevel(level, { reset: true, play: true }));
$('again').addEventListener('click', () => loadLevel(level, { reset: true, play: true }));
$('brew').addEventListener('click', () => {
  if (!started || paused || !beginFinale(state)) return;
  audio.play('switch', level.id);
  switchStage();
});
$('speed').addEventListener('input', (event) => {
  if (!started || paused || !setOperationValue(state, Number(event.target.value))) return;
  switchStage();
  updateHud();
});
$('speed').addEventListener('change', persist);
$('pour-button').addEventListener('pointerdown', (event) => {
  if (!started || paused || stage !== 'operate' || pourPointer !== null) return;
  event.preventDefault();
  pourPointer = event.pointerId;
  pouring = true;
  $('pour-button').setPointerCapture(pourPointer);
});
for (const name of ['pointerup', 'pointercancel', 'lostpointercapture'])
  $('pour-button').addEventListener(name, (event) => {
    if (event.pointerId !== pourPointer) return;
    stopPour();
    persist();
  });
$('pour-button').addEventListener('keydown', (event) => {
  if (!['Space', 'Enter'].includes(event.code) || !started || paused || stage !== 'operate') return;
  event.preventDefault();
  pourPointer = 'keyboard';
  pouring = true;
});
$('pour-button').addEventListener('keyup', (event) => {
  if (['Space', 'Enter'].includes(event.code)) {
    stopPour();
    persist();
  }
});
$('pour-button').addEventListener('blur', () => {
  stopPour();
  persist();
});
$('compare').addEventListener('click', () => {
  before = !before;
  $('compare').textContent = before ? '回到整理后' : '看看整理前';
  $('compare').setAttribute('aria-pressed', String(before));
  $('comparison-label').hidden = !before;
  document.body.dataset.comparison = before ? 'before' : 'after';
  audio.stopEffects();
});
$('next-level').addEventListener('click', () =>
  seasonState.finished ? showShop() : loadLevel(nextSuggestion()),
);
$('finished-shop').addEventListener('click', () => showShop());
$('gallery-shop').addEventListener('click', () => showShop(gallerySeason));
$('shop-gallery').addEventListener('click', openGallery);
$('begin-opening').addEventListener('click', () => {
  if (seasonState.canOpen)
    loadLevel(getLevel(activeSeason.openingId), { reset: seasonState.finished, play: true });
});
$('inspect').addEventListener('click', () => {
  if (!view || loading) return;
  stopInteractions();
  const close = view.toggleInspection();
  $('inspect').setAttribute('aria-pressed', String(close));
  $('inspect').setAttribute('aria-label', close ? '回到全景' : '凑近看看');
  notify(close ? '凑近一点。点击清单，可以找到对应部位。' : '回到全景。');
});
window.addEventListener('resize', () => view?.resize());
function artwork(id) {
  const seasonal = gardenArtwork(id) || seasonArtwork(id);
  if (seasonal) return seasonal;
  const art = {
    coffee:
      '<rect x="63" y="21" width="96" height="92" rx="14" fill="var(--card-color)"/><rect x="57" y="105" width="113" height="12" rx="4" fill="#63746a"/><circle cx="93" cy="47" r="14" fill="#ece7d4" stroke="#9b8a67" stroke-width="3"/><path d="M93 47l6-7" stroke="#6e7667" stroke-width="2"/><rect x="79" y="68" width="25" height="7" rx="3" fill="#435c50"/><path d="M86 79h24v19q-12 9-24 0z" fill="#f5edda"/><path d="M110 83q14 0 8 11h-8" fill="none" stroke="#f5edda" stroke-width="4"/><rect x="137" y="67" width="6" height="28" rx="3" fill="#d0c4a7"/>',
    desk: '<rect x="48" y="34" width="109" height="86" rx="4" fill="#c7ae88"/><rect x="56" y="42" width="93" height="70" fill="#e3d7bf"/><rect x="65" y="52" width="21" height="60" rx="3" fill="#748e98"/><rect x="89" y="48" width="21" height="64" rx="3" fill="#ba976b"/><rect x="113" y="50" width="21" height="62" rx="3" fill="#94a18b"/><path d="M70 85q30-21 59 0" fill="none" stroke="#f1e6c8" stroke-width="2"/><path d="M184 116l6-43-19-36" fill="none" stroke="#9f8963" stroke-width="4"/><path d="M151 48l9-21h23l13 21z" fill="var(--card-color)"/><ellipse cx="184" cy="118" rx="22" ry="5" fill="var(--card-color)"/>',
    tea: '<rect x="41" y="72" width="169" height="51" rx="8" fill="#ad8d59"/><path d="M52 86h146M52 96h146M52 106h146" stroke="#8f724e" stroke-width="2"/><path d="M99 64h50q-2 34-25 34T99 64" fill="#a4bfac"/><ellipse cx="124" cy="64" rx="25" ry="9" fill="#d5dfca"/><ellipse cx="124" cy="65" rx="18" ry="5" fill="#bc995c"/><path d="M61 87h23q-2 17-12 17T61 87M164 87h23q-2 17-12 17T164 87" fill="#eee6cc"/><path d="M177 52q-15-19-5-29" fill="none" stroke="#cbd1bd" stroke-width="3"/>',
    record:
      '<rect x="40" y="45" width="173" height="80" rx="7" fill="#ab7e59"/><rect x="44" y="42" width="165" height="70" rx="6" fill="#c9cbba"/><ellipse cx="103" cy="77" rx="48" ry="31" fill="#293c31"/><ellipse cx="103" cy="77" rx="40" ry="25" fill="none" stroke="#5d7160"/><ellipse cx="103" cy="77" rx="17" ry="12" fill="#b48764"/><circle cx="103" cy="77" r="3" fill="#e4d5b8"/><path d="M181 53v31l-35 11" fill="none" stroke="#728276" stroke-width="5"/><rect x="136" y="90" width="18" height="10" rx="2" fill="#c09c73"/><circle cx="183" cy="100" r="5" fill="#728276"/>',
  };
  return `<svg viewBox="0 0 250 150" aria-hidden="true"><ellipse cx="128" cy="127" rx="97" ry="9" fill="#394e3d" opacity=".08"/>${art[id]}</svg>`;
}
function openGallery() {
  if (loading || $('level-dialog').open) return;
  galleryWasPaused = paused;
  stopInteractions();
  persist();
  refreshSeason();
  rememberSeason(storage, activeSeason);
  paused = true;
  $('pause-dialog').close();
  audio.stopEffects();
  audio.suspend();
  renderGallery(activeSeason);
  $('level-dialog').showModal();
  updateHud();
}
function renderGallery(season) {
  gallerySeason = season;
  document.querySelector('#level-dialog .eyebrow').textContent = `${seasonLabel(season)} / 九处慢慢恢复的风景`;
  $('gallery-title').textContent = season.title;
  document.querySelector('#level-dialog .gallery-copy').textContent = season.story;
  $('gallery-shop').textContent = `看看我的${season.overviewName || '小店'} ↗`;
  $('season-tabs').replaceChildren();
  for (const entry of SEASONS) {
    const tab = document.createElement('button');
    tab.className = 'season-tab';
    tab.textContent = `${seasonLabel(entry)} · ${entry.title}`;
    tab.setAttribute('aria-pressed', String(entry.id === season.id));
    tab.addEventListener('click', () => renderGallery(entry));
    $('season-tabs').append(tab);
  }
  const statuses = collectionStatus(storage, gallerySeason);
  $('level-cards').replaceChildren();
  for (const chapter of gallerySeason.chapters) {
    const heading = document.createElement('div');
    heading.className = 'chapter-label';
    heading.innerHTML = `<span>第${chapter.number}章 · ${chapter.title}</span><small>${chapter.description}</small>`;
    $('level-cards').append(heading);
    for (const id of chapter.levelIds) {
      const status = statuses.find((status) => status.level.id === id);
      if (!status) continue;
      const item = status.level,
        card = document.createElement('button');
      card.className = 'level-card';
      card.classList.toggle('locked', !status.unlocked);
      card.dataset.level = item.id;
      card.style.setProperty('--card-color', item.color);
      const label = !status.unlocked
        ? '查看恢复进度'
        : status.completed
          ? '已焕新'
          : status.started
            ? '继续收拾'
            : status.restored
              ? '重新收拾'
              : '开始收拾';
      card.setAttribute('aria-label', `${item.name}，${label}`);
      const note = !status.unlocked
        ? `先收好 ${gallerySeason.restorationIds.length} 处`
        : status.completed
          ? '已完成 · 再看看'
          : status.started
            ? '接着上次收拾'
            : status.restored
              ? '收藏保留 · 重玩'
              : '开始收拾';
      card.innerHTML = `<div class="card-art">${artwork(item.id)}<span class="card-number">${item.number}</span>${status.restored ? '<span class="card-stamp">✓</span>' : ''}</div><div class="card-copy"><strong>${item.name}</strong><span>${item.tags}</span><small>${note}<b>↗</b></small></div>`;
      card.addEventListener('click', () =>
        item.id === gallerySeason.openingId && !status.unlocked ? showShop(gallerySeason) : loadLevel(item),
      );
      $('level-cards').append(card);
    }
  }
  $('gallery-count').textContent = `${seasonProgress(storage, gallerySeason).completedIds.size} / ${seasonLevelIds(gallerySeason).length} 已完成`;
}
async function closeGallery() {
  $('level-dialog').close();
  paused = galleryWasPaused;
  if (started) {
    if (paused) $('pause-dialog').showModal();
    else await audio.unlock().catch(() => {});
  } else if (shopPreview && !paused) await audio.unlock().catch(() => {});
  lastTime = performance.now();
  updateHud();
}
for (const id of ['choose-level', 'finished-gallery', 'pause-gallery'])
  $(id).addEventListener('click', openGallery);
$('close-gallery').addEventListener('click', closeGallery);
$('level-dialog').addEventListener('cancel', (event) => {
  event.preventDefault();
  closeGallery();
});
function frame(now) {
  try {
    const elapsed = Math.min(0.08, (now - (lastTime || now)) / 1000);
    lastTime = now;
    time += elapsed;
    if (!loading && view && physics) {
      const active = started && !paused && document.visibilityState === 'visible';
      if (active) {
        accumulator += elapsed;
        while (accumulator >= CONFIG.physicsStep) {
          physics.step();
          accumulator -= CONFIG.physicsStep;
        }
        for (const event of physics.events.splice(0)) {
          if (event.type === 'recover') {
            if (event.canceledDrag) stopPointer(false);
            if (!['manual', 'placement-hint'].includes(event.reason))
              notify(`${level.items.find((i) => i.id === event.id).name}已回到台面。`);
          } else if (event.type === 'placement-hint')
            notify(
              event.missing.length
                ? `先装好${level.items.find((i) => i.id === event.missing[0]).name}，再放这一件。`
                : level.items.find((i) => i.id === event.id).hint,
            );
          else audio.play(event.type, event.id, event.strength);
        }
        actions.tick(elapsed);
        if (pointerId !== null && stage === 'clean') scrubAt(point.x, point.y, elapsed, false);
        if (pouring) {
          advancePour(state, elapsed);
          if (operationReady(state)) {
            stopPour();
            beginFinale(state);
            switchStage();
          }
        }
        if (stage === 'brew' && advanceFinale(state, elapsed)) switchStage();
        if (
          (pointerId !== null || actions.actionId || pouring || stage === 'brew') &&
          time - lastSave > 1
        ) {
          persist();
          lastSave = time;
        }
        frameTimes.push(elapsed * 1000);
        if (frameTimes.length > 600) frameTimes.shift();
      }
      const audible = (active || (shopPreview && !paused && !document.hidden)) && !before;
      audio.setSceneSound(
        level.id,
        audible ? (shopPreview ? 'overview' : stage) : 'idle',
        state.operationValue,
        state.brewTime,
        active && pouring,
        active ? actions.actionId : null,
        shopPreview
          ? {
              'opening-lamp': Number(seasonState.restoredIds.has('desk')),
              'opening-music': Number(seasonState.restoredIds.has('record')),
              'opening-coffee': Number(seasonState.restoredIds.has('coffee')),
            }
          : state.taskValues,
        { musicTheme: activeSeason.id, garden: level.sceneFamily === 'garden', actionSound: tasksFor(level).find(task => task.id === actions.actionId)?.sound, waterTask: level.ambientWaterTask },
      );
      view.positionTool(
        view.hit,
        active && ((pointerId !== null && stage === 'clean') || !!actions.painting),
        actions.painting ? 'paint' : 'sponge',
      );
      view.render(paused ? 0 : elapsed, time, physics, {
        stage: shopPreview ? 'overview' : started ? stage : 'intro',
        before,
        held: physics.held,
        pouring: active && pouring,
        actionId: active ? actions.actionId : null,
        activeTaskId: actions.activeId,
        guideEnabled: active,
        scrubbing: pointerId !== null && stage === 'clean',
      });
      audio.update();
      if (time - lastHud > 0.1) {
        lastHud = time;
        updateHud();
      }
    }
    requestAnimationFrame(frame);
  } catch (cause) {
    failure(cause);
  }
}
const routeSeason = params.has('season') ? getSeason(params.get('season')) : null;
const initialLevel = params.has('level') ? getLevel(params.get('level')) : routeSeason ? getLevel(seasonLevelIds(routeSeason)[0]) : selectedLevel(storage);
const firstVisit = storage.getItem(seasonSaveKey(seasonForLevel(initialLevel))) === null && !params.has('level') && !params.has('season');
await loadLevel(initialLevel);
if (!loading && view) {
  requestAnimationFrame(frame);
  if (firstVisit) openGallery();
}
