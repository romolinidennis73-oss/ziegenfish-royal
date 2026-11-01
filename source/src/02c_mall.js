// ============ Mecker-Mall (Einkaufszentrum) + Straßen-Requisiten ============
function textSign(text, w, h, bg, fg, x, y, z, rotY) {
  const c = document.createElement('canvas'); c.width = 512; c.height = Math.round(512 * h / w); const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, c.width, c.height); g.strokeStyle = fg; g.lineWidth = 10; g.strokeRect(8, 8, c.width - 16, c.height - 16);
  g.fillStyle = fg; g.font = `bold ${Math.round(c.height * 0.55)}px Bungee, Impact, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, c.width / 2, c.height * 0.54, c.width - 40);
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = 4;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t })); m.position.set(x, y, z); m.rotation.y = rotY || 0; ZR.scene.add(m); return m;
}
// Schaufensterfront entlang X (z fest) mit Eingang [g0,g1]
function storefront(x0, x1, z, y, h, g0, g1, frameCol) {
  const seg = (a, b) => { if (b - a < 0.05) return; solid(a, y, z - 0.12, b, y + 0.5, z + 0.12, frameCol); B('glass').box(a, y + 0.5, z - 0.05, b, y + h - 0.4, z + 0.05, 0xa9d4ea); addCollider(a, y + 0.5, z - 0.08, b, y + h - 0.4, z + 0.08, 'glass');
    for (let x = a; x <= b + 0.01; x += 2) B('metal').box(x - 0.05, y + 0.5, z - 0.08, x + 0.05, y + h - 0.4, z + 0.08, 0x3a3f46); };
  seg(x0, g0); seg(g1, x1); solid(x0, y + h - 0.4, z - 0.15, x1, y + h, z + 0.15, frameCol);
  B('metal').box(g0 - 0.1, y, z - 0.12, g0, y + h - 0.4, z + 0.12, 0x3a3f46); B('metal').box(g1, y, z - 0.12, g1 + 0.1, y + h - 0.4, z + 0.12, 0x3a3f46);
}
function buildMall() {
  const p = W.pois.find(q => q.name === 'Mecker-Mall'); if (!p) return; const cx = p.x, cz = p.z, y = heightAt(cx, cz) + 0.05;
  const WD = 46, DP = 32, H = 6.5, x0 = cx - WD / 2, x1 = cx + WD / 2, z0 = cz - DP / 2, z1 = cz + DP / 2; const facade = 0xe9e4da, accent = 0x2f6f8f;
  solid(x0 - 0.5, y - 2, z0 - 0.5, x1 + 0.5, y + 0.15, z1 + 0.5, 0xb8b4aa); const fy = y + 0.15;
  // Außenwände mit Eingängen West/Ost (Glas-Eingang)
  const ent = 4.4;
  wall(x0, z0, x1, z0, fy, H, facade, { windows: true }); wall(x0, z1, x1, z1, fy, H, facade, { windows: true });
  for (const xx of [x0, x1]) {
    solid(xx - 0.15, fy, z0, xx + 0.15, fy + H, cz - ent / 2, facade); solid(xx - 0.15, fy, cz + ent / 2, xx + 0.15, fy + H, z1, facade); solid(xx - 0.15, fy + 3.4, cz - ent / 2, xx + 0.15, fy + H, cz + ent / 2, facade);
    B('glass').box(xx - 0.2, fy + 3.4, cz - ent / 2 - 3, xx + 0.2, fy + 5.6, cz + ent / 2 + 3, 0x9fc8e0); // Glas über Eingang
    const o = xx === x0 ? -1 : 1; solid(xx + o * 0.15, fy + 3.4, cz - ent / 2 - 1.5, xx + o * 2.6, fy + 3.65, cz + ent / 2 + 1.5, accent); // Vordach
    B('metal').box(xx - 0.12, fy, cz - ent / 2 - 0.12, xx + 0.12, fy + 3.4, cz - ent / 2, 0x3a3f46); B('metal').box(xx - 0.12, fy, cz + ent / 2, xx + 0.12, fy + 3.4, cz + ent / 2 + 0.12, 0x3a3f46);
  }
  // Farbband + Dach
  B('solid').box(x0 - 0.2, fy + H - 1.0, z0 - 0.2, x1 + 0.2, fy + H - 0.6, z1 + 0.2, accent);
  const ry = fy + H; solid(x0 - 0.2, ry, z0 - 0.2, x1 + 0.2, ry + 0.3, cz - 4, 0x8f8f8a); solid(x0 - 0.2, ry, cz + 4, x1 + 0.2, ry + 0.3, z1 + 0.2, 0x8f8f8a);
  solid(x0 - 0.2, ry, cz - 4, x0 + 3, ry + 0.3, cz + 4, 0x8f8f8a); solid(x1 - 3, ry, cz - 4, x1 + 0.2, ry + 0.3, cz + 4, 0x8f8f8a);
  // Oberlicht über dem Gang (Glas, begehbar)
  B('glass').box(x0 + 3, ry + 0.05, cz - 4, x1 - 3, ry + 0.15, cz + 4, 0xbfe3f5); addCollider(x0 + 3, ry, cz - 4, x1 - 3, ry + 0.15, cz + 4, 'glass');
  for (let x = x0 + 3; x <= x1 - 3; x += 2.5) B('metal').box(x - 0.06, ry + 0.05, cz - 4, x + 0.06, ry + 0.25, cz + 4, 0x3a3f46);
  // Brüstung auf dem Dach (Lücke für die Treppe)
  const par = (a0, b0, a1, b1) => solid(a0, ry + 0.3, b0, a1, ry + 1.2, b1, facade, 'solid', 'fence');
  par(x0 - 0.2, z1, x1 + 0.2, z1 + 0.2); par(x0 - 0.2, z0 - 0.2, x0 + 13, z0); par(x0 + 17, z0 - 0.2, x1 + 0.2, z0); par(x0 - 0.2, z0, x0, z1); par(x1, z0, x1 + 0.2, z1);
  // Außentreppe an der Südseite aufs Dach
  const steps = 20, sh = (ry + 0.3 - fy) / steps; for (let s = 0; s < steps; s++) solid(x0 + 13 - 12 + s * 0.6, fy, z0 - 2.2, x0 + 13 - 11.4 + s * 0.6, fy + (s + 1) * sh, z0 - 0.15, 0x9a9a95);
  solid(x0 + 13, fy, z0 - 2.2, x0 + 17, ry + 0.3, z0 - 0.15, 0x9a9a95); B('metal').box(x0 + 1, fy + 1, z0 - 2.25, x0 + 13, fy + 1.06, z0 - 2.15, 0x3a3f46);
  // Leuchtschrift
  textSign('MECKER-MALL', 14, 2.4, '#1f5a74', '#ffd447', cx, ry + 2.6, z1 + 0.33, 0); textSign('MECKER-MALL', 14, 2.4, '#1f5a74', '#ffd447', cx, ry + 2.6, z1 + 0.27, Math.PI); B('metal').box(cx - 7, ry + 1.35, z1 + 0.28, cx + 7, ry + 1.4, z1 + 0.32, 0x3a3f46);
  solid(cx - 6, ry + 0.3, z1 - 0.3, cx - 5.7, ry + 1.4, z1, 0x3a3f46); solid(cx + 5.7, ry + 0.3, z1 - 0.3, cx + 6, ry + 1.4, z1, 0x3a3f46);
  textSign('MALL', 4, 1.0, '#1f5a74', '#ffffff', x0 - 0.3, fy + 4.4, cz, -Math.PI / 2); textSign('MALL', 4, 1.0, '#1f5a74', '#ffffff', x1 + 0.3, fy + 4.4, cz, Math.PI / 2);
  // Innen: Boden, Decke, Gang
  B('tile').box(x0 + 0.15, fy, z0 + 0.15, x1 - 0.15, fy + 0.012, z1 - 0.15, 0xe8e4dc); B('furn').box(x0 + 0.15, ry - 0.02, z0 + 0.15, x1 - 0.15, ry, cz - 4, 0xf2efe8); B('furn').box(x0 + 0.15, ry - 0.02, cz + 4, x1 - 0.15, ry, z1 - 0.15, 0xf2efe8);
  // Läden links/rechts des Gangs
  const n = 3, uw = (WD - 0.3) / n; const types = shuffle(['shop', 'cafe', 'clothes', 'shop', 'clothes', 'cafe']); let ti = 0;
  for (const side of [-1, 1]) {
    const fz = cz + side * 4, bz = side < 0 ? z0 : z1;
    for (let i = 0; i < n; i++) {
      const ux0 = x0 + 0.15 + i * uw, ux1 = ux0 + uw; const gm = (ux0 + ux1) / 2;
      if (i > 0) solid(ux0 - 0.15, fy, Math.min(fz, bz), ux0 + 0.15, ry, Math.max(fz, bz), 0xf0ebe0);
      storefront(ux0 + 0.15, ux1 - 0.15, fz, fy, H, gm - 2, gm + 2, pick([0x2f6f8f, 0x8f2f3f, 0x3f6f3f, 0x6f4f8f, 0x8f6f2f]));
      const R = { x0: ux0 + 0.2, x1: ux1 - 0.2, z0: Math.min(fz, bz) + 0.2, z1: Math.max(fz, bz) - 0.2, used: [[gm - 2.2, side < 0 ? fz - 2.2 : fz, gm + 2.2, side < 0 ? fz : fz + 2.2]], tall: [], walls: ['n', 's', 'w', 'e'], doorSide: side < 0 ? 's' : 'n' };
      furnishRoom(R, types[ti++ % types.length], fy);
      textSign(pick(['ZIEGEN-SPORT', 'FISCH & CHIPS', 'BLUBB-MODE', 'MECKER-MARKT', 'HORN-TECH', 'KIEMEN-CAFÉ', 'GOAT-STYLE', 'FLOSSEN-SHOP']), 5, 0.8, '#222831', '#ffffff', gm, fy + H - 0.9, fz + side * -0.17, side < 0 ? 0 : Math.PI);
    }
  }
  // Gang-Ausstattung: Brunnen, Bänke, Pflanzen
  B('solid').cyl(cx, fy, cz, 2.2, 0.6, 0xbcb6a8, 20); B('glass').cyl(cx, fy + 0.35, cz, 1.95, 0.3, 0x4aa3c8, 20); B('solid').cyl(cx, fy, cz, 0.35, 1.8, 0xbcb6a8, 10); B('glass').cyl(cx, fy + 1.8, cz, 0.6, 0.12, 0x6fc3e8, 12); addCollider(cx - 2.2, fy, cz - 2.2, cx + 2.2, fy + 0.6, cz + 2.2, 'furn');
  for (const dx of [-14, -7, 7, 14]) { bench(cx + dx, cz - 2.6, true); bench(cx + dx, cz + 2.6, true); }
  for (const dx of [-18, -10.5, 10.5, 18]) planter(cx + dx, cz);
  W.chests.push({ x: cx + 3.5, y: fy, z: cz, rot: -Math.PI / 2 }, { x: x1 - 6, y: ry + 0.3, z: z1 - 4, rot: Math.PI });
  addLoot(cx - 4, fy, cz + 1.5, 15); addLoot(cx + 8, fy, cz - 1.5, 15); addLoot(x0 + 8, ry + 0.3, z1 - 4, 20); addLoot(cx, ry + 0.3, z0 + 5, 10);
  // Parkplatz westlich
  for (let k = 0; k < 7; k++) { const pz = cz - 15 + k * 5; B('road').box(x0 - 18, heightAt(x0 - 12, pz) + 0.03, pz - 0.06, x0 - 6, heightAt(x0 - 12, pz) + 0.045, pz + 0.06, 0xf2f2f2); if (Math.random() < 0.55 && k < 6) car(x0 - 11, pz + 2.5, true, pick([0xc0392b, 0x2980b9, 0xecf0f1, 0x2c3e50, 0xf1c40f, 0x7f8c8d])); }
  for (let k = 0; k < 4; k++) { const x = x0 - 3, z = cz - 12 + k * 8; trafficSign(x, z, k % 2 ? 'stop' : 'speed'); }
}

// ---------------- Straßen-Requisiten ----------------
function trafficSign(x, z, kind) {
  const y = heightAt(x, z); B('metal').cyl(x, y, z, 0.05, 2.4, 0x8a8f96, 8); addCollider(x - 0.06, y, z - 0.06, x + 0.06, y + 2.4, z + 0.06, 'prop');
  if (kind === 'stop') { B('furn').cyl(x, y + 2.15, z, 0.38, 0.04, 0xc0392b, 8); B('furn').cyl(x, y + 2.12, z, 0.34, 0.1, 0xffffff, 8); }
  else if (kind === 'speed') { B('furn').cyl(x, y + 2.15, z, 0.36, 0.04, 0xd6342c, 20); B('furn').cyl(x, y + 2.12, z, 0.3, 0.1, 0xffffff, 20); }
  else { // Warnschild (Dreieck als Box-Stapel)
    for (let i = 0; i < 4; i++) B('furn').box(x - 0.36 + i * 0.09, y + 1.9 + i * 0.15, z - 0.03, x + 0.36 - i * 0.09, y + 2.05 + i * 0.15, z + 0.03, 0xd6342c);
    B('furn').box(x - 0.24, y + 1.97, z - 0.04, x + 0.24, y + 2.2, z + 0.04, 0xffffff);
  }
}
function mailbox(x, z) { const y = heightAt(x, z); B('metal').box(x - 0.04, y, z - 0.04, x + 0.04, y + 1.0, z + 0.04, 0x3a3f46); B('metal').box(x - 0.22, y + 1.0, z - 0.15, x + 0.22, y + 1.35, z + 0.15, pick([0xf1c40f, 0x2e6fb0, 0xc0392b])); B('furn').box(x - 0.15, y + 1.24, z + 0.151, x + 0.15, y + 1.27, z + 0.16, 0x222222); addCollider(x - 0.22, y, z - 0.15, x + 0.22, y + 1.35, z + 0.15, 'prop'); }
function pallets(x, z) { const y0 = heightAt(x, z); const n = randi(1, 4); for (let i = 0; i < n; i++) { const y = y0 + i * 0.15; for (let k = 0; k < 3; k++) B('wood').box(x - 0.6, y, z - 0.5 + k * 0.42, x + 0.6, y + 0.1, z - 0.42 + k * 0.42, 0xb08a5f); B('wood').box(x - 0.6, y + 0.1, z - 0.5, x + 0.6, y + 0.15, z + 0.5, 0xc49a6c); }
  addCollider(x - 0.6, y0, z - 0.5, x + 0.6, y0 + n * 0.15, z + 0.5, 'prop'); if (Math.random() < 0.4) solid(x - 0.45, y0 + n * 0.15, z - 0.4, x + 0.35, y0 + n * 0.15 + 0.8, z + 0.4, 0xffffff, 'wood'); }
function scatterStreetProps() {
  const free = (x, z, r) => { boxesNear(x, z, r, _near); return !_near.some(b => x > b.x0 - r && x < b.x1 + r && z > b.z0 - r && z < b.z1 + r); };
  // Schilder entlang der Straßen
  for (const s of W.roadSegs || []) { const L = Math.hypot(s.bx - s.ax, s.bz - s.az); if (L < 30) continue; const nx = -(s.bz - s.az) / L, nz = (s.bx - s.ax) / L; for (let t = 0.25; t < 1; t += 0.5) { const side = Math.random() < 0.5 ? 1 : -1; const x = s.ax + (s.bx - s.ax) * t + nx * side * 6.2, z = s.az + (s.bz - s.az) * t + nz * side * 6.2; if (free(x, z, 1.0)) trafficSign(x, z, pick(['speed', 'stop', 'warn'])); } }
  // Briefkästen in Dörfern/Stadt, Paletten im Industriegebiet
  for (const h of W.houses) { if (h.kind !== 'house' || Math.random() < 0.4) continue; const d = h.doorSide; const cx = (h.x0 + h.x1) / 2, cz = (h.z0 + h.z1) / 2; const x = d === 'w' ? h.x0 - 3 : d === 'e' ? h.x1 + 3 : cx + 3.2, z = d === 'n' ? h.z0 - 3 : d === 's' ? h.z1 + 3 : cz + 3.2; if (free(x, z, 0.8)) mailbox(x, z); }
  for (const [cx, cz, r, n] of [[250, 90, 70, 26], [300, 270, 45, 14], [-330, -70, 55, 8]]) for (let k = 0; k < n; k++) { const x = cx + rand(-r, r), z = cz + rand(-r, r); if (free(x, z, 1.4)) pallets(x, z); }
}
