// Slow plum-and-pink noise field behind the contact section, drawn with a
// single full-screen triangle in raw WebGL. Loaded on demand by main.js.

const VERTEX = `
attribute vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}`;

const FRAGMENT = `
precision mediump float;
uniform vec2 resolution;
uniform float time;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 4; i++) {
    value += amplitude * noise(p);
    p = p * 2.03 + 17.0;
    amplitude *= 0.5;
  }
  return value;
}

void main() {
  vec2 uv = gl_FragCoord.xy / resolution;
  vec2 p = vec2(uv.x * resolution.x / resolution.y, uv.y) * 1.5;
  float t = time * 0.035;

  // Warp the field with itself so it drifts like ink rather than scrolling.
  float warp = fbm(p * 1.2 - vec2(t * 0.6, t));
  float field = fbm(p + warp * 1.4 + vec2(t, -t * 0.5));

  vec3 deep = vec3(0.141, 0.110, 0.196);
  vec3 plum = vec3(0.184, 0.145, 0.259);
  vec3 pink = vec3(0.851, 0.424, 0.612);

  vec3 color = mix(deep, plum, smoothstep(0.25, 0.7, field));
  color = mix(color, pink, smoothstep(0.55, 0.95, field) * 0.3);
  color += (hash(gl_FragCoord.xy + time) - 0.5) * 0.03;

  gl_FragColor = vec4(color, 1.0);
}`;

const FRAME_MS = 1000 / 30;
const MAX_PIXEL_RATIO = 1.5;

function compile(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
}

export function startShader(canvas) {
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' });
  if (!gl) return;

  const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
  if (!vertex || !fragment) return;

  const program = gl.createProgram();
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
  gl.useProgram(program);

  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'position');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  const resolution = gl.getUniformLocation(program, 'resolution');
  const time = gl.getUniformLocation(program, 'time');

  const resize = () => {
    const ratio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
    canvas.width = Math.max(1, Math.round(canvas.clientWidth * ratio));
    canvas.height = Math.max(1, Math.round(canvas.clientHeight * ratio));
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(resolution, canvas.width, canvas.height);
  };

  let frame = 0;
  let lastDraw = 0;
  let onScreen = false;

  const draw = (now) => {
    frame = requestAnimationFrame(draw);
    if (now - lastDraw < FRAME_MS) return;
    lastDraw = now;
    gl.uniform1f(time, now / 1000);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    canvas.classList.add('is-ready');
  };

  const sync = () => {
    const shouldRun = onScreen && !document.hidden;
    if (shouldRun && !frame) {
      frame = requestAnimationFrame(draw);
    } else if (!shouldRun && frame) {
      cancelAnimationFrame(frame);
      frame = 0;
    }
  };

  new ResizeObserver(resize).observe(canvas);
  new IntersectionObserver(([entry]) => {
    onScreen = entry.isIntersecting;
    sync();
  }).observe(canvas);
  document.addEventListener('visibilitychange', sync);

  resize();
}
