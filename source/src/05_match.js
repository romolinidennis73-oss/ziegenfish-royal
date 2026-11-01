// ============ Match: Figuren, Physik, Kampf, Loot, Sturm, Zeppelin ============
const G = 22, STEP = 0.55, RAD = 0.38;
const M = { state: 'menu', chars: [], items: [], grenades: [], chestObjs: [], time: 0, player: null, feed: [], shots: [], aliveCount: 100, ended: false, lobbyT: 0 };
const BOT_NAMES = ['Kevin_Pro', 'MeckerMax', 'Blubb3000', 'SturmKlaus', 'xXLamaXx', 'HeuballenHans', 'NoScopeNora', 'PumpPaula', 'KäseKönig', 'Zickzack77', 'TurboTom', 'Lagerfeuer', 'BergBernd', 'SeeSandra', 'Wurstwasser', 'Fischstäbchen', 'GurkenGustav', 'Bockwurst99', 'LeiseLisa', 'Schildkröte', 'ZonenZoe', 'KistenKarl', 'Rakete_Rolf', 'NebelNina', 'Hüpfburg', 'Pommesgabel', 'Tarnkappe', 'Moosbart', 'ZuckerZack', 'Kraxler', 'Lötkolben', 'Gummistiefel', 'Dachlatte', 'Kopfschuss_K', 'Brezelbub', 'MilchMonster', 'Waldschrat', 'Sandsturm', 'Flinke_Flo', 'HeckenHeidi', 'Tankwart', 'Kranführer', 'Raclette', 'Älplermagronen', 'Bergziege', 'Seehund', 'Schneckentempo', 'Joghurtbecher', 'Kuhglocke', 'Panzerknacker', 'Funkelfee', 'Kartoffelkanone', 'Nachtfalke', 'Igel_Ingo', 'Bratwurst', 'Pixelpirat', 'Mampfred', 'Laserlurch', 'Duschvorhang', 'Wackelpudding', 'Zahnrad', 'Kometen_Kai', 'Glitzerglatze', 'Bananenbrot', 'Echo_Emil', 'Fliegenpilz', 'Rasenmäher', 'Spaghetti_Sam', 'Wolkenkratzer', 'Döner_Dieter', 'Flitzpiepe', 'SchrotSchorsch', 'Muckibude', 'Teekesselchen', 'Zwiebelring', 'Kaktus_Karla', 'Blitzbirne', 'Rostlaube', 'Trampolin', 'Grummel', 'Haifischflosse', 'Pfannkuchen', 'Quarkkeule', 'Rührei', 'Socken_Susi', 'Tintenfisch', 'Uhu_Uwe', 'Vogelscheuche', 'Walross', 'Yeti_Yannik', 'Zitronenfalter', 'Gipfelstürmer', 'Krawallkeks', 'Lakritz', 'Murmeltier', 'Nougat', 'Ofenkartoffel', 'Paprika', 'Quokka'];
const PERSONAS = ['aggressiv', 'defensiv', 'vorsichtig', 'sammler', 'jäger'];
const DIFF = { leicht: { err: 6.5, react: 1.0, pdmg: 0.3, think: 0.45, perr: 6, preact: 0.8 }, mittel: { err: 4.0, react: 0.65, pdmg: 0.45, think: 0.3, perr: 4, preact: 0.6 }, schwer: { err: 2.2, react: 0.38, pdmg: 0.7, think: 0.2, perr: 2, preact: 0.3 } };

function newChar(name, skin, isPlayer) {
  const c = {
    name, skin, isPlayer, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, yaw: 0, pitch: 0, hp: 100, shield: 0, alive: true, onGround: false, crouch: false, sprint: false,
    slots: [null, null, null, null, null], sel: 0, ammo: { leicht: 0, mittel: 0, schwer: 0, schrot: 0 }, reloadT: 0, fireCD: 0, burstLeft: 0, bloom: 0, recoilT: 0,
    id: (M._id = (M._id || 0) + 1), healT: 0, healKey: null, kills: 0, dmgDone: 0, hitT: 0, mode: 'lobby', animSpeed: 0, model: null, inWater: false, stepT: 0, glider: null, deathT: 0, placement: 0
  };
  c.model = makeCharacter(skin, isPlayer); ZR.scene.add(c.model.root); return c;
}
function curSlot(c) { return c.slots[c.sel]; }
function curWeapon(c) { const s = c.slots[c.sel]; return s && WEAPONS[s.key] ? s : null; }
function syncHeld(c) { const s = c.slots[c.sel]; c.gunKey = s ? s.key : null; c.gunRar = s ? s.rar || 0 : 0; }

