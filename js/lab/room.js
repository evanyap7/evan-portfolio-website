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
const OFFICE = { back: -58, half: 5, height: 3.4 };
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
  { eye: [1.5, 1.65, -3.2], look: [-1.8, 1.45, -9.2] },
  { eye: [0.7, 1.55, -12.3], look: [BAYS.x, 1.15, BAYS.first] },
  { eye: [0.7, 1.55, -12.3 + BAYS.step * 6], look: [BAYS.x, 1.15, BAYS.first + BAYS.step * 6] },
  { eye: [-0.8, 1.7, -32.2], look: [-5.4, 1.5, -35.2] },
  { eye: [-1.1, 2.3, -38.4], look: [1.8, 0.95, -41.8] },
  { eye: [0, 1.62, -43.6], look: [0, 1.3, -53] },
];

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
  const partition = add(new THREE.Mesh(own(wallWithDoorway(THREE, HALF * 2, H, { width: 2.6, height: 2.9 })), wall));
  partition.position.z = END;
  add(instanced(THREE, line, materials.strip(1.8), [
    { at: [-1.36, 1.45, END], scale: [0.03, 2.9, 0.06] },
    { at: [1.36, 1.45, END], scale: [0.03, 2.9, 0.06] },
    { at: [0, 2.92, END], scale: [2.75, 0.03, 0.06] },
  ]));

  // The office: a warm room, wood underfoot and on the lower walls.
  const depth = END - OFFICE.back;
  const mid = (END + OFFICE.back) / 2;
  const plank = own(new THREE.PlaneGeometry(OFFICE.half * 2, depth));
  const plankUv = plank.attributes.uv;
  for (let i = 0; i < plankUv.count; i += 1) plankUv.setXY(i, plankUv.getX(i) * 3, plankUv.getY(i) * 2);
  const officeFloor = add(new THREE.Mesh(plank, materials.wood));
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
  const back = add(new THREE.Mesh(own(new THREE.PlaneGeometry(OFFICE.half * 2, OFFICE.height)), plaster));
  back.position.set(0, OFFICE.height / 2, OFFICE.back);
  add(instanced(THREE, line, materials.wood, [
    { at: [-OFFICE.half + 0.03, 0.55, mid], scale: [0.06, 1.1, depth] },
    { at: [OFFICE.half - 0.03, 0.55, mid], scale: [0.06, 1.1, depth] },
    { at: [0, 0.55, OFFICE.back + 0.03], scale: [OFFICE.half * 2, 1.1, 0.06] },
  ]));

  // Lights: a cool sky over everything, one key from above the door end, and
  // a warm lamp in the office. Nothing casts a real-time shadow.
  const lights = new THREE.Group();
  lights.add(new THREE.HemisphereLight(0x9cc6e6, 0x040608, 0.55));
  const key = new THREE.DirectionalLight(0xe4f2ff, 1.25);
  key.position.set(4, 9, 6);
  key.target.position.set(0, 0, -20);
  lights.add(key, key.target);
  const warm = new THREE.PointLight(0xffb36b, 14, 14, 2);
  warm.position.set(0, OFFICE.height - 0.5, -51.5);
  lights.add(warm);
  group.add(lights);

  const marks = {
    about: new THREE.Vector3(-1.8, 0, -9.2),
    shelf: new THREE.Vector3(-5.4, 0, -35.2),
    bench: new THREE.Vector3(1.8, 0, -41.8),
    office: new THREE.Vector3(0, 0, -53),
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
    dispose() {
      door.dispose();
      geometries.forEach((g) => g.dispose());
      owned.forEach((m) => m.dispose());
    },
  };
}
