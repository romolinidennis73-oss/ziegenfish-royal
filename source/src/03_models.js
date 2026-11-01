// ============ Figuren, Skins, Waffen & Gegenstände ============
const SKINS = {
  ziegenfisch: { name: 'Ziegenfisch-Legende', desc: 'Halb Ziege, halb Fisch, ganz Champion. Nur für Ziegenfish_2.', skin: 0xe2b48c, top: 0x16707a, top2: 0x0f4d57, pants: 0x173f4d, boots: 0x2b2b2b, accent: 0xf2c230, glow: 0x5ff4ff, hat: 'horns', fin: true, goggles: true, rarity: 4 },
  urban: { name: 'Urban Soldier', desc: 'Grau, kühl, Stadtprofi.', skin: 0xc99a76, top: 0x5c6066, top2: 0x3a3d42, pants: 0x2f3237, boots: 0x1a1a1a, accent: 0xe0e0e0, hat: 'beanie', mask: true, rarity: 1 },
  shadow: { name: 'Shadow Agent', desc: 'Lautlos im Dunkeln.', skin: 0x8d6a52, top: 0x16161c, top2: 0x23232c, pants: 0x121216, boots: 0x0a0a0a, accent: 0x7d3cff, glow: 0xa36bff, hat: 'hood', visor: true, rarity: 3 },
  desert: { name: 'Desert Warrior', desc: 'Sand, Sonne, Siege.', skin: 0xb07a52, top: 0xc8a46e, top2: 0x9d7b4a, pants: 0x8a6b45, boots: 0x5a4028, accent: 0x7a2e1f, hat: 'scarf', goggles: true, rarity: 2 },
  neon: { name: 'Neon Fighter', desc: 'Leuchtet im Sturm.', skin: 0xf0c8a8, top: 0x1b1b25, top2: 0x2a2a38, pants: 0x1b1b25, boots: 0x111111, accent: 0xff2bd6, glow: 0x2bf5ff, hat: 'mohawk', rarity: 3 },
  tactical: { name: 'Tactical Operator', desc: 'Helm auf, Plan an.', skin: 0xd8a882, top: 0x4b5a3a, top2: 0x37432a, pants: 0x3f4a33, boots: 0x2a2418, accent: 0x9aa36b, hat: 'helmet', vest: true, rarity: 2 }
};
const SKIN_KEYS = Object.keys(SKINS);
// zusätzliche Bot-Varianten
const BOT_SKINS = [];
(function () {
  const tops = [0xb03a2e, 0x2e6eb0, 0x2e9b54, 0xd99a2b, 0x6d6d6d, 0x7a3fa0, 0xc0c0c0, 0x8a5a2b, 0x1f7a7a, 0x9b2d5c];
  const hats = ['helmet', 'beanie', 'hood', 'mohawk', 'scarf', 'cap', null];
  for (let i = 0; i < 14; i++) BOT_SKINS.push({ skin: pick([0xf0c8a8, 0xd8a882, 0xb07a52, 0x8d6a52, 0x6a4a36]), top: pick(tops), top2: pick(tops), pants: pick([0x2f3237, 0x3f4a33, 0x8a6b45, 0x1b2a44, 0x444444]), boots: 0x1a1a1a, accent: pick(tops), hat: pick(hats), vest: Math.random() < 0.4, goggles: Math.random() < 0.3 });
})();

const GLIDERS = { flosse: { name: 'Fischflosse', col: 0x16a3b5, col2: 0xf2c230 }, adler: { name: 'Steinadler', col: 0x6b4a2b, col2: 0xe8e0d0 }, neon: { name: 'Neon-Drache', col: 0xff2bd6, col2: 0x2bf5ff }, tarn: { name: 'Tarnflügel', col: 0x4b5a3a, col2: 0x2a2418 } };
const TRAILS = { blasen: { name: 'Blubberblasen', col: 0x9fe8ff }, funken: { name: 'Goldfunken', col: 0xffd447 }, rauch: { name: 'Lila Rauch', col: 0xb36bff }, keine: { name: 'Keine', col: null } };

