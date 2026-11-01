// ============ Spielablauf, Spielersteuerung, Kamera, Hauptschleife ============
const MENU_SPOT = { x: 0, y: 0, z: 0 };
let menuChar = null;
function setMenuSkin() {
  if (menuChar) ZR.scene.remove(menuChar.root);
  menuChar = makeCharacter(SKINS[Profile.skin], true); menuChar.root.position.set(MENU_SPOT.x, MENU_SPOT.y, MENU_SPOT.z); ZR.scene.add(menuChar.root); menuChar.c = { onGround: true, animSpeed: 0, gunKey: 'ar', gunRar: 4, pitch: 0 };
  refreshMenu();
}
function findMenuSpot() { const a = 1.25; for (let r = 300; r < 540; r += 2) { const x = Math.cos(a) * r, z = Math.sin(a) * r; if (heightAt(x, z) < 2.2) { MENU_SPOT.x = x - Math.cos(a) * 7; MENU_SPOT.z = z - Math.sin(a) * 7; MENU_SPOT.y = heightAt(MENU_SPOT.x, MENU_SPOT.z); MENU_SPOT.face = a; return; } } MENU_SPOT.x = 40; MENU_SPOT.z = 400; MENU_SPOT.y = heightAt(40, 400); MENU_SPOT.face = 1.25; }
function menuCamera(dt) {
  const t = performance.now() / 1000; const m = menuChar; if (!m) return;
  // Kamera steht landeinwärts und blickt Richtung Meer, Figur rechts im Bild
  const base = Math.atan2(-Math.sin(MENU_SPOT.face), -Math.cos(MENU_SPOT.face)); const a = base + Math.sin(t * 0.15) * 0.35, r = ZR.panel ? 4.2 : 5.0;
  const cx = MENU_SPOT.x + Math.cos(a) * r, cz = MENU_SPOT.z + Math.sin(a) * r; const tx = MENU_SPOT.x - cx, tz = MENU_SPOT.z - cz, tl = Math.hypot(tx, tz); const rx = -tz / tl, rz = tx / tl;
  const off = ZR.panel ? 1.9 : 1.5; ZR.camera.position.set(cx, MENU_SPOT.y + 1.7 + Math.sin(t * 0.3) * 0.12, cz); ZR.camera.lookAt(MENU_SPOT.x - rx * off, MENU_SPOT.y + 1.3, MENU_SPOT.z - rz * off);
  m.root.rotation.y = Math.atan2(cx - MENU_SPOT.x, cz - MENU_SPOT.z) + Math.sin(t * 0.4) * 0.3 - 0.35; m.c.gunKey = ZR.panel === 'weapons' ? (ZR.menuWeapon || 'ar') : 'ar'; m.c.gunRar = ZR.panel === 'weapons' ? 2 : 4;
  m.c.pitch = Math.sin(t * 0.8) * 0.05; animateChar(m, m.c, dt); m.torso.position.y = 0.95 + Math.sin(t * 2) * 0.01;
  ZR.camera.fov = 55; ZR.camera.updateProjectionMatrix(); ZR.sun.position.set(MENU_SPOT.x + 180, 260, MENU_SPOT.z + 120); ZR.sun.target.position.set(MENU_SPOT.x, 0, MENU_SPOT.z);
}

