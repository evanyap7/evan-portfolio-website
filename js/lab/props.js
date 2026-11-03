// The furniture of the lab's first room, low-poly and at real size in metres,
// in the same materials as the suits and the room so they read as made
// together. Each builder takes (THREE, materials) and returns a Group whose
// origin is where it stands (or lies), with userData.anchor: the point a spot
// is held over.

// The few colours the room's own materials do not have, made once per set of
// materials.
const paints = new WeakMap();
function paint(THREE, materials) {
  if (!paints.has(materials)) {
    const standard = (color, roughness = 0.6, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
    paints.set(materials, {
      frame: standard(0x1c2127, 0.42, 0.6), // powder-coated steel
      red: standard(0xb3262b, 0.55, 0.05),
      blue: standard(0x2150a8, 0.55, 0.05),
      yellow: standard(0xd8a51f, 0.55, 0.05),
      white: standard(0xe9edf2, 0.4, 0.02),
      spruce: standard(0xd6a463, 0.45),
      rosewood: standard(0x4a2414, 0.4),
      ebony: standard(0x121010, 0.35),
      felt: standard(0x8e1b22, 1),
      kopi: standard(0x9a6438, 0.18),
      brass: standard(0xb48a4e, 0.32, 1),
      gold: standard(0xd8ad48, 0.22, 1),
      silverBlue: standard(0xa9c1d9, 0.2, 1),
      velvet: standard(0x0d1526, 1),
      paper: standard(0xece6d6, 0.85),
      star: new THREE.MeshStandardMaterial({
        color: 0xcfeeff, roughness: 0.04, metalness: 0.1, transparent: true, opacity: 0.5,
        emissive: 0x2a6f99, emissiveIntensity: 0.35, depthWrite: false,
      }),
      starEdge: new THREE.LineBasicMaterial({ color: new THREE.Color(0x9fe2ff).multiplyScalar(1.5), toneMapped: false }),
      // The soft light behind each of the shelf's tiers.
      glow: new THREE.MeshBasicMaterial({
        map: glowTexture(THREE), color: new THREE.Color(0.55, 0.75, 0.95), transparent: true,
        blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
      }),
      mug: new THREE.MeshStandardMaterial({
        color: 0xeaf6ff, roughness: 0.05, transparent: true, opacity: 0.28, depthWrite: false,
      }),
      warm: new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffb36b).multiplyScalar(1.4), toneMapped: false }),
    });
  }
  return paints.get(materials);
}

const anchored = (THREE, group, x, y, z) => {
  const anchor = new THREE.Object3D();
  anchor.position.set(x, y, z);
  group.add(anchor);
  group.userData.anchor = anchor;
  return group;
};

const box = (THREE, w, h, d, material, x = 0, y = 0, z = 0) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  return mesh;
};

// A cylinder lying along x.
const rod = (THREE, radius, length, material, x = 0, y = 0, z = 0, segments = 20) => {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, segments), material);
  mesh.rotation.z = Math.PI / 2;
  mesh.position.set(x, y, z);
  return mesh;
};

// An Olympic bar, 2.2 m, along x, loaded to 180 kg: two reds, a blue and a
// yellow a side, in competition colours. Its origin is the bar's middle.
export function barbell(THREE, materials) {
  const p = paint(THREE, materials);
  const group = new THREE.Group();
  group.add(rod(THREE, 0.014, 1.31, materials.metal));
  const plates = [[p.red, 0.225, 0.027], [p.red, 0.225, 0.027], [p.blue, 0.225, 0.023], [p.yellow, 0.2, 0.021]];
  [-1, 1].forEach((side) => {
    group.add(rod(THREE, 0.025, 0.415, materials.metal, side * (0.655 + 0.2075)));
    let x = 0.7;
    plates.forEach(([material, radius, thick]) => {
      group.add(rod(THREE, radius, thick, material, side * (x + thick / 2), 0, 0, 28));
      x += thick + 0.002;
    });
    group.add(rod(THREE, 0.034, 0.03, materials.metal, side * (x + 0.015)));
  });
  return anchored(THREE, group, 0, 0, 0);
}

// A power rack, 1.1 m wide and 2.25 m tall, on a rubber platform, its J-hooks
// at 1.32 m. Origin on the floor at its middle; the front faces +z.
export function powerRack(THREE, materials) {
  const p = paint(THREE, materials);
  const group = new THREE.Group();
  const W = 0.55;
  const D = 0.45;
  const H = 2.25;
  group.add(box(THREE, 1.9, 0.02, 1.5, materials.rubber, 0, 0.01, 0.1));
  [[-W, -D], [W, -D], [-W, D], [W, D]].forEach(([x, z]) => group.add(box(THREE, 0.07, H, 0.07, p.frame, x, H / 2 + 0.02, z)));
  [-D, D].forEach((z) => group.add(box(THREE, 2 * W + 0.07, 0.07, 0.07, p.frame, 0, H - 0.015, z)));
  [-W, W].forEach((x) => {
    group.add(box(THREE, 0.07, 0.07, 2 * D + 0.07, p.frame, x, H - 0.015, 0));
    group.add(box(THREE, 0.07, 0.05, 2 * D + 0.07, p.frame, x, 0.045, 0));
    // The safety pins, and a J-hook on each front upright.
    const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 2 * D + 0.25, 12), materials.metal);
    pin.rotation.x = Math.PI / 2;
    pin.position.set(x, 0.78, 0);
    group.add(pin);
    group.add(box(THREE, 0.08, 0.1, 0.09, p.frame, x, 1.3, D + 0.075));
    group.add(box(THREE, 0.08, 0.05, 0.02, p.frame, x, 1.36, D + 0.115));
  });
  // A thin lit line up each front upright, the room's blue.
  [-W, W].forEach((x) => group.add(box(THREE, 0.008, H - 0.3, 0.004, materials.strip(1.2), x, H / 2, D + 0.037)));
  return anchored(THREE, group, 0, 2.0, D);
}

// A floorball stick, 0.96 m: a carbon shaft with a white grip, and a hooked
// white blade. Its origin is the heel of the blade on the floor; it stands up
// +y, the blade pointing +x.
export function floorballStick(THREE, materials) {
  const p = paint(THREE, materials);
  const group = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.012, 0.86, 12), materials.lacquer);
  shaft.position.y = 0.52;
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.0145, 0.0145, 0.3, 12), p.white);
  grip.position.y = 0.8;
  const blade = box(THREE, 0.27, 0.075, 0.012, p.white, 0.12, 0.045, 0);
  blade.rotation.y = -0.18;
  const hook = box(THREE, 0.06, 0.075, 0.012, p.white, 0.26, 0.045, 0.03);
  hook.rotation.y = -0.6;
  group.add(shaft, grip, blade, hook);
  return anchored(THREE, group, 0.05, 0.55, 0);
}

// The bar counter: warm wood under a dark top, a warm line of light under its
// lip. 1.9 m long, its top at 1.07 m. Origin on the floor at its middle; the
// customer side faces +z.
export function barCounter(THREE, materials) {
  const p = paint(THREE, materials);
  const group = new THREE.Group();
  group.add(box(THREE, 1.9, 1.0, 0.6, materials.wood, 0, 0.52, 0));
  group.add(box(THREE, 2.04, 0.05, 0.74, materials.lacquer, 0, 1.045, 0));
  group.add(box(THREE, 1.8, 0.04, 0.56, materials.rubber, 0, 0.02, 0));
  group.add(box(THREE, 1.9, 0.012, 0.012, p.warm, 0, 1.01, 0.31));
  return anchored(THREE, group, 0, 1.07, 0);
}

