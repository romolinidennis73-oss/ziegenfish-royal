// ============ Innenausbau: Räume, Möbel, Loot-Verstecke ============
const FUR = {
  fabric: [0x5b6f8a, 0x8a4f4f, 0x5d7a55, 0x7d6a8f, 0x9a8460, 0x3f5b66, 0xb07a4a],
  wood: [0x8a6240, 0x6e4a30, 0xb08a5f, 0x5a3c28], white: 0xf1eee8, cab: [0xf1eee8, 0x9fb7a8, 0x8aa0b8, 0xd8c7a8, 0x50555c],
  wallIn: [0xf0ebe0, 0xe8e4da, 0xeee6d6, 0xe3e8ea]
};
// Lokaler Rahmen an einer Wand: u entlang der Wand, v von der Wand in den Raum
function wallFrame(R, side, t) {
  if (side === 'n') return (u, v) => [R.x0 + t + u, R.z0 + v];
  if (side === 's') return (u, v) => [R.x0 + t + u, R.z1 - v];
  if (side === 'w') return (u, v) => [R.x0 + v, R.z0 + t + u];
  return (u, v) => [R.x1 - v, R.z0 + t + u];
}
const centerFrame = (cx, cz) => (u, v) => [cx + u, cz + v];
function fbox(F, u0, v0, y0, u1, v1, y1, col, batch = 'furn', coll) {
  const [ax, az] = F(u0, v0), [bx, bz] = F(u1, v1); const x0 = Math.min(ax, bx), x1 = Math.max(ax, bx), z0 = Math.min(az, bz), z1 = Math.max(az, bz);
  B(batch).box(x0, y0, z0, x1, y1, z1, col); if (coll) addCollider(x0, y0, z0, x1, y1, z1, 'furn');
}
function fpt(F, u, v) { return F(u, v); }
function overlaps(a, b) { return a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1]; }
function rectOf(F, w, d) { const [ax, az] = F(0, 0), [bx, bz] = F(w, d); return [Math.min(ax, bx), Math.min(az, bz), Math.max(ax, bx), Math.max(az, bz)]; }
function roomFits(R, r, tall) {
  if (r[0] < R.x0 - 0.01 || r[2] > R.x1 + 0.01 || r[1] < R.z0 - 0.01 || r[3] > R.z1 + 0.01) return false;
  for (const u of R.used) if (overlaps(r, u)) return false;
  if (tall) for (const u of R.tall) if (overlaps(r, u)) return false;
  return true;
}
// Platz an einer Wand suchen. Gibt Rahmen zurück (Ursprung = linke Ecke an der Wand) oder null
function placeAtWall(R, w, d, opts = {}) {
  const sides = opts.sides || shuffle(R.walls.slice());
  for (const side of sides) {
    if (!R.walls.includes(side)) continue;
    const L = side === 'n' || side === 's' ? R.x1 - R.x0 : R.z1 - R.z0; if (L < w + 0.1) continue;
    const ts = opts.mid ? [(L - w) / 2, 0.05, L - w - 0.05, rand(0, L - w)] : [0.05, L - w - 0.05, (L - w) / 2, rand(0, L - w), rand(0, L - w)];
    for (const t of ts) {
      const F = wallFrame(R, side, t); const r = rectOf(F, w, d);
      if (!roomFits(R, r, opts.tall)) continue;
      const front = rectOf(F, w, d + (opts.front != null ? opts.front : 0.55));
      R.used.push(r); if (front !== r) R.used.push(front); R.blocked = (R.blocked || 0) + 1;
      return { F, side, t, r };
    }
  }
  return null;
}
function placeFree(R, w, d, pad = 0.7) {
  const cx = (R.x0 + R.x1) / 2, cz = (R.z0 + R.z1) / 2;
  for (const [ox, oz] of [[0, 0], [0.6, 0], [-0.6, 0], [0, 0.7], [0, -0.7], [rand(-1, 1), rand(-1, 1)]]) {
    const x = cx + ox, z = cz + oz; const r = [x - w / 2 - pad, z - d / 2 - pad, x + w / 2 + pad, z + d / 2 + pad];
    if (!roomFits(R, r)) continue; R.used.push(r); return { x, z, F: centerFrame(x, z) };
  }
  return null;
}
function addLoot(x, y, z, q) { W.lootSpots.push({ x, y, z, q: q || 0 }); }