// ---------------- Match starten ----------------
function clearMatch() {
  for (const c of M.chars) { ZR.scene.remove(c.model.root); if (c.gliderM) ZR.scene.remove(c.gliderM); }
  for (const it of M.items) if (it.m) ZR.scene.remove(it.m); for (const g of M.grenades) ZR.scene.remove(g.m); for (const ch of M.chestObjs) ZR.scene.remove(ch.m);
  M.chars = []; M.items = []; M.grenades = []; M.chestObjs = []; M.shots = []; M.feed = []; $('feed').innerHTML = ''; FX.clear(); UI.slotSig = ''; UI.swapItem = null;
  for (const d of W.doors) { d.open = 0; d.pivot.rotation.y = 0; d.col.on = true; }
}
function startMatchFlow() {
  Audio.init(); Audio.ui(); show('mm'); let n = 1; const names = BOT_NAMES.slice().sort(() => Math.random() - 0.5);
  const tick = setInterval(() => {
    n = Math.min(100, n + randi(2, 7)); $('mmcount').textContent = n + ' / 100'; $('mmbar').style.width = n + '%'; $('mmlog').textContent = names[n % names.length] + ' ist beigetreten';
    if (n >= 100) { clearInterval(tick); setTimeout(loadMatch, 400); }
  }, 70);
  $('mmcancel').onclick = () => { clearInterval(tick); show('menu'); };
}
const TIPS = ['Tipp: Joystick ganz nach außen = Sprinten.', 'Tipp: Goldene Truhen öffnen sich automatisch, wenn du nah dran bist.', 'Tipp: Der lila Sturm macht immer mehr Schaden. Schau auf die Minimap!', 'Tipp: Kopftreffer machen deutlich mehr Schaden.', 'Tipp: Ducken macht dich präziser.', 'Tipp: Tippe auf die Minimap für die große Karte.', 'Tipp: Schildtränke zuerst – sie schützen dein Leben.', 'Tipp: Beim Feuerknopf kannst du gleichzeitig wischen, um zu zielen.'];
function loadMatch() {
  show('loading'); $('ltip').textContent = pick(TIPS); const steps = [
    () => clearMatch(),
    () => { // Loot verteilen
      for (const s of W.lootSpots) if (Math.random() < 0.8) spawnRandomLoot(s.x, s.y + 0.3, s.z);
      for (let i = 0; i < 140; i++) { const x = rand(-470, 470), z = rand(-470, 470); if (heightAt(x, z) > 3 && Math.random() < 0.8) spawnRandomLoot(x, heightAt(x, z) + 0.5, z); }
      for (const p of W.chests) { const m = makeChestMesh(); m.position.set(p.x, p.y, p.z); m.rotation.y = Math.random() * 6; ZR.scene.add(m); M.chestObjs.push({ x: p.x, y: p.y, z: p.z, m, open: false }); }
    },
    () => { // Spieler
      const p = newChar(Profile.name, SKINS[Profile.skin], true); M.player = p; M.chars.push(p);
    },
    () => { const names = BOT_NAMES.slice().sort(() => Math.random() - 0.5); for (let i = 0; i < 99; i++) { const sk = Math.random() < 0.45 ? SKINS[pick(SKIN_KEYS.slice(1))] : pick(BOT_SKINS); const c = newChar(names[i % names.length] + (i >= names.length ? '_' + i : ''), sk, false); botSetup(c, i); M.chars.push(c); } },
    () => { for (const c of M.chars) { c.x = rand(-28, 28); c.z = LOBBY.z + rand(-28, 28); c.y = LOBBY.y + 0.1; c.yaw = Math.random() * 6; c.mode = 'lobby'; c.gx = c.x; c.gz = c.z; } M.player.x = 0; M.player.z = LOBBY.z - 10; M.player.yaw = 0; M.player.camYaw = 0; M.player.camPitch = -0.1; }
  ];
  let i = 0; const run = () => { if (i < steps.length) { steps[i](); i++; $('lbar').style.width = (i / steps.length * 100) + '%'; setTimeout(run, 120); } else setTimeout(beginLobby, 500); }; run();
}
function beginLobby() {
  M.state = 'lobby'; M.lobbyT = 15; M.time = 0; M.ended = false; M.paused = false; M.aliveCount = M.chars.length; M.stats = { wk: {}, start: performance.now() };
  BUS.active = false; BUS.m.visible = false; S.mesh && (S.mesh.visible = false);
  show('hud'); Audio.playMusic('match'); 
  $('btn-fire2').style.display = Settings.leftFire ? 'flex' : 'none';
}
function beginBus() {
  M.state = 'play'; M.time = 0; startBus(); initStorm();
  for (const c of M.chars) {
    c.mode = 'bus'; c.model.root.visible = false; c.hp = 100; c.shield = 0;
    if (!c.isPlayer) { // Landeziel wählen
      let tx, tz; const r = Math.random(); if (r < 0.65 && W.lootSpots.length) { const s = pick(Math.random() < 0.5 ? W.chests : W.lootSpots); tx = s.x + rand(-8, 8); tz = s.z + rand(-8, 8); } else { tx = rand(-420, 420); tz = rand(-420, 420); }
      const dx = BUS.bx - BUS.ax, dz = BUS.bz - BUS.az, L2 = dx * dx + dz * dz; let t = ((tx - BUS.ax) * dx + (tz - BUS.az) * dz) / L2; t = clamp(t + rand(-0.04, 0.04), 0.12, 0.92);
      c.jumpAt = t; c.lx = tx; c.lz = tz;
    }
  }
  UI.banner('Der Blubb-Zeppelin startet! Tippe ABSPRINGEN', 'info'); Audio.whoosh();
}
function playerJump() { const p = M.player; if (p.mode !== 'bus') return; charJump(p); Audio.whoosh(); }
function charJump(c) {
  const [x, z] = busPos(BUS.t); c.x = x + rand(-2, 2); c.z = z + rand(-2, 2); c.y = BUS.y - 9; c.vy = -10; c.vx = c.vz = 0; c.mode = 'sky'; c.skydive = true; c.model.root.visible = true;
}
function makeGlider(c) {
  const g = new THREE.Group(); const gd = c.isPlayer ? GLIDERS[Profile.glider] : pick(Object.values(GLIDERS));
  const wing = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.08, 1.4), new THREE.MeshStandardMaterial({ color: gd.col, roughness: 0.6 })); wing.position.y = 2.6; g.add(wing);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(4.25, 0.1, 0.3), new THREE.MeshStandardMaterial({ color: gd.col2 })); stripe.position.set(0, 2.6, 0.4); g.add(stripe);
  for (const s of [-1, 1]) { const tip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.6, 1.2), new THREE.MeshStandardMaterial({ color: gd.col2 })); tip.position.set(s * 2.1, 2.35, 0); g.add(tip); const rod = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.2, 0.04), new THREE.MeshBasicMaterial({ color: 0x222222 })); rod.position.set(s * 0.6, 2.0, 0); rod.rotation.z = s * 0.4; g.add(rod); }
  ZR.scene.add(g); return g;
}
function airUpdate(c, dt, wx, wz) {
  const ground = groundAt(c.x, c.z, c.y, 0.5, 0.25);
  if (c.mode === 'sky') { c.vy = Math.max(c.vy - G * dt, -36); c.skydive = true; c.glide = false; if (c.y - ground < 75) { c.mode = 'glide'; if (c.isPlayer) Audio.whoosh(); } wx *= 24; wz *= 24; }
  else { c.skydive = false; c.glide = true; c.vy = lerp(c.vy, -6.5, Math.min(1, dt * 2)); wx *= 15; wz *= 15; if (!c.gliderM) c.gliderM = makeGlider(c); }
  c.vx += (wx - c.vx) * Math.min(1, dt * 2); c.vz += (wz - c.vz) * Math.min(1, dt * 2);
  c.x += c.vx * dt; c.z += c.vz * dt; c.y += c.vy * dt; const r = Math.hypot(c.x, c.z); if (r > W.BOUND) { c.x *= W.BOUND / r; c.z *= W.BOUND / r; }
  if (Math.hypot(c.vx, c.vz) > 1) c.yaw += angDiff(c.yaw, Math.atan2(c.vx, c.vz)) * Math.min(1, dt * 3);
  const g2 = groundAt(c.x, c.z, c.y, 0.5, 0.25); const wl = waterAt(c.x, c.z);
  if (c.y <= Math.max(g2, wl - 1.25)) { c.y = Math.max(g2, wl - 1.25); c.vy = 0; c.mode = 'ground'; c.glide = c.skydive = false; c.onGround = true; if (c.gliderM) { ZR.scene.remove(c.gliderM); c.gliderM = null; }
    if (c.isPlayer) { const z = W.pois.reduce((b, p) => { const d = Math.hypot(p.x - c.x, p.z - c.z); return d < b[0] ? [d, p] : b; }, [1e9, null]); UI.banner(z[1] && z[0] < 160 ? z[1].name.toUpperCase() : 'GELANDET', 'info'); } }
  if (c.gliderM) { c.gliderM.position.set(c.x, c.y, c.z); c.gliderM.rotation.y = c.yaw; }
  if (c.mode === 'sky' && c.isPlayer && TRAILS[Profile.trail].col) { const tc = new THREE.Color(TRAILS[Profile.trail].col); if (Math.random() < 0.7) FX.spawn(c.x + rand(-.3, .3), c.y + 1, c.z + rand(-.3, .3), 0, 8, 0, tc.r, tc.g, tc.b, 0.8, 0.4); }
  c.animSpeed = 0;
}

