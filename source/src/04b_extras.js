// ============ Etappe 5: Tageszeit, Wetter, Emotes, Geheimnisse, Belohnungen ============
const TODS = {
  morgen: { name: 'Morgen', sun: [-230, 120, 150], sunCol: 0xffd9b0, sunI: 1.15, hemi: 0xd8e4ff, ground: 0x5a5a40, hemiI: 0.55, top: [0.30, 0.48, 0.78], hor: [0.98, 0.82, 0.68], fog: 0xe6d6c8 },
  mittag: { name: 'Mittag', sun: [180, 260, 120], sunCol: 0xfff1d6, sunI: 1.35, hemi: 0xcfe6ff, ground: 0x4a5a32, hemiI: 0.6, top: [0.16, 0.38, 0.72], hor: [0.73, 0.82, 0.9], fog: 0xb9cde0 },
  nachmittag: { name: 'Nachmittag', sun: [210, 170, -170], sunCol: 0xffe4b8, sunI: 1.3, hemi: 0xd6e6ff, ground: 0x4f5a34, hemiI: 0.58, top: [0.2, 0.42, 0.76], hor: [0.86, 0.85, 0.82], fog: 0xcbd3d8 },
  abend: { name: 'Sonnenuntergang', sun: [270, 52, -120], sunCol: 0xff9e60, sunI: 1.05, hemi: 0xffc8a8, ground: 0x3a3040, hemiI: 0.5, top: [0.22, 0.26, 0.52], hor: [1.0, 0.58, 0.36], fog: 0xd9a084 }
};
const WEATHERS = {
  klar: { name: 'Klar', sunMul: 1, fogMul: 1, grey: 0, cloud: 0xffffff, cloudO: 0.85 },
  wolkig: { name: 'Bewölkt', sunMul: 0.62, fogMul: 0.82, grey: 0.35, cloud: 0xc4c8cf, cloudO: 0.95 },
  regen: { name: 'Regen', sunMul: 0.4, fogMul: 0.55, grey: 0.6, cloud: 0x8d939c, cloudO: 0.97, rain: true },
  nebel: { name: 'Nebel', sunMul: 0.75, fogMul: 0.28, grey: 0.3, cloud: 0xe0e4e8, cloudO: 0.9 }
};
const ATM = { tod: 'mittag', weather: 'klar', sunOff: new THREE.Vector3(108, 156, 72) };
function applyAtmosphere(tod, weather) {
  const T = TODS[tod], Wt = WEATHERS[weather]; ATM.tod = tod; ATM.weather = weather;
  const dir = new THREE.Vector3(...T.sun).normalize(); ZR.sunDir.copy(dir); ATM.sunOff.copy(dir).multiplyScalar(200);
  ZR.sun.color.setHex(T.sunCol); ZR.sun.intensity = T.sunI * Wt.sunMul; ZR.hemi.color.setHex(T.hemi); ZR.hemi.groundColor.setHex(T.ground); ZR.hemi.intensity = T.hemiI * (1 + (1 - Wt.sunMul) * 0.35);
  const grey = new THREE.Color(0.62, 0.65, 0.68); const fog = new THREE.Color(T.fog).lerp(grey, Wt.grey); ZR.scene.fog.color.copy(fog);
  const far = Settings.quality === 'niedrig' ? 330 : 520; ZR.scene.fog.far = far * Wt.fogMul; ZR.scene.fog.near = Math.max(15, 80 * Wt.fogMul);
  const u = ZR.sky.material.uniforms; u.uTop.value.setRGB(...T.top).lerp(grey, Wt.grey); u.uHor.value.setRGB(...T.hor).lerp(fog, 0.35 + Wt.grey * 0.5); u.uSun.value = Wt.sunMul * Wt.sunMul;
  ZR.clouds.material.color.setHex(Wt.cloud).multiply(new THREE.Color(T.sunCol).lerp(new THREE.Color(0xffffff), 0.5)); ZR.clouds.material.opacity = Wt.cloudO;
  setRain(!!Wt.rain);
}
function rollAtmosphere() {
  if (Settings.weather === 'sonne') return applyAtmosphere('mittag', 'klar');
  const tod = pick(['morgen', 'mittag', 'mittag', 'nachmittag', 'nachmittag', 'abend', 'abend']);
  const r = Math.random(); applyAtmosphere(tod, r < 0.5 ? 'klar' : r < 0.72 ? 'wolkig' : r < 0.88 ? 'regen' : 'nebel');
}
// Regen: Linien, die im Shader um die Kamera herum fallen
const RAIN = { mesh: null, on: false, src: null, gain: null };
function setRain(on) {
  RAIN.on = on;
  if (on && !RAIN.mesh) {
    const N = 1600, pos = new Float32Array(N * 6), k = new Float32Array(N * 2);
    for (let i = 0; i < N; i++) { const x = rand(-32, 32), y = rand(0, 34), z = rand(-32, 32); pos.set([x, y, z, x, y, z], i * 6); k[i * 2] = 0; k[i * 2 + 1] = 1; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('k', new THREE.BufferAttribute(k, 1));
    const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { uT: { value: 0 } },
      vertexShader: 'attribute float k; uniform float uT; varying float vK; void main(){ vec3 p = position; p.y = mod(p.y - uT * 24.0, 34.0) - 12.0 + k * 0.75; p.x += k * 0.1; vK = k; gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }',
      fragmentShader: 'varying float vK; void main(){ gl_FragColor = vec4(0.78, 0.84, 0.92, 0.18 + vK * 0.3); }' });
    RAIN.mesh = new THREE.LineSegments(g, m); RAIN.mesh.frustumCulled = false; ZR.scene.add(RAIN.mesh);
  }
  if (RAIN.mesh) RAIN.mesh.visible = on;
  rainSound(on && M.state !== 'menu');
}
function rainSound(on) {
  const A = Audio; if (!A.ctx) return;
  if (on && !RAIN.src) { const s = A.ctx.createBufferSource(); s.buffer = A.noiseBuf; s.loop = true; const f = A.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2600; f.Q.value = 0.5; const g = A.ctx.createGain(); g.gain.value = 0.11; s.connect(f); f.connect(g); g.connect(A.sfxGain); s.start(); RAIN.src = s; RAIN.gain = g; }
  else if (!on && RAIN.src) { try { RAIN.src.stop(); } catch (e) { } RAIN.src = null; }
}
function updateWeather(dt) {
  if (RAIN.on && RAIN.mesh) { RAIN.mesh.material.uniforms.uT.value += dt; const c = ZR.camera.position; RAIN.mesh.position.set(c.x, c.y, c.z); if (RAIN.gain) RAIN.gain.gain.value = (M.player && M.player.y < heightAt(M.player.x, M.player.z) + 2.5 && roofAbove(M.player) ? 0.04 : 0.11) * (M.state === 'menu' ? 0 : 1); }
}
function roofAbove(c) { boxesNear(c.x, c.z, 1, _near); return _near.some(b => c.x > b.x0 && c.x < b.x1 && c.z > b.z0 && c.z < b.z1 && b.y0 > c.y + 1.9 && b.y0 < c.y + 12); }