// ---------------- Möbelstücke (lokale Koordinaten, y = Boden) ----------------
function sofa(F, y, w) {
  const c = pick(FUR.fabric), dk = new THREE.Color(c).multiplyScalar(0.8);
  fbox(F, 0, 0, y, w, 0.9, y + 0.42, dk, 'furn', true); fbox(F, 0.2, 0, y + 0.42, w - 0.2, 0.25, y + 0.92, dk, 'furn', true);
  fbox(F, 0, 0, y + 0.42, 0.2, 0.9, y + 0.66, dk); fbox(F, w - 0.2, 0, y + 0.42, w, 0.9, y + 0.66, dk);
  const n = w > 2 ? 3 : 2; for (let i = 0; i < n; i++) { const a = 0.22 + i * (w - 0.44) / n; fbox(F, a + 0.02, 0.25, y + 0.42, a + (w - 0.44) / n - 0.02, 0.86, y + 0.55, c); fbox(F, a + 0.04, 0.12, y + 0.55, a + (w - 0.44) / n - 0.04, 0.3, y + 0.86, c); }
  if (Math.random() < 0.6) { const [px, pz] = F(0.45, 0.35); B('furn').ell(px, y + 0.68, pz, 0.18, 0.16, 0.18, pick([0xf2c14e, 0xe8e2d6, 0x6fa3c8])); }
}
function coffeeTable(F, y) { const wd = pick(FUR.wood); fbox(F, -0.6, -0.32, y + 0.36, 0.6, 0.32, y + 0.42, wd, 'wood', true); for (const [u, v] of [[-0.55, -0.27], [0.5, -0.27], [-0.55, 0.22], [0.5, 0.22]]) fbox(F, u, v, y, u + 0.05, v + 0.05, y + 0.36, wd, 'wood'); fbox(F, -0.5, -0.27, y + 0.12, 0.5, 0.27, y + 0.15, wd, 'wood'); }
function rug(F, w, d, y) { const c = pick([0x8c3b3b, 0x3b5b8c, 0x7a6a4f, 0x4f7a6a, 0x5e4a7a]); fbox(F, -w / 2, -d / 2, y, w / 2, d / 2, y + 0.015, c); fbox(F, -w / 2 + 0.15, -d / 2 + 0.15, y + 0.015, w / 2 - 0.15, d / 2 - 0.15, y + 0.02, new THREE.Color(c).lerp(new THREE.Color(0xe8dcc0), 0.35)); }
function tvStand(F, y) {
  fbox(F, 0, 0, y, 1.7, 0.45, y + 0.5, pick(FUR.wood), 'wood', true); fbox(F, 0.05, 0.44, y + 0.08, 0.83, 0.46, y + 0.45, 0x3a2a1e, 'wood'); fbox(F, 0.87, 0.44, y + 0.08, 1.65, 0.46, y + 0.45, 0x3a2a1e, 'wood');
  fbox(F, 0.75, 0.15, y + 0.5, 0.95, 0.3, y + 0.56, 0x1a1a1a); fbox(F, 0.83, 0.2, y + 0.56, 0.87, 0.24, y + 0.7, 0x1a1a1a);
  fbox(F, 0.2, 0.17, y + 0.68, 1.5, 0.23, y + 1.42, 0x111316, 'furn', true); fbox(F, 0.24, 0.235, y + 0.72, 1.46, 0.245, y + 1.38, pick([0x1d3550, 0x23405a, 0x2a2f45]), 'glass');
}
function bookshelf(F, y) {
  const wd = pick(FUR.wood); fbox(F, 0, 0, y, 1.0, 0.35, y + 1.95, wd, 'wood', true);
  for (let s = 0; s < 4; s++) { const sy = y + 0.12 + s * 0.46; fbox(F, 0.05, 0.351, sy, 0.95, 0.36, sy + 0.04, new THREE.Color(wd).multiplyScalar(0.7), 'wood'); let u = 0.07; while (u < 0.88) { const bw = rand(0.04, 0.09), bh = rand(0.24, 0.38); fbox(F, u, 0.36, sy + 0.04, u + bw, 0.37, sy + 0.04 + bh, pick([0xa83232, 0x2f5f8f, 0x3f7f4f, 0xd8b440, 0x6b4a8a, 0xe0e0d8, 0x222222])); u += bw + 0.01; if (Math.random() < 0.12) u += 0.15; } }
}
function plant(x, z, y) { B('furn').cyl(x, y, z, 0.2, 0.42, pick([0xb5653c, 0xe8e2d6, 0x4a4a4a]), 10); const g = pick([0x3f7f3a, 0x4f8f42, 0x2f6f3a]); B('furn').ell(x, y + 0.75, z, 0.32, 0.42, 0.32, g, 8, 6); B('furn').ell(x + 0.12, y + 1.0, z - 0.05, 0.22, 0.28, 0.22, new THREE.Color(g).multiplyScalar(1.2), 8, 6); addCollider(x - 0.2, y, z - 0.2, x + 0.2, y + 0.5, z + 0.2, 'furn'); }
function floorLamp(x, z, y) { B('metal').cyl(x, y, z, 0.16, 0.04, 0x2a2a2a, 10); B('metal').cyl(x, y, z, 0.025, 1.55, 0x2a2a2a, 6); B('glass').cyl(x, y + 1.4, z, 0.2, 0.3, 0xfff0c8, 12); }
function kitchenRow(F, y, L) {
  const cab = pick(FUR.cab), top = pick([0x2f2f33, 0xd8d2c4, 0x5a4a3a]);
  fbox(F, 0, 0.05, y, L, 0.6, y + 0.1, 0x222222); fbox(F, 0, 0, y + 0.1, L, 0.58, y + 0.88, cab, 'furn', true); fbox(F, 0, 0, y + 0.88, L, 0.63, y + 0.93, top, 'furn', true);
  const n = Math.round(L / 0.6); for (let i = 0; i < n; i++) { const a = i * L / n; fbox(F, a + 0.02, 0.58, y + 0.14, a + L / n - 0.02, 0.6, y + 0.84, new THREE.Color(cab).multiplyScalar(0.94)); fbox(F, a + L / n / 2 - 0.12, 0.6, y + 0.76, a + L / n / 2 + 0.12, 0.62, y + 0.79, 0x9a9a9a, 'metal'); }
  // Herd
  const s0 = L * 0.62; fbox(F, s0, 0.06, y + 0.93, s0 + 0.6, 0.6, y + 0.94, 0x111111); for (const [u, v] of [[0.15, 0.17], [0.45, 0.17], [0.15, 0.45], [0.45, 0.45]]) { const [px, pz] = F(s0 + u, v); B('metal').cyl(px, y + 0.94, pz, 0.09, 0.008, 0x3a3a3a, 10); }
  fbox(F, s0 + 0.02, 0.59, y + 0.2, s0 + 0.58, 0.61, y + 0.7, 0x1a1a1a, 'glass');
  // Spüle
  const k0 = L * 0.18; fbox(F, k0, 0.1, y + 0.93, k0 + 0.55, 0.5, y + 0.935, 0xb8bcc0, 'metal'); fbox(F, k0 + 0.25, 0.04, y + 0.93, k0 + 0.3, 0.1, y + 1.2, 0xb8bcc0, 'metal'); fbox(F, k0 + 0.25, 0.04, y + 1.15, k0 + 0.3, 0.25, y + 1.2, 0xb8bcc0, 'metal');
  // Oberschränke + Dunstabzug
  fbox(F, 0, 0, y + 1.5, L, 0.35, y + 2.2, cab, 'furn'); for (let i = 0; i < n; i++) { const a = i * L / n; fbox(F, a + 0.02, 0.35, y + 1.52, a + L / n - 0.02, 0.36, y + 2.18, new THREE.Color(cab).multiplyScalar(0.94)); }
  // Kleinkram
  const [mx, mz] = F(L * 0.08 + 0.1, 0.3); B('furn').cyl(mx, y + 0.93, mz, 0.08, 0.18, pick([0xc0392b, 0xf1eee8, 0x2f6f9f]), 10);
  return F(L * 0.45, 0.32);
}
function fridge(F, y) { fbox(F, 0, 0, y, 0.75, 0.7, y + 1.95, 0xe6e8ea, 'metal', true); fbox(F, 0.02, 0.7, y + 1.2, 0.73, 0.72, y + 1.22, 0xb8bcc0, 'metal'); fbox(F, 0.62, 0.72, y + 0.5, 0.65, 0.76, y + 1.1, 0x888888, 'metal'); fbox(F, 0.62, 0.72, y + 1.3, 0.65, 0.76, y + 1.8, 0x888888, 'metal'); }
function diningSet(P, y) {
  const F = P.F, wd = pick(FUR.wood); fbox(F, -0.8, -0.45, y + 0.72, 0.8, 0.45, y + 0.78, wd, 'wood', true); for (const [u, v] of [[-0.75, -0.4], [0.7, -0.4], [-0.75, 0.35], [0.7, 0.35]]) fbox(F, u, v, y, u + 0.06, v + 0.06, y + 0.72, wd, 'wood');
  addCollider(P.x - 0.8, y, P.z - 0.45, P.x + 0.8, y + 0.72, P.z + 0.45, 'furn');
  for (const [u, s] of [[-0.42, -1], [0.42, -1], [-0.42, 1], [0.42, 1]]) { const v0 = s * 0.62; fbox(F, u - 0.2, v0 - 0.2, y + 0.42, u + 0.2, v0 + 0.2, y + 0.46, wd, 'wood', true); fbox(F, u - 0.2, v0 + s * 0.17, y + 0.46, u + 0.2, v0 + s * 0.21, y + 0.95, wd, 'wood'); for (const [a, b] of [[-0.18, -0.18], [0.15, -0.18], [-0.18, 0.15], [0.15, 0.15]]) fbox(F, u + a, v0 + b, y, u + a + 0.03, v0 + b + 0.03, y + 0.42, wd, 'wood'); }
  const [bx, bz] = F(0.35, 0.1); B('furn').cyl(bx, y + 0.78, bz, 0.16, 0.05, 0xe8e2d6, 12); B('furn').ell(bx, y + 0.86, bz, 0.07, 0.06, 0.07, 0xd84a3a, 6, 4); B('furn').ell(bx + 0.08, y + 0.85, bz + 0.03, 0.06, 0.05, 0.06, 0x8ac04a, 6, 4);
  return [P.x - 0.3, y + 0.78, P.z];
}
function bed(F, y, w) {
  const wd = pick(FUR.wood), bl = pick(FUR.fabric);
  fbox(F, 0, 0, y, w, 0.08, y + 1.05, wd, 'wood', true); fbox(F, 0, 0.08, y, w, 2.1, y + 0.35, wd, 'wood', true); fbox(F, 0.04, 0.1, y + 0.35, w - 0.04, 2.06, y + 0.55, FUR.white, 'furn', true);
  fbox(F, 0.02, 0.75, y + 0.55, w - 0.02, 2.08, y + 0.62, bl); fbox(F, 0.0, 0.75, y + 0.3, 0.02, 2.08, y + 0.6, bl); fbox(F, w - 0.02, 0.75, y + 0.3, w, 2.08, y + 0.6, bl);
  const np = w > 1.2 ? 2 : 1; for (let i = 0; i < np; i++) { const [px, pz] = F((i + 0.5) * w / np, 0.38); B('furn').ell(px, y + 0.63, pz, w / np * 0.36, 0.09, 0.2, 0xf6f4ee, 10, 6); }
}
function nightstand(F, y) { const wd = pick(FUR.wood); fbox(F, 0, 0, y, 0.5, 0.42, y + 0.55, wd, 'wood', true); fbox(F, 0.04, 0.42, y + 0.3, 0.46, 0.43, y + 0.5, new THREE.Color(wd).multiplyScalar(0.8), 'wood'); const [lx, lz] = F(0.25, 0.2); B('metal').cyl(lx, y + 0.55, lz, 0.06, 0.25, 0x333333, 8); B('glass').cyl(lx, y + 0.75, lz, 0.13, 0.18, 0xfff0c8, 10); }
function wardrobe(F, y, w) { const wd = pick(FUR.wood.concat(FUR.cab)); fbox(F, 0, 0, y, w, 0.6, y + 2.1, wd, 'wood', true); fbox(F, w / 2 - 0.01, 0.6, y + 0.05, w / 2 + 0.01, 0.61, y + 2.05, 0x2a2a2a); fbox(F, w / 2 - 0.12, 0.61, y + 0.95, w / 2 - 0.09, 0.65, y + 1.3, 0xb8bcc0, 'metal'); fbox(F, w / 2 + 0.09, 0.61, y + 0.95, w / 2 + 0.12, 0.65, y + 1.3, 0xb8bcc0, 'metal'); }
function desk(F, y) {
  const wd = pick(FUR.wood); fbox(F, 0, 0, y + 0.72, 1.3, 0.65, y + 0.77, wd, 'wood', true); fbox(F, 0, 0, y, 0.05, 0.65, y + 0.72, wd, 'wood', true); fbox(F, 1.25, 0, y, 1.3, 0.65, y + 0.72, wd, 'wood', true);
  fbox(F, 0.45, 0.1, y + 0.77, 0.85, 0.13, y + 1.05, 0x1a1a1a); fbox(F, 0.47, 0.131, y + 0.79, 0.83, 0.135, y + 1.03, 0x2a5a8a, 'glass'); fbox(F, 0.4, 0.3, y + 0.77, 0.9, 0.45, y + 0.79, 0x2a2a2a);
  fbox(F, 0.45, 0.85, y + 0.45, 0.85, 1.25, y + 0.5, 0x2a2a2a, 'furn', true); fbox(F, 0.45, 1.2, y + 0.5, 0.85, 1.25, y + 1.0, 0x2a2a2a); const [cx, cz] = F(0.65, 1.05); B('metal').cyl(cx, y, cz, 0.04, 0.45, 0x555555, 6);
  return F(1.05, 0.35);
}
function bathtub(F, y) { fbox(F, 0, 0, y, 1.7, 0.78, y + 0.56, FUR.white, 'furn', true); fbox(F, 0.1, 0.1, y + 0.56, 1.6, 0.68, y + 0.565, 0x8ec8e0, 'glass'); fbox(F, 0.0, 0.0, y + 0.56, 1.7, 0.08, y + 0.6, FUR.white); fbox(F, 1.5, 0.02, y + 0.6, 1.55, 0.06, y + 1.5, 0xb8bcc0, 'metal'); return F(0.85, 0.39); }
function toilet(F, y) { fbox(F, 0.05, 0, y + 0.3, 0.45, 0.18, y + 0.85, FUR.white, 'furn', true); const [tx, tz] = F(0.25, 0.42); B('furn').cyl(tx, y, tz, 0.16, 0.38, FUR.white, 12); B('furn').cyl(tx, y + 0.38, tz, 0.2, 0.04, FUR.white, 12); addCollider(tx - 0.2, y, tz - 0.2, tx + 0.2, y + 0.42, tz + 0.2, 'furn'); }
function sinkUnit(F, y) { fbox(F, 0, 0, y, 0.8, 0.45, y + 0.8, pick(FUR.cab), 'furn', true); fbox(F, 0.1, 0.05, y + 0.8, 0.7, 0.42, y + 0.86, FUR.white); fbox(F, 0.1, 0.0, y + 1.15, 0.7, 0.03, y + 1.85, 0xcfe6f2, 'glass'); }
function shelfUnit(F, y, L) {
  fbox(F, 0, 0, y, L, 0.9, y + 0.12, 0x5a5f66, 'metal', true); fbox(F, 0, 0.4, y + 0.12, L, 0.5, y + 1.65, 0xd8dadc, 'metal', true);
  for (let s = 0; s < 3; s++) { const sy = y + 0.12 + s * 0.5; fbox(F, 0, 0, sy, L, 0.9, sy + 0.04, 0xc8cacc, 'metal', true); for (const vs of [0, 1]) { let u = 0.05; while (u < L - 0.1) { const bw = rand(0.18, 0.32), bh = rand(0.18, 0.36); const v0 = vs ? 0.52 : 0.08; fbox(F, u, v0, sy + 0.04, u + bw, v0 + 0.3, sy + 0.04 + bh, pick([0xd84a3a, 0xf2c14e, 0x3a8ad8, 0x4ab06a, 0xf28a3a, 0xe8e2d6, 0x8a4ad8, 0x2fb0b0])); u += bw + 0.03; } } }
}
function cooler(F, y, L) { fbox(F, 0, 0, y, L, 0.75, y + 2.0, 0xe6e8ea, 'metal', true); const n = Math.max(1, Math.round(L / 0.9)); for (let i = 0; i < n; i++) { const a = i * L / n; fbox(F, a + 0.05, 0.75, y + 0.15, a + L / n - 0.05, 0.77, y + 1.85, 0xbfe3f0, 'glass'); for (let s = 0; s < 4; s++) fbox(F, a + 0.1, 0.5, y + 0.3 + s * 0.42, a + L / n - 0.1, 0.72, y + 0.5 + s * 0.42, pick([0xd84a3a, 0x3a8ad8, 0x4ab06a, 0xf2c14e])); } }
function counter(F, y, L) { fbox(F, 0, 0, y, L, 0.7, y + 1.0, 0x6a4a35, 'wood', true); fbox(F, -0.05, -0.05, y + 1.0, L + 0.05, 0.75, y + 1.05, 0x2f2f33, 'furn', true); fbox(F, L - 0.6, 0.15, y + 1.05, L - 0.2, 0.5, y + 1.2, 0x2a2a2a); fbox(F, L - 0.55, 0.2, y + 1.2, L - 0.25, 0.24, y + 1.45, 0x2a5a8a, 'glass'); return F(L * 0.35, 0.35); }
function bunk(F, y) {
  const m = 0x4f5a3a; for (const [u, v] of [[0, 0], [0.9, 0], [0, 2.0], [0.9, 2.0]]) fbox(F, u, v, y, u + 0.06, v + 0.06, y + 1.8, 0x3a3f33, 'metal');
  for (const h of [0.35, 1.3]) { fbox(F, 0, 0, y + h, 0.96, 2.06, y + h + 0.06, 0x3a3f33, 'metal', h < 1); fbox(F, 0.04, 0.04, y + h + 0.06, 0.92, 2.02, y + h + 0.2, m, 'furn', h < 1); fbox(F, 0.1, 0.1, y + h + 0.2, 0.86, 0.45, y + h + 0.28, 0xe8e2d6); }
  addCollider(...rectToBox(rectOf(F, 0.96, 2.06), y, y + 1.8));
}
function rectToBox(r, y0, y1) { return [r[0], y0, r[1], r[2], y1, r[3], 'furn']; }
function locker(F, y, n) { for (let i = 0; i < n; i++) { fbox(F, i * 0.5, 0, y, i * 0.5 + 0.48, 0.5, y + 1.9, 0x5f6b55, 'metal', true); fbox(F, i * 0.5 + 0.1, 0.5, y + 1.6, i * 0.5 + 0.38, 0.51, y + 1.7, 0x2a2a2a); fbox(F, i * 0.5 + 0.38, 0.5, y + 0.9, i * 0.5 + 0.41, 0.53, y + 1.1, 0x9a9a9a, 'metal'); } }
function stove(F, y) { fbox(F, 0, 0, y, 0.7, 0.6, y + 0.8, 0x2a2a2a, 'metal', true); const [px, pz] = F(0.35, 0.3); B('metal').cyl(px, y + 0.8, pz, 0.07, 1.6, 0x2a2a2a, 8); fbox(F, 0.15, 0.6, y + 0.2, 0.55, 0.61, y + 0.5, 0xd8642a, 'glass'); }
function barrel(x, z, y) { B('wood').cyl(x, y, z, 0.35, 0.9, 0x7a5636, 12); B('metal').cyl(x, y + 0.15, z, 0.36, 0.05, 0x3a3a3a, 12); B('metal').cyl(x, y + 0.7, z, 0.36, 0.05, 0x3a3a3a, 12); addCollider(x - 0.35, y, z - 0.35, x + 0.35, y + 0.9, z + 0.35, 'furn'); }
// Bodenluke = Geheimversteck mit besserem Loot
function hatch(R, y) {
  const P = placeAtWall(R, 0.9, 0.9, { front: 0.2 }); if (!P) return;
  fbox(P.F, 0.05, 0.05, y, 0.85, 0.85, y + 0.025, 0x3a2a1e, 'wood'); fbox(P.F, 0.1, 0.1, y + 0.025, 0.8, 0.8, y + 0.03, 0x1a120c);
  fbox(P.F, 0.1, 0.8, y, 0.8, 0.86, y + 0.7, 0x6e4a30, 'wood'); // aufgeklappter Deckel
  const [x, z] = P.F(0.45, 0.45); addLoot(x, y + 0.03, z, 40);
}