// ---------------- Spieler pro Frame ----------------
const camState = { dist: 3.2 }; const _f = new THREE.Vector3(), _r = new THREE.Vector3();
function updatePlayer(dt) {
  const p = M.player; const sens = 0.0042 * Settings.camSens * (p.ads ? 0.55 : 1);
  if (p.camYaw == null) { p.camYaw = p.yaw; p.camPitch = 0; }
  p.camYaw -= Input.look[0] * sens; p.camPitch = clamp(p.camPitch - Input.look[1] * sens * 0.8, -1.25, 1.1); Input.look[0] = Input.look[1] = 0; p.recoilP = (p.recoilP || 0) * Math.max(0, 1 - dt * 9);
  // Joystick / Tasten
  let jx = Input.jx, jy = Input.jy; const K = Input.keys; if (K.KeyW || K.ArrowUp) jy = -1; if (K.KeyS || K.ArrowDown) jy = 1; if (K.KeyA || K.ArrowLeft) jx = -1; if (K.KeyD || K.ArrowRight) jx = 1;
  if (K.KeyQ) p.camYaw += dt * 2.2; if (K.KeyE && !UI.swapItem) p.camYaw -= dt * 2.2;
  const mag = Math.min(1, Math.hypot(jx, jy)); const fx = Math.sin(p.camYaw), fz = Math.cos(p.camYaw), rx = -Math.cos(p.camYaw), rz = Math.sin(p.camYaw);
  let wx = fx * -jy + rx * jx, wz = fz * -jy + rz * jx; const wl = Math.hypot(wx, wz); if (wl > 0) { wx /= wl; wz /= wl; }
  if (p.mode === 'bus') { const [x, z] = busPos(BUS.t); p.x = x; p.z = z; p.y = BUS.y; return; }
  if (p.mode === 'sky' || p.mode === 'glide') { airUpdate(p, dt, wx * mag, wz * mag); Input.jump = false; return; }
  // Boden
  if (!p.alive) return;
  const w = curWeapon(p); p.ads = !!(Input.aim && (w || !curSlot(p))) && p.mode === 'ground';
  const sprint = mag > 0.93 && !p.ads && !Input.fire && !p.crouch && p.healT <= 0 && (K.ShiftLeft || isTouch || jy < 0); p.sprint = sprint && mag > 0;
  let speed = p.crouch ? 2.8 : p.ads ? 3.6 : sprint ? 8.4 : 6.2 * Math.max(0.45, mag); if (p.healT > 0) speed = Math.min(speed, 2.8); if (p.inWater) speed *= 0.6;
  if (sprint && p.reloadT > 0) speed = 6.2;
  if (Input.jump && p.onGround && M.state !== 'end') { p.vy = 7.6; p.onGround = false; Audio.jump(); if (p.crouch) p.crouch = false; } Input.jump = false;
  moveChar(p, wx * speed * (mag > 0.05 ? 1 : 0), wz * speed * (mag > 0.05 ? 1 : 0), dt, false);
  p.animSpeed = Math.hypot(p.vx, p.vz);
  // Schritte
  if (p.onGround && p.animSpeed > 1) { p.stepT -= dt * p.animSpeed; if (p.stepT <= 0) { p.stepT = 2.2; Audio.step(0, p.inWater); } }
  // Blickrichtung des Körpers
  const aiming = Input.fire || p.ads || w && p.animSpeed < 0.5 || p.fireCD > -0.6;
  const moveYaw = p.animSpeed > 0.5 ? Math.atan2(p.vx, p.vz) : p.yaw; const wantYaw = (aiming && w) || !p.sprint ? (p.animSpeed > 0.5 && !w && !aiming ? moveYaw : p.camYaw) : moveYaw;
  p.yaw += angDiff(p.yaw, wantYaw) * Math.min(1, dt * 14); p.pitch = p.camPitch;
  weaponUpdate(p, dt); p.hitT = Math.max(0, p.hitT - dt);
  // Loot: automatisch aufheben & Truhen
  UI.swapItem = null; let bestD = 2.4 * 2.4;
  for (const it of M.items) {
    if (!it.alive) continue; const d2 = dist2(it.x, it.z, p.x, p.z); if (d2 > 6 || Math.abs(it.y - p.y) > 1.6) continue;
    if (it.noPick === p && M.time < it.noPickT) { if (d2 < bestD) { bestD = d2; UI.swapItem = it; } continue; }
    if (d2 < 2.6 && tryPickup(p, it, false)) continue; if (d2 < bestD) { bestD = d2; UI.swapItem = it; }
  }
  for (const ch of M.chestObjs) if (!ch.open && dist2(ch.x, ch.z, p.x, p.z) < 6 && Math.abs(ch.y - p.y) < 1.8) openChest(ch, p);
  if (M.state === 'lobby') return;
  // Schießen / Benutzen
  const s = curSlot(p);
  if (s && ITEMS[s.key]) { if (Input.firePressed) useItem(p); }
  else {
    let want = Input.fire;
    if (!want && Settings.autoFire && w) { const tgt = aimTarget(); if (tgt && tgt.c && tgt.t < WEAPONS[w.key].range * 1.1) want = true; }
    if (want) { const a = aimRay(); if (fire(p, a.ox, a.oy, a.oz, a.dx, a.dy, a.dz)) { if (p.crouch === false) { } } }
    else if (w && w.mag === 0 && p.reloadT <= 0 && p.ammo[WEAPONS[w.key].ammo] > 0) startReload(p);
  }
  Input.firePressed = false;
  // Zielhilfe (Touch): sanft zum Gegner nahe dem Fadenkreuz ziehen
  if (isTouch && w && (Input.fire || p.ads)) {
    let best = null, ba = 0.07; const cf = camForward();
    for (const c of M.chars) { if (c === p || !c.alive || c.mode !== 'ground') continue; const dx = c.x - ZR.camera.position.x, dy = c.y + 1.2 - ZR.camera.position.y, dz = c.z - ZR.camera.position.z, L = Math.hypot(dx, dy, dz); if (L > WEAPONS[w.key].range) continue; const a = Math.acos(clamp((dx * cf.x + dy * cf.y + dz * cf.z) / L, -1, 1)); if (a < ba) { ba = a; best = c; } }
    if (best) { const wy = Math.atan2(best.x - ZR.camera.position.x, best.z - ZR.camera.position.z); p.camYaw += angDiff(p.camYaw, wy) * Math.min(1, dt * 2.5); }
  }
}
function camForward() { const p = M.player; const cp = Math.cos(p.camPitch); return _f.set(Math.sin(p.camYaw) * cp, Math.sin(p.camPitch), Math.cos(p.camYaw) * cp); }
function aimTarget() {
  const p = M.player, cam = ZR.camera.position, f = camForward(); const start = camState.dist + 0.3; const ox = cam.x + f.x * start, oy = cam.y + f.y * start, oz = cam.z + f.z * start;
  const wt = rayWorld(ox, oy, oz, f.x, f.y, f.z, 600); let best = { t: wt, c: null };
  for (const c of M.chars) { if (c === p || !c.alive || c.mode === 'bus') continue; const r = rayChar(c, ox, oy, oz, f.x, f.y, f.z, best.t); if (r && r.t < best.t) best = { t: r.t, c }; }
  best.x = ox + f.x * best.t; best.y = oy + f.y * best.t; best.z = oz + f.z * best.t; return best;
}
function aimRay() {
  const p = M.player; const tg = aimTarget(); const ox = p.x + Math.sin(p.yaw) * 0.3 - Math.cos(p.yaw) * 0.25, oy = p.y + (p.crouch ? 1.05 : 1.45), oz = p.z + Math.cos(p.yaw) * 0.3 + Math.sin(p.yaw) * 0.25;
  let dx = tg.x - ox, dy = tg.y - oy, dz = tg.z - oz; const L = Math.hypot(dx, dy, dz);
  if (L < 2) { const f = camForward(); return { ox, oy, oz, dx: f.x, dy: f.y, dz: f.z }; }
  return { ox, oy, oz, dx: dx / L, dy: dy / L, dz: dz / L };
}
function updateCamera(dt) {
  const p = M.player, cam = ZR.camera; const w = curWeapon(p);
  let fov = 72; if (p.ads && w) fov = WEAPONS[w.key].scope ? 72 / WEAPONS[w.key].zoom : 72 / Math.min(WEAPONS[w.key].zoom, 1.5);
  if (p.sprint && p.animSpeed > 7) fov = 78; cam.fov += (fov - cam.fov) * Math.min(1, dt * 12); cam.updateProjectionMatrix();
  const f = camForward(); const rxv = -Math.cos(p.camYaw), rzv = Math.sin(p.camYaw);
  let pivot, dist, side;
  if (p.mode === 'bus') { const [x, z] = busPos(BUS.t); pivot = new THREE.Vector3(x, BUS.y - 4, z); dist = 48; side = 0; }
  else if (p.mode === 'sky' || p.mode === 'glide') { pivot = new THREE.Vector3(p.x, p.y + 1.6, p.z); dist = 7; side = 0; }
  else { pivot = new THREE.Vector3(p.x, p.y + (p.crouch ? 1.15 : 1.6), p.z); const sc = w && WEAPONS[w.key].scope && p.ads; dist = p.ads ? (sc ? 0.4 : 1.8) : 3.6; side = p.ads ? 0.6 : 0.8; }
  // Kollision der Kamera
  const want = new THREE.Vector3(pivot.x - f.x * dist + rxv * side, pivot.y - f.y * dist + 0.15, pivot.z - f.z * dist + rzv * side);
  const dx = want.x - pivot.x, dy = want.y - pivot.y, dz = want.z - pivot.z, L = Math.hypot(dx, dy, dz);
  let d = L; if (p.mode === 'ground' || p.mode === 'lobby') d = Math.min(L, rayWorld(pivot.x, pivot.y, pivot.z, dx / L, dy / L, dz / L, L + 0.3) - 0.3); d = Math.max(0.2, d);
  cam.position.set(pivot.x + dx / L * d, pivot.y + dy / L * d, pivot.z + dz / L * d); camState.dist = d;
  const gy = heightAt(cam.position.x, cam.position.z) + 0.3; if (cam.position.y < gy) cam.position.y = gy;
  if (FX.shake > 0) { cam.position.x += rand(-1, 1) * FX.shake * 0.08; cam.position.y += rand(-1, 1) * FX.shake * 0.08; }
  cam.lookAt(cam.position.x + f.x, cam.position.y + f.y + (p.recoilP || 0), cam.position.z + f.z);
  p.model.root.visible = !(p.ads && w && WEAPONS[w.key].scope) && p.mode !== 'bus' && (p.alive || p.deathT < 0.6);
  // Schatten folgt
  ZR.sun.position.set(p.x + 180 * 0.6, p.y + 260 * 0.6, p.z + 120 * 0.6); ZR.sun.target.position.set(p.x, p.y, p.z);
}

