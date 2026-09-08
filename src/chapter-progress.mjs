import { seasonProgress } from './progress.mjs';
export const chapterVisitKey = (season) => `quiet-workshop:chapter-visits:${season.id}:1`;
export const returnChapters = (season) => season.chapterReturns ? season.chapters.slice(0, -1) : [];
export function seenChapters(storage, season) {
  try {
    const raw = storage.getItem(chapterVisitKey(season));
    if (!raw || raw.length > 4000) return new Set();
    const value = JSON.parse(raw), valid = returnChapters(season).map(chapter => chapter.id);
    if (value?.version !== 1 || !Array.isArray(value.seen)) return new Set();
    return new Set(value.seen.filter(id => valid.includes(id)));
  } catch { return new Set(); }
}
export function completedReturnChapter(storage, season, id, progress = seasonProgress(storage, season)) {
  return returnChapters(season).find(chapter => chapter.id === id && chapter.levelIds.every(levelId => progress.completedIds.has(levelId))) || null;
}
export function pendingChapterVisit(storage, season, progress = seasonProgress(storage, season)) {
  if (progress.finished) return null;
  const seen = seenChapters(storage, season);
  return returnChapters(season).find(chapter => !seen.has(chapter.id) && chapter.levelIds.every(id => progress.completedIds.has(id))) || null;
}
export function markChapterVisited(storage, season, id, progress = seasonProgress(storage, season)) {
  if (!completedReturnChapter(storage, season, id, progress)) return false;
  const seen = seenChapters(storage, season);
  if (seen.has(id)) return true;
  seen.add(id);
  try { storage.setItem(chapterVisitKey(season), JSON.stringify({version:1,seen:[...seen]})); return true; }
  catch { return false; }
}