// ---------------- Emotes ----------------
const EMOTES = {
  tanz: { name: 'Ziegen-Tanz', dur: 4.5 }, winken: { name: 'Winken', dur: 2.4 }, flex: { name: 'Flossen-Flex', dur: 2.8 },
  maeh: { name: 'Mecker-Sprung', dur: 1.8 }, robot: { name: 'Roboter-Ziege', dur: 4 }, sieg: { name: 'Siegerpose', dur: 3 }
};
function startEmote(c, k) {
  if (!isUnlocked('emote', k) && c.isPlayer) return; if (c.mode !== 'ground' && c.mode !== 'lobby') return;
  c.emote = k; c.emoteT = EMOTES[k].dur; c.emoteA = 0; c.reloadT = 0; c.healT = 0; if (c.isPlayer) Audio.emote(k);
}
function stopEmote(c) { c.emote = null; c.emoteT = 0; }
function emotePose(m, c, dt) {
  c.emoteA = (c.emoteA || 0) + dt; const t = c.emoteA, k = c.emote;
  if (m.gun) m.gun.visible = false;
  if (k === 'tanz') { const b = Math.sin(t * 8); m.body.position.y = Math.abs(b) * 0.14; m.armL.rotation.set(-2.5 + b * 0.5, 0, 0.5); m.armR.rotation.set(-2.5 - b * 0.5, 0, -0.5); m.legL.rotation.x = b * 0.5; m.legR.rotation.x = -b * 0.5; m.torso.rotation.y = Math.sin(t * 4) * 0.5; m.head.rotation.x = Math.sin(t * 8) * 0.2; }
  else if (k === 'winken') { m.armR.rotation.set(-2.8, 0, -0.2 + Math.sin(t * 11) * 0.45); m.armL.rotation.set(0, 0, 0.1); m.head.rotation.x = Math.sin(t * 3) * 0.1; }
  else if (k === 'flex') { const p = 0.5 + Math.sin(t * 5) * 0.5; m.armL.rotation.set(-1.4, 0, 1.0 + p * 0.5); m.armR.rotation.set(-1.4, 0, -1.0 - p * 0.5); m.torso.rotation.x = -0.15 - p * 0.1; m.body.position.y = p * 0.04; }
  else if (k === 'maeh') { const j = Math.abs(Math.sin(t * Math.PI / 0.9)); m.body.position.y = j * 0.7; m.armL.rotation.set(-2.9, 0, 0.3); m.armR.rotation.set(-2.9, 0, -0.3); m.legL.rotation.x = -j * 0.8; m.legR.rotation.x = -j * 0.8; }
  else if (k === 'robot') { const s = Math.floor(t * 3) % 4; m.armL.rotation.set(s % 2 ? -1.57 : 0, 0, 0); m.armR.rotation.set(s % 2 ? 0 : -1.57, 0, 0); m.torso.rotation.y = (s - 1.5) * 0.25; m.head.rotation.x = s === 2 ? 0.3 : 0; m.body.position.y = s % 2 ? 0.05 : 0; }
  else if (k === 'sieg') { m.armR.rotation.set(-3.0, 0, -0.15); m.armL.rotation.set(-0.3, 0, 1.0); m.torso.rotation.x = -0.12; m.body.position.y = Math.min(t, 0.4) * 0.15; if (c.x != null && Math.random() < dt * 6) FX.spawn(c.x + rand(-0.3, 0.3), c.y + 2.4, c.z + rand(-0.3, 0.3), rand(-1, 1), 3, rand(-1, 1), 1, 0.85, 0.2, 0.8, 0.12, 4); }
}