// An espresso machine in brushed steel: one group head with its portafilter,
// a steam wand, a lit gauge and a drip tray. 0.36 m wide. Origin under its
// middle; the front faces +z.
export function coffeeMachine(THREE, materials) {
  const group = new THREE.Group();
  group.add(box(THREE, 0.36, 0.34, 0.4, materials.metal, 0, 0.21, 0));
  group.add(box(THREE, 0.36, 0.04, 0.4, materials.lacquer, 0, 0.02, 0));
  group.add(box(THREE, 0.34, 0.012, 0.36, materials.lacquer, 0, 0.386, 0)); // the cup warmer
  group.add(box(THREE, 0.3, 0.015, 0.12, materials.lacquer, 0, 0.05, 0.25)); // the drip tray
  const head = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.045, 0.06, 20), materials.metal);
  head.position.set(-0.05, 0.27, 0.23);
  const basket = new THREE.Mesh(new THREE.CylinderGeometry(0.037, 0.033, 0.035, 20), materials.metal);
  basket.position.set(-0.05, 0.225, 0.23);
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.012, 0.13, 10), materials.rubber);
  handle.rotation.x = Math.PI / 2 - 0.25;
  handle.position.set(-0.05, 0.215, 0.32);
  const wand = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.18, 8), materials.metal);
  wand.position.set(0.12, 0.2, 0.23);
  wand.rotation.z = 0.15;
  const gauge = new THREE.Mesh(new THREE.CircleGeometry(0.034, 24), materials.lacquer);
  gauge.position.set(0.09, 0.31, 0.201);
  const bezel = new THREE.Mesh(new THREE.TorusGeometry(0.036, 0.004, 6, 28), materials.strip(1.6));
  bezel.position.set(0.09, 0.31, 0.202);
  group.add(head, basket, handle, wand, gauge, bezel);
  return anchored(THREE, group, 0, 0.3, 0.2);
}

// Kopi in a glass mug: condensed-milk brown, 0.1 m tall. Origin under it.
export function kopiCup(THREE, materials) {
  const p = paint(THREE, materials);
  const group = new THREE.Group();
  const kopi = new THREE.Mesh(new THREE.CylinderGeometry(0.037, 0.034, 0.075, 24), p.kopi);
  kopi.position.y = 0.04;
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.038, 0.1, 24, 1, true), p.mug);
  glass.position.y = 0.05;
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.006, 24), p.mug);
  base.position.y = 0.003;
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.026, 0.006, 8, 16, Math.PI), p.mug);
  handle.rotation.z = -Math.PI / 2;
  handle.position.set(0.042, 0.05, 0);
  group.add(kopi, glass, base, handle);
  return anchored(THREE, group, 0, 0.06, 0);
}

// An acoustic guitar, about 1 m: a spruce top on rosewood sides, the waisted
// body drawn as one outline, a soundhole, an ebony neck and six strings.
// Origin at the bottom of the body; it stands up +y, its top facing +z.
export function guitar(THREE, materials) {
  const p = paint(THREE, materials);
  const group = new THREE.Group();
  const outline = new THREE.Shape();
  outline.moveTo(0, 0);
  outline.absarc(0, 0.19, 0.19, -Math.PI / 2, 0.7, false);
  outline.quadraticCurveTo(0.098, 0.35, 0.1147, 0.3897);
  outline.absarc(0, 0.47, 0.14, -0.61, Math.PI + 0.61, false);
  outline.quadraticCurveTo(-0.098, 0.35, -0.1455, 0.312);
  outline.absarc(0, 0.19, 0.19, Math.PI - 0.7, Math.PI * 1.5, false);
  const DEPTH = 0.09;
  const body = new THREE.Mesh(
    new THREE.ExtrudeGeometry(outline, { depth: DEPTH, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 2, curveSegments: 20 }),
    [p.spruce, p.rosewood],
  );
  body.position.z = -DEPTH / 2;
  const face = DEPTH / 2 + 0.0065;
  const hole = new THREE.Mesh(new THREE.CircleGeometry(0.044, 28), p.ebony);
  hole.position.set(0, 0.36, face);
  const rosette = new THREE.Mesh(new THREE.RingGeometry(0.048, 0.056, 28), p.rosewood);
  rosette.position.set(0, 0.36, face + 0.0005);
  const bridge = box(THREE, 0.13, 0.025, 0.008, p.ebony, 0, 0.14, face + 0.004);
  const neck = box(THREE, 0.052, 0.44, 0.026, p.rosewood, 0, 0.81, 0.008);
  const board = box(THREE, 0.054, 0.5, 0.006, p.ebony, 0, 0.77, 0.024);
  const head = box(THREE, 0.085, 0.17, 0.02, p.ebony, 0, 1.105, 0);
  head.rotation.x = -0.25;
  group.add(body, hole, rosette, bridge, neck, board, head);
  for (let i = 0; i < 6; i++) {
    const string = box(THREE, 0.0014, 0.87, 0.0014, materials.metal, (i - 2.5) * 0.008, 0.585, face + 0.012);
    group.add(string);
  }
  return anchored(THREE, group, 0, 0.36, face);
}

// A guitar stand: a tripod base, a cradle at 0.12 m and a yoke at 0.82 m for
// the neck, tilted back. Origin on the floor; the guitar faces +z.
export function guitarStand(THREE, materials) {
  const group = new THREE.Group();
  const spine = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.86, 10), materials.lacquer);
  spine.position.set(0, 0.42, -0.14);
  spine.rotation.x = -0.2;
  group.add(spine);
  [-0.6, 0.6, Math.PI].forEach((angle) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.32, 8), materials.lacquer);
    leg.rotation.z = Math.PI / 2;
    leg.rotation.y = angle + Math.PI / 2;
    leg.position.set(Math.sin(angle) * 0.14, 0.02, Math.cos(angle) * 0.14 - 0.1);
    group.add(leg);
  });
  group.add(box(THREE, 0.32, 0.03, 0.05, materials.rubber, 0, 0.11, 0.02));
  group.add(box(THREE, 0.08, 0.02, 0.04, materials.rubber, 0, 0.8, -0.2));
  return anchored(THREE, group, 0, 0.5, 0);
}

// A commando's red beret, its leather band and its badge. Origin under it.
export function beret(THREE, materials) {
  const p = paint(THREE, materials);
  const group = new THREE.Group();
  const crown = new THREE.Mesh(new THREE.SphereGeometry(0.14, 24, 12), p.felt);
  crown.scale.set(1.08, 0.3, 1);
  crown.position.set(0.02, 0.045, 0);
  crown.rotation.z = -0.12;
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.011, 8, 32), materials.lacquer);
  band.rotation.x = Math.PI / 2;
  band.position.y = 0.012;
  const badge = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.006, 16), materials.metal);
  badge.rotation.x = Math.PI / 2;
  badge.position.set(-0.07, 0.05, 0.09);
  group.add(crown, band, badge);
  return anchored(THREE, group, 0, 0.06, 0);
}