// ---------------- Ende ----------------
function endMatch(win) {
  if (M.state === 'end') return; const p = M.player; M.state = 'end'; Audio.setStorm(0); if (document.exitPointerLock) document.exitPointerLock();
  const place = win ? 1 : p.placement || M.aliveCount + 1; const surv = Math.round(M.time);
  const xp = Math.round((100 - place) * 4 + p.kills * 60 + (win ? 600 : 0) + surv * 0.6 + p.dmgDone * 0.2);
  const P = Profile; P.matches++; if (win) P.wins++; else P.deaths++; if (place <= 10) P.top10++; P.kills += p.kills; P.damage += p.dmdDone || p.dmgDone; P.bestPlace = Math.min(P.bestPlace, place); P.playTime += (performance.now() - M.stats.start) / 1000;
  for (const k in M.stats.wk) P.weaponKills[k] = (P.weaponKills[k] || 0) + M.stats.wk[k];
  P.history = [{ place, kills: p.kills, dmg: p.dmgDone, xp, date: new Date().toLocaleDateString('de-CH') }].concat(P.history || []).slice(0, 20);
  const lv = addXP(xp); saveProfile();
  win ? Audio.victory() : Audio.defeat(); Audio.playMusic('menu');
  const e = $('end'); e.className = win ? 'win' : 'lose';
  $('endtitle').innerHTML = win ? 'SIEG!<small>Halb Ziege. Halb Fisch. 100 % Sieg.</small>' : 'ELIMINIERT<small>' + (p.lastAtt ? 'von ' + esc(p.lastAtt.name) : 'vom Sturm erwischt') + '</small>';
  const t = Math.floor(surv / 60) + ':' + String(surv % 60).padStart(2, '0');
  $('endstats').innerHTML = [['Platzierung', '#' + place], ['Eliminierungen', p.kills], ['Überlebt', t], ['Schaden', Math.round(p.dmgDone)], ['Erfahrung', '+' + xp + ' XP']].map(([a, b]) => `<div><small>${a}</small><b>${b}</b></div>`).join('') + (lv ? `<div class="lvup">LEVEL UP! Jetzt Level ${P.level}</div>` : '');
  setTimeout(() => show('end'), 50);
}
function backToMenu() { clearMatch(); M.state = 'menu'; M.player = null; BUS.m.visible = false; if (S.mesh) S.mesh.visible = false; show('menu'); refreshMenu(); Audio.playMusic('menu'); ZR.panel = null; }

