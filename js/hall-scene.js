// The Hall of Armor's 3D stage, page side in hall.js. One shared canvas shows
// one suit at a time: a scanned film suit loaded from models/hall/ (glTF,
// meshopt-compressed, WebP textures). A suit can wear its model's own paint or
// be repainted: the model's red panels take the suit's base colour and its
// gold panels the accent, so one model can stand in for several Marks. Each
// suit is drawn four times from the same mesh, once per render pass:
// blueprint (edges only), wireframe, shaded clay, and fully lit. Changing pass
// sweeps a scan line up the suit: below the line is the new pass, above it the
// old one.

import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

const VIEW = 2.85; // world units across the canvas
const SCAN_SECONDS = 0.85;
const SCAN_RANGE = 1.2;
const EDGE_ANGLE = 28;
const FEET = -1.06; // the floor ring's height; every model stands on it
const TALL = 2.08; // a model's height on the stage (the files are 2.0 tall, feet at 0)
const JARVIS = 196; // the hue of every reactor, eye and blueprint line

// Per model: how bright its red and gold panels are on average (linear, the
// brightest channel), so a repaint keeps the texture's shading and wear.
const MODELS = {
  'mark-1': {},
  'mark-7': { red: 0.052, gold: 0.21 },
  'mark-7-lite': { red: 0.035, gold: 0.149 },
  'mark-50': { red: 0.074, gold: 0.158 },
};

let loader = null;
const loaded = new Map();

// Fetches a model once; resolves to its meshes as { geometry, material, matrix }
// (the matrix carries the file's node transform, which undoes quantisation).
function loadModel(name) {
  if (!loaded.has(name)) {
    loader ??= new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    const url = new URL(`../models/hall/${name}.glb`, import.meta.url).href;
    const request = loader.loadAsync(url).then((gltf) => {
      gltf.scene.updateMatrixWorld(true);
      const meshes = [];
      gltf.scene.traverse((node) => {
        if (node.isMesh) meshes.push({ geometry: node.geometry, material: node.material, matrix: node.matrixWorld.clone(), edges: null });
      });
      return meshes;
    });
    request.catch(() => loaded.delete(name));
    loaded.set(name, request);
  }
  return loaded.get(name);
}

// Red panels to `base`, gold panels to `accent`, anything grey, dark or blue
// (the glow) left as it is. Hue decides: gold is red with a lot of green.
const REPAINT = /* glsl */ `
#ifdef USE_MAP
  vec4 sampledDiffuseColor = texture2D( map, vMapUv );
  vec3 paintSrc = sampledDiffuseColor.rgb;
  float paintMax = max( paintSrc.r, max( paintSrc.g, paintSrc.b ) );
  float paintSat = ( paintMax - min( paintSrc.r, min( paintSrc.g, paintSrc.b ) ) ) / max( paintMax, 1e-4 );
  float painted = smoothstep( 0.3, 0.5, paintSat ) * step( paintSrc.b, paintSrc.r );
  float gilt = smoothstep( 0.22, 0.4, paintSrc.g / max( paintSrc.r, 1e-4 ) );
  vec3 redTo = uPaintBase * clamp( paintMax / uPaintRef.x, 0.0, 1.5 );
  vec3 goldTo = uPaintAccent * clamp( paintMax / uPaintRef.y, 0.0, 1.5 );
  paintSrc = mix( paintSrc, mix( redTo, goldTo, gilt ), painted );
  diffuseColor *= vec4( paintSrc, sampledDiffuseColor.a );
#endif
`;

function repainted(source, paint, model) {
  const material = source.clone();
  const base = new THREE.Color(paint.base);
  const accent = new THREE.Color(paint.accent);
  const ref = new THREE.Vector2(model.red, model.gold);
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uPaintBase = { value: base };
    shader.uniforms.uPaintAccent = { value: accent };
    shader.uniforms.uPaintRef = { value: ref };
    shader.fragmentShader = shader.fragmentShader
      .replace('void main() {', 'uniform vec3 uPaintBase;\nuniform vec3 uPaintAccent;\nuniform vec2 uPaintRef;\nvoid main() {')
      .replace('#include <map_fragment>', REPAINT);
  };
  material.customProgramCacheKey = () => 'hall-repaint';
  if (paint.metal !== undefined) material.metalness = paint.metal;
  if (paint.rough !== undefined) material.roughness = paint.rough;
  return material;
}