// Teil-Geometrie (verschmolzen, Vertex-Farben)
function partGeo(fn) { const b = new Batch(), gl = new Batch(); fn(b, gl); const r = { main: b.v ? geoFromBatch(b) : null, glow: gl.v ? geoFromBatch(gl) : null }; return r; }
function geoFromBatch(b) {
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(b.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(b.n, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(b.c, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(b.uv, 2)); g.setIndex(b.idx); g.computeBoundingSphere(); return g;
}
const bx = (b, cx, cy, cz, w, h, d, col) => b.box(cx - w / 2, cy - h / 2, cz - d / 2, cx + w / 2, cy + h / 2, cz + d / 2, col);
const charGeoCache = new Map();
function charGeos(S) {
  if (charGeoCache.has(S)) return charGeoCache.get(S);
  const G = {};
  G.leg = partGeo(b => { bx(b, 0, -0.25, 0, 0.19, 0.5, 0.21, S.pants); bx(b, 0, -0.66, 0, 0.17, 0.42, 0.19, S.pants); bx(b, 0, -0.9, 0.04, 0.2, 0.12, 0.28, S.boots); if (S.vest) bx(b, 0, -0.5, 0.09, 0.2, 0.12, 0.06, S.accent); });
  G.torso = partGeo((b, gl) => {
    bx(b, 0, 0.06, 0, 0.42, 0.14, 0.24, S.pants); bx(b, 0, 0.36, 0, 0.5, 0.5, 0.27, S.top); bx(b, 0, 0.12, 0, 0.46, 0.06, 0.26, 0x2a2a2a);
    bx(b, 0, 0.36, -0.2, 0.36, 0.42, 0.14, S.top2); // Rucksack
    if (S.vest) { bx(b, 0, 0.36, 0.12, 0.46, 0.4, 0.06, S.top2); bx(b, -0.12, 0.3, 0.16, 0.1, 0.12, 0.04, S.accent); bx(b, 0.12, 0.3, 0.16, 0.1, 0.12, 0.04, S.accent); }
    bx(b, 0, 0.5, 0.14, 0.5, 0.05, 0.02, S.accent);
    if (S.fin) { for (let i = 0; i < 4; i++) bx(gl, 0, 0.25 + i * 0.1, -0.3 - i * 0.03, 0.04, 0.12, 0.14 + i * 0.05, S.glow); bx(b, 0, 0.45, 0.145, 0.16, 0.16, 0.02, S.accent); }
    if (S.glow && !S.fin) { bx(gl, -0.2, 0.36, 0.14, 0.03, 0.45, 0.02, S.glow); bx(gl, 0.2, 0.36, 0.14, 0.03, 0.45, 0.02, S.glow); bx(gl, 0, 0.36, -0.28, 0.25, 0.05, 0.02, S.glow); }
  });
  G.arm = partGeo(b => { bx(b, 0, -0.18, 0, 0.15, 0.36, 0.16, S.top); bx(b, 0, -0.45, 0, 0.13, 0.26, 0.14, S.top2); bx(b, 0, -0.62, 0, 0.12, 0.12, 0.12, S.skin); if (S.accent) bx(b, 0, -0.06, 0, 0.17, 0.08, 0.18, S.accent); });
  G.head = partGeo((b, gl) => {
    bx(b, 0, 0.04, 0, 0.12, 0.08, 0.12, S.skin); bx(b, 0, 0.2, 0, 0.27, 0.3, 0.27, S.skin);
    bx(b, -0.06, 0.24, 0.136, 0.05, 0.035, 0.01, 0x111111); bx(b, 0.06, 0.24, 0.136, 0.05, 0.035, 0.01, 0x111111);
    if (S.mask) bx(b, 0, 0.13, 0.13, 0.28, 0.12, 0.04, 0x2a2a2a);
    if (S.goggles) { bx(b, 0, 0.25, 0.14, 0.3, 0.09, 0.03, 0x333333); bx(gl, -0.07, 0.25, 0.155, 0.09, 0.06, 0.01, S.glow || 0xff9a3c); bx(gl, 0.07, 0.25, 0.155, 0.09, 0.06, 0.01, S.glow || 0xff9a3c); }
    if (S.visor) bx(gl, 0, 0.24, 0.14, 0.26, 0.06, 0.02, S.glow);
    switch (S.hat) {
      case 'helmet': bx(b, 0, 0.37, 0, 0.32, 0.1, 0.32, S.accent || 0x4b5a3a); bx(b, 0, 0.31, 0.02, 0.33, 0.06, 0.33, S.top2); break;
      case 'beanie': bx(b, 0, 0.37, 0, 0.29, 0.12, 0.29, S.top2); break;
      case 'hood': bx(b, 0, 0.3, -0.03, 0.31, 0.3, 0.3, S.top); bx(b, 0, 0.42, -0.02, 0.29, 0.08, 0.28, S.top); break;
      case 'mohawk': bx(gl, 0, 0.42, -0.02, 0.06, 0.14, 0.28, S.accent); break;
      case 'scarf': bx(b, 0, 0.36, 0, 0.3, 0.1, 0.3, S.top); bx(b, 0, 0.1, 0.02, 0.3, 0.1, 0.3, S.accent); break;
      case 'cap': bx(b, 0, 0.37, 0, 0.29, 0.08, 0.29, S.accent); bx(b, 0, 0.34, 0.18, 0.24, 0.03, 0.14, S.accent); break;
      case 'horns': // Ziegenhörner
        for (const s of [-1, 1]) { bx(b, s * 0.12, 0.38, -0.02, 0.07, 0.12, 0.07, 0xe8dcc0); bx(b, s * 0.16, 0.46, -0.07, 0.06, 0.1, 0.06, 0xd8ccb0); bx(b, s * 0.19, 0.5, -0.14, 0.05, 0.08, 0.08, 0xc8bc9f); }
        bx(b, 0, 0.36, 0, 0.29, 0.06, 0.29, S.top); bx(b, 0, 0.02, 0.12, 0.08, 0.1, 0.05, 0xe8dcc0); // Bärtchen
        break;
    }
  });
  charGeoCache.set(S, G); return G;
}
function makeCharacter(S, isPlayer) {
  const G = charGeos(S); const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, metalness: 0.05 });
  const glowMat = new THREE.MeshBasicMaterial({ vertexColors: true });
  const mk = (pg, parent, x, y, z) => { const g = new THREE.Group(); g.position.set(x, y, z); if (pg.main) { const m = new THREE.Mesh(pg.main, mat); m.castShadow = true; g.add(m); } if (pg.glow) g.add(new THREE.Mesh(pg.glow, glowMat)); parent.add(g); return g; };
  const root = new THREE.Group(); const body = new THREE.Group(); root.add(body);
  const torso = mk(G.torso, body, 0, 0.95, 0); const head = mk(G.head, torso, 0, 0.62, 0);
  const armL = mk(G.arm, torso, -0.33, 0.56, 0), armR = mk(G.arm, torso, 0.33, 0.56, 0);
  const legL = mk(G.leg, body, -0.12, 0.95, 0), legR = mk(G.leg, body, 0.12, 0.95, 0);
  const hand = new THREE.Group(); hand.position.set(0, -0.6, 0.02); hand.rotation.x = Math.PI / 2; armR.add(hand);
  return { root, body, torso, head, armL, armR, legL, legR, hand, mat, gun: null, gunKey: null, t: Math.random() * 10 };
}
// Prozedurale Animation
function animateChar(m, c, dt) {
  const sp = c.animSpeed || 0; m.t += dt * (2 + sp * 1.25);
  const air = !c.onGround, crouch = c.crouch ? 1 : 0, s = Math.min(sp / 9, 1), sw = Math.sin(m.t) * s;
  m.legL.rotation.x = air ? -0.6 : sw * 0.9 - crouch * 0.9; m.legR.rotation.x = air ? 0.3 : -sw * 0.9 - crouch * 0.9;
  m.body.position.y = air ? 0 : Math.abs(Math.cos(m.t)) * 0.06 * s - crouch * 0.38;
  m.torso.rotation.x = crouch * 0.35 + (c.sprint ? 0.25 : 0) * s;
  const hasGun = !!c.gunKey; const aimP = c.pitch || 0; const recoil = c.recoilT > 0 ? c.recoilT * 2 : 0;
  if (c.glide) { m.armL.rotation.set(-Math.PI + 0.2, 0, 0.3); m.armR.rotation.set(-Math.PI + 0.2, 0, -0.3); m.legL.rotation.x = 0.2; m.legR.rotation.x = 0.2; }
  else if (c.skydive) { m.armL.rotation.set(-0.3, 0, -1.3); m.armR.rotation.set(-0.3, 0, 1.3); m.legL.rotation.x = 0.4; m.legR.rotation.x = 0.2; m.body.rotation.x = 1.1; }
  else if (c.reloadT > 0) { const r = Math.sin(c.reloadT * 8); m.armR.rotation.set(-1.2, 0, 0); m.armL.rotation.set(-0.6 + r * 0.4, 0.3, 0.2); }
  else if (c.healT > 0) { m.armR.rotation.set(-1.0 + Math.sin(m.t * 3) * 0.2, 0, 0); m.armL.rotation.set(-1.0, 0, 0); }
  else if (hasGun && !(c.sprint && sp > 6)) { m.armR.rotation.set(-Math.PI / 2 - aimP - recoil * 0.3 + crouch * -0.35, 0, 0); m.armL.rotation.set(-Math.PI / 2 - aimP + 0.15 - recoil * 0.3 + crouch * -0.35, 0.55, 0); }
  else { m.armL.rotation.set(-sw * 0.8, 0, -0.08); m.armR.rotation.set(sw * 0.8, 0, 0.08); }
  if (!c.skydive) m.body.rotation.x = 0;
  if (c.hitT > 0) { m.mat.emissive.setRGB(c.hitT * 2.5, c.hitT * 0.4, c.hitT * 0.4); m.torso.rotation.z = Math.sin(c.hitT * 30) * 0.08; } else if (m.mat.emissive.r) { m.mat.emissive.setRGB(0, 0, 0); m.torso.rotation.z = 0; }
  m.head.rotation.x = -aimP * 0.5;
  // Waffe in der Hand
  if (c.gunKey !== m.gunKey) { if (m.gun) m.hand.remove(m.gun); m.gun = c.gunKey ? itemMesh(c.gunKey, c.gunRar || 0, true) : null; if (m.gun) m.hand.add(m.gun); m.gunKey = c.gunKey; }
  if (m.gun) m.gun.position.z = -recoil * 0.08;
}

