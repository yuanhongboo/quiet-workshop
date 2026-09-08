import { buildPostEnvironment } from './post-environment.mjs';
import { buildPostEarlyScene } from './post-early-scenes.mjs';
import { buildPostMiddleScene } from './post-middle-scenes.mjs';
import { buildPostFinaleScene } from './post-finale-scenes.mjs';
export function buildPostScene(view) {
  const environment=buildPostEnvironment(view),id=view.level.id;
  const scene=['post-box','post-sorter','post-stamp'].includes(id)?buildPostEarlyScene(view):['post-typewriter','post-parcel','post-radio'].includes(id)?buildPostMiddleScene(view):buildPostFinaleScene(view);
  return {update(...args){environment.update(...args);scene?.update?.(...args);},dispose(){environment.dispose?.();scene?.dispose?.();}};
}