// ---------------- Raumtypen ----------------
function furnishRoom(R, type, y) {
  const F0 = (R.x0 + R.x1) / 2, F1 = (R.z0 + R.z1) / 2, sm = Math.min(R.x1 - R.x0, R.z1 - R.z0);
  // Boden
  const flo = type === 'kitchen' || type === 'bath' ? 'tile' : type === 'shop' ? 'tile' : type === 'barracks' || type === 'cabin' ? 'wood' : 'wood';
  const fcol = flo === 'tile' ? pick([0xe8e4dc, 0xd8dde0, 0xcfc6b4]) : pick([0xc49a6c, 0xa77b4c, 0xd2b48c, 0x8f6a48]);
  B(flo).box(R.x0, y, R.z0, R.x1, y + 0.012, R.z1, fcol);
  let tableTop = null;
  if (type === 'living' || type === 'combo') {
    const sw = sm > 3.4 ? 2.3 : 1.8; const P = placeAtWall(R, sw, 0.9, { front: 1.6, mid: true });
    if (P) { sofa(P.F, y, sw); const [tx, tz] = P.F(sw / 2, 1.55); const T = centerFrame(tx, tz); rug(T, sw + 0.6, 1.6, y); coffeeTable(T, y); if (Math.random() < 0.5) tableTop = [tx, y + 0.42, tz];
      const opp = { n: 's', s: 'n', w: 'e', e: 'w' }[P.side]; const tv = placeAtWall(R, 1.7, 0.45, { sides: [opp], mid: true, front: 0.4 }); if (tv) tvStand(tv.F, y); }
    const bs = placeAtWall(R, 1.0, 0.35, { tall: true, front: 0.5 }); if (bs) bookshelf(bs.F, y);
    const pl = placeAtWall(R, 0.5, 0.5, { front: 0.1 }); if (pl) { const [x, z] = pl.F(0.25, 0.25); Math.random() < 0.5 ? plant(x, z, y) : floorLamp(x, z, y); }
  }
  if (type === 'kitchen' || type === 'combo') {
    const L = clamp(Math.floor((type === 'combo' ? sm * 0.55 : sm - 1.2) / 0.6) * 0.6, 1.8, 3.6); const K = placeAtWall(R, L, 0.63, { tall: true, front: 0.9 });
    if (K) { const [lx, lz] = kitchenRow(K.F, y, L); addLoot(lx, y + 0.93, lz); const fr = placeAtWall(R, 0.75, 0.7, { sides: [K.side], tall: true, front: 0.6 }); if (fr) fridge(fr.F, y); }
    if (type === 'kitchen') { const D = placeFree(R, 1.7, 1.9, 0.45); if (D) tableTop = diningSet(D, y); }
  }
  if (type === 'bedroom' || type === 'kids') {
    const bw = type === 'kids' ? 1.0 : 1.6; const P = placeAtWall(R, bw, 2.1, { front: 0.6, mid: type !== 'kids' });
    if (P) { bed(P.F, y, bw); if (Math.random() < 0.4) { const [x, z] = P.F(bw / 2, 1.4); addLoot(x, y + 0.62, z, 10); }
      const ns = placeAtWall(R, 0.5, 0.42, { sides: [P.side], front: 0.3 }); if (ns) { nightstand(ns.F, y); if (Math.random() < 0.35) { const [x, z] = ns.F(0.25, 0.21); addLoot(x, y + 0.55, z); } } }
    const wr = placeAtWall(R, 1.4, 0.6, { tall: true, front: 0.7 }); if (wr) wardrobe(wr.F, y, 1.4);
    if (type === 'kids' || Math.random() < 0.5) { const D = placeAtWall(R, 1.3, 1.3, { front: 0.3 }); if (D) { const t = desk(D.F, y); tableTop = [t[0], y + 0.77, t[1]]; } }
    const pl = placeAtWall(R, 0.5, 0.5, { front: 0.1 }); if (pl) { const [x, z] = pl.F(0.25, 0.25); plant(x, z, y); }
  }
  if (type === 'bath') {
    const T = placeAtWall(R, 1.7, 0.78, { front: 0.5 }); if (T) { const [x, z] = bathtub(T.F, y); if (Math.random() < 0.6) addLoot(x, y + 0.57, z, 20); }
    const W2 = placeAtWall(R, 0.5, 0.65, { front: 0.4 }); if (W2) toilet(W2.F, y);
    const S = placeAtWall(R, 0.8, 0.45, { tall: true, front: 0.5 }); if (S) sinkUnit(S.F, y);
    const pl = placeAtWall(R, 0.5, 0.5, { front: 0.1 }); if (pl) { const [x, z] = pl.F(0.25, 0.25); plant(x, z, y); }
  }
  if (type === 'shop') {
    const C = placeAtWall(R, 2.6, 0.75, { sides: R.doorSide ? [R.doorSide] : null, front: 1.0 }); if (C) { const [x, z] = counter(C.F, y, 2.6); addLoot(x, y + 1.05, z); }
    const opp = { n: 's', s: 'n', w: 'e', e: 'w' }[R.doorSide] || 'n'; const L = Math.min(5.4, (opp === 'n' || opp === 's' ? R.x1 - R.x0 : R.z1 - R.z0) - 1.6);
    const K = placeAtWall(R, L, 0.77, { sides: [opp], tall: true, mid: true, front: 1.1 }); if (K) cooler(K.F, y, L);
    // Regalreihen quer durch den Laden
    const alongX = R.doorSide === 'n' || R.doorSide === 's'; const span = alongX ? R.x1 - R.x0 : R.z1 - R.z0, depth = alongX ? R.z1 - R.z0 : R.x1 - R.x0;
    const rows = Math.max(1, Math.floor((depth - 4.2) / 2.6)); const len = Math.min(4.2, span - 3.2);
    for (let i = 0; i < rows; i++) {
      const off = (i - (rows - 1) / 2) * 2.6; const cx = alongX ? F0 + 0.6 : F0 + off, cz = alongX ? F1 + off : F1 + 0.6;
      const r = alongX ? [cx - len / 2, cz - 0.45, cx + len / 2, cz + 0.45] : [cx - 0.45, cz - len / 2, cx + 0.45, cz + len / 2];
      if (!roomFits(R, [r[0] - 0.3, r[1] - 0.3, r[2] + 0.3, r[3] + 0.3])) continue; R.used.push(r);
      const F = alongX ? (u, v) => [r[0] + u, r[1] + v] : (u, v) => [r[0] + v, r[1] + u];
      shelfUnit(F, y, len); addCollider(r[0], y, r[1], r[2], y + 1.65, r[3], 'furn');
      addLoot(alongX ? cx - len / 2 - 0.9 : cx + 1.1, y, alongX ? cz + 1.1 : cz - len / 2 - 0.9);
    }
  }
  if (type === 'cabin') {
    const P = placeAtWall(R, 1.0, 2.0, { front: 0.4 }); if (P) bed(P.F, y, 1.0);
    const S = placeAtWall(R, 0.7, 0.6, { front: 0.5 }); if (S) stove(S.F, y);
    const D = placeFree(R, 1.2, 0.8, 0.35); if (D) { const wd = 0x6e4a30; fbox(D.F, -0.6, -0.4, y + 0.72, 0.6, 0.4, y + 0.78, wd, 'wood', true); for (const [u, v] of [[-0.55, -0.35], [0.5, -0.35], [-0.55, 0.3], [0.5, 0.3]]) fbox(D.F, u, v, y, u + 0.06, v + 0.06, y + 0.72, wd, 'wood'); addCollider(D.x - 0.6, y, D.z - 0.4, D.x + 0.6, y + 0.72, D.z + 0.4, 'furn'); tableTop = [D.x, y + 0.78, D.z]; }
    const Bb = placeAtWall(R, 0.7, 0.7, { front: 0.1 }); if (Bb) { const [x, z] = Bb.F(0.35, 0.35); barrel(x, z, y); }
  }
  if (type === 'barracks') {
    for (let i = 0; i < 3; i++) { const P = placeAtWall(R, 0.96, 2.06, { front: 0.5, sides: shuffle(['n', 's']) }); if (P) bunk(P.F, y); }
    const L = placeAtWall(R, 1.5, 0.5, { tall: true, front: 0.6 }); if (L) { locker(L.F, y, 3); const [x, z] = L.F(0.75, 0.9); addLoot(x, y, z, 10); }
    const D = placeFree(R, 1.6, 0.9, 0.4); if (D) tableTop = diningSet(D, y);
  }
  if (tableTop) addLoot(tableTop[0], tableTop[1], tableTop[2], 5);
  if (type !== 'shop') addLoot(F0 + rand(-0.6, 0.6), y, F1 + rand(-0.6, 0.6));
}

