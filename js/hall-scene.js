// The Hall of Armor's canvas, page side in hall.js: the suit stage
// (hall-stage.js) in a canvas of its own, with its own camera, environment
// and bloom. The stage stands at the origin; the camera frames VIEW across.

import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { createSuitStage } from './hall-stage.js';

const VIEW = 2.85; // world units across the canvas

export function createHall(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 2));

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  const ENV = 0.55;
  scene.environmentIntensity = ENV;
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
  camera.position.set(0, 0, VIEW / 2 / Math.tan(THREE.MathUtils.degToRad(14)));

  const stage = createSuitStage(renderer);
  scene.add(stage.lights, stage.root);

  // Phones draw without multisampling: the pixel ratio already smooths edges.
  const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: coarse ? 0 : 4 });
  const composer = new EffectComposer(renderer, target);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.45, 0.4, 0.95);
  Object.assign(bloom.blendMaterial, {
    blending: THREE.CustomBlending,
    blendSrc: THREE.SrcAlphaFactor,
    blendDst: THREE.OneFactor,
    blendSrcAlpha: THREE.ZeroFactor,
    blendDstAlpha: THREE.OneFactor,
  });
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  let last = 0;
  let frame = 0;

  function step(dt) {
    stage.step(dt);
    scene.environmentIntensity = ENV * stage.glow;
    bloom.strength = stage.bloomStrength;
  }

  function loop(now) {
    frame = requestAnimationFrame(loop);
    const dt = Math.min(0.05, last ? (now - last) / 1000 : 0);
    last = now;
    step(dt);
    composer.render();
  }

  // Redraws once when nothing is looping (reduced motion, or off screen).
  const still = () => {
    if (frame) return;
    step(0.016);
    composer.render();
  };

  return {
    state: stage.state,
    // Resolves true once the suit is on stage, false if a later call won.
    setSuit(spec, options) {
      return stage.setSuit(spec, options).then((shown) => {
        if (shown) still();
        return shown;
      });
    },
    // Spins the suit by hand; redraws at once when nothing is looping.
    turn(radians) {
      if (stage.turn(radians, { snap: !frame }) && !frame) composer.render();
    },
    // Whether a suit would go on stage at once.
    ready: stage.ready,
    // Fetches and warms a suit in idle moments; resolves when it is ready.
    prepare: stage.prepare,
    // `instant` skips the scan line (reduced motion).
    setPass(next, options) {
      if (stage.setPass(next, options)) still();
    },
    resize(width, height) {
      renderer.setSize(width, height, false);
      composer.setPixelRatio(renderer.getPixelRatio());
      composer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      still();
    },
    start() {
      if (frame) return;
      last = 0;
      frame = requestAnimationFrame(loop);
    },
    stop() {
      cancelAnimationFrame(frame);
      frame = 0;
    },
  };
}
