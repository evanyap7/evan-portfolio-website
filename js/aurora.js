// An aurora in the scene: slow curtains of light behind the page that follow
// the reactor's charge. Dormant and faint behind the gate; the more the
// visitor charges the reactor (gate.js writes --charge on <html>), the
// brighter and faster it runs; the wake pulse flares it; then it settles to a
// low glow for the rest of the page, drifting with the scroll and turning
// amber at Contact, as the rest of the scene does.
//
// One small WebGL canvas, drawn at a fraction of the screen's size (it is
// soft light, so the upscale costs nothing you can see). Frames are timed by
// perf.js, which steps the canvas down in size on a slow machine. It is not
// made at all with reduced motion, on a phone, or without WebGL, and it draws
// nothing while the tab is hidden.

import { createGovernor, startingLevel } from './perf.js';

const root = document.documentElement;
const RESTING = 0.34; // the glow once the site is awake
const FLARE = 1.3; // extra brightness at the wake pulse, decaying away

// Fractions of the screen's size, best first.
const RUNGS = [{ scale: 0.34 }, { scale: 0.24 }, { scale: 0.16 }];

const VERTEX = `attribute vec2 p; void main() { gl_Position = vec4(p, 0.0, 1.0); }`;

// Three curtains: each a wandering ribbon of noise, with a crisp lower edge,
// a long soft fade upward, and fine vertical rays. Colour runs green to blue
// to violet up each curtain (cool), or amber to rose (warm, at Contact).
const FRAGMENT = `
precision highp float;
uniform vec2 uRes;
uniform float uTime, uPower, uWarm, uScroll;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}

float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p = p * 2.03 + 17.1;
    a *= 0.5;
  }
  return v;
}

vec3 palette(float t) {
  vec3 cool = mix(vec3(0.08, 0.95, 0.65), vec3(0.15, 0.55, 1.0), t);
  cool = mix(cool, vec3(0.62, 0.28, 1.0), smoothstep(0.55, 1.0, t));
  vec3 warm = mix(vec3(1.0, 0.62, 0.18), vec3(1.0, 0.28, 0.5), t);
  return mix(cool, warm, uWarm);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  uv.x *= uRes.x / uRes.y;
  float t = uTime * (0.05 + 0.05 * uPower);
  vec3 col = vec3(0.0);
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    float wave = fbm(vec2(uv.x * (1.4 + fi * 0.5) + t * (1.0 + fi * 0.45) + fi * 7.3, fi * 3.1 + t * 0.5));
    float centre = 0.64 - fi * 0.08 + (wave - 0.5) * 0.5 + uScroll * 0.1 * (fi + 1.0);
    float d = uv.y - centre;
    float body = exp(-max(d, 0.0) * (4.0 + fi)) * smoothstep(-0.05, 0.0, d);
    float rays = 0.55 + 0.45 * noise(vec2(uv.x * 34.0 + fi * 5.0, t * 4.0));
    col += palette(clamp(d * 3.0, 0.0, 1.0)) * body * rays * (0.62 - fi * 0.14);
  }
  gl_FragColor = vec4(col * (0.08 + 0.92 * uPower), 1.0);
}`;

function compile(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
  return shader;
}

export function initAurora() {
  const scene = document.querySelector('.scene');
  if (!scene) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (window.matchMedia('(max-width: 719px)').matches) return;

  const canvas = document.createElement('canvas');
  canvas.className = 'scene__aurora';
  canvas.setAttribute('aria-hidden', 'true');
  const gl = canvas.getContext('webgl', { alpha: false, antialias: false, powerPreference: 'low-power' });
  if (!gl) return;

  let program;
  try {
    program = gl.createProgram();
    gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERTEX));
    gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAGMENT));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('link');
  } catch {
    return;
  }
  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'p');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  const uniform = (name) => gl.getUniformLocation(program, name);
  const uRes = uniform('uRes');
  const uTime = uniform('uTime');
  const uPower = uniform('uPower');
  const uWarm = uniform('uWarm');
  const uScroll = uniform('uScroll');

  scene.append(canvas);

  // Size ---------------------------------------------------------------
  let scale = RUNGS[startingLevel(RUNGS)].scale;
  const resize = () => {
    const w = Math.max(2, Math.round(scene.clientWidth * scale));
    const h = Math.max(2, Math.round(scene.clientHeight * scale));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
  };
  resize();
  window.addEventListener('resize', resize);

  // Inputs ---------------------------------------------------------------
  let awake = !root.classList.contains('gated');
  let flare = 0;
  document.addEventListener('portfolio:waking', () => {
    awake = true;
    flare = FLARE;
  }, { once: true });

  let progress = 0;
  const readScroll = () => {
    const room = document.documentElement.scrollHeight - window.innerHeight;
    progress = room > 0 ? Math.min(1, Math.max(0, window.scrollY / room)) : 0;
  };
  window.addEventListener('scroll', readScroll, { passive: true });
  readScroll();

  // Frame loop ---------------------------------------------------------
  const governor = createGovernor(RUNGS, {
    level: startingLevel(RUNGS),
    onLevel: (rung) => {
      scale = rung.scale;
      resize();
    },
  });

  let frame = 0;
  let last = 0;
  let clock = 0;
  let power = 0;
  let warm = 0;

  const draw = (now) => {
    frame = requestAnimationFrame(draw);
    const dt = Math.min(0.1, (now - last) / 1000);
    governor.note(now - last);
    last = now;
    clock += dt;

    const held = parseFloat(root.style.getPropertyValue('--charge')) || 0;
    const target = Math.max(held, awake ? RESTING : 0);
    power += (target - power) * (1 - Math.exp(-dt * 5));
    flare *= Math.exp(-dt * 1.1);
    warm += ((root.dataset.stop === 'contact' ? 1 : 0) - warm) * (1 - Math.exp(-dt * 2));

    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uTime, clock);
    gl.uniform1f(uPower, power + flare);
    gl.uniform1f(uWarm, warm);
    gl.uniform1f(uScroll, progress);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  const start = () => {
    if (frame || document.hidden) return;
    last = performance.now();
    frame = requestAnimationFrame(draw);
  };
  const stop = () => {
    cancelAnimationFrame(frame);
    frame = 0;
  };
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    stop();
    canvas.remove();
  });

  start();
  requestAnimationFrame(() => canvas.classList.add('is-live'));
}
