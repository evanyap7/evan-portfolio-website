// Light in the air: a shaft from each bay's lamp down to its suit, the way a
// downlight reads through the haze of a workshop. Each is an open cone, drawn
// additively and brightest where the eye looks through the most of it, so it
// has no hard edge; the haze in it drifts slowly. Desktop only (room.js).

const vertexShader = /* glsl */ `
  varying float vH;
  varying vec3 vNormal;
  varying vec3 vView;
  varying vec3 vWorld;
  void main() {
    vH = uv.y;
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    vec4 mv = viewMatrix * world;
    vNormal = normalize(normalMatrix * normal);
    vView = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 tint;
  uniform float strength;
  uniform float time;
  varying float vH;
  varying vec3 vNormal;
  varying vec3 vView;
  varying vec3 vWorld;
  void main() {
    float body = pow(abs(dot(vNormal, vView)), 1.6);
    float h = clamp(vH, 0.0, 1.0);
    // Strongest under the lamp, thinning toward the floor, soft at both ends.
    float fall = mix(0.3, 1.0, h * h) * smoothstep(0.0, 0.12, h) * smoothstep(1.0, 0.9, h);
    // Slow uneven haze, so the shaft is not a clean gradient.
    float drift = 0.8 + 0.2 * sin(vWorld.y * 3.1 + time * 0.4 + vWorld.z * 2.3) * sin(vWorld.y * 1.7 - time * 0.27);
    gl_FragColor = vec4(tint * body * fall * drift * strength, 1.0);
  }
`;

// lamps: [x, z] of each shaft's foot; top: the height its lamp hangs at.
export function createShafts(THREE, lamps, { top, radius = [0.3, 0.72] }) {
  const height = top - 0.1;
  const geometry = new THREE.CylinderGeometry(radius[0], radius[1], height, 40, 1, true);
  geometry.translate(0, height / 2 + 0.1, 0);
  const materials = [];
  const meshes = lamps.map(([x, z]) => {
    const material = new THREE.ShaderMaterial({
      uniforms: {
        tint: { value: new THREE.Color(0xdff0ff) },
        strength: { value: 0.1 },
        time: { value: 0 },
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    });
    materials.push(material);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = 'shaft';
    mesh.position.set(x, 0, z);
    mesh.renderOrder = 3;
    return mesh;
  });
  return {
    meshes,
    // How bright bay k's shaft is, and (optionally) its tint.
    set(k, strength, colour) {
      const m = materials[k];
      if (!m) return;
      m.uniforms.strength.value = strength;
      if (colour) m.uniforms.tint.value.copy(colour);
    },
    update(now) {
      const t = (now / 1000) % 1000;
      materials.forEach((m) => { m.uniforms.time.value = t; });
    },
    dispose() {
      geometry.dispose();
      materials.forEach((m) => m.dispose());
    },
  };
}
