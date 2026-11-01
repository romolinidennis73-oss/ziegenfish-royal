// ============ Welt: Renderer, Insel, Gebäude, Kollision ============
const W = {
  SIZE: 1100, HALF: 550, N: 221, H: null, SEA: 0, LAKE_Y: 4.6, LAKE: { x: 60, z: 230, r: 72 }, BOUND: 505,
  boxes: [], grid: new Map(), CELL: 16, stamp: 1, doors: [], chests: [], lootSpots: [], pois: [], roads: [], treePos: [],
  batches: {}
};

// ---------------- Renderer & Szene ----------------
function initRenderer() {
  const canvas = $('gl');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: Settings.quality === 'hoch', powerPreference: 'high-performance' });
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = Settings.quality !== 'niedrig'; renderer.shadowMap.type = Settings.quality === 'hoch' ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap; renderer.shadowMap.autoUpdate = true;
  ZR.renderer = renderer;
  const scene = new THREE.Scene(); ZR.scene = scene;
  scene.fog = new THREE.Fog(0xb9cde0, 80, Settings.quality === 'niedrig' ? 330 : 520);
  const cam = new THREE.PerspectiveCamera(70, 1, 0.1, 2400); ZR.camera = cam;
  const hemi = new THREE.HemisphereLight(0xcfe6ff, 0x4a5a32, 0.6); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff1d6, 1.35); sun.position.set(180, 260, 120);
  sun.castShadow = true; const sc = sun.shadow.camera; sc.left = -70; sc.right = 70; sc.top = 70; sc.bottom = -70; sc.near = 10; sc.far = 700;
  sun.shadow.mapSize.set(Settings.quality === 'hoch' ? 2048 : 1024, Settings.quality === 'hoch' ? 2048 : 1024); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.04;
  scene.add(sun); scene.add(sun.target); ZR.sun = sun; ZR.sunDir = sun.position.clone().normalize();
  scene.add(new THREE.AmbientLight(0xffffff, 0.12));
  window.addEventListener('resize', onResize); onResize();
}
function onResize() {
  const r = ZR.renderer; if (!r) return;
  const pr = (Settings.quality === 'hoch' ? Math.min(devicePixelRatio, 2) : Settings.quality === 'mittel' ? Math.min(devicePixelRatio, 1.5) : 1) * (ZR.dynRes || 1);
  r.setPixelRatio(pr); r.setSize(innerWidth, innerHeight, false);
  ZR.camera.aspect = innerWidth / innerHeight; ZR.camera.updateProjectionMatrix();
}
function applyQuality() {
  const r = ZR.renderer; r.shadowMap.enabled = Settings.quality !== 'niedrig'; ZR.dynRes = 1;
  ZR.scene.fog.far = Settings.quality === 'niedrig' ? 330 : 520;
  ZR.scene.traverse(o => { if (o.material) { const m = Array.isArray(o.material) ? o.material : [o.material]; m.forEach(x => x.needsUpdate = true); } });
  onResize();
}

