# The Lab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the homepage into a walk through Tony Stark's lab. The arc reactor is a door that opens onto Evan's hologram portrait and his things (About), then the suits (Work), the trophy shelf (Experience), the workbench (Toolkit) and the office (Contact). Native scrolling drives one fixed 3D camera, and today's page stays as the fallback.

**Architecture:** One fixed, full-screen three.js canvas sits behind `main`. The HTML sections stay where they are and are restyled as see-through bands with HUD panels laid over the scene. A pure function maps the scroll position to a point on a camera spline with one stop per section. Each stop's 3D subject is framed into an HTML "frame" element (`data-lab-frame`), so layout stays in CSS. Clickable objects are real `<button>`s positioned over the 3D anchors each frame, and they open one shared `<dialog>` card. The Hall's suit code is split into a reusable stage. The standalone Hall keeps working for the fallback, and the lab hosts the same stage in its row of bays.

**Tech Stack:** Vanilla ES modules, three.js 0.170.0 through the existing import map (jsdelivr), CSS, `node:assert` for the pure maths, and the existing headless-Chrome browser suite (`tests/checks.js`, `tests/run.js`, `tests/ci.mjs`). Swift with Apple Vision does the one-off portrait cutout, and `cwebp` encodes it.

**Spec:** `docs/superpowers/specs/2026-11-03-tony-stark-lab-design.md`

## Global Constraints