// ---------------- Bewegung / Kollision ----------------
function resolveXZ(c) {
  const feet = c.y, head = c.y + (c.crouch ? 1.2 : 1.8);
  for (let it = 0; it < 2; it++) {
    boxesNear(c.x, c.z, 2, _near);
    for (const b of _near) {
      if (b.y1 <= feet + STEP || b.y0 >= head) continue;
      const px = clamp(c.x, b.x0, b.x1), pz = clamp(c.z, b.z0, b.z1); let dx = c.x - px, dz = c.z - pz; const d2 = dx * dx + dz * dz;
      if (d2 >= RAD * RAD) continue;
      if (d2 > 1e-8) { const d = Math.sqrt(d2), push = RAD - d; c.x += dx / d * push; c.z += dz / d * push; const vn = (c.vx * dx + c.vz * dz) / d; if (vn < 0) { c.vx -= vn * dx / d; c.vz -= vn * dz / d; } c.blocked = true; }
      else { // innerhalb: kürzeste Achse
        const l = c.x - b.x0, r = b.x1 - c.x, f = c.z - b.z0, k = b.z1 - c.z, m = Math.min(l, r, f, k);
        if (m === l) c.x = b.x0 - RAD; else if (m === r) c.x = b.x1 + RAD; else if (m === f) c.z = b.z0 - RAD; else c.z = b.z1 + RAD; c.blocked = true;
      }
    }
  }
}
function moveChar(c, wx, wz, dt, simple) {
  const k = Math.min(1, dt * (c.onGround ? 12 : 2.5)); c.vx += (wx - c.vx) * k; c.vz += (wz - c.vz) * k;
  const y0 = c.y; c.x += c.vx * dt; c.z += c.vz * dt; c.blocked = false;
  if (!simple) resolveXZ(c);
  // Grenzen
  if (M.state === 'lobby') { c.x = clamp(c.x, -33, 33); c.z = clamp(c.z, LOBBY.z - 33, LOBBY.z + 33); }
  else { const r = Math.hypot(c.x, c.z); if (r > W.BOUND) { c.x *= W.BOUND / r; c.z *= W.BOUND / r; } }
  c.vy -= G * dt; c.y += c.vy * dt;
  const g = simple ? heightAt(c.x, c.z) : groundAt(c.x, c.z, y0, STEP, 0.25);
  if (c.y <= g) { if (!c.onGround && c.vy < -16 && c.isPlayer) Audio.step(0); c.y = g; c.vy = 0; c.onGround = true; }
  else if (c.onGround && c.vy <= 0 && y0 - g < 0.65) { c.y = g; c.vy = 0; }
  else c.onGround = false;
  if (!simple && c.vy > 0) { // Decke
    const hh = c.crouch ? 1.2 : 1.8; boxesNear(c.x, c.z, 1, _near);
    for (const b of _near) if (c.x > b.x0 - 0.2 && c.x < b.x1 + 0.2 && c.z > b.z0 - 0.2 && c.z < b.z1 + 0.2 && b.y0 > y0 + 1 && b.y0 < c.y + hh) { c.y = b.y0 - hh; c.vy = 0; }
  }
  // Wasser
  const wl = waterAt(c.x, c.z); c.inWater = false;
  if (M.state !== 'lobby' && g < wl - 1.25 && c.y < wl - 1.25) { c.y = wl - 1.25; c.vy = Math.max(c.vy, 0); c.onGround = true; c.inWater = true; }
  else if (g < wl - 0.3 && c.y < wl) c.inWater = true;
  if (M.state === 'lobby' && c.y < LOBBY.y - 10) { c.x = rand(-20, 20); c.z = LOBBY.z + rand(-20, 20); c.y = LOBBY.y + 2; c.vy = 0; }
}

// ---------------- Treffer & Schaden ----------------
function rayChar(c, ox, oy, oz, dx, dy, dz, maxT) {
  const crouchOff = c.crouch ? 0.45 : 0; let best = Infinity, head = false;
  // Kopf (Kugel)
  const hx = c.x, hy = c.y + 1.68 - crouchOff, hz = c.z, R = 0.25;
  { const fx = ox - hx, fy = oy - hy, fz = oz - hz; const b = fx * dx + fy * dy + fz * dz, cc = fx * fx + fy * fy + fz * fz - R * R, disc = b * b - cc; if (disc >= 0) { const t = -b - Math.sqrt(disc); if (t > 0 && t < maxT) { best = t; head = true; } } }
  // Körper (Zylinder)
  const a = dx * dx + dz * dz; if (a > 1e-6) {
    const fx = ox - c.x, fz = oz - c.z, r = 0.45, b = 2 * (fx * dx + fz * dz), cc = fx * fx + fz * fz - r * r, disc = b * b - 4 * a * cc;
    if (disc >= 0) { const sq = Math.sqrt(disc); for (const t of [(-b - sq) / (2 * a), (-b + sq) / (2 * a)]) { if (t <= 0 || t >= maxT) continue; const y = oy + dy * t; if (y >= c.y && y <= c.y + 1.48 - crouchOff) { if (t < best - 0.05) { best = t; head = false; } break; } } }
  }
  return best < Infinity ? { t: best, head } : null;
}
function shootRay(sh, ox, oy, oz, dx, dy, dz, range, dmg, headMult, wkey) {
  const maxD = range * 2.2; const wt = rayWorld(ox, oy, oz, dx, dy, dz, maxD);
  let hit = null, ht = wt;
  for (const c of M.chars) {
    if (c === sh || !c.alive || c.mode === 'bus') continue; const ex = c.x - ox, ez = c.z - oz; const along = ex * dx + ez * dz; if (along < -1 || along > ht + 1) continue;
    const perp2 = ex * ex + ez * ez - along * along; if (perp2 > 4) continue;
    const r = rayChar(c, ox, oy, oz, dx, dy, dz, ht); if (r && r.t < ht) { ht = r.t; hit = { c, head: r.head }; }
  }
  const px = ox + dx * ht, py = oy + dy * ht, pz = oz + dz * ht;
  if (hit) {
    const f = ht <= range ? 1 : Math.max(0.2, 1 - (ht - range) / (range * 1.2));
    const shieldBefore = hit.c.shield; damage(hit.c, dmg * f * (hit.head ? headMult : 1), sh, wkey, hit.head);
    FX.impact(px, py, pz, shieldBefore > 0 ? 'shield' : 'body');
  } else if (ht < maxD) { FX.impact(px, py, pz, 'world'); }
  return { x: px, y: py, z: pz, hit };
}
function damage(t, amt, att, wkey, head) {
  if (!t.alive || M.state === 'lobby' || M.ended && !t.isPlayer) return;
  if (t.isPlayer && att && !att.isPlayer) amt *= DIFF[Settings.difficulty].pdmg;
  else if (att && !att.isPlayer && !t.isPlayer) amt *= 0.3; // Bots untereinander etwas langsamer, damit das Match länger spannend bleibt
  if (t.isPlayer && M.godMode) amt = 0;
  amt = Math.max(1, Math.round(amt)); let left = amt; let shieldHit = false;
  if (t.shield > 0) { const s = Math.min(t.shield, left); t.shield -= s; left -= s; shieldHit = true; }
  t.hp -= left; t.hitT = 0.25; t.lastAtt = att; t.lastHitTime = M.time;
  if (att) att.dmgDone += amt;
  if (att && att.isPlayer) { FX.dmgNum(t.x, t.y + 2, t.z, amt, head, shieldHit && left === 0); UI.hitmarker(head); if (shieldHit && left === 0) Audio.shieldHit(); else Audio.hit(head); }
  if (t.isPlayer) { Audio.hurt(); UI.hurt(att); }
  if (!t.isPlayer && att) { t.threat = att; t.threatT = M.time; }
  if (t.hp <= 0) eliminate(t, att, wkey);
}
function eliminate(t, killer, wkey) {
  t.alive = false; t.hp = 0; t.deathT = 0.01; M.aliveCount = M.chars.filter(c => c.alive).length; t.placement = M.aliveCount + 1;
  FX.eliminate(t.x, t.y, t.z, (t.skin.glow || t.skin.accent));
  dropAll(t);
  const how = !killer ? (t.stormKill ? 'im Sturm verschwunden' : 'ausgeschieden') : null;
  UI.feed(killer, t, wkey, how);
  (M.killLog || (M.killLog = {}))[wkey || 'x'] = (M.killLog[wkey || 'x'] || 0) + 1;
  if (killer) { killer.kills++; if (killer.isPlayer) { Audio.elim(); UI.banner(pick(['ELIMINIERT  ', 'MÄH-BLUB!  ', 'EINGEFISCHT  ']) + t.name, 'elim'); UI.killPop(killer); M.stats.wk[wkey] = (M.stats.wk[wkey] || 0) + 1; } }
  if (t.isPlayer) { M.ended = true; setTimeout(() => endMatch(false), 1800); }
  else if (M.aliveCount === 1 && M.player.alive && !M.ended) { M.ended = true; setTimeout(() => endMatch(true), 1200); }
}
function dropAll(c) {
  const base = (i) => [c.x + Math.cos(i * 1.3) * 1.3, c.z + Math.sin(i * 1.3) * 1.3]; let i = 0;
  for (const s of c.slots) if (s) { const [x, z] = base(i++); spawnItem(s.key, s.rar || 0, s.n != null ? s.n : s.mag, x, c.y + 0.5, z); }
  for (const a in c.ammo) if (c.ammo[a] > 0) { const [x, z] = base(i++); spawnItem(a, 0, Math.min(c.ammo[a], 120), x, c.y + 0.5, z); }
  c.slots = [null, null, null, null, null]; c.ammo = { leicht: 0, mittel: 0, schwer: 0, schrot: 0 };
}

