// The lab's one material language. Every surface in the lab is one of these:
// brushed metal, dark lacquer, warm wood (the bar and the office only), rubber,
// fabric, glass, and two kinds of light, the holo blue and the strips. The few
// textures are drawn on canvases here, so the lab downloads no images.

const HUE = 196 / 360; // the scene's arc blue, as in the Hall

function canvasTexture(THREE, size, draw, { repeat = 1, color = true } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  draw(canvas.getContext('2d'), size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat, repeat);
  texture.anisotropy = 4;
  if (color) texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// A small seeded random, so the textures come out the same on every visit.
function random(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// Brushed metal: fine horizontal streaks in the roughness.
function brushed(ctx, size) {
  const rnd = random(7);
  ctx.fillStyle = '#7a7a7a';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < size * 3; i += 1) {
    const v = 90 + rnd() * 70;
    ctx.fillStyle = `rgba(${v},${v},${v},0.35)`;
    ctx.fillRect(rnd() * size, rnd() * size, 20 + rnd() * size * 0.6, 1);
  }
}

// Wood: long grain in warm browns, with darker lines of figure.
function grain(ctx, size) {
  const rnd = random(11);
  ctx.fillStyle = '#6b4429';
  ctx.fillRect(0, 0, size, size);
  for (let y = 0; y < size; y += 1) {
    const wave = Math.sin(y * 0.045) * 0.5 + Math.sin(y * 0.013 + 1.7) * 0.5;
    const shade = 0.5 + wave * 0.5;
    ctx.fillStyle = `rgba(${40 + shade * 30},${22 + shade * 16},${12 + shade * 8},${0.25 + rnd() * 0.25})`;
    ctx.fillRect(0, y, size, 1);
  }
  for (let i = 0; i < 220; i += 1) {
    ctx.fillStyle = `rgba(30,16,8,${0.12 + rnd() * 0.18})`;
    ctx.fillRect(0, rnd() * size, size, 1 + rnd() * 2);
  }
}

// The lab floor: dark resin panels, a metre square, with a faint seam between
// them and a little grain so the light pools instead of sitting flat.
function floorPanels(ctx, size) {
  const rnd = random(23);
  ctx.fillStyle = '#4a4a4a';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < size * size * 0.06; i += 1) {
    const v = 50 + rnd() * 50;
    ctx.fillStyle = `rgba(${v},${v},${v},0.5)`;
    ctx.fillRect(rnd() * size, rnd() * size, 1, 1);
  }
  ctx.fillStyle = 'rgba(200,200,200,0.9)';
  ctx.fillRect(0, 0, size, 2);
  ctx.fillRect(0, 0, 2, size);
}

export function createMaterials(THREE, tier = 'desktop') {
  const phone = tier === 'phone';
  const textures = [];
  const keep = (texture) => {
    textures.push(texture);
    return texture;
  };

  const brushedMap = keep(canvasTexture(THREE, phone ? 128 : 256, brushed, { color: false }));
  const woodMap = keep(canvasTexture(THREE, phone ? 256 : 512, grain));
  const floorMap = keep(canvasTexture(THREE, phone ? 256 : 512, floorPanels, { color: false }));

  const metal = new THREE.MeshStandardMaterial({
    color: 0x9aa6b2, metalness: 0.92, roughness: 0.34, roughnessMap: brushedMap,
  });
  const lacquer = new THREE.MeshStandardMaterial({ color: 0x0a0e13, metalness: 0.25, roughness: 0.24 });
  const wood = new THREE.MeshStandardMaterial({ color: 0xffffff, map: woodMap, metalness: 0, roughness: 0.52 });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x15171a, metalness: 0, roughness: 0.92 });
  const fabric = new THREE.MeshStandardMaterial({ color: 0x23272d, metalness: 0, roughness: 1 });
  const glass = new THREE.MeshStandardMaterial({
    color: 0xa8dcff, metalness: 0, roughness: 0.04, transparent: true, opacity: 0.1, depthWrite: false,
  });
  // The floor reads the panel texture as its roughness and its bump, so the
  // seams catch the light differently from the panels.
  const floor = new THREE.MeshStandardMaterial({
    color: 0x10161c, metalness: 0.35, roughness: 0.42, roughnessMap: floorMap, bumpMap: floorMap, bumpScale: 0.6,
  });

  // Light: unlit, and not tone mapped, so values over 1 reach the bloom.
  const cache = new Map();
  const light = (kind, intensity, make) => {
    const key = `${kind}:${intensity}`;
    if (!cache.has(key)) cache.set(key, make());
    return cache.get(key);
  };
  const holo = (intensity = 1) => light('holo', intensity, () => {
    const color = new THREE.Color().setHSL(HUE, 0.9, 0.62).multiplyScalar(intensity);
    return new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
    });
  });
  const strip = (intensity = 1) => light('strip', intensity, () => {
    const color = new THREE.Color().setHSL(HUE, 0.55, 0.86).multiplyScalar(intensity);
    return new THREE.MeshBasicMaterial({ color, toneMapped: false });
  });

  const materials = { metal, lacquer, wood, rubber, fabric, glass, floor, holo, strip, textures: { brushedMap, woodMap, floorMap } };
  materials.dispose = () => {
    [metal, lacquer, wood, rubber, fabric, glass, floor, ...cache.values()].forEach((m) => m.dispose());
    textures.forEach((t) => t.dispose());
  };
  return materials;
}
