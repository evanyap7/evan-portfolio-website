// The scene in depth (js/lab.js). Each shot of the workshop has a depth map
// beside it (img/scene/<name>-depth.webp, white = near), and one full-screen
// WebGL canvas draws the shots through it, so the photographs behave as a
// room and not as pictures:
//
//   the camera leans with the pointer (or the phone's tilt), and what is
//   near moves further than what is far;
//   scrolling dollies the camera in, near things growing faster, and takes
//   it on into the next shot, which comes up from the far wall forwards;
//   behind the gate the room is dark and the reactor is its only light: it
//   falls on the surfaces near it, brighter as it charges, and on waking the
//   light runs out from the reactor across the room while the camera pushes
//   in.
//
// lab.js keeps its own layers (the spots, the hero's dark pool, the grain)
// over the canvas and hides only their pictures while this is drawing. With
// no WebGL, or a lost context, it shows them again: the page is then the
// still scene it was. Never made under reduced motion.

const root = document.documentElement;

// The resting zoom: the room the camera has to lean and push in.
export const ZOOM = 1.1;
const ENTRY_MS = 2600;
const CUT_S = 0.9;

const VERT = 'attribute vec2 p; void main() { gl_Position = vec4(p, 0.0, 1.0); }';

const FRAG = `
precision highp float;
uniform sampler2D uColA, uDepA, uColB, uDepB;
uniform vec2 uRes;      // the canvas, px
uniform vec2 uFrame;    // the 16:9 picture covering the screen, in screens
uniform vec2 uLean;     // the camera's lean, -1 to 1
uniform vec4 uA, uB;    // per shot: crop centre, zoom, dolly, how far back
uniform float uMix;     // 0 = shot A, 1 = shot B
uniform vec3 uLight;    // the reactor: where on screen, how strong
uniform float uDark;    // the room's light before it wakes
uniform float uIris;    // how far the light has run out from the reactor
uniform float uBlur;    // the push-in's streak, away from the reactor

vec2 grad;

// The picture is 16:9, covers the screen and is cropped at x, as the CSS
// frame is; then the camera: a zoom about (x, 55%) that is greater for near
// things, and a lean that moves them further. The depth is read where the
// camera ends up looking, so a few rounds settle it.
vec4 shot(sampler2D col, sampler2D dep, vec4 p, vec2 s) {
  vec2 o = vec2(p.x, 0.55);
  vec2 uv = vec2((s.x - p.x * (1.0 - uFrame.x)) / uFrame.x, (s.y - 0.5 * (1.0 - uFrame.y)) / uFrame.y);
  vec2 q = uv;
  float d = 0.5;
  for (int i = 0; i < 3; i++) {
    d = texture2D(dep, q).r;
    float z = p.y * (1.0 + p.z * (0.35 + 1.3 * d)) * (1.0 - p.w * 0.05 * (0.5 + d));
    q = o + (uv - o) / z + uLean * (d - 0.3) * vec2(0.012, 0.015);
  }
  vec2 e = vec2(1.0 / 256.0, 0.0);
  grad = vec2(
    texture2D(dep, q + e.xy).r - texture2D(dep, q - e.xy).r,
    texture2D(dep, q + e.yx * 1.78).r - texture2D(dep, q - e.yx * 1.78).r);
  return vec4(texture2D(col, q).rgb, d);
}

void main() {
  vec2 s = vec2(gl_FragCoord.x / uRes.x, 1.0 - gl_FragCoord.y / uRes.y);
  vec2 away = s - uLight.xy;
  vec3 c = vec3(0.0);
  float d = 0.0;
  float n = 0.0;
  for (int i = 0; i < 6; i++) {
    vec2 si = s - away * uBlur * float(i) / 6.0;
    vec4 r;
    if (uMix <= 0.001) {
      r = shot(uColA, uDepA, uA, si);
    } else if (uMix >= 0.999) {
      r = shot(uColB, uDepB, uB, si);
    } else {
      // The next shot comes up from the far wall forwards.
      vec4 a = shot(uColA, uDepA, uA, si);
      vec4 b = shot(uColB, uDepB, uB, si);
      float k = uMix * 1.5 - 0.25;
      r = mix(a, b, 1.0 - smoothstep(k - 0.25, k + 0.25, a.a));
    }
    c += r.rgb;
    if (i == 0) d = r.a;
    n += 1.0;
    if (uBlur <= 0.0005) break;
  }
  c /= n;

  // The grade (as the CSS filter on the stills): less teal, a little of
  // the lamps' warmth, a little more contrast.
  c = mix(vec3(dot(c, vec3(0.2126, 0.7152, 0.0722))), c, 0.6);
  vec3 sepia = vec3(dot(c, vec3(0.393, 0.769, 0.189)), dot(c, vec3(0.349, 0.686, 0.168)), dot(c, vec3(0.272, 0.534, 0.131)));
  c = mix(c, sepia, 0.18);
  c = ((c - 0.5) * 1.08 + 0.5) * 0.95;

  // The room's light. Until the site wakes it is dark, and the reactor
  // lights what is near it and faces it; then the light runs out from the
  // reactor, reaching near things first.
  vec2 off = away * vec2(uRes.x / uRes.y, 1.0);
  float reach = length(vec3(off, (1.0 - d) * 0.45));
  float room = mix(uDark, 1.0, 1.0 - smoothstep(uIris - 0.55, uIris, reach));
  vec3 lamp = vec3(0.0);
  if (uLight.z > 0.001) {
    vec3 normal = normalize(vec3(-grad * 7.0, 1.0));
    vec3 toLight = normalize(vec3(-off, 0.95 - d * 0.6));
    float facing = max(dot(normal, toLight), 0.0);
    lamp = vec3(0.66, 0.9, 1.0) * uLight.z * (0.3 + 0.7 * facing) / (1.0 + dot(off, off) * 9.0);
  }
  gl_FragColor = vec4(clamp(c * (room + lamp), 0.0, 1.0), 1.0);
}`;