// ---------------- Waffen benutzen ----------------
const _v = new THREE.Vector3();
function weaponUpdate(c, dt) {
  c.fireCD -= dt; c.recoilT = Math.max(0, c.recoilT - dt * 4); c.bloom = Math.max(0, c.bloom - dt * 3);
  const s = curWeapon(c);
  if (c.reloadT > 0) {
    c.reloadT -= dt; if (!s) { c.reloadT = 0; return; }
    if (c.reloadT <= 0) { const w = WEAPONS[s.key]; const need = w.mag - s.mag, got = Math.min(need, c.ammo[w.ammo]); s.mag += got; c.ammo[w.ammo] -= got; }
  }
  if (c.healT > 0) {
    c.healT -= dt; const it = ITEMS[c.healKey]; const s2 = curSlot(c);
    if (!s2 || s2.key !== c.healKey) { c.healT = 0; return; }
    if (c.healT <= 0) {
      if (it.heal) c.hp = Math.min(Math.max(c.hp, it.maxHp), Math.min(c.hp + it.heal, it.maxHp));
      if (it.shield) c.shield = Math.min(Math.max(c.shield, it.maxShield), Math.min(c.shield + it.shield, it.maxShield));
      s2.n--; if (s2.n <= 0) { c.slots[c.sel] = null; syncHeld(c); } if (c.isPlayer) Audio.heal();
    }
  }
}
function startReload(c) {
  const s = curWeapon(c); if (!s || c.reloadT > 0) return; const w = WEAPONS[s.key]; if (s.mag >= w.mag || c.ammo[w.ammo] <= 0) return;
  c.reloadT = wStat(s.key, s.rar).reload; c.burstLeft = 0; if (c.isPlayer) Audio.reload(s.key); else if (M.player && dist2(c.x, c.z, M.player.x, M.player.z) < 900) Audio.reload(s.key);
}
function canUseItem(c, key) { const it = ITEMS[key]; if (!it || it.throw) return false; if (it.heal) return c.hp < it.maxHp; if (it.shield) return c.shield < it.maxShield; return false; }
function useItem(c) {
  const s = curSlot(c); if (!s || !ITEMS[s.key] || c.healT > 0) return false;
  if (ITEMS[s.key].throw) { if (c.fireCD > 0) return false; throwGrenade(c); s.n--; if (s.n <= 0) { c.slots[c.sel] = null; syncHeld(c); } c.fireCD = 1.0; return true; }
  if (!canUseItem(c, s.key)) { if (c.isPlayer) UI.toast(ITEMS[s.key].heal ? 'Leben ist schon voll' : 'Schild ist schon voll'); c.fireCD = 0.5; return false; }
  c.healT = ITEMS[s.key].use; c.healKey = s.key; return true;
}
// feuert einmal in Richtung (dx,dy,dz) ab Mündung (ox,oy,oz); liefert true wenn geschossen
function fire(c, ox, oy, oz, dx, dy, dz, extraErr = 0) {
  const s = curWeapon(c);
  if (!s) { // Faustschlag
    if (c.fireCD > 0) return false; c.fireCD = 0.55; c.recoilT = 0.25;
    for (const t of M.chars) { if (t === c || !t.alive) continue; const ex = t.x - c.x, ez = t.z - c.z; const d = Math.hypot(ex, ez); if (d < 2.0 && (ex * dx + ez * dz) / (d + 1e-6) > 0.5 && Math.abs(t.y - c.y) < 1.5) { damage(t, c.isPlayer ? 20 : 12, c, 'faust', false); FX.impact(t.x, t.y + 1.2, t.z, 'body'); break; } }
    if (c.isPlayer) Audio.jump(); return true;
  }
  const w = WEAPONS[s.key]; if (c.fireCD > 0 || c.reloadT > 0 || c.healT > 0) return false;
  if (s.mag <= 0) { if (c.ammo[w.ammo] > 0) startReload(c); else if (c.isPlayer) { Audio.empty(); c.fireCD = 0.3; UI.toast('Keine Munition!'); } return false; }
  const st = wStat(s.key, s.rar); const ads = c.isPlayer && c.ads;
  let spread = (w.scope ? (ads ? st.spread : w.hipSpread) : st.spread * (ads ? 0.55 : 1.0)) + c.bloom;
  const mv = Math.hypot(c.vx, c.vz); spread *= (1 + mv / 9 * 0.6) * (c.onGround ? 1 : 1.8) * (c.crouch ? 0.7 : 1); spread += extraErr;
  // Zielhilfe für den Spieler: Schuss wird zum Gegner in Blickrichtung gelenkt
  let assisted = null;
  if (c.isPlayer) { const A = AIM[Settings.aimAssist]; assisted = assistTarget(c, ox, oy, oz, dx, dy, dz, w.range * 1.4, A.cone * Settings.aimRadius, A.head); if (assisted) { dx = assisted.dx; dy = assisted.dy; dz = assisted.dz; spread *= w.pellets ? Math.max(0.35, A.spread) : A.spread; } }
  const pel = w.pellets || 1; const sr = spread * DEG;
  // Orthonormalbasis
  const ux = -dz, uz = dx, ul = Math.hypot(ux, uz) || 1; const rx = ux / ul, rz = uz / ul; const vx2 = -dy * rz, vy2 = dz * rx - dx * rz, vz2 = dy * rx; // up ≈ dir × right
  const pdist = M.player ? Math.hypot(c.x - M.player.x, c.z - M.player.z) : 0;
  let endP = null;
  for (let p = 0; p < pel; p++) {
    const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * Math.tan(sr);
    let ex = dx + (rx * Math.cos(a) + vx2 * Math.sin(a)) * r, ey = dy + (vy2 * Math.sin(a)) * r, ez = dz + (rz * Math.cos(a) + vz2 * Math.sin(a)) * r; const L = Math.hypot(ex, ey, ez); ex /= L; ey /= L; ez /= L;
    const res = shootRay(c, ox, oy, oz, ex, ey, ez, w.range, st.dmg, w.head, s.key); endP = res;
    if (pdist < 160 && (p < 3 || c.isPlayer)) FX.tracer(ox, oy, oz, res.x, res.y, res.z);
  }
  s.mag--; c.recoilT = 0.25; c.bloom = Math.min(c.bloom + (w.pellets ? 0 : w.scope ? 2 : 0.35), 4);
  if (w.burst) { if (c.burstLeft <= 0) c.burstLeft = w.burst; c.burstLeft--; c.fireCD = c.burstLeft > 0 ? 1 / w.rate : w.burstDelay; }
  else c.fireCD = 1 / w.rate;
  if (pdist < 160) FX.flash(ox + dx * 0.6, oy + dy * 0.6, oz + dz * 0.6, w.pellets ? 1.0 : 0.7);
  Audio.shot(w.snd, c.isPlayer ? 0 : pdist);
  if (c.isPlayer) { UI.kick(w); }
  M.shots.push({ x: c.x, z: c.z, t: M.time, by: c });
  if (s.mag <= 0 && c.ammo[w.ammo] > 0) setTimeout(() => { if (c.alive && curWeapon(c) === s) startReload(c); }, 250);
  return true;
}
// ---------------- Granaten ----------------
let grenadeGeo = null;
function assistTarget(c, ox, oy, oz, dx, dy, dz, range, coneDeg, headP = 0.18) {
  let best = null, bs = Math.cos(coneDeg * DEG);
  for (const t of M.chars) {
    if (t === c || !t.alive || t.mode !== 'ground') continue; const head = Math.random() < headP;
    const tx = t.x - ox, ty = t.y + (head ? 1.62 : 1.05) - (t.crouch ? 0.4 : 0) - oy, tz = t.z - oz, L = Math.hypot(tx, ty, tz); if (L > range || L < 0.3) continue;
    // nahe Gegner bekommen einen größeren Kegel
    const cosA = (tx * dx + ty * dy + tz * dz) / L; const bonus = L < 15 ? 0.06 : L < 30 ? 0.02 : 0; if (cosA + bonus < bs) continue;
    if (!lineOfSight(ox, oy, oz, t.x, t.y + 1.1, t.z)) continue; bs = cosA + bonus; best = { t, dx: tx / L, dy: ty / L, dz: tz / L };
  }
  return best;
}
function throwGrenade(c) {
  const cp = Math.cos(c.pitch); const dx = Math.sin(c.yaw) * cp, dz = Math.cos(c.yaw) * cp, dy = Math.sin(c.pitch);
  const m = itemMesh('granate', 0); ZR.scene.add(m);
  M.grenades.push({ x: c.x + dx * 0.6, y: c.y + 1.6, z: c.z + dz * 0.6, vx: dx * 17 + c.vx * 0.5, vy: dy * 17 + 5, vz: dz * 17 + c.vz * 0.5, t: 2.3, by: c, m });
  if (c.isPlayer) Audio.jump();
}
function updateGrenades(dt) {
  for (let i = M.grenades.length - 1; i >= 0; i--) {
    const g = M.grenades[i]; g.t -= dt; g.vy -= G * dt;
    const nx = g.x + g.vx * dt, ny = g.y + g.vy * dt, nz = g.z + g.vz * dt;
    const sp = Math.hypot(g.vx, g.vy, g.vz); if (sp > 0.01) { const d = rayWorld(g.x, g.y, g.z, g.vx / sp, g.vy / sp, g.vz / sp, sp * dt + 0.15); if (d < sp * dt + 0.15) { // abprallen
      const gy = heightAt(nx, nz); if (ny <= gy + 0.2 || g.vy < 0 && groundAt(nx, nz, g.y, 0.3) >= ny - 0.2) { g.vy = Math.abs(g.vy) * 0.35; g.vx *= 0.6; g.vz *= 0.6; } else { g.vx *= -0.4; g.vz *= -0.4; }
    } else { g.x = nx; g.y = ny; g.z = nz; } }
    const gr = groundAt(g.x, g.z, g.y + 0.3, 0.3); if (g.y < gr + 0.1) { g.y = gr + 0.1; g.vy = Math.abs(g.vy) * 0.3; g.vx *= 0.7; g.vz *= 0.7; }
    g.m.position.set(g.x, g.y, g.z); g.m.rotation.x += dt * 8;
    if (g.t <= 0) { explode(g.x, g.y, g.z, g.by, 'granate'); ZR.scene.remove(g.m); M.grenades.splice(i, 1); }
  }
}
function explode(x, y, z, by, wkey) {
  const it = ITEMS.granate; FX.explosion(x, y, z); const pd = M.player ? Math.hypot(M.player.x - x, M.player.z - z) : 999; Audio.explosion(pd); FX.shake = Math.max(FX.shake, clamp(1 - pd / 40, 0, 1) * 1.2);
  for (const c of M.chars) { if (!c.alive) continue; const d = Math.hypot(c.x - x, c.y + 1 - y, c.z - z); if (d > it.radius) continue; if (!lineOfSight(x, y + 0.5, z, c.x, c.y + 1.2, c.z)) continue; damage(c, it.dmg * (1 - d / it.radius * 0.7), by, wkey, false); }
  for (const ch of M.chestObjs) if (!ch.open && Math.hypot(ch.x - x, ch.z - z) < 3) openChest(ch, null);
}