// A field hockey stick, about 0.9 m: a dark composite shaft with a red band,
// a towelling grip and the J of its hook. Origin at the hook's foot; it runs
// up +y, the hook curling toward +x.
export function hockeyStick(THREE, materials) {
  const p = paint(THREE, materials);
  const group = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.019, 0.78, 12), materials.lacquer);
  shaft.position.set(-0.04, 0.47, 0);
  shaft.scale.z = 0.75;
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.0195, 0.0195, 0.1, 12), p.red);
  band.position.set(-0.04, 0.32, 0);
  band.scale.z = 0.76;
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.019, 0.26, 12), materials.fabric);
  grip.position.set(-0.04, 0.73, 0);
  const hook = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.019, 10, 20, Math.PI), materials.lacquer);
  hook.rotation.z = Math.PI;
  hook.position.set(0, 0.08, 0);
  hook.scale.z = 0.75;
  group.add(shaft, band, grip, hook);
  return anchored(THREE, group, -0.04, 0.45, 0);
}

// A back-bar shelf: a dark board on two steel posts that rise from the bar's
// back edge, a lit line under its front. 1.6 m long. Origin on the counter top
// under its middle; the board's top is at 0.72 m.
export function wallShelf(THREE, materials) {
  const p = paint(THREE, materials);
  const group = new THREE.Group();
  [-0.7, 0.7].forEach((x) => group.add(box(THREE, 0.035, 1.05, 0.035, p.frame, x, 0.525, 0)));
  group.add(box(THREE, 1.6, 0.035, 0.26, materials.lacquer, 0, 0.7, 0.06));
  group.add(box(THREE, 1.6, 0.006, 0.006, materials.strip(1.4), 0, 0.68, 0.19));
  return anchored(THREE, group, 0, 0.72, 0.06);
}

// The trophy shelf (Experience) ----------------------------------------------
// One dark-lacquer unit with five lit tiers, each named on a brass plate in the
// site's mono, and the things on them: plaques for the roles, four trophies,
// the scholarship's medal in a shadow box, framed certificates and diplomas.
// Their words are painted on canvas in the page's own type.

const MONO = '"Azeret Mono", ui-monospace, "SF Mono", Menlo, monospace';
const SANS = '"Schibsted Grotesk", "Helvetica Neue", Arial, sans-serif';

// A canvas texture painted by draw(g, w, h), and painted again once the page's
// fonts are in, so its words are never left in a fallback face.
function drawn(THREE, width, height, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const g = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  const paint = () => {
    g.clearRect(0, 0, width, height);
    draw(g, width, height);
    texture.needsUpdate = true;
  };
  paint();
  if (document.fonts?.load) {
    Promise.all([document.fonts.load(`600 40px ${MONO}`), document.fonts.load(`600 40px ${SANS}`)]).then(paint, () => {});
  }
  return texture;
}

// Sets a line of text no wider than max, shrinking it until it fits.
function line(g, text, { x, y, max, size, weight = 600, family = MONO, spacing = 0, color }) {
  if ('letterSpacing' in g) g.letterSpacing = `${spacing}px`;
  let s = size;
  g.font = `${weight} ${s}px ${family}`;
  while (g.measureText(text).width > max && s > 10) {
    s -= 2;
    g.font = `${weight} ${s}px ${family}`;
  }
  g.fillStyle = color;
  g.fillText(text, x, y);
  if ('letterSpacing' in g) g.letterSpacing = '0px';
}

// Splits text into at most two lines of roughly equal length, at a space.
function split(text, at = 16) {
  if (text.length <= at) return [text];
  const mid = text.length / 2;
  let best = -1;
  for (let i = 0; i < text.length; i++) if (text[i] === ' ' && (best < 0 || Math.abs(i - mid) < Math.abs(best - mid))) best = i;
  return best < 0 ? [text] : [text.slice(0, best), text.slice(best + 1)];
}

// Brushed brass with engraved words: each line { text, size }, centred.
function brass(THREE, lines, width = 512, height = 96) {
  return drawn(THREE, width, height, (g, w, h) => {
    const ground = g.createLinearGradient(0, 0, w, h);
    ground.addColorStop(0, '#8d6c3b');
    ground.addColorStop(0.45, '#d6b37b');
    ground.addColorStop(1, '#9a7744');
    g.fillStyle = ground;
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < h; i += 2) {
      g.fillStyle = `rgba(255, 240, 210, ${0.04 + 0.05 * Math.abs(Math.sin(i * 12.9898))})`;
      g.fillRect(0, i, w, 1);
    }
    g.strokeStyle = 'rgba(60, 40, 15, 0.55)';
    g.lineWidth = 3;
    g.strokeRect(6, 6, w - 12, h - 12);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    const total = lines.reduce((sum, l) => sum + l.size * 1.25, 0);
    let y = h / 2 - total / 2;
    lines.forEach((l) => {
      y += (l.size * 1.25) / 2;
      const spec = { x: w / 2, max: w - 48, size: l.size, weight: l.weight ?? 600, spacing: l.spacing ?? l.size * 0.14 };
      line(g, l.text, { ...spec, y: y + 1.5, color: 'rgba(255, 236, 196, 0.45)' });
      line(g, l.text, { ...spec, y, color: '#2b1d0c' });
      y += (l.size * 1.25) / 2;
    });
  });
}

const brassMaterial = (THREE, map) => new THREE.MeshStandardMaterial({ map, metalness: 0.55, roughness: 0.38 });

// A plane with a texture on it, facing +z.
const face = (THREE, w, h, material, x = 0, y = 0, z = 0) => {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material);
  mesh.position.set(x, y, z);
  return mesh;
};

// The light behind a tier: brightest low in the middle, gone at the edges.
function glowTexture(THREE) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const g = canvas.getContext('2d');
  const fill = g.createRadialGradient(128, 46, 4, 128, 46, 128);
  fill.addColorStop(0, 'rgba(255,255,255,0.55)');
  fill.addColorStop(0.5, 'rgba(255,255,255,0.16)');
  fill.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = fill;
  g.fillRect(0, 0, 256, 64);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Things that lean back on a strut: the face's group is tilted, its foot on
// the shelf. Returns [outer, tilted].
function leaning(THREE, materials, height, tilt = 0.14) {
  const p = paint(THREE, materials);
  const group = new THREE.Group();
  const lean = new THREE.Group();
  lean.rotation.x = -tilt;
  group.add(lean);
  const strut = box(THREE, 0.025, height * 0.8, 0.008, p.frame, 0, height * 0.38, -height * 0.16);
  strut.rotation.x = 0.32;
  group.add(strut);
  return [group, lean];
}

const anchorIn = (THREE, group, lean, x, y, z) => {
  anchored(THREE, lean, x, y, z);
  group.userData.anchor = lean.userData.anchor;
  return group;
};

// A role's plaque: a walnut board, 0.3 × 0.23 m, with a brass plate engraved
// with the organisation and the dates. Origin under its foot; it faces +z.
export function plaque(THREE, materials, { name, dates = '' }) {
  const W = 0.3;
  const H = 0.23;
  const [group, lean] = leaning(THREE, materials, H);
  lean.add(box(THREE, W, H, 0.024, materials.wood, 0, H / 2, 0));
  const words = split(name.toUpperCase(), 14).map((text) => ({ text, size: 44 }));
  if (dates) words.push({ text: dates, size: 26, weight: 500, spacing: 2 });
  const plate = face(THREE, W - 0.06, H - 0.07, brassMaterial(THREE, brass(THREE, words, 512, 320)), 0, H / 2, 0.0125);
  lean.add(plate);
  return anchorIn(THREE, group, lean, 0, H / 2, 0.02);
}

