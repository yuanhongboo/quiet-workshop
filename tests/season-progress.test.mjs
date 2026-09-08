import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG, COFFEE, makeState, packState, unpackState, cleanProgress } from '../src/core.mjs';
import { LEVELS, DESK, TEA, RECORD, getLevel } from '../src/levels.mjs';
import { OPENING } from '../src/shop-level.mjs';
import { SEASON, seasonLevelIds } from '../src/season.mjs';
import {
  COLLECTION_KEY,
  levelSaveKey,
  readLevel,
  saveLevel,
  resetLevel,
  rememberLevel,
  selectedLevel,
  collectionStatus,
  seasonSaveKey,
  seasonProgress,
  recordRestoration,
  rememberSeason,
  levelUnlocked,
  suggestedLevel,
} from '../src/progress.mjs';

function storage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
    removeItem: (key) => values.delete(key),
  };
}
function finished(level) {
  const state = makeState(null, level);
  state.surfaces.forEach((field) => field.finish());
  level.items.forEach((item) => state.placed.add(item.id));
  if (level.operation.kind === 'pour' || level.operation.kind === 'dial')
    state.operationValue = level.operation.target;
  state.taskFields.forEach((field) => field.finish());
  for (const task of level.operation.tasks || []) state.taskValues[task.id] = task.target ?? 1;
  state.brewTime = level.operation.duration;
  state.completed = true;
  assert.ok(unpackState(packState(state), level), `${level.id} completed fixture is valid`);
  return state;
}
function legacyCoffee(state) {
  const saved = JSON.parse(packState(state));
  saved.version = 1;
  for (const key of [
    'levelId',
    'levelRevision',
    'brewTime',
    'operationValue',
    'taskValues',
    'taskSurfaces',
  ])
    delete saved[key];
  return JSON.stringify(saved);
}

test('the season contains nine unique levels in three chapters and gates only its final scene', () => {
  assert.equal(SEASON.chapters.length, 3);
  SEASON.chapters.forEach((chapter) => assert.equal(chapter.levelIds.length, 3));
  const ids = seasonLevelIds(SEASON);
  assert.equal(new Set(ids).size, 9);
  assert.deepEqual(
    ids,
    LEVELS.map((level) => level.id),
  );
  assert.equal(SEASON.restorationIds.length, 8);
  const store = storage();
  assert.equal(levelUnlocked(store, OPENING), false);
  for (const id of SEASON.restorationIds) assert.equal(levelUnlocked(store, getLevel(id)), true);
  assert.equal(collectionStatus(store).find((row) => row.level.id === 'opening').unlocked, false);
});

test('all four pre-season v2 saves load unchanged without task fields or a season ledger', () => {
  const store = storage();
  for (const level of [COFFEE, DESK, TEA, RECORD]) {
    const state = makeState(null, level);
    state.surfaces[1].finish();
    state.surfaces[0].scrub(0.2, 0.2, 0.18, 0.05);
    const raw = JSON.parse(packState(state));
    delete raw.taskValues;
    delete raw.taskSurfaces;
    assert.equal(raw.version, 2);
    store.setItem(levelSaveKey(level), JSON.stringify(raw));
    const restored = makeState(readLevel(store, level), level);
    assert.deepEqual(
      restored.surfaces.map((field) => [...field.mask]),
      state.surfaces.map((field) => [...field.mask]),
    );
    assert.equal(restored.surfaces[1].done, true);
    assert.equal(restored.completed, false);
    assert.equal(readLevel(store, getLevel(level.id)).levelId, level.id);
  }
  assert.equal(collectionStatus(store).filter((row) => row.started).length, 4);
  assert.equal(seasonProgress(store).completedIds.size, 0);
});

test('v1 coffee resumes partial and completed saves; v1 is never misread as a different workbench', () => {
  for (const complete of [false, true]) {
    const store = storage();
    const coffee = complete ? finished(COFFEE) : makeState(null, COFFEE);
    if (!complete) coffee.surfaces[0].finish();
    const raw = legacyCoffee(coffee);
    store.setItem(CONFIG.saveKey, raw);
    const restored = makeState(readLevel(store, COFFEE), COFFEE);
    assert.equal(restored.completed, complete);
    assert.equal(restored.brewTime, complete ? COFFEE.operation.duration : 0);
    assert.equal(restored.surfaces[0].done, true);
    for (const level of [DESK, TEA, RECORD]) assert.equal(unpackState(raw, level), null);
    saveLevel(store, restored);
    assert.equal(JSON.parse(store.getItem(levelSaveKey(COFFEE))).version, 2);
    assert.equal(
      store.getItem(CONFIG.saveKey),
      raw,
      'migration must leave the legacy record intact',
    );
  }
});

test('replay preserves imported completion stamps from legacy coffee and all pre-season workbenches', () => {
  for (const [version, level] of [
    [1, COFFEE],
    ...[COFFEE, DESK, TEA, RECORD].map((level) => [2, level]),
  ]) {
    const store = storage(),
      result = finished(level);
    store.setItem(
      version === 1 ? CONFIG.saveKey : levelSaveKey(level),
      version === 1 ? legacyCoffee(result) : packState(result),
    );
    assert.equal(seasonProgress(store).completedIds.has(level.id), true);
    assert.equal(resetLevel(store, level), true);
    assert.equal(readLevel(store, level).completed, false);
    assert.equal(cleanProgress(makeState(readLevel(store, level), level)), 0);
    assert.equal(
      seasonProgress(store).completedIds.has(level.id),
      true,
      `v${version} ${level.id} earned stamp disappeared on replay`,
    );
  }
});

