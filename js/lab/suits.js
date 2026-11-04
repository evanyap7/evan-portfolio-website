// The row of suits in the lab: seven lit suits standing in their bays along
// the gallery wall, and the Hall's suit stage (hall-stage.js), which steps
// into whichever bay is in focus, fully lit. hall.js
// drives `stage` exactly as it drives the Hall's own canvas.

import { createSuitStage, buildLit, loadModel, loadBadge, FEET, JARVIS } from '../hall-stage.js';

const FACING = -Math.PI / 2; // the suits face the gallery, down -x
const DIM = 0.55; // the stage's key and warm lights, for the room's darker air
const NEAR = 6; // the stage is fully lit with the camera this close
const FAR = 12; // and dark from this far
const LIT = 1.6; // the focused bay's light column
const RESTING = 0.9; // the others'

const idle = () => new Promise((resolve) => {
  if ('requestIdleCallback' in window) window.requestIdleCallback(() => resolve(), { timeout: 600 });
  else setTimeout(resolve, 60);
});

export function createSuitRow(lab, specs, { hues = [] } = {}) {
  const { THREE, scene, camera, renderer, room } = lab;
  const bays = room.bays;

  // The stage's origin is its suit's middle: its feet stand at FEET below it.
  const stage = createSuitStage(renderer);
  const put = (object, k, lift, turn = 0) => {
    object.position.copy(bays[k]);
    object.position.y += lift;
    object.rotation.y = FACING + turn;
  };
  put(stage.root, 0, -FEET);
  put(stage.lights, 0, -FEET);
  lab.add('work', stage.root);
  // In the scene from the start and never taken out, so no shader recompiles
  // for a change in the number of lights; they fade to nothing instead.
  scene.add(stage.lights);
  const [key, , warm, , core] = stage.lights.children;
  [key, warm, core].forEach((light) => {
    light.intensity = 0;
  });

  // The cheap suits: each bay's lit suit, built once. The bay the stage
  // stands in hides its own.
  const cheap = specs.map(() => null);
  const building = new Map();
  let at = 0;
  let shown = false;
  function build(k) {
    if (building.has(k)) return building.get(k);
    const spec = specs[k];
    const done = Promise.all([loadModel(spec.model), spec.badge && loadBadge(spec.badge.name)])
      .then(async ([meshes, badgeMap]) => {
        await idle();
        const suit = buildLit(spec, meshes, badgeMap);
        put(suit, k, 0, 0.2);
        await renderer.compileAsync(suit, camera, scene);
        // Its textures go to the graphics card now, a suit at a time while the
        // page is idle, not all in the one frame it first comes into view.
        suit.traverse((node) => {
          const list = node.material ? [].concat(node.material) : [];
          list.forEach((material) => {
            Object.values(material).forEach((value) => {
              if (!value || !value.isTexture) return;
              try {
                renderer.initTexture(value);
              } catch {
                // It uploads when first drawn instead.
              }
            });
          });
        });
        suit.visible = !(shown && k === at);
        lab.add('work', suit);
        cheap[k] = suit;
      });
    done.catch(() => building.delete(k));
    building.set(k, done);
    return done;
  }

  function moveTo(k) {
    if (k < 0 || (k === at && shown)) return;
    if (cheap[at]) cheap[at].visible = true;
    at = k;
    put(stage.root, k, -FEET);
    put(stage.lights, k, -FEET);
    if (cheap[k]) cheap[k].visible = false;
  }

  // Each bay's column of light, in its suit's hue: bright for the one in focus.
  const colour = new THREE.Color();
  const haze = new THREE.Color();
  function focus(index) {
    specs.forEach((_, k) => {
      colour.setHSL((hues[k] ?? JARVIS) / 360, 0.9, 0.6).multiplyScalar(k === index ? LIT : RESTING);
      room.bayLights.setColorAt(k, colour);
      // Its shaft of light: white with a breath of the suit's hue, and the
      // bay in focus lit the most.
      room.shafts?.set(k, k === index ? 0.22 : 0.08, haze.set(0xdff0ff).lerp(colour, 0.12));
    });
    room.bayLights.instanceColor.needsUpdate = true;
  }

  // The stage's lights reach only so far: they fade with the camera's
  // distance from the bay, so the rest of the room keeps its own light.
  const there = new THREE.Vector3();
  lab.onFrame((dt) => {
    stage.step(dt);
    if (!shown) return;
    stage.root.getWorldPosition(there);
    const fade = Math.min(1, Math.max(0, (FAR - camera.position.distanceTo(there)) / (FAR - NEAR)));
    key.intensity *= DIM * fade;
    warm.intensity *= DIM * fade;
    core.intensity *= fade;
  });

  // Loads the cheap suits one at a time, in the order given.
  let queue = Promise.resolve();
  function warmRow(order) {
    order.forEach((k) => {
      if (k < 0 || k >= specs.length) return;
      queue = queue.then(() => build(k)).catch((error) => console.warn(`suit ${k} failed to load`, error));
    });
  }

  // Two points a suit stands between, for hall.js to hold a link over it.
  const ends = bays.slice(0, specs.length).map((bay) => {
    const foot = new THREE.Object3D();
    const head = new THREE.Object3D();
    foot.position.copy(bay);
    head.position.copy(bay).y += 2.1;
    scene.add(foot, head);
    return { foot, head };
  });

  return {
    ends,
    // The members hall.js uses of the Hall's canvas; resize, start and stop
    // belong to the lab, which owns the one canvas.
    stage: {
      state: stage.state,
      setSuit(spec, options) {
        return stage.setSuit(spec, options).then((on) => {
          if (on) {
            moveTo(specs.indexOf(spec));
            shown = true;
          }
          return on;
        });
      },
      turn(radians) {
        stage.turn(radians);
      },
      ready: stage.ready,
      prepare: stage.prepare,
      setPass(next, options) {
        stage.setPass(next, options);
      },
      resize() {},
      start() {},
      stop() {},
    },
    focus,
    warm: warmRow,
  };
}