// ---------------- Loot ----------------
function rollRarity(bias = 0) { const r = Math.random() * 100 - bias; return r < 3 ? 4 : r < 12 ? 3 : r < 30 ? 2 : r < 60 ? 1 : 0; }
const WEAPON_POOL = ['ar', 'ar', 'ar', 'tac', 'tac', 'smg', 'smg', 'rsmg', 'pump', 'pump', 'pump', 'tsg', 'tsg', 'bolt', 'semi', 'pistol', 'pistol', 'pistol'];
const ITEM_POOL = ['medkit', 'bandage', 'bandage', 'smallshield', 'smallshield', 'smallshield', 'bigshield', 'bigshield', 'granate', 'granate'];
function spawnItem(key, rar, n, x, y, z) {
  const g = groundAt(x, z, y + 0.3, 0.6, 0); const it = { key, rar, n, x, y: g, z, m: null, alive: true, born: M.time, bob: Math.random() * 6 };
  M.items.push(it); return it;
}
function spawnRandomLoot(x, y, z, quality = 0) {
  const r = Math.random();
  if (r < 0.5) { const k = pick(WEAPON_POOL); const w = WEAPONS[k]; spawnItem(k, rollRarity(quality), w.mag, x, y, z); spawnItem(w.ammo, 0, AMMO[w.ammo].box, x + 0.8, y, z + 0.3); }
  else if (r < 0.78) { const k = pick(ITEM_POOL); spawnItem(k, 0, k === 'bandage' ? 5 : k === 'granate' ? 3 : 1, x, y, z); }
  else { const a = pick(['leicht', 'mittel', 'schwer', 'schrot', 'mittel', 'leicht']); spawnItem(a, 0, AMMO[a].box, x, y, z); }
}
let chestGeo = null, lidGeo = null; const chestGlowMat = new THREE.MeshBasicMaterial({ vertexColors: true });
function makeChestMesh() {
  if (!chestGeo) {
    chestGeo = partGeo((b, gl) => { bx(b, 0, 0.25, 0, 0.9, 0.5, 0.55, 0x4a2810); bx(b, 0, 0.47, -0.27, 0.94, 0.06, 0.05, 0xc8901a); bx(b, 0, 0.47, 0.27, 0.94, 0.06, 0.05, 0xc8901a); bx(b, -0.44, 0.47, 0, 0.06, 0.06, 0.59, 0xc8901a); bx(b, 0.44, 0.47, 0, 0.06, 0.06, 0.59, 0xc8901a); bx(gl, 0, 0.4, 0.285, 0.14, 0.16, 0.02, 0xffd447); bx(b, -0.45, 0.25, 0, 0.04, 0.5, 0.6, 0xc8901a); bx(b, 0.45, 0.25, 0, 0.04, 0.5, 0.6, 0xc8901a); bx(b, 0, 0.03, 0, 0.94, 0.06, 0.59, 0x6a4520); bx(gl, 0, 0.504, 0, 0.8, 0.006, 0.46, 0xffd23a); bx(gl, -0.15, 0.506, 0.05, 0.22, 0.006, 0.16, 0xfff3b0); bx(gl, 0.2, 0.506, -0.08, 0.16, 0.006, 0.14, 0xfff3b0); });
    // Deckel: Drehpunkt an der hinteren Oberkante
    lidGeo = partGeo((b, gl) => { bx(b, 0, 0.09, 0.28, 0.92, 0.16, 0.58, 0x4a2810); bx(b, 0, 0.18, 0.28, 0.96, 0.05, 0.6, 0xc8901a); bx(b, -0.3, 0.1, 0.28, 0.06, 0.18, 0.61, 0xc8901a); bx(b, 0.3, 0.1, 0.28, 0.06, 0.18, 0.61, 0xc8901a); bx(gl, 0, 0.06, 0.585, 0.12, 0.08, 0.02, 0xffd447); });
  }
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, metalness: 0.25, emissive: 0x140a00 });
  const g = new THREE.Group(); const m = new THREE.Mesh(chestGeo.main, mat); m.castShadow = true; g.add(m); g.add(new THREE.Mesh(chestGeo.glow, chestGlowMat));
  const lid = new THREE.Group(); lid.position.set(0, 0.5, -0.28); const lm = new THREE.Mesh(lidGeo.main, mat); lm.castShadow = true; lid.add(lm); lid.add(new THREE.Mesh(lidGeo.glow, chestGlowMat)); g.add(lid); g.userData.lid = lid;
  return g;
}
function openChest(ch, by) {
  if (ch.open) return; ch.open = true; ch.t = 0; ch.by = by; ch.looted = false;
  FX.burst(ch.x, ch.y + 0.7, ch.z, 30, 1.0, 0.85, 0.3, 2.6, 0.8, 0.25);
  if (by && by.isPlayer) { Audio.chest(); UI.toast && UI.toast('Truhe geöffnet!', '#ffd447'); }
}
function chestLoot(ch) {
  const S = (key, rar, n, dx, dz) => { const it = spawnItem(key, rar, n, ch.x + dx, ch.y + 0.5, ch.z + dz); it.pop = { t0: M.time, sx: ch.x, sy: ch.y + 0.6, sz: ch.z }; };
  const r = Math.random(); if (r < 0.55) { const wk = pick(WEAPON_POOL); S(wk, rollRarity(30), WEAPONS[wk].mag, 1.2, 0.6); S(WEAPONS[wk].ammo, 0, AMMO[WEAPONS[wk].ammo].box, -1.2, 0.6); }
  else { const k = pick(ITEM_POOL); S(k, 0, k === 'bandage' ? 5 : k === 'granate' ? 2 : 1, 1.2, 0.6); }
  const k = pick(ITEM_POOL); S(k, 0, k === 'bandage' ? 5 : k === 'granate' ? 2 : 1, -0.9, 1.3);
  const a = pick(['leicht', 'mittel', 'schwer', 'schrot']); S(a, 0, AMMO[a].box, 0.3, 1.5);
  if (Math.random() < 0.6) { const wk = pick(WEAPON_POOL); S(wk, rollRarity(35), WEAPONS[wk].mag, 1.4, -0.6); S(WEAPONS[wk].ammo, 0, AMMO[WEAPONS[wk].ammo].box, -1.4, -0.6); }
  if (M.player) updateItemMeshes(M.player.x, M.player.z);
}
// Deckel-Animation, Glitzern, Loot-Auswurf
function updateChests(dt) {
  chestGlowMat.color.setScalar(0.75 + Math.sin(M.time * 4) * 0.25);
  const p = M.player;
  for (const ch of M.chestObjs) {
    if (!ch.open) { if (p && dist2(ch.x, ch.z, p.x, p.z) < 400 && Math.random() < dt * 2.5) FX.burst(ch.x + rand(-0.4, 0.4), ch.y + 0.75, ch.z + rand(-0.3, 0.3), 1, 1.0, 0.85, 0.35, 0.6, 0.5, 0.12); continue; }
    if (ch.t > 3) continue; ch.t += dt;
    const k = clamp(ch.t / 0.45, 0, 1), e = 1 + 2.2 * Math.pow(k - 1, 3) + 1.2 * Math.pow(k - 1, 2); // easeOutBack
    ch.m.userData.lid.rotation.x = -e * 1.85;
    if (!ch.looted && ch.t > 0.22) { ch.looted = true; chestLoot(ch); FX.burst(ch.x, ch.y + 0.8, ch.z, 26, 1.0, 0.9, 0.4, 4, 0.9, 0.2); }
  }
}
const beamGeo = new THREE.CylinderGeometry(0.05, 0.12, 2.2, 6, 1, true); const ringGeo = new THREE.RingGeometry(0.45, 0.6, 24); const beamMats = RARITY.map(r => new THREE.MeshBasicMaterial({ color: r.hex, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false }));
function updateItemMeshes(px, pz) {
  for (const it of M.items) {
    if (!it.alive) continue; const near = dist2(it.x, it.z, px, pz) < 75 * 75;
    if (near && !it.m) { it.m = new THREE.Group(); const im = itemMesh(it.key, it.rar || 0); im.scale.setScalar(isWeapon(it.key) ? 1.6 : 1.8); it.m.add(im); if (isWeapon(it.key)) { const bm = new THREE.Mesh(beamGeo, beamMats[it.rar]); bm.scale.y = 1 + it.rar * 0.6; bm.position.y = 1.1 * bm.scale.y; it.m.add(bm); const ring = new THREE.Mesh(ringGeo, beamMats[it.rar]); ring.rotation.x = -Math.PI / 2; ring.position.y = -0.35; it.m.add(ring); } it.m.position.set(it.x, it.y + 0.4, it.z); ZR.scene.add(it.m); }
    else if (!near && it.m) { ZR.scene.remove(it.m); it.m = null; }
  }
}
function removeItem(it) { it.alive = false; if (it.m) { ZR.scene.remove(it.m); it.m = null; } }
// Aufheben (Spieler & Bots). Gibt true zurück wenn aufgenommen. swap=true erzwingt Tausch mit aktuellem Slot
function tryPickup(c, it, swap) {
  if (!it.alive) return false;
  if (AMMO[it.key]) { c.ammo[it.key] = Math.min(999, c.ammo[it.key] + it.n); removeItem(it); if (c.isPlayer) { Audio.pickup(); UI.toast('+' + it.n + ' ' + AMMO[it.key].name); } return true; }
  if (ITEMS[it.key]) {
    const st = ITEMS[it.key].stack; for (const s of c.slots) if (s && s.key === it.key && s.n < st) { const add = Math.min(st - s.n, it.n); s.n += add; it.n -= add; if (it.n <= 0) { removeItem(it); if (c.isPlayer) { Audio.pickup(); UI.toast(ITEMS[it.key].name); } return true; } }
  }
  let idx = c.slots.findIndex(s => !s);
  if (idx < 0) { if (!swap) return false; idx = c.sel; const old = c.slots[idx]; const d = spawnItem(old.key, old.rar || 0, old.n != null ? old.n : old.mag, c.x - Math.sin(c.yaw) * 0.5, c.y + 0.3, c.z - Math.cos(c.yaw) * 0.5); d.noPick = c; d.noPickT = M.time + 3; c.reloadT = 0; c.healT = 0; }
  c.slots[idx] = WEAPONS[it.key] ? { key: it.key, rar: it.rar || 0, mag: it.n } : { key: it.key, n: it.n };
  if (!c.isPlayer && WEAPONS[it.key]) { const a = WEAPONS[it.key].ammo; c.ammo[a] = Math.min(999, c.ammo[a] + WEAPONS[it.key].mag * 2); }
  removeItem(it); if (c.isPlayer) { Audio.pickup(); UI.toast(itemName(it.key) + (WEAPONS[it.key] ? ' · ' + RARITY[it.rar || 0].name : ''), WEAPONS[it.key] ? RARITY[it.rar || 0].col : ''); if (!curSlot(c) || idx === c.sel) { c.sel = idx; } }
  syncHeld(c); return true;
}

