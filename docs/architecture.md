# Architecture

`Pointer / keyboard → cleaning, physics placement, finishing tasks → saved state → scene and HUD`

`season.mjs` owns season metadata and the three-chapter catalog. `levels.mjs` keeps the original `LEVELS` export stable and exposes `ALL_LEVELS` for cross-season lookup. `progress.mjs` isolates permanent season ledgers and imports earned results from existing level saves. Each level retains a stable ID and v2 save key.

`scene.mjs` owns the renderer, camera, picking and resource lifetime. Each seasonal scene builder registers cleanable surfaces, movable items and task targets, then updates visible effects from the shared game state. Scene builders never award completion or write storage. The second season adds a shared greenhouse environment and explicit inspection angles.

`task-actions.mjs` owns task availability, dependencies and completion. `action-controller.mjs` translates player input into those actions. `audio.mjs` produces original procedural feedback and reads optional per-task sound metadata. `surface-guide.mjs` reads remaining dirt without changing progress.

No cloud accounts or progress synchronization are required. Browser origin owns the local saves; changing a URL path on the same origin preserves them, changing domain or port does not share them.

Build assets are generated into ignored `dist/`. `scripts/artifacts.mjs` writes the exact file/hash manifest and bundles dependency licenses. Publishing adds only a new immutable path to the configured existing Pages host; it does not publish this source repository or QA fixtures. Remote HEAD is checked before any write.

The stable landing is built separately from `landing/`, without Three.js or Rapier. It reads the same validated saves and permanent season ledgers, and chooses an unlocked resume route without writing player state. `config/catalog.json` owns the fixed prefix and release target. Landing publication can replace only the fixed index and its own hashed assets; the referenced game must already exist remotely. Game publication advances the immutable game first, then serially publishes the refreshed landing. Separate manifests and receipts preserve each evidence surface.
