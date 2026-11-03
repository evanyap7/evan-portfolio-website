// The vault door: the arc reactor's own frame, cut into the door wall. Eight
// brushed-metal blades close around a centre opening, where the live reactor
// (its own canvas, over the page) sits; the visitor's waking opens them. The
// blades unlatch, then twist out behind the wall, and the hall's light comes
// through. Once open it stays open.

const BLADES = 8;
const DURATION = 1400; // ms, from waking to open
const TWIST = 0.7; // radians the seams spiral through, from the opening to the rim
const OPEN_TURN = 0.55; // radians each blade turns as it opens
const OVERLAP = 0.05; // radians each blade overlaps its neighbour on each side

const clamp = (v) => Math.min(Math.max(v, 0), 1);
const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

// Brushing turned on a lathe: fine concentric streaks, so the blades catch
// the light in rings, the way turned metal does.
function lathe(THREE, size) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  let s = 31;
  const rnd = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
  ctx.fillStyle = '#6e6e6e';
  ctx.fillRect(0, 0, size, size);
  ctx.lineWidth = 1;
  for (let i = 0; i < size * 2; i += 1) {
    const v = 70 + rnd() * 90;
    ctx.strokeStyle = `rgba(${v},${v},${v},${0.18 + rnd() * 0.3})`;
    const start = rnd() * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, rnd() * size * 0.71, start, start + 0.4 + rnd() * 2.6);
    ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 4;
  return texture;
}

// One blade, in door coordinates (metres from the centre), lying along +x: an
// annular wedge from the opening to behind the wall, its two edges spiralling
// the same way, so the closed iris shows eight curved seams.
function bladeShape(THREE, inner, outer, steps) {
  const half = Math.PI / BLADES + OVERLAP;
  const spiral = (r) => (TWIST * (r - inner)) / (outer - inner);
  const at = (r, phi) => new THREE.Vector2(r * Math.cos(phi), r * Math.sin(phi));
  const points = [];
  for (let k = 0; k <= steps; k += 1) points.push(at(inner, -half + (2 * half * k) / steps));
  for (let k = 1; k <= steps; k += 1) {
    const r = inner + ((outer - inner) * k) / steps;
    points.push(at(r, half + spiral(r)));
  }
  for (let k = 1; k <= steps; k += 1) points.push(at(outer, half + spiral(outer) - (2 * half * k) / steps));
  for (let k = 1; k < steps; k += 1) {
    const r = outer - ((outer - inner) * k) / steps;
    points.push(at(r, -half + spiral(r)));
  }
  return new THREE.Shape(points);
}