export function createHall(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.localClippingEnabled = true;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 2));

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  const ENV = 0.55;
  scene.environmentIntensity = ENV;
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
  camera.position.set(0, 0, VIEW / 2 / Math.tan(THREE.MathUtils.degToRad(14)));

  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  const warm = new THREE.DirectionalLight(0xffd2b0, 0.8);
  warm.position.set(3, -1.5, 3);
  const coreLight = new THREE.PointLight(0xffffff, 2, 3.2, 1.6);
  coreLight.position.set(0, 0.45, 0.5);
  scene.add(key, warm, coreLight);

  const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
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

  // The scan line and the two planes that split old pass from new.
  const planeNew = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
  const planeOld = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const scanMaterial = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, toneMapped: false });
  const scanLine = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.012), scanMaterial);
  scanLine.position.z = 0.3;
  scanLine.visible = false;
  scene.add(scanLine);

  const tinted = (mult, base) => new THREE.Color().copy(base).multiplyScalar(mult);
  const hue = new THREE.Color().setHSL(JARVIS / 360, 0.95, 0.56);
  const pale = new THREE.Color().copy(hue).lerp(new THREE.Color(1, 1, 1), 0.7);
  const glowColor = new THREE.Color().setHSL(JARVIS / 360, 0.9, 0.62);
  scanMaterial.color.copy(pale).multiplyScalar(1.4);
  coreLight.color.copy(glowColor);

  // A ring of light on the floor under the boots, in every pass.
  const ring = new THREE.RingGeometry(0.5, 0.515, 72).rotateX(-Math.PI / 2).translate(0, FEET, 0.02);
  const ringEdges = new THREE.EdgesGeometry(ring);

  const state = { tx: 0, ty: 0 };
  let suit = null; // { root, reps: [{ root, materials }], owned: materials to dispose }
  let wanted = 0; // the latest setSuit call; older loads that land late are dropped
  let pass = 3;
  let from = 3;
  let scan = 1; // 1 = settled; 0 to 1 = sweeping from `from` to `pass`
  let appear = 1;
  let time = 0;
  let last = 0;
  let frame = 0;

  // The four representations of one model, as [meshes or lines] per pass.
  function build(spec, meshes) {
    dispose();
    const model = MODELS[spec.model];
    const owned = [];
    const own = (material) => {
      owned.push(material);
      return material;
    };
    const line = (mult) => own(new THREE.LineBasicMaterial({ color: tinted(mult, hue), toneMapped: false }));
    const wire = (mult) => own(new THREE.MeshBasicMaterial({ color: tinted(mult, hue), wireframe: true, transparent: true, opacity: 0.55, toneMapped: false }));
    const glow = (mult) => own(new THREE.MeshBasicMaterial({ color: tinted(mult, glowColor), toneMapped: false, side: THREE.DoubleSide }));

    const blueprintLine = line(0.85);
    const wireLine = wire(0.7);
    const clayFor = new Map();
    const clay = (source) => {
      if (!clayFor.has(source)) {
        clayFor.set(source, own(new THREE.MeshStandardMaterial({
          color: 0x9aa3ad,
          metalness: 0.05,
          roughness: 0.62,
          normalMap: source.normalMap,
          normalScale: source.normalScale,
          emissiveMap: source.emissiveMap,
          emissive: source.emissiveMap ? tinted(1.4, glowColor) : 0x000000,
        })));
      }
      return clayFor.get(source);
    };
    const litFor = new Map();
    const lit = (source) => {
      if (!litFor.has(source)) {
        litFor.set(source, own(spec.paint ? repainted(source, spec.paint, model) : source.clone()));
      }
      return litFor.get(source);
    };

    const root = new THREE.Group();
    const reps = ['blueprint', 'wire', 'shaded', 'lit'].map((kind) => {
      const repRoot = new THREE.Group();
      const figure = new THREE.Group();
      figure.position.y = FEET;
      figure.scale.setScalar(TALL / 2);
      meshes.forEach((piece) => {
        let object;
        if (kind === 'blueprint') {
          piece.edges ??= new THREE.EdgesGeometry(piece.geometry, EDGE_ANGLE);
          object = new THREE.LineSegments(piece.edges, blueprintLine);
        } else if (kind === 'wire') {
          object = new THREE.Mesh(piece.geometry, wireLine);
        } else {
          object = new THREE.Mesh(piece.geometry, kind === 'shaded' ? clay(piece.material) : lit(piece.material));
        }
        object.matrixAutoUpdate = false;
        object.matrix.copy(piece.matrix);
        figure.add(object);
      });
      repRoot.add(figure);
      // Each pass gets its own ring material: the scan line clips old and new apart.
      repRoot.add(kind === 'lit' || kind === 'shaded' ? new THREE.Mesh(ring, glow(1.2)) : new THREE.LineSegments(ringEdges, line(1)));
      root.add(repRoot);
      const materials = [];
      repRoot.traverse((node) => {
        if (node.material && !materials.includes(node.material)) materials.push(node.material);
      });
      return { root: repRoot, materials };
    });
    scene.add(root);
    suit = { root, reps, owned };
    appear = 0;
    applyVisibility();
  }

  function dispose() {
    if (!suit) return;
    scene.remove(suit.root);
    // Geometry and textures belong to the cached model; only our materials go.
    suit.owned.forEach((material) => material.dispose());
    suit = null;
  }

  // Which representations draw, and which side of the scan line each keeps.
  function applyVisibility() {
    if (!suit) return;
    const sweeping = scan < 1;
    suit.reps.forEach((rep, index) => {
      const isNew = index === pass;
      const isOld = sweeping && index === from;
      rep.root.visible = isNew || isOld;
      const planes = sweeping ? [isNew ? planeNew : planeOld] : [];
      rep.materials.forEach((material) => {
        material.clippingPlanes = planes;
      });
    });
    scanLine.visible = sweeping;
  }

  function step(dt) {
    time += dt;
    if (!suit) return;
    appear = Math.min(1, appear + dt / 0.7);
    const ease = 1 - (1 - appear) ** 3;
    if (scan < 1) {
      scan = Math.min(1, scan + dt / SCAN_SECONDS);
      if (scan >= 1) applyVisibility();
      const y = -SCAN_RANGE + 2 * SCAN_RANGE * scan;
      planeNew.constant = y;
      planeOld.constant = -y;
      scanLine.position.y = y;
      scanMaterial.opacity = Math.sin(Math.PI * Math.min(1, scan));
    }
    const flick = appear < 1 ? (Math.sin(time * 70) > 0.1 - appear ? 1 : 0.3) : 1;
    const k = dt ? 1 - Math.exp(-dt * 6) : 1;
    suit.root.rotation.x += (0.02 + Math.cos(time * 1.15) * 0.02 - state.ty * 0.12 - suit.root.rotation.x) * k;
    suit.root.rotation.y += (0.2 + Math.sin(time * 0.9) * 0.3 + state.tx * 0.5 - suit.root.rotation.y) * k;
    suit.root.position.y = Math.sin(time * 1.3) * 0.016;
    suit.root.scale.setScalar(0.82 + 0.18 * ease);
    const lit = pass === 3 || (scan < 1 && from === 3);
    scene.environmentIntensity = ENV * flick;
    key.intensity = 1.6 * flick;
    warm.intensity = 0.8 * flick;
    coreLight.intensity = (lit ? 0.7 : 0.2) * flick * (1 + 0.04 * Math.sin(time * 19.7));
    bloom.strength = lit ? 0.5 : 0.18;
    key.position.set(-2.2 + state.tx * 3.2, 2.8 - state.ty * 2.4, 4);
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
    state,
    // Resolves true once the suit is on stage, false if a later call won.
    setSuit(spec, { instant = false } = {}) {
      wanted += 1;
      const ticket = wanted;
      return loadModel(spec.model).then((meshes) => {
        if (ticket !== wanted) return false;
        build(spec, meshes);
        scan = 1;
        if (instant) appear = 1;
        applyVisibility();
        still();
        return true;
      });
    },
    // Starts fetching a suit the visitor is about to pick.
    preload(spec) {
      loadModel(spec.model).catch(() => {});
    },
    // `instant` skips the scan line (reduced motion).
    setPass(next, { instant = false } = {}) {
      if (next === pass && scan >= 1) return;
      from = pass;
      pass = next;
      scan = instant ? 1 : 0;
      applyVisibility();
      still();
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