// A trophy on a stepped black base, by the place it was won:
//   second    a gold cup with two handles
//   top5      a slim lidded urn in silver-blue
//   nominated a glass star on a steel post
//   unit      a wide regimental cup in silver on a wooden plinth, a red band round it
// Origin under its base; it faces +z.
export function trophy(THREE, materials, { place }) {
  const p = paint(THREE, materials);
  const group = new THREE.Group();
  const lathe = (points, material, segments = 40) => new THREE.Mesh(
    new THREE.LatheGeometry(points.map(([x, y]) => new THREE.Vector2(x, y)), segments), material);
  const handles = (radius, tube, x, y, material) => [-1, 1].forEach((side) => {
    const handle = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 8, 20, Math.PI), material);
    handle.rotation.z = -side * Math.PI / 2;
    handle.position.set(side * x, y, 0);
    group.add(handle);
  });
  const base = (material = materials.lacquer) => {
    group.add(box(THREE, 0.12, 0.04, 0.12, material, 0, 0.02, 0));
    group.add(box(THREE, 0.09, 0.025, 0.09, material, 0, 0.0525, 0));
    group.add(box(THREE, 0.07, 0.016, 0.002, p.brass, 0, 0.02, 0.061));
  };

  if (place === 'second') {
    base();
    group.add(lathe([[0, 0.065], [0.032, 0.065], [0.03, 0.075], [0.011, 0.09], [0.009, 0.15], [0.016, 0.16], [0.012, 0.168],
      [0.03, 0.18], [0.058, 0.22], [0.072, 0.27], [0.076, 0.3], [0.072, 0.3], [0.068, 0.275], [0.054, 0.228], [0.02, 0.19]], p.gold));
    handles(0.032, 0.006, 0.066, 0.245, p.gold);
    return anchored(THREE, group, 0, 0.24, 0.07);
  }
  if (place === 'top5') {
    base();
    group.add(lathe([[0, 0.065], [0.026, 0.065], [0.018, 0.08], [0.014, 0.17], [0.03, 0.18], [0.05, 0.21], [0.055, 0.25],
      [0.046, 0.29], [0.03, 0.3], [0.036, 0.308], [0, 0.312]], p.silverBlue));
    const finial = new THREE.Mesh(new THREE.SphereGeometry(0.016, 16, 10), p.silverBlue);
    finial.position.y = 0.33;
    group.add(finial);
    return anchored(THREE, group, 0, 0.24, 0.05);
  }
  if (place === 'nominated') {
    base();
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.09, 10), materials.metal);
    post.position.y = 0.11;
    group.add(post);
    const outline = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const a = Math.PI / 2 + (i * Math.PI) / 5;
      const r = i % 2 ? 0.036 : 0.085;
      if (i === 0) outline.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else outline.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    outline.closePath();
    const geometry = new THREE.ExtrudeGeometry(outline, { depth: 0.02, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 1 });
    geometry.translate(0, 0, -0.01);
    const star = new THREE.Mesh(geometry, p.star);
    star.position.y = 0.225;
    star.add(new THREE.LineSegments(new THREE.EdgesGeometry(geometry, 20), p.starEdge));
    group.add(star);
    return anchored(THREE, group, 0, 0.225, 0.03);
  }
  // The regimental cup.
  group.add(box(THREE, 0.14, 0.08, 0.14, materials.wood, 0, 0.04, 0));
  group.add(box(THREE, 0.145, 0.02, 0.145, p.felt, 0, 0.05, 0));
  group.add(lathe([[0, 0.08], [0.04, 0.08], [0.035, 0.09], [0.014, 0.105], [0.012, 0.14], [0.04, 0.155], [0.085, 0.19],
    [0.1, 0.24], [0.102, 0.262], [0.097, 0.262], [0.094, 0.24], [0.08, 0.195], [0.03, 0.165]], materials.metal, 48));
  handles(0.042, 0.007, 0.1, 0.215, materials.metal);
  return anchored(THREE, group, 0, 0.2, 0.1);
}

// The scholarship's medal: gold on a red ribbon, in a velvet-backed shadow
// box under glass, 0.3 × 0.34 m, a brass plate at its foot. Origin under it.
export function medal(THREE, materials, { words = ['1 OF 6'] } = {}) {
  const p = paint(THREE, materials);
  const W = 0.3;
  const H = 0.34;
  const D = 0.05;
  const [group, lean] = leaning(THREE, materials, H, 0.08);
  lean.add(box(THREE, W, H, 0.01, p.velvet, 0, H / 2, -D / 2));
  [[0, H - 0.01, W, 0.02], [0, 0.01, W, 0.02]].forEach(([x, y, w, h]) => lean.add(box(THREE, w, h, D, materials.lacquer, x, y, 0)));
  [-1, 1].forEach((side) => lean.add(box(THREE, 0.02, H, D, materials.lacquer, side * (W / 2 - 0.01), H / 2, 0)));
  // The ribbon: two strands from the top meeting at the medal, white-striped.
  [-1, 1].forEach((side) => {
    const strand = new THREE.Group();
    strand.add(box(THREE, 0.036, 0.15, 0.002, p.red));
    strand.add(box(THREE, 0.008, 0.15, 0.003, p.white));
    strand.position.set(side * 0.028, 0.245, -D / 2 + 0.008);
    strand.rotation.z = side * 0.36;
    lean.add(strand);
  });
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.008, 40), p.gold);
  disc.rotation.x = Math.PI / 2;
  disc.position.set(0, 0.14, -D / 2 + 0.012);
  const relief = new THREE.Mesh(new THREE.CylinderGeometry(0.033, 0.033, 0.01, 32), p.brass);
  relief.rotation.x = Math.PI / 2;
  relief.position.copy(disc.position);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.004, 8, 40), p.gold);
  rim.position.copy(disc.position);
  lean.add(disc, relief, rim);
  lean.add(face(THREE, 0.17, 0.034, brassMaterial(THREE, brass(THREE, words.map((text) => ({ text, size: 40 })), 512, 100)), 0, 0.05, -D / 2 + 0.006));
  lean.add(face(THREE, W - 0.03, H - 0.03, materials.glass, 0, H / 2, D / 2));
  return anchorIn(THREE, group, lean, 0, 0.14, 0);
}

// Paper with a printed certificate or diploma on it.
function document_(THREE, { kind, title, by = '', portrait = false }) {
  const [w, h] = portrait ? [384, 512] : [512, 368];
  return drawn(THREE, w, h, (g) => {
    g.fillStyle = '#efe9dc';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = '#7d8a99';
    g.lineWidth = 3;
    g.strokeRect(16, 16, w - 32, h - 32);
    g.lineWidth = 1;
    g.strokeRect(24, 24, w - 48, h - 48);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    line(g, kind, { x: w / 2, y: h * 0.17, max: w - 80, size: 20, weight: 500, spacing: 6, color: '#5d6874' });
    const lines = split(title, portrait ? 14 : 22);
    lines.forEach((text, i) => line(g, text, {
      x: w / 2, y: h * (portrait ? 0.4 : 0.36) + i * 40, max: w - 80, size: 34, family: SANS, color: '#1c2229',
    }));
    if (by) line(g, by, { x: w / 2, y: h * (portrait ? 0.58 : 0.6), max: w - 100, size: 18, weight: 500, family: SANS, color: '#4a535d' });
    g.fillStyle = 'rgba(40, 50, 60, 0.25)';
    [0.7, 0.74].forEach((t) => g.fillRect(w * 0.2, h * (portrait ? t + 0.06 : t + 0.04), w * 0.32, 2));
    const seal = g.createRadialGradient(w * 0.76, h * 0.8, 2, w * 0.76, h * 0.8, 34);
    seal.addColorStop(0, '#e6c06a');
    seal.addColorStop(1, '#9b7432');
    g.fillStyle = seal;
    g.beginPath();
    g.arc(w * 0.76, h * 0.8, 30, 0, Math.PI * 2);
    g.fill();
  });
}

