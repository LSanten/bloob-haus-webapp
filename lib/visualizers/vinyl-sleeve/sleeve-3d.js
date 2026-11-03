/**
 * The 3D sleeve: back and front covers, a flip between them, the record sliding out. Ported from
 * the vinyl-sleeve handoff (2026-11-02, engine/vinyl-sleeve.js) with its design kept: thickest in
 * the middle, a firmer spine, faint ring wear, the record's fixed sheen, no tone mapping. Changes:
 * an ES module (three.js r128 is read from window.THREE when mounting), and tucking the record back
 * in calls onTuck, so the haus closes the page again. Browser only.
 */
function factory(global) {
  'use strict';
  const THREE = global.THREE;
  const LOOP_SECONDS = 7;

  // ---------- easing / helpers ----------
  const ease = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const clamp01 = x => Math.min(1, Math.max(0, x));
  const seg = (t, a, b) => ease(clamp01((t - a) / (b - a)));

  // ---------- sleeve shape ----------
  // Thickest in the middle, tapering to rounded edges. Left (spine) is firmer,
  // right (opening, where the record comes out) is softer.
  const T = 0.042, TMIN = 0.006;
  function prof(d, r) { if (d >= r) return 1; const u = 1 - d / r; return Math.sqrt(Math.max(0, 1 - u * u)); }
  function thick(x, y) {
    const gx = prof(x + 0.5, 0.035) * prof(0.5 - x, 0.075);
    const gy = prof(y + 0.5, 0.06) * prof(0.5 - y, 0.06);
    const rc = Math.hypot(x, y);
    const ring = 0.0013 * Math.exp(-Math.pow((rc - 0.462) / 0.014, 2)); // faint ring wear
    const dome = 0.006 * Math.max(0, 1 - (rc / 0.5) ** 2);
    return TMIN + (T - TMIN + ring + dome) * gx * gy;
  }
  function faceGeometry(sign) {
    const g = new THREE.PlaneGeometry(1, 1, 160, 160);
    if (sign < 0) g.rotateY(Math.PI);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) p.setZ(i, sign * thick(p.getX(i), p.getY(i)) / 2);
    g.computeVertexNormals();
    return g;
  }
  function seamGeometry() {
    const N = 400, pos = [], idx = [];
    for (let i = 0; i < N; i++) {
      const s = i / N * 4, k = Math.floor(s), f = s - k;
      const [x, y] = [[-.5 + f, -.5], [.5, -.5 + f], [.5 - f, .5], [-.5, .5 - f]][k];
      const t = thick(x, y) / 2; pos.push(x, y, t, x, y, -t);
    }
    for (let i = 0; i < N; i++) { const a = i * 2, b = ((i + 1) % N) * 2; idx.push(a, a + 1, b, b, a + 1, b + 1); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx); g.computeVertexNormals();
    return g;
  }

  // ---------- textures ----------
  const loadImg = src => new Promise((res, rej) => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => res(i); i.onerror = rej; i.src = src; });
  function texFromImg(img, renderer) {
    const t = new THREE.Texture(img); t.encoding = THREE.sRGBEncoding;
    t.anisotropy = renderer.capabilities.getMaxAnisotropy(); t.needsUpdate = true; return t;
  }
  function envTexture() { // soft studio reflections for the vinyl
    const c = document.createElement('canvas'); c.width = 1024; c.height = 512; const g = c.getContext('2d');
    g.fillStyle = '#14141f'; g.fillRect(0, 0, 1024, 512);
    const box = (x, y, w, h, col, a) => { const gr = g.createRadialGradient(x + w / 2, y + h / 2, 0, x + w / 2, y + h / 2, Math.max(w, h) / 1.6); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.globalAlpha = a; g.fillStyle = gr; g.fillRect(x - w, y - h, w * 3, h * 3); g.globalAlpha = 1; };
    box(430, 120, 180, 120, '#ffffff', 1); box(80, 200, 140, 200, '#ff8a55', .8); box(800, 180, 120, 160, '#c9c9ff', .5);
    const t = new THREE.CanvasTexture(c); t.mapping = THREE.EquirectangularReflectionMapping; t.encoding = THREE.sRGBEncoding; return t;
  }
  function vinylTexture(labelImg, vinylColor) {
    const S = 2048, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d'); const C = S / 2, R = S / 2;
    g.fillStyle = vinylColor; g.beginPath(); g.arc(C, C, R, 0, 7); g.fill();
    // grooves, drawn as light/dark modulation over the base color
    const gaps = [0.62, 0.70, 0.79, 0.88];
    for (let r = R * 0.355; r < R * 0.975; r += 1.6) {
      const f = r / R; const gap = gaps.some(q => Math.abs(f - q) < 0.006);
      g.strokeStyle = gap ? 'rgba(255,255,255,0.10)' : `rgba(255,255,255,${0.02 + Math.random() * 0.035})`;
      g.lineWidth = 1; g.beginPath(); g.arc(C, C, r, 0, 7); g.stroke();
    }
    g.strokeStyle = 'rgba(255,255,255,0.08)'; g.lineWidth = 6; g.beginPath(); g.arc(C, C, R * 0.985, 0, 7); g.stroke();
    const L = R * 0.335; g.save(); g.beginPath(); g.arc(C, C, L, 0, 7); g.clip();
    g.fillStyle = '#F9F5EF'; g.fillRect(C - L, C - L, 2 * L, 2 * L);
    if (labelImg) g.drawImage(labelImg, C - L * 0.86, C - L * 0.86, L * 1.72, L * 1.72);
    g.restore();
    g.fillStyle = '#0b0b0d'; g.beginPath(); g.arc(C, C, R * 0.022, 0, 7); g.fill();
    const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = 8; return t;
  }
  function sheenTexture() { // fixed shine that does not rotate with the record
    const S = 1024, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d'); const C = S / 2;
    const cg = g.createConicGradient(-0.5, C, C);
    [[0, 0], [.06, .55], [.12, 0], [.5, 0], [.56, .35], [.62, 0], [1, 0]].forEach(([s, a]) => cg.addColorStop(s, `rgba(255,240,225,${a})`));
    g.fillStyle = cg; g.beginPath(); g.arc(C, C, C * 0.975, 0, 7); g.arc(C, C, C * 0.36, 0, 7, true); g.fill('evenodd');
    return new THREE.CanvasTexture(c);
  }

  // ---------- mount ----------
  function mount(container, opts) {
    const o = Object.assign({ startSide: 'back', vinylColor: '#0b0b0d', mode: 'interactive', onReveal: null, onTuck: null }, opts);
    const reducedMotion = global.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: o.mode === 'loop' });
    renderer.setClearColor(0x000000, 0);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.NoToneMapping;
    const canvas = renderer.domElement;
    canvas.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;cursor:pointer';
    container.appendChild(canvas);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromEquirectangular(envTexture()).texture;
    scene.add(new THREE.HemisphereLight(0xfff6ea, 0x3a3040, 0.62));
    const key = new THREE.DirectionalLight(0xfffaf2, 0.55); key.position.set(-1.6, 2.2, 3); scene.add(key);
    const rim = new THREE.DirectionalLight(0xffa070, 0.7); rim.position.set(2.5, -0.6, -1.5); scene.add(rim);

    // framing while the record is out: loop matches the approved GIF, interactive leaves more room
    const frame = o.mode === 'loop' ? { shift: 0.24, pull: 0.32 } : { shift: 0.2, pull: 0.5 };
    const turn = new THREE.Group(), sleeve = new THREE.Group(); turn.add(sleeve); scene.add(turn);
    let record, sheen;

    // animation state. flip: 0 = front facing, PI = back facing. out: 0..1 record slide.
    const st = { flip: o.startSide === 'back' ? Math.PI : 0, out: 0, spin: 0, push: 0, dragX: 0, dragY: 0, busy: false, revealed: false };

    function pose(sway) {
      const b = (1 - Math.cos(st.flip)) / 2, front = 1 - b;  // 0 front, 1 back
      const lift = Math.abs(Math.sin(st.flip));               // mid-flip: pull camera back
      sway *= front;
      turn.rotation.set((0.10 + 0.03 * sway) * front + st.dragX, -0.34 * front + 0.05 * sway + st.flip + st.dragY, -0.02 * front);
      turn.position.set(-frame.shift * st.out, 0, 0);
      camera.position.set(0, 0.03 * front, 2.3 * front + 2.2 * b + frame.pull * st.out - 0.06 * st.push + 0.3 * lift);
      record.position.x = 0.34 * st.out;
      record.rotation.z = -st.spin;
      sheen.rotation.z = st.spin;
    }

    // Loop timeline (what the GIF/MP4 show): front, record out/in, flip to back, hold, flip back.
    function loopState(t) {
      const D = LOOP_SECONDS; t = ((t % D) + D) % D;
      const f1 = seg(t, 3.0, 3.9), f2 = seg(t, 5.9, 6.85);
      st.out = seg(t, 0.5, 1.4) - seg(t, 2.2, 2.9);
      st.flip = Math.PI * (f1 + f2);
      st.push = (f1 - f2) * clamp01((t - 3.9) / 2);
      st.spin = t / D * Math.PI * 4;
      return Math.sin(t / D * Math.PI * 2);
    }

    function tween(key, to, dur) {
      const from = st[key], t0 = performance.now(), ms = reducedMotion ? 1 : dur * 1000;
      return new Promise(res => {
        (function step(now) { const k = clamp01((now - t0) / ms); st[key] = from + (to - from) * ease(k); k < 1 ? requestAnimationFrame(step) : res(); })(t0);
      });
    }

    // Click sequence: show the front (if on back), then slide the record out, then onReveal.
    async function reveal() {
      if (st.busy || !record) return; st.busy = true;
      if (!st.revealed) {
        if (Math.cos(st.flip) < 0) await tween('flip', st.flip + Math.PI, 1.0);
        await tween('out', 1, 0.9);
        st.revealed = true; if (o.onReveal) o.onReveal();
      } else { // later clicks: tuck the record in and turn the sleeve over
        if (st.out > 0) await tween('out', 0, 0.6);
        await tween('flip', st.flip + Math.PI, 1.0);
        st.revealed = false; if (o.onTuck) o.onTuck();
      }
      st.busy = false;
    }

    // drag to turn (interactive mode)
    let down = null;
    canvas.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY, dx: st.dragX, dy: st.dragY, moved: false }; canvas.setPointerCapture(e.pointerId); });
    canvas.addEventListener('pointermove', e => { if (!down) return; const w = canvas.clientWidth; const mx = e.clientX - down.x, my = e.clientY - down.y; if (Math.hypot(mx, my) > 6) down.moved = true; st.dragY = down.dy + mx / w * 4; st.dragX = down.dx + my / w * 2; });
    canvas.addEventListener('pointerup', () => { const wasClick = down && !down.moved; down = null; if (wasClick && o.mode === 'interactive') reveal(); });
    canvas.tabIndex = 0; canvas.setAttribute('role', 'button');
    canvas.setAttribute('aria-label', 'Record sleeve. Activate to turn it over and take out the record.');
    canvas.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); reveal(); } });

    function resize() { const w = container.clientWidth, h = container.clientHeight || w; renderer.setPixelRatio(Math.min(global.devicePixelRatio || 1, 2)); renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
    const ro = new ResizeObserver(resize); ro.observe(container); resize();

    let raf = 0, alive = true;
    const ready = (async () => {
      const [fi, bi, li] = await Promise.all([loadImg(o.front), loadImg(o.back), o.label ? loadImg(o.label).catch(() => null) : null]);
      const paper = { roughness: 0.78, metalness: 0, envMapIntensity: 0.25 };
      sleeve.add(new THREE.Mesh(faceGeometry(1), new THREE.MeshStandardMaterial(Object.assign({ map: texFromImg(fi, renderer) }, paper))));
      sleeve.add(new THREE.Mesh(faceGeometry(-1), new THREE.MeshStandardMaterial(Object.assign({ map: texFromImg(bi, renderer) }, paper))));
      sleeve.add(new THREE.Mesh(seamGeometry(), new THREE.MeshStandardMaterial({ color: 0xe9e2d4, roughness: 0.9, side: THREE.DoubleSide })));
      const vg = new THREE.CylinderGeometry(0.472, 0.472, 0.0045, 160, 1); vg.rotateX(Math.PI / 2);
      const vm = new THREE.MeshStandardMaterial({ map: vinylTexture(li, o.vinylColor), roughness: 0.32, metalness: 0.1, envMapIntensity: 1.1 });
      record = new THREE.Mesh(vg, [new THREE.MeshStandardMaterial({ color: new THREE.Color(o.vinylColor), roughness: 0.4 }), vm, vm]);
      sleeve.add(record);
      sheen = new THREE.Mesh(new THREE.CircleGeometry(0.472, 96), new THREE.MeshBasicMaterial({ map: sheenTexture(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.5 }));
      sheen.position.z = 0.0024; record.add(sheen);
    })();

    ready.then(() => {
      if (o.mode === 'loop' && global.location && location.hash === '#capture') return; // frames driven by renderAt()
      let last = performance.now(), clock = 0;
      (function frame(now) {
        if (!alive) return;
        const dt = Math.min(0.05, (now - last) / 1000); last = now;
        if (!down) { st.dragX *= Math.pow(0.04, dt); st.dragY *= Math.pow(0.04, dt); }
        let sway = 0;
        if (o.mode === 'loop') { if (!reducedMotion) clock += dt; sway = loopState(clock); }
        else { if (!reducedMotion) { clock += dt; st.spin += dt * 0.6; } sway = Math.sin(clock * 0.9) * 0.6; }
        pose(sway); renderer.render(scene, camera);
        raf = requestAnimationFrame(frame);
      })(last);
    });

    return {
      ready,
      reveal,
      async renderAt(t) { await ready; pose(loopState(t)); renderer.render(scene, camera); },
      destroy() { alive = false; cancelAnimationFrame(raf); ro.disconnect(); renderer.dispose(); canvas.remove(); }
    };
  }

  return { mount, LOOP_SECONDS };
}

/** Mounts the sleeve into a container (which sets its size). Needs window.THREE (r128). */
export function mountSleeve(container, opts) {
  return factory(window).mount(container, opts);
}
