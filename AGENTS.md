# 好好收拾 · Agent collaboration guide

## Product contract

The current product is a free, non-commercial game; third-party asset permissions still apply.

This is a standalone, mobile-friendly browser game about cleaning, organizing and restoring. Preserve the calm, tactile experience: no countdown, punishment, forced precision or monetization prompts. Each season has one coherent setting, three chapters and nine levels; completed work accumulates in a final overview. Season one is 街角旧店. Season two is 雨后花房, released in 0.4.0. The third season, 海边来信, is released in 0.5.0. Season four 山间小站 is released in 0.6.0. Each season has nine levels; verify current receipts before making release claims.

The user has approved fourth-season development and moving the game into this independent project. Continue authorized implementation without repeated confirmation. Product quality is judged by visible feedback and playable completion, not by engine names or screenshots alone.

## Structure and commands

- `src/`: ESM JavaScript game logic, level data, Three.js scenes, interaction and audio.
- `src/core.mjs`, `task-actions.mjs`: deterministic gameplay and completion rules.
- `src/progress.mjs`, `season.mjs`, `levels.mjs`: saves, seasons, routing and collection.
- `src/scene.mjs`, `*-scenes.mjs`, `season-scene-kit.mjs`: rendering and scene resources.
- `tests/`: meaningful `node:test` checks for gameplay, migration and completion.
- `index.html`, `style.css`: responsive player UI.
- `docs/`: design decisions and architecture; `qa/`: versioned evidence and deployment receipts.
- `config/hosting.json`: public hosting coordinates and expected remote revision; never credentials.
- `landing/`: lightweight fixed entry with season selection and read-only resume routing.
- `config/catalog.json`: fixed entry prefix and current immutable game release.
- `scripts/`: build manifests, publishing and public verification.

Use Node 22 or newer. `npm ci`; `npm run dev`; `npm test`; `npm run build`; `npm run preview`. Override Vite's port with `-- --port <available-port>` for isolated QA. Run commands from this project root. No absolute workstation paths in reusable code.

## Implementation rules

Use small, descriptive `.mjs` modules and kebab-case filenames. Keep level content separate from shared rules. Parameterize season-specific labels and behavior; do not copy the application once per season. Preserve old level IDs and save keys. A new season gets its own permanent collection ledger. Chapter completion in seasons three and four returns the player to the shared seasonal overview; record seen chapter tours separately from earned completion, and retain visits across replay. A replay must not remove earned collection or unlocks; malformed saves must not grant completion.

3D upgrades must improve actions players can feel: inspect another side, fit a part, reveal a material, see a repaired object work. Keep single-finger cleaning easy; camera movement and cleaning must not compete for the same gesture. Provide visible focus/remaining-dirt guidance. Tasks and scene effects derive from saved game state. Returning after refresh must not skip or block completion.

Dispose Three.js geometries, materials, textures, DOM overlays and event listeners on scene changes. Do not add external image/audio assets without provenance and distribution rights. The user-approved default piano recording is 光落在窗台; keep its Salamander/Alexander Holm attribution and CC BY 3.0 license with builds. Preserve the reviewed recording rather than silently replacing it with newly generated music. Keep dependency versions locked. Avoid publishing debug fixtures, source saves or local runtime files.

## Verification and delivery

Run relevant deterministic tests, then the full existing suite and production build before promoting shared changes. For changed interactions, verify actual browser input and the route to completion; test a narrow phone viewport and report it separately from real hardware testing. Use a separate browser origin/port for fixtures, never overwrite player saves. Check season switching, reload/resume and collection isolation when those boundaries change.

Keep source tests, local browser evidence, generated build, public deployment and player acceptance separate. Publish game files only from verified manifests under a new version path using `node scripts/publish.mjs --hosting-receipt config/hosting.json --prefix <new-version-path>`. The user also authorized a fixed index at the catalog prefix: its `index.html` and hashed `assets/` are mutable and use separate landing build/deployment receipts; never overwrite game version directories. The game publish script updates the catalog and rebuilds/publishes the index after the game commit succeeds. If that final step fails, rerun only the landing build/publish. The final Pages commit is the hosting/landing tip, while the game receipt can refer to its parent. Verify both public manifests. Inspect remote changes if the expected head differs; never force-update history. Verify Pages deployment and `node scripts/verify-public.mjs` before claiming the online release works. Existing publication authorization applies to game updates; messages to others, purchases or unrelated account changes require explicit authorization.

Keep current player services running while developing on an isolated port. Stop only processes whose PID and working directory match task-owned runtime receipts. Do not commit temporary QA servers, dependencies, rollback archives or secrets. Use `codex/` for feature branches, concise Conventional Commit messages, and scope reviews to this game.
