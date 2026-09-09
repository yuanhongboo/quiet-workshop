# Architecture

`Pointer / keyboard → cleaning, physics placement, finishing tasks → saved state → scene and HUD`

`season.mjs` owns season metadata and the three-chapter catalog. `levels.mjs` keeps the original `LEVELS` export stable and exposes `ALL_LEVELS` for cross-season lookup. `progress.mjs` isolates permanent season ledgers and imports earned results from existing level saves. Each level retains a stable ID and v2 save key.

`scene.mjs` owns the renderer, camera, picking and resource lifetime. Each seasonal scene builder registers cleanable surfaces, movable items and task targets, then updates visible effects from the shared game state. Scene builders never award completion or write storage. The second season adds a shared greenhouse environment and explicit inspection angles.

`task-actions.mjs` owns task availability, dependencies and completion. `action-controller.mjs` translates player input into those actions. `audio.mjs` produces original procedural feedback and reads optional per-task sound metadata. `surface-guide.mjs` reads remaining dirt without changing progress.

No cloud accounts or progress synchronization are required. Browser origin owns the local saves; changing a URL path on the same origin preserves them, changing domain or port does not share them.

Build assets are generated into ignored `dist/`. `scripts/artifacts.mjs` writes the exact file/hash manifest and bundles dependency licenses. Publishing adds only a new immutable path to the configured existing Pages host; it does not publish this source repository or QA fixtures. Remote HEAD is checked before any write.

The stable landing is built separately from `landing/`, without Three.js or Rapier. It reads the same validated saves and permanent season ledgers, and chooses an unlocked resume route without writing player state. `config/catalog.json` owns the fixed prefix and release target. Landing publication can replace only the fixed index and its own hashed assets; the referenced game must already exist remotely. Game publication advances the immutable game first, then serially publishes the refreshed landing. Separate manifests and receipts preserve each evidence surface.

Background music lives in `music-score.mjs` (two original 32-bar scores) and `background-music.mjs` (shared synthesized sample cache and a bounded lookahead scheduler). `audio.mjs` attaches it lazily to the game master bus, synchronizes season/activity, and lowers music under tactile effects. `audio-preferences.mjs` saves independent master/music choices under a separate key. Stopping cancels scheduled voices; pausing preserves the musical position without replaying missed events. The landing page stays silent and does not import this audio engine.

The approved default soundtrack is the unchanged rendered `after-the-light.mp3`, referenced with a Vite-managed asset URL. `recorded-music.mjs` streams it through one HTMLAudioElement and one MediaElementAudioSourceNode, avoiding a whole-track AudioBuffer allocation. User gesture intent is set before requesting play; asynchronous completion cannot revive paused playback. Score synthesis remains available as composition history but is not mixed into the default recording. Game publication uploads MP3 bytes as a verified base64 Git blob; text assets retain UTF-8 tree content.

The third season uses the same inspection and input controllers with a shared seaside environment. `chapter-progress.mjs` validates completed chapters from the permanent season ledger and separately records already viewed chapter returns. It never grants completion. The first two chapter endings route through the cumulative post-office overview; the last level is the full reveal. Replay keeps both collection and chapter visits. Landing cards are generated from the same season catalog during build and at runtime.

Season four reuses the same chapter return protocol, with its own season and chapter IDs. Station scenery and object models remain separate from input and saves. Short task sound cues are chosen by `task.sound` and passed through the action controller only on a successful completion. Pointer and keyboard button gestures bind to their starting task/state, so finishing a hold cannot consume the following tap on release. Scene changes, cancellation and blur invalidate the old gesture without blocking a fresh activation.

Season five adds state-driven paper repair, rotating objects and original story projections. `book-environment.mjs` reads the overview's `ambientDimTask` to gently dim its captured light intensities, restoring baseline for the before comparison. The environment never writes player state. Landing cards and the newest-season shortcut both derive from the chronological season catalog at build time and runtime; the shortcut does not mutate saves.

Season six uses the same input and chapter protocol for bakery tools and soft dough. Geometry deformation, proofing size and crust color read saved task progress; none depend on a real-world timer or an irreversible baking failure. The final overview carries a loaf through the repaired oven and display. All earlier IDs and saved ledgers remain stable.
