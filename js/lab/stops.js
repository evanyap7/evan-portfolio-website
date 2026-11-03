// Each stop's set pieces, placed in its group (scene.js turns a stop's group to
// face the camera there, so in a set +x is screen right and +z is toward the
// visitor). About: Evan as a hologram over a projector disc, its beam and the
// light it throws, a bar in warm wood behind him to the left, and the screen
// on the wall that the About panel stands in front of.

import { createHologram } from './hologram.js';
import * as props from './props.js';

const HUE = 196 / 360;
const PORTRAIT = new URL('../../img/evan-holo.webp', import.meta.url).href;
const HOLO = { height: 1.5, foot: 1.0, turn: 0.55 }; // larger than life; its foot floats above the beam
const BEAM = { bottom: 0.11, height: 1.3, from: 0.36, to: 0.7 };
const GLOW = { near: 6, far: 12, intensity: 6 }; // the hologram's light, by the camera's distance

const beamVertex = /* glsl */ `
  varying float vH;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vH = uv.y;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vView = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

// A soft cone of light: brightest where it is thickest to the eye, fading as
// it rises, with faint bands drifting up it.
const beamFragment = /* glsl */ `
  uniform vec3 arc;
  uniform float time;
  varying float vH;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    float body = pow(abs(dot(vNormal, vView)), 2.0);
    // Clamped: vH can overshoot 1 between vertices, and pow of a negative is
    // NaN, which the bloom spreads over the whole frame.
    float h = clamp(vH, 0.0, 1.0);
    float fall = pow(1.0 - h, 1.6) * smoothstep(0.0, 0.06, h);
    float bands = 0.85 + 0.15 * sin(h * 54.0 - time * 3.0);
    gl_FragColor = vec4(arc * body * fall * bands * 0.32, 1.0);
  }
`;

const discVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// The projector's lens, and the pool of light it leaves on the floor: a glow
// from the middle with rings running out from it (the lens only).
const discFragment = /* glsl */ `
  uniform vec3 arc;
  uniform float time;
  uniform float strength;
  uniform float rings;
  varying vec2 vUv;
  void main() {
    float r = length(vUv - 0.5) * 2.0;
    float core = pow(max(0.0, 1.0 - r), 2.2);
    float ripple = (0.5 + 0.5 * sin(r * 30.0 - time * 2.0)) * (1.0 - r) * step(r, 1.0);
    gl_FragColor = vec4(arc * (core + ripple * rings) * strength, 1.0);
  }
