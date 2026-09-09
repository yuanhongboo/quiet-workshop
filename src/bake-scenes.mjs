import { buildBakeEnvironment } from './bake-environment.mjs';
import { BAKE_EARLY_LEVELS } from './bake-early-levels.mjs';
import { BAKE_MIDDLE_LEVELS } from './bake-middle-levels.mjs';
import { buildBakeEarlyScene } from './bake-early-scenes.mjs';
import { buildBakeMiddleScene } from './bake-middle-scenes.mjs';
import { buildBakeFinaleScene } from './bake-finale-scenes.mjs';
const builders = new Map([
  ...BAKE_EARLY_LEVELS.map(level => [level.id, buildBakeEarlyScene]),
  ...BAKE_MIDDLE_LEVELS.map(level => [level.id, buildBakeMiddleScene]),
]);
export function buildBakeScene(view) {
  const environment = buildBakeEnvironment(view);
  const scene = (builders.get(view.level.id) || buildBakeFinaleScene)(view);
  return {
    update(...args) { environment.update?.(...args); scene?.update?.(...args); },
    dispose() { environment.dispose?.(); scene?.dispose?.(); },
  };
}
