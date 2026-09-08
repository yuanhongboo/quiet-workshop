import { SEASON, seasonLevelIds, seasonForLevel } from './season.mjs';
import { CONFIG, COFFEE, makeState, packState, unpackState, cleanProgress } from './core.mjs';
import { ALL_LEVELS, getLevel } from './levels.mjs';
export const COLLECTION_KEY = 'quiet-workshop:collection:1';
export const levelSaveKey = (level) => `quiet-workshop:${level.id}:2`;
export function readLevel(storage, level) {
  try {
    const current = storage.getItem(levelSaveKey(level));
    if (current !== null) return unpackState(current, level);
    if (level.id === COFFEE.id) return unpackState(storage.getItem(CONFIG.saveKey), COFFEE);
  } catch {}
  return null;
}
export function saveLevel(storage, state) {
  try {
    storage.setItem(levelSaveKey(state.level), packState(state));
    if (state.completed) recordRestoration(storage, state.level.id, seasonForLevel(state.level));
    return true;
  } catch {
    return false;
  }
}
export function resetLevel(storage, level) {
  if (readLevel(storage, level)?.completed && !recordRestoration(storage, level.id, seasonForLevel(level))) return false;
  const fresh = makeState(null, level);
  // A fresh v2 record prevents replay from re-importing an old completed coffee save.
  return saveLevel(storage, fresh);
}
export function selectedLevel(storage) {
  try {
    return getLevel(JSON.parse(storage.getItem(COLLECTION_KEY))?.selected);
  } catch {
    return COFFEE;
  }
}
export function rememberLevel(storage, level) {
  try {
    storage.setItem(COLLECTION_KEY, JSON.stringify({ selected: level.id }));
  } catch {}
}
export function collectionStatus(storage, catalog = SEASON) {
  const season = seasonProgress(storage, catalog);
  return seasonLevelIds(catalog).map(getLevel).map((level) => {
    const saved = readLevel(storage, level),
      state = makeState(saved, level),
      progress = cleanProgress(state);
    return {
      level,
      completed: state.completed,
      restored: season.completedIds.has(level.id),
      unlocked: level.id !== catalog.openingId || season.canOpen,
      progress,
      placed: state.placed.size,
      started: !!saved && (progress > 0 || state.placed.size > 0),
    };
  });
}

export const seasonSaveKey = (season = SEASON) => `quiet-workshop:season:${season.id}:1`;
function recordedRestorations(storage, season = SEASON) {
  try {
    const raw = storage.getItem(seasonSaveKey(season));
    if (!raw || raw.length > 10000) return new Set();
    const saved = JSON.parse(raw),
      valid = seasonLevelIds(season);
    if (saved.version !== 1 || !Array.isArray(saved.completed)) return new Set();
    return new Set(saved.completed.filter((id) => valid.includes(id)));
  } catch {
    return new Set();
  }
}
export function seasonProgress(storage, season = SEASON) {
  const completedIds = recordedRestorations(storage, season);
  // Import earned results from existing v1/v2 workbench saves; replay never removes a stamp.
  for (const id of seasonLevelIds(season)) {
    const level = ALL_LEVELS.find((level) => level.id === id);
    if (level && readLevel(storage, level)?.completed) completedIds.add(id);
  }
  return {
    completedIds,
    restoredIds: new Set(season.restorationIds.filter((id) => completedIds.has(id))),
    canOpen: season.restorationIds.every((id) => completedIds.has(id)),
    finished: completedIds.has(season.openingId),
  };
}
export function recordRestoration(storage, id, season = SEASON) {
  if (!seasonLevelIds(season).includes(id)) return false;
  const progress = seasonProgress(storage, season);
  progress.completedIds.add(id);
  try {
    storage.setItem(
      seasonSaveKey(season),
      JSON.stringify({ version: 1, completed: [...progress.completedIds] }),
    );
    return true;
  } catch {
    return false;
  }
}
export function rememberSeason(storage, season = SEASON) {
  const progress = seasonProgress(storage, season);
  try {
    storage.setItem(
      seasonSaveKey(season),
      JSON.stringify({ version: 1, completed: [...progress.completedIds] }),
    );
    return true;
  } catch {
    return false;
  }
}
export function levelUnlocked(storage, level, season = seasonForLevel(level)) {
  return level.id !== season.openingId || seasonProgress(storage, season).canOpen;
}
export function suggestedLevel(storage, currentId, season = seasonForLevel(currentId)) {
  const ids = seasonLevelIds(season),
    progress = seasonProgress(storage, season),
    index = ids.indexOf(currentId);
  const rotated = [...ids.slice(index + 1), ...ids.slice(0, index + 1)];
  const next = rotated.find(
    (id) => !progress.completedIds.has(id) && (id !== season.openingId || progress.canOpen),
  );
  return ALL_LEVELS.find((level) => level.id === (next || season.openingId)) || ALL_LEVELS[0];
}