// ---------------- Sturm ----------------
const STORM_PHASES = [[60, 50, 320, 1], [50, 45, 200, 2], [40, 40, 120, 4], [35, 35, 65, 6], [30, 30, 32, 8], [20, 30, 10, 10], [15, 25, 0, 12]];
const S = { phase: 0, mode: 'wait', t: 0, cx: 0, cz: 0, r: 560, fx: 0, fz: 0, fr: 560, tx: 0, tz: 0, tr: 320, dps: 1, mesh: null, tick: 0 };
function stormScale() { return Settings.duration === 'lang' ? 1.65 : 1; }
function initStorm() {
  if (!S.mesh) {
    const mat = new THREE.ShaderMaterial({
      transparent: true, side: THREE.DoubleSide, depthWrite: false, uniforms: { time: { value: 0 } },
      vertexShader: 'varying vec2 vUv; varying vec3 vW; void main(){ vUv = uv; vec4 w = modelMatrix*vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }',
      fragmentShader: `uniform float time; varying vec2 vUv; varying vec3 vW; void main(){ float a = atan(vW.z, vW.x);
        float n = sin(a*40.0 + time*1.5 + vW.y*0.05)*0.5+0.5; float n2 = sin(a*13.0 - time*0.8 + vW.y*0.12)*0.5+0.5;
        float bands = smoothstep(0.3,1.0, n*n2); vec3 c = mix(vec3(0.35,0.08,0.6), vec3(0.85,0.4,1.0), bands);
        float alpha = 0.38 + bands*0.25; alpha *= smoothstep(0.0, 0.05, vUv.y) * (1.0 - smoothstep(0.75, 1.0, vUv.y));
        float cd = distance(cameraPosition.xz, vW.xz); alpha *= mix(1.0, 0.1, smoothstep(40.0, 320.0, cd));
        gl_FragColor = vec4(c, alpha); }`
    });
    S.mesh = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 500, 96, 1, true), mat); S.mesh.position.y = 200; S.mesh.renderOrder = 5; ZR.scene.add(S.mesh);
  }
  S.phase = 0; S.mode = 'wait'; S.cx = S.fx = 0; S.cz = S.fz = 0; S.r = S.fr = 560; S.dps = 1; S.tick = 0;
  pickNextCircle(); S.t = STORM_PHASES[0][0] * stormScale(); S.mesh.visible = true;
}
function pickNextCircle() {
  const ph = STORM_PHASES[Math.min(S.phase, STORM_PHASES.length - 1)]; const nr = ph[2];
  for (let i = 0; i < 60; i++) {
    const maxOff = S.phase === 0 ? 140 : Math.max(0, S.r - nr) * 0.85; const a = Math.random() * 6.283, d = Math.sqrt(Math.random()) * maxOff;
    const x = S.cx + Math.cos(a) * d, z = S.cz + Math.sin(a) * d; if (heightAt(x, z) > 3 && heightAt(x, z) < 60 && Math.hypot(x, z) < 420 || i === 59) { S.tx = x; S.tz = z; break; }
  }
  S.tr = nr; S.dps = ph[3];
}
function updateStorm(dt) {
  S.t -= dt; const sc = stormScale();
  if (S.mode === 'wait' && S.t <= 0) { S.mode = 'shrink'; S.t = STORM_PHASES[S.phase][1] * sc; S.fx = S.cx; S.fz = S.cz; S.fr = S.r; S.dur = S.t; UI.banner('DER STURM ZIEHT ZU!', 'storm'); Audio.stormWarn(); }
  else if (S.mode === 'shrink') {
    const k = 1 - Math.max(S.t, 0) / S.dur; S.cx = lerp(S.fx, S.tx, k); S.cz = lerp(S.fz, S.tz, k); S.r = lerp(S.fr, S.tr, k);
    if (S.t <= 0) { S.phase++; if (S.phase < STORM_PHASES.length) { S.mode = 'wait'; S.t = STORM_PHASES[S.phase][0] * sc; pickNextCircle(); UI.banner('Neue sichere Zone auf der Karte', 'info'); } else { S.mode = 'final'; S.t = 9999; } }
  }
  S.mesh.visible = S.r < 545; S.mesh.position.x = S.cx; S.mesh.position.z = S.cz; S.mesh.scale.set(Math.max(S.r, 0.5), 1, Math.max(S.r, 0.5)); S.mesh.material.uniforms.time.value += dt;
  // Schaden jede Sekunde
  S.tick += dt; if (S.tick >= 1) {
    S.tick -= 1; const dmg = S.phase === 0 ? 1 : STORM_PHASES[Math.min(S.phase, STORM_PHASES.length - 1)][3];
    for (const c of M.chars) if (c.alive && (c.mode === 'ground') && Math.hypot(c.x - S.cx, c.z - S.cz) > S.r) { c.stormKill = true; damage(c, S.mode === 'final' ? 15 : dmg, null, 'sturm', false); c.stormKill = false; if (c.alive) c.hp = c.hp; }
  }
}
function inSafe(x, z, margin = 0) { return Math.hypot(x - S.cx, z - S.cz) < S.r - margin; }
function inNext(x, z, margin = 0) { return Math.hypot(x - S.tx, z - S.tz) < S.tr - margin; }