// ---------------- Texturen (prozedural) ----------------
function canvasTex(size, draw, repeat) {
  const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d'); draw(g, size);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.encoding = THREE.sRGBEncoding; t.anisotropy = 4;
  if (repeat) t.repeat.set(repeat, repeat); return t;
}
function noiseFill(g, s, base, vari, dots) {
  g.fillStyle = base; g.fillRect(0, 0, s, s);
  for (let i = 0; i < dots; i++) { const v = Math.random() * vari; g.fillStyle = `rgba(${Math.random() < .5 ? '255,255,255' : '0,0,0'},${v})`; const w = 1 + Math.random() * 3; g.fillRect(Math.random() * s, Math.random() * s, w, w); }
}
function makeTextures() {
  const T = {};
  T.ground = canvasTex(256, (g, s) => { noiseFill(g, s, '#a8a8a8', 0.2, 9000); for (let i = 0; i < 120; i++) { g.strokeStyle = 'rgba(0,0,0,0.12)'; g.beginPath(); const x = Math.random() * s, y = Math.random() * s; g.moveTo(x, y); g.lineTo(x + rand(-4, 4), y - rand(3, 9)); g.stroke(); } });
  T.concrete = canvasTex(256, (g, s) => { noiseFill(g, s, '#d8d8d8', 0.12, 6000); g.strokeStyle = 'rgba(0,0,0,0.10)'; for (let y = 0; y < s; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(s, y); g.stroke(); } });
  T.facade = canvasTex(256, (g, s) => {
    g.fillStyle = '#e4e4e4'; g.fillRect(0, 0, s, s);
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
      const lit = Math.random() < 0.18; const gr = g.createLinearGradient(0, y * 64, 0, y * 64 + 52);
      gr.addColorStop(0, lit ? '#fff4c8' : '#3d5670'); gr.addColorStop(1, lit ? '#e8c77a' : '#1c2a3a');
      g.fillStyle = gr; g.fillRect(x * 64 + 8, y * 64 + 10, 48, 42); g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(x * 64 + 8, y * 64 + 10, 48, 6);
    }
  });
  T.wood = canvasTex(128, (g, s) => { g.fillStyle = '#a77b4c'; g.fillRect(0, 0, s, s); for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(60,30,10,${Math.random() * 0.25})`; g.fillRect(0, Math.random() * s, s, 1 + Math.random() * 2); } g.fillStyle = 'rgba(0,0,0,0.3)'; for (let y = 0; y < s; y += 32) g.fillRect(0, y, s, 2); });
  T.metal = canvasTex(128, (g, s) => { g.fillStyle = '#c9c9c9'; g.fillRect(0, 0, s, s); for (let x = 0; x < s; x += 16) { g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(x, 0, 3, s); g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(x + 3, 0, 2, s); } });
  T.road = canvasTex(256, (g, s) => { noiseFill(g, s, '#4a4a4f', 0.15, 8000); g.fillStyle = '#e8e2c8'; for (let y = 0; y < s; y += 64) g.fillRect(s / 2 - 3, y, 6, 34); g.fillStyle = '#ddd'; g.fillRect(6, 0, 4, s); g.fillRect(s - 10, 0, 4, s); });
  T.tile = canvasTex(256, (g, s) => { noiseFill(g, s, '#f0eeea', 0.05, 1500); g.fillStyle = 'rgba(90,90,90,0.45)'; for (let i = 0; i < s; i += 32) { g.fillRect(i, 0, 2, s); g.fillRect(0, i, s, 2); } });
  T.bark = canvasTex(64, (g, s) => { noiseFill(g, s, '#6b4a32', 0.3, 800); });
  T.leaf = canvasTex(128, (g, s) => { noiseFill(g, s, '#c8c8c8', 0.35, 4000); });
  return T;
}

// ---------------- Statische Geometrie-Batches (wenige Draw Calls) ----------------
class Batch {
  constructor() { this.p = []; this.n = []; this.c = []; this.uv = []; this.idx = []; this.v = 0; }
  quad(a, b, c, d, nx, ny, nz, col, uw, vh) {
    const P = this.p; P.push(...a, ...b, ...c, ...d);
    for (let i = 0; i < 4; i++) { this.n.push(nx, ny, nz); this.c.push(col.r, col.g, col.b); }
    this.uv.push(0, 0, uw, 0, uw, vh, 0, vh); const v = this.v; this.idx.push(v, v + 1, v + 2, v, v + 2, v + 3); this.v += 4;
  }
  box(x0, y0, z0, x1, y1, z1, color, us = 0.25) {
    const col = color.isColor ? color : new THREE.Color(color); const w = (x1 - x0) * us, h = (y1 - y0) * us, d = (z1 - z0) * us;
    this.quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], 0, 0, 1, col, w, h);
    this.quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], 0, 0, -1, col, w, h);
    this.quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], 1, 0, 0, col, d, h);
    this.quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], -1, 0, 0, col, d, h);
    this.quad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], 0, 1, 0, col, w, d);
    this.quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], 0, -1, 0, col, w, d);
  }
  // Satteldach (Prisma) entlang X oder Z
  roof(x0, z0, x1, z1, y, hgt, color, alongX) {
    const col = new THREE.Color(color); const o = 0.4; x0 -= o; z0 -= o; x1 += o; z1 += o;
    if (alongX) {
      const zm = (z0 + z1) / 2; const sl = Math.hypot(zm - z0, hgt) * 0.25, ln = (x1 - x0) * 0.25;
      const n1 = new THREE.Vector3(0, zm - z0, hgt).normalize(), n2 = new THREE.Vector3(0, zm - z0, -hgt).normalize();
      this.quad([x0, y, z1], [x1, y, z1], [x1, y + hgt, zm], [x0, y + hgt, zm], n1.x, n1.y, n1.z, col, ln, sl);
      this.quad([x1, y, z0], [x0, y, z0], [x0, y + hgt, zm], [x1, y + hgt, zm], n2.x, n2.y, n2.z, col, ln, sl);
      this.tri([x0, y, z0], [x0, y, z1], [x0, y + hgt, zm], -1, 0, 0, col); this.tri([x1, y, z1], [x1, y, z0], [x1, y + hgt, zm], 1, 0, 0, col);
    } else {
      const xm = (x0 + x1) / 2; const sl = Math.hypot(xm - x0, hgt) * 0.25, ln = (z1 - z0) * 0.25;
      const n1 = new THREE.Vector3(xm - x0, hgt, 0).normalize(), n2 = new THREE.Vector3(-(xm - x0), hgt, 0).normalize();
      this.quad([x1, y, z1], [x1, y, z0], [xm, y + hgt, z0], [xm, y + hgt, z1], n1.x, n1.y, n1.z, col, ln, sl);
      this.quad([x0, y, z0], [x0, y, z1], [xm, y + hgt, z1], [xm, y + hgt, z0], n2.x, n2.y, n2.z, col, ln, sl);
      this.tri([x0, y, z1], [x1, y, z1], [xm, y + hgt, z1], 0, 0, 1, col); this.tri([x1, y, z0], [x0, y, z0], [xm, y + hgt, z0], 0, 0, -1, col);
    }
  }
  tri(a, b, c, nx, ny, nz, col) { this.p.push(...a, ...b, ...c); for (let i = 0; i < 3; i++) { this.n.push(nx, ny, nz); this.c.push(col.r, col.g, col.b); } this.uv.push(0, 0, 1, 0, .5, 1); const v = this.v; this.idx.push(v, v + 1, v + 2); this.v += 3; }
  // Zylinder (für Tanks, Säulen)
  cyl(x, y0, z, r, h, color, seg = 12) {
    const col = new THREE.Color(color);
    for (let i = 0; i < seg; i++) {
      const a0 = i / seg * Math.PI * 2, a1 = (i + 1) / seg * Math.PI * 2, c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1);
      const nm = (a0 + a1) / 2;
      this.quad([x + c0 * r, y0, z + s0 * r], [x + c0 * r, y0 + h, z + s0 * r], [x + c1 * r, y0 + h, z + s1 * r], [x + c1 * r, y0, z + s1 * r], Math.cos(nm), 0, Math.sin(nm), col, r * 0.4, h * 0.25);
      this.tri([x, y0 + h, z], [x + c1 * r, y0 + h, z + s1 * r], [x + c0 * r, y0 + h, z + s0 * r], 0, 1, 0, col);
    }
  }
  // Ellipsoid mit weichen Normalen
  ell(cx, cy, cz, rx, ry, rz, color, ws = 12, hs = 8, top = 1) {
    const col = color.isColor ? color : new THREE.Color(color); const v0 = this.v;
    for (let j = 0; j <= hs; j++) { const th = j / hs * Math.PI * top, st = Math.sin(th), ct = Math.cos(th);
      for (let i = 0; i <= ws; i++) { const ph = i / ws * Math.PI * 2, nx = st * Math.cos(ph), ny = ct, nz = st * Math.sin(ph);
        this.p.push(cx + nx * rx, cy + ny * ry, cz + nz * rz); const n = new THREE.Vector3(nx / rx, ny / ry, nz / rz).normalize(); this.n.push(n.x, n.y, n.z); this.c.push(col.r, col.g, col.b); this.uv.push(i / ws, j / hs); } }
    for (let j = 0; j < hs; j++) for (let i = 0; i < ws; i++) { const a = v0 + j * (ws + 1) + i, b = a + ws + 1; this.idx.push(a, a + 1, b, a + 1, b + 1, b); }
    this.v += (hs + 1) * (ws + 1);
  }
  // Rohr zwischen zwei Punkten (verjüngt), weiche Normalen
  tube(ax, ay, az, bx, by, bz, r0, r1, color, seg = 10) {
    const col = color.isColor ? color : new THREE.Color(color); const A = new THREE.Vector3(ax, ay, az), Bv = new THREE.Vector3(bx, by, bz), d = Bv.clone().sub(A); const L = d.length(); d.normalize();
    const u = Math.abs(d.y) < 0.9 ? new THREE.Vector3(0, 1, 0).cross(d).normalize() : new THREE.Vector3(1, 0, 0).cross(d).normalize(); const w = d.clone().cross(u); const v0 = this.v;
    for (let k = 0; k <= 1; k++) { const C = k ? Bv : A, r = k ? r1 : r0; for (let i = 0; i <= seg; i++) { const ph = i / seg * Math.PI * 2, n = u.clone().multiplyScalar(Math.cos(ph)).add(w.clone().multiplyScalar(Math.sin(ph))); this.p.push(C.x + n.x * r, C.y + n.y * r, C.z + n.z * r); this.n.push(n.x, n.y, n.z); this.c.push(col.r, col.g, col.b); this.uv.push(i / seg, k * L); } }
    for (let i = 0; i < seg; i++) { const a = v0 + i, b = v0 + seg + 1 + i; this.idx.push(a, a + 1, b, a + 1, b + 1, b); }
    this.v += 2 * (seg + 1);
  }
  // In Kacheln aufteilen, damit Kamera- und Schatten-Culling nur Nahes zeichnen
  buildTiled(mat, T = 96) {
    const pos = new THREE.Float32BufferAttribute(this.p, 3), nor = new THREE.Float32BufferAttribute(this.n, 3), col = new THREE.Float32BufferAttribute(this.c, 3), uv = new THREE.Float32BufferAttribute(this.uv, 2);
    const groups = new Map(), P = this.p, I = this.idx;
    for (let i = 0; i < I.length; i += 3) { const a = I[i] * 3; const k = Math.floor(P[a] / T) * 1000 + Math.floor(P[a + 2] / T); let g = groups.get(k); if (!g) groups.set(k, g = []); g.push(I[i], I[i + 1], I[i + 2]); }
    const out = [];
    for (const g of groups.values()) {
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', pos); geo.setAttribute('normal', nor); geo.setAttribute('color', col); geo.setAttribute('uv', uv);
      geo.setIndex(this.v > 65535 ? new THREE.Uint32BufferAttribute(g, 1) : new THREE.Uint16BufferAttribute(g, 1));
      const bb = new THREE.Box3(), v = new THREE.Vector3(); for (const ix of g) { v.set(P[ix * 3], P[ix * 3 + 1], P[ix * 3 + 2]); bb.expandByPoint(v); }
      geo.boundingBox = bb; geo.boundingSphere = bb.getBoundingSphere(new THREE.Sphere());
      const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; out.push(m);
    }
    return out;
  }
  build(mat) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setIndex(this.v > 65535 ? new THREE.Uint32BufferAttribute(this.idx, 1) : new THREE.Uint16BufferAttribute(this.idx, 1));
    g.computeBoundingSphere(); const m = new THREE.Mesh(g, mat); m.castShadow = true; m.receiveShadow = true; return m;
  }
}
const B = name => W.batches[name] || (W.batches[name] = new Batch());

// ---------------- Kollision ----------------
function addCollider(x0, y0, z0, x1, y1, z1, kind) {
  if (x0 > x1) [x0, x1] = [x1, x0]; if (z0 > z1) [z0, z1] = [z1, z0];
  const b = { x0, y0, z0, x1, y1, z1, on: true, kind: kind || 's', s: 0 }; W.boxes.push(b);
  const C = W.CELL; for (let ix = Math.floor(x0 / C); ix <= Math.floor(x1 / C); ix++) for (let iz = Math.floor(z0 / C); iz <= Math.floor(z1 / C); iz++) {
    const k = ix * 1000 + iz; let a = W.grid.get(k); if (!a) W.grid.set(k, a = []); a.push(b);
  }
  return b;
}
// Sichtbarer + fester Block
function solid(x0, y0, z0, x1, y1, z1, color, batch = 'solid', kind) { B(batch).box(Math.min(x0, x1), y0, Math.min(z0, z1), Math.max(x0, x1), y1, Math.max(z0, z1), color); return addCollider(x0, y0, z0, x1, y1, z1, kind); }
function boxesNear(x, z, r, out) {
  out.length = 0; const C = W.CELL, s = ++W.stamp;
  for (let ix = Math.floor((x - r) / C); ix <= Math.floor((x + r) / C); ix++) for (let iz = Math.floor((z - r) / C); iz <= Math.floor((z + r) / C); iz++) {
    const a = W.grid.get(ix * 1000 + iz); if (!a) continue; for (const b of a) if (b.s !== s) { b.s = s; if (b.on) out.push(b); }
  }
  return out;
}
const _near = [];
// Boden unter einem Punkt (Terrain oder Dach/Boden eines Blocks)
function groundAt(x, z, feetY, step = 0.6, r = 0.25) {
  let g = heightAt(x, z); boxesNear(x, z, r + 1, _near);
  for (const b of _near) if (x > b.x0 - r && x < b.x1 + r && z > b.z0 - r && z < b.z1 + r && b.y1 <= feetY + step && b.y1 > g) g = b.y1;
  return g;
}
// Strahl gegen Welt: liefert Distanz bis Treffer oder maxD
const _rb = [];
function rayWorld(ox, oy, oz, dx, dy, dz, maxD) {
  let best = maxD; const s = ++W.stamp; const C = W.CELL; const stepL = C * 0.5;
  // Blöcke entlang des Strahls
  for (let t = 0; t <= maxD + C; t += stepL) {
    const px = ox + dx * t, pz = oz + dz * t; if (t > best + C) break;
    for (let ox2 = -1; ox2 <= 1; ox2++) for (let oz2 = -1; oz2 <= 1; oz2++) {
      const a = W.grid.get((Math.floor(px / C) + ox2) * 1000 + Math.floor(pz / C) + oz2); if (!a) continue;
      for (const b of a) {
        if (b.s === s || !b.on) continue; b.s = s;
        let t0 = 0, t1 = best;
        if (Math.abs(dx) < 1e-9) { if (ox < b.x0 || ox > b.x1) continue; } else { let a1 = (b.x0 - ox) / dx, a2 = (b.x1 - ox) / dx; if (a1 > a2) [a1, a2] = [a2, a1]; t0 = Math.max(t0, a1); t1 = Math.min(t1, a2); if (t0 > t1) continue; }
        if (Math.abs(dy) < 1e-9) { if (oy < b.y0 || oy > b.y1) continue; } else { let a1 = (b.y0 - oy) / dy, a2 = (b.y1 - oy) / dy; if (a1 > a2) [a1, a2] = [a2, a1]; t0 = Math.max(t0, a1); t1 = Math.min(t1, a2); if (t0 > t1) continue; }
        if (Math.abs(dz) < 1e-9) { if (oz < b.z0 || oz > b.z1) continue; } else { let a1 = (b.z0 - oz) / dz, a2 = (b.z1 - oz) / dz; if (a1 > a2) [a1, a2] = [a2, a1]; t0 = Math.max(t0, a1); t1 = Math.min(t1, a2); if (t0 > t1) continue; }
        if (t0 < best) best = t0;
      }
    }
  }
  // Terrain
  const stp = 2; for (let t = 0; t < best; t += stp) {
    const y = oy + dy * t; if (y < heightAt(ox + dx * t, oz + dz * t)) {
      let a = Math.max(0, t - stp), b2 = t; for (let i = 0; i < 6; i++) { const m = (a + b2) / 2; if (oy + dy * m < heightAt(ox + dx * m, oz + dz * m)) b2 = m; else a = m; }
      best = Math.min(best, b2); break;
    }
  }
  return best;
}
function lineOfSight(ax, ay, az, bx, by, bz) {
  const dx = bx - ax, dy = by - ay, dz = bz - az, L = Math.hypot(dx, dy, dz); if (L < 0.01) return true;
  return rayWorld(ax, ay, az, dx / L, dy / L, dz / L, L) >= L - 0.3;
}

// ---------------- Höhenkarte ----------------
const ZONES = []; // flache Gebiete {x,z,r,h,edge}
function rawHeight(x, z) {
  const r0 = Math.hypot(x, z) / 500; const ang = Math.atan2(z, x);
  const rr = r0 * (1 + 0.09 * Math.sin(ang * 3 + 1) + 0.06 * Math.sin(ang * 5 + 2)) + (fbm(x * 0.004, z * 0.004, 3) - 0.5) * 0.2;
  let h = 7 + fbm(x * 0.006 + 10, z * 0.006, 4) * 18 + (fbm(x * 0.02, z * 0.02, 3) - 0.5) * 4;
  h = h * (1 - smooth(0.74, 0.92, rr)) + 1.0 * smooth(0.74, 0.92, rr) - smooth(0.92, 1.05, rr) * 10;
  // Berge (Meckerberge)
  const dm = Math.hypot(x - 300, z + 300); const ridge = 1 - Math.abs(fbm(x * 0.012, z * 0.012, 4) * 2 - 1);
  h += Math.pow(smooth(200, 0, dm), 1.4) * (75 + 45 * ridge);
  const dm2 = Math.hypot(x + 60, z + 380); h += Math.pow(smooth(110, 0, dm2), 1.5) * (35 + 20 * ridge);
  const dm3 = Math.hypot(x - 410, z - 40); h += Math.pow(smooth(90, 0, dm3), 1.4) * 30 * (0.6 + ridge * 0.6);
  return h;
}
function shapedHeight(x, z) {
  let h = rawHeight(x, z);
  for (const zn of ZONES) { const d = Math.hypot(x - zn.x, z - zn.z); if (d < zn.r + zn.edge) h = lerp(h, zn.h, smooth(zn.r + zn.edge, zn.r, d)); }
  // See
  const L = W.LAKE, dl = Math.hypot(x - L.x, z - L.z); if (dl < L.r) h = lerp(h, 2.6, smooth(L.r, L.r * 0.55, dl));
  return h;
}
function buildHeightmap() {
  const N = W.N, H = new Float32Array(N * N); const s = W.SIZE / (N - 1);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) H[j * N + i] = shapedHeight(-W.HALF + i * s, -W.HALF + j * s);
  W.H = H; W.step = s;
}
function heightAt(x, z) {
  const N = W.N, s = W.step; let fx = (x + W.HALF) / s, fz = (z + W.HALF) / s;
  if (fx < 0 || fz < 0 || fx >= N - 1 || fz >= N - 1) return -12;
  const i = Math.floor(fx), j = Math.floor(fz), u = fx - i, v = fz - j, H = W.H;
  // passend zur Dreiecksaufteilung der PlaneGeometry
  const a = H[j * N + i], b = H[j * N + i + 1], c = H[(j + 1) * N + i], d = H[(j + 1) * N + i + 1];
  if (u + v <= 1) return a + (b - a) * u + (c - a) * v; return d + (c - d) * (1 - u) + (b - d) * (1 - v);
}
function waterAt(x, z) { const L = W.LAKE; if (dist2(x, z, L.x, L.z) < L.r * L.r) return W.LAKE_Y; return W.SEA; }

function zoneAt(x, z) { for (const p of W.pois) if (Math.hypot(x - p.x, z - p.z) < p.r) return p; return null; }

function buildTerrain(T) {
  const N = W.N; const g = new THREE.PlaneGeometry(W.SIZE, W.SIZE, N - 1, N - 1); g.rotateX(-Math.PI / 2);
  const pos = g.attributes.position, cols = new Float32Array(pos.count * 3);
  const cG1 = new THREE.Color(0x4a7a2c), cG2 = new THREE.Color(0x6a8f34), cF = new THREE.Color(0x2f5a22), cS = new THREE.Color(0xd9c58f), cR = new THREE.Color(0x7d7a74), cSn = new THREE.Color(0xf2f4f7), cA = new THREE.Color(0x6e6e70), cD = new THREE.Color(0x8b7a55), tmp = new THREE.Color();
  for (let k = 0; k < pos.count; k++) {
    const i = k % N, j = Math.floor(k / N); const h = W.H[j * N + i]; pos.setY(k, h); const x = pos.getX(k), z = pos.getZ(k);
    const hx = W.H[j * N + Math.min(i + 1, N - 1)] - h, hz = W.H[Math.min(j + 1, N - 1) * N + i] - h; const slope = Math.hypot(hx, hz) / W.step;
    const n = fbm(x * 0.03, z * 0.03, 2); tmp.copy(cG1).lerp(cG2, n);
    const fd = Math.hypot(x + 230, z + 220); if (fd < 170) tmp.lerp(cF, smooth(170, 90, fd));
    const p = zoneAt(x, z); if (p && p.ground) tmp.lerp(p.ground === 'asphalt' ? cA : cD, smooth(p.r, p.r - 15, Math.hypot(x - p.x, z - p.z)) * 0.9);
    if (h < 2.8) tmp.lerp(cS, smooth(2.8, 1.4, h));
    const L = W.LAKE; if (Math.hypot(x - L.x, z - L.z) < L.r + 6 && h < 5.2) tmp.lerp(cS, 0.7);
    if (slope > 0.75 || h > 55) tmp.lerp(cR, Math.max(smooth(0.75, 1.2, slope), smooth(55, 70, h)));
    if (h > 105) tmp.lerp(cSn, smooth(105, 120, h));
    cols[k * 3] = tmp.r; cols[k * 3 + 1] = tmp.g; cols[k * 3 + 2] = tmp.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(cols, 3)); g.computeVertexNormals();
  const uv = g.attributes.uv; for (let k = 0; k < uv.count; k++) uv.setXY(k, uv.getX(k) * 160, uv.getY(k) * 160);
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, map: T.ground, roughness: 0.95 })); m.receiveShadow = true; ZR.scene.add(m);
  // Meer
  W.waterTex = makeWaterNormal(); W.waterTex.repeat.set(260, 260); W.waterTex2 = W.waterTex.clone(); W.waterTex2.needsUpdate = true; W.waterTex2.repeat.set(30, 30);
  const seaMat = new THREE.MeshStandardMaterial({ color: 0x1a6a8a, roughness: 0.08, metalness: 0.45, transparent: true, opacity: 0.9, normalMap: W.waterTex, normalScale: new THREE.Vector2(0.5, 0.5) });
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000), seaMat); sea.rotation.x = -Math.PI / 2; sea.position.y = W.SEA; ZR.scene.add(sea); W.seaMat = seaMat;
  const lake = new THREE.Mesh(new THREE.CircleGeometry(W.LAKE.r + 4, 48), new THREE.MeshStandardMaterial({ color: 0x2a7f98, roughness: 0.06, metalness: 0.4, transparent: true, opacity: 0.82, normalMap: W.waterTex2, normalScale: new THREE.Vector2(0.4, 0.4) }));
  lake.rotation.x = -Math.PI / 2; lake.position.set(W.LAKE.x, W.LAKE_Y, W.LAKE.z); ZR.scene.add(lake);
}

function buildSky() {
  const g = new THREE.SphereGeometry(2000, 32, 16);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { sunDir: { value: ZR.sunDir } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); gl_Position.z = gl_Position.w; }',
    fragmentShader: `varying vec3 vP; uniform vec3 sunDir; void main(){ float h = vP.y; vec3 top = vec3(0.16,0.38,0.72); vec3 hor = vec3(0.73,0.82,0.9);
      vec3 c = mix(hor, top, smoothstep(0.0, 0.5, h)); c = mix(c, vec3(0.55,0.6,0.62), smoothstep(0.0,-0.2,h));
      float s = max(dot(normalize(vP), normalize(sunDir)), 0.0); c += vec3(1.0,0.85,0.6)*pow(s, 600.0)*3.0 + vec3(1.0,0.8,0.5)*pow(s,8.0)*0.25;
      gl_FragColor = vec4(c,1.0); }`
  });
  const sky = new THREE.Mesh(g, mat); sky.renderOrder = -1; ZR.scene.add(sky); ZR.sky = sky;
  // Wolken
  const cg = new THREE.IcosahedronGeometry(1, 1); const cm = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, fog: false });
  const clouds = new THREE.InstancedMesh(cg, cm, 140); const M = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), p = new THREE.Vector3();
  let k = 0; for (let c = 0; c < 28; c++) {
    const cx = rand(-900, 900), cz = rand(-900, 900), cy = rand(170, 230);
    for (let i = 0; i < 5; i++) { p.set(cx + rand(-35, 35), cy + rand(-5, 6), cz + rand(-20, 20)); sc.set(rand(18, 34), rand(7, 12), rand(14, 24)); M.compose(p, q, sc); clouds.setMatrixAt(k++, M); }
  }
  clouds.frustumCulled = false; ZR.scene.add(clouds); ZR.clouds = clouds;
}

// ---------------- Gebäude-Bausteine ----------------
const WALLC = [0xd9cfbf, 0xc7b8a3, 0xbfc7cc, 0xe0d6c2, 0xa9b3a0, 0xc9a98b, 0xd7d7d2];
const ROOFC = [0x8a3b2e, 0x5b4636, 0x3e4a52, 0x7a5a3a, 0x6b2e2e];
function addDoor(x, y, z, alongX, ext) {
  // Drehtür; Kollision solange geschlossen
  const w = 1.9, h = 2.5; const pivot = new THREE.Group(); pivot.position.set(x, y, z);
  const mesh = new THREE.Mesh(ZR.geo.door, ZR.mat.door); mesh.position.set(alongX ? w / 2 : 0, h / 2, alongX ? 0 : w / 2); mesh.castShadow = true;
  if (!alongX) mesh.rotation.y = Math.PI / 2; pivot.add(mesh); ZR.scene.add(pivot);
  const col = alongX ? addCollider(x, y, z - 0.08, x + w, y + h, z + 0.08, 'door') : addCollider(x - 0.08, y, z, x + 0.08, y + h, z + w, 'door');
  W.doors.push({ pivot, col, open: 0, target: 0, cx: alongX ? x + w / 2 : x, cz: alongX ? z : z + w / 2, y, dir: ext || 1 });
}
// Wand mit optionaler Tür/Fenstern. Wand entlang X (z fest) oder Z (x fest)
function wall(x0, z0, x1, z1, y, h, col, opts = {}) {
  const t = 0.3, alongX = Math.abs(z1 - z0) < 0.01; const L = alongX ? x1 - x0 : z1 - z0;
  const mk = (a, b, yb, yt) => {
    if (b - a < 0.05) return;
    if (alongX) solid(x0 + a, yb, z0 - t / 2, x0 + b, yt, z0 + t / 2, col); else solid(x0 - t / 2, yb, z0 + a, x0 + t / 2, yt, z0 + b, col);
  };
  if (opts.door != null) {
    const d0 = opts.door, d1 = d0 + 2.0; mk(0, d0, y, y + h); mk(d1, L, y, y + h); mk(d0, d1, y + 2.6, y + h);
    const fr = B('solid'), fc = 0xf4f1ea; // weißer Türrahmen
    if (alongX) { fr.box(x0 + d0 - 0.12, y, z0 - t / 2 - 0.05, x0 + d0, y + 2.72, z0 + t / 2 + 0.05, fc); fr.box(x0 + d1, y, z0 - t / 2 - 0.05, x0 + d1 + 0.12, y + 2.72, z0 + t / 2 + 0.05, fc); fr.box(x0 + d0 - 0.12, y + 2.6, z0 - t / 2 - 0.05, x0 + d1 + 0.12, y + 2.72, z0 + t / 2 + 0.05, fc); }
    else { fr.box(x0 - t / 2 - 0.05, y, z0 + d0 - 0.12, x0 + t / 2 + 0.05, y + 2.72, z0 + d0, fc); fr.box(x0 - t / 2 - 0.05, y, z0 + d1, x0 + t / 2 + 0.05, y + 2.72, z0 + d1 + 0.12, fc); fr.box(x0 - t / 2 - 0.05, y + 2.6, z0 + d0 - 0.12, x0 + t / 2 + 0.05, y + 2.72, z0 + d1 + 0.12, fc); }
    if (opts.realDoor !== false) { if (alongX) addDoor(x0 + d0 + 0.05, y, z0, true); else addDoor(x0, y, z0 + d0 + 0.05, false); }
  } else mk(0, L, y, y + h);
  // Fenster (Glasscheiben in der Wand)
  if (opts.windows) {
    const n = Math.floor(L / 3.2); for (let i = 0; i < n; i++) {
      const c = (i + 0.5) * L / n; if (opts.door != null && Math.abs(c - (opts.door + 1.0)) < 1.9) continue;
      const g = B('glass'); if (alongX) g.box(x0 + c - 0.6, y + 1.0, z0 - t / 2 - 0.03, x0 + c + 0.6, y + 2.1, z0 + t / 2 + 0.03, 0x9fc4dd);
      else g.box(x0 - t / 2 - 0.03, y + 1.0, z0 + c - 0.6, x0 + t / 2 + 0.03, y + 2.1, z0 + c + 0.6, 0x9fc4dd);
      const f = B('solid'); if (alongX) f.box(x0 + c - 0.7, y + 0.92, z0 - t / 2 - 0.08, x0 + c + 0.7, y + 1.0, z0 + t / 2 + 0.08, 0xf2f2f2); else f.box(x0 - t / 2 - 0.08, y + 0.92, z0 + c - 0.7, x0 + t / 2 + 0.08, y + 1.0, z0 + c + 0.7, 0xf2f2f2);
    }
  }
}
// Begehbares Haus mit Räumen, Möbeln, Tür, Fenstern, ggf. 2 Etagen mit Treppe und Balkon
function house(cx, cz, w, d, floors, doorSide, opts = {}) {
  const y = opts.y != null ? opts.y : heightAt(cx, cz) + 0.05; const x0 = cx - w / 2, x1 = cx + w / 2, z0 = cz - d / 2, z1 = cz + d / 2, FH = 3.2;
  const col = opts.color || pick(WALLC); const dpos = opts.doorPos != null ? opts.doorPos : (doorSide === 'n' || doorSide === 's' ? w / 2 - 1.0 : d / 2 - 1.0);
  const kind = opts.kind || 'house'; const zStart = floors > 1 ? z0 + 2.5 : z0;
  const part = w >= 9 && kind !== 'shop' && kind !== 'hut' ? x0 + w * (Math.random() < 0.5 ? 0.36 : 0.64) : null;
  const balc = floors > 1 && kind === 'house' && Math.random() < 0.65; const icol = pick(FUR.wallIn);
  const H = { x0, x1, z0, z1, floors, doorSide, dpos, part, zStart, balc };
  // Fundament
  solid(x0 - 0.2, y - 2, z0 - 0.2, x1 + 0.2, y + 0.15, z1 + 0.2, 0x9a9a95);
  for (let f = 0; f < floors; f++) {
    const fy = y + 0.15 + f * FH, wh = FH;
    wall(x0, z0, x1, z0, fy, wh, col, { door: f === 0 && doorSide === 'n' ? dpos : null, windows: true });
    wall(x0, z1, x1, z1, fy, wh, col, { door: f === 0 && doorSide === 's' ? dpos : f === 1 && balc ? w / 2 - 1 : null, windows: true, realDoor: f === 0 });
    wall(x0, z0, x0, z1, fy, wh, col, { door: f === 0 && doorSide === 'w' ? dpos : null, windows: true });
    wall(x1, z0, x1, z1, fy, wh, col, { door: f === 0 && doorSide === 'e' ? dpos : null, windows: true });
    if (part) wall(part, zStart, part, z1, fy, wh - 0.2, icol, { door: (z1 - zStart) / 2 - 1, realDoor: false });
    if (f === 1 && balc) balcony(cx, z1 + 0.15, fy, col);
    // Boden/Decke über diesem Stock
    const sy = fy + FH - 0.2;
    if (f < floors - 1) {
      // Loch für Treppe an der Nordwand (z0), Treppe läuft in +x
      solid(x0, sy, z0 + 1.6, x1, sy + 0.2, z1, 0xe6e1d8);
      solid(x0 + 6.0, sy, z0, x1, sy + 0.2, z0 + 1.6, 0xe6e1d8);
      for (let s = 0; s < 10; s++) solid(x0 + 0.3 + s * 0.55, fy, z0 + 0.2, x0 + 0.85 + s * 0.55, fy + (s + 1) * 0.31, z0 + 1.55, 0x8d6e4f, 'wood');
      // Geländer
      const m = B('metal'); for (let x = x0 + 0.4; x < x0 + 5.6; x += 0.5) m.box(x, sy + 0.2, z0 + 1.57, x + 0.04, sy + 1.1, z0 + 1.63, 0x2f3236);
      m.box(x0 + 0.3, sy + 1.05, z0 + 1.55, x0 + 5.6, sy + 1.12, z0 + 1.65, 0x6d5b47); addCollider(x0 + 0.3, sy + 0.2, z0 + 1.55, x0 + 5.6, sy + 1.1, z0 + 1.65, 'fence');
    } else {
      solid(x0 - 0.2, sy, z0 - 0.2, x1 + 0.2, sy + 0.25, z1 + 0.2, 0x8f8f8a);
      if (!opts.flat) { B('roof').roof(x0, z0, x1, z1, sy + 0.25, Math.min(w, d) * 0.32, opts.roof || pick(ROOFC), w > d); B('solid').box(x1 - 2.2, sy + 0.25, z1 - 2.4, x1 - 1.4, sy + 0.25 + Math.min(w, d) * 0.32 + 0.9, z1 - 1.6, 0x8a5a48); }
      else { const ac = B('metal'); ac.box(cx - 1, sy + 0.25, cz - 0.7, cx + 0.4, sy + 1.25, cz + 0.7, 0xbfc3c7); }
    }
    // Decke (weiß verputzt)
    const cw = B('furn'), cc = 0xf2efe8; if (f < floors - 1) { cw.box(x0 + 0.15, sy - 0.015, z0 + 1.6, x1 - 0.15, sy, z1 - 0.15, cc); cw.box(x0 + 6.0, sy - 0.015, z0 + 0.15, x1 - 0.15, sy, z0 + 1.6, cc); } else cw.box(x0 + 0.15, sy - 0.015, z0 + 0.15, x1 - 0.15, sy, z1 - 0.15, cc);
    // Deckenlampe(n)
    B('glass').cyl(cx, sy - 0.06, cz + (floors > 1 ? 1.2 : 0), 0.22, 0.06, 0xfff2c8, 10);
    furnishHouse(H, f, fy, kind, { chestP: opts.chest != null ? opts.chest : 0.45 });
  }
  const res = { x0, x1, z0, z1, y, top: y + 0.15 + floors * FH, floors, kind, doorSide, part, balc }; W.houses.push(res); return res;
}
function skyscraper(cx, cz, w, d, h) {
  const y = heightAt(cx, cz) - 1; const x0 = cx - w / 2, x1 = cx + w / 2, z0 = cz - d / 2, z1 = cz + d / 2;
  B('facade').box(x0, y, z0, x1, y + h, z1, pick([0xdfe5ea, 0xc9d2da, 0xe8e0d0, 0xbfc9c4, 0x9fb0c0]));
  addCollider(x0, y, z0, x1, y + h, z1, 'bld');
  solid(x0 - 0.3, y + h, z0 - 0.3, x1 + 0.3, y + h + 1, z1 + 0.3, 0x707478);
  if (Math.random() < 0.6) solid(cx - 2, y + h + 1, cz - 2, cx + 2, y + h + 4, cz + 2, 0x8c9096);
}
// Laden mit großer Glasfront (begehbar)
function shop(cx, cz, w, d, doorSide, col) {
  const r = house(cx, cz, w, d, 1, doorSide, { color: col || 0xe6e1d8, flat: true, chest: 0.6, kind: 'shop' });
  return r;
}
function crate(x, z, s = 1.2, y) { const yy = y != null ? y : heightAt(x, z); solid(x - s / 2, yy, z - s / 2, x + s / 2, yy + s, z + s / 2, 0xffffff, 'wood'); }
function container(x, z, alongX, color, y) {
  const yy = y != null ? y : heightAt(x, z); const L = 6.1, Wd = 2.45, H = 2.6;
  const x0 = alongX ? x - L / 2 : x - Wd / 2, x1 = alongX ? x + L / 2 : x + Wd / 2, z0 = alongX ? z - Wd / 2 : z - L / 2, z1 = alongX ? z + Wd / 2 : z + L / 2;
  B('metal').box(x0, yy, z0, x1, yy + H, z1, color); addCollider(x0, yy, z0, x1, yy + H, z1, 'bld'); return yy + H;
}
function car(x, z, alongX, color) {
  const y = heightAt(x, z); const L = 4.3, Wd = 1.8; const b = B('solid'), g = B('glass');
  const ax = alongX ? L / 2 : Wd / 2, az = alongX ? Wd / 2 : L / 2;
  b.box(x - ax, y + 0.35, z - az, x + ax, y + 1.0, z + az, color);
  const cx2 = alongX ? 1.2 : 0.85, cz2 = alongX ? 0.85 : 1.2; g.box(x - cx2, y + 1.0, z - cz2, x + cx2, y + 1.55, z + cz2, 0x2c3e50);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const wx = alongX ? sx * 1.4 : sx * 0.92, wz = alongX ? sz * 0.92 : sz * 1.4; b.box(x + wx - 0.33, y, z + wz - 0.33, x + wx + 0.33, y + 0.66, z + wz + 0.33, 0x1c1c1c); }
  addCollider(x - ax, y, z - az, x + ax, y + 1.5, z + az, 'car');
}
function fence(x0, z0, x1, z1, color = 0x8a6a48) {
  const L = Math.hypot(x1 - x0, z1 - z0), n = Math.ceil(L / 2.5); const alongX = Math.abs(z1 - z0) < Math.abs(x1 - x0);
  for (let i = 0; i <= n; i++) { const x = lerp(x0, x1, i / n), z = lerp(z0, z1, i / n), y = heightAt(x, z); B('solid').box(x - 0.08, y, z - 0.08, x + 0.08, y + 1.3, z + 0.08, color); }
  for (let i = 0; i < n; i++) {
    const xa = lerp(x0, x1, i / n), za = lerp(z0, z1, i / n), xb = lerp(x0, x1, (i + 1) / n), zb = lerp(z0, z1, (i + 1) / n); const y = Math.min(heightAt(xa, za), heightAt(xb, zb));
    for (const hh of [0.45, 1.0]) { if (alongX) B('solid').box(Math.min(xa, xb), y + hh, (za + zb) / 2 - 0.04, Math.max(xa, xb), y + hh + 0.12, (za + zb) / 2 + 0.04, color); else B('solid').box((xa + xb) / 2 - 0.04, y + hh, Math.min(za, zb), (xa + xb) / 2 + 0.04, y + hh + 0.12, Math.max(za, zb), color); }
    if (alongX) addCollider(Math.min(xa, xb), y, (za + zb) / 2 - 0.1, Math.max(xa, xb), y + 1.3, (za + zb) / 2 + 0.1, 'fence'); else addCollider((xa + xb) / 2 - 0.1, y, Math.min(za, zb), (xa + xb) / 2 + 0.1, y + 1.3, Math.max(za, zb), 'fence');
  }
}
function tower(x, z) {
  // Wachturm mit Treppe
  const y = heightAt(x, z); const H = 7;
  for (const sx of [-1.8, 1.8]) for (const sz of [-1.8, 1.8]) solid(x + sx - 0.15, y, z + sz - 0.15, x + sx + 0.15, y + H, z + sz + 0.15, 0x5e4b37);
  solid(x - 2.2, y + H, z - 2.2, x + 2.2, y + H + 0.25, z + 2.2, 0x7a6248);
  solid(x - 2.2, y + H + 0.25, z - 2.2, x + 2.2, y + H + 1.2, z - 2.05, 0x7a6248); solid(x - 2.2, y + H + 0.25, z + 2.05, x + 2.2, y + H + 1.2, z + 2.2, 0x7a6248);
  solid(x + 2.05, y + H + 0.25, z - 2.2, x + 2.2, y + H + 1.2, z + 2.2, 0x7a6248);
  B('roof').roof(x - 2.4, z - 2.4, x + 2.4, z + 2.4, y + H + 3, 1.5, 0x4a4036, true);
  for (const sx of [-2.1, 2.1]) for (const sz of [-2.1, 2.1]) B('solid').box(x + sx - 0.1, y + H, z + sz - 0.1, x + sx + 0.1, y + H + 3, z + sz + 0.1, 0x5e4b37);
  // Treppe auf der -x Seite (Stufen nach Westen hinaus)
  const steps = Math.ceil(H / 0.33); for (let s = 0; s < steps; s++) { const sx = x - 2.4 - (steps - 1 - s) * 0.45; const top = y + (s + 1) * (H + 0.25) / steps; solid(sx - 0.45, top - 0.3, z - 0.7, sx, top, z + 0.7, 0x6d5640); }
  W.lootSpots.push({ x, y: y + H + 0.25, z });
}
function hut(x, z) { house(x, z, 6, 5, 1, pick(['n', 's', 'e', 'w']), { color: 0x8b6b4a, roof: 0x4b3a2a, chest: 0.85, kind: 'hut' }); }

// ---------------- Vegetation & Felsen (Instancing) ----------------
function placeTrees() {
  const pos = []; const ok = (x, z) => {
    const h = heightAt(x, z); if (h < 3 || h > 75) return false; if (Math.hypot(x - W.LAKE.x, z - W.LAKE.z) < W.LAKE.r + 4) return false;
    for (const p of W.pois) if (Math.hypot(x - p.x, z - p.z) < p.r + 4) return false; for (const r of W.roadSegs) if (distToSeg(x, z, r) < 7) return false;
    boxesNear(x, z, 3, _near); return _near.length === 0;
  };
  // Wald
  for (let i = 0; i < 1400; i++) { const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * 175; const x = -230 + Math.cos(a) * r, z = -220 + Math.sin(a) * r; if (ok(x, z)) pos.push([x, z, Math.random() < 0.75 ? 0 : 1]); }
  for (let i = 0; i < 1500; i++) { const x = rand(-480, 480), z = rand(-480, 480); if (fbm(x * 0.01 + 5, z * 0.01, 2) > 0.52 && ok(x, z)) pos.push([x, z, Math.random() < 0.5 ? 0 : 1]); }
  const q = Settings.quality === 'niedrig' ? 0.6 : 1; const use = pos.filter(() => Math.random() < q);
  const pines = use.filter(p => p[2] === 0), oaks = use.filter(p => p[2] === 1);
  const barkM = new THREE.MeshStandardMaterial({ color: 0x7a5a40, map: ZR.tex.bark, roughness: 1 });
  const pineM = new THREE.MeshStandardMaterial({ color: 0xffffff, map: ZR.tex.leaf, roughness: 0.9 });
  const oakM = new THREE.MeshStandardMaterial({ color: 0xffffff, map: ZR.tex.leaf, roughness: 0.9 }); const bushM = new THREE.MeshStandardMaterial({ color: 0x4f7d34, map: ZR.tex.leaf, roughness: 0.9 });
  const trunkG = new THREE.CylinderGeometry(0.2, 0.36, 1, 10); trunkG.translate(0, 0.5, 0);
  const coneG = new THREE.ConeGeometry(1, 1, 14, 3); coneG.translate(0, 0.5, 0); jiggle(coneG, 0.08);
  const blobG = new THREE.IcosahedronGeometry(1, 2); jiggle(blobG, 0.12);
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), P = new THREE.Vector3(), E = new THREE.Euler(), C = new THREE.Color();
  const tiles = new Map(); for (const u of use) { const k = Math.floor(u[0] / 128) * 1000 + Math.floor(u[1] / 128); let a = tiles.get(k); if (!a) tiles.set(k, a = []); a.push(u); }
  for (const list of tiles.values()) {
    const np = list.filter(u => u[2] === 0).length, no = list.length - np;
    const trunks = new THREE.InstancedMesh(tileGeo(trunkG, list), barkM, list.length), cone1 = new THREE.InstancedMesh(tileGeo(coneG, list, 16), pineM, Math.max(1, np * 3)), blob = new THREE.InstancedMesh(tileGeo(blobG, list, 10), oakM, Math.max(1, no * 4));
    let ti = 0, ci = 0, bi = 0;
    for (const [x, z, t] of list) {
      const y = heightAt(x, z) - 0.2, s = rand(0.8, 1.35); E.set(0, Math.random() * 6.28, 0); Q.setFromEuler(E);
      const th = t === 0 ? 3 * s : 3.6 * s; P.set(x, y, z); S.set(s, th, s); M.compose(P, Q, S); trunks.setMatrixAt(ti++, M);
      if (t === 0) { const hue = rand(0.27, 0.33), l = rand(0.75, 1.05); for (let k = 0; k < 3; k++) { P.set(x, y + th * 0.6 + k * 2.6 * s, z); const w = (2.9 - k * 0.75) * s; S.set(w, (4.6 - k * 0.8) * s, w); M.compose(P, Q, S); C.setHSL(hue, 0.45, 0.3 * l + k * 0.03); cone1.setColorAt(ci, C); cone1.setMatrixAt(ci++, M); } }
      else { const hue = rand(0.2, 0.3), l = rand(0.8, 1.1); const parts = [[0, 1.3, 0, 2.7, 2.2], [0.9, 2.4, -0.5, 2.0, 1.8], [-1.0, 2.0, 0.6, 1.9, 1.7], [0.2, 3.2, 0.4, 1.6, 1.4]];
        for (const [ox, oy, oz, r, h] of parts) { P.set(x + ox * s, y + th + oy * s, z + oz * s); S.set(r * s, h * s, r * s); M.compose(P, Q, S); C.setHSL(hue, 0.5, (0.36 + oy * 0.025) * l); blob.setColorAt(bi, C); blob.setMatrixAt(bi++, M); } }
      addCollider(x - 0.35 * s, y, z - 0.35 * s, x + 0.35 * s, y + th + 2, z + 0.35 * s, 'tree'); W.treePos.push(x, z);
    }
    cone1.count = ci; blob.count = bi;
    for (const m of [trunks, cone1, blob]) { if (!m.count) continue; m.castShadow = Settings.quality !== 'niedrig'; m.receiveShadow = true; m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; ZR.scene.add(m); }
  }
  // Felsen
  const rocks = []; for (let i = 0; i < 260; i++) { const x = rand(-480, 480), z = rand(-480, 480); const h = heightAt(x, z); if (h > 3 && !zoneAt(x, z) && Math.hypot(x - 300, z + 300) < 260 || (h > 3 && Math.random() < 0.3 && !zoneAt(x, z))) rocks.push([x, z]); }
  const rockG = new THREE.IcosahedronGeometry(1, 2); jiggle(rockG, 0.22); const rockM = new THREE.MeshStandardMaterial({ color: 0x8a8580, roughness: 0.95, map: ZR.tex.ground });
  const rm = new THREE.InstancedMesh(rockG, rockM, rocks.length); let ri = 0;
  for (const [x, z] of rocks) { const s = rand(0.8, 3.2), y = heightAt(x, z); E.set(rand(0, 3), rand(0, 3), 0); Q.setFromEuler(E); P.set(x, y + s * 0.3, z); S.set(s * rand(1, 1.6), s * rand(0.7, 1), s * rand(1, 1.5)); M.compose(P, Q, S); rm.setMatrixAt(ri++, M); addCollider(x - s * 0.9, y - 1, z - s * 0.9, x + s * 0.9, y + s * 1.0, z + s * 0.9, 'rock'); }
  rm.castShadow = rm.receiveShadow = true; rm.frustumCulled = false; ZR.scene.add(rm);
  // Büsche (nur Optik)
  const bushes = new THREE.InstancedMesh(blobG, bushM, 500); let bk = 0; for (let i = 0; i < 500; i++) { const x = rand(-470, 470), z = rand(-470, 470), h = heightAt(x, z); if (h < 3 || h > 60 || zoneAt(x, z)) continue; const s = rand(0.6, 1.2); P.set(x, h + s * 0.4, z); S.set(s * 1.3, s * 0.8, s * 1.3); Q.identity(); M.compose(P, Q, S); bushes.setMatrixAt(bk++, M); }
  bushes.count = bk; bushes.receiveShadow = true; bushes.frustumCulled = false; ZR.scene.add(bushes);
}
// Vertices leicht verformen, damit Formen natürlicher wirken
// Geometrie-Kopie mit Kachel-Begrenzung (für korrektes Culling instanzierter Objekte)
function tileGeo(g, list, pad = 12) {
  const c = g.clone(); const bb = new THREE.Box3(); for (const u of list) { bb.expandByPoint(new THREE.Vector3(u[0], heightAt(u[0], u[1]) - 2, u[1])); bb.expandByPoint(new THREE.Vector3(u[0], heightAt(u[0], u[1]) + pad, u[1])); }
  bb.expandByScalar(4); c.boundingBox = bb; c.boundingSphere = bb.getBoundingSphere(new THREE.Sphere()); c.computeBoundingSphere = () => { }; c.computeBoundingBox = () => { }; return c;
}
function jiggle(g, amt) {
  const p = g.attributes.position, map = new Map();
  for (let i = 0; i < p.count; i++) { const k = p.getX(i).toFixed(3) + ',' + p.getY(i).toFixed(3) + ',' + p.getZ(i).toFixed(3); let o = map.get(k); if (!o) { o = 1 + (Math.random() - 0.5) * 2 * amt; map.set(k, o); } p.setXYZ(i, p.getX(i) * o, p.getY(i) * (1 + (o - 1) * 0.5), p.getZ(i) * o); }
  g.computeVertexNormals();
}
// ---------------- Gras (instanziert, in Kacheln, mit Wind) ----------------
const GRASS = { chunks: [], time: { value: 0 } };
function buildGrass() {
  const total = Settings.quality === 'hoch' ? 46000 : Settings.quality === 'mittel' ? 26000 : 9000;
  const tex = canvasTex(128, (g, s) => { g.clearRect(0, 0, s, s); for (let i = 0; i < 14; i++) { const x = 10 + Math.random() * (s - 20), w = 3 + Math.random() * 4, h = s * (0.55 + Math.random() * 0.45), bend = (Math.random() - 0.5) * 30;
    const gr = g.createLinearGradient(0, s, 0, s - h); gr.addColorStop(0, '#2c4a18'); gr.addColorStop(1, '#a8c860'); g.fillStyle = gr; g.beginPath(); g.moveTo(x - w, s); g.quadraticCurveTo(x + bend * 0.3, s - h * 0.5, x + bend, s - h); g.quadraticCurveTo(x + bend * 0.3 + 1, s - h * 0.5, x + w, s); g.fill(); } });
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  const geo = new THREE.BufferGeometry(); const P = [], U = [], I = [];
  for (let k = 0; k < 2; k++) { const a = k * Math.PI / 2, c = Math.cos(a) * 0.45, s2 = Math.sin(a) * 0.45, b = P.length / 3; P.push(-c, 0, -s2, c, 0, s2, c, 0.55, s2, -c, 0.55, -s2); U.push(0, 0, 1, 0, 1, 1, 0, 1); I.push(b, b + 1, b + 2, b, b + 2, b + 3); }
  geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); geo.setIndex(I);
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(new Array(P.length / 3).fill(0).flatMap(() => [0, 1, 0]), 3));
  const mat = new THREE.MeshLambertMaterial({ map: tex, alphaTest: 0.45, side: THREE.DoubleSide });
  mat.onBeforeCompile = sh => { sh.uniforms.uTime = GRASS.time; sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n#ifdef USE_INSTANCING\nfloat ph = instanceMatrix[3].x * 0.35 + instanceMatrix[3].z * 0.27;\ntransformed.x += sin(uTime * 1.8 + ph) * 0.09 * uv.y; transformed.z += cos(uTime * 1.4 + ph) * 0.05 * uv.y;\n#endif'); };
  const CH = 110, n = Math.ceil(W.SIZE / CH); const buckets = []; for (let i = 0; i < n * n; i++) buckets.push([]);
  let tries = 0, placed = 0;
  while (placed < total && tries < total * 4) {
    tries++; const x = rand(-480, 480), z = rand(-480, 480), h = heightAt(x, z); if (h < 3.2 || h > 55) continue;
    const p = zoneAt(x, z); if (p && p.ground) continue; if (Math.hypot(x - W.LAKE.x, z - W.LAKE.z) < W.LAKE.r + 3) continue;
    if (fbm(x * 0.02 + 3, z * 0.02, 2) < 0.38) continue;
    const bi = Math.floor((x + W.HALF) / CH) + Math.floor((z + W.HALF) / CH) * n; buckets[bi].push(x, h, z); placed++;
  }
  const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), V = new THREE.Vector3(), E = new THREE.Euler(), C = new THREE.Color();
  buckets.forEach((b, bi) => {
    if (!b.length) return; const cnt = b.length / 3; const pts = []; for (let i = 0; i < cnt; i++) pts.push([b[i * 3], b[i * 3 + 2]]); const im = new THREE.InstancedMesh(tileGeo(geo, pts, 2), mat, cnt);
    for (let i = 0; i < cnt; i++) { E.set(0, Math.random() * 6.28, 0); Q.setFromEuler(E); const s = rand(0.7, 1.5); S.set(s, s * rand(0.8, 1.3), s); V.set(b[i * 3], b[i * 3 + 1] - 0.05, b[i * 3 + 2]); M4.compose(V, Q, S); im.setMatrixAt(i, M4); C.setHSL(rand(0.2, 0.27), rand(0.35, 0.55), rand(0.55, 0.85)); im.setColorAt(i, C); }
    im.receiveShadow = true; ZR.scene.add(im); GRASS.chunks.push({ m: im, x: -W.HALF + (bi % n + 0.5) * CH, z: -W.HALF + (Math.floor(bi / n) + 0.5) * CH });
  });
}
function updateEnv(dt, px, pz) {
  GRASS.time.value += dt; for (const c of GRASS.chunks) c.m.visible = Math.hypot(c.x - px, c.z - pz) < 190;
  if (W.waterTex) { W.waterTex.offset.x += dt * 0.012; W.waterTex.offset.y += dt * 0.007; W.waterTex2.offset.x -= dt * 0.008; W.waterTex2.offset.y += dt * 0.01; }
}
function makeWaterNormal() {
  const S2 = 256, c = document.createElement('canvas'); c.width = c.height = S2; const g = c.getContext('2d'); const img = g.createImageData(S2, S2); const H = new Float32Array(S2 * S2);
  for (let j = 0; j < S2; j++) for (let i = 0; i < S2; i++) { let v = 0, a = 1, f = 4; for (let o = 0; o < 4; o++) { v += a * Math.sin((i / S2) * Math.PI * 2 * f + Math.sin((j / S2) * Math.PI * 2 * (f - 1) + o) * 1.5) * Math.cos((j / S2) * Math.PI * 2 * f + o * 1.7); a *= 0.5; f *= 2; } H[j * S2 + i] = v; }
  for (let j = 0; j < S2; j++) for (let i = 0; i < S2; i++) { const dx = H[j * S2 + (i + 1) % S2] - H[j * S2 + (i + S2 - 1) % S2], dy = H[((j + 1) % S2) * S2 + i] - H[((j + S2 - 1) % S2) * S2 + i]; const n = new THREE.Vector3(-dx * 2, -dy * 2, 1).normalize(); const k = (j * S2 + i) * 4; img.data[k] = (n.x * 0.5 + 0.5) * 255; img.data[k + 1] = (n.y * 0.5 + 0.5) * 255; img.data[k + 2] = (n.z * 0.5 + 0.5) * 255; img.data[k + 3] = 255; }
  g.putImageData(img, 0, 0); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
function distToSeg(x, z, s) { const dx = s.bx - s.ax, dz = s.bz - s.az, L2 = dx * dx + dz * dz; let t = L2 ? ((x - s.ax) * dx + (z - s.az) * dz) / L2 : 0; t = clamp(t, 0, 1); return Math.hypot(x - (s.ax + dx * t), z - (s.az + dz * t)); }

// ---------------- Straßen ----------------
function buildRoads() {
  const pts = W.roadPaths; const b = new Batch(); const col = new THREE.Color(0xffffff);
  for (const path of pts) for (let i = 0; i < path.length - 1; i++) {
    const [ax, az] = path[i], [bx, bz] = path[i + 1]; W.roadSegs.push({ ax, az, bx, bz });
    const L = Math.hypot(bx - ax, bz - az), n = Math.ceil(L / 4), nx = -(bz - az) / L * 4, nz = (bx - ax) / L * 4;
    for (let k = 0; k < n; k++) {
      const t0 = k / n, t1 = (k + 1) / n; const x0 = lerp(ax, bx, t0), z0 = lerp(az, bz, t0), x1 = lerp(ax, bx, t1), z1 = lerp(az, bz, t1);
      const yA = Math.max(heightAt(x0 - nx, z0 - nz), heightAt(x0 + nx, z0 + nz), heightAt(x0, z0)) + 0.12, yB = Math.max(heightAt(x1 - nx, z1 - nz), heightAt(x1 + nx, z1 + nz), heightAt(x1, z1)) + 0.12;
      b.p.push(x0 - nx, yA, z0 - nz, x0 + nx, yA, z0 + nz, x1 + nx, yB, z1 + nz, x1 - nx, yB, z1 - nz);
      for (let q = 0; q < 4; q++) { b.n.push(0, 1, 0); b.c.push(1, 1, 1); }
      const u0 = (k * 4) / 8, u1 = ((k + 1) * 4) / 8; b.uv.push(0, u0, 1, u0, 1, u1, 0, u1); const v = b.v; b.idx.push(v, v + 2, v + 1, v, v + 3, v + 2); b.v += 4;
    }
  }
  const mat = new THREE.MeshStandardMaterial({ map: ZR.tex.road, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const m = b.build(mat); m.castShadow = false; ZR.scene.add(m);
}

// ---------------- Orte der Insel ----------------
function defineZones() {
  const P = (name, x, z, r, h, ground, edge = 50) => { const p = { name, x, z, r, h, ground }; W.pois.push(p); ZONES.push({ x, z, r, h, edge }); return p; };
  P('Bockstadt', 0, -150, 115, 11, 'asphalt', 60);
  P('Fischdorf', -250, 150, 80, 9, null, 50);
  P('Rostwerk', 250, 90, 85, 8, 'asphalt', 50);
  P('Mega-Lager', 300, 270, 50, 6, 'asphalt', 40);
  P('Tank & Blubb', -95, 40, 30, 10, 'asphalt', 40);
  P('Fort Zicke', -330, -70, 75, 13, 'dirt', 50);
  P('Blubbsee', W.LAKE.x, W.LAKE.z, 0, 0, null, 0).noZone = true; ZONES.pop();
  W.pois[W.pois.length - 1].r = W.LAKE.r;
  // Hütten
  W.huts = [[160, -330], [-150, 360], [420, -40], [-410, 270], [110, 380], [-30, 120], [180, -60], [-170, -40], [380, 160], [-60, 300]];
  for (const [x, z] of W.huts) ZONES.push({ x, z, r: 8, h: rawHeight(x, z), edge: 14 });
  W.pois.push({ name: 'Dunkelwald', x: -230, z: -220, r: 0 }); W.pois.push({ name: 'Meckerberge', x: 300, z: -300, r: 0 }); W.pois.push({ name: 'Sandbucht', x: 30, z: 430, r: 0 });
  W.roadPaths = [
    [[-250, 150], [-180, 100], [-95, 40], [-40, -40], [0, -150]],
    [[0, -150], [100, -60], [180, 30], [250, 90], [300, 270]],
    [[0, -150], [-120, -110], [-250, -80], [-330, -70]],
    [[-95, 40], [-20, 120], [10, 180]],
    [[250, 90], [160, 160], [110, 240]],
    [[0, -150], [0, -240]]
  ];
  W.roadSegs = [];
}

function buildCity() {
  const cx = 0, cz = -150; const gridS = 34;
  for (let i = -3; i <= 3; i++) for (let j = -3; j <= 3; j++) {
    const x = cx + i * gridS, z = cz + j * gridS; if (Math.hypot(i, j) > 3.2) continue;
    if (Math.abs(i) <= 1 && Math.abs(j) <= 1 && !(i === 0 && j === 0)) { skyscraper(x, z, rand(16, 22), rand(16, 22), rand(38, 75)); continue; }
    if (i === 0 && j === 0) { // Platz mit Brunnen
      const y = heightAt(x, z); B('solid').cyl(x, y, z, 5, 0.8, 0xbcb6a8, 20); B('glass').cyl(x, y + 0.5, z, 4.4, 0.35, 0x4aa3c8, 20); B('solid').cyl(x, y, z, 0.6, 3, 0xbcb6a8, 10); addCollider(x - 4.6, y, z - 4.6, x + 4.6, y + 0.8, z + 4.6); W.chests.push({ x: x + 7, y, z }); continue;
    }
    const r = Math.random(); if (r < 0.45) skyscraper(x, z, rand(14, 20), rand(14, 20), rand(18, 40));
    else if (r < 0.8) shop(x, z, rand(11, 14), rand(9, 12), pick(['n', 's', 'e', 'w']));
    else house(x, z, 10, 9, 2, pick(['n', 's', 'e', 'w']), { flat: true });
  }
  for (let k = 0; k < 14; k++) { const a = rand(0, 6.28), r = rand(20, 100); const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r; boxesNear(x, z, 4, _near); if (!_near.length) car(x, z, Math.random() < 0.5, pick([0xb3261e, 0x1e5bb3, 0xe0e0e0, 0x222222, 0xd4a017, 0x3a7d44])); }
  // Straßenlaternen
  for (let i = -3; i <= 3; i++) for (const j of [-2.5, 2.5]) { const x = cx + i * gridS + 17, z = cz + j * gridS; boxesNear(x, z, 1, _near); if (_near.length) continue; const y = heightAt(x, z); solid(x - 0.12, y, z - 0.12, x + 0.12, y + 6, z + 0.12, 0x3a3a3a); B('solid').box(x - 0.2, y + 6, z - 0.9, x + 0.2, y + 6.2, z + 0.1, 0x3a3a3a); }
}
function buildVillage() {
  const cx = -250, cz = 150; const spots = [[-35, -30, 's'], [0, -40, 's'], [35, -30, 's'], [-45, 5, 'e'], [45, 5, 'w'], [-35, 40, 'n'], [0, 45, 'n'], [35, 40, 'n'], [-15, 70, 'n'], [60, -55, 'w']];
  for (const [dx, dz, side] of spots) house(cx + dx, cz + dz, rand(9, 11), rand(8, 9.5), Math.random() < 0.5 ? 2 : 1, side);
  const y = heightAt(cx, cz); B('solid').cyl(cx, y, cz, 3, 0.9, 0x9b958a, 16); B('glass').cyl(cx, y + 0.6, cz, 2.6, 0.3, 0x4aa3c8, 16); addCollider(cx - 2.8, y, cz - 2.8, cx + 2.8, y + 0.9, cz + 2.8);
  fence(cx - 70, cz - 70, cx - 20, cz - 70); fence(cx + 20, cz + 75, cx + 70, cz + 75); fence(cx - 75, cz - 20, cx - 75, cz + 30);
  car(cx + 15, cz - 12, true, 0x6b8e23); car(cx - 18, cz + 20, false, 0x8b0000);
  for (let i = 0; i < 6; i++) crate(cx + rand(-50, 50), cz + rand(-60, 60));
  W.chests.push({ x: cx + 5, y, z: cz + 5 });
}
function buildIndustrial() {
  const cx = 250, cz = 90;
  const hall = (x, z, w, d, h, col) => {
    const y = heightAt(x, z); const x0 = x - w / 2, x1 = x + w / 2, z0 = z - d / 2, z1 = z + d / 2;
    solid(x0 - 0.2, y - 2, z0 - 0.2, x1 + 0.2, y + 0.1, z1 + 0.2, 0x8a8a85);
    const t = 0.4; const gap = 7; const mid = (x0 + x1) / 2;
    solid(x0, y, z0 - t / 2, x1, y + h, z0 + t / 2, col, 'metal');
    solid(x0, y, z1 - t / 2, mid - gap / 2, y + h, z1 + t / 2, col, 'metal'); solid(mid + gap / 2, y, z1 - t / 2, x1, y + h, z1 + t / 2, col, 'metal'); solid(mid - gap / 2, y + 5, z1 - t / 2, mid + gap / 2, y + h, z1 + t / 2, col, 'metal');
    solid(x0 - t / 2, y, z0, x0 + t / 2, y + h, mid > 0 ? z1 : z1, col, 'metal'); solid(x1 - t / 2, y, z0, x1 + t / 2, y + h, z1, col, 'metal');
    solid(x0 - 0.5, y + h, z0 - 0.5, x1 + 0.5, y + h + 0.4, z1 + 0.5, 0x5d646b, 'metal');
    // Innen: Regale, Kisten, Laufsteg
    for (let k = 0; k < 4; k++) crate(x0 + 3 + k * 3, z0 + 3, 1.4, y + 0.1);
    solid(x0 + 2, y + 0.1, z0 + 7, x1 - 2, y + 2.4, z0 + 8, 0x45607a, 'metal');
    W.lootSpots.push({ x: x - w / 4, y: y + 0.1, z }, { x: x + w / 4, y: y + 0.1, z: z + 3 }, { x, y: y + 2.4, z: z0 + 7.5 }); W.chests.push({ x: x1 - 3, y: y + 0.1, z: z1 - 4 });
  };
  hall(cx - 30, cz - 30, 34, 22, 9, 0x9aa5ad); hall(cx + 30, cz + 15, 28, 20, 8, 0xb07a4f);
  const y = heightAt(cx, cz);
  // Tanks & Schornsteine
  for (const [dx, dz] of [[35, -40], [48, -28], [-45, 30]]) { const yy = heightAt(cx + dx, cz + dz); B('metal').cyl(cx + dx, yy, cz + dz, 5, 11, 0xdedede, 18); addCollider(cx + dx - 4.2, yy, cz + dz - 4.2, cx + dx + 4.2, yy + 11, cz + dz + 4.2, 'bld'); }
  { const yy = heightAt(cx - 5, cz + 45); B('solid').cyl(cx - 5, yy, cz + 45, 2.2, 32, 0x8f4a3a, 14); addCollider(cx - 6.8, yy, cz + 43.2, cx - 3.2, yy + 32, cz + 46.8, 'bld'); }
  const cols = [0xb03a2e, 0x2e6eb0, 0x2e9b54, 0xd99a2b, 0x6d6d6d, 0x7a3fa0];
  for (let k = 0; k < 16; k++) { const x = cx + rand(-60, 60), z = cz + rand(-60, 60); boxesNear(x, z, 7, _near); if (_near.length) continue; const top = container(x, z, Math.random() < 0.5, pick(cols)); if (Math.random() < 0.35) container(x, z, Math.random() < 0.5, pick(cols), top); if (Math.random() < 0.4) W.lootSpots.push({ x: x + 3.5, y: heightAt(x + 3.5, z), z }); }
  fence(cx - 80, cz - 80, cx + 80, cz - 80, 0x777777); fence(cx + 80, cz - 80, cx + 80, cz + 30, 0x777777);
}
function buildWarehouse() {
  const x = 300, z = 270; const y = heightAt(x, z); const w = 54, d = 32, h = 12; const x0 = x - w / 2, x1 = x + w / 2, z0 = z - d / 2, z1 = z + d / 2;
  solid(x0 - 0.3, y - 2, z0 - 0.3, x1 + 0.3, y + 0.1, z1 + 0.3, 0x8a8a85); const c = 0x7d8f9c;
  solid(x0, y, z0 - 0.2, x1, y + h, z0 + 0.2, c, 'metal');
  solid(x0, y, z1 - 0.2, x - 6, y + h, z1 + 0.2, c, 'metal'); solid(x + 6, y, z1 - 0.2, x1, y + h, z1 + 0.2, c, 'metal'); solid(x - 6, y + 6, z1 - 0.2, x + 6, y + h, z1 + 0.2, c, 'metal');
  solid(x0 - 0.2, y, z0, x0 + 0.2, y + h, z - 3, c, 'metal'); solid(x0 - 0.2, y, z + 3, x0 + 0.2, y + h, z1, c, 'metal'); solid(x0 - 0.2, y + 3, z - 3, x0 + 0.2, y + h, z + 3, c, 'metal');
  solid(x1 - 0.2, y, z0, x1 + 0.2, y + h, z1, c, 'metal');
  solid(x0 - 0.5, y + h, z0 - 0.5, x1 + 0.5, y + h + 0.5, z1 + 0.5, 0x56606a, 'metal');
  B('glass').box(x0 + 4, y + h - 3, z0 - 0.25, x1 - 4, y + h - 1, z0 + 0.25, 0x9fc4dd);
  for (let r = 0; r < 3; r++) { const zz = z0 + 7 + r * 8; solid(x0 + 6, y + 0.1, zz, x1 - 14, y + 4.5, zz + 1.2, 0x9c6b3a, 'wood'); for (let k = 0; k < 4; k++) W.lootSpots.push({ x: x0 + 9 + k * 9, y: y + 0.1, z: zz + 3 }); }
  solid(x1 - 12, y + 0.1, z0 + 2, x1 - 2, y + 4.5, z0 + 12, 0x7a7a7a); // Büro-Block, oben begehbar
  for (let s = 0; s < 14; s++) solid(x1 - 13.5 - s * 0.5 + 0.0, y + 0.1, z0 + 12.5, x1 - 13 - s * 0.5, y + 0.1 + (14 - s) * 0.31, z0 + 14, 0x666666);
  W.chests.push({ x: x1 - 7, y: y + 4.5, z: z0 + 7 }, { x: x0 + 3, y: y + 0.1, z: z1 - 3 });
  for (let k = 0; k < 4; k++) container(x + rand(-35, 35), z1 + rand(8, 18), true, pick([0xb03a2e, 0x2e6eb0, 0xd99a2b]));
}
function buildGasStation() {
  const x = -95, z = 40; const y = heightAt(x, z);
  for (const [dx, dz] of [[-6, -4], [6, -4], [-6, 4], [6, 4]]) solid(x + dx - 0.25, y, z + dz - 0.25, x + dx + 0.25, y + 5, z + dz + 0.25, 0xe8e8e8);
  solid(x - 9, y + 5, z - 6, x + 9, y + 5.7, z + 6, 0xd23c3c);
  for (const dx of [-3, 3]) { solid(x + dx - 0.5, y, z - 0.8, x + dx + 0.5, y + 1.7, z + 0.8, 0xeeeeee); B('solid').box(x + dx - 0.52, y + 1.1, z - 0.82, x + dx + 0.52, y + 1.5, z + 0.82, 0x2266cc); }
  shop(x + 4, z - 18, 14, 9, 's', 0xf2efe6);
  car(x - 3, z + 9, true, 0x1e5bb3); car(x + 15, z + 2, false, 0xd4a017);
  const ty = heightAt(x - 14, z - 14); solid(x - 15, ty, z - 15, x - 13, ty + 8, z - 13, 0x444444); B('solid').box(x - 17, ty + 8, z - 14.2, x - 11, ty + 10, z - 13.8, 0xd23c3c);
  W.chests.push({ x: x + 10, y, z: z + 10 });
}
function buildMilitary() {
  const cx = -330, cz = -70; const y = heightAt(cx, cz);
  fence(cx - 65, cz - 60, cx + 65, cz - 60, 0x666666); fence(cx - 65, cz + 60, cx - 8, cz + 60, 0x666666); fence(cx + 8, cz + 60, cx + 65, cz + 60, 0x666666);
  fence(cx - 65, cz - 60, cx - 65, cz + 60, 0x666666); fence(cx + 65, cz - 60, cx + 65, cz - 10, 0x666666); fence(cx + 65, cz + 10, cx + 65, cz + 60, 0x666666);
  for (const [dx, dz, s] of [[-30, -30, 'e'], [-30, 0, 'e'], [-30, 30, 'e']]) house(cx + dx, cz + dz, 16, 8, 1, s, { color: 0x6b7350, roof: 0x3b4230, chest: 0.6, kind: 'barracks' });
  // Bunker
  const bunker = (bx, bz) => { const by = heightAt(bx, bz); const w = 10, d = 8, h = 3.2; const x0 = bx - w / 2, x1 = bx + w / 2, z0 = bz - d / 2, z1 = bz + d / 2; const c = 0x8a8a7f;
    solid(x0, by, z0, x1, by + h, z0 + 0.6, c); solid(x0, by, z1 - 0.6, bx - 1, by + h, z1, c); solid(bx + 1, by, z1 - 0.6, x1, by + h, z1, c); solid(bx - 1, by + 2.4, z1 - 0.6, bx + 1, by + h, z1, c);
    solid(x0, by, z0, x0 + 0.6, by + h, z1, c); solid(x1 - 0.6, by, z0, x1, by + h, z1, c); solid(x0 - 0.3, by + h, z0 - 0.3, x1 + 0.3, by + h + 0.8, z1 + 0.3, c);
    W.chests.push({ x: bx, y: by, z: bz - 1.5 }); W.lootSpots.push({ x: bx + 2.5, y: by, z: bz + 1 }); };
  bunker(cx + 20, cz - 30); bunker(cx + 35, cz + 25);
  tower(cx - 55, cz - 50); tower(cx + 55, cz + 50); tower(cx + 55, cz - 50);
  for (let k = 0; k < 10; k++) { const x = cx + rand(-15, 45), z = cz + rand(-45, 45); boxesNear(x, z, 3, _near); if (_near.length) continue; const yy = heightAt(x, z); solid(x - 2, yy, z - 0.5, x + 2, yy + 1.1, z + 0.5, 0xa89a72); }
  container(cx + 5, cz + 45, true, 0x4f5a3a); container(cx + 5, cz - 45, true, 0x4f5a3a);
  // Panzer-Deko
  const tx = cx + 45, tz = cz; const ty = heightAt(tx, tz); solid(tx - 3.5, ty, tz - 2, tx + 3.5, ty + 1.6, tz + 2, 0x4a5536); solid(tx - 1.6, ty + 1.6, tz - 1.4, tx + 1.6, ty + 2.6, tz + 1.4, 0x56623e); B('solid').box(tx + 1.6, ty + 2, tz - 0.15, tx + 6, ty + 2.3, tz + 0.15, 0x3c4630);
}

// ---------------- Kleine Details: Bänke, Mülltonnen, Hydranten, Laternen, Blumenkübel ----------------
function bench(x, z, alongX) { const y = heightAt(x, z), b = B('wood'), m = B('metal'); const L = 1.8; const ax = alongX ? L / 2 : 0.25, az = alongX ? 0.25 : L / 2;
  b.box(x - ax, y + 0.45, z - az, x + ax, y + 0.52, z + az, 0x9a6a3a); if (alongX) b.box(x - ax, y + 0.55, z + 0.2, x + ax, y + 0.95, z + 0.26, 0x9a6a3a); else b.box(x + 0.2, y + 0.55, z - az, x + 0.26, y + 0.95, z + az, 0x9a6a3a);
  for (const s of [-0.8, 0.8]) m.box(x + (alongX ? s : -0.2), y, z + (alongX ? -0.2 : s), x + (alongX ? s + 0.06 : 0.2), y + 0.45, z + (alongX ? 0.2 : s + 0.06), 0x333333); addCollider(x - ax, y, z - az, x + ax, y + 0.6, z + az, 'prop'); }
function bin(x, z) { const y = heightAt(x, z); B('metal').cyl(x, y, z, 0.32, 0.95, 0x3a6b45, 14); B('metal').cyl(x, y + 0.95, z, 0.35, 0.06, 0x2a2a2a, 14); addCollider(x - 0.3, y, z - 0.3, x + 0.3, y + 1, z + 0.3, 'prop'); }
function hydrant(x, z) { const y = heightAt(x, z); B('metal').cyl(x, y, z, 0.13, 0.7, 0xc0392b, 10); B('metal').cyl(x, y + 0.7, z, 0.16, 0.08, 0xc0392b, 10); B('metal').box(x - 0.22, y + 0.42, z - 0.05, x + 0.22, y + 0.52, z + 0.05, 0xa93226); }
function planter(x, z) { const y = heightAt(x, z); B('solid').cyl(x, y, z, 0.6, 0.5, 0xb0a594, 14); B('roof').cyl(x, y + 0.5, z, 0.55, 0.05, 0x4a3a2a, 14); for (let i = 0; i < 5; i++) { const a = i * 1.26; B('glass').cyl(x + Math.cos(a) * 0.28, y + 0.55, z + Math.sin(a) * 0.28, 0.13, 0.22, pick([0xe84a5f, 0xffcc29, 0xb45cff, 0xffffff]), 6); } addCollider(x - 0.55, y, z - 0.55, x + 0.55, y + 0.6, z + 0.55, 'prop'); }
function lamp(x, z) { const y = heightAt(x, z); B('metal').cyl(x, y, z, 0.08, 4.2, 0x2f2f2f, 8); B('metal').cyl(x, y + 4.2, z, 0.28, 0.25, 0x2f2f2f, 10); B('glass').cyl(x, y + 3.95, z, 0.22, 0.25, 0xfff2c0, 10); addCollider(x - 0.1, y, z - 0.1, x + 0.1, y + 4.4, z + 0.1, 'prop'); }
function scatterProps() {
  const free = (x, z, r) => { boxesNear(x, z, r, _near); return !_near.some(b => x > b.x0 - r && x < b.x1 + r && z > b.z0 - r && z < b.z1 + r); };
  const zones = [[0, -150, 105, 1], [-250, 150, 75, 0], [-95, 40, 25, 1], [250, 90, 60, 1]];
  for (const [cx, cz, r, city] of zones) for (let k = 0; k < (city ? 40 : 26); k++) {
    const x = cx + rand(-r, r), z = cz + rand(-r, r); if (!free(x, z, 1.4)) continue; const q = Math.random();
    if (q < 0.25) bench(x, z, Math.random() < 0.5); else if (q < 0.45) bin(x, z); else if (q < 0.6 && city) hydrant(x, z); else if (q < 0.8) planter(x, z); else lamp(x, z);
  }
}
function buildWorld(progress) {
  W.houses = []; W.boxes.length = 0; W.grid.clear(); W.doors.length = 0; W.chests.length = 0; W.lootSpots.length = 0; W.pois.length = 0; W.treePos.length = 0;
  ZR.tex = makeTextures();
  ZR.geo = { door: new THREE.BoxGeometry(1.9, 2.5, 0.08) }; ZR.mat = { door: new THREE.MeshStandardMaterial({ color: 0xb5522e, map: ZR.tex.wood, roughness: 0.7 }) };
  const steps = [
    () => { defineZones(); buildHeightmap(); }, () => { buildSky(); buildTerrain(ZR.tex); }, () => buildRoads(), () => buildCity(), () => buildVillage(), () => { buildIndustrial(); buildWarehouse(); },
    () => { buildGasStation(); buildMilitary(); for (const [x, z] of W.huts) hut(x, z); for (let i = 0; i < 40; i++) { const x = rand(-450, 450), z = rand(-450, 450); if (heightAt(x, z) > 3 && !zoneAt(x, z)) crate(x, z); } },
    () => scatterProps(), () => placeTrees(), () => buildGrass(),
    () => {
      const mats = {
        solid: new THREE.MeshStandardMaterial({ vertexColors: true, map: ZR.tex.concrete, roughness: 0.85 }),
        facade: new THREE.MeshStandardMaterial({ vertexColors: true, map: ZR.tex.facade, roughness: 0.5, metalness: 0.2 }),
        glass: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.08, metalness: 0.6, emissive: 0x0c1824 }),
        roof: new THREE.MeshStandardMaterial({ vertexColors: true, map: ZR.tex.concrete, roughness: 0.9 }),
        wood: new THREE.MeshStandardMaterial({ vertexColors: true, map: ZR.tex.wood, roughness: 0.85 }),
        metal: new THREE.MeshStandardMaterial({ vertexColors: true, map: ZR.tex.metal, roughness: 0.55, metalness: 0.35 }),
        furn: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.62 }),
        tile: new THREE.MeshStandardMaterial({ vertexColors: true, map: ZR.tex.tile, roughness: 0.35, metalness: 0.05 })
      };
      ZR.facadeMat = mats.facade;
      for (const k in W.batches) { const b = W.batches[k]; if (!b.v) continue; for (const m of b.buildTiled(mats[k] || mats.solid)) ZR.scene.add(m); }
      W.batches = {};
    }
  ];
  return steps;
}
function updateDoors(dt, chars) {
  for (const d of W.doors) {
    let near = false; for (const c of chars) { if (!c.alive) continue; const dx = c.x - d.cx, dz = c.z - d.cz; if (dx * dx + dz * dz < 10 && Math.abs(c.y - d.y) < 2.2) { near = true; break; } }
    d.target = near ? 1 : 0; if (d.open !== d.target) { d.open = clamp(d.open + (d.target ? 3 : -2) * dt, 0, 1); d.pivot.rotation.y = -d.open * 1.6; }
    d.col.on = d.open < 0.3;
  }
}