// ---------------- Hauptschleife ----------------
let last = performance.now(), fpsAcc = 0, fpsN = 0, hudT = 0, mmT = 0, itemT = 0, simAcc = 0;
function loop(now) {
  requestAnimationFrame(loop); let dt = Math.min(0.05, (now - last) / 1000); last = now;
  fpsAcc += dt; fpsN++; if (fpsAcc > 0.5) { $('fps').textContent = Math.round(fpsN / fpsAcc) + ' FPS'; fpsAcc = 0; fpsN = 0; }
  if (ZR.menuVisible || M.state === 'menu') { menuCamera(dt); FX.update(dt); ZR.renderer.render(ZR.scene, ZR.camera); return; }
  if (M.state === 'lobby' || M.state === 'play' || M.state === 'end') { if (!M.paused) step(dt); }
  ZR.renderer.render(ZR.scene, ZR.camera);
}
function step(dt) {
  const p = M.player; M.time += dt;
  if (M.state === 'lobby') { M.lobbyT -= dt; if (M.lobbyT <= 0) beginBus(); }
  if (M.state === 'play' && BUS.active) {
    BUS.t += dt / BUS.dur; const [x, z] = busPos(Math.min(BUS.t, 1)); BUS.m.position.set(x, BUS.y + Math.sin(M.time) * 0.8, z); BUS.m.props.forEach(q => q.rotation.z += dt * 20);
    for (const c of M.chars) if (c.mode === 'bus' && (c.isPlayer ? BUS.t >= 1 : BUS.t >= c.jumpAt)) { charJump(c); if (c.isPlayer) UI.banner('Automatisch abgesprungen!', 'info'); }
    if (BUS.t >= 1.15) { BUS.active = false; BUS.m.visible = false; }
  }
  if (M.state === 'play' && !M.ended || M.state === 'play') updateStorm(dt);
  if (p.alive || M.state === 'lobby') updatePlayer(dt); else p.deathT += dt;
  // Bots
  simAcc += dt; const farTick = simAcc >= 0.25; if (farTick) simAcc = 0;
  for (const c of M.chars) {
    if (c.isPlayer) continue;
    if (!c.alive) { if (c.deathT > 0) { c.deathT += dt; if (c.deathT > 0.5) { c.model.root.visible = false; c.deathT = -1; } else c.model.root.scale.setScalar(1 - c.deathT * 1.6); } continue; }
    const d2p = dist2(c.x, c.z, p.x, p.z); const near = d2p < 150 * 150;
    if (M.state === 'lobby') { lobbyBot(c, dt); }
    else if (c.mode === 'bus') continue;
    else if (c.mode === 'sky' || c.mode === 'glide') { const dx = c.lx - c.x, dz = c.lz - c.z, d = Math.hypot(dx, dz); airUpdate(c, dt, d > 3 ? dx / d : 0, d > 3 ? dz / d : 0); }
    else if (near) botUpdate(c, dt, true);
    else if (farTick) { c.farAcc = 0.25; botUpdate(c, 0.25, false); }
    c.model.root.visible = d2p < 220 * 220 && c.mode !== 'bus';
  }
  // Modelle & Animation
  for (const c of M.chars) {
    if (!c.model.root.visible) continue; const m = c.model; m.root.position.set(c.x, c.y, c.z); m.root.rotation.y = c.yaw;
    if (c.isPlayer || dist2(c.x, c.z, p.x, p.z) < 90 * 90 || M.time % 0.2 < dt) animateChar(m, c, dt);
  }
  updateGrenades(dt); FX.update(dt);
  updateDoors(dt, M.chars.filter(c => c.mode === 'ground' && dist2(c.x, c.z, p.x, p.z) < 160 * 160));
  // Alte Schüsse entfernen
  if (M.shots.length > 200) M.shots.splice(0, M.shots.length - 150);
  itemT -= dt; if (itemT <= 0) { itemT = 0.4; updateItemMeshes(p.x, p.z); }
  for (const it of M.items) if (it.m) { it.m.rotation.y += dt * 1.2; it.m.position.y = it.y + 0.45 + Math.sin(M.time * 2 + it.bob) * 0.08; }
  if (M.state !== 'end') updateCamera(dt);
  hudT -= dt; if (hudT <= 0) { hudT = 0.08; UI.updateHUD(0.08); } mmT -= dt; if (mmT <= 0) { mmT = 0.2; UI.minimap(); }
}
function lobbyBot(c, dt) {
  c.think -= dt; if (c.think <= 0) { c.think = rand(1, 3); c.gx = rand(-28, 28); c.gz = LOBBY.z + rand(-28, 28); if (Math.random() < 0.3 && c.onGround) c.vy = 7.5; }
  const dx = c.gx - c.x, dz = c.gz - c.z, d = Math.hypot(dx, dz); const sp = d > 1 ? 5 : 0; if (d > 1) c.yaw += angDiff(c.yaw, Math.atan2(dx, dz)) * Math.min(1, dt * 5);
  moveChar(c, d > 1 ? dx / d * sp : 0, d > 1 ? dz / d * sp : 0, dt, false); c.animSpeed = Math.hypot(c.vx, c.vz);
}