// ---------------- Startplattform (Warteraum) & Zeppelin ----------------
const LOBBY = { z: 900, y: 40 };
function buildLobby() {
  const y = LOBBY.y, z = LOBBY.z; const b = new Batch();
  b.box(-35, y - 3, z - 35, 35, y, z + 35, 0x3a4250); addCollider(-35, y - 3, z - 35, 35, y, z + 35, 'lobby');
  b.box(-35, y, z - 35, 35, y + 0.05, z + 35, 0x2c6f7f);
  for (let i = -30; i <= 30; i += 10) { b.box(i - 0.2, y, z - 35, i + 0.2, y + 0.07, z + 35, 0x5ff4ff); b.box(-35, y, z + i - 0.2, 35, y + 0.07, z + i + 0.2, 0x5ff4ff); }
  const plat = (x0, z0, x1, z1, h, col) => { b.box(x0, y, z0, x1, y + h, z1, col); addCollider(x0, y, z0, x1, y + h, z1, 'lobby'); };
  plat(-10, z - 10, -4, z - 4, 1, 0xf2c230); plat(4, z + 4, 10, z + 10, 2, 0xff2bd6); plat(-25, z + 15, -15, z + 25, 0.6, 0x4fc34a); plat(18, z - 25, 26, z - 17, 1.5, 0x3a9bff);
  for (let s = 0; s < 6; s++) plat(-30 + s * 1, z - 30, -29 + s * 1, z - 26, 0.3 * (s + 1), 0xdddddd);
  const m = b.build(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.2 })); ZR.scene.add(m); ZR.lobbyMesh = new THREE.Group(); ZR.scene.remove(m); ZR.lobbyMesh.add(m); ZR.scene.add(ZR.lobbyMesh); ZR.lobbyMesh.visible = false;
  // Schriftzug
  const c = document.createElement('canvas'); c.width = 1024; c.height = 256; const g = c.getContext('2d'); g.fillStyle = 'rgba(0,0,0,0)'; g.fillRect(0, 0, 1024, 256);
  g.font = '900 120px system-ui, sans-serif'; g.textAlign = 'center'; g.fillStyle = '#5ff4ff'; g.shadowColor = '#000'; g.shadowBlur = 20; g.fillText('ZIEGENFISCH', 512, 130); g.font = '900 70px system-ui'; g.fillStyle = '#f2c230'; g.fillText('ROYALE', 512, 220);
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; const sign = new THREE.Mesh(new THREE.PlaneGeometry(24, 6), new THREE.MeshBasicMaterial({ map: t, transparent: true, side: THREE.DoubleSide }));
  sign.position.set(0, y + 9, z + 34); sign.rotation.y = Math.PI; ZR.lobbyMesh.add(sign);
}
function buildZeppelin() {
  const g = new THREE.Group();
  const bodyM = new THREE.MeshStandardMaterial({ color: 0x18a3b5, roughness: 0.5, metalness: 0.2 }); const accM = new THREE.MeshStandardMaterial({ color: 0xf2c230, roughness: 0.5 });
  const darkM = new THREE.MeshStandardMaterial({ color: 0x2a2f38, roughness: 0.6 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 16), bodyM); body.scale.set(7, 7, 22); g.add(body);
  const belly = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 10), new THREE.MeshStandardMaterial({ color: 0xe8f4f2, roughness: 0.6 })); belly.scale.set(6.4, 5, 19); belly.position.y = -2.2; g.add(belly);
  // Fischschwanz
  const tail = new THREE.Mesh(new THREE.ConeGeometry(4, 9, 4), accM); tail.rotation.x = -Math.PI / 2; tail.scale.set(0.15, 1, 1); tail.position.z = -24; g.add(tail);
  const finTop = new THREE.Mesh(new THREE.BoxGeometry(0.4, 5, 6), accM); finTop.position.set(0, 7, -6); finTop.rotation.x = -0.4; g.add(finTop);
  for (const s of [-1, 1]) { const fin = new THREE.Mesh(new THREE.BoxGeometry(5, 0.4, 3), accM); fin.position.set(s * 7, -1, 5); fin.rotation.z = s * 0.3; g.add(fin); }
  // Augen
  for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(1.4, 12, 8), new THREE.MeshStandardMaterial({ color: 0xffffff })); e.position.set(s * 4.6, 2, 16); g.add(e); const p = new THREE.Mesh(new THREE.SphereGeometry(0.7, 10, 8), darkM); p.position.set(s * 5.4, 2, 16.8); g.add(p); }
  // Hörner (Ziege!)
  for (const s of [-1, 1]) { const h = new THREE.Mesh(new THREE.ConeGeometry(0.9, 5, 8), new THREE.MeshStandardMaterial({ color: 0xe8dcc0 })); h.position.set(s * 3, 7.2, 12); h.rotation.set(-0.7, 0, s * -0.4); g.add(h); }
  const gond = new THREE.Mesh(new THREE.BoxGeometry(5, 3, 12), darkM); gond.position.set(0, -8, 2); g.add(gond);
  const win = new THREE.Mesh(new THREE.BoxGeometry(5.1, 1, 10), new THREE.MeshStandardMaterial({ color: 0x9fe8ff, emissive: 0x2a6070 })); win.position.set(0, -7.6, 2); g.add(win);
  g.props = []; for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.4, 6, 0.6), darkM); p.position.set(s * 4, -7, -5); g.add(p); g.props.push(p); }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  ZR.scene.add(g); g.visible = false; return g;
}
const BUS = { m: null, ax: 0, az: 0, bx: 0, bz: 0, t: 0, dur: 32, y: 210, active: false };
function busPos(t) { return [lerp(BUS.ax, BUS.bx, t), lerp(BUS.az, BUS.bz, t)]; }
function startBus() {
  const a = Math.random() * 6.283, off = rand(-140, 140); const px = -Math.sin(a) * off, pz = Math.cos(a) * off;
  BUS.ax = px - Math.cos(a) * 620; BUS.az = pz - Math.sin(a) * 620; BUS.bx = px + Math.cos(a) * 620; BUS.bz = pz + Math.sin(a) * 620; BUS.t = 0; BUS.active = true; BUS.dirYaw = Math.atan2(BUS.bx - BUS.ax, BUS.bz - BUS.az);
  BUS.m.visible = true; BUS.m.rotation.y = BUS.dirYaw;
}