// ---------------- Waffen ----------------
const RARITY = [
  { name: 'Gewöhnlich', col: '#a8acb3', hex: 0xa8acb3, mult: 1.0 }, { name: 'Ungewöhnlich', col: '#4fc34a', hex: 0x4fc34a, mult: 1.05 },
  { name: 'Selten', col: '#3a9bff', hex: 0x3a9bff, mult: 1.1 }, { name: 'Episch', col: '#b45cff', hex: 0xb45cff, mult: 1.16 }, { name: 'Legendär', col: '#ffb02e', hex: 0xffb02e, mult: 1.23 }
];
const AMMO = { leicht: { name: 'Leichte Munition', col: '#7fc8ff', box: 30 }, mittel: { name: 'Mittlere Munition', col: '#ffd06b', box: 30 }, schwer: { name: 'Schwere Munition', col: '#ff7b5c', box: 6 }, schrot: { name: 'Schrot', col: '#ffef9a', box: 8 } };
// dmg pro Treffer/Pellet, rate Schüsse/s, mag, reload s, range m, spread Grad, pellets, burst
const WEAPONS = {
  ar: { name: 'Sturmgewehr', en: 'Assault Rifle', cls: 'Sturmgewehr', dmg: 31, head: 1.6, rate: 5.5, mag: 30, reload: 2.2, range: 160, spread: 1.7, ammo: 'mittel', snd: 'ar', auto: true, zoom: 1.6, botAcc: 1 },
  tac: { name: 'Taktisches Gewehr', en: 'Tactical Rifle', cls: 'Sturmgewehr', dmg: 28, head: 1.6, rate: 9, burst: 3, burstDelay: 0.42, mag: 24, reload: 2.0, range: 170, spread: 1.0, ammo: 'mittel', snd: 'tac', auto: true, zoom: 2.0, botAcc: 1.05 },
  smg: { name: 'Kompakt-MP', en: 'Compact SMG', cls: 'Maschinenpistole', dmg: 18, head: 1.5, rate: 11, mag: 35, reload: 2.0, range: 60, spread: 3.2, ammo: 'leicht', snd: 'smg', auto: true, zoom: 1.3, botAcc: 0.95 },
  rsmg: { name: 'Turbo-MP', en: 'Rapid SMG', cls: 'Maschinenpistole', dmg: 15, head: 1.5, rate: 14, mag: 30, reload: 2.3, range: 50, spread: 3.8, ammo: 'leicht', snd: 'rsmg', auto: true, zoom: 1.3, botAcc: 0.95 },
  pump: { name: 'Pump-Schrotflinte', en: 'Pump Shotgun', cls: 'Schrotflinte', dmg: 11, pellets: 10, head: 1.8, rate: 0.9, mag: 5, reload: 4.2, range: 32, spread: 6.5, ammo: 'schrot', snd: 'pump', zoom: 1.2, botAcc: 1 },
  tsg: { name: 'Taktische Schrotflinte', en: 'Tactical Shotgun', cls: 'Schrotflinte', dmg: 8.5, pellets: 9, head: 1.8, rate: 1.6, mag: 8, reload: 5.0, range: 27, spread: 7.5, ammo: 'schrot', snd: 'tsg', zoom: 1.2, botAcc: 1 },
  bolt: { name: 'Repetier-Sniper', en: 'Bolt Sniper', cls: 'Scharfschützengewehr', dmg: 108, head: 2.5, rate: 0.38, mag: 1, reload: 2.6, range: 450, spread: 0.0, hipSpread: 5, ammo: 'schwer', snd: 'bolt', zoom: 4.5, scope: true, botAcc: 0.6 },
  semi: { name: 'Halbautomatik-Sniper', en: 'Semi-Auto Sniper', cls: 'Scharfschützengewehr', dmg: 66, head: 2.2, rate: 1.4, mag: 10, reload: 2.8, range: 380, spread: 0.25, hipSpread: 4, ammo: 'schwer', snd: 'semi', zoom: 3.5, scope: true, botAcc: 0.7 },
  pistol: { name: 'Standard-Pistole', en: 'Standard Pistol', cls: 'Pistole', dmg: 24, head: 1.8, rate: 6, mag: 16, reload: 1.4, range: 75, spread: 2.0, ammo: 'leicht', snd: 'pistol', zoom: 1.3, botAcc: 1 },
};
const ITEMS = {
  granate: { name: 'Granate', cls: 'Explosiv', stack: 6, throw: true, dmg: 105, radius: 7.5 },
  medkit: { name: 'Medikit', cls: 'Heilung', stack: 3, use: 5, heal: 100, maxHp: 100 },
  bandage: { name: 'Verband', cls: 'Heilung', stack: 15, use: 2.5, heal: 15, maxHp: 75 },
  smallshield: { name: 'Kleiner Schildtrank', cls: 'Schild', stack: 6, use: 1.8, shield: 25, maxShield: 50 },
  bigshield: { name: 'Großer Schildtrank', cls: 'Schild', stack: 3, use: 4.5, shield: 50, maxShield: 100 },
};
function wStat(key, rar) { const w = WEAPONS[key]; const m = RARITY[rar].mult; return { dmg: w.dmg * m, spread: w.spread * (1.08 - rar * 0.06), reload: w.reload * (1.05 - rar * 0.05) }; }

