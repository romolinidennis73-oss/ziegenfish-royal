// ============ Eingabe, HUD, Menüs ============
const Input = { jx: 0, jy: 0, look: [0, 0], fire: false, firePressed: false, aim: false, jump: false, crouchToggle: false, keys: {}, mouseLook: false };
const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

function initInput() {
  const layer = $('touch'); const joy = $('joy'), knob = $('knob'); const ptrs = new Map();
  const startJoy = (p, e) => { p.kind = 'joy'; p.ox = e.clientX; p.oy = e.clientY; joy.style.left = (e.clientX - 65) + 'px'; joy.style.top = (e.clientY - 65) + 'px'; joy.classList.add('on'); };
  layer.addEventListener('pointerdown', e => {
    Audio.init(); e.preventDefault(); const p = { x: e.clientX, y: e.clientY }; ptrs.set(e.pointerId, p);
    if (e.pointerType === 'mouse') { p.kind = 'look'; if (e.button === 0 && M.state !== 'menu') { Input.fire = true; Input.firePressed = true; } if (e.button === 2) Input.aim = !Input.aim; tryLock(); return; }
    if (e.clientX < innerWidth * 0.42) startJoy(p, e); else p.kind = 'look';
    layer.setPointerCapture && layer.setPointerCapture(e.pointerId);
  });
  layer.addEventListener('contextmenu', e => e.preventDefault());
  const move = e => {
    const p = ptrs.get(e.pointerId); if (!p) return;
    if (p.kind === 'joy') { let dx = e.clientX - p.ox, dy = e.clientY - p.oy; const L = Math.hypot(dx, dy), R = 58; if (L > R) { dx *= R / L; dy *= R / L; } knob.style.transform = `translate(${dx}px,${dy}px)`; const s = Settings.joySens; Input.jx = clamp(dx / R * s, -1, 1); Input.jy = clamp(dy / R * s, -1, 1); }
    else if (p.kind === 'look') { Input.look[0] += e.clientX - p.x; Input.look[1] += e.clientY - p.y; }
    p.x = e.clientX; p.y = e.clientY;
  };
  const up = e => { const p = ptrs.get(e.pointerId); if (!p) return; if (p.kind === 'joy') { Input.jx = Input.jy = 0; knob.style.transform = ''; joy.classList.remove('on'); } if (e.pointerType === 'mouse') Input.fire = false; ptrs.delete(e.pointerId); };
  layer.addEventListener('pointermove', move); layer.addEventListener('pointerup', up); layer.addEventListener('pointercancel', up);
  // Buttons: Tippen + Ziehen zum Umsehen (wichtig beim Feuerknopf)
  document.querySelectorAll('[data-b]').forEach(el => {
    const b = el.dataset.b; let last = null;
    el.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); Audio.init(); el.classList.add('down'); el.setPointerCapture && el.setPointerCapture(e.pointerId); last = [e.clientX, e.clientY]; btnDown(b); });
    el.addEventListener('pointermove', e => { if (!last) return; if (b === 'fire' || b === 'fire2' || b === 'aim') { Input.look[0] += e.clientX - last[0]; Input.look[1] += e.clientY - last[1]; } last = [e.clientX, e.clientY]; });
    const end = e => { if (!last) return; last = null; el.classList.remove('down'); btnUp(b); };
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
  });
  // Tastatur (für Tests am PC)
  addEventListener('keydown', e => {
    Input.keys[e.code] = true; if (M.state === 'menu') return;
    if (e.code === 'Space') btnDown('jump'); if (e.code === 'KeyR') btnDown('reload'); if (e.code === 'KeyC' || e.code === 'ControlLeft') btnDown('crouch');
    if (e.code === 'KeyE' || e.code === 'KeyF') btnDown('swap'); if (/^Digit[1-5]$/.test(e.code)) selectSlot(+e.code.slice(5) - 1); if (e.code === 'KeyM') toggleBigMap(); if (e.code === 'Escape') togglePause(true); if (e.code === 'KeyG') btnDown('glide');
  });
  addEventListener('keyup', e => { Input.keys[e.code] = false; });
  addEventListener('mousemove', e => { if (document.pointerLockElement) { Input.look[0] += e.movementX; Input.look[1] += e.movementY; } });
  addEventListener('mouseup', e => { if (e.button === 0) Input.fire = false; });
  addEventListener('wheel', e => { if (M.state === 'play' && M.player) selectSlot((M.player.sel + (e.deltaY > 0 ? 1 : 4)) % 5); });
}
function tryLock() { try { if (!isTouch && M.state === 'play' && !document.pointerLockElement) { const r = $('gl').requestPointerLock && $('gl').requestPointerLock(); if (r && r.catch) r.catch(() => { }); } } catch (e) { } }
function btnDown(b) {
  const p = M.player; if (!p) return;
  switch (b) {
    case 'fire': case 'fire2': Input.fire = true; Input.firePressed = true; break;
    case 'aim': Input.aim = !Input.aim; break;
    case 'jump': Input.jump = true; break;
    case 'crouch': p.crouch = !p.crouch; break;
    case 'reload': startReload(p); break;
    case 'swap': if (UI.swapItem) { tryPickup(p, UI.swapItem, true); UI.swapItem = null; } break;
    case 'drop': playerJump(); break;
    case 'glide': if (p.mode === 'sky') { p.mode = 'glide'; Audio.whoosh(); } break;
    case 'map': toggleBigMap(); break;
    case 'pause': togglePause(true); break;
    case 'emote': toggleEmotes(); break;
  }
}
function toggleEmotes(force) {
  const el = $('emotes'); const on = force != null ? force : !el.classList.contains('on'); el.classList.toggle('on', on); if (!on) return;
  el.innerHTML = ''; for (const k in EMOTES) { const ok = isUnlocked('emote', k); const b = document.createElement('button'); if (!ok) b.className = 'lock'; b.innerHTML = esc(EMOTES[k].name) + `<small>${ok ? 'Antippen zum Abspielen' : '🔒 ' + lockText('emote', k)}</small>`;
    b.onpointerdown = ev => { ev.stopPropagation(); if (!ok) { UI.toast(lockText('emote', k)); return; } const p = M.player; if (p && p.alive) { startEmote(p, k); } toggleEmotes(false); }; el.appendChild(b); }
}
function btnUp(b) { if (b === 'fire' || b === 'fire2') Input.fire = false; }
function selectSlot(i) { const p = M.player; if (!p || !p.alive) return; if (p.sel !== i) { p.sel = i; p.reloadT = 0; p.healT = 0; p.burstLeft = 0; syncHeld(p); Audio.ui(); p.fireCD = Math.max(p.fireCD, 0.25); } }

