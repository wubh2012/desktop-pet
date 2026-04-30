# Desktop Pet Three.js MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Windows-first Electron desktop pet MVP that loads `pet.glb` with Three.js and provides procedural idle, walk, click, and drag behavior.

**Architecture:** Use Electron for the transparent always-on-top desktop shell, Vite for the renderer, and Three.js for GLB rendering. Keep pet behavior in a testable `PetController` module so future skeletal animation can replace procedural transforms without rewriting the window layer.

**Tech Stack:** Electron, Vite, TypeScript, Three.js, Vitest, GLTFLoader.

---

## File Structure

- `package.json`: npm scripts and local dependencies.
- `electron.vite.config.ts`: Electron/Vite build entry configuration.
- `tsconfig.json`, `tsconfig.node.json`, `tsconfig.web.json`: TypeScript project settings.
- `src/main/index.ts`: Electron main process and `BrowserWindow` creation.
- `src/preload/index.ts`: minimal preload bridge.
- `src/renderer/index.html`: renderer HTML entry.
- `src/renderer/src/main.ts`: Three.js scene bootstrap and model loading.
- `src/renderer/src/pet/PetController.ts`: tested procedural pet state machine.
- `src/renderer/src/pet/PetController.test.ts`: Vitest tests for behavior.
- `src/renderer/src/pet/modelCapabilities.ts`: model capability detection helper.
- `src/renderer/src/pet/modelCapabilities.test.ts`: Vitest tests for capability detection.
- `src/renderer/src/styles.css`: transparent canvas and small development status styles.
- `public/assets/pet.glb`: local static copy of the current model.

## Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `electron.vite.config.ts`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `tsconfig.web.json`
- Create: `src/main/index.ts`
- Create: `src/preload/index.ts`
- Create: `src/renderer/index.html`

- [ ] **Step 1: Create npm metadata and scripts**

Use local dependencies only. Scripts must include `dev`, `build`, `test`, and `typecheck`.

- [ ] **Step 2: Create TypeScript and Electron Vite config**

Set main, preload, and renderer entries explicitly.

- [ ] **Step 3: Create minimal main/preload/renderer entries**

Main creates a transparent frameless always-on-top `BrowserWindow`; renderer initially shows a root node.

- [ ] **Step 4: Install dependencies**

Run: `npm install`

Expected: dependencies install without vulnerability or peer-dependency blockers that prevent development.

## Task 2: PetController TDD

**Files:**
- Create: `src/renderer/src/pet/PetController.test.ts`
- Create: `src/renderer/src/pet/PetController.ts`

- [ ] **Step 1: Write failing tests**

Test idle transform stability, clicked recovery, walk bounds, and finite numeric output.

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test -- PetController.test.ts`

Expected: test run fails because `PetController` does not exist yet.

- [ ] **Step 3: Implement minimal `PetController`**

Expose a class with `click()`, `setMode()`, and `update(deltaSeconds)` methods. Return a transform object containing position, rotation, and scale.

- [ ] **Step 4: Run tests and verify GREEN**

Run: `npm test -- PetController.test.ts`

Expected: all `PetController` tests pass.

## Task 3: Model Capability Helper TDD

**Files:**
- Create: `src/renderer/src/pet/modelCapabilities.test.ts`
- Create: `src/renderer/src/pet/modelCapabilities.ts`

- [ ] **Step 1: Write failing tests**

Test that an empty GLTF-like object reports no animation, skeleton, or morph targets; test that animation names and morph target dictionaries are detected.

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test -- modelCapabilities.test.ts`

Expected: test run fails because `modelCapabilities` does not exist yet.

- [ ] **Step 3: Implement minimal helper**

Expose `detectModelCapabilities(gltf)` returning `hasAnimations`, `hasSkeleton`, `hasMorphTargets`, and `animationNames`.

- [ ] **Step 4: Run tests and verify GREEN**

Run: `npm test -- modelCapabilities.test.ts`

Expected: all capability tests pass.

## Task 4: Three.js Renderer

**Files:**
- Create: `src/renderer/src/main.ts`
- Create: `src/renderer/src/styles.css`
- Modify: `src/renderer/index.html`
- Create: `public/assets/pet.glb`

- [ ] **Step 1: Copy model asset**

Copy root `pet.glb` to `public/assets/pet.glb`.

- [ ] **Step 2: Implement renderer bootstrap**

Create WebGL renderer with alpha, scene, perspective camera, lights, GLB loading, model normalization, raycast click handling, and animation loop.

- [ ] **Step 3: Apply transparent desktop styles**

Ensure `html`, `body`, and canvas backgrounds are transparent; development status text is compact and non-obstructive.

- [ ] **Step 4: Run typecheck**

Run: `npm run typecheck`

Expected: TypeScript reports no errors.

## Task 5: Electron Desktop Integration

**Files:**
- Modify: `src/main/index.ts`
- Modify: `src/preload/index.ts`
- Modify: `src/renderer/src/main.ts`
- Modify: `src/renderer/src/styles.css`

- [ ] **Step 1: Add window behavior**

Configure transparent, frameless, always-on-top, hidden menu, fixed initial size, and clean close behavior.

- [ ] **Step 2: Add drag region**

Use CSS `app-region: drag` for the desktop surface and `app-region: no-drag` for the canvas/status elements that need pointer handling.

- [ ] **Step 3: Add minimal preload API**

Expose platform information without exposing Node.js APIs.

- [ ] **Step 4: Build**

Run: `npm run build`

Expected: Electron main, preload, and renderer build successfully.

## Task 6: Verification

**Files:**
- No new files unless a build issue requires a focused fix.

- [ ] **Step 1: Run all automated checks**

Run: `npm test`

Expected: all Vitest tests pass.

Run: `npm run typecheck`

Expected: TypeScript reports no errors.

Run: `npm run build`

Expected: production build completes.

- [ ] **Step 2: Start the app for manual check**

Run: `npm run dev`

Expected: Electron opens a transparent desktop pet window; `pet.glb` loads; idle animation runs; clicking the pet triggers a bounce; closing the window ends the Electron process.

## Self-Review

- Spec coverage: project scaffold, transparent Electron shell, Three.js GLB rendering, procedural pet behaviors, drag behavior, errors, tests, and verification are represented.
- Placeholder scan: no `TODO`, `TBD`, or vague task placeholders remain.
- Type consistency: plan uses `PetController`, `detectModelCapabilities`, `position`, `rotation`, and `scale` consistently.
