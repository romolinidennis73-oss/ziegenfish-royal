// ============ Effekte: Partikel, Leuchtspuren, Mündungsfeuer, Schadenszahlen ============
const FX = {
  N: 900, i: 0, pts: null, pos: null, col: null, vel: null, life: null, max: null, size: null, grav: null, tracers: [], flashes: [], dmgEls: [], dmgI: 0, shake: 0,
  init() {
    const g = new THREE.BufferGeometry(); this.pos = new Float32Array(this.N * 3); this.col = new Float32Array(this.N * 3); this.size = new Float32Array(this.N);
    this.vel = new Float32Array(this.N * 3); this.life = new Float32Array(this.N); this.max = new Float32Array(this.N); this.grav = new Float32Array(this.N); this.baseSize = new Float32Array(this.N);
    for (let i = 0; i < this.N; i++) this.pos[i * 3 + 1] = -9999;
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(this.col, 3)); g.setAttribute('size', new THREE.BufferAttribute(this.size, 1));
    const tex = canvasTex(64, (c, s) => { const gr = c.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(255,255,255,0.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = gr; c.fillRect(0, 0, s, s); });
    tex.encoding = THREE.LinearEncoding;
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { map: { value: tex }, scale: { value: innerHeight / 2 } },
      vertexShader: 'attribute float size; attribute vec3 color; varying vec3 vC; uniform float scale; void main(){ vC = color; vec4 mv = modelViewMatrix*vec4(position,1.0); gl_PointSize = size*scale/ -mv.z; gl_Position = projectionMatrix*mv; }',
      fragmentShader: 'uniform sampler2D map; varying vec3 vC; void main(){ vec4 t = texture2D(map, gl_PointCoord); gl_FragColor = vec4(vC*t.a, t.a); }'
    });
    this.pts = new THREE.Points(g, mat); this.pts.frustumCulled = false; ZR.scene.add(this.pts); this.ptsMat = mat;
    // Leuchtspuren
    const tg = new THREE.BoxGeometry(0.035, 0.035, 1); tg.translate(0, 0, 0.5); const tm = new THREE.MeshBasicMaterial({ color: 0xfff1a8, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false });
    for (let i = 0; i < 50; i++) { const m = new THREE.Mesh(tg, tm); m.visible = false; ZR.scene.add(m); this.tracers.push({ m, t: 0 }); }
    // Mündungsfeuer
    const fm = new THREE.SpriteMaterial({ map: tex, color: 0xffc860, blending: THREE.AdditiveBlending, depthWrite: false });
    for (let i = 0; i < 16; i++) { const s = new THREE.Sprite(fm); s.visible = false; ZR.scene.add(s); this.flashes.push({ s, t: 0 }); }
    const host = $('dmgnums'); for (let i = 0; i < 24; i++) { const e = document.createElement('div'); e.className = 'dmg'; host.appendChild(e); this.dmgEls.push({ e, t: 0, p: new THREE.Vector3() }); }
  },
  spawn(x, y, z, vx, vy, vz, r, g, b, life, size, grav = 0) {
    const i = this.i; this.i = (this.i + 1) % this.N; const k = i * 3;
    this.pos[k] = x; this.pos[k + 1] = y; this.pos[k + 2] = z; this.vel[k] = vx; this.vel[k + 1] = vy; this.vel[k + 2] = vz;
    this.col[k] = r; this.col[k + 1] = g; this.col[k + 2] = b; this.life[i] = life; this.max[i] = life; this.baseSize[i] = size; this.size[i] = size; this.grav[i] = grav;
  },
  burst(x, y, z, n, r, g, b, speed, life, size, grav = 0) { for (let i = 0; i < n; i++) this.spawn(x, y, z, rand(-1, 1) * speed, rand(-0.3, 1) * speed, rand(-1, 1) * speed, r, g, b, life * rand(0.6, 1.2), size * rand(0.7, 1.3), grav); },
  impact(x, y, z, kind) {
    if (kind === 'shield') this.burst(x, y, z, 7, 0.3, 0.7, 1.2, 3, 0.3, 0.35);
    else if (kind === 'body') this.burst(x, y, z, 7, 1.2, 0.5, 0.35, 3, 0.3, 0.3);
    else { this.burst(x, y, z, 4, 1.2, 0.9, 0.5, 4, 0.18, 0.18, 9); this.burst(x, y, z, 2, 0.35, 0.33, 0.3, 0.8, 0.6, 0.7); }
  },
  explosion(x, y, z) {
    this.burst(x, y + 0.5, z, 40, 1.6, 0.8, 0.25, 9, 0.5, 1.6); this.burst(x, y + 0.5, z, 25, 0.35, 0.33, 0.32, 3, 1.6, 3.2, -1.5); this.burst(x, y, z, 20, 1.2, 1.0, 0.6, 14, 0.4, 0.3, 15);
  },
  eliminate(x, y, z, col) { const c = new THREE.Color(col || 0x5ff4ff); for (let i = 0; i < 40; i++) this.spawn(x + rand(-0.4, 0.4), y + rand(0, 1.8), z + rand(-0.4, 0.4), rand(-1, 1), rand(1, 4), rand(-1, 1), c.r * 1.4, c.g * 1.4, c.b * 1.4, rand(0.6, 1.2), rand(0.2, 0.4)); },
  tracer(ax, ay, az, bx2, by, bz) {
    const t = this.tracers.find(q => q.t <= 0) || this.tracers[0]; const L = Math.hypot(bx2 - ax, by - ay, bz - az); if (L < 0.5) return;
    t.m.position.set(ax, ay, az); t.m.scale.set(1, 1, L); t.m.lookAt(bx2, by, bz); t.m.visible = true; t.t = 0.07;
  },
  flash(x, y, z, s = 0.7) { const f = this.flashes.find(q => q.t <= 0) || this.flashes[0]; f.s.position.set(x, y, z); f.s.scale.setScalar(s * rand(0.8, 1.2)); f.s.material.rotation = Math.random() * 6; f.s.visible = true; f.t = 0.05; },
  dmgNum(x, y, z, val, head, shield) {
    const d = this.dmgEls[this.dmgI]; this.dmgI = (this.dmgI + 1) % this.dmgEls.length;
    d.p.set(x + rand(-0.3, 0.3), y, z + rand(-0.3, 0.3)); d.t = 0.9; d.e.textContent = Math.round(val); d.e.className = 'dmg show' + (head ? ' head' : shield ? ' shield' : '');
  },
  update(dt) {
    const P = this.pos, V = this.vel, L = this.life;
    for (let i = 0; i < this.N; i++) {
      if (L[i] <= 0) continue; L[i] -= dt; const k = i * 3;
      if (L[i] <= 0) { P[k + 1] = -9999; continue; }
      V[k + 1] -= this.grav[i] * dt; P[k] += V[k] * dt; P[k + 1] += V[k + 1] * dt; P[k + 2] += V[k + 2] * dt;
      const f = L[i] / this.max[i]; this.size[i] = this.baseSize[i] * (this.grav[i] < 0 ? (2 - f) : (0.4 + f * 0.6));
    }
    const g = this.pts.geometry; g.attributes.position.needsUpdate = true; g.attributes.size.needsUpdate = true; g.attributes.color.needsUpdate = true;
    // Farbe ausblenden
    for (let i = 0; i < this.N; i++) if (L[i] > 0 && L[i] < 0.15) { const k = i * 3; const f = 0.85; this.col[k] *= f; this.col[k + 1] *= f; this.col[k + 2] *= f; }
    this.ptsMat.uniforms.scale.value = ZR.renderer.domElement.height / 2 / Math.tan(ZR.camera.fov * DEG / 2);
    for (const t of this.tracers) if (t.t > 0) { t.t -= dt; if (t.t <= 0) t.m.visible = false; }
    for (const f of this.flashes) if (f.t > 0) { f.t -= dt; if (f.t <= 0) f.s.visible = false; }
    const v = new THREE.Vector3();
    for (const d of this.dmgEls) {
      if (d.t <= 0) continue; d.t -= dt; d.p.y += dt * 1.2; v.copy(d.p).project(ZR.camera);
      if (d.t <= 0 || v.z > 1) { d.e.className = 'dmg'; continue; }
      d.e.style.transform = `translate(${(v.x * 0.5 + 0.5) * innerWidth}px,${(-v.y * 0.5 + 0.5) * innerHeight}px) translate(-50%,-50%) scale(${0.8 + d.t * 0.4})`; d.e.style.opacity = Math.min(1, d.t * 3);
    }
    this.shake = Math.max(0, this.shake - dt * 3);
  },
  clear() { this.life.fill(0); for (let i = 0; i < this.N; i++) this.pos[i * 3 + 1] = -9999; for (const d of this.dmgEls) { d.t = 0; d.e.className = 'dmg'; } }
};
