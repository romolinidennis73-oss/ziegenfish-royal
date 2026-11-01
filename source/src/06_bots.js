// ============ Bot-KI ============
const WSCORE = { pistol: 10, smg: 26, rsmg: 28, ar: 34, tac: 32, pump: 33, tsg: 30, semi: 30, bolt: 31, heavy: 35, lmg: 31, dmr: 30, hsg: 32, dsg: 29, hand: 22, hunt: 28, rpg: 30 };
const PREF_DIST = { pump: 6, tsg: 7, smg: 13, rsmg: 11, pistol: 16, ar: 28, tac: 30, semi: 60, bolt: 75, heavy: 30, lmg: 25, dmr: 50, hsg: 6, dsg: 5, hand: 18, hunt: 55, rpg: 35 };
function botSetup(c, i) {
  c.persona = PERSONAS[i % PERSONAS.length]; c.think = Math.random() * 0.3; c.state = 'loot'; c.target = null; c.gx = c.x; c.gz = c.z; c.goalItem = null;
  c.reactT = 0; c.strafe = Math.random() < 0.5 ? -1 : 1; c.strafeT = 0; c.stuckT = 0; c.sideT = 0; c.seenT = -99; c.lkx = 0; c.lkz = 0; c.simT = Math.random() * 0.25; c.farAcc = 0;
  c.aggro = { aggressiv: 1.4, defensiv: 0.7, vorsichtig: 0.55, sammler: 0.85, 'jäger': 1.25 }[c.persona];
}
function bestWeaponSlot(c, dist) {
  let best = -1, bs = -1e9;
  c.slots.forEach((s, i) => {
    if (!s || !WEAPONS[s.key]) return; const w = WEAPONS[s.key]; if (s.mag <= 0 && c.ammo[w.ammo] <= 0) return;
    let sc = WSCORE[s.key] + (s.rar || 0) * 6; const pd = PREF_DIST[s.key]; sc -= Math.abs(Math.log((dist + 3) / (pd + 3))) * 14; if (s.mag <= 0) sc -= 8; if (sc > bs) { bs = sc; best = i; }
  });
  return best;
}
function botWants(c, it) {
  if (AMMO[it.key]) return 4; if (ITEMS[it.key]) { const has = c.slots.some(s => !s) || c.slots.some(s => s && s.key === it.key && s.n < ITEMS[it.key].stack); return has ? 6 : 0; }
  const sc = WSCORE[it.key] + (it.rar || 0) * 6; let worst = 1e9, empty = false; for (const s of c.slots) { if (!s) { empty = true; continue; } const v = WEAPONS[s.key] ? WSCORE[s.key] + (s.rar || 0) * 6 : 15; worst = Math.min(worst, v); }
  if (c.slots.some(s => s && s.key === it.key && (s.rar || 0) >= (it.rar || 0))) return 0;
  if (!c.slots.some(s => s && WEAPONS[s.key])) return 20; return empty ? sc / 4 : (sc > worst + 4 ? 3 : 0);
}
function botPickup(c, it) {
  if (WEAPONS[it.key] && !c.slots.some(s => !s)) { // schlechtesten Platz ersetzen
    let wi = 0, wv = 1e9; c.slots.forEach((s, i) => { const v = WEAPONS[s.key] ? WSCORE[s.key] + (s.rar || 0) * 6 : (ITEMS[s.key] && ITEMS[s.key].heal ? 18 : 14); if (v < wv) { wv = v; wi = i; } }); c.sel = wi; return tryPickup(c, it, true);
  }
  return tryPickup(c, it, false);
}
function nearestItem(c, R) {
  let best = null, bs = 0; const R2 = R * R;
  for (const it of M.items) { if (!it.alive || it.noPick === c && M.time < it.noPickT) continue; const d2 = dist2(it.x, it.z, c.x, c.z); if (d2 > R2 || Math.abs(it.y - c.y) > 6) continue; const want = botWants(c, it); if (want <= 0) continue; const sc = want / (Math.sqrt(d2) + 5); if (sc > bs) { bs = sc; best = it; } }
  for (const ch of M.chestObjs) { if (ch.open) continue; const d2 = dist2(ch.x, ch.z, c.x, c.z); if (d2 > R2 || Math.abs(ch.y - c.y) > 6) continue; const sc = 9 / (Math.sqrt(d2) + 5); if (sc > bs) { bs = sc; best = ch; } }
  return best;
}
function botSee(c) {
  const range = c.persona === 'vorsichtig' ? 50 : 68; let best = null, bd = 1e9; const cosF = Math.cos(c.yaw), sinF = Math.sin(c.yaw);
  for (const t of M.chars) {
    if (t === c || !t.alive || t.mode !== 'ground') continue; const dx = t.x - c.x, dz = t.z - c.z, d = Math.hypot(dx, dz); if (d > range || d > bd) continue;
    // Sichtfeld 220°, nah immer
    if (d > 12 && (dx * sinF + dz * cosF) / d < -0.35) continue;
    let sc = d; if (t.isPlayer) { if (c.threat !== t && playerAttackers() >= 2) continue; sc *= 1.8; } if (t.crouch && d > 25) sc *= 1.4;
    if (sc < bd && lineOfSight(c.x, c.y + 1.6, c.z, t.x, t.y + 1.3, t.z)) { bd = sc; best = t; }
  }
  return best;
}
function playerAttackers() { if (M._paT === M.time) return M._paN; let n = 0; for (const b of M.chars) if (b.alive && !b.isPlayer && b.target === M.player && M.time - b.seenT < 3) n++; M._paT = M.time; M._paN = n; return n; }
function botThink(c) {
  const dif = DIFF[Settings.difficulty]; c.think = dif.think * rand(0.8, 1.3);
  // Wahrnehmung
  let t = c.target && c.target.alive ? c.target : null;
  if (c.threat && c.threat.alive && M.time - c.threatT < 4) { const d = Math.hypot(c.threat.x - c.x, c.threat.z - c.z); if (d < 120) t = c.threat; }
  const seen = botSee(c);
  if (seen) { if (!t || seen === t || Math.hypot(seen.x - c.x, seen.z - c.z) < Math.hypot(t.x - c.x, t.z - c.z) * 0.6) { if (seen !== c.target) c.reactT = (seen.isPlayer ? dif.react + dif.preact : dif.react) * rand(0.8, 1.3); t = seen; } c.seenT = M.time; }
  if (t && t.isPlayer && c.threat !== t && Math.hypot(t.x - c.x, t.z - c.z) > 55) t = null;
  if (t && t.isPlayer && M.time - c.seenT > 3.5) t = null;
  if (!t && Math.random() < 0.03 && c.state !== 'storm') { c.state = 'roam'; c.gx = c.x + rand(-40, 40); c.gz = c.z + rand(-40, 40); c.think = rand(2, 4); c.target = null; return; } // kurz Orientierung verlieren
  if (t) { if (lineOfSight(c.x, c.y + 1.6, c.z, t.x, t.y + 1.3, t.z)) { c.seenT = M.time; c.lkx = t.x; c.lkz = t.z; c.tVis = true; } else c.tVis = false; if (M.time - c.seenT > 6) t = null; }
  c.target = t;
  const dist = t ? Math.hypot(t.x - c.x, t.z - c.z) : 60;
  // Waffe wählen
  if (c.healT <= 0) { const bi = bestWeaponSlot(c, dist); if (bi >= 0 && bi !== c.sel) { c.sel = bi; c.reloadT = 0; syncHeld(c); } }
  const armed = c.slots.some(s => s && WEAPONS[s.key] && (s.mag > 0 || c.ammo[WEAPONS[s.key].ammo] > 0)); c.ammoLow = !armed && c.slots.some(s => s && WEAPONS[s.key]);
  // Sturm
  const outside = !inSafe(c.x, c.z, 6); const nextOut = !inNext(c.x, c.z, 8); const timeLeft = S.mode === 'wait' ? S.t + (S.phase < STORM_PHASES.length ? STORM_PHASES[S.phase][1] * stormScale() : 0) : S.t;
  const needMove = outside || (nextOut && (S.mode === 'shrink' || timeLeft < Math.hypot(c.x - S.tx, c.z - S.tz) / 6 + 25 / c.aggro));
  // Heilen
  const lowHp = c.hp < 65 || c.shield < 40; const quiet = M.time - c.seenT > 2.5 && M.time - (c.lastHitTime || -99) > 2.5;
  if (lowHp && quiet && !outside && c.healT <= 0) { const hi = c.slots.findIndex(s => s && ITEMS[s.key] && !ITEMS[s.key].throw && canUseItem(c, s.key)); if (hi >= 0) { c.sel = hi; syncHeld(c); useItem(c); c.state = 'heal'; return; } }
  if (c.healT > 0) { if (!quiet) { c.healT = 0; } else { c.state = 'heal'; return; } }
  if (needMove && (!t || dist > 25 || outside && c.hp < 50)) {
    c.state = 'storm'; const cx = outside ? S.cx : S.tx, cz = outside ? S.cz : S.tz, r = outside ? S.r : S.tr; const a = Math.atan2(c.z - cz, c.x - cx); const rr = r * rand(0.25, 0.6); c.gx = cx + Math.cos(a) * rr; c.gz = cz + Math.sin(a) * rr; return;
  }
  if (t && armed) {
    const weak = c.hp + c.shield < 50 && (c.persona === 'defensiv' || c.persona === 'vorsichtig');
    if (weak && dist > 8 && (c.state !== 'cover' || M.time - c.coverT < 6)) { if (c.state !== 'cover') { c.coverT = M.time; findCover(c, t); } c.state = 'cover'; return; }
    c.state = 'fight';
    // Granate
    const gi = c.slots.findIndex(s => s && s.key === 'granate'); if (gi >= 0 && !c.tVis && dist > 8 && dist < 26 && Math.random() < 0.25) { c.sel = gi; syncHeld(c); c.yaw = Math.atan2(c.lkx - c.x, c.lkz - c.z); c.pitch = 0.25 + dist / 120; useItem(c); }
    return;
  }
  if (t && !armed) { const tArmed = !!curWeapon(t); if (dist < 3 && !tArmed && c.threat === t) { c.state = 'fight'; return; } if (!tArmed && dist > 3) t = null; }
  if (t && !armed) { c.state = 'flee'; const a = Math.atan2(c.z - t.z, c.x - t.x); c.gx = c.x + Math.cos(a) * 30; c.gz = c.z + Math.sin(a) * 30; }
  // Looten
  const needLoot = !armed || c.persona === 'sammler' || c.ammoLow || c.slots.filter(s => s).length < 3;
  const R = needLoot ? 70 : 30; if (!c.goalItem || (c.goalItem.alive === false) || (c.goalItem.open === true) || M.time - (c.goalSince || 0) > 25) { c.goalItem = nearestItem(c, R); c.goalSince = M.time; }
  if (c.goalItem && (needLoot || Math.random() < 0.7)) { c.state = 'loot'; c.gx = c.goalItem.x; c.gz = c.goalItem.z; return; }
  // Schüsse untersuchen
  if (c.persona === 'jäger' || c.persona === 'aggressiv') {
    let best = null, bd = 160; for (let i = M.shots.length - 1; i >= 0; i--) { const s = M.shots[i]; if (M.time - s.t > 6) break; if (s.by === c) continue; const d = Math.hypot(s.x - c.x, s.z - c.z); if (d < bd && inSafe(s.x, s.z, 10)) { bd = d; best = s; } }
    if (best) { c.state = 'hunt'; c.gx = best.x + rand(-6, 6); c.gz = best.z + rand(-6, 6); return; }
  }
  if (c.state !== 'roam' || Math.hypot(c.gx - c.x, c.gz - c.z) < 4 || Math.random() < 0.02) {
    c.state = 'roam'; let tries = 0; do { const a = Math.random() * 6.283, d = rand(30, 110); c.gx = c.x + Math.cos(a) * d; c.gz = c.z + Math.sin(a) * d; tries++; } while (tries < 12 && (!inNext(c.gx, c.gz, 10) || heightAt(c.gx, c.gz) < 1.5));
  }
}
function findCover(c, t) {
  boxesNear(c.x, c.z, 25, _near); let best = null, bd = 1e9;
  for (const b of _near) { if (b.y1 - b.y0 < 1.3 || b.kind === 'door') continue; const bxm = (b.x0 + b.x1) / 2, bzm = (b.z0 + b.z1) / 2; const a = Math.atan2(bzm - t.z, bxm - t.x); const hw = Math.max(b.x1 - b.x0, b.z1 - b.z0) / 2 + 1.2; const px = bxm + Math.cos(a) * hw, pz = bzm + Math.sin(a) * hw; const d = Math.hypot(px - c.x, pz - c.z); if (d < bd) { bd = d; best = [px, pz]; } }
  if (best) { c.gx = best[0]; c.gz = best[1]; } else { const a = Math.atan2(c.z - t.z, c.x - t.x); c.gx = c.x + Math.cos(a) * 20; c.gz = c.z + Math.sin(a) * 20; }
}
function angDiff(a, b) { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; }
function botUpdate(c, dt, near) {
  c.think -= dt; if (c.think <= 0) botThink(c);
  weaponUpdate(c, dt); c.reactT -= dt; c.hitT = Math.max(0, c.hitT - dt);
  let speed = 6.2, wx = 0, wz = 0; c.sprint = false; c.crouch = false; const t = c.target;
  if (c.state === 'heal') { speed = 0; }
  else if (c.state === 'fight' && t && t.alive) {
    const dx = t.x - c.x, dz = t.z - c.z, d = Math.hypot(dx, dz) + 1e-6; const s = curWeapon(c); const pd = s ? PREF_DIST[s.key] : 1.5;
    const wantYaw = Math.atan2(dx, dz); c.yaw += angDiff(c.yaw, wantYaw) * Math.min(1, dt * 7);
    c.pitch = Math.atan2(t.y + 1.2 - (c.y + 1.5), d) * 0.9;
    c.strafeT -= dt; if (c.strafeT <= 0) { c.strafe = -c.strafe; c.strafeT = rand(0.6, 1.8); }
    const fwd = d > pd * 1.3 ? 1 : d < pd * 0.6 ? -0.7 : 0; const sx = -dz / d, sz = dx / d;
    wx = dx / d * fwd + sx * c.strafe * 0.8; wz = dz / d * fwd + sz * c.strafe * 0.8; speed = c.tVis ? 5.2 : 6.5;
    if (!c.tVis) { const lx = c.lkx - c.x, lz = c.lkz - c.z, ld = Math.hypot(lx, lz) + 1e-6; if (c.aggro > 1 || ld < 15 || (M.time - c.seenT > 2 && c.persona !== 'vorsichtig')) { wx = lx / ld; wz = lz / ld; } else { wx *= 0.3; wz *= 0.3; } }
    if (c.persona === 'aggressiv' && c.onGround && Math.random() < dt * 0.6) c.vy = 7.5;
    if (c.persona === 'defensiv' && c.tVis && d > 20 && Math.random() < 0.6) c.crouch = true;
    // Schießen
    const aligned = Math.abs(angDiff(c.yaw, wantYaw)) < 0.25;
    if (c.tVis && c.reactT <= 0 && aligned && (!s || d < WEAPONS[s.key].range * 1.3)) {
      const dif = DIFF[Settings.difficulty]; const tsp = Math.hypot(t.vx, t.vz);
      const aimY = t.y + (Math.random() < (Settings.difficulty === 'schwer' ? 0.25 : 0.12) ? 1.66 : 1.0) - (t.crouch ? 0.4 : 0);
      const ox = c.x + Math.sin(c.yaw) * 0.5, oy = c.y + 1.45, oz = c.z + Math.cos(c.yaw) * 0.5; let ax = t.x - ox, ay = aimY - oy, az = t.z - oz; const L = Math.hypot(ax, ay, az);
      const err = (dif.err + (t.isPlayer ? dif.perr : 0)) * (1 + tsp / 8) * (s ? WEAPONS[s.key].botAcc : 1) * (d > 80 ? 1.4 : 1) / Math.max(0.6, c.aggro * 0.5 + 0.5);
      if (!s || s.mag > 0 || c.ammo[WEAPONS[s.key].ammo] > 0) fire(c, ox, oy, oz, ax / L, ay / L, az / L, err);
      else c.ammoLow = true;
    }
  } else {
    const dx = c.gx - c.x, dz = c.gz - c.z, d = Math.hypot(dx, dz);
    if (d > 1.2) { wx = dx / d; wz = dz / d; c.yaw += angDiff(c.yaw, Math.atan2(dx, dz)) * Math.min(1, dt * 6); }
    c.pitch *= 0.9;
    if (c.state === 'storm' || c.state === 'flee' || (c.state === 'loot' && d > 25) || c.state === 'hunt' || c.state === 'cover') { speed = 8.2; c.sprint = true; }
    if (c.state === 'roam') speed = 5.5;
    // Loot aufnehmen
    if (c.state === 'loot' && c.goalItem && d < 2.2) {
      const g = c.goalItem; if (g.open === false) openChest(g, c); else if (g.alive) botPickup(c, g);
      for (const it of M.items) if (it.alive && dist2(it.x, it.z, c.x, c.z) < 16 && Math.abs(it.y - c.y) < 2 && botWants(c, it) > 0) botPickup(c, it);
      c.goalItem = null; c.ammoLow = false; c.think = 0;
    }
  }
  // Hindernisse umgehen
  if (near) {
    if (c.blocked && (wx || wz)) { c.stuckT += dt; if (c.stuckT > 0.35) { if (c.onGround) c.vy = 7.5; c.sideT = 0.9; c.side = Math.random() < 0.5 ? -1 : 1; c.stuckT = 0; } } else c.stuckT = Math.max(0, c.stuckT - dt);
    if (c.sideT > 0) { c.sideT -= dt; const ox = wx, oz = wz; wx = wx * 0.3 + -oz * c.side; wz = wz * 0.3 + ox * c.side; }
  }
  if (c.inWater) speed *= 0.6;
  const ml = Math.hypot(wx, wz); if (ml > 1) { wx /= ml; wz /= ml; }
  moveChar(c, wx * speed, wz * speed, dt, !near);
  c.animSpeed = Math.hypot(c.vx, c.vz);
}
// Vereinfachter Fernkampf für weit entfernte Bots
function farCombat(c, dt) {
  const t = c.target; if (!t || !t.alive || t.isPlayer) return; const s = curWeapon(c); if (!s) return; const w = WEAPONS[s.key];
  const d = Math.hypot(t.x - c.x, t.z - c.z); if (d > Math.min(w.range * 1.2, 90) || !c.tVis || c.reactT > 0) return;
  if (s.mag <= 0) { startReload(c); return; } if (c.reloadT > 0) return;
  const shots = Math.max(1, Math.round(w.rate * dt)); const hitP = clamp(0.55 - d / 200, 0.12, 0.5) * (Settings.difficulty === 'schwer' ? 1.1 : 1);
  for (let i = 0; i < shots && s.mag > 0; i++) { s.mag--; if (Math.random() < hitP) damage(t, wStat(s.key, s.rar).dmg * (w.pellets ? w.pellets * clamp(1 - d / w.range, 0.15, 0.8) : 1) * (Math.random() < 0.12 ? w.head : 1), c, s.key, false); if (!t.alive) break; }
  M.shots.push({ x: c.x, z: c.z, t: M.time, by: c });
}