// A certificate in a thin steel frame, landscape, 0.36 × 0.26 m, leaning on
// its strut. Origin under its foot; it faces +z.
export function certificate(THREE, materials, { title, by = '' }) {
  const p = paint(THREE, materials);
  const W = 0.36;
  const H = 0.26;
  const [group, lean] = leaning(THREE, materials, H);
  lean.add(box(THREE, W, H, 0.016, p.frame, 0, H / 2, 0));
  const map = document_(THREE, { kind: 'CERTIFICATE', title, by });
  lean.add(face(THREE, W - 0.03, H - 0.03, new THREE.MeshStandardMaterial({ map, roughness: 0.85 }), 0, H / 2, 0.0085));
  return anchorIn(THREE, group, lean, 0, H / 2, 0.02);
}

// A diploma in a walnut frame with a cream mat, portrait, 0.26 × 0.34 m.
// Origin under its foot; it faces +z.
export function diploma(THREE, materials, { school }) {
  const p = paint(THREE, materials);
  const W = 0.26;
  const H = 0.34;
  const [group, lean] = leaning(THREE, materials, H, 0.12);
  lean.add(box(THREE, W, H, 0.02, materials.wood, 0, H / 2, 0));
  lean.add(face(THREE, W - 0.036, H - 0.036, p.paper, 0, H / 2, 0.0102));
  const map = document_(THREE, { kind: 'EDUCATION', title: school, portrait: true });
  lean.add(face(THREE, W - 0.07, H - 0.09, new THREE.MeshStandardMaterial({ map, roughness: 0.85 }), 0, H / 2, 0.0106));
  return anchorIn(THREE, group, lean, 0, H / 2, 0.02);
}

// The shelf unit: 2 m wide, 0.36 m deep, 2.44 m tall, one tier for each name
// (top first), 0.46 m apart over a 0.14 m plinth. Each tier has a brass plate
// with its name on the fascia under it, a lit line under the fascia above, and
// a soft light on the back. userData.levels: each tier's floor height, top
// first; userData.depth: its depth. Origin on the floor under its middle; its
// front faces +z.
export function shelfUnit(THREE, materials, names) {
  const group = new THREE.Group();
  const W = 2;
  const D = 0.36;
  const FOOT = 0.14;
  const STEP = 0.46;
  const T = 0.03;
  const n = names.length;
  const top = FOOT + STEP * n;
  const p = paint(THREE, materials);
  group.add(box(THREE, W + 0.08, top + 0.04, 0.02, materials.lacquer, 0, (top + 0.04) / 2, -D / 2 + 0.01));
  [-1, 1].forEach((side) => {
    group.add(box(THREE, 0.04, top + 0.04, D, materials.lacquer, side * (W / 2 + 0.02), (top + 0.04) / 2, 0));
    group.add(box(THREE, 0.044, top + 0.04, 0.008, materials.metal, side * (W / 2 + 0.02), (top + 0.04) / 2, D / 2 + 0.004));
  });
  group.add(box(THREE, W + 0.08, 0.04, D, materials.lacquer, 0, top + 0.02, 0));
  group.add(box(THREE, W + 0.08, FOOT, D, materials.lacquer, 0, FOOT / 2, 0));
  group.add(box(THREE, W, 0.006, 0.006, materials.strip(1), 0, 0.004, D / 2 + 0.01));
  const levels = [];
  for (let k = 0; k < n; k++) {
    const y = FOOT + STEP * k;
    const name = names[n - 1 - k];
    if (k > 0) group.add(box(THREE, W, T, D - 0.02, materials.lacquer, 0, y - T / 2, -0.01));
    group.add(box(THREE, W, 0.06, 0.012, materials.lacquer, 0, y - 0.03, D / 2 - 0.006));
    group.add(face(THREE, 0.44, 0.042, brassMaterial(THREE, brass(THREE, [{ text: name.toUpperCase(), size: 44, spacing: 9 }], 512, 64)),
      -W / 2 + 0.28, y - 0.03, D / 2 + 0.001));
    // The lit line under the fascia above (the cap, for the top tier).
    const ceiling = k === n - 1 ? top : y + STEP - 0.06;
    group.add(box(THREE, W - 0.04, 0.006, 0.006, materials.strip(1.8), 0, ceiling - 0.004, D / 2 - 0.02));
    group.add(face(THREE, W - 0.04, STEP - 0.04, p.glow, 0, y + (STEP - T) / 2, -D / 2 + 0.021));
    levels.unshift(y);
  }
  group.userData.levels = levels;
  group.userData.depth = D;
  return anchored(THREE, group, 0, top / 2, D / 2);
}

// The workbench (Toolkit) -----------------------------------------------------
// One long bench, brushed metal over dark lacquer, a pegboard behind it and a
// shelf above with a light strip under it; and on it one instrument for each
// kind of tool, left to right in the page's order. Their screens are painted
// on canvas; the things that move (the neural core turning, the scope's trace)
// are named in userData for the room to run.

const kits = new WeakMap();
function kit(THREE, materials) {
  if (!kits.has(materials)) {
    const lit = (color, k = 1) => new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k), toneMapped: false });
    kits.set(materials, {
      board: new THREE.MeshStandardMaterial({ map: boardTexture(THREE), roughness: 0.5, metalness: 0.15 }),
      peg: new THREE.MeshStandardMaterial({ map: pegTexture(THREE), roughness: 0.55, metalness: 0.45 }),
      keys: new THREE.MeshStandardMaterial({ map: keysTexture(THREE), roughness: 0.6 }),
      blue: lit(0x7fd8ff, 2.2),
      amber: lit(0xffb35c, 1.8),
      green: lit(0x7dffb0, 1.6),
      edge: new THREE.LineBasicMaterial({ color: new THREE.Color(0x8fe0ff).multiplyScalar(2.2), transparent: true, opacity: 0.85, toneMapped: false }),
    });
  }
  return kits.get(materials);
}

