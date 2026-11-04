// Dust in the air of the gallery: a few hundred specks hanging in the light
// over the bays, drifting slowly. All the motion is in the vertex shader, so a
// frame costs one draw call and no work on the CPU. Desktop only.

export function createDust(THREE, { count = 260, x = [-1.5, 5.4], y = [0.3, 3.2], z = [-30, -12.5] } = {}) {
  let seed = 91;
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const base = new Float32Array(count * 3);
  const phase = new Float32Array(count * 2);
  for (let i = 0; i < count; i += 1) {
    base[i * 3] = x[0] + rnd() * (x[1] - x[0]);
    base[i * 3 + 1] = y[0] + rnd() * (y[1] - y[0]);
    base[i * 3 + 2] = z[0] + rnd() * (z[1] - z[0]);
    phase[i * 2] = rnd() * 6.283;
    phase[i * 2 + 1] = 0.4 + rnd() * 0.9; // size and brightness of this speck
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(base, 3));
  geometry.setAttribute('phase', new THREE.BufferAttribute(phase, 2));
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { time: { value: 0 }, scale: { value: 400 } },
    vertexShader: `
      attribute vec2 phase;
      uniform float time;
      uniform float scale;
      varying float vAlpha;
      void main() {
        vec3 p = position;
        float t = time * 0.12 + phase.x;
        p += vec3(sin(t * 1.3), sin(t) * 0.6 + time * 0.0, cos(t * 0.9)) * 0.35;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = clamp(scale * phase.y * 0.03 / -mv.z, 1.5, 5.0);
        // A speck twinkles as it turns in and out of the light.
        vAlpha = (0.25 + 0.75 * abs(sin(t * 2.1))) * phase.y * 0.95;
      }`,
    fragmentShader: `
      varying float vAlpha;
      void main() {
        float d = length(gl_PointCoord - 0.5) * 2.0;
        if (d > 1.0) discard;
        gl_FragColor = vec4(vec3(0.62, 0.8, 1.0), (1.0 - d) * vAlpha);
      }`,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  points.renderOrder = 3;
  return {
    points,
    update(now) {
      material.uniforms.time.value = now / 1000;
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}
