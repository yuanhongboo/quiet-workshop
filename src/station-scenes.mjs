import { buildStationEnvironment } from './station-environment.mjs';
import { STATION_EARLY_LEVELS } from './station-early-levels.mjs';
import { STATION_MIDDLE_LEVELS } from './station-middle-levels.mjs';
import { buildStationEarlyScene } from './station-early-scenes.mjs';
import { buildStationMiddleScene } from './station-middle-scenes.mjs';
import { buildStationFinaleScene } from './station-finale-scenes.mjs';
const builders = new Map([
  ...STATION_EARLY_LEVELS.map(level => [level.id, buildStationEarlyScene]),
  ...STATION_MIDDLE_LEVELS.map(level => [level.id, buildStationMiddleScene]),
]);
export function buildStationScene(view) {
  const environment = buildStationEnvironment(view);
  const scene = (builders.get(view.level.id) || buildStationFinaleScene)(view);
  return {
    update(...args) { environment.update?.(...args); scene?.update?.(...args); },
    dispose() { environment.dispose?.(); scene?.dispose?.(); },
  };
}