test('a failed stamp migration does not erase the only completed result during replay', () => {
  const store = storage(),
    raw = packState(finished(DESK));
  store.setItem(levelSaveKey(DESK), raw);
  const quotaLimited = {
    getItem: store.getItem,
    setItem(key, value) {
      if (key === seasonSaveKey()) throw new Error('quota exceeded');
      store.setItem(key, value);
    },
  };
  assert.equal(resetLevel(quotaLimited, DESK), false);
  assert.equal(store.getItem(levelSaveKey(DESK)), raw);
  assert.equal(seasonProgress(store).completedIds.has('desk'), true);
});

test('saved season stamps persist through replay while the current attempt starts fresh', () => {
  const store = storage();
  saveLevel(store, finished(DESK));
  saveLevel(store, finished(TEA));
  const teaRaw = store.getItem(levelSaveKey(TEA));
  resetLevel(store, DESK);
  const rows = collectionStatus(store);
  assert.equal(rows.find((row) => row.level.id === 'desk').completed, false);
  assert.equal(rows.find((row) => row.level.id === 'desk').restored, true);
  assert.equal(rows.find((row) => row.level.id === 'desk').progress, 0);
  assert.equal(store.getItem(levelSaveKey(TEA)), teaRaw);
  assert.deepEqual([...seasonProgress(store).completedIds].sort(), ['desk', 'tea']);
});

test('only eight earned restorations unlock opening; partial work and selected routes never count', () => {
  const store = storage();
  rememberLevel(store, OPENING);
  assert.equal(selectedLevel(store).id, 'opening');
  assert.equal(levelUnlocked(store, OPENING), false);
  for (const [index, id] of SEASON.restorationIds.entries()) {
    const level = getLevel(id),
      partial = makeState(null, level);
    partial.surfaces.forEach((field) => field.finish());
    saveLevel(store, partial);
    assert.equal(levelUnlocked(store, OPENING), false);
    saveLevel(store, finished(level));
    assert.equal(seasonProgress(store).restoredIds.size, index + 1);
    assert.equal(levelUnlocked(store, OPENING), index === 7);
  }
  assert.equal(suggestedLevel(store, 'sign').id, 'opening');
  assert.equal(collectionStatus(store).find((row) => row.level.id === 'opening').unlocked, true);
  resetLevel(store, getLevel('sign'));
  assert.equal(
    levelUnlocked(store, OPENING),
    true,
    'replaying a restored corner must not relock the finale',
  );
  saveLevel(store, finished(OPENING));
  assert.equal(seasonProgress(store).finished, true);
  assert.equal(seasonProgress(store).completedIds.size, 9);
});

test('completion imports from every pre-season workbench and survives explicit ledger migration', () => {
  const store = storage();
  for (const level of [COFFEE, DESK, TEA, RECORD])
    store.setItem(levelSaveKey(level), packState(finished(level)));
  assert.equal(seasonProgress(store).completedIds.size, 4);
  assert.equal(rememberSeason(store), true);
  for (const level of [COFFEE, DESK, TEA, RECORD]) resetLevel(store, level);
  assert.equal(seasonProgress(store).completedIds.size, 4);
  assert.equal(seasonProgress(store).canOpen, false);
});

test('cross-level or damaged current saves never overwrite or resurrect coffee progress', () => {
  const store = storage(),
    legacy = legacyCoffee(finished(COFFEE));
  store.setItem(CONFIG.saveKey, legacy);
  store.setItem(levelSaveKey(COFFEE), '{not-json');
  assert.equal(
    readLevel(store, COFFEE),
    null,
    'a damaged current save must not silently revive a completed legacy game',
  );
  store.setItem(levelSaveKey(COFFEE), packState(finished(DESK)));
  assert.equal(readLevel(store, COFFEE), null);
  assert.equal(resetLevel(store, COFFEE), true);
  assert.equal(readLevel(store, COFFEE).completed, false);
  assert.equal(store.getItem(CONFIG.saveKey), legacy);
  store.setItem(COLLECTION_KEY, JSON.stringify({ selected: 'unknown-workbench' }));
  assert.equal(selectedLevel(store).id, 'coffee');
});

test('malformed season records and unavailable storage fall back without granting progress', () => {
  for (const raw of [
    '{',
    'null',
    JSON.stringify({ version: 99, completed: SEASON.restorationIds }),
    JSON.stringify({ version: 1, completed: 'coffee' }),
    ' '.repeat(10001),
  ]) {
    const store = storage();
    store.setItem(seasonSaveKey(), raw);
    assert.equal(seasonProgress(store).completedIds.size, 0);
    assert.equal(levelUnlocked(store, OPENING), false);
  }
  const store = storage();
  store.setItem(
    seasonSaveKey(),
    JSON.stringify({ version: 1, completed: ['coffee', 'coffee', 'alien', 123, null] }),
  );
  assert.deepEqual([...seasonProgress(store).completedIds], ['coffee']);
  assert.equal(recordRestoration(store, 'alien'), false);
  const unavailable = {
    getItem() {
      throw new Error('blocked');
    },
    setItem() {
      throw new Error('quota');
    },
  };
  assert.equal(readLevel(unavailable, COFFEE), null);
  assert.equal(saveLevel(unavailable, makeState(null, COFFEE)), false);
  assert.equal(rememberSeason(unavailable), false);
  assert.equal(seasonProgress(unavailable).canOpen, false);
});