// ---------------- Start ----------------
async function boot() {
  initRenderer(); const steps = buildWorld(); const bar = $('bootbar');
  for (let i = 0; i < steps.length; i++) { steps[i](); bar.style.width = ((i + 1) / (steps.length + 3) * 100) + '%'; await new Promise(r => setTimeout(r, 30)); }
  buildLobby(); BUS.m = buildZeppelin(); FX.init(); initInput(); findMenuSpot(); setMenuSkin(); UI.buildMapBase(); bar.style.width = '100%';
  // Menü-Knöpfe
  $('btn-play').onclick = startMatchFlow; document.querySelectorAll('[data-panel]').forEach(b => b.onclick = () => openPanel(b.dataset.panel));
  $('pback').onclick = () => { Audio.ui(); ZR.panel = null; show('menu'); refreshMenu(); };
  $('end-again').onclick = () => { clearMatch(); M.state = 'menu'; startMatchFlow(); }; $('end-menu').onclick = backToMenu;
  $('p-resume').onclick = () => togglePause(false); $('p-quit').onclick = () => { togglePause(false); M.state = 'end'; backToMenu(); };
  $('p-settings').onclick = () => { const b = $('psettings'); b.innerHTML = ''; buildSettings(b); b.style.display = b.style.display === 'block' ? 'none' : 'block'; };
  $('minimap').addEventListener('pointerdown', e => { e.stopPropagation(); toggleBigMap(); }); $('bigmap').addEventListener('pointerdown', e => { e.stopPropagation(); toggleBigMap(); });
  $('rot-ok').onclick = () => $('rotate').classList.add('dismiss');
  $('fps').style.display = Settings.showFps ? 'block' : 'none';
  document.body.addEventListener('pointerdown', () => { Audio.init(); Audio.playMusic(M.state === 'menu' ? 'menu' : 'match'); }, { once: true });
  Audio.playMusic('menu');
  show('menu'); M.state = 'menu'; requestAnimationFrame(loop);
  // Debug-Zugriff für Tests
  window.ZRDBG = { M, S, BUS, W, startMatchFlow, beginBus, endMatch, Settings, Profile, step };
}
window.addEventListener('load', () => { boot().catch(e => { $('booterr').textContent = 'Fehler: ' + e.message; console.error(e); }); });
