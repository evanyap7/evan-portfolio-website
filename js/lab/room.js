// The lab's architecture: one long hall running away from the door (down -z),
// and the office through a doorway at its far end. Outside the door is a dark
// vestibule, where the visitor starts. Down the hall: Evan's corner and the
// hologram on the left, the row of seven suit bays on the right wall, the
// trophy shelf on the left wall, the workbench, and the office.
//
// Units are metres. Everything repeated is instanced, so the whole shell is a
// couple of dozen draw calls.

import { createDoor } from './door.js';

const H = 4.2; // ceiling height of the hall
const HALF = 6; // the hall is 12 m wide
const END = -46; // the partition between the hall and the office
// The office is smaller than the hall and warmer: 6.8 m by 8, the desk's back
// to its window, the lamp on the desk its one light.
const OFFICE = { back: -54, half: 3.4, height: 3.2 };
const WINDOW = { width: 2.8, bottom: 1.0, top: 2.45 };
const DOORWAY = { width: 2.6, height: 2.9 };
const LAMP = [-0.57, 1.19, -53.62]; // its bulb, where the office's light is
export const DOOR = { y: 1.85, radius: 1.75 };
const BAYS = { x: 4.7, first: -13, step: -2.6, count: 7 };

// Where the camera stands (eye) and what it looks at (look), in walk order:
// outside the door, About, the first bay, the last bay, the trophy shelf, the
// bench, the office. scene.js threads its two curves through these.
export const VIEWS = [
  // Square on to the door, near enough that the door fills the hero's frame
  // (the reactor's box) to its edge: half that frame spans 20° (scene.js),
  // and tan 20° × 4.8 m is the door's radius.
  { eye: [0, DOOR.y, 4.8], look: [0, DOOR.y, 0] },
  // Near enough to Evan's hologram (stops.js) that he stands three quarters
  // of the frame high, the bar behind him and the screen on the wall beside.
  { eye: [0.13, 1.5, -5.7], look: [-1.8, 1.4, -9.2] },
  { eye: [-1.0, 1.55, -12.3], look: [BAYS.x, 1.15, BAYS.first] },
  { eye: [-1.0, 1.55, -12.3 + BAYS.step * 6], look: [BAYS.x, 1.15, BAYS.first + BAYS.step * 6] },
  // Nearly square on to the trophy shelf (stops.js), near enough that it fills
  // four fifths of its frame's short side: 2.1 m at tan 20° × 3.6 m. The
  // frame is narrower than it is tall at every width, so the shelf lands the
  // same size on a phone, its fourteen things far enough apart to touch.
  { eye: [-2.2, 1.45, -34.3], look: [-5.63, 1.24, -35.25] },
  // Square on to the workbench (stops.js), against the partition right of the
  // office door, near enough that its six instruments span the frame's width:
  // its front is 3.9 m away, so the frame shows tan 20° × 3.9 m each side of
  // the middle, and the outer ones (1.125 m out) land inside it on a phone.
  { eye: [3.65, 1.9, -41.4], look: [3.65, 1.15, -45.5] },
  // Inside the office, seated height, square on to the desk and its screen,
  // the window and the city above them. scene.js brings the camera here from
  // the bench through the doorway, not through the partition.
  { eye: [0, 1.42, -50.6], look: [0, 1.18, -53.6] },
];

// The bend from the bench to the office: a control point the last stretch of
// the path is pulled toward, so it turns in through the doorway.
export const DOORWAY_BEND = { eye: [0, 1.7, -43], look: [0.9, 1.15, -50] };

// A wall with a rectangular window: the office's back wall.
function wallWithWindow(THREE, width, height, { width: w, bottom, top }) {
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, 0);
  shape.lineTo(width / 2, 0);
  shape.lineTo(width / 2, height);
  shape.lineTo(-width / 2, height);
  shape.closePath();
  const hole = new THREE.Path();
  hole.moveTo(-w / 2, bottom);
  hole.lineTo(-w / 2, top);
  hole.lineTo(w / 2, top);
  hole.lineTo(w / 2, bottom);
  hole.closePath();
  shape.holes.push(hole);
  return new THREE.ShapeGeometry(shape);
}