function canvasTexture(THREE, width, height, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d'), width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

// Perforated steel, a hole every 6 cm.
function pegTexture(THREE) {
  return canvasTexture(THREE, 1024, 384, (g, w, h) => {
    g.fillStyle = '#1b2229';
    g.fillRect(0, 0, w, h);
    const pitch = w / 46;
    for (let y = pitch / 2; y < h; y += pitch) {
      for (let x = pitch / 2; x < w; x += pitch) {
        g.fillStyle = '#05070a';
        g.beginPath();
        g.arc(x, y, 3.2, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = 'rgba(160, 190, 215, 0.12)';
        g.fillRect(x - 3, y + 3.4, 6, 1);
      }
    }
  });
}

// A circuit board: dark solder mask, copper traces, black chips with pins.
function boardTexture(THREE) {
  return canvasTexture(THREE, 256, 256, (g, w, h) => {
    g.fillStyle = '#0c2426';
    g.fillRect(0, 0, w, h);
    let seed = 7;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    g.strokeStyle = 'rgba(214, 170, 92, 0.75)';
    g.lineWidth = 2;
    for (let i = 0; i < 26; i++) {
      let x = rand() * w;
      let y = rand() * h;
      g.beginPath();
      g.moveTo(x, y);
      for (let k = 0; k < 3; k++) {
        if (rand() > 0.5) x += (rand() - 0.5) * 120;
        else y += (rand() - 0.5) * 120;
        g.lineTo(x, y);
      }
      g.stroke();
      g.fillStyle = '#d8ad5c';
      g.beginPath();
      g.arc(x, y, 3, 0, Math.PI * 2);
      g.fill();
    }
    [[40, 60, 70, 50], [150, 140, 60, 60], [60, 180, 40, 28]].forEach(([x, y, cw, ch]) => {
      g.fillStyle = '#c9a056';
      for (let px = x + 4; px < x + cw - 2; px += 7) {
        g.fillRect(px, y - 5, 3, 5);
        g.fillRect(px, y + ch, 3, 5);
      }
      g.fillStyle = '#0a0d10';
      g.fillRect(x, y, cw, ch);
    });
  });
}

// A keyboard's keys, seen from above.
function keysTexture(THREE) {
  return canvasTexture(THREE, 512, 160, (g, w, h) => {
    g.fillStyle = '#0b0e12';
    g.fillRect(0, 0, w, h);
    const rows = 5;
    const ch = h / rows;
    for (let r = 0; r < rows; r++) {
      const n = r === rows - 1 ? 9 : 15;
      const cw = w / n;
      for (let c = 0; c < n; c++) {
        const wide = r === rows - 1 && c === 4 ? 5 : 1;
        if (r === rows - 1 && c > 4 && c < 9) continue;
        g.fillStyle = '#262d35';
        g.fillRect(c * cw + 3, r * ch + 3, cw * wide - 6, ch - 6);
      }
    }
  });
}

// The terminal's screen: a prompt and a few lines in the languages he writes,
// in the site's mono and the room's blue.
function codeTexture(THREE) {
  return drawn(THREE, 640, 400, (g, w, h) => {
    g.fillStyle = '#04111a';
    g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(127, 216, 255, 0.12)';
    g.fillRect(0, 0, w, 34);
    g.textBaseline = 'middle';
    line(g, 'evan@lab  ~/toolkit', { x: 18, y: 18, max: w - 36, size: 17, weight: 500, color: '#7fd8ff' });
    const C = { k: '#7fd8ff', s: '#ffd28a', c: '#4d6b7d', t: '#d6e6ef', p: '#7dffb0' };
    const code = [
      [['$ ', C.p], ['python', C.t], [' suit.py --mark 7', C.s]],
      [['def ', C.k], ['assemble', C.t], ['(parts):', C.t]],
      [['    return ', C.k], ['sorted', C.t], ['(parts, key=fit)', C.t]],
      [['const ', C.k], ['suit = ', C.t], ['await ', C.k], ['build', C.t], ['({ mark: 7 });', C.t]],
      [['int ', C.k], ['main', C.t], ['() { ', C.t], ['return ', C.k], ['0', C.s], ['; }', C.t]],
      [['SELECT ', C.k], ['name ', C.t], ['FROM ', C.k], ['suits;', C.t]],
      [['// all systems nominal', C.c]],
    ];
    g.font = `500 21px ${MONO}`;
    code.forEach((parts, i) => {
      let x = 18;
      parts.forEach(([text, color]) => {
        g.fillStyle = color;
        g.fillText(text, x, 66 + i * 44);
        x += g.measureText(text).width;
      });
    });
    g.fillStyle = '#7fd8ff';
    g.fillRect(18, 66 + code.length * 44 - 12, 12, 24);
  });
}

// The scope's screen: a graticule and a trace, made to wrap, so scrolling its
// texture runs the trace across the screen.
function traceTexture(THREE) {
  const texture = canvasTexture(THREE, 512, 256, (g, w, h) => {
    g.fillStyle = '#03121a';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(127, 216, 255, 0.16)';
    g.lineWidth = 1;
    for (let x = 0; x <= w; x += w / 8) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
    for (let y = 0; y <= h; y += h / 6) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    g.strokeStyle = '#9ff0ff';
    g.lineWidth = 4;
    g.shadowColor = '#5fd0ff';
    g.shadowBlur = 12;
    g.beginPath();
    for (let x = 0; x <= w; x += 2) {
      const t = (x / w) * Math.PI * 2;
      const y = h / 2 - h * 0.3 * (Math.sin(t * 2) * 0.75 + Math.sin(t * 6) * 0.25);
      if (x === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.stroke();
  });
  texture.wrapS = THREE.RepeatWrapping;
  return texture;
}

// The server's face: six blades, each with its vents and drive bays.
function bladeTexture(THREE) {
  return canvasTexture(THREE, 384, 320, (g, w, h) => {
    g.fillStyle = '#12171d';
    g.fillRect(0, 0, w, h);
    const rows = 6;
    const rh = h / rows;
    for (let r = 0; r < rows; r++) {
      const y = r * rh;
      g.fillStyle = '#1d242c';
      g.fillRect(6, y + 4, w - 12, rh - 8);
      g.fillStyle = '#07090c';
      for (let x = 20; x < w * 0.55; x += 10) g.fillRect(x, y + 12, 5, rh - 24);
      g.fillStyle = '#2b333c';
      for (let k = 0; k < 3; k++) g.fillRect(w * 0.6 + k * 34, y + 10, 28, rh - 20);
    }
  });
}

// Instances of one small part at many places.
function many(THREE, geometry, material, points) {
  const mesh = new THREE.InstancedMesh(geometry, material, points.length);
  const m = new THREE.Matrix4();
  points.forEach(([x, y, z], i) => mesh.setMatrixAt(i, m.makeTranslation(x, y, z)));
  return mesh;
}

// The bench: 2.8 m long, 0.7 m deep, its top at 0.92 m; drawers at both ends,
// an anti-static mat, a pegboard 1 m high behind and a shelf over it with its
// strip lighting the top. userData: top, depth, width. Origin on the floor
// under its middle; its front faces +z.
export function workbench(THREE, materials) {
  const p = paint(THREE, materials);
  const k = kit(THREE, materials);
  const group = new THREE.Group();
  const W = 2.8;
  const D = 0.7;
  const TOP = 0.92;
  group.add(box(THREE, W, 0.045, D, materials.metal, 0, TOP - 0.0225, 0));
  group.add(box(THREE, W - 0.5, 0.004, D - 0.16, materials.rubber, 0, TOP + 0.002, 0.03));
  group.add(box(THREE, W, 0.07, 0.02, materials.lacquer, 0, TOP - 0.08, D / 2 - 0.03));
  group.add(box(THREE, W - 0.06, 0.08, D - 0.1, materials.rubber, 0, 0.04, -0.02));
  group.add(box(THREE, W - 0.2, 0.03, D - 0.14, materials.lacquer, 0, 0.24, -0.03));
  [-1, 1].forEach((side) => {
    const x = side * (W / 2 - 0.32);
    group.add(box(THREE, 0.6, TOP - 0.17, D - 0.06, materials.lacquer, x, (TOP - 0.17) / 2 + 0.06, -0.02));
    [0.2, 0.42, 0.64].forEach((y) => {
      group.add(box(THREE, 0.56, 0.2, 0.012, materials.lacquer, x, y, D / 2 - 0.044));
      group.add(box(THREE, 0.2, 0.012, 0.02, materials.metal, x, y + 0.06, D / 2 - 0.03));
    });
  });
  // The pegboard, and what hangs on it: a coil of cable, two drivers.
  const PEG = 1.04;
  group.add(face(THREE, W - 0.04, PEG, k.peg, 0, TOP + PEG / 2, -D / 2 + 0.012));
  const coil = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.012, 8, 28), materials.rubber);
  coil.position.set(-0.95, TOP + 0.68, -D / 2 + 0.04);
  group.add(coil);
  [[0.9, 0.62], [0.98, 0.64]].forEach(([x, y]) => {
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.16, 8), materials.metal);
    shaft.position.set(x, TOP + y - 0.08, -D / 2 + 0.03);
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.1, 10), p.red);
    grip.position.set(x, TOP + y + 0.04, -D / 2 + 0.03);
    group.add(shaft, grip);
  });
  // The shelf, its strip under its front edge and the light it throws down
  // the pegboard, and parts bins along it.
  const SHELF = TOP + PEG - 0.06;
  group.add(box(THREE, W, 0.03, 0.28, materials.lacquer, 0, SHELF, -D / 2 + 0.15));
  [-1, 1].forEach((side) => group.add(box(THREE, 0.03, 0.2, 0.26, p.frame, side * (W / 2 - 0.1), SHELF - 0.11, -D / 2 + 0.14)));
  group.add(box(THREE, W - 0.06, 0.006, 0.006, materials.strip(1.8), 0, SHELF - 0.02, -D / 2 + 0.27));
  const wash = face(THREE, W - 0.1, 0.6, p.glow, 0, SHELF - 0.32, -D / 2 + 0.014);
  wash.rotation.z = Math.PI;
  group.add(wash);
  for (let i = 0; i < 6; i++) {
    const x = -1.1 + i * 0.3 + (i > 2 ? 0.3 : 0);
    group.add(box(THREE, 0.2, 0.12, 0.2, i % 3 === 1 ? p.frame : p.red, x, SHELF + 0.075, -D / 2 + 0.14));
    group.add(box(THREE, 0.07, 0.022, 0.002, materials.rubber, x, SHELF + 0.095, -D / 2 + 0.241));
  }
  group.add(face(THREE, 0.5, 0.05, brassMaterial(THREE, brass(THREE, [{ text: 'TOOLKIT', size: 44, spacing: 9 }], 512, 64)),
    0, TOP - 0.08, D / 2 - 0.019));
  group.userData.top = TOP;
  group.userData.depth = D;
  group.userData.width = W;
  return anchored(THREE, group, 0, TOP, D / 2);
}