// ---------------- Belohnungen / Freischaltungen ----------------
const UNLOCKS = [
  { type: 'trail', key: 'funken', lvl: 2 }, { type: 'emote', key: 'flex', lvl: 3 }, { type: 'glider', key: 'adler', lvl: 4 }, { type: 'trail', key: 'rauch', lvl: 5 },
  { type: 'emote', key: 'robot', lvl: 6 }, { type: 'glider', key: 'neon', lvl: 7 }, { type: 'glider', key: 'tarn', lvl: 9 },
  { type: 'emote', key: 'sieg', wins: 1 }, { type: 'glider', key: 'gold', wins: 1 }, { type: 'trail', key: 'regenbogen', secrets: 3 }, { type: 'emote', key: 'maeh', secrets: 1 }
];
GLIDERS.gold = { name: 'Goldflosse (1. Sieg)', col: 0xffd447, col2: 0xfff1a8 };
TRAILS.regenbogen = { name: 'Regenbogen (alle Geheimnisse)', col: 0xff6bd6 };
function unlockReq(type, key) { return UNLOCKS.find(u => u.type === type && u.key === key); }
function secretCount() { return Object.keys(Profile.secrets || {}).length; }
function isUnlocked(type, key) { const u = unlockReq(type, key); if (!u) return true; if (u.lvl) return Profile.level >= u.lvl; if (u.wins) return Profile.wins >= u.wins; if (u.secrets) return secretCount() >= u.secrets; return true; }
function lockText(type, key) { const u = unlockReq(type, key); return !u ? '' : u.lvl ? 'Ab Level ' + u.lvl : u.wins ? 'Nach deinem 1. Sieg' : u.secrets === 1 ? 'Finde 1 Geheimnis' : 'Finde alle ' + u.secrets + ' Geheimnisse'; }
function unlockedSet() { return new Set(UNLOCKS.filter(u => isUnlocked(u.type, u.key)).map(u => u.type + ':' + u.key)); }
function unlockName(id) { const [t, k] = id.split(':'); return (t === 'emote' ? 'Emote ' + EMOTES[k].name : t === 'glider' ? 'Gleiter ' + GLIDERS[k].name.replace(/ \(.*\)/, '') : 'Flugspur ' + TRAILS[k].name.replace(/ \(.*\)/, '')); }

