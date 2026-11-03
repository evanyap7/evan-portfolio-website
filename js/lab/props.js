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
