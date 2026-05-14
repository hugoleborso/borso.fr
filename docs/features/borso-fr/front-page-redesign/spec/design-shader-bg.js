// Galaxy background — vanilla WebGL.
// Fragment shader adapted from the react-bits Galaxy component
// (MIT, © David Haz — https://github.com/DavidHDev/react-bits).

(function(){
  const PARAMS = {
    starSpeed:        0.3,
    density:          2.2,
    hueShift:         205,
    speed:            1.2,
    glowIntensity:    0.25,
    saturation:       0.2,
    twinkleIntensity: 0.3,
    rotationSpeed:    0.1,
    repulsionStrength:2,
    mouseRepulsion:   true,
  };

  const VERT = `
    attribute vec2 position;
    varying vec2 vUv;
    void main(){
      vUv = position * 0.5 + 0.5;
      gl_Position = vec4(position, 0.0, 1.0);
    }
  `;

  const FRAG = `
    precision highp float;
    uniform float uTime;
    uniform vec2  uResolution;
    uniform vec2  uFocal;
    uniform vec2  uRotation;
    uniform float uStarSpeed;
    uniform float uDensity;
    uniform float uHueShift;
    uniform float uSpeed;
    uniform vec2  uMouse;
    uniform float uGlowIntensity;
    uniform float uSaturation;
    uniform float uTwinkleIntensity;
    uniform float uRotationSpeed;
    uniform float uRepulsionStrength;
    uniform float uMouseActiveFactor;
    uniform float uMouseRepulsion;
    varying vec2 vUv;

    #define NUM_LAYER 4.0
    #define STAR_COLOR_CUTOFF 0.2
    #define MAT45 mat2(0.7071, -0.7071, 0.7071, 0.7071)
    #define PERIOD 3.0

    float Hash21(vec2 p){
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
    }
    float tri(float x){ return abs(fract(x) * 2.0 - 1.0); }
    float tris(float x){ float t = fract(x); return 1.0 - smoothstep(0.0, 1.0, abs(2.0 * t - 1.0)); }
    float trisn(float x){ float t = fract(x); return 2.0 * (1.0 - smoothstep(0.0, 1.0, abs(2.0 * t - 1.0))) - 1.0; }

    vec3 hsv2rgb(vec3 c){
      vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
      vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
      return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
    }

    float Star(vec2 uv, float flare){
      float d = length(uv);
      float m = (0.05 * uGlowIntensity) / d;
      float rays = smoothstep(0.0, 1.0, 1.0 - abs(uv.x * uv.y * 1000.0));
      m += rays * flare * uGlowIntensity;
      uv *= MAT45;
      rays = smoothstep(0.0, 1.0, 1.0 - abs(uv.x * uv.y * 1000.0));
      m += rays * 0.3 * flare * uGlowIntensity;
      m *= smoothstep(1.0, 0.2, d);
      return m;
    }

    vec3 StarLayer(vec2 uv){
      vec3 col = vec3(0.0);
      vec2 gv = fract(uv) - 0.5;
      vec2 id = floor(uv);
      for(int y = -1; y <= 1; y++){
        for(int x = -1; x <= 1; x++){
          vec2 offset = vec2(float(x), float(y));
          vec2 si = id + offset;
          float seed = Hash21(si);
          float size = fract(seed * 345.32);
          float glossLocal = tri(uStarSpeed / (PERIOD * seed + 1.0));
          float flareSize = smoothstep(0.9, 1.0, size) * glossLocal;
          float red = smoothstep(STAR_COLOR_CUTOFF, 1.0, Hash21(si + 1.0)) + STAR_COLOR_CUTOFF;
          float blu = smoothstep(STAR_COLOR_CUTOFF, 1.0, Hash21(si + 3.0)) + STAR_COLOR_CUTOFF;
          float grn = min(red, blu) * seed;
          vec3 base = vec3(red, grn, blu);
          float hue = atan(base.g - base.r, base.b - base.r) / (2.0 * 3.14159) + 0.5;
          hue = fract(hue + uHueShift / 360.0);
          float sat = length(base - vec3(dot(base, vec3(0.299, 0.587, 0.114)))) * uSaturation;
          float val = max(max(base.r, base.g), base.b);
          base = hsv2rgb(vec3(hue, sat, val));
          vec2 pad = vec2(tris(seed * 34.0 + uTime * uSpeed / 10.0),
                          tris(seed * 38.0 + uTime * uSpeed / 30.0)) - 0.5;
          float star = Star(gv - offset - pad, flareSize);
          vec3 color = base;
          float twinkle = trisn(uTime * uSpeed + seed * 6.2831) * 0.5 + 1.0;
          twinkle = mix(1.0, twinkle, uTwinkleIntensity);
          star *= twinkle;
          col += star * size * color;
        }
      }
      return col;
    }

    void main(){
      vec2 focalPx = uFocal * uResolution.xy;
      vec2 uv = (vUv * uResolution.xy - focalPx) / uResolution.y;

      if(uMouseRepulsion > 0.5){
        vec2 mousePosUV = (uMouse * uResolution.xy - focalPx) / uResolution.y;
        float mouseDist = length(uv - mousePosUV);
        vec2 repulsion = normalize(uv - mousePosUV) * (uRepulsionStrength / (mouseDist + 0.1));
        uv += repulsion * 0.05 * uMouseActiveFactor;
      } else {
        vec2 mouseNorm = uMouse - vec2(0.5);
        uv += mouseNorm * 0.1 * uMouseActiveFactor;
      }

      float autoRotAngle = uTime * uRotationSpeed;
      mat2 autoRot = mat2(cos(autoRotAngle), -sin(autoRotAngle), sin(autoRotAngle), cos(autoRotAngle));
      uv = autoRot * uv;
      uv = mat2(uRotation.x, -uRotation.y, uRotation.y, uRotation.x) * uv;

      vec3 col = vec3(0.0);
      for(float i = 0.0; i < 1.0; i += 1.0 / NUM_LAYER){
        float depth = fract(i + uStarSpeed * uSpeed);
        float scale = mix(20.0 * uDensity, 0.5 * uDensity, depth);
        float fade = depth * smoothstep(1.0, 0.9, depth);
        col += StarLayer(uv * scale + i * 453.32) * fade;
      }

      gl_FragColor = vec4(col, 1.0);
    }
  `;

  function compile(gl, type, src){
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if(!gl.getShaderParameter(sh, gl.COMPILE_STATUS)){
      console.error('shader compile:', gl.getShaderInfoLog(sh));
      gl.deleteShader(sh);
      return null;
    }
    return sh;
  }

  function init(){
    const wrap = document.getElementById('bg-canvas-wrap');
    if(!wrap) return;
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block';
    wrap.appendChild(canvas);

    const gl = canvas.getContext('webgl', { alpha: false, antialias: false, premultipliedAlpha: false })
            || canvas.getContext('experimental-webgl');
    if(!gl){ console.warn('WebGL unavailable'); return; }

    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if(!vs || !fs) return;
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if(!gl.getProgramParameter(prog, gl.LINK_STATUS)){
      console.error('program link:', gl.getProgramInfoLog(prog));
      return;
    }
    gl.useProgram(prog);

    // Fullscreen triangle (covers clip-space).
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1,
       3, -1,
      -1,  3,
    ]), gl.STATIC_DRAW);
    const posLoc = gl.getAttribLocation(prog, 'position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    const U = {};
    ['uTime','uResolution','uFocal','uRotation','uStarSpeed','uDensity','uHueShift',
     'uSpeed','uMouse','uGlowIntensity','uSaturation','uTwinkleIntensity',
     'uRotationSpeed','uRepulsionStrength','uMouseActiveFactor','uMouseRepulsion']
      .forEach(n => U[n] = gl.getUniformLocation(prog, n));

    gl.uniform2f(U.uFocal, 0.5, 0.5);
    gl.uniform2f(U.uRotation, 1.0, 0.0);

    // Seed ALL uniforms synchronously so the very first draw renders a real
    // starfield even if the rAF loop is throttled (e.g. hidden tab on load).
    function pushUniforms(time){
      gl.uniform1f(U.uTime,              time);
      gl.uniform1f(U.uStarSpeed,         (time * PARAMS.starSpeed) / 10.0);
      gl.uniform1f(U.uDensity,           PARAMS.density);
      gl.uniform1f(U.uHueShift,          PARAMS.hueShift);
      gl.uniform1f(U.uSpeed,             PARAMS.speed);
      gl.uniform1f(U.uGlowIntensity,     PARAMS.glowIntensity);
      gl.uniform1f(U.uSaturation,        PARAMS.saturation);
      gl.uniform1f(U.uTwinkleIntensity,  PARAMS.twinkleIntensity);
      gl.uniform1f(U.uRotationSpeed,     PARAMS.rotationSpeed);
      gl.uniform1f(U.uRepulsionStrength, PARAMS.repulsionStrength);
      gl.uniform1f(U.uMouseRepulsion,    PARAMS.mouseRepulsion ? 1.0 : 0.0);
    }

    function resize(){
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(wrap.offsetWidth  || window.innerWidth,  1);
      const h = Math.max(wrap.offsetHeight || window.innerHeight, 1);
      const cw = Math.floor(w * dpr);
      const ch = Math.floor(h * dpr);
      if(canvas.width !== cw || canvas.height !== ch){
        canvas.width = cw; canvas.height = ch;
        gl.viewport(0, 0, cw, ch);
        gl.uniform2f(U.uResolution, cw, ch);
      }
    }
    window.addEventListener('resize', resize);
    // Also react to layout-driven size changes of the wrap itself.
    if(window.ResizeObserver){
      const ro = new ResizeObserver(resize);
      ro.observe(wrap);
    }
    resize();

    const target = { x: 0.5, y: 0.5, active: 0 };
    const smooth = { x: 0.5, y: 0.5, active: 0 };
    window.addEventListener('pointermove', (e) => {
      const r = wrap.getBoundingClientRect();
      target.x = (e.clientX - r.left) / r.width;
      target.y = 1.0 - (e.clientY - r.top) / r.height;
      target.active = 1.0;
    });
    window.addEventListener('pointerleave', () => { target.active = 0; });

    // Synchronous first draw: starfield is visible even before rAF ticks.
    pushUniforms(0);
    gl.uniform1f(U.uMouseActiveFactor, 0);
    gl.uniform2f(U.uMouse, 0.5, 0.5);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    function frame(t){
      resize(); // cheap; only updates GL state if size actually changed
      const time = t * 0.001;
      const k = 0.05;
      smooth.x += (target.x - smooth.x) * k;
      smooth.y += (target.y - smooth.y) * k;
      smooth.active += (target.active - smooth.active) * k;

      pushUniforms(time);
      gl.uniform1f(U.uMouseActiveFactor, smooth.active);
      gl.uniform2f(U.uMouse,             smooth.x, smooth.y);

      gl.drawArrays(gl.TRIANGLES, 0, 3);
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  // Expose controller for the Tweaks panel.
  window.BgController = {
    setHueShift(v){ PARAMS.hueShift = +v; },
    setDensity(v){ PARAMS.density = +v; },
    setSpeed(v){ PARAMS.speed = +v; },
    setGlow(v){ PARAMS.glowIntensity = +v; },
    setSaturation(v){ PARAMS.saturation = +v; },
    setTwinkle(v){ PARAMS.twinkleIntensity = +v; },
    setRotation(v){ PARAMS.rotationSpeed = +v; },
    setRepulsion(v){ PARAMS.repulsionStrength = +v; },
  };

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
