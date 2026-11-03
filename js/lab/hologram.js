// Evan as a hologram: his cut-out portrait (img/evan-holo.webp, made once by
// tools/cutout.swift) on a plane, lit as projected light. The photo keeps its
// own colour, so his face stays his: three parts photo to one part arc blue,
// matched by brightness. The effect lives at the edges: a bright rim where the
// cut-out meets the air, faint scanlines, a rare flicker, and a foot that
// dissolves into the projector's beam.

const HUE = 196 / 360; // the scene's arc blue (materials.js)
const RIM = 7; // how far, in texels, the rim reaches across the edge

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D map;
  uniform vec2 texel;
  uniform vec3 arc;
  uniform float time;
  uniform float dip;
  varying vec2 vUv;

  void main() {
    vec4 photo = texture2D(map, vUv);

    // The rim: eight samples around the point; it glows where they are half
    // in the figure and half out, on both sides of the edge.
    float around = 0.0;
    for (int i = 0; i < 8; i++) {
      float a = float(i) * 0.7853982;
      around += texture2D(map, vUv + vec2(cos(a), sin(a)) * texel * ${RIM.toFixed(1)}).a;
    }
    around *= 0.125;
    float rim = 1.0 - abs(around * 2.0 - 1.0);
    rim *= rim;

    // Three parts photo, one part arc blue at the photo's own brightness.
    const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);
    vec3 colour = mix(photo.rgb, arc * (dot(photo.rgb, LUMA) / dot(arc, LUMA)), 0.25);
    colour *= 1.0 + 0.06 * sin(vUv.y * 900.0 + time * 3.0);
    colour *= 1.0 - dip;

    // The cut-out's soft edge is trimmed (it carries the old background), and
    // the figure fades out at its foot and where the photo cut his arms off.
    float foot = smoothstep(0.0, 0.3, vUv.y) * smoothstep(0.0, 0.07, vUv.x) * smoothstep(0.0, 0.07, 1.0 - vUv.x);
    float alpha = smoothstep(0.3, 0.95, photo.a) * foot * 0.95;

    // Premultiplied: the figure is laid over the room, the rim is added to it.
    gl_FragColor = vec4(colour * alpha + arc * 1.6 * rim * foot, alpha);

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export function createHologram(THREE, texture, { height = 1.5 } = {}) {
  const { width: w, height: h } = texture.image;
  const geometry = new THREE.PlaneGeometry((height * w) / h, height);
  geometry.translate(0, height / 2, 0); // its origin is its foot
  const material = new THREE.ShaderMaterial({
    uniforms: {
      map: { value: texture },
      texel: { value: new THREE.Vector2(1 / w, 1 / h) },
      arc: { value: new THREE.Color().setHSL(HUE, 0.9, 0.62) },
      time: { value: 0 },
      dip: { value: 0 },
    },
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    premultipliedAlpha: true,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'hologram';
  mesh.renderOrder = 2;

  // The flicker: a 4% dip for 80 ms, at a random moment every 4 to 9 seconds.
  let next = 4 + Math.random() * 5;
  return {
    mesh,
    step(time) {
      material.uniforms.time.value = time;
      if (time >= next + 0.08) next = time + 4 + Math.random() * 5;
      material.uniforms.dip.value = time >= next ? 0.04 : 0;
    },
    dispose() {
      geometry.dispose();
      material.dispose();
      texture.dispose();
    },
  };
}