// The city at night, seen through the office window: a deep blue sky going
// to a sodium glow at the horizon, and towers in silhouette with a scatter
// of lit windows, most warm, a few cool. Seeded, so it is the same city on
// every visit.
function cityTexture(THREE) {
  const w = 1024;
  const h = 512;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const g = canvas.getContext('2d');
  const sky = g.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#060b18');
  sky.addColorStop(0.45, '#0e1a33');
  sky.addColorStop(0.72, '#3b2a2a');
  sky.addColorStop(0.86, '#6b4128');
  sky.addColorStop(1, '#2a1a12');
  g.fillStyle = sky;
  g.fillRect(0, 0, w, h);
  let seed = 7;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  // Three rows of towers, the far ones paler with the haze.
  [
    { base: 0.62, tall: 0.22, ink: '#141522', lit: 0.1, size: 2 },
    { base: 0.74, tall: 0.34, ink: '#0b0c14', lit: 0.18, size: 3 },
    { base: 0.9, tall: 0.42, ink: '#050609', lit: 0.24, size: 4 },
  ].forEach((row) => {
    let x = -20;
    while (x < w) {
      const width = 30 + random() * 70;
      const top = h * (row.base - row.tall * (0.35 + random() * 0.65));
      g.fillStyle = row.ink;
      g.fillRect(x, top, width, h - top);
      if (random() < 0.25) g.fillRect(x + width * 0.4, top - 18 - random() * 30, 2, 40);
      for (let y = top + 8; y < h - 6; y += row.size * 3) {
        for (let wx = x + 5; wx < x + width - 5; wx += row.size * 2.6) {
          if (random() > row.lit) continue;
          const cool = random() < 0.18;
          g.fillStyle = cool ? `rgba(170, 205, 255, ${0.35 + random() * 0.4})` : `rgba(255, ${190 + random() * 40 | 0}, 120, ${0.4 + random() * 0.5})`;
          g.fillRect(wx, y, row.size, row.size * 1.3);
        }
      }
      x += width + random() * 10;
    }
  });
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// A pane of the sliding glass door: glass in a thin metal frame, with a
// frosted band at hand height so it reads as a door when it is shut.
function doorPane(THREE, glass, frame, frost, width, height) {
  const pane = new THREE.Group();
  const sheet = new THREE.Mesh(new THREE.PlaneGeometry(width, height), glass);
  sheet.position.y = height / 2;
  const band = new THREE.Mesh(new THREE.PlaneGeometry(width - 0.06, 0.16), frost);
  band.position.set(0, 1.12, 0.002);
  pane.add(sheet, band);
  const bar = (w, h, x, y) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.03), frame);
    mesh.position.set(x, y, 0);
    pane.add(mesh);
  };
  bar(width, 0.035, 0, 0.0175);
  bar(width, 0.035, 0, height - 0.0175);
  bar(0.035, height, -width / 2 + 0.0175, height / 2);
  bar(0.035, height, width / 2 - 0.0175, height / 2);
  return pane;
}

function instanced(THREE, geometry, material, placements) {
  const mesh = new THREE.InstancedMesh(geometry, material, placements.length);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const p3 = new THREE.Vector3();
  const s = new THREE.Vector3();
  placements.forEach((p, i) => {
    e.set(p.rx ?? 0, p.ry ?? 0, p.rz ?? 0);
    q.setFromEuler(e);
    m.compose(p3.set(...p.at), q, s.set(...(p.scale ?? [1, 1, 1])));
    mesh.setMatrixAt(i, m);
  });
  mesh.computeBoundingSphere();
  return mesh;
}

// The door wall: a flat wall across the hall with a round opening.
function wallWithPortal(THREE, width, height, { y, radius }) {
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, 0);
  shape.lineTo(width / 2, 0);
  shape.lineTo(width / 2, height);
  shape.lineTo(-width / 2, height);
  shape.closePath();
  const hole = new THREE.Path();
  hole.absarc(0, y, radius, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  return new THREE.ShapeGeometry(shape, 48);
}