// Räume eines Stockwerks bestimmen und einrichten
function furnishHouse(H, f, fy, kind, info) {
  const { x0, x1, z0, z1, floors, doorSide, dpos, part, zStart, balc } = H; const t = 0.15;
  const avoid = [], tall = [];
  // Fenster an Außenwänden (für hohe Möbel tabu)
  const wins = (L) => { const n = Math.floor(L / 3.2), a = []; for (let i = 0; i < n; i++) a.push((i + 0.5) * L / n); return a; };
  for (const c of wins(x1 - x0)) { tall.push([x0 + c - 0.8, z0, x0 + c + 0.8, z0 + 0.9], [x0 + c - 0.8, z1 - 0.9, x0 + c + 0.8, z1]); }
  for (const c of wins(z1 - z0)) { tall.push([x0, z0 + c - 0.8, x0 + 0.9, z0 + c + 0.8], [x1 - 0.9, z0 + c - 0.8, x1, z0 + c + 0.8]); }
  // Türen
  if (f === 0) { const D = dpos; if (doorSide === 'n') avoid.push([x0 + D - 0.4, z0, x0 + D + 2.4, z0 + 1.8]); if (doorSide === 's') avoid.push([x0 + D - 0.4, z1 - 1.8, x0 + D + 2.4, z1]); if (doorSide === 'w') avoid.push([x0, z0 + D - 0.4, x0 + 1.8, z0 + D + 2.4]); if (doorSide === 'e') avoid.push([x1 - 1.8, z0 + D - 0.4, x1, z0 + D + 2.4]); }
  if (balc && f === 1) { const bx = (x0 + x1) / 2; avoid.push([bx - 1.4, z1 - 1.6, bx + 1.4, z1]); }
  if (floors > 1) avoid.push([x0, z0, x1, zStart + 0.3]); // Flur + Treppe frei
  if (part) { const gz = zStart + (z1 - zStart) / 2; avoid.push([part - 1.4, gz - 1.3, part + 1.4, gz + 1.3]); }
  const mk = (rx0, rx1, walls) => ({ x0: rx0, x1: rx1, z0: z0 + t, z1: z1 - t, used: avoid.slice(), tall, walls, doorSide: f === 0 ? doorSide : null });
  let rooms;
  if (part) rooms = [mk(x0 + t, part - t, floors > 1 ? ['s', 'w', 'e'] : ['n', 's', 'w', 'e']), mk(part + t, x1 - t, floors > 1 ? ['s', 'w', 'e'] : ['n', 's', 'w', 'e'])];
  else rooms = [mk(x0 + t, x1 - t, floors > 1 ? ['s', 'w', 'e'] : ['n', 's', 'w', 'e'])];
  // Flurboden bei mehrstöckigen Häusern
  if (floors > 1 && f === 0) B('wood').box(x0 + t, fy, z0 + t, x1 - t, fy + 0.012, zStart, 0xb08a5f);
  let types;
  if (kind === 'shop') types = ['shop']; else if (kind === 'hut') types = ['cabin']; else if (kind === 'barracks') types = rooms.length > 1 ? ['barracks', 'kitchen'] : ['barracks'];
  else if (f === 0) types = rooms.length > 1 ? shuffle(['living', 'kitchen']) : ['combo'];
  else types = rooms.length > 1 ? shuffle(['bedroom', Math.random() < 0.5 ? 'bath' : 'kids']) : ['bedroom'];
  rooms.forEach((R, i) => {
    furnishRoom(R, types[i] || types[0], fy);
    if (f === 0 && i === 0 && info.chestP != null && Math.random() < info.chestP) { const P = placeAtWall(R, 0.95, 0.6, { front: 0.4 }); if (P) { const [x, z] = P.F(0.475, 0.3); W.chests.push({ x, y: fy, z, rot: { n: 0, s: Math.PI, w: Math.PI / 2, e: -Math.PI / 2 }[P.side] }); } }
    if (kind !== 'shop' && Math.random() < 0.25) hatch(R, fy);
  });
}
// Balkon an der Südseite des 1. Stocks
function balcony(cx, z1, y, col) {
  const x0 = cx - 2.2, x1 = cx + 2.2, zo = z1 + 1.7;
  solid(x0, y - 0.22, z1, x1, y, zo, 0xb8b2a6); B('solid').box(x0 - 0.05, y - 0.3, z1, x1 + 0.05, y - 0.22, zo + 0.05, 0x8f8f8a);
  const m = B('metal'), rc = 0x2f3236;
  m.box(x0, y + 1.0, zo - 0.05, x1, y + 1.06, zo + 0.02, rc); m.box(x0, y + 1.0, z1, x0 + 0.06, y + 1.06, zo, rc); m.box(x1 - 0.06, y + 1.0, z1, x1, y + 1.06, zo, rc);
  for (let x = x0; x <= x1 + 0.01; x += 0.22) m.box(x - 0.015, y, zo - 0.03, x + 0.015, y + 1.0, zo, rc);
  for (let z = z1 + 0.22; z < zo; z += 0.22) { m.box(x0, y, z - 0.015, x0 + 0.03, y + 1.0, z + 0.015, rc); m.box(x1 - 0.03, y, z - 0.015, x1, y + 1.0, z + 0.015, rc); }
  addCollider(x0, y, zo - 0.06, x1, y + 1.06, zo + 0.02, 'fence'); addCollider(x0, y, z1, x0 + 0.06, y + 1.06, zo, 'fence'); addCollider(x1 - 0.06, y, z1, x1, y + 1.06, zo, 'fence');
  // Pflanzkübel + Stuhl
  B('furn').box(x1 - 0.7, y, zo - 0.55, x1 - 0.15, y + 0.4, zo - 0.15, 0xb5653c); B('furn').ell(x1 - 0.42, y + 0.55, zo - 0.35, 0.3, 0.22, 0.2, 0x3f7f3a, 8, 6);
  if (Math.random() < 0.35) addLoot(cx - 1.2, y, z1 + 0.9);
}