`;

// The wall screen's face: a dark pane with a fine grid and a few lit rules, so
// it reads as a screen at rest behind the panel's words.
function screenTexture(THREE) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 288;
  const g = canvas.getContext('2d');
  g.fillStyle = '#04121b';
  g.fillRect(0, 0, 512, 288);
  g.strokeStyle = 'rgba(120, 210, 255, 0.07)';
  g.lineWidth = 1;
  for (let x = 0; x <= 512; x += 32) { g.beginPath(); g.moveTo(x + 0.5, 0); g.lineTo(x + 0.5, 288); g.stroke(); }
  for (let y = 0; y <= 288; y += 32) { g.beginPath(); g.moveTo(0, y + 0.5); g.lineTo(512, y + 0.5); g.stroke(); }
  g.fillStyle = 'rgba(140, 220, 255, 0.55)';
  g.fillRect(24, 22, 150, 4);
  g.fillStyle = 'rgba(140, 220, 255, 0.18)';
  [56, 72, 88, 104, 132, 148, 164, 192, 208].forEach((y, i) => g.fillRect(24, y, 230 - ((i * 37) % 90), 3));
  g.strokeStyle = 'rgba(140, 220, 255, 0.35)';
  g.strokeRect(300.5, 56.5, 186, 186);
  g.beginPath();
  g.arc(393, 149, 62, 0, Math.PI * 2);
  g.stroke();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Builds the sets now and returns { anchors, loaded }: the About things'
// anchors by id, and a promise that settles when the portrait is in.
export function buildStops(lab) {
  const { THREE, scene, camera, renderer, materials } = lab;
  const arc = new THREE.Color().setHSL(HUE, 0.9, 0.62);
  const set = new THREE.Group();
  set.name = 'about';
  lab.add('about', set);
  set.updateWorldMatrix(true, false);
  const timed = [];
  const additive = (vertexShader, fragmentShader, uniforms = {}) => {
    const material = new THREE.ShaderMaterial({
      uniforms: { arc: { value: arc }, time: { value: 0 }, ...uniforms },
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    timed.push(material);
    return material;
  };

  // The projector: a low drum of brushed metal, a lit ring round its lens.
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.58, 0.1, 48), materials.metal);
  drum.position.y = 0.05;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.47, 0.012, 6, 64), materials.strip(3));
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.102;
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.44, 48),
    additive(discVertex, discFragment, { strength: { value: 1.3 }, rings: { value: 0.3 } }));
  lens.rotation.x = -Math.PI / 2;
  lens.position.y = 0.104;
  const pool = new THREE.Mesh(new THREE.CircleGeometry(1.9, 48),
    additive(discVertex, discFragment, { strength: { value: 0.22 }, rings: { value: 0 } }));
  pool.rotation.x = -Math.PI / 2;
  pool.position.y = 0.004;
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(BEAM.to, BEAM.from, BEAM.height, 48, 1, true),
    additive(beamVertex, beamFragment));
  beam.position.y = BEAM.bottom + BEAM.height / 2;
  beam.material.side = THREE.DoubleSide;
  beam.renderOrder = 1;
  set.add(drum, ring, lens, pool, beam);

  // The furniture: the things that say who he is, each standing on something.
  const anchors = { ...furnish(THREE, materials, set), ...shelf(lab) };

  // The wall screen, on the left wall where the About panel stands in front
  // of it on a wide screen. Placed in the hall's own terms, then brought into
  // the set.
  const screen = new THREE.Group();
  const bezel = new THREE.Mesh(new THREE.BoxGeometry(3.3, 1.9, 0.05), materials.lacquer);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(3.16, 1.76),
    new THREE.MeshBasicMaterial({ map: screenTexture(THREE), color: new THREE.Color(0.75, 0.75, 0.75) }));
  face.position.z = 0.027;
  const edge = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.012, 0.02), materials.strip(1.4));
  edge.position.set(0, -0.96, 0.02);
  screen.add(bezel, face, edge);
  screen.position.copy(set.worldToLocal(new THREE.Vector3(-5.95, 2.05, -8.3)));
  const turn = set.getWorldQuaternion(new THREE.Quaternion()).invert();
  screen.quaternion.copy(turn.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI / 2, 0))));
  set.add(screen);

  // The hologram's light on the room, in the scene from the start and never
  // taken out (a light coming or going recompiles every material); it fades
  // with the camera's distance instead.
  const glow = new THREE.PointLight(arc, 0, 7, 2);
  glow.position.copy(set.localToWorld(new THREE.Vector3(0, 1.7, 0.4)));
  scene.add(glow);

  let time = 0;
  let holo = null;
  const eye = new THREE.Vector3();
  lab.onFrame((dt) => {
    time += dt;
    timed.forEach((m) => { m.uniforms.time.value = time; });
    const fade = Math.min(1, Math.max(0, (GLOW.far - camera.position.distanceTo(glow.position)) / (GLOW.far - GLOW.near)));
    glow.intensity = GLOW.intensity * fade;
    if (!holo) return;
    holo.step(time);
    // He turns a little to keep facing the visitor as they pass, and drifts.
    set.worldToLocal(eye.copy(camera.position));
    holo.mesh.rotation.y = Math.min(HOLO.turn, Math.max(-HOLO.turn, Math.atan2(eye.x, eye.z)));
    holo.mesh.position.y = HOLO.foot + 0.015 * Math.sin(time * 0.8);
  });

  const loaded = new THREE.TextureLoader().loadAsync(PORTRAIT).then((texture) => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    holo = createHologram(THREE, texture, { height: HOLO.height });
    holo.mesh.position.y = HOLO.foot;
    set.add(holo.mesh);
  });
  return { anchors, loaded };
}

const put = (object, parent, [x, y, z], turn = 0) => {
  object.position.set(x, y, z);
  object.rotation.y = turn;
  parent.add(object);
  return object;
};

const words = (node) => (node ? (node.getAttribute?.('alt') || node.textContent).replace(/\s+/g, ' ').trim() : '');

// About's furniture, in the set's terms: the bar behind him to the left (the
// coffee machine and his kopi on it, the beret and hockey stick on the shelf
// above), the gym to his right (a loaded bar on the rack, the floorball stick
// leaning on it), and his guitar on its stand by the projector. Returns each
// thing's anchor by the id the page's list uses (data-thing).
function furnish(THREE, materials, set) {
  // Both pieces stand back and in, so each thing's spot lands inside the
  // room's window at every width (their far ends may run out of it).
  const bar = put(props.barCounter(THREE, materials), set, [-1.55, 0, -1.9], 0.3);
  const top = bar.userData.anchor.position.y;
  const coffee = put(props.coffeeMachine(THREE, materials), bar, [0.45, top, -0.04]);
  put(props.kopiCup(THREE, materials), bar, [0.1, top, 0.18]);
  const shelf = put(props.wallShelf(THREE, materials), bar, [0, top, -0.3]);
  const ledge = shelf.userData.anchor.position.y;
  // The beret is kept on display, a little larger than worn, so it reads.
  const beret = put(props.beret(THREE, materials), shelf, [0.3, ledge, 0.06], 0.3);
  beret.scale.setScalar(1.4);
  // The hockey stick leans on the front of the bar, clear of the hologram.
  const hockey = put(props.hockeyStick(THREE, materials), bar, [0.3, 0, 0.38]);
  hockey.rotation.x = -0.1;

  const rack = put(props.powerRack(THREE, materials), set, [1.55, 0, -1.85], -0.35);
  const barbell = put(props.barbell(THREE, materials), rack, [0, 1.375, 0.55]);
  // The floorball stick leans on the rack's near upright.
  const floorball = put(props.floorballStick(THREE, materials), rack, [-0.4, 0.02, 0.36], 0.2);
  floorball.rotation.z = -0.12;

  const stand = put(props.guitarStand(THREE, materials), set, [0.95, 0, 0.4], -0.45);
  const guitar = put(props.guitar(THREE, materials), stand, [0, 0.125, 0.01]);
  guitar.rotation.x = -0.25;

  const anchor = (object) => object.userData.anchor;
  return {
    barbell: anchor(barbell),
    floorball: anchor(floorball),
    coffee: anchor(coffee),
    guitar: anchor(guitar),
    beret: anchor(beret),
    hockey: anchor(hockey),
  };
}

// Experience: the trophy shelf, back to the left wall, one tier for each part
// of the section's list, top first: the roles as plaques, the awards as
// trophies, the scholarship's medal, the certificates and the diplomas. Their
// words come from the page. Returns each thing's anchor by its data-item.
const TIERS = ['Roles', 'Awards', 'Scholarship', 'Certifications', 'Education'];
const PLACES = { top5: 'top5', second: 'second', nominated: 'nominated', combat: 'unit' };

function shelf(lab) {
  const { THREE, materials } = lab;
  const section = document.getElementById('experience');
  if (!section) return {};
  const set = new THREE.Group();
  set.name = 'experience';
  lab.add('experience', set);
  set.updateWorldMatrix(true, false);

  // Placed in the hall's own terms (its back on the wall at x = -6, between
  // two pilasters), then brought into the set.
  const unit = props.shelfUnit(THREE, materials, TIERS);
  const depth = unit.userData.depth;
  unit.position.copy(set.worldToLocal(new THREE.Vector3(-6 + 0.01 + depth / 2, 0, -35.25)));
  const turn = set.getWorldQuaternion(new THREE.Quaternion()).invert();
  unit.quaternion.copy(turn.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI / 2, 0))));
  set.add(unit);

  const [roles, awards, scholarship, certificates, education] = unit.userData.levels;
  const item = (id) => section.querySelector(`[data-item="${id}"]`);
  const anchors = {};
  // Each thing's spot sits on the shelf's lip in front of it, like a museum
  // label, so the dot never hides the thing itself.
  const place = (id, object, level, x, z = 0) => {
    put(object, unit, [x, level, z]);
    const label = new THREE.Object3D();
    label.position.set(x, level + 0.03, depth / 2 - 0.015);
    unit.add(label);
    anchors[id] = label;
  };
  const row = (x) => [-0.66, -0.22, 0.22, 0.66][x];

  ['univers', 'fitness', 'nugget', 'army'].forEach((id, i) => {
    const role = item(id);
    if (!role) return;
    const org = role.querySelector('.role__org');
    const name = words(org?.querySelector('img') ?? org);
    place(id, props.plaque(THREE, materials, { name, dates: words(role.querySelector('.role__dates')) }), roles, row(i), -0.02);
  });
  Object.keys(PLACES).forEach((id, i) => {
    if (item(id)) place(id, props.trophy(THREE, materials, { place: PLACES[id] }), awards, row(i), 0.01);
  });
  if (item('scholarship')) {
    place('scholarship', props.medal(THREE, materials, { words: [words(item('scholarship').querySelector('dt')).toUpperCase()] }), scholarship, 0, -0.02);
  }
  ['vertex', 'cpt'].forEach((id, i) => {
    const row_ = item(id);
    if (!row_) return;
    const by = words(row_.querySelector('dd')).split(/(?<=\.)\s/)[0];
    place(id, props.certificate(THREE, materials, { title: words(row_.querySelector('dt')), by }), certificates, i ? 0.42 : -0.42, -0.02);
  });
  ['sutd', 'vinuni', 'vjc'].forEach((id, i) => {
    if (item(id)) place(id, props.diploma(THREE, materials, { school: words(item(id).querySelector('dt')) }), education, [-0.6, 0, 0.6][i], -0.02);
  });
  return anchors;
}