// ---------------- Geheimnisse ----------------
const SECRETS = [
  { id: 'ziege', name: 'Goldene Ziege', hint: 'Ganz oben auf den Meckerbergen soll etwas Goldenes stehen.' },
  { id: 'fisch', name: 'Fisch-Schrein', hint: 'Tief im Dunkelwald, wo kaum Licht hinkommt, glitzert ein Schrein.' },
  { id: 'kiste', name: 'Mysteriöse Kiste', hint: 'Am Strand der Sandbucht wurde eine seltsame Kiste angespült.' }
];
function placeSecrets() {
  // Gipfel der Meckerberge suchen
  let best = [300, -300], bh = -1e9; for (let x = 220; x <= 380; x += 4) for (let z = -380; z <= -220; z += 4) { const h = heightAt(x, z); if (h > bh) { bh = h; best = [x, z]; } }
  SECRETS[0].x = best[0]; SECRETS[0].z = best[1];
  SECRETS[1].x = -232; SECRETS[1].z = -218;
  let sb = [30, 420]; for (let r = 0; r < 60; r += 3) { const z = 430 - r; if (heightAt(30, z) > 1.2) { sb = [30, z]; break; } } SECRETS[2].x = sb[0]; SECRETS[2].z = sb[1];
  for (const s of SECRETS) { s.y = heightAt(s.x, s.z); boxesNear(s.x, s.z, 2, _near); for (const b of _near) if (b.kind === 'tree' || b.kind === 'rock') b.on = false; }
}
let secretMats = null;
function makeSecretMesh(id) {
  if (!secretMats) secretMats = { gold: new THREE.MeshStandardMaterial({ color: 0xffc83a, metalness: 0.9, roughness: 0.25, emissive: 0x664400 }), stone: new THREE.MeshStandardMaterial({ color: 0x8a8580, roughness: 0.9 }), purple: new THREE.MeshStandardMaterial({ color: 0x6b3fa0, roughness: 0.4, emissive: 0x3a1060 }) };
  const g = new THREE.Group(); const add = (geo, mat, x, y, z, rx = 0, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.x = rx; m.rotation.z = rz; m.castShadow = true; g.add(m); return m; };
  add(new THREE.CylinderGeometry(0.7, 0.85, 0.5, 12), secretMats.stone, 0, 0.25, 0);
  if (id === 'ziege') { add(new THREE.SphereGeometry(0.45, 14, 10), secretMats.gold, 0, 1.0, 0).scale.set(1.3, 0.8, 0.8); add(new THREE.SphereGeometry(0.25, 12, 10), secretMats.gold, 0.6, 1.4, 0); for (const s of [-1, 1]) add(new THREE.ConeGeometry(0.06, 0.4, 8), secretMats.gold, 0.6, 1.75, s * 0.12, 0, -0.5); for (const [x, z] of [[-0.35, -0.2], [-0.35, 0.2], [0.35, -0.2], [0.35, 0.2]]) add(new THREE.CylinderGeometry(0.06, 0.06, 0.45, 8), secretMats.gold, x, 0.65, z); }
  else if (id === 'fisch') { add(new THREE.SphereGeometry(0.4, 14, 10), secretMats.gold, 0, 1.2, 0).scale.set(1.4, 0.8, 0.5); add(new THREE.ConeGeometry(0.3, 0.5, 4), secretMats.gold, -0.75, 1.2, 0, 0, Math.PI / 2); add(new THREE.CylinderGeometry(0.08, 0.1, 0.5, 8), secretMats.stone, 0, 0.75, 0); }
  else { add(new THREE.BoxGeometry(0.9, 0.9, 0.9), secretMats.purple, 0, 0.95, 0); add(new THREE.BoxGeometry(0.95, 0.12, 0.95), secretMats.gold, 0, 1.0, 0); add(new THREE.TorusGeometry(0.22, 0.05, 6, 12, Math.PI * 1.3), secretMats.gold, 0, 1.25, 0.47); }
  return g;
}
function spawnSecrets() {
  M.secretObjs = SECRETS.map(s => { const m = makeSecretMesh(s.id); m.position.set(s.x, s.y, s.z); ZR.scene.add(m); return { s, m, taken: false }; });
}
function clearSecrets() { for (const o of M.secretObjs || []) ZR.scene.remove(o.m); M.secretObjs = []; }
function updateSecrets(dt) {
  const p = M.player; if (!p || !M.secretObjs) return;
  for (const o of M.secretObjs) {
    if (o.taken) continue; o.m.rotation.y += dt * 0.8; const d2 = dist2(o.s.x, o.s.z, p.x, p.z);
    if (d2 < 3600 && Math.random() < dt * 5) FX.spawn(o.s.x + rand(-0.6, 0.6), o.s.y + rand(0.6, 1.8), o.s.z + rand(-0.6, 0.6), 0, 0.9, 0, 1, 0.85, 0.3, 0.9, 0.16);
    if (p.alive && p.mode === 'ground' && d2 < 5 && Math.abs(p.y - o.s.y) < 3) {
      o.taken = true; ZR.scene.remove(o.m); const first = !(Profile.secrets || {})[o.s.id]; Profile.secrets = Profile.secrets || {}; Profile.secrets[o.s.id] = true; saveProfile();
      M.stats.secrets = (M.stats.secrets || 0) + 1; UI.banner('GEHEIMNIS GEFUNDEN: ' + o.s.name.toUpperCase() + '!', 'gold'); Audio.chest(); FX.burst(o.s.x, o.s.y + 1.2, o.s.z, 60, 1, 0.85, 0.3, 6, 1.2, 0.3);
      const wk = pick(['heavy', 'ar', 'pump', 'hunt', 'rpg', 'tac']); spawnItem(wk, 4, WEAPONS[wk].mag, o.s.x + 1.2, o.s.y + 0.5, o.s.z); spawnItem(WEAPONS[wk].ammo, 0, AMMO[WEAPONS[wk].ammo].box * 2, o.s.x - 1.2, o.s.y + 0.5, o.s.z);
      spawnItem('ziegenmilch', 0, 1, o.s.x, o.s.y + 0.5, o.s.z + 1.2); spawnItem('brause', 0, 2, o.s.x, o.s.y + 0.5, o.s.z - 1.2); updateItemMeshes(p.x, p.z);
      if (first) UI.toast('Neu in deiner Sammlung: ' + o.s.name + ' (' + secretCount() + '/3)', '#ffd447');
    }
  }
}