// Languages: a terminal, its screen 0.46 m across, on a stand, with a
// keyboard in front. Origin on the bench under its middle; it faces +z.
export function terminal(THREE, materials) {
  const p = paint(THREE, materials);
  const k = kit(THREE, materials);
  const group = new THREE.Group();
  group.add(box(THREE, 0.18, 0.012, 0.12, p.frame, 0, 0.006, -0.06));
  group.add(box(THREE, 0.035, 0.17, 0.02, materials.metal, 0, 0.09, -0.08));
  const screen = new THREE.Group();
  screen.position.set(0, 0.3, -0.06);
  screen.rotation.x = -0.08;
  screen.add(box(THREE, 0.48, 0.31, 0.024, materials.lacquer));
  screen.add(face(THREE, 0.45, 0.28, new THREE.MeshBasicMaterial({ map: codeTexture(THREE), color: new THREE.Color(0.95, 0.95, 0.95) }), 0, 0, 0.0125));
  screen.add(box(THREE, 0.44, 0.004, 0.004, k.blue, 0, -0.157, 0.012));
  group.add(screen);
  const keyboard = box(THREE, 0.36, 0.016, 0.12, p.frame, 0, 0.008, 0.12);
  keyboard.rotation.x = 0.05;
  group.add(keyboard);
  const keys = face(THREE, 0.34, 0.1, k.keys, 0, 0.0175, 0.12);
  keys.rotation.x = -Math.PI / 2 + 0.05;
  group.add(keys);
  return anchored(THREE, group, 0, 0.3, 0);
}

// Frameworks: four boards standing in a slotted rack, each lit at its top,
// one with a heatsink. Origin on the bench under its middle; it faces +z.
export function boardRack(THREE, materials) {
  const p = paint(THREE, materials);
  const k = kit(THREE, materials);
  const group = new THREE.Group();
  group.add(box(THREE, 0.3, 0.035, 0.18, p.frame, 0, 0.0175, 0));
  [-1, 1].forEach((side) => group.add(box(THREE, 0.012, 0.09, 0.18, materials.metal, side * 0.144, 0.08, 0)));
  const heights = [0.2, 0.24, 0.22, 0.18];
  heights.forEach((h, i) => {
    const x = -0.09 + i * 0.06;
    const card = new THREE.Mesh(new THREE.BoxGeometry(0.008, h, 0.15), k.board);
    card.position.set(x, 0.035 + h / 2, 0);
    // Turned a little toward the visitor, so their faces show.
    card.rotation.y = 0.5;
    group.add(card);
    group.add(box(THREE, 0.004, 0.008, 0.008, i === 1 ? k.amber : k.blue, x + 0.008, 0.035 + h - 0.02, 0.06));
  });
  for (let f = 0; f < 6; f++) group.add(box(THREE, 0.04, 0.05, 0.003, materials.metal, -0.03, 0.1, -0.05 + f * 0.018));
  return anchored(THREE, group, 0, 0.2, 0);
}

// AI and data: a neural core, a lattice of light over a projector puck, an
// orbit round it. userData.spin: the part that turns. Origin on the bench
// under its middle.
export function neuralCore(THREE, materials) {
  const k = kit(THREE, materials);
  const group = new THREE.Group();
  group.add(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.04, 32), materials.metal).translateY(0.02));
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.088, 0.005, 6, 40), materials.strip(2.6));
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.041;
  group.add(ring);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.07, 0.12, 24, 1, true), materials.holo(0.18));
  beam.position.y = 0.1;
  group.add(beam);

  const spin = new THREE.Group();
  spin.position.y = 0.27;
  const lattice = new THREE.IcosahedronGeometry(0.11, 1);
  spin.add(new THREE.LineSegments(new THREE.EdgesGeometry(lattice), k.edge));
  const seen = new Map();
  const at = lattice.attributes.position;
  for (let i = 0; i < at.count; i++) {
    const key = `${at.getX(i).toFixed(3)},${at.getY(i).toFixed(3)},${at.getZ(i).toFixed(3)}`;
    if (!seen.has(key)) seen.set(key, [at.getX(i), at.getY(i), at.getZ(i)]);
  }
  spin.add(many(THREE, new THREE.SphereGeometry(0.008, 8, 6), materials.holo(2.4), [...seen.values()]));
  spin.add(new THREE.Mesh(new THREE.SphereGeometry(0.04, 20, 14), materials.holo(1.6)));
  const orbit = new THREE.Mesh(new THREE.TorusGeometry(0.165, 0.0025, 6, 64), materials.holo(1.4));
  orbit.rotation.set(1.2, 0.3, 0);
  spin.add(orbit);
  group.add(spin);
  group.userData.spin = spin;
  return anchored(THREE, group, 0, 0.27, 0);
}

