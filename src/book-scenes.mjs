import { buildBookEnvironment } from './book-environment.mjs';
import { BOOK_EARLY_LEVELS } from './book-early-levels.mjs';
import { BOOK_MIDDLE_LEVELS } from './book-middle-levels.mjs';
import { buildBookEarlyScene } from './book-early-scenes.mjs';
import { buildBookMiddleScene } from './book-middle-scenes.mjs';
import { buildBookFinaleScene } from './book-finale-scenes.mjs';
const builders = new Map([
  ...BOOK_EARLY_LEVELS.map(level => [level.id, buildBookEarlyScene]),
  ...BOOK_MIDDLE_LEVELS.map(level => [level.id, buildBookMiddleScene]),
]);
export function buildBookScene(view) {
  const environment = buildBookEnvironment(view);
  const scene = (builders.get(view.level.id) || buildBookFinaleScene)(view);
  return {
    update(...args) { environment.update?.(...args); scene?.update?.(...args); },
    dispose() { environment.dispose?.(); scene?.dispose?.(); },
  };
}