// Item-Modelle (verschmolzen, gecacht)
const itemGeoCache = new Map();
function itemGeo(key, rar) {
  const ck = key + rar; if (itemGeoCache.has(ck)) return itemGeoCache.get(ck);
  const R = RARITY[rar].hex, dk = 0x26282c, md = 0x45484e, wd = 0x7a5232;
  const pg = partGeo((b, gl) => {
    switch (key) {
      case 'ar': bx(b, 0, 0, 0.25, 0.08, 0.13, 0.6, md); bx(b, 0, 0.02, 0.68, 0.04, 0.04, 0.3, dk); bx(b, 0, -0.13, 0.25, 0.06, 0.18, 0.09, dk); bx(b, 0, -0.08, 0.04, 0.06, 0.14, 0.07, dk); bx(b, 0, -0.01, -0.15, 0.07, 0.11, 0.25, R); bx(b, 0, 0.1, 0.25, 0.04, 0.05, 0.16, dk); bx(gl, 0, 0.1, 0.17, 0.02, 0.02, 0.01, 0xff3030); break;
      case 'tac': bx(b, 0, 0, 0.25, 0.1, 0.15, 0.55, 0x2f3440); bx(b, 0, 0.02, 0.62, 0.05, 0.05, 0.25, dk); bx(b, 0, -0.14, 0.32, 0.07, 0.2, 0.1, R); bx(b, 0, -0.08, 0.04, 0.06, 0.14, 0.07, dk); bx(b, 0, 0, -0.12, 0.08, 0.13, 0.2, dk); bx(b, 0, 0.12, 0.24, 0.07, 0.08, 0.22, R); bx(gl, 0, 0.12, 0.355, 0.04, 0.04, 0.01, 0x7fd0ff); break;
      case 'smg': bx(b, 0, 0, 0.15, 0.08, 0.14, 0.4, md); bx(b, 0, 0.0, 0.42, 0.04, 0.04, 0.14, dk); bx(b, 0, -0.17, 0.2, 0.05, 0.25, 0.07, R); bx(b, 0, -0.08, 0.0, 0.06, 0.14, 0.07, dk); bx(b, 0, 0.02, -0.1, 0.03, 0.05, 0.14, dk); break;
      case 'rsmg': bx(b, 0, 0, 0.15, 0.11, 0.16, 0.36, 0x3a3f4a); bx(b, 0, 0.0, 0.38, 0.05, 0.05, 0.12, dk); bx(b, 0.08, -0.02, 0.2, 0.08, 0.1, 0.2, R); bx(b, 0, -0.08, 0.0, 0.06, 0.14, 0.07, dk); bx(b, 0, 0.11, 0.15, 0.06, 0.04, 0.1, R); break;
      case 'pump': bx(b, 0, 0, 0.2, 0.08, 0.1, 0.5, md); bx(b, 0, 0.02, 0.6, 0.05, 0.05, 0.35, dk); bx(b, 0, -0.06, 0.48, 0.08, 0.07, 0.2, wd); bx(b, 0, -0.06, -0.12, 0.07, 0.14, 0.3, wd); bx(b, 0, -0.08, 0.03, 0.05, 0.12, 0.06, dk); bx(b, 0, 0.06, 0.2, 0.08, 0.02, 0.3, R); break;
      case 'tsg': bx(b, 0, 0, 0.22, 0.1, 0.13, 0.55, 0x22252b); bx(b, 0, 0.0, 0.6, 0.07, 0.07, 0.25, dk); bx(b, 0, -0.1, 0.4, 0.07, 0.1, 0.2, R); bx(b, 0, -0.08, 0.03, 0.06, 0.14, 0.07, dk); bx(b, 0, 0, -0.12, 0.06, 0.1, 0.22, R); break;
      case 'bolt': bx(b, 0, 0, 0.3, 0.07, 0.1, 0.8, wd); bx(b, 0, 0.02, 0.88, 0.035, 0.035, 0.45, dk); bx(b, 0, 0.11, 0.3, 0.06, 0.06, 0.34, dk); bx(b, 0, 0.11, 0.48, 0.08, 0.08, 0.04, R); bx(b, 0, 0.11, 0.12, 0.08, 0.08, 0.04, R); bx(b, 0.06, 0.03, 0.18, 0.08, 0.02, 0.02, md); bx(b, 0, -0.07, -0.15, 0.07, 0.16, 0.25, wd); bx(gl, 0, 0.11, 0.505, 0.05, 0.05, 0.01, 0x9fe1ff); break;
      case 'semi': bx(b, 0, 0, 0.3, 0.08, 0.12, 0.75, 0x3c4048); bx(b, 0, 0.02, 0.85, 0.04, 0.04, 0.35, dk); bx(b, 0, 0.12, 0.28, 0.07, 0.07, 0.32, dk); bx(b, 0, -0.14, 0.32, 0.06, 0.16, 0.12, R); bx(b, 0, -0.06, -0.15, 0.07, 0.15, 0.25, R); bx(gl, 0, 0.12, 0.445, 0.05, 0.05, 0.01, 0x9fe1ff); break;
      case 'pistol': bx(b, 0, 0.02, 0.1, 0.06, 0.08, 0.24, md); bx(b, 0, -0.08, 0.02, 0.055, 0.15, 0.07, dk); bx(b, 0, 0.06, 0.1, 0.05, 0.02, 0.22, R); break;
      case 'granate': bx(b, 0, 0, 0, 0.13, 0.15, 0.13, 0x4b5a3a); bx(b, 0, 0.1, 0, 0.05, 0.05, 0.05, md); bx(b, 0.05, 0.1, 0, 0.07, 0.02, 0.02, R); break;
      case 'medkit': bx(b, 0, 0, 0, 0.36, 0.22, 0.22, 0xf2f2f2); bx(b, 0, 0, 0.115, 0.06, 0.16, 0.01, 0xd62828); bx(b, 0, 0, 0.115, 0.16, 0.06, 0.01, 0xd62828); bx(b, 0, 0.13, 0, 0.12, 0.04, 0.04, md); break;
      case 'bandage': bx(b, 0, 0, 0, 0.14, 0.14, 0.14, 0xeae2d2); bx(b, 0, 0, 0.075, 0.1, 0.03, 0.01, 0xd62828); break;
      case 'smallshield': bx(gl, 0, 0, 0, 0.12, 0.16, 0.12, 0x3fb8ff); bx(b, 0, 0.11, 0, 0.06, 0.06, 0.06, 0xdddddd); break;
      case 'bigshield': bx(gl, 0, 0, 0, 0.24, 0.3, 0.18, 0x3f8cff); bx(b, 0, 0.19, 0, 0.1, 0.08, 0.1, 0xdddddd); bx(b, 0, 0, 0.095, 0.16, 0.06, 0.01, 0xffffff); break;
      default: // Munitionskiste
        bx(b, 0, 0, 0, 0.3, 0.18, 0.2, 0x5a5a3a); bx(gl, 0, 0.095, 0, 0.2, 0.01, 0.1, new THREE.Color(AMMO[key] ? AMMO[key].col : '#fff').getHex());
    }
  });
  itemGeoCache.set(ck, pg); return pg;
}
const itemMats = {};
function itemMesh(key, rar, held) {
  if (!itemMats.m) { itemMats.m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, metalness: 0.4 }); itemMats.g = new THREE.MeshBasicMaterial({ vertexColors: true }); }
  const pg = itemGeo(key, rar); const g = new THREE.Group();
  if (pg.main) { const m = new THREE.Mesh(pg.main, itemMats.m); m.castShadow = !!held; g.add(m); } if (pg.glow) g.add(new THREE.Mesh(pg.glow, itemMats.g));
  if (held) { g.scale.setScalar(1.15); g.position.set(0, 0.04, 0); }
  return g;
}
function isWeapon(k) { return !!WEAPONS[k]; }
function itemName(k) { return WEAPONS[k] ? WEAPONS[k].name : ITEMS[k] ? ITEMS[k].name : AMMO[k] ? AMMO[k].name : k; }