// Cloud and tools: a short server chassis of six blades, each with its lights,
// a handle at each side. Origin on the bench under its middle; it faces +z.
export function serverBlade(THREE, materials) {
  const p = paint(THREE, materials);
  const k = kit(THREE, materials);
  const group = new THREE.Group();
  const W = 0.42;
  const H = 0.34;
  const D = 0.34;
  group.add(box(THREE, W, H, D, p.frame, 0, H / 2 + 0.01, 0));
  group.add(face(THREE, W - 0.03, H - 0.03, new THREE.MeshStandardMaterial({ map: bladeTexture(THREE), roughness: 0.5, metalness: 0.4 }), 0, H / 2 + 0.01, D / 2 + 0.001));
  [-1, 1].forEach((side) => group.add(box(THREE, 0.014, H - 0.06, 0.03, materials.metal, side * (W / 2 + 0.007), H / 2 + 0.01, D / 2 - 0.01)));
  const rows = 6;
  const step = (H - 0.03) / rows;
  const led = new THREE.BoxGeometry(0.008, 0.008, 0.004);
  const blues = [];
  const ambers = [];
  for (let r = 0; r < rows; r++) {
    const y = 0.025 + step * (r + 0.5);
    blues.push([W / 2 - 0.05, y, D / 2 + 0.003], [W / 2 - 0.035, y, D / 2 + 0.003]);
    (r === 2 ? ambers : blues).push([W / 2 - 0.02, y, D / 2 + 0.003]);
  }
  group.add(many(THREE, led, k.blue, blues), many(THREE, led, k.amber, ambers));
  group.add(box(THREE, W + 0.02, 0.01, D + 0.02, materials.metal, 0, 0.005, 0));
  return anchored(THREE, group, 0, 0.2, 0);
}

// Testing: an oscilloscope, its trace running on its screen, knobs at its
// right and a probe lying on the bench. userData.trace: the screen's texture,
// to be scrolled. Origin on the bench under its middle; it faces +z.
export function oscilloscope(THREE, materials) {
  const p = paint(THREE, materials);
  const k = kit(THREE, materials);
  const group = new THREE.Group();
  const W = 0.38;
  const H = 0.22;
  const D = 0.28;
  const body = new THREE.Group();
  body.position.y = 0.02;
  body.rotation.x = -0.12; // up on its feet, tilted back to the reader
  body.add(box(THREE, W, H, D, p.frame, 0, H / 2, 0));
  body.add(box(THREE, W + 0.01, H + 0.01, 0.02, materials.lacquer, 0, H / 2, D / 2 - 0.005));
  const trace = traceTexture(THREE);
  body.add(face(THREE, 0.2, 0.15, new THREE.MeshBasicMaterial({ map: trace, color: new THREE.Color(1.25, 1.25, 1.25), toneMapped: false }), -0.065, H / 2 + 0.01, D / 2 + 0.006));
  const knob = new THREE.CylinderGeometry(0.014, 0.014, 0.016, 16);
  [[0.08, 0.16], [0.135, 0.16], [0.08, 0.105], [0.135, 0.105]].forEach(([x, y]) => {
    const m = new THREE.Mesh(knob, materials.metal);
    m.rotation.x = Math.PI / 2;
    m.position.set(x, y, D / 2 + 0.012);
    body.add(m);
  });
  [0.065, 0.095, 0.125, 0.155].forEach((x, i) => body.add(box(THREE, 0.018, 0.012, 0.008, i === 0 ? k.green : materials.lacquer, x, 0.05, D / 2 + 0.008)));
  body.add(box(THREE, 0.24, 0.016, 0.03, materials.metal, 0, H + 0.008, 0.02));
  group.add(body);
  [-1, 1].forEach((side) => group.add(box(THREE, 0.03, 0.02, 0.03, materials.rubber, side * (W / 2 - 0.04), 0.01, D / 2 - 0.05)));
  // The probe: out of the front, along the bench, its tip toward the visitor.
  const lead = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.12, 0.04, D / 2 + 0.01),
    new THREE.Vector3(0.16, 0.012, D / 2 + 0.08),
    new THREE.Vector3(0.06, 0.008, D / 2 + 0.16),
    new THREE.Vector3(-0.08, 0.008, D / 2 + 0.17),
  ]);
  group.add(new THREE.Mesh(new THREE.TubeGeometry(lead, 24, 0.004, 6), materials.rubber));
  const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.005, 0.07, 10), p.white);
  tip.rotation.z = Math.PI / 2;
  tip.position.set(-0.115, 0.01, D / 2 + 0.17);
  group.add(tip);
  group.userData.trace = trace;
  return anchored(THREE, group, 0, 0.15, 0);
}

// Design and modelling: a 3D printer, its frame lit along the top, a part half
// printed on the bed with its newest layer glowing, and a spool of filament.
// Origin on the bench under its middle; it faces +z.
export function printer3d(THREE, materials) {
  const p = paint(THREE, materials);
  const k = kit(THREE, materials);
  const group = new THREE.Group();
  const W = 0.36;
  const H = 0.46;
  const D = 0.32;
  group.add(box(THREE, W, 0.05, D, p.frame, 0, 0.025, 0));
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => group.add(box(THREE, 0.02, H, 0.02, materials.metal, sx * (W / 2 - 0.01), H / 2, sz * (D / 2 - 0.01))));
  [-1, 1].forEach((sz) => group.add(box(THREE, W, 0.02, 0.02, materials.metal, 0, H - 0.01, sz * (D / 2 - 0.01))));
  [-1, 1].forEach((sx) => group.add(box(THREE, 0.02, 0.02, D, materials.metal, sx * (W / 2 - 0.01), H - 0.01, 0)));
  group.add(box(THREE, W - 0.02, 0.005, 0.005, materials.strip(1.6), 0, H - 0.024, D / 2 - 0.002));
  // The bed and the part on it: a hex, its top layer still warm.
  group.add(box(THREE, W - 0.08, 0.012, D - 0.08, materials.metal, 0, 0.12, 0));
  const part = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.058, 0.07, 6), p.white);
  part.position.set(0, 0.161, 0.01);
  group.add(part);
  const layer = new THREE.Mesh(new THREE.TorusGeometry(0.048, 0.0025, 4, 6), k.amber);
  layer.rotation.x = Math.PI / 2;
  layer.rotation.z = Math.PI / 6;
  layer.position.set(0, 0.197, 0.01);
  group.add(layer);
  // The gantry and the hot end over the part.
  group.add(box(THREE, W - 0.04, 0.016, 0.016, materials.metal, 0, 0.3, 0.01));
  group.add(box(THREE, 0.05, 0.06, 0.04, materials.lacquer, 0.01, 0.28, 0.01));
  const nozzle = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.02, 10), materials.metal);
  nozzle.rotation.x = Math.PI;
  nozzle.position.set(0.01, 0.24, 0.01);
  group.add(nozzle);
  group.add(new THREE.Mesh(new THREE.SphereGeometry(0.005, 8, 6), k.amber).translateX(0.01).translateY(0.228).translateZ(0.01));
  // The spool, on its holder at the back.
  const spool = new THREE.Group();
  spool.position.set(0, H + 0.075, -D / 2 + 0.04);
  const reel = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.05, 28), p.blue);
  reel.rotation.z = Math.PI / 2;
  const flanges = [-1, 1].map((s) => {
    const f = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.006, 28), p.frame);
    f.rotation.z = Math.PI / 2;
    f.position.x = s * 0.028;
    return f;
  });
  spool.add(reel, ...flanges);
  group.add(spool);
  group.add(box(THREE, 0.01, 0.08, 0.01, materials.metal, 0, H + 0.035, -D / 2 + 0.04));
  return anchored(THREE, group, 0, 0.25, 0);
}