// ---------------- HUD ----------------
const UI = {
  slotSig: '', swapItem: null, feedEls: [], toastT: 0, bannerT: 0, hurtT: 0, mapBase: null, mmCtx: null, bigOpen: false,
  hitmarker(head) { const h = $('hitm'); h.className = 'show' + (head ? ' head' : ''); clearTimeout(this._hm); this._hm = setTimeout(() => h.className = '', 140); },
  hurt(att) { this.hurtT = 0.6; if (att && M.player) { const a = Math.atan2(att.x - M.player.x, att.z - M.player.z) - M.player.camYaw; const el = $('hurtdir'); el.style.transform = `rotate(${-a}rad)`; el.style.opacity = 1; clearTimeout(this._hd); this._hd = setTimeout(() => el.style.opacity = 0, 900); } },
  kick(w) { M.player.recoilP = Math.min(0.12, (M.player.recoilP || 0) + (w.scope ? 0.06 : w.pellets ? 0.05 : 0.014)); FX.shake = Math.max(FX.shake, w.pellets || w.scope ? 0.35 : 0.12); },
  toast(t, col) { const e = $('toast'); e.textContent = t; e.style.color = col || ''; e.classList.add('show'); clearTimeout(this._t); this._t = setTimeout(() => e.classList.remove('show'), 1500); },
  banner(t, kind) { const e = $('banner'); e.textContent = t; e.className = 'show ' + (kind || ''); clearTimeout(this._b); this._b = setTimeout(() => e.className = '', 2400); },
  feed(k, v, wkey, how) {
    const host = $('feed'); const e = document.createElement('div'); e.className = 'fi' + (k && k.isPlayer || v.isPlayer ? ' me' : '');
    const wn = wkey === 'faust' ? 'Faust' : wkey === 'sturm' ? 'Sturm' : itemName(wkey || '');
    const verb = pick(['hat', 'hat', 'hat']) + ' ' + esc(v.name) + ' ' + pick(['eingefischt', 'weggemeckert', 'filetiert', 'umgehornt', 'ausgeknipst', 'in den Sturm geschickt', 'zur Fischsuppe gemacht', 'vom Bock gestoßen']);
    e.innerHTML = how ? `<b>${esc(v.name)}</b> ist ${how}` : `<b>${esc(k.name)}</b> <span class="w">[${esc(wn)}]</span> ${verb.replace(esc(v.name), '<b>' + esc(v.name) + '</b>')}`;
    host.prepend(e); setTimeout(() => e.remove(), 6000); while (host.children.length > 5) host.lastChild.remove();
  },
  killPop(p) {
    const now = M.time; p.streak = now - (p.lastKillT || -99) < 8 ? (p.streak || 1) + 1 : 1; p.lastKillT = now;
    const names = { 2: 'DOPPEL-KILL!', 3: 'TRIPLE-KILL!', 4: 'ZIEGEN-RAMPAGE!', 5: 'FISCH-FRENZY!' };
    const el = $('killpop'); el.innerHTML = `<b>+1</b> ELIM<small>${p.kills} Eliminierung${p.kills === 1 ? '' : 'en'}</small>` + (p.streak > 1 ? `<i>${names[Math.min(p.streak, 5)]}</i>` : '');
    el.classList.remove('show'); void el.offsetWidth; el.classList.add('show'); const k = $('kills').parentNode; k.classList.remove('pulse'); void k.offsetWidth; k.classList.add('pulse');
    if (p.streak > 1) setTimeout(() => Audio.chest(), 250);
  },
  updateHUD(dt) {
    const p = M.player; if (!p) return;
    $('alive').textContent = M.aliveCount; $('kills').textContent = p.kills; const tt = Math.floor(M.time); $('mtime').textContent = Math.floor(tt / 60) + ':' + String(tt % 60).padStart(2, '0');
    $('hpbar').style.width = clamp(p.hp, 0, 100) + '%'; $('vitals').classList.toggle('low', p.hp < 30); $('hpnum').textContent = Math.ceil(Math.max(0, p.hp)); $('shbar').style.width = clamp(p.shield, 0, 100) + '%'; $('shnum').textContent = Math.ceil(p.shield);
    // Sturm-Info
    const st = S.mode === 'wait' ? 'Sturm zieht zu in ' : S.mode === 'shrink' ? 'Sturm schrumpft: ' : 'Letzte Zone'; const sec = Math.max(0, Math.ceil(S.t));
    $('storminfo').textContent = S.mode === 'final' ? st : st + Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
    const out = p.mode === 'ground' && !inSafe(p.x, p.z); $('stormfx').style.opacity = out ? 1 : 0; Audio.setStorm(out ? 1 : clamp(1 - (S.r - Math.hypot(p.x - S.cx, p.z - S.cz)) / 30, 0, 0.5));
    if (p.mode === 'ground') { const dn = Math.hypot(p.x - S.tx, p.z - S.tz) - S.tr; $('zonedist').textContent = dn > 0 ? Math.round(dn) + ' m bis zur Zone' : ''; } else $('zonedist').textContent = '';
    // Slots
    const sig = p.slots.map(s => s ? s.key + (s.rar || 0) + ':' + (s.n || 0) : '-').join('|') + p.sel;
    if (sig !== this.slotSig) {
      this.slotSig = sig; const host = $('slots'); host.innerHTML = '';
      p.slots.forEach((s, i) => {
        const d = document.createElement('div'); d.className = 'slot' + (i === p.sel ? ' sel' : '') + (s ? ' full' : ''); if (s) d.style.setProperty('--rc', RARITY[s.rar || 0].col);
        d.innerHTML = s ? `<div class="ic ${s.key}"></div><div class="sn">${esc(WEAPONS[s.key] ? WEAPONS[s.key].en : ITEMS[s.key].name)}</div>${s.n != null ? `<div class="cnt">${s.n}</div>` : ''}` : `<div class="sn">${i + 1}</div>`;
        d.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); selectSlot(i); }); host.appendChild(d);
      });
    }
    const w = curWeapon(p); const s = curSlot(p);
    if (w) { const W2 = WEAPONS[w.key]; $('ammo').innerHTML = `<small>${esc(W2.name)}</small><b>${w.mag}</b><span>/ ${p.ammo[W2.ammo]}</span>`; }
    else if (s) $('ammo').innerHTML = `<small>${esc(ITEMS[s.key].name)} · Feuerknopf = ${ITEMS[s.key].throw ? 'werfen' : 'benutzen'}</small><b>${s.n}</b>`;
    else $('ammo').innerHTML = `<small>Faust</small>`;
    $('reload').style.display = p.reloadT > 0 || p.healT > 0 ? 'block' : 'none';
    if (p.reloadT > 0 && w) $('reload').textContent = 'Nachladen… ' + p.reloadT.toFixed(1) + 's'; else if (p.healT > 0) { const it = ITEMS[p.healKey], k = 1 - p.healT / it.use; $('reload').innerHTML = esc(itemName(p.healKey)) + ' … ' + p.healT.toFixed(1) + 's<i class="ub"><i style="width:' + Math.round(k * 100) + '%;background:' + (it.shield && !it.heal ? 'var(--sh)' : it.shield ? 'linear-gradient(90deg,var(--hp),var(--sh))' : 'var(--hp)') + '"></i></i>'; }
    $('xhair').className = (p.ads ? 'ads' : '') + (w && WEAPONS[w.key].pellets ? ' sg' : '');
    const spread = w ? (WEAPONS[w.key].scope && !p.ads ? WEAPONS[w.key].hipSpread : wStat(w.key, w.rar).spread * (p.ads ? 0.55 : 1)) + p.bloom : 2;
    $('xhair').style.setProperty('--sp', (8 + spread * 7 * (1 + Math.hypot(p.vx, p.vz) / 12)) + 'px');
    $('scope').style.display = p.ads && w && WEAPONS[w.key].scope ? 'block' : 'none';
    // Tausch-Knopf
    $('btn-swap').style.display = this.swapItem ? 'flex' : 'none'; if (this.swapItem) $('btn-swap').innerHTML = `<span>Tauschen</span><b style="color:${RARITY[this.swapItem.rar || 0].col}">${esc(itemName(this.swapItem.key))}</b>`;
    const flying = p.mode === 'sky' || p.mode === 'glide' || p.mode === 'bus';
    $('hud').classList.toggle('flying', flying); $('btn-drop').style.display = p.mode === 'bus' ? 'flex' : 'none'; $('btn-glide').style.display = p.mode === 'sky' ? 'flex' : 'none';
    $('lobbyinfo').style.display = M.state === 'lobby' ? 'block' : 'none'; if (M.state === 'lobby') $('lobbyinfo').innerHTML = `WARTERAUM<br><b>Match startet in ${Math.ceil(M.lobbyT)}</b><br><small>${M.chars.length} Spieler bereit</small>`;
    if (p.mode === 'sky' || p.mode === 'glide') { const ag = Math.max(0, Math.round(p.y - heightAt(p.x, p.z))); $('alt').style.display = 'block'; $('alt').textContent = ag + ' m'; } else $('alt').style.display = 'none';
    this.hurtT = Math.max(0, this.hurtT - dt); $('vign').style.opacity = Math.max(this.hurtT, p.hp < 30 ? 0.35 + Math.sin(M.time * 6) * 0.1 : 0);
    $('help').style.display = Settings.controlHelp && M.time < 25 ? 'block' : 'none'; $('hud').classList.toggle('help', Settings.controlHelp);
  },
  // Karte
  buildMapBase() {
    const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d'); const img = g.createImageData(512, 512);
    for (let j = 0; j < 512; j++) for (let i = 0; i < 512; i++) {
      const x = -550 + i / 512 * 1100, z = -550 + j / 512 * 1100, h = heightAt(x, z), k = (j * 512 + i) * 4; let r, gg, b;
      const wl = waterAt(x, z);
      if (h < wl - 0.2) { const d = clamp((wl - h) / 12, 0, 1); r = 40 - d * 20; gg = 120 - d * 40; b = 160 - d * 30; }
      else if (h < 2.8) { r = 214; gg = 196; b = 140; }
      else if (h > 100) { r = 235; gg = 238; b = 240; } else if (h > 50) { r = 125; gg = 120; b = 112; }
      else { const f = Math.hypot(x + 230, z + 220) < 170 ? 0.75 : 1; r = (80 + h * 0.6) * f; gg = (130 + h * 0.5) * f; b = (60) * f; const p = zoneAt(x, z); if (p && p.ground === 'asphalt') { r = 120; gg = 120; b = 122; } else if (p && p.ground === 'dirt') { r = 150; gg = 132; b = 92; } }
      img.data[k] = r; img.data[k + 1] = gg; img.data[k + 2] = b; img.data[k + 3] = 255;
    }
    g.putImageData(img, 0, 0); const sc = 512 / 1100, tx = x => (x + 550) * sc;
    g.strokeStyle = '#e8e2c8'; g.lineWidth = 2.5; g.lineCap = 'round'; for (const s of W.roadSegs) { g.beginPath(); g.moveTo(tx(s.ax), tx(s.az)); g.lineTo(tx(s.bx), tx(s.bz)); g.stroke(); }
    g.fillStyle = 'rgba(40,44,52,0.85)'; for (const b of W.boxes) { if (b.kind === 'tree' || b.kind === 'rock' || b.kind === 'lobby' || b.kind === 'fence' || b.kind === 'door' || b.kind === 'furn') continue; if ((b.x1 - b.x0) * (b.z1 - b.z0) < 3) continue; g.fillRect(tx(b.x0), tx(b.z0), Math.max(1, (b.x1 - b.x0) * sc), Math.max(1, (b.z1 - b.z0) * sc)); }
    this.mapBase = c;
  },
  drawMap(ctx, size, cx, cz, span, big) {
    const sc = size / span, x0 = cx - span / 2, z0 = cz - span / 2; const ms = 512 / 1100;
    ctx.fillStyle = '#1d4f66'; ctx.fillRect(0, 0, size, size);
    ctx.drawImage(this.mapBase, (x0 + 550) * ms, (z0 + 550) * ms, span * ms, span * ms, 0, 0, size, size);
    const T = (x, z) => [(x - x0) * sc, (z - z0) * sc];
    if (M.state !== 'lobby') {
      // Sturm
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, size, size); const [sx, sz] = T(S.cx, S.cz); ctx.arc(sx, sz, Math.max(0, S.r * sc), 0, Math.PI * 2, true); ctx.fillStyle = 'rgba(140,40,210,0.42)'; ctx.fill('evenodd');
      ctx.strokeStyle = '#d17bff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(sx, sz, Math.max(0, S.r * sc), 0, Math.PI * 2); ctx.stroke();
      if (S.mode !== 'final') { const [nx, nz] = T(S.tx, S.tz); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.arc(nx, nz, Math.max(0, S.tr * sc), 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); }
      ctx.restore();
      if (BUS.active || M.player.mode === 'bus') { const [ax, az] = T(BUS.ax, BUS.az), [bx2, bz] = T(BUS.bx, BUS.bz); ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2; ctx.setLineDash([8, 6]); ctx.beginPath(); ctx.moveTo(ax, az); ctx.lineTo(bx2, bz); ctx.stroke(); ctx.setLineDash([]); const [px, pz] = busPos(BUS.t); const [qx, qz] = T(px, pz); ctx.fillStyle = '#5ff4ff'; ctx.beginPath(); ctx.arc(qx, qz, 6, 0, 7); ctx.fill(); }
    }
    if (big) { ctx.font = '600 13px system-ui'; ctx.textAlign = 'center'; for (const p of W.pois) { const [x, z] = T(p.x, p.z); ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillText(p.name, x + 1, z + 1); ctx.fillStyle = '#fff'; ctx.fillText(p.name, x, z); } }
    // Spieler
    const p = M.player; const [px, pz] = T(p.x, p.z); ctx.save(); ctx.translate(px, pz); ctx.rotate(-(p.camYaw || p.yaw) + Math.PI); ctx.fillStyle = '#ffe14d'; ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(6, 6); ctx.lineTo(0, 3); ctx.lineTo(-6, 6); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
    if (big) { ctx.fillStyle = '#fff'; ctx.font = '12px system-ui'; ctx.textAlign = 'left'; ctx.fillText('Gestrichelt weiß = nächste sichere Zone', 8, size - 10); }
  },
  minimap() { if (!this.mmCtx) this.mmCtx = $('minimap').getContext('2d'); const p = M.player; if (!p) return; const sz = $('minimap').width; this.drawMap(this.mmCtx, sz, M.state === 'lobby' ? 0 : p.x, M.state === 'lobby' ? 0 : p.z, M.state === 'lobby' || p.mode === 'bus' ? 1100 : p.mode === 'ground' ? 260 : 500, false); if (this.bigOpen) { const bc = $('bigmapc'); this.drawMap(bc.getContext('2d'), bc.width, 0, 0, 1100, true); } }
};
function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function toggleBigMap() { UI.bigOpen = !UI.bigOpen; $('bigmap').style.display = UI.bigOpen ? 'flex' : 'none'; if (UI.bigOpen) { const bc = $('bigmapc'); const s = Math.min(innerWidth, innerHeight) * 0.86 * Math.min(devicePixelRatio, 2); bc.width = bc.height = Math.round(s); } }
function togglePause(on) { if (M.state !== 'play' && M.state !== 'lobby') return; M.paused = on; $('pause').style.display = on ? 'flex' : 'none'; if (on && document.exitPointerLock) document.exitPointerLock(); }

