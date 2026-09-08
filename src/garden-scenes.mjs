import { buildGardenEnvironment } from './garden-environment.mjs';
import { buildGardenEarlyScene } from './garden-early-scenes.mjs';
import { buildGardenMiddleScene } from './garden-middle-scenes.mjs';
import { buildGardenFinaleScene } from './garden-finale-scenes.mjs';

export function buildGardenScene(view) {
  const room = buildGardenEnvironment(view);
  const id = view.level.id;
  const scene = ['garden-pot','garden-tools','garden-seeds'].includes(id)
    ? buildGardenEarlyScene(view)
    : ['garden-shelf','garden-glass','garden-fountain'].includes(id)
      ? buildGardenMiddleScene(view)
      : buildGardenFinaleScene(view);
  return {
    update(...args) { room.update(...args); scene?.update?.(...args); },
    dispose() { room.dispose?.(); scene?.dispose?.(); },
  };
}
