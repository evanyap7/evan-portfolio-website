// The small things that make a room look used rather than modelled: panel
// seams in the walls, vent grilles, cable runs with their clamps, hazard
// striping along the bay edge and stencilled bay numbers on the floor. All of
// it is dim and instanced or drawn on a canvas, so it costs a few draw calls
// and no downloads.

function canvas(THREE, w, h, draw, { repeatX = 1, repeatY = 1, color = true } = {}) {
  const el = document.createElement('canvas');
  el.width = w;
  el.height = h;
  draw(el.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(el);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeatX, repeatY);
  t.anisotropy = 4;
  if (color) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const hazard = (ctx, w, h) => {
  ctx.fillStyle = '#0b0b0b';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#c99a1c';
  for (let x = -h; x < w + h; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, h);
    ctx.lineTo(x + 16, h);
    ctx.lineTo(x + 16 + h, 0);
    ctx.lineTo(x + h, 0);
    ctx.closePath();
    ctx.fill();
  }
};

const grille = (ctx, w, h) => {
  ctx.fillStyle = '#05070a';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#2c3540';
  for (let y = 6; y < h - 4; y += 10) ctx.fillRect(6, y, w - 12, 4);
  ctx.strokeStyle = '#3a4550';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, w - 4, h - 4);
};

const stencil = (text) => (ctx, w, h) => {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(214,222,230,0.55)';
  ctx.font = '700 44px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, w / 2, h / 2);
};

export function createDetails(THREE, materials, { group, own, owned, instanced, H, HALF, END, BAYS }) {
  const line = own(new THREE.BoxGeometry(1, 1, 1));
  const length = -END;
  const mid = END / 2;
  const textures = [];
  const tex = (t) => {
    textures.push(t);
    return t;
  };

  // Panel seams: a dark groove every two metres up the left wall and one
  // horizontal break at shoulder height, proud by a hair so they catch light.
  const seam = new THREE.MeshStandardMaterial({ color: 0x030507, roughness: 0.8, metalness: 0.4 });
  owned.push(seam);
  const seams = [{ at: [-HALF + 0.004, 1.2, mid], scale: [0.008, 0.018, length] }];
  for (let z = -1; z > END; z -= 2) seams.push({ at: [-HALF + 0.004, H / 2, z], scale: [0.008, H, 0.014] });
  group.add(instanced(THREE, line, seam, seams));

  // Vent grilles between the pilasters, high on the left wall.
  const grilleMap = tex(canvas(THREE, 128, 96, grille, { color: true }));
  const vent = new THREE.MeshStandardMaterial({ map: grilleMap, roughness: 0.6, metalness: 0.6 });
  owned.push(vent);
  const vents = [];
  for (let z = -4; z > END + 2; z -= 8) vents.push({ at: [-HALF + 0.01, 3.3, z], ry: Math.PI / 2, scale: [1.0, 0.75, 1] });
  group.add(instanced(THREE, own(new THREE.PlaneGeometry(1, 1)), vent, vents));

  // Cable runs: a bundle along the wall foot and one along the ceiling edge,
  // held by clamps every metre and a half.
  const cable = new THREE.MeshStandardMaterial({ color: 0x0a0c0f, roughness: 0.55, metalness: 0.1 });
  owned.push(cable);
  const tube = own(new THREE.CylinderGeometry(0.5, 0.5, 1, 10));
  const runs = [
    { at: [-HALF + 0.07, 0.2, mid], rx: Math.PI / 2, scale: [0.05, length, 0.05] },
    { at: [-HALF + 0.09, 0.27, mid], rx: Math.PI / 2, scale: [0.035, length, 0.035] },
    { at: [-HALF + 0.07, H - 0.35, mid], rx: Math.PI / 2, scale: [0.07, length, 0.07] },
  ];
  group.add(instanced(THREE, tube, cable, runs));
  const clamps = [];
  for (let z = -0.75; z > END; z -= 1.5) {
    clamps.push({ at: [-HALF + 0.07, 0.235, z], scale: [0.09, 0.14, 0.04] });
    clamps.push({ at: [-HALF + 0.07, H - 0.35, z], scale: [0.1, 0.12, 0.04] });
  }
  group.add(instanced(THREE, line, materials.metal, clamps));

  // Hazard striping along the edge of the bay platform, floor level.
  const hazardMap = tex(canvas(THREE, 256, 32, hazard, { repeatX: 1, repeatY: 1 }));
  hazardMap.repeat.set(Math.round((BAYS.count * -BAYS.step) / 0.5), 1);
  const stripe = new THREE.MeshStandardMaterial({ map: hazardMap, roughness: 0.7, metalness: 0.1, color: 0x9a9a9a });
  owned.push(stripe);
  const lastBay = BAYS.first + BAYS.step * (BAYS.count - 1);
  const run = (BAYS.first - lastBay) + 2.6;
  const hazardStrip = new THREE.Mesh(own(new THREE.PlaneGeometry(run, 0.12)), stripe);
  hazardStrip.rotation.set(-Math.PI / 2, 0, Math.PI / 2);
  hazardStrip.position.set(BAYS.x - 1.2, 0.004, (BAYS.first + lastBay) / 2);
  group.add(hazardStrip);

  // Stencilled bay numbers on the floor in front of each plinth.
  const numberGeometry = own(new THREE.PlaneGeometry(0.7, 0.35));
  for (let k = 0; k < BAYS.count; k += 1) {
    const map = tex(canvas(THREE, 192, 96, stencil(`BAY 0${k + 1}`)));
    const material = new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, toneMapped: true });
    owned.push(material);
    const label = new THREE.Mesh(numberGeometry, material);
    label.rotation.set(-Math.PI / 2, 0, -Math.PI / 2);
    label.position.set(BAYS.x - 1.7, 0.005, BAYS.first + BAYS.step * k);
    group.add(label);
  }

  return {
    dispose() {
      textures.forEach((t) => t.dispose());
    },
  };
}