// ---------------- Menüs ----------------
function show(id) { for (const s of ['menu', 'panel', 'mm', 'loading', 'hud', 'end', 'boot']) $(s).classList.toggle('hidden', s !== id); ZR.menuVisible = id === 'menu' || id === 'panel'; }
function refreshMenu() {
  const P = Profile; $('pname').textContent = P.name; $('plevel').textContent = P.level; $('pxp').style.width = (P.xp / xpForLevel(P.level) * 100) + '%'; $('pxpt').textContent = P.xp + ' / ' + xpForLevel(P.level) + ' XP';
  $('pwins').textContent = P.wins; $('pkills').textContent = P.kills; $('pskin').textContent = SKINS[P.skin].name;
  $('mdiff').textContent = 'Bots: ' + ({ leicht: 'Einfach', mittel: 'Normal', schwer: 'Schwer' })[Settings.difficulty] + ' · Zielhilfe: ' + ({ stark: 'Stark', sehr: 'Sehr stark', max: 'Maximal' })[Settings.aimAssist] + ' · ' + (Settings.duration === 'lang' ? '~15 Min.' : '~9 Min.');
}
function openPanel(kind) {
  Audio.init(); Audio.ui(); show('panel'); const body = $('pbody'), title = $('ptitle'); body.innerHTML = ''; ZR.panel = kind; ZR.menuWeapon = null;
  if (kind === 'char') {
    title.textContent = 'Spieler-Charakter';
    for (const k of SKIN_KEYS) { const s = SKINS[k]; const d = document.createElement('button'); d.className = 'card' + (Profile.skin === k ? ' sel' : ''); d.style.setProperty('--rc', RARITY[s.rarity].col); d.innerHTML = `<div class="sw" style="background:linear-gradient(135deg,#${s.top.toString(16).padStart(6, '0')},#${(s.glow || s.accent).toString(16).padStart(6, '0')})"></div><b>${esc(s.name)}</b><small>${RARITY[s.rarity].name}</small><p>${esc(s.desc)}</p>`; d.onclick = () => { Profile.skin = k; saveProfile(); setMenuSkin(); Audio.ui(); openPanel('char'); }; body.appendChild(d); }
    setMenuSkin();
  } else if (kind === 'locker') {
    title.textContent = 'Spind';
    const sec = (t) => { const h = document.createElement('h3'); h.textContent = t; body.appendChild(h); };
    sec('Gleiter (beim Absprung aus dem Blubb-Zeppelin)');
    for (const k in GLIDERS) { const g = GLIDERS[k], ok = isUnlocked('glider', k); const d = document.createElement('button'); d.className = 'card small' + (Profile.glider === k ? ' sel' : '') + (ok ? '' : ' lock'); d.innerHTML = `<div class="sw" style="background:linear-gradient(90deg,#${g.col.toString(16).padStart(6, '0')},#${g.col2.toString(16).padStart(6, '0')})"></div><b>${g.name.replace(/ \(.*\)/, '')}</b>${ok ? '' : `<span class="lk">🔒 ${lockText('glider', k)}</span>`}`; d.onclick = () => { if (!ok) { UI.toast(lockText('glider', k)); return; } Profile.glider = k; saveProfile(); Audio.ui(); openPanel('locker'); }; body.appendChild(d); }
    sec('Flugspur (im freien Fall)');
    for (const k in TRAILS) { const g = TRAILS[k], ok = isUnlocked('trail', k); const d = document.createElement('button'); d.className = 'card small' + (Profile.trail === k ? ' sel' : '') + (ok ? '' : ' lock'); d.innerHTML = `<div class="sw" style="background:${k === 'regenbogen' ? 'linear-gradient(90deg,#ff4d5e,#ffd447,#4fc34a,#3a9bff,#b45cff)' : g.col ? '#' + g.col.toString(16).padStart(6, '0') : '#333'}"></div><b>${g.name.replace(/ \(.*\)/, '')}</b>${ok ? '' : `<span class="lk">🔒 ${lockText('trail', k)}</span>`}`; d.onclick = () => { if (!ok) { UI.toast(lockText('trail', k)); return; } Profile.trail = k; saveProfile(); Audio.ui(); openPanel('locker'); }; body.appendChild(d); }
    sec('Emotes (im Match oben links über den Smiley-Knopf)');
    for (const k in EMOTES) { const ok = isUnlocked('emote', k); const d = document.createElement('button'); d.className = 'card small' + (ok ? '' : ' lock'); d.innerHTML = `<div class="sw" style="background:linear-gradient(135deg,#16707a,#f2c230)"></div><b>${EMOTES[k].name}</b>${ok ? '' : `<span class="lk">🔒 ${lockText('emote', k)}</span>`}`; d.onclick = () => { if (!ok) { UI.toast(lockText('emote', k)); return; } Audio.emote(k); if (menuChar) { menuChar.c.emote = k; menuChar.c.emoteA = 0; setTimeout(() => { menuChar.c.emote = null; }, EMOTES[k].dur * 1000); } }; body.appendChild(d); }
    sec('Ausrüstung im Match: 5 Plätze für Waffen, Heilung, Schilde und Granaten. Munition liegt separat im Rucksack.');
  } else if (kind === 'weapons') {
    title.textContent = 'Waffen';
    const keys = Object.keys(WEAPONS); const mx = { dmg: 120, rate: 14, range: 450, mag: 35, reload: 5 };
    const list = document.createElement('div'); list.className = 'wlist'; body.appendChild(list); const det = document.createElement('div'); det.className = 'wdet'; body.appendChild(det);
    const showW = k => {
      ZR.menuWeapon = k; const w = WEAPONS[k]; const dmgT = w.pellets ? w.dmg * w.pellets : w.dmg; const bar = (l, v, m, txt) => `<div class="wbar"><span>${l}</span><i><em style="width:${clamp(v / m * 100, 3, 100)}%"></em></i><b>${txt}</b></div>`;
      det.innerHTML = `<h2>${esc(w.name)}</h2><small>${esc(w.en)} · ${esc(w.cls)} · ${AMMO[w.ammo].name}</small>` + bar('Schaden', dmgT, mx.dmg, Math.round(dmgT) + (w.pellets ? ' (' + w.pellets + '×' + w.dmg + ')' : '')) + bar('Feuerrate', w.rate, mx.rate, w.rate + '/s') + bar('Reichweite', w.range, mx.range, w.range + ' m') + bar('Magazin', w.mag, mx.mag, w.mag) + bar('Nachladen', mx.reload - w.reload, mx.reload, w.reload + ' s') + `<p>Kopftreffer: ×${w.head}${w.burst ? ' · 3er-Feuerstoß' : ''}${w.scope ? ' · Zielfernrohr' : ''}</p><p class="rar">${RARITY.map(r => `<span style="color:${r.col}">${r.name} ×${r.mult}</span>`).join(' ')}</p>`;
      list.querySelectorAll('button').forEach(b => b.classList.toggle('sel', b.dataset.k === k));
    };
    for (const k of keys) { const b = document.createElement('button'); b.dataset.k = k; b.innerHTML = `<b>${esc(WEAPONS[k].name)}</b><small>${esc(WEAPONS[k].cls)}</small>`; b.onclick = () => { Audio.ui(); showW(k); }; list.appendChild(b); }
    const g = document.createElement('button'); g.innerHTML = '<b>Granate</b><small>Explosiv</small>'; g.onclick = () => { ZR.menuWeapon = 'granate'; det.innerHTML = '<h2>Granate</h2><small>Explosivwaffe · bis zu 6 pro Platz</small><p>Explodiert nach 2,3 s, bis zu 105 Schaden im Umkreis von 7,5 m. Prallt von Wänden ab. Wirkt nicht durch Deckung.</p>'; list.querySelectorAll('button').forEach(b => b.classList.remove('sel')); g.classList.add('sel'); }; list.appendChild(g);
    showW('ar');
  } else if (kind === 'settings') {
    title.textContent = 'Einstellungen'; buildSettings(body);
  } else if (kind === 'stats') {
    title.textContent = 'Statistiken'; const P = Profile; const kd = (P.kills / Math.max(1, P.deaths)).toFixed(2); const pt = Math.round(P.playTime / 60);
    const fav = Object.entries(P.weaponKills || {}).sort((a, b) => b[1] - a[1])[0];
    body.innerHTML = `<div class="stats">${[['Matches', P.matches], ['Siege', P.wins], ['Top 10', P.top10], ['Eliminierungen', P.kills], ['K/D', kd], ['Schaden gesamt', Math.round(P.damage)], ['Beste Platzierung', P.matches ? '#' + P.bestPlace : '–'], ['Spielzeit', pt + ' Min.'], ['Level', P.level], ['Lieblingswaffe', fav ? itemName(fav[0]) : '–']].map(([a, b]) => `<div><small>${a}</small><b>${b}</b></div>`).join('')}</div>
      <h3>Persönliche Bestwerte</h3><div class="stats">${[['Meiste Elims', (P.best || {}).kills || 0], ['Meister Schaden', (P.best || {}).dmg || 0], ['Längstes Überleben', (P.best || {}).surv ? Math.floor(P.best.surv / 60) + ':' + String(P.best.surv % 60).padStart(2, '0') : '–'], ['Weitester Kill', (P.best || {}).longest ? P.best.longest + ' m' : '–']].map(([a, b]) => `<div><small>${a}</small><b>${b}</b></div>`).join('')}</div>
      <h3>Geheimnisse ${secretCount()}/3</h3><div class="hist">${SECRETS.map(x => `<div><b>${(P.secrets || {})[x.id] ? '✔ ' + esc(x.name) : '❓ ???'}</b> <small>${(P.secrets || {})[x.id] ? 'gefunden' : esc(x.hint)}</small></div>`).join('')}</div>
      <h3>Letzte Matches</h3><div class="hist">${(P.history || []).slice(0, 8).map(h => `<div><b>#${h.place}</b> · ${h.kills} Elims · ${Math.round(h.dmg)} Schaden · +${h.xp} XP <small>${h.date}</small></div>`).join('') || '<p>Noch keine Matches gespielt.</p>'}</div>`;
  }
}
function buildSettings(body) {
  const row = (label, html) => { const d = document.createElement('div'); d.className = 'set'; d.innerHTML = `<label>${label}</label><div>${html}</div>`; body.appendChild(d); return d; };
  const slider = (key, label, min, max, step) => { const d = row(label, `<input type="range" min="${min}" max="${max}" step="${step}" value="${Settings[key]}"><span>${Settings[key]}</span>`); const i = d.querySelector('input'), s = d.querySelector('span'); i.oninput = () => { Settings[key] = +i.value; s.textContent = i.value; saveSettings(); Audio.applyVolumes(); }; };
  const toggle = (key, label) => { const d = row(label, `<button class="tg ${Settings[key] ? 'on' : ''}">${Settings[key] ? 'AN' : 'AUS'}</button>`); const b = d.querySelector('button'); b.onclick = () => { Settings[key] = !Settings[key]; saveSettings(); b.className = 'tg ' + (Settings[key] ? 'on' : ''); b.textContent = Settings[key] ? 'AN' : 'AUS'; Audio.ui(); $('fps').style.display = Settings.showFps ? 'block' : 'none'; }; };
  const choice = (key, label, opts, after) => { const d = row(label, opts.map(o => `<button class="ch ${Settings[key] === o[0] ? 'on' : ''}" data-v="${o[0]}">${o[1]}</button>`).join('')); d.querySelectorAll('button').forEach(b => b.onclick = () => { Settings[key] = b.dataset.v; saveSettings(); d.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); Audio.ui(); if (after) after(); refreshMenu(); }); };
  slider('music', 'Musiklautstärke', 0, 1, 0.05); slider('sfx', 'Soundeffekte', 0, 1, 0.05); slider('camSens', 'Kameraempfindlichkeit', 0.3, 2.5, 0.1); slider('joySens', 'Steuerungsempfindlichkeit (Joystick)', 0.6, 1.6, 0.1);
  choice('quality', 'Grafikmodus', [['niedrig', 'Performance'], ['mittel', 'Ausgewogen'], ['hoch', 'Qualität']], () => { applyQuality(); UI.toast('Gras & Bäume ändern sich ab dem nächsten Start'); });
  choice('aimAssist', 'Zielhilfe (Aim Assist)', [['stark', 'Stark'], ['sehr', 'Sehr stark'], ['max', 'Maximal']]); slider('aimRadius', 'Zielhilfe-Radius', 0.5, 1.6, 0.1);
  choice('difficulty', 'Bot-Schwierigkeit', [['leicht', 'Einfach'], ['mittel', 'Normal'], ['schwer', 'Schwer']]);
  choice('duration', 'Matchdauer', [['kurz', '8–10 Min.'], ['lang', '~15 Min.']]);
  choice('weather', 'Tageszeit & Wetter', [['zufall', 'Zufällig'], ['sonne', 'Immer sonnig']]);
  toggle('autoFire', 'Automatisches Schießen'); toggle('showFps', 'FPS-Anzeige'); toggle('controlHelp', 'Steuerungshilfe (Beschriftungen & Tipps)'); toggle('leftFire', 'Zweiter Feuerknopf links');
  const n = row('Spielername', `<input type="text" maxlength="16" value="${esc(Profile.name)}">`); n.querySelector('input').onchange = e => { Profile.name = e.target.value.trim().slice(0, 16) || 'Ziegenfish_2'; saveProfile(); refreshMenu(); };
  const r = row('Statistiken zurücksetzen', `<button class="tg">ZURÜCKSETZEN</button>`); r.querySelector('button').onclick = () => { if (confirm('Wirklich alle Statistiken und Level zurücksetzen?')) { const nm = Profile.name, sk = Profile.skin; Object.assign(Profile, JSON.parse(JSON.stringify(DEFAULT_PROFILE)), { name: nm, skin: sk }); saveProfile(); refreshMenu(); UI.toast('Zurückgesetzt'); } };
}