// The partition: a wall with a doorway notched out of its foot.
function wallWithDoorway(THREE, width, height, door) {
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, 0);
  shape.lineTo(-door.width / 2, 0);
  shape.lineTo(-door.width / 2, door.height);
  shape.lineTo(door.width / 2, door.height);
  shape.lineTo(door.width / 2, 0);
  shape.lineTo(width / 2, 0);
  shape.lineTo(width / 2, height);
  shape.lineTo(-width / 2, height);
  shape.closePath();
  return new THREE.ShapeGeometry(shape);
}

export function createRoom(THREE, materials, { tier = 'desktop' } = {}) {
  const group = new THREE.Group();
  group.name = 'room';
  const geometries = [];
  const owned = [];
  const own = (geometry) => {
    geometries.push(geometry);
    return geometry;
  };
  const add = (mesh) => {
    group.add(mesh);
    return mesh;
  };

  // Walls are lacquer gone matt; the ceilings are darker still.
  const wall = materials.lacquer.clone();
  wall.color.set(0x0c1117);
  wall.roughness = 0.62;
  wall.side = THREE.DoubleSide;
  const ceiling = materials.lacquer.clone();
  ceiling.color.set(0x07090c);
  ceiling.roughness = 0.9;
  owned.push(wall, ceiling);

  // The floor runs from the vestibule to the office doorway, one panel a metre.
  const floorLength = 10 - END;
  const floorGeometry = own(new THREE.PlaneGeometry(HALF * 2, floorLength));
  const uv = floorGeometry.attributes.uv;
  for (let i = 0; i < uv.count; i += 1) uv.setXY(i, uv.getX(i) * HALF * 2, uv.getY(i) * floorLength);
  const floor = add(new THREE.Mesh(floorGeometry, materials.floor));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, (10 + END) / 2);

  const roof = add(new THREE.Mesh(own(new THREE.PlaneGeometry(HALF * 2, -END)), ceiling));
  roof.rotation.x = Math.PI / 2;
  roof.position.set(0, H, END / 2);

  // Side walls of the hall.
  const sideGeometry = own(new THREE.PlaneGeometry(-END, H));
  [-1, 1].forEach((side) => {
    const mesh = add(new THREE.Mesh(sideGeometry, wall));
    mesh.rotation.y = -side * Math.PI / 2;
    mesh.position.set(side * HALF, H / 2, END / 2);
  });

  // The door wall, with the round opening the vault door fills, a metal
  // collar, a ring of bolt heads, and a thin lit ring on each face.
  add(new THREE.Mesh(own(wallWithPortal(THREE, HALF * 2, H, DOOR)), wall));
  const collar = add(new THREE.Mesh(own(new THREE.TorusGeometry(DOOR.radius + 0.06, 0.09, 12, 96)), materials.metal));
  collar.position.set(0, DOOR.y, 0);
  const bolts = tier === 'phone' ? 16 : 24;
  add(instanced(THREE, own(new THREE.CylinderGeometry(0.034, 0.038, 0.035, 12)), materials.metal,
    Array.from({ length: bolts }, (_, i) => {
      const a = (i / bolts) * Math.PI * 2;
      return { at: [Math.cos(a) * (DOOR.radius + 0.3), DOOR.y + Math.sin(a) * (DOOR.radius + 0.3), 0.017], rx: Math.PI / 2 };
    })));
  const ringGeometry = own(new THREE.TorusGeometry(DOOR.radius + 0.45, 0.007, 6, 128));
  [[0.01, 0.9], [-0.16, 0.7]].forEach(([z, glow]) => {
    const ring = add(new THREE.Mesh(ringGeometry, materials.strip(glow)));
    ring.position.set(0, DOOR.y, z);
  });
  const door = createDoor(THREE, materials, { tier, y: DOOR.y, radius: DOOR.radius });
  group.add(door.group);

  // The vestibule: a narrow dark passage up to the door, its floor lit by two
  // guide lines that lead the eye in.
  const vestibule = own(new THREE.PlaneGeometry(10, 3.6));
  [-1, 1].forEach((side) => {
    const mesh = add(new THREE.Mesh(vestibule, wall));
    mesh.rotation.y = -side * Math.PI / 2;
    mesh.position.set(side * 3.4, 1.8, 5);
  });
  const vestibuleRoof = add(new THREE.Mesh(own(new THREE.PlaneGeometry(6.8, 10)), ceiling));
  vestibuleRoof.rotation.x = Math.PI / 2;
  vestibuleRoof.position.set(0, 3.6, 5);

  // Light strips: two long lines down the ceiling, a line along the foot of
  // each wall, and two guide lines in the vestibule floor.
  const line = own(new THREE.BoxGeometry(1, 1, 1));
  add(instanced(THREE, line, materials.strip(2.2), [
    { at: [-2.3, H - 0.02, END / 2], scale: [0.07, 0.02, -END - 1] },
    { at: [2.3, H - 0.02, END / 2], scale: [0.07, 0.02, -END - 1] },
  ]));
  add(instanced(THREE, line, materials.strip(0.9), [
    { at: [-HALF + 0.02, 0.06, END / 2], scale: [0.02, 0.025, -END] },
    { at: [HALF - 0.02, 0.06, END / 2], scale: [0.02, 0.025, -END] },
    { at: [-1.1, 0.005, 5.2], scale: [0.04, 0.01, 9.4] },
    { at: [1.1, 0.005, 5.2], scale: [0.04, 0.01, 9.4] },
  ]));

  // Pilasters of brushed metal down both walls, every four metres, skipping
  // the stretch of right wall the bays stand in.
  const pilasters = [];
  const lastBay = BAYS.first + BAYS.step * (BAYS.count - 1);
  for (let z = -2; z > END; z -= 4) {
    pilasters.push({ at: [-HALF + 0.12, H / 2, z], scale: [0.24, H, 0.34] });
    if (z > BAYS.first + 1.6 || z < lastBay - 1.6) pilasters.push({ at: [HALF - 0.12, H / 2, z], scale: [0.24, H, 0.34] });
  }
  add(instanced(THREE, line, materials.metal, pilasters));

  // The suit bays: a niche between two metal fins, a lacquered plinth with a
  // lit ring, a light above, a column of light on the back wall in the suit's
  // own colour (suits.js tints it), and a pane of glass in front, its edges lit.
  const bays = [];
  const fins = [];
  const plinths = [];
  const lamps = [];
  const spines = [];
  const panes = [];
  const edges = [];
  const PANE = { x: BAYS.x - 1.05, half: 1.1, top: 3.2 };
  for (let k = 0; k < BAYS.count; k += 1) {
    const z = BAYS.first + BAYS.step * k;
    bays.push(new THREE.Vector3(BAYS.x, 0.09, z));
    [-1, 1].forEach((side) => fins.push({ at: [HALF - 0.45, H * 0.42, z + side * 1.15], scale: [0.9, H * 0.84, 0.05] }));
    plinths.push({ at: [BAYS.x, 0.045, z] });
    lamps.push({ at: [BAYS.x + 0.35, 3.25, z], scale: [0.6, 0.025, 1.2] });
    spines.push({ at: [HALF - 0.03, 1.7, z], scale: [0.02, 2.6, 0.05] });
    panes.push({ at: [PANE.x, PANE.top / 2, z], ry: Math.PI / 2, scale: [PANE.half * 2, PANE.top, 1] });
    [-1, 1].forEach((side) => edges.push({ at: [PANE.x, PANE.top / 2, z + side * PANE.half], scale: [0.01, PANE.top, 0.01] }));
    edges.push({ at: [PANE.x, PANE.top, z], scale: [0.01, 0.01, PANE.half * 2] });
  }
  add(instanced(THREE, line, materials.metal, fins));
  add(instanced(THREE, own(new THREE.CylinderGeometry(0.62, 0.66, 0.09, 48)), materials.lacquer, plinths));
  add(instanced(THREE, own(new THREE.TorusGeometry(0.6, 0.012, 6, 64)), materials.strip(3), plinths.map((p) => ({ at: [p.at[0], 0.095, p.at[2]], rx: Math.PI / 2 }))));
  // Contact shadows: a wide soft one on the floor round each plinth, and a
  // tight one on its top, under the boots.
  const disc = own(new THREE.PlaneGeometry(1, 1));
  add(instanced(THREE, disc, materials.contact, plinths.flatMap((p) => [
    { at: [p.at[0], 0.006, p.at[2]], rx: -Math.PI / 2, scale: [2.6, 2.6, 1] },
    { at: [p.at[0], 0.097, p.at[2]], rx: -Math.PI / 2, scale: [1.1, 1.1, 1] },
  ])));
  add(instanced(THREE, line, materials.strip(1.6), lamps));
  add(instanced(THREE, line, materials.strip(1.4), edges));
  // White until tinted; each bay's colour is an instance colour, so the
  // shader that draws them is the same before and after.
  const spineMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  owned.push(spineMaterial);
  const bayLights = add(instanced(THREE, line, spineMaterial, spines));
  const white = new THREE.Color(0.5, 0.5, 0.5);
  spines.forEach((_, k) => bayLights.setColorAt(k, white));
  if (tier !== 'phone') {
    // Barely there: the glass is seen by its lit edges and its reflections.
    const glass = materials.glass.clone();
    glass.opacity = 0.08;
    owned.push(glass);
    add(instanced(THREE, own(new THREE.PlaneGeometry(1, 1)), glass, panes));
  }

  // The partition at the end of the hall, with a lit doorway into the office.
  const partition = add(new THREE.Mesh(own(wallWithDoorway(THREE, HALF * 2, H, DOORWAY)), wall));
  partition.position.z = END;
  add(instanced(THREE, line, materials.strip(1.8), [
    { at: [-1.36, 1.45, END], scale: [0.03, 2.9, 0.06] },
    { at: [1.36, 1.45, END], scale: [0.03, 2.9, 0.06] },
    { at: [0, 2.92, END], scale: [2.75, 0.03, 0.06] },
  ]));

  // The office: a warm room, walnut underfoot and on the lower walls.
  const walnut = materials.wood.clone();
  walnut.color.set(0x8a6650);
  owned.push(walnut);
  const depth = END - OFFICE.back;
  const mid = (END + OFFICE.back) / 2;
  const plank = own(new THREE.PlaneGeometry(OFFICE.half * 2, depth));
  const plankUv = plank.attributes.uv;
  for (let i = 0; i < plankUv.count; i += 1) plankUv.setXY(i, plankUv.getX(i) * 3, plankUv.getY(i) * 2);
  const officeFloor = add(new THREE.Mesh(plank, walnut));
  officeFloor.rotation.x = -Math.PI / 2;
  officeFloor.position.set(0, 0.002, mid);
  const officeRoof = add(new THREE.Mesh(own(new THREE.PlaneGeometry(OFFICE.half * 2, depth)), ceiling));
  officeRoof.rotation.x = Math.PI / 2;
  officeRoof.position.set(0, OFFICE.height, mid);
  const plaster = wall.clone();
  plaster.color.set(0x15120f);
  owned.push(plaster);
  const officeSide = own(new THREE.PlaneGeometry(depth, OFFICE.height));
  [-1, 1].forEach((side) => {
    const mesh = add(new THREE.Mesh(officeSide, plaster));
    mesh.rotation.y = -side * Math.PI / 2;
    mesh.position.set(side * OFFICE.half, OFFICE.height / 2, mid);
  });
  const back = add(new THREE.Mesh(own(wallWithWindow(THREE, OFFICE.half * 2, OFFICE.height, WINDOW)), plaster));
  back.position.set(0, 0, OFFICE.back);
  // Wainscot on the side walls and under the window.
  add(instanced(THREE, line, walnut, [
    { at: [-OFFICE.half + 0.03, 0.5, mid], scale: [0.06, 1.0, depth] },
    { at: [OFFICE.half - 0.03, 0.5, mid], scale: [0.06, 1.0, depth] },
    { at: [0, 0.5, OFFICE.back + 0.03], scale: [OFFICE.half * 2, 1.0, 0.06] },
  ]));

  // The window: a steel frame, two mullions, a wooden sill, and the city
  // behind it, far enough back that it shifts a little as the camera walks.
  const steel = materials.metal.clone();
  steel.color.set(0x23272c);
  steel.roughness = 0.5;
  owned.push(steel);
  const sash = (WINDOW.bottom + WINDOW.top) / 2;
  const tall = WINDOW.top - WINDOW.bottom;
  add(instanced(THREE, line, steel, [
    { at: [-WINDOW.width / 2, sash, OFFICE.back], scale: [0.05, tall + 0.05, 0.08] },
    { at: [WINDOW.width / 2, sash, OFFICE.back], scale: [0.05, tall + 0.05, 0.08] },
    { at: [0, WINDOW.top, OFFICE.back], scale: [WINDOW.width + 0.05, 0.05, 0.08] },
    { at: [-WINDOW.width / 6, sash, OFFICE.back], scale: [0.025, tall, 0.04] },
    { at: [WINDOW.width / 6, sash, OFFICE.back], scale: [0.025, tall, 0.04] },
  ]));
  add(instanced(THREE, line, walnut, [
    { at: [0, WINDOW.bottom - 0.02, OFFICE.back + 0.05], scale: [WINDOW.width + 0.16, 0.04, 0.16] },
  ]));
  const cityMap = cityTexture(THREE);
  const city = new THREE.MeshBasicMaterial({ map: cityMap, color: new THREE.Color(0.85, 0.85, 0.85), fog: false });
  owned.push(cityMap, city);
  const skyline = add(new THREE.Mesh(own(new THREE.PlaneGeometry(9, 4.5)), city));
  skyline.position.set(0, 1.55, OFFICE.back - 1.4);

  // The sliding glass door, on the office side of the doorway: two panes that
  // part and slide behind the partition as the camera comes up to it.
  const doorGlass = materials.glass.clone();
  doorGlass.opacity = 0.14;
  doorGlass.side = THREE.DoubleSide;
  const frost = new THREE.MeshStandardMaterial({ color: 0xc9d6df, roughness: 0.9, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide });
  owned.push(doorGlass, frost);
  const paneWidth = DOORWAY.width / 2 + 0.02;
  const leaves = [-1, 1].map((side) => {
    const pane = doorPane(THREE, doorGlass, steel, frost, paneWidth, DOORWAY.height - 0.02);
    pane.traverse((o) => o.geometry && geometries.push(o.geometry));
    // The two run in their own tracks, a few centimetres apart.
    pane.position.set((side * paneWidth) / 2, 0, END - (side < 0 ? 0.07 : 0.11));
    pane.userData.side = side;
    return add(pane);
  });
  const doorCentre = new THREE.Vector3(0, DOORWAY.height / 2, END);
  const slide = (open) => leaves.forEach((pane) => {
    const side = pane.userData.side;
    pane.position.x = side * (paneWidth / 2 + open * paneWidth);
  });
  slide(0);

  // Lights: a cool sky over everything, one key from above the door end, and
  // a warm lamp in the office. Nothing casts a real-time shadow.
  const lights = new THREE.Group();
  lights.add(new THREE.HemisphereLight(0x9cc6e6, 0x040608, 0.55));
  const key = new THREE.DirectionalLight(0xe4f2ff, 1.25);
  key.position.set(4, 9, 6);
  key.target.position.set(0, 0, -20);
  lights.add(key, key.target);
  const warm = new THREE.PointLight(0xffb36b, 6, 9, 2);
  warm.position.set(...LAMP);
  lights.add(warm);
  group.add(lights);

  const marks = {
    about: new THREE.Vector3(-1.8, 0, -9.2),
    shelf: new THREE.Vector3(-5.4, 0, -35.2),
    // The bench's middle, its back against the partition.
    bench: new THREE.Vector3(3.65, 0, -45.64),
    // The desk's middle, its back a hand's width off the window wall.
    office: new THREE.Vector3(0, 0, OFFICE.back + 0.45),
  };

  return {
    group,
    door,
    bays,
    // One instance per bay: setColorAt(k, colour), then instanceColor.needsUpdate.
    bayLights,
    marks,
    // Called each frame drawn, with the frame's time.
    update(now) {
      door.update(now);
    },
    // Called each time the camera is placed: the glass door is shut until the
    // camera is within 4.5 m of it, open by 2.5 m, and stays open once the
    // camera is through.
    follow(eye) {
      const t = Math.min(Math.max((eye.distanceTo(doorCentre) - 2.5) / 2, 0), 1);
      slide(eye.z < END ? 1 : 1 - t * t * (3 - 2 * t));
    },
    dispose() {
      door.dispose();
      geometries.forEach((g) => g.dispose());
      owned.forEach((m) => m.dispose());
    },
  };
}