function compile(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) || 'shader');
  return shader;
}

function picture(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// `stops` are lab.js's: { name, x: '78%', video? }. `onActive(bool)` says
// when the canvas is the picture and when it is not.
export function createDepthScene(host, stops, { dir, onActive }) {
  const canvas = document.createElement('canvas');
  canvas.className = 'scene__gl';
  let gl;
  let uniforms;
  try {
    gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: 'high-performance' });
    if (!gl) return null;
    const program = gl.createProgram();
    gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAG));
    gl.bindAttribLocation(program, 0, 'p');
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    uniforms = Object.fromEntries(
      ['uColA', 'uDepA', 'uColB', 'uDepB', 'uRes', 'uFrame', 'uLean', 'uA', 'uB', 'uMix', 'uLight', 'uDark', 'uIris', 'uBlur']
        .map((name) => [name, gl.getUniformLocation(program, name)]));
    ['uColA', 'uDepA', 'uColB', 'uDepB'].forEach((name, unit) => gl.uniform1i(uniforms[name], unit));
  } catch {
    return null;
  }
  host.prepend(canvas);

  const n = stops.length;
  const big = gl.getParameter(gl.MAX_TEXTURE_SIZE) >= 2400;
  const reactor = document.querySelector('[data-reactor]');
  const shots = stops.map((stop) => ({ name: stop.name, video: stop.video, x: parseFloat(stop.x) / 100, state: 'none', col: null, dep: null, clip: null }));

  let width = 1;
  let height = 1;
  let scale = 1;
  const resize = () => {
    width = Math.max(1, host.clientWidth);
    height = Math.max(1, host.clientHeight);
    scale = Math.min(window.devicePixelRatio || 1, width < 800 ? 2 : 1.5, 2560 / Math.max(width, height));
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    gl.viewport(0, 0, canvas.width, canvas.height);
  };

  const texture = (source) => {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    if (source) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, source);
    return tex;
  };

  let lost = false;
  let raf = 0;
  let last = 0;
  const invalidate = () => {
    if (!raf && !lost && !document.hidden) raf = requestAnimationFrame(frame);
  };

  let active = false;
  const setActive = (on) => {
    if (on === active) return;
    active = on;
    onActive(on);
  };
  const fail = () => {
    lost = true;
    cancelAnimationFrame(raf);
    raf = 0;
    setActive(false);
  };
  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    fail();
  });

  // A shot's picture and depth map are fetched when the camera is at it or
  // next to it, and let go once it is two shots away.
  const load = (i) => {
    const shot = shots[i];
    if (!shot || shot.state !== 'none') return;
    shot.state = 'loading';
    const drawn = Math.max(width, (height * 16) / 9) * scale;
    const size = big && drawn > 1300 ? 2400 : 1200;
    Promise.all([picture(`${dir}${shot.name}-${size}.webp`), picture(`${dir}${shot.name}-depth.webp`)]).then(([col, dep]) => {
      if (lost || shot.state !== 'loading') return;
      shot.col = texture(col);
      shot.dep = texture(dep);
      shot.state = 'ready';
      invalidate();
    }).catch(fail);
  };
  const drop = (i) => {
    const shot = shots[i];
    if (shot.state === 'ready') {
      gl.deleteTexture(shot.col);
      gl.deleteTexture(shot.dep);
      if (shot.clip) gl.deleteTexture(shot.clip);
      shot.col = null;
      shot.dep = null;
      shot.clip = null;
    }
    shot.state = 'none';
  };
  const ready = (i) => shots[i]?.state === 'ready';

  // Where the camera is: lab.js says how far down the row of shots the page
  // has scrolled (2.4 = four tenths of the way from the third to the
  // fourth) and how far each has pushed in.
  let target = 0;
  let pushes = [];
  let from = 0;
  let to = Math.min(1, n - 1);
  let mix = 0;
  let cut = null;
  let placed = false;

  // Scrolling from one shot to the next scrubs between them. A jump further
  // than that (a link from the nav) dissolves straight to where it lands.
  const travel = (dt) => {
    const f = Math.min(n - 1, Math.max(0, target));
    const a = Math.min(Math.max(0, n - 2), Math.floor(f));
    const b = Math.min(n - 1, a + 1);
    const t = f - a;
    if (!placed) {
      placed = true;
      from = a;
      to = b;
      mix = t;
    }
    [a, b, from, to].forEach(load);
    shots.forEach((shot, i) => {
      if (Math.abs(i - a) > 2 && i !== from && i !== to) drop(i);
    });
    if (cut) {
      if (ready(to)) cut.t = Math.min(1, cut.t + dt / CUT_S);
      mix = cut.t * cut.t * (3 - 2 * cut.t);
      if (cut.t >= 1) {
        cut = null;
        from = to;
        mix = 0;
      }
      return true;
    }
    if (from === a && to === b) {
      const goal = ready(to) ? t : 0;
      mix += (goal - mix) * (1 - Math.exp(-dt * 9));
      if (Math.abs(goal - mix) < 0.002) mix = goal;
      return mix !== goal;
    }
    const shown = mix < 0.5 || from === to ? from : to;
    if (shown === a || shown === b) {
      const side = shown === from ? 0 : 1;
      if (Math.abs(mix - side) < 0.02) {
        from = a;
        to = b;
        mix = shown === a ? 0 : 1;
      } else {
        mix += (side - mix) * (1 - Math.exp(-dt * 16));
      }
      return true;
    }
    from = shown;
    to = t < 0.5 ? a : b;
    mix = 0;
    cut = { t: 0 };
    return true;
  };

  // The lean: the pointer on a desktop, the phone's own tilt where the
  // browser gives it without asking (iOS asks, so there it is left alone).
  let leanX = 0;
  let leanY = 0;
  let wantX = 0;
  let wantY = 0;
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    window.addEventListener('pointermove', (event) => {
      wantX = (event.clientX / window.innerWidth) * 2 - 1;
      wantY = (event.clientY / window.innerHeight) * 2 - 1;
      invalidate();
    }, { passive: true });
    root.addEventListener('pointerleave', () => {
      wantX = 0;
      wantY = 0;
      invalidate();
    });
  } else if ('DeviceOrientationEvent' in window && typeof window.DeviceOrientationEvent.requestPermission !== 'function') {
    let rest = null;
    window.addEventListener('deviceorientation', (event) => {
      if (event.gamma === null || event.beta === null) return;
      // However the phone is held when it first reports is level.
      if (rest === null) rest = event.beta;
      wantX = Math.max(-1, Math.min(1, event.gamma / 18));
      wantY = Math.max(-1, Math.min(1, (event.beta - rest) / 18));
      invalidate();
    }, { passive: true });
  }

  // The way in: 0 while the gate is shut, 1 once the room is up.
  let entry = root.classList.contains('gated') ? 0 : 1;
  let entryAt = 0;
  let charge = 0;
  let lightX = 0.5;
  let lightY = 0.5;

  const bind = (unit, tex) => {
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, tex);
  };
  // A shot with a clip draws the clip's frame while it is playing.
  const colour = (shot) => {
    const video = shot.video;
    if (!video || video.paused || video.readyState < 2) return { tex: shot.col, moving: false };
    if (!shot.clip) shot.clip = texture(null);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, shot.clip);
    try {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, video);
    } catch {
      return { tex: shot.col, moving: false };
    }
    return { tex: shot.clip, moving: true };
  };

  function frame(now) {
    raf = 0;
    const dt = Math.min(0.1, (now - (last || now)) / 1000);
    last = now;
    let busy = travel(dt);

    leanX += (wantX - leanX) * (1 - Math.exp(-dt * 4));
    leanY += (wantY - leanY) * (1 - Math.exp(-dt * 4));
    if (Math.abs(wantX - leanX) + Math.abs(wantY - leanY) > 0.002) busy = true;

    // Behind the gate the reactor is where the light is, and its charge is
    // how much there is.
    let back = 0;
    let lamp = 0;
    let dark = 1;
    let iris = 4;
    let blur = 0;
    if (entry < 1) {
      if (!entryAt) {
        charge = parseFloat(root.style.getPropertyValue('--charge')) || 0;
        if (reactor) {
          const box = reactor.getBoundingClientRect();
          const own = host.getBoundingClientRect();
          lightX = (box.left + box.width / 2 - own.left) / own.width;
          lightY = (box.top + box.height / 2 - own.top) / own.height;
        }
        back = 1 - 0.2 * charge;
        iris = 0;
        if (charge > 0) busy = true;
      } else {
        const t = Math.min(1, (now - entryAt) / ENTRY_MS);
        entry = t;
        back = 0.8 * (1 - t) ** 4;
        iris = 3.4 * (1 - (1 - t) ** 2.4);
        blur = 0.1 * (1 - t) ** 3 * Math.min(1, t * 14);
        busy = true;
      }
      dark = 0.13 + 0.22 * charge;
      lamp = (0.5 + 1.5 * charge) * (1 - entry) ** 2;
    }

    if (!ready(from)) {
      setActive(false);
      if (busy) raf = requestAnimationFrame(frame);
      return;
    }
    const b = ready(to) ? to : from;
    const shown = ready(to) ? mix : 0;
    const colA = colour(shots[from]);
    const colB = b === from ? colA : colour(shots[b]);
    bind(0, colA.tex);
    bind(1, shots[from].dep);
    bind(2, colB.tex);
    bind(3, shots[b].dep);
    if ((colA.moving && shown < 0.999) || (colB.moving && shown > 0.001)) busy = true;

    const param = (i) => [shots[i].x, ZOOM, pushes[i] ?? 0, i === 0 ? back : 0];
    gl.uniform2f(uniforms.uRes, canvas.width, canvas.height);
    gl.uniform2f(uniforms.uFrame, Math.max(width, (height * 16) / 9) / width, Math.max(height, (width * 9) / 16) / height);
    gl.uniform2f(uniforms.uLean, leanX, leanY);
    gl.uniform4fv(uniforms.uA, param(from));
    gl.uniform4fv(uniforms.uB, param(b));
    gl.uniform1f(uniforms.uMix, shown);
    gl.uniform3f(uniforms.uLight, lightX, lightY, lamp);
    gl.uniform1f(uniforms.uDark, dark);
    gl.uniform1f(uniforms.uIris, iris);
    gl.uniform1f(uniforms.uBlur, blur);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    setActive(true);
    if (busy) raf = requestAnimationFrame(frame);
  }

  resize();
  window.addEventListener('resize', () => {
    resize();
    invalidate();
  });
  document.addEventListener('visibilitychange', () => {
    last = 0;
    invalidate();
  });
  document.addEventListener('gate:charge', invalidate);

  return {
    // Where the page has scrolled to, and each shot's push.
    set(f, push) {
      target = f;
      pushes = push;
      invalidate();
    },
    // The gate has opened: the light runs out and the camera pushes in.
    wake() {
      if (entry >= 1 || entryAt) return;
      charge = 1;
      entryAt = performance.now();
      invalidate();
    },
    // A clip has started or stopped.
    invalidate,
  };
}
