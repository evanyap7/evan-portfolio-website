// The camera's last touch: a little film grain, a soft vignette and a faint
// colour fringe toward the corners, the way a real lens renders a bright room.
// It is a pass on the bloom composer, so the frame-time governor drops it with
// the bloom on a machine that is struggling.

export const lens = {
  name: 'LabLens',
  uniforms: {
    tDiffuse: { value: null },
    time: { value: 0 },
    grain: { value: 0.035 },
    vignette: { value: 0.34 },
    fringe: { value: 0.0016 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float time;
    uniform float grain;
    uniform float vignette;
    uniform float fringe;
    varying vec2 vUv;

    float hash(vec2 p) {
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
    }

    void main() {
      vec2 c = vUv - 0.5;
      float r2 = dot(c, c);
      // Red and blue are pushed apart a hair, more toward the edge.
      vec2 shift = c * r2 * fringe * 2.2;
      vec3 col = vec3(
        texture2D(tDiffuse, vUv + shift).r,
        texture2D(tDiffuse, vUv).g,
        texture2D(tDiffuse, vUv - shift).b);
      col *= 1.0 - vignette * smoothstep(0.1, 0.62, r2 * 2.2);
      // Grain is strongest in the shadows, where film shows it.
      float luma = dot(col, vec3(0.299, 0.587, 0.114));
      float n = hash(vUv * 1400.0 + fract(time * 24.0) * 37.0) - 0.5;
      col += n * grain * (1.0 - luma * 0.7);
      gl_FragColor = vec4(col, 1.0);
    }`,
};