export function createDoor(THREE, materials, { tier = 'desktop', y, radius }) {
  const phone = tier === 'phone';
  const group = new THREE.Group();
  group.name = 'door';
  group.position.set(0, y, 0);
  const geometries = [];
  const owned = [];
  const own = (thing, list = geometries) => {
    list.push(thing);
    return thing;
  };

  // The opening the blades close to: the reactor's rim, two thirds of the
  // way out to the door's edge, as the reactor's button is two thirds of its
  // frame. The blades reach behind the wall, past the collar.
  const inner = radius * 0.62;
  const outer = radius + 0.38;
  const depth = 0.035;
  const bevel = 0.009;

  const map = own(lathe(THREE, phone ? 256 : 512), owned);
  // The shape's own coordinates are the blade's UVs, so a repeat of one door
  // width centres the turning on the door.
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(1 / (2 * outer), 1 / (2 * outer));
  map.offset.set(0.5, 0.5);
  const face = own(new THREE.MeshStandardMaterial({
    color: 0xb9c3cc, metalness: 1, roughness: 0.32, roughnessMap: map,
  }), owned);
  // The blades' edges and bevels are lacquered dark: the seams.
  const seam = own(materials.lacquer.clone(), owned);
  seam.color.set(0x05070a);
  seam.roughness = 0.35;

  const geometry = own(new THREE.ExtrudeGeometry(bladeShape(THREE, inner, outer, phone ? 10 : 18), {
    depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel * 1.4, bevelSegments: phone ? 1 : 2, curveSegments: 1,
  }));

  // Even blades lie in front, odd ones behind, so each front blade covers its
  // two neighbours' edges, as an iris's blades lap.
  const blades = [];
  for (let i = 0; i < BLADES; i += 1) {
    const blade = new THREE.Mesh(geometry, [face, seam]);
    const front = i % 2 === 0 ? -0.03 : -0.03 - depth - 2 * bevel - 0.004;
    blade.position.z = front - depth - bevel;
    blade.userData.home = (i * Math.PI * 2) / BLADES;
    blade.rotation.z = blade.userData.home;
    group.add(blade);
    blades.push(blade);
  }

  // The socket behind the opening: a dark well the reactor sits in. It is
  // drawn back into the hall as the blades part.
  const socket = new THREE.Mesh(own(new THREE.CylinderGeometry(inner + 0.06, inner + 0.06, 0.06, phone ? 32 : 64)), seam);
  socket.rotation.x = Math.PI / 2;
  socket.position.z = -0.16;
  group.add(socket);

  // Light: the reactor's own blue on the blades, a soft top light so the
  // metal reads as metal, and the hall's light that comes through on opening.
  const blue = new THREE.Color().setHSL(196 / 360, 0.9, 0.6);
  const glow = new THREE.PointLight(blue, 0, 5, 2);
  glow.position.set(0, 0, 0.75);
  const top = new THREE.SpotLight(0xdfeeff, phone ? 14 : 16, 11, 0.62, 0.85, 1.6);
  top.position.set(0.4, 2.1, 4.6);
  top.target.position.set(0, -0.2, 0);
  const spill = new THREE.PointLight(0xcfe6ff, 0, 7, 2);
  spill.position.set(0, 0.2, -1.4);
  group.add(glow, top, top.target, spill);

  const GLOW_ASLEEP = 0.5;
  const GLOW_AWAKE = 3.2;
  const SPILL_OPEN = 2.4;
  glow.intensity = GLOW_ASLEEP;

  let state = 'closed';
  let started = 0;
  let done = null;
  let finished = null;

  const pose = (p, latch) => {
    const turn = OPEN_TURN * p - latch;
    const out = (radius + 0.12 - inner) * p;
    blades.forEach((blade) => {
      const angle = blade.userData.home + turn;
      blade.rotation.z = angle;
      blade.position.x = Math.cos(angle) * out;
      blade.position.y = Math.sin(angle) * out;
    });
    const sink = clamp(p / 0.4);
    socket.scale.setScalar(Math.max(0.001, 1 - sink));
    socket.position.z = -0.16 - sink * 1.5;
  };

  const settle = () => {
    pose(1, 0);
    blades.forEach((blade) => { blade.visible = false; });
    socket.visible = false;
    glow.intensity = 0;
    spill.intensity = SPILL_OPEN;
    state = 'open';
  };

  const door = {
    group,
    get isOpen() {
      return state === 'open';
    },
    // Opens the door: at once, or over DURATION from the next frame drawn.
    // The promise settles when the blades are home.
    open({ instant = false } = {}) {
      if (state === 'open') return Promise.resolve();
      if (instant) {
        settle();
        done?.();
        return Promise.resolve();
      }
      if (!finished) {
        state = 'opening';
        started = 0;
        finished = new Promise((resolve) => { done = resolve; });
      }
      return finished;
    },
    update(now) {
      if (state !== 'opening') return;
      if (!started) started = now;
      const t = clamp((now - started) / DURATION);
      // The first tenth: the blades unlatch, a small turn back. Then they open.
      const latch = 0.04 * Math.sin(Math.PI * clamp(t / 0.12));
      const p = easeInOutCubic(clamp((t - 0.1) / 0.9));
      pose(p, latch);
      // The reactor flares as it wakes, settles, and goes with the blades;
      // the hall's light swells through the parting blades, then settles.
      glow.intensity = (GLOW_AWAKE + Math.exp(-t * 5) * 14) * (1 - p);
      spill.intensity = SPILL_OPEN * p * (1 + 1.4 * Math.sin(Math.PI * p));
      if (t >= 1) {
        settle();
        done?.();
      }
    },
    dispose() {
      geometries.forEach((g) => g.dispose());
      owned.forEach((m) => m.dispose());
    },
  };
  return door;
}