- three.js stays at **0.170.0**, loaded only through the import map in `index.html`. No new runtime dependency, framework or bundler.
- Lab mode applies only when the browser supports modules and WebGL2, and `prefers-reduced-motion` is not `reduce`. Otherwise the visitor gets today's page, including the standalone Hall.
- Native scrolling only. No `preventDefault` on wheel or touch, no scroll-jacking, no smooth-scroll libraries.
- No skip control. The nav stays on top at every stop.
- No `backdrop-filter` anywhere (the `removed` check fails on it). HUD panels use an opaque-enough fill instead.
- Every interactive object is a `<button>` with a text name, at least 44 × 44 px, reachable by Tab, opened with Enter and closed with Escape, and focus returns to it.
- Card copy is exactly the approved drafts in the spec ("Approved card drafts"). Don't change or add claims.
- Phones (`(pointer: coarse)` or width < 720): DPR capped at 1.5, no bloom, no real-time shadows anywhere.
- Rendering pauses when the tab is hidden.
- Palette: one arc-blue hue (`--h: 205`, scene hue 196 as in the Hall), near-black ramp, warm wood only in the bar and the office. Fonts unchanged.
- The footer keeps the Sketchfab suit credits, and every new third-party asset adds its credit there.
- Before any commit: `npm run check`. Before calling any behaviour or layout task done: `npm run check:browser`, read the summary and every "failed requests" line. Never `--no-verify`.
- Commits are small, one per step marked Commit. No `Co-Authored-By` or any other credit line in commit messages. Work on branch `feat/lab`.
- Art bar (Evan's first priority): before a stop's task is done, screenshot it at 1440 × 800 and 393 × 852 and judge it as a film still. There should be one lit subject, depth behind it, and nothing floating without a reason. Fix it before moving on.

## Review Focus

1. **The page can't scroll far enough to reach the last stop** (Contact plus footer shorter than the viewport). The camera must still arrive in the office at maximum scroll. Pinned in Task 1 (`railPosition` "last stop reachable") and Task 2 (`labRail` at max scroll).
2. **The viewport height changes mid-scroll** (a phone's address bar, a rotation, a window resize). The camera must not jump to a different stop. Pinned in Task 2 (`labResize`).
3. **Arriving by a hash** (`#toolkit`, `#work-watchpartyyy`, which skip the gate). The first frame must show the door open and the camera at that stop, with no fly-through from the door. Pinned in Task 3 (`labDoor` on `/#toolkit`).
4. **The WebGL context is lost** (a phone backgrounds the tab, or the GPU resets). The page must drop to the plain fallback with its content readable, not a black screen. Pinned in Task 2 (`labLost`).
5. **three.js fails to load from the CDN.** Within the failsafe the page must be the plain fallback, and the Work cards must be visible. Pinned in Task 2 (the `ci.mjs` fallback run with the CDN blocked).

---

## File structure

| File | Responsibility |
| --- | --- |
| `js/lab/rail.js` | Pure maths, no imports: scroll position to camera-rail position, hold-and-travel easing, damping. Runs in node. |
| `js/lab.js` | Page side. Decides lab mode, mounts the canvas, measures sections, feeds the rail, tracks the stop and bay, handles pause, context loss and failure. Exports `initLab`, `getLab`. |
| `js/lab/scene.js` | Renderer, scene, camera, composer, spline rails, framing into `data-lab-frame` rects, the render loop and projection. Exports `createLab`. |
| `js/lab/materials.js` | The one material language (brushed metal, dark lacquer, warm wood, rubber, fabric, holo emissive) and its canvas-drawn textures. |
| `js/lab/room.js` | Architecture: lab floor, walls, ceiling light strips, iris door, glass bays, shelf wall, bench bay, office room. |
| `js/lab/props.js` | The procedural low-poly props, each a `THREE.Group` with `userData.anchor`. |
| `js/lab/hologram.js` | The portrait hologram mesh and shader. |
| `js/hall-stage.js` | Split out of `hall-scene.js`: model and badge loading, repaint, the four-pass suit stage on a caller's renderer. |
| `js/hall-scene.js` | Keeps `createHall(canvas)` for the standalone Hall, now a thin wrapper over `hall-stage.js`. |
| `js/lab/suits.js` | The row of seven bays: cheap lit suits, plus the focused suit on the full stage. |
| `js/lab/spots.js` | Hotspot buttons over 3D anchors, and the shared card `<dialog>`. |
| `js/lab/stops.js` | What stands at each stop (About, shelf, bench, office) and its spots, built from the page's HTML. |
| `css/lab.css` | Every lab-mode rule, all under `:root.lab`: fixed canvas, see-through bands, HUD panels, frames, door hand-off, spots, cards. |
| `tools/cutout.swift` | One-off: Apple Vision foreground mask. `img/evan.jpg` → a PNG with alpha. |
| `img/evan-holo.webp` | The cut-out portrait (alpha), about 1000 px tall, at most 160 KB. |
| `tests/lab-unit.mjs` | node:assert tests for `js/lab/rail.js`. |
| `tests/checks.js`, `tests/run.js`, `tests/ci.mjs` | New lab checks, the fallback runs, and updates to the checks the lab changes. |

---

### Task 0: Spike (throwaway): can a phone carry the lab?

The spike answers the spec's biggest open risk before anything is built: seven suits, the rail, the door and bloom in one scene, measured.

**Files:**
- Create: `spike/lab.html`, `spike/lab.js` (throwaway; add `spike` to `.gitignore`, never commit these)
- Modify: `docs/superpowers/specs/2026-11-03-tony-stark-lab-design.md` (append a section, "Spike results")

**Interfaces:**
- Consumes: `models/hall/*.glb` and the `MODELS` and `SUITS` tables in `js/hall-scene.js` and `js/hall.js` (copy them; don't import).
- Produces: numbers and a decision for Tasks 2 and 5, recorded in the spec: the phone tier's DPR, whether bloom ships on desktop, and **seven live suits or impostors**.

- [ ] **Step 1: Commit the approved spec, `.gitignore` and this plan** on a new branch `feat/lab`:

```bash
git switch -c feat/lab
git add .gitignore docs/superpowers/specs/2026-11-03-tony-stark-lab-design.md
git commit -m "docs(lab): the approved design for the lab walk-through"
git add docs/superpowers/plans/2026-11-03-tony-stark-lab.md
git commit -m "docs(lab): the build plan"
```

- [ ] **Step 2: Build the spike.** It has:
  - a dark box room 40 m long;
  - a CatmullRom camera rail driven by `scrollY` over a 600 vh page;
  - an 8-blade iris door at the start;
  - seven suits in a row 2.4 m apart, each in the full lit material from `hall-scene.js` (`repainted`, badge skipped);
  - bloom on a toggle;
  - an overlay printing fps (p50 and p95 over 5 s), `renderer.info.render.calls`, `.triangles`, `renderer.info.memory`, and the transfer size of `performance.getEntriesByType('resource')`.
- [ ] **Step 3: Measure on the desktop profile and the phone profile.** Serve with `python3 -I -m http.server 8140 --bind 127.0.0.1` from the repo root. Use the Chrome DevTools MCP for:
  - Desktop: 1440 × 800, DPR 2.
  - Phone: `emulate` 393 × 852, DPR 3 capped to 1.5 in code, 4× CPU throttle.

  For each, scroll the full rail twice and record p50 and p95 frame time, draw calls, triangles, geometries, textures and total MB transferred.
- [ ] **Step 4: Decide with these rules, and write them into the spec's "Spike results":**
  - Phone p95 ≤ 33 ms with seven live suits: keep seven live suits.
  - Otherwise, the focused suit and its two neighbours stay live, and the other four become impostors. An impostor is a suit rendered once to a 512 px `RenderTarget` and shown on a camera-facing plane.
  - Desktop p95 ≤ 16.7 ms with bloom: keep bloom on desktop. Otherwise bloom goes, and the art compensates with emissive strips.
  - Total lab transfer must stay ≤ 4.5 MB (three.js, models, portrait). If it's over, list what to cut.
- [ ] **Step 5: Real phone.** Ask Evan to open the spike on his phone. Get the address from `ipconfig getifaddr en0` and serve with `--bind 0.0.0.0` only for this step, then stop that server. Ask him to report whether scrolling feels smooth on iOS Safari and whether the address bar showing and hiding jolts the camera. Record his answer.
- [ ] **Step 6: Commit the results:**

```bash
git add docs/superpowers/specs/2026-11-03-tony-stark-lab-design.md .gitignore
git commit -m "docs(lab): spike results and the suit budget they set"
```

---

### Task 1: The rail maths

**Files:**
- Create: `js/lab/rail.js`, `tests/lab-unit.mjs`
- Modify: `package.json` (the `check` script)

**Interfaces:**
- Produces:
  - `railPosition(scrollY: number, vh: number, stops: {top: number, height: number}[], options: {maxScroll: number, row?: {stop: number, count: number}}) → {u: number, stop: number, bay: number}`
    - `u` is the camera-curve parameter in `[0, stops.length - 1 + (row ? 1 : 0)]`. The row stop takes two curve points: its first bay and its last bay.
    - `stop` is the index of the section the camera is at or nearest.
    - `bay` is `0..count-1` (fractional while travelling) while inside the row stop's hold, else `-1`.
  - `holds(p: number, n: number, hold = 0.55) → number`: maps `p ∈ [0,1]` to `[0, n-1]`, resting at each integer for `hold` of its share and easing between with smootherstep.
  - `damp(current: number, target: number, rate: number, dt: number) → number`: `current + (target - current) * (1 - exp(-rate * dt))`.

Definitions, so the tests have one reading:
- Section k is held while `scrollY ∈ [top_k, max(top_k, top_k + height_k - vh)]`.
- It travels to k+1 from the end of that hold to `top_{k+1}`, eased with smootherstep.
- If `maxScroll < top_last`, the last travel is rescaled to end at `maxScroll`.

- [ ] **Step 1: Write the failing tests** in `tests/lab-unit.mjs`, using `node:assert/strict` and importing `../js/lab/rail.js`. Use `vh = 800` and `stops = [{top:0,height:800},{top:800,height:1600},{top:2400,height:800},{top:3200,height:4000},{top:7200,height:1200},{top:8400,height:600}]`, `maxScroll = 8400 + 600 + 300 - 800`, `row = {stop: 3, count: 7}`:
  - `railPosition(0, …).u === 0` and `.stop === 0`.
  - At `scrollY 400` (halfway through the first travel), `u === 0.5`.
  - At `scrollY 800` and `1600` (About held), `u === 1`. At `1200`, `u === 1`.
  - At `scrollY 3200` (Work hold starts), `u === 3`, `bay === 0`. At the end of the Work hold (`3200 + 4000 - 800`), `u === 4` and `bay === 6`.
  - Halfway through the Work hold, `bay` is within `1e-9` of `3` (an integer rest).
  - Outside Work, `bay === -1`.
  - **Last stop reachable:** `railPosition(maxScroll, …).u === 6` and `.stop === 5`, even though `maxScroll < 8400`.
  - Monotonic: sweeping `scrollY` from 0 to `maxScroll` in 1 px steps, `u` never decreases and never jumps more than `0.02` per px.
  - `holds(0,7) === 0`, `holds(1,7) === 6`, `holds(0.5,7) === 3`, and `holds` is non-decreasing.
  - `damp(0, 10, 5, 0) === 0`, and `damp(0, 10, 5, 1e3)` is within `1e-9` of 10.
- [ ] **Step 2: Run it and see it fail.** Run `node tests/lab-unit.mjs`. Expected: it fails with `Cannot find module …/js/lab/rail.js`.
- [ ] **Step 3: Implement `js/lab/rail.js`** to the signatures and definitions above. It's pure, with no imports and no DOM.
- [ ] **Step 4: Wire it into the check.** Change `package.json` `check` to:
  `for f in js/*.js js/lab/*.js tests/*.js tests/*.mjs; do node --check "$f" || exit 1; done && node tests/lab-unit.mjs`
  Then run `npm run check`. Expected: no errors, and the unit file prints `lab-unit: N passed`.
- [ ] **Step 5: Commit**

```bash
git add js/lab/rail.js tests/lab-unit.mjs package.json
git commit -m "feat(lab): map scroll to a camera rail with a stop per section"
```

---

### Task 2: The lab shell (canvas, room, rail, frames, fallbacks)

**Files:**
- Create: `js/lab.js`, `js/lab/scene.js`, `js/lab/materials.js`, `js/lab/room.js`, `css/lab.css`
- Modify:
  - `index.html`:
    - head inline script (line 51): add the `lab` class decision;
    - add `<link rel="stylesheet" href="css/lab.css">` after `css/hall.css`;
    - add one empty `<div class="lab-frame" data-lab-frame="<id>" aria-hidden="true"></div>` as the first child of each section, except the hero, whose frame is `.reactor` itself (give it `data-lab-frame="top"`).
  - `js/main.js`: import and call `initLab()` right after `initGate()`.
  - `tests/checks.js`, `tests/run.js`, `tests/ci.mjs`.

**Interfaces:**
- Consumes: `railPosition`, `damp` (Task 1). `whenActive` and the `portfolio:waking` event (js/gate.js).
- Produces:
  - `initLab(): void`. Lab mode is the `lab` class on `<html>`, which the head script sets before first paint when `'noModule' in HTMLScriptElement.prototype`, `!matchMedia('(prefers-reduced-motion: reduce)').matches`, and a throwaway canvas gives a `webgl2` context (released with `WEBGL_lose_context`). The head script also sets a failsafe: if `lab-ready` is not on `<html>` within 8000 ms, it removes `lab`.
  - `getLab(): Promise<Lab | null>`. It resolves `null` when not in lab mode or after a failure.
  - `Lab = { scene: LabScene, goToStop(id: string, {instant?: boolean}), goToBay(index: number, {instant?: boolean}), onBay(fn: (index: number) => void), onStop(fn: (id: string) => void) }`
  - `createLab(canvas: HTMLCanvasElement, {tier: 'desktop' | 'phone', stops: {id: string, frame: Element}[]}) → LabScene`
  - `LabScene = { THREE, scene, camera, renderer, room, materials, add(stopId, object3D), setRail({u, stop, bay}), project(object3D) → {x, y, onScreen}, lean(object3D | null), onFrame(fn: (dt) => void), start(), stop(), resize(width, height), dispose() }`
  - `room = { door: {open({instant}): Promise<void>, isOpen: boolean}, bays: THREE.Vector3[], marks: {about, shelf, bench, office}: THREE.Vector3 }`
  - Page state that tests read: `html.dataset.stop` (the current section id), `html.dataset.door` (`'closed'` or `'open'`), and the `lab-ready` class once the first frame has drawn.
  - `materials.js`: `createMaterials(THREE, tier) → {metal, lacquer, wood, rubber, fabric, glass, holo(intensity), strip(intensity)}`

Camera and framing decisions:
- `scene.js` keeps two `CatmullRomCurve3`s (eye and look) with seven points in section order: top (outside the door), about, experience, work (bay 0), work (bay 6), toolkit, contact (the office). `getPoint(u / 6)` lands exactly on each point because the points are spaced so the curve passes through them (use `curve.getPoint` with the knots at equal parameter, `curveType: 'centripetal'`).
- Each frame, the camera damps toward the curve point for `u` with rate 6.
- It frames each stop by `camera.setViewOffset`, so that the stop's look point projects to the centre of that stop's `data-lab-frame` rect. Between stops, the offset interpolates by the fractional part of `u`.
- Fog: `FogExp2` with the band colour `--grey-950`, density tuned per tier.
- Lights: one hemisphere, one key directional, and emissive light strips (no shadows).
- Desktop only: `EffectComposer` with `UnrealBloomPass` (strength 0.35, radius 0.4, threshold 0.9), if Task 0 kept it.

Layout decisions, in `css/lab.css`, all under `:root.lab`:
- `.lab__canvas`: `position: fixed; inset: 0; width: 100%; height: 100%; z-index: -1; pointer-events: none`.
- `main > section` and the footer lose their band fill: `background: none; border-image: none`.
- Each section's text sits in a HUD panel. On wide screens (≥ 1024 px) that's the left column (`max-width: 34rem`) with the frame filling the right; below that, the frame is a `60svh` window above the panel. Panel fill: `hsl(var(--h) 30% 6% / 0.86)`, a 1 px `hsl(var(--h) 60% 60% / 0.25)` edge, and no blur.
- Use `svh` and `lvh` units, never `vh`, for frame heights, so the address bar doesn't move layout.

Steps:

- [ ] **Step 1: Write the failing checks** in `tests/checks.js`, and register them in `tests/run.js`:
  - `lab(win)`:
    - If the frame has WebGL2 and no reduced motion: `html.lab` is set; there is exactly one `canvas.lab__canvas`, fixed, `aria-hidden="true"`, `pointer-events: none`, at the viewport's size; and `html.lab-ready` is set within 6 s.
    - Otherwise: no `lab` class and no canvas.
    - Add it to `ALL`.
  - `labRail(win)`:
    - For each id in `SECTIONS`, `getElementById(id).scrollIntoView({behavior: 'instant'})`, wait 300 ms, and expect `html.dataset.stop === id`.
    - Then `scrollTo(0, scrollHeight)`: expect `dataset.stop === 'contact'`.
    - Add it to `ALL`.
  - `labResize(win, frame)` (EXTRA at 393 × 852): scroll to `#work`, set `frame.height = '760'`, wait 400 ms, and expect `dataset.stop === 'work'`.
  - `labLost(win)` (EXTRA at 1440 × 800):
    - Get the `WEBGL_lose_context` extension from the lab canvas's context and call `loseContext()`.
    - Within 1500 ms, `html.lab` is gone, no `.lab__canvas` remains, and `#about .about__text` is visible.
  - In `tests/ci.mjs`, after the main run, add two fallback runs on fresh pages, each failing the run on a miss:
    - `reducedMotion: 'reduce'` (`browser.newContext({ reducedMotion: 'reduce' })`): expect no `html.lab` and a `.hall` or `.work__grid` visible.
    - `page.route('**/three.module.min.js', (r) => r.abort())`: wait 9 s and expect no `html.lab`, with `#work .work__grid` visible.
- [ ] **Step 2: Run them and see them fail.** Run `npm run check:browser`. Expected: `lab`, `labRail`, `labResize`, `labLost` and both `ci.mjs` fallbacks FAIL, and every pre-existing check still passes.
- [ ] **Step 3: Implement `js/lab/materials.js`, `js/lab/room.js` (shell only: floor, walls, light strips, the stop marks, empty bays), `js/lab/scene.js` and `js/lab.js`** to the interfaces above.
  - `js/lab.js` measures sections with a `ResizeObserver` on `main` and recomputes stops on each change, keeping the current stop. On scroll it calls `railPosition`, then `scene.setRail` (passive listener, one rAF per frame).
  - Stop changes go to `onStop` listeners and `html.dataset.stop`.
  - On `webglcontextlost`, a module-load failure or an exception in the first frame, it removes `lab` and `lab-ready`, removes the canvas, calls `dispose`, and resolves `getLab()` with `null`.
  - It starts the loop on `whenActive`, and stops and starts on `visibilitychange`.
- [ ] **Step 4: Write `css/lab.css`** per the layout decisions above, and add the `index.html` changes.
- [ ] **Step 5: Run `npm run check`.** Expected: no output from `node --check`, plus `lab-unit: N passed`.
- [ ] **Step 6: Run `npm run check:browser`.** Expected: PASS on all checks, the new ones included, and no "failed requests". If `contrast` or `palette` fail on the HUD panel, fix the CSS to use ramp tokens. Change a check only if it reads the band colour where the panel is now the background, and say so in the commit.
- [ ] **Step 7: Look at it.** Screenshot every stop at 1440 × 800 and 393 × 852 (Playwright MCP). An empty room is fine here. Judge it: the text must be readable on every panel, and nothing may jump on scroll.
- [ ] **Step 8: Commit** (two commits):

```bash
git add js/lab/scene.js js/lab/materials.js js/lab/room.js js/lab.js js/main.js css/lab.css index.html
git commit -m "feat(lab): one fixed 3D lab behind the page, walked by scrolling"
git add tests/checks.js tests/run.js tests/ci.mjs
git commit -m "test(lab): the lab mounts, follows scroll, and falls back cleanly"
```

---

### Task 3: The door

**Files:**
- Modify: `js/lab/room.js` (iris door), `js/lab.js`, `css/lab.css`, `css/reactor.css` (lab-mode hero only), `tests/checks.js`, `tests/run.js`

**Interfaces:**
- Consumes: `room.door` (Task 2), the `portfolio:waking` event and the `gated` class (js/gate.js), and the hero's frame, `.reactor[data-lab-frame="top"]`.
- Produces: `room.door.open({instant})` is implemented, and `html.dataset.door` switches from `'closed'` to `'open'`.

Decisions:
- The door is a round vault door the size of the reactor's frame, with an iris of 8 blades (brushed metal, dark lacquer seams) around a centre opening. The live reactor (its own canvas, unchanged) sits exactly in the opening, because the hero's frame is `.reactor`.
- Open is 1.4 s:
  - The reactor flashes; the existing waking pulse fires at about 900 ms.
  - The blades rotate open (easeInOutCubic), and light from the lab spills through.
  - `html.door-open` fades the reactor and the hero credentials' leader lines out over 400 ms. Then the camera may move.
- Behaviour:
  - Gated: the door opens on `portfolio:waking`.
  - Not gated (hash or session): it opens instantly before the first frame.
  - It never closes again in the session.

- [ ] **Step 1: Write the failing checks** and register them as EXTRA runs:
  - `gateDoor(win)` on `/` at 1440 × 800 (gated): on load, expect `dataset.door === 'closed'`; click `[data-gate-activate]`, wait 2200 ms, and expect `'open'`. Name it with the `gate` prefix so `run.js` clears the session key, like the other `gate*` runs.
  - `labDoor(win)` on `/#toolkit` at 1440 × 800 and 393 × 852: within 1000 ms of load, expect `dataset.door === 'open'` and `dataset.stop === 'toolkit'`.
- [ ] **Step 2: Run the suite and see it fail.** Expected: `gateDoor` and `labDoor` FAIL, and the rest PASS.
- [ ] **Step 3: Implement the door and the hand-off** to the decisions above.
- [ ] **Step 4: Run `npm run check` and `npm run check:browser`.** Expected: PASS. The existing gate checks still pass, `gateAuto` especially: the resume link must still be the element at its point while gated.
- [ ] **Step 5: Look at it.** Record a 3 s screenshot sequence of the door opening at both widths, and judge it. The door must read as metal, not plastic, and the reactor must sit dead centre in the iris.
- [ ] **Step 6: Commit**

```bash
git add js/lab/room.js js/lab.js css/lab.css css/reactor.css tests/checks.js tests/run.js
git commit -m "feat(lab): the arc reactor is the door, and it opens onto the lab"
```

---

### Task 4: Split the suit stage out of the Hall (no behaviour change)

**Files:**
- Create: `js/hall-stage.js`
- Modify: `js/hall-scene.js` (becomes a wrapper)

**Interfaces:**
- Produces, from `js/hall-stage.js`:
  - `loadModel(name) → Promise<{pieces, wire}>`, `loadBadge(name) → Promise<Texture>`, `MODELS`, `JARVIS`: moved verbatim.
  - `buildLit(spec, meshes, badgeMap) → THREE.Group`: the lit representation alone, standing on its feet at y = 0, 2.08 tall, for cheap suits.
  - `createSuitStage(renderer) → Stage`:
    - `Stage = { root: THREE.Group, lights: THREE.Group, state, setSuit(spec, {instant}) → Promise<boolean>, setPass(n, {instant}), turn(radians), ready(spec), prepare(spec) → Promise<boolean>, step(dt), bloomStrength: number }`
    - Clipping planes are kept in world space from `root.matrixWorld` each `step`, so the stage can stand anywhere.
- Keeps: `createHall(canvas)`, with its exact current API (`state, setSuit, turn, ready, prepare, setPass, resize, start, stop`), built on `createSuitStage`.

- [ ] **Step 1: Baseline.** Run `npm run check:browser` and note the PASS count. This task is a refactor, so that suite is its test.
- [ ] **Step 2: Move the code** as in the Interfaces. In `createHall`, the stage's `root` sits at the origin as today, its `lights` join the scene, and `bloom.strength` reads `stage.bloomStrength`.
- [ ] **Step 3: Run `npm run check` and `npm run check:browser`.** Expected: the same PASS count as Step 1.
- [ ] **Step 4: Check by eye.** Run the standalone Hall with the lab off (DevTools: emulate `prefers-reduced-motion: reduce`), go through all four passes, drag to turn and switch suits. It should look the same as before.
- [ ] **Step 5: Commit**

```bash
git add js/hall-stage.js js/hall-scene.js
git commit -m "refactor(hall): split the suit stage from its canvas so the lab can host it"
```

---

### Task 5: The suits in their bays

**Files:**
- Create: `js/lab/suits.js`
- Modify: `js/hall.js`, `js/lab/room.js` (glass bays and light strips), `css/lab.css`, `css/hall.css` (lab mode only), `tests/checks.js`, `tests/run.js`

**Interfaces:**
- Consumes: `createSuitStage`, `buildLit`, `loadModel` (Task 4); `getLab`, `Lab.goToBay`, `Lab.onBay` (Task 2); `room.bays` (seven `Vector3`s, 2.4 m apart along the gallery wall).
- Produces: `createSuitRow(scene: LabScene, specs: Spec[], {tier}) → {stage: HallLike, focus(index), warm(order: number[])}`
  - `HallLike` has the members `hall.js` already uses: `state`, `setSuit`, `turn`, `ready`, `prepare`, `setPass`, plus no-op `resize`, `start` and `stop`.

Decisions:
- In lab mode, `#work` gets `min-height: calc(7 * 55svh + 100lvh)`, and `.hall` is `position: sticky; top: calc(var(--nav) + 2 * var(--nav-top))`. Scrolling through Work walks the camera bay to bay (`railPosition().bay`), and `Lab.onBay` makes `hall.js` call `select(Math.round(bay))`.
- Tabs (`.hall__suit`) and `#work-<id>` deep links call `Lab.goToBay(index)`, which scrolls the page to that bay's rest point. Scroll stays the one driver.
- The `.hall__stage` box is the Work frame (`data-lab-frame="work"` moves onto it in lab mode). Its canvas is `display: none` in lab mode, and the box stays a transparent hit area for drag, arrows and Enter, exactly as today.
- The "Other projects" list stays where it is, under the sticky Hall, as a HUD panel.
- Cheap suits: as Task 0 decided, either seven live `buildLit` suits, or live focus ±1 with impostors. The focused bay's cheap suit hides while the stage stands there.
- Each bay has a floor ring, a back light strip in the suit's `hue`, and a glass front (`materials.glass`, transmission off, opacity 0.08, with a bright edge).
- Loading: the focused suit is urgent, and the rest load nearest first in idle time. Keep the existing `navigator.connection` save-data rule.
- With reduced motion there's no lab, so this path never runs.

- [ ] **Step 1: Write and update the checks:**
  - `labBays(win)` (in `ALL`, lab mode only, else a pass with detail `'no lab'`):
    - Scroll to `#work`, click `.hall__suit[data-suit="4"]`, wait 1200 ms.
    - Expect that button to have `aria-pressed="true"`, `.hall__name` to equal that suit's card name, and `.hall` top within `[0, innerHeight / 2)`.
  - `deepLink`: keep the current assertions. They must hold in lab mode because the sticky `.hall` is the target.
- [ ] **Step 2: Run the suite and see `labBays` fail.**
- [ ] **Step 3: Implement `suits.js`, the bays in `room.js` and the lab path in `hall.js`.** `hall.js`: `const lab = await getLab()`; if a lab exists, `hall = createSuitRow(lab.scene, suits.map((s) => s.spec), …).stage`, and `select` and `land` use `goToBay`; otherwise the current `createHall` path is unchanged.
- [ ] **Step 4: Run `npm run check` and `npm run check:browser`.** Expected: PASS, including `deepLink` ×3, `workTitle`, `labBays`.
- [ ] **Step 5: Look at it.** Screenshot bays I, IV and VII at both widths, mid-assembly and lit. Judge it: the focused suit is the one lit subject, the row recedes into the fog, and the HUD panel doesn't cover the suit.
- [ ] **Step 6: Commit** (two commits: the row and bays, then the hall wiring with tests).

```bash
git add js/lab/suits.js js/lab/room.js css/lab.css
git commit -m "feat(lab): the seven suits stand in a row of lit bays"
git add js/hall.js css/hall.css tests/checks.js tests/run.js
git commit -m "feat(hall): in the lab, scrolling walks the bays and the tabs jump to a suit"
```

---

### Task 6: The hologram portrait

**Files:**
- Create: `tools/cutout.swift`, `img/evan-holo.webp`, `js/lab/hologram.js`, `js/lab/stops.js` (About stop only for now)
- Modify: `js/lab.js` (build the stops), `css/lab.css` (About in lab mode), `tests/checks.js`, `tests/run.js`

**Interfaces:**
- Produces:
  - `createHologram(THREE, texture, {height: number}) → {mesh: THREE.Mesh, step(time: number)}`
  - `buildStops(lab: Lab) → Promise<void>`, in `js/lab/stops.js`, which places each stop's set pieces. This task adds About's room: the hologram on a projector disc, and the wall screen behind the HTML panel.

Decisions:
- Cutout: `swift tools/cutout.swift img/evan.jpg <scratchpad>/evan-holo.png` uses `VNGenerateForegroundInstanceMaskRequest` and writes the photo with the mask as alpha, trimmed to its bounding box. Then `cwebp -q 85 -alpha_q 90 -resize 0 1000` writes `img/evan-holo.webp`, which must be ≤ 160 KB.
- Shader (on a plane, `transparent`, `depthWrite: false`, additive only in the rim):
  - Keep the photo's colour at 75%, mixed with arc blue at 25% by luminance. **The face stays the photo.**
  - Rim: alpha-edge glow from 8 alpha samples, in arc blue at 1.6× (it blooms on desktop).
  - Scanlines: `0.06 * sin(y * 900 + time * 3)`.
  - Flicker: a 0.04 dip, at random every 4–9 s, for 80 ms.
  - A soft cone of light from the projector disc.
- In lab mode, the About photo `<figure>` becomes `visually-hidden`, so its alt text still reaches screen readers and `aboutPhoto` still passes.

- [ ] **Step 1: Make the cutout.** Write `tools/cutout.swift` (it takes an input path and an output path, exits non-zero with a message on failure, and has no network). Run it, encode the result, and check: `ls -l img/evan-holo.webp` is ≤ 160 KB, and Read the image to see the edge is clean around the hair and suit.
- [ ] **Step 2: Write the failing check** `labHolo(win)` (in `ALL`, lab only):
  - Scroll to `#about` and wait 1500 ms.
  - Expect `performance.getEntriesByType('resource')` to include `evan-holo.webp` with status 200.
  - Expect `#about figure img` to still have its alt text and to not be `display: none`.
- [ ] **Step 3: Implement `hologram.js` and the About part of `stops.js`,** and compose the stop: the hologram at life size, three-quarter height in the frame, the projector disc glowing under it, the wall screen behind the panel, the bar counter in warm wood behind him to the left, and depth falling into the fog.
- [ ] **Step 4: Run `npm run check` and `npm run check:browser`.** Expected: PASS.
- [ ] **Step 5: Evan reviews a still (spec risk: "Hologram makes the portrait look fake").** Screenshot About at 1440 × 800 and 393 × 852, and ask him: "Does this still look like you?" Ship only on his yes. Tune the colour mix toward the photo until he says yes.
- [ ] **Step 6: Commit** (two commits):

```bash
git add tools/cutout.swift img/evan-holo.webp
git commit -m "feat(lab): cut Evan's portrait out for the hologram"
git add js/lab/hologram.js js/lab/stops.js js/lab.js css/lab.css tests/checks.js tests/run.js
git commit -m "feat(lab): Evan as a hologram in the first room"
```

---

### Task 7: Spots, cards and the About furniture

**Files:**
- Create: `js/lab/spots.js`, `js/lab/props.js`
- Modify:
  - `index.html` (About: the things list);
  - `js/lab/stops.js`, `css/lab.css`, `css/home.css` (the things list in the fallback);
  - `tests/checks.js`, `tests/run.js`.

**Interfaces:**
- Consumes: `LabScene.project`, `.lean`, `.onFrame`, `Lab.goToStop`, `Lab.onStop`.
- Produces:
  - `createSpots(lab: Lab) → Spots`
    - `Spots = { add({id, label, stop, anchor: THREE.Object3D, title: string, body: Node}): HTMLButtonElement, open(id), close() }`
  - Props, each returning a `THREE.Group` with `userData.anchor`: `barbell()`, `powerRack()`, `floorballStick()`, `coffeeMachine()`, `kopiCup()`, `guitar()`, `guitarStand()`, `beret()`, `hockeyStick()`, `wallShelf()`, `barCounter()`.
    - Each builder takes `(THREE, materials)`.
    - Low-poly, real-world scale in metres.

Decisions:
- **HTML (the one source of the copy).** In `#about .about__text`, after `.proof`:
  - add `<h3 class="about__things-title mono">Off the clock</h3>`;
  - then `<ul class="about__things" data-things>`, with one `<li data-thing="<id>"><h4>…</h4><p>…</p></li>` per item.
  - Ids and titles: `barbell` "Barbell", `floorball` "Floorball stick", `coffee` "Coffee machine", `guitar` "Guitar", `beret` "Commando beret", `hockey` "Hockey stick".
  - Each `<p>` is the approved draft, verbatim.
  - In the fallback it's a two-column list. In lab mode it is `visually-hidden`, and the spots read from it.
- **Spots:**
  - A spot is a `<button class="lab-spot" type="button" aria-haspopup="dialog">`, appended to its section (so the tab order follows the page), 44 × 44 px minimum. It shows a pulsing ring and its label on hover or focus.
  - It's positioned with `position: fixed; transform: translate(x, y)` from `project(anchor)` each frame.
  - Off its stop it's `opacity: 0; pointer-events: none`, but stays focusable. On `focus` it calls `Lab.goToStop(stop)`.
- **Card:**
  - One `<dialog class="lab-card" aria-labelledby="lab-card-title">`: an `h2` title, the body, and a Close button.
  - It opens with `showModal()`. On close it calls `lean(null)` and focuses its spot.
  - Opening calls `lean(anchor)`: the camera dollies 15% toward the object and settles.
- **Composition:**
  - Gym corner to the right of the hologram: a rack with a loaded barbell, and the floorball stick leaning on the rack.
  - The bar on the left, in warm wood: the coffee machine with the kopi cup (a glass mug, condensed-milk brown), and the shelf above it with the beret and the hockey stick.
  - The guitar on its stand by the hologram's projector.
  - Every prop is lit by the room. None floats.

- [ ] **Step 1: Write the failing check** `labSpots(win)` (in `ALL`, lab only):
  - About has exactly six `.lab-spot` buttons, named Barbell, Floorball stick, Coffee machine, Guitar, Commando beret and Hockey stick, each ≥ 44 × 44.
  - Focus the Guitar spot and send Enter (click). The `dialog.lab-card` is `open`, its title is "Guitar", and its body equals the guitar `<p>`.
  - Send Escape on the dialog. It closes, and `document.activeElement` is the Guitar spot.
  - With the page scrolled to `#contact`, focusing the Barbell spot makes `dataset.stop === 'about'` within 800 ms.
- [ ] **Step 2: Run the suite and see it fail.**
- [ ] **Step 3: Add the HTML list and its fallback CSS.** Run `npm run check:browser` with the lab off (reduced motion in DevTools), and check `headings` (h2 → h3 → h4, no skips) still passes.
- [ ] **Step 4: Implement `spots.js`, `props.js` and the About set in `stops.js`.**
- [ ] **Step 5: Run `npm run check` and `npm run check:browser`.** Expected: PASS, including `targets`, `headings`, `labSpots`.
- [ ] **Step 6: Look at it.** Screenshot About at both widths, closed and with the Guitar card open. Judge every prop against the material language: does the guitar read as a guitar at phone size?
- [ ] **Step 7: Commit** (three commits):

```bash
git add index.html css/home.css
git commit -m "feat(about): off the clock: the gym, coffee, guitar, beret and hockey stick"
git add js/lab/spots.js css/lab.css tests/checks.js tests/run.js
git commit -m "feat(lab): clickable objects as real buttons that open a card"
git add js/lab/props.js js/lab/stops.js
git commit -m "feat(lab): furnish the first room"
```

---

### Task 8: The trophy shelf (Experience)

**Files:**
- Modify:
  - `index.html`: move the Recognition, Education and Certifications content into `#experience`; drop the Toolkit tabs.
  - `js/main.js` and `js/tabs.js` (delete `tabs.js` and its import if nothing else uses `data-kit`; check with `grep -rn "data-kit\|initTabs" js index.html`).
  - `js/lab/props.js`, `js/lab/stops.js`, `js/lab/room.js`, `css/home.css`, `css/lab.css`, `tests/checks.js`, `tests/run.js`.

**Interfaces:**
- Consumes: `createSpots` (Task 7) and the props pattern.
- Produces: props `plaque()`, `trophy({place})`, `medal()`, `certificate()`, `diploma()`, `shelfUnit(tiers: number)`.

Decisions:
- **HTML (applies to the fallback too).** After the roles in `#experience`, add `<div class="honours" data-shelf>` with tiers in this order. Each tier is an `<h3 class="honours__tier mono">` plus a `dl.rows.rows--named`, and the text is moved verbatim:
  - Roles: on the shelf only. They are plaques pointing at the role `li`s above, so there's no repeated text and no Roles heading in the HTML list.
  - Awards (`id="recognition"`, so old links land): Top 5, 2nd place, Nominated, and a new row, "Best Combat Unit · 2023/24, 1st Commando Battalion, Singapore Army". That is the spec's "appears under Awards as well".
  - Scholarship (`id="scholarship"`).
  - Certifications (`id="certifications"`).
  - Education (`id="education"`).
- **Toolkit** keeps only `#kit-tools`, without tabs.
- **Shelf:**
  - One dark-lacquer unit with five lit tiers, labelled in the HUD font on brass plates.
  - Roles are 4 plaques. Awards are 4 trophies: gold for 2nd, silver-blue for Top 5, a glass star for Nominated, and a regimental cup for Best Combat Unit. The scholarship is a medal on a ribbon. The 2 certifications are framed. Education is 3 diplomas.
  - Each item is a spot whose card is that row's `dt` and `dd` (for roles, the role's title line and its first sentence).

- [ ] **Step 1: Rewrite the checks for the new home.**
  - `tabs` becomes `honours(win)`: `#experience [data-shelf]` holds tiers titled Awards, Scholarship, Certifications and Education, in order; `#toolkit [role="tablist"]` is gone.
  - `tabLink` becomes `honoursLink(win)`: for `/#education` and `/#certifications`, the element with that id is inside `#experience`, visible, and its top is within `[0, innerHeight)` once scrolling settles.
  - In lab mode, `labShelf(win)`: `#experience` has 4 + 4 + 1 + 2 + 3 = 14 spots, each ≥ 44 × 44, and opening "2nd place" shows its text.
  - Update `ALL` and `EXTRA` in `run.js`.
- [ ] **Step 2: Run the suite and see the three fail.**
- [ ] **Step 3: Move the HTML, delete `tabs.js` if unused, and style `.honours` for the fallback.** Run `npm run check:browser` with the lab off. Expected: `honours`, `honoursLink`, `headings` and `removed` PASS.
- [ ] **Step 4: Build the shelf and its spots.**
- [ ] **Step 5: Run `npm run check` and `npm run check:browser`.** Expected: PASS.
- [ ] **Step 6: Look at it** at both widths. On a phone, 14 spots must not crowd: below 720 px, the shelf shows one tier at a time as the camera tilts down the unit (`holds` over the Experience hold). Judge it.
- [ ] **Step 7: Commit** (two commits):

```bash
git add index.html js/main.js js/tabs.js css/home.css tests/checks.js tests/run.js
git commit -m "feat(experience): awards, scholarship, certificates and education join the roles"
git add js/lab/props.js js/lab/stops.js js/lab/room.js css/lab.css
git commit -m "feat(lab): the trophy shelf"
```

---

### Task 9: The workbench (Toolkit)

**Files:**
- Modify: `js/lab/props.js`, `js/lab/stops.js`, `js/lab/room.js`, `css/lab.css`, `tests/checks.js`, `tests/run.js`

**Interfaces:**
- Produces: props `workbench()`, `terminal()` (Languages), `boardRack()` (Frameworks), `neuralCore()` (AI and data, holo emissive), `serverBlade()` (Cloud and tools), `oscilloscope()` (Testing), `printer3d()` (Design and modelling).

Decisions:
- One long bench in brushed metal and dark lacquer, with the six objects left to right in the order of the `#kit-tools` rows. A light strip runs under the shelf.
- Each object is a spot named for its group. Its card is that row's `ul.tools`, cloned with its icons, shown as a hologram panel: the card gets the `lab-card--holo` modifier, with arc-blue edges and the tools in two columns.
- The HTML `#kit-tools` panel stays visible in lab mode as the HUD readout, so tools can be scanned without clicking.

- [ ] **Step 1: Write the failing check** `labBench(win)` (lab only): `#toolkit` has 6 spots, named Languages, Frameworks, AI and data, Cloud and tools, Testing, and Design and modelling. Opening "Testing" lists Hegel, Bombadil and property-based testing.
- [ ] **Step 2: Run the suite and see it fail.**
- [ ] **Step 3: Implement the bench, its props and the spots.**
- [ ] **Step 4: Run `npm run check` and `npm run check:browser`.** Expected: PASS, including `hashSection` (`/#toolkit` marks Toolkit).
- [ ] **Step 5: Look at it** at both widths, closed and with one card open, and judge it.
- [ ] **Step 6: Commit**

```bash
git add js/lab/props.js js/lab/stops.js js/lab/room.js css/lab.css tests/checks.js tests/run.js
git commit -m "feat(lab): the workbench, one object per kind of tool"
```

---

### Task 10: The office (Contact)

**Files:**
- Modify: `js/lab/room.js` (the second room and its door), `js/lab/props.js` (`desk()`, `deskScreen()`, `chair()`, `lamp()`), `js/lab/stops.js`, `css/lab.css`, `tests/checks.js`, `tests/run.js`

**Interfaces:**
- Consumes: `room.marks.office`.
- Produces: nothing new for later tasks.

Decisions:
- A smaller room through a sliding glass door, which opens as the camera approaches (driven by `u`). Walnut desk and floor, one warm lamp, the city at night as a dim gradient through a window. This is the one warm space.
- The desk screen is the `#contact` frame. The HTML contact panel (email, Copy, Resume, GitHub, LinkedIn) is styled as that screen's UI in lab mode, without changing its markup or its copy button.
- The footer follows in the office's palette in lab mode, and its credits stay readable.

- [ ] **Step 1: Write the failing check** `labOffice(win)` (lab only):
  - At max scroll, `dataset.stop === 'contact'`.
  - `.contact__copy` is visible and ≥ 44 px.
  - The email link's text equals `CONTACT_EMAIL`, read from the page's `[data-contact-link]`.
  - Footer credits contrast ≥ 4.5:1 against the computed panel colour.
- [ ] **Step 2: Run the suite and see it fail.**
- [ ] **Step 3: Implement the room, props and styling.**
- [ ] **Step 4: Run `npm run check` and `npm run check:browser`.** Expected: PASS, including `copy`.
- [ ] **Step 5: Look at it** at both widths, and judge it.
- [ ] **Step 6: Commit**

```bash
git add js/lab/room.js js/lab/props.js js/lab/stops.js css/lab.css tests/checks.js tests/run.js
git commit -m "feat(lab): the office, where the contact details sit on the desk screen"
```

---

### Task 11: Performance, accessibility and the final look

**Files:**
- Modify: whatever the passes find; `index.html` footer credits if any third-party asset came in; `CLAUDE.md` (the browser suite's check count and runtime)

**Interfaces:** none new.

- [ ] **Step 1: Performance.** Repeat Task 0's measurements on the real site, with the same profiles and both scroll sweeps. It passes at desktop p95 ≤ 16.7 ms, phone p95 ≤ 33 ms (4× CPU) and lab transfer ≤ 4.5 MB.
  - If it fails, cut in this order: bloom on low-end desktop, then impostors for distant suits, then a phone DPR of 1.25, then the prop polycount.
  - Record the numbers in the spec's "Spike results" as "Shipped".
- [ ] **Step 2: Accessibility.** Tab through the whole page at 1440 × 800. Every spot is reached in section order, its stop comes into view, Enter opens, Escape closes and focus returns. Then do the same with VoiceOver on (`Cmd+F5`): spots announce their names, the card announces its title, and the canvas is silent. Fix what fails.
- [ ] **Step 3: Fallbacks.** Look at the page with reduced motion, with WebGL disabled (`--disable-webgl` in a throwaway Chrome profile) and with the CDN blocked. It's today's site with the new Experience honours and the About "Off the clock" list, with nothing broken.
- [ ] **Step 4: The film-still review.** Screenshot all stops (door closed, door open, About, bays I, IV and VII, shelf, bench, office) at 1440 × 800 and 393 × 852. Check each against the quality bar and fix anything that misses. Show Evan the set.
- [ ] **Step 5: Final check.** Run `npm run check` and `npm run check:browser`. Expected: PASS, with the new total count, and update `CLAUDE.md`'s count and runtime to match.
- [ ] **Step 6: Commit** (one commit per fix during Steps 1–4, then):

```bash
git add CLAUDE.md
git commit -m "docs: the browser suite's new size and runtime"
```

- [ ] **Step 7: Whole-branch review,** then hand off with superpowers:finishing-a-development-branch.
