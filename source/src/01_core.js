'use strict';
// ============ ZIEGENFISCH ROYALE – Core: Utils, Speicher, Einstellungen, Audio ============
const ZR = {};
const DEG = Math.PI / 180;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const rand = (a, b) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(rand(a, b + 1));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const dist2 = (ax, az, bx, bz) => { const dx = ax - bx, dz = az - bz; return dx * dx + dz * dz; };
const $ = id => document.getElementById(id);

// Deterministisches Rauschen für die Insel
function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const NOISE_PERM = (() => { const r = mulberry(1337); const p = []; for (let i = 0; i < 256; i++) p[i] = i; for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; } return p.concat(p); })();
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const h = (i, j) => NOISE_PERM[(NOISE_PERM[(i & 255)] + (j & 255)) & 511] / 255;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  return lerp(lerp(h(xi, yi), h(xi + 1, yi), u), lerp(h(xi, yi + 1), h(xi + 1, yi + 1), u), v);
}
function fbm(x, y, oct) { let s = 0, a = 0.5, f = 1, n = 0; for (let i = 0; i < oct; i++) { s += a * vnoise(x * f, y * f); n += a; a *= 0.5; f *= 2.03; } return s / n; }

// ---------- Speicher (localStorage mit Absicherung) ----------
const Store = {
  get(k, def) { try { const v = localStorage.getItem('zr_' + k); return v ? JSON.parse(v) : def; } catch (e) { return def; } },
  set(k, v) { try { localStorage.setItem('zr_' + k, JSON.stringify(v)); } catch (e) { } }
};

const DEFAULT_SETTINGS = {
  music: 0.5, sfx: 0.8, camSens: 1.0, joySens: 1.0, quality: 'mittel', autoFire: false, aimRadius: 1.0,
  showFps: false, controlHelp: true, aimAssist: 'sehr', difficulty: 'leicht', duration: 'kurz', leftFire: true
};
const Settings = Object.assign({}, DEFAULT_SETTINGS, Store.get('settings', {}));
if (!Settings.v2) { Settings.v2 = true; Settings.aimAssist = 'sehr'; Settings.difficulty = 'leicht'; Settings.quality = 'mittel'; }
if (!['stark', 'sehr', 'max'].includes(Settings.aimAssist)) Settings.aimAssist = 'sehr';
const AIM = { stark: { cone: 9, spread: 0.4, pull: 3.5, head: 0.12 }, sehr: { cone: 16, spread: 0.1, pull: 6, head: 0.18 }, max: { cone: 28, spread: 0, pull: 10, head: 0.25 } };
function saveSettings() { Store.set('settings', Settings); }

const DEFAULT_PROFILE = {
  name: 'Ziegenfish_2', xp: 0, level: 1, wins: 0, kills: 0, matches: 0, deaths: 0, top10: 0,
  damage: 0, bestPlace: 100, playTime: 0, skin: 'ziegenfisch', glider: 'flosse', trail: 'blasen',
  weaponKills: {}, history: []
};
const Profile = Object.assign({}, DEFAULT_PROFILE, Store.get('profile', {}));
function saveProfile() { Store.set('profile', Profile); }
function xpForLevel(l) { return 400 + (l - 1) * 150; }
function addXP(x) {
  Profile.xp += x; let up = 0;
  while (Profile.xp >= xpForLevel(Profile.level)) { Profile.xp -= xpForLevel(Profile.level); Profile.level++; up++; }
  saveProfile(); return up;
}

// ---------- Audio: alles synthetisch erzeugt (keine fremden Sounds) ----------
const Audio = {
  ctx: null, master: null, sfxGain: null, musicGain: null, noiseBuf: null, musicTimer: null, track: null, stormNode: null,
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain(); this.master.connect(this.ctx.destination);
      const comp = this.ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; comp.connect(this.master);
      this.sfxGain = this.ctx.createGain(); this.sfxGain.connect(comp);
      this.musicGain = this.ctx.createGain(); this.musicGain.connect(comp);
      const len = this.ctx.sampleRate * 1.5; this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.applyVolumes();
      if (this.pendingTrack) this.playMusic(this.pendingTrack);
    } catch (e) { this.ctx = null; }
  },
  applyVolumes() { if (!this.ctx) return; this.sfxGain.gain.value = Settings.sfx; this.musicGain.gain.value = Settings.music * 0.35; },
  noise(t, dur, freq, q, vol, type = 'bandpass', dest, decay) {
    const c = this.ctx, s = c.createBufferSource(); s.buffer = this.noiseBuf;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + (decay || dur));
    s.connect(f); f.connect(g); g.connect(dest || this.sfxGain); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
    return f;
  },
  tone(t, freq, dur, vol, type = 'sine', dest, endFreq) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(freq, t);
    if (endFreq) o.frequency.exponentialRampToValueAtTime(endFreq, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest || this.sfxGain); o.start(t); o.stop(t + dur + 0.05);
  },
  // Lautstärke nach Entfernung
  spatial(dist) { return clamp(1 - dist / 220, 0, 1) ** 1.6; },
  shot(kind, dist = 0) {
    if (!this.ctx) return; const v = this.spatial(dist); if (v < 0.02) return; const t = this.ctx.currentTime;
    const P = {
      ar: [900, 0.8, 0.5, 0.16, 120], tac: [1200, 0.9, 0.45, 0.12, 140], smg: [1600, 1, 0.35, 0.09, 180], rsmg: [1900, 1, 0.32, 0.08, 200],
      pump: [500, 0.6, 0.8, 0.35, 70], tsg: [650, 0.7, 0.65, 0.28, 80], bolt: [700, 0.5, 0.9, 0.6, 60], semi: [800, 0.6, 0.75, 0.42, 70], pistol: [1400, 0.9, 0.4, 0.12, 160]
    }[kind] || [1000, 1, 0.4, 0.12, 150];
    this.noise(t, P[3], P[0], P[1], P[2] * v, 'bandpass');
    this.noise(t, P[3] * 0.6, 180, 0.7, P[2] * 0.9 * v, 'lowpass');
    this.tone(t, P[4], P[3] * 0.8, 0.35 * P[2] * v, 'triangle', null, 40);
    if (kind === 'bolt' || kind === 'pump') this.noise(t + 0.02, 0.9, 300, 0.4, 0.12 * v, 'lowpass', null, 0.9);
  },
  reload(kind) { if (!this.ctx) return; const t = this.ctx.currentTime; this.noise(t, 0.05, 3000, 3, 0.25); this.noise(t + 0.35, 0.05, 2200, 3, 0.3); this.tone(t + 0.36, 900, 0.05, 0.08, 'square'); if (kind === 'pump' || kind === 'tsg') this.noise(t + 0.6, 0.12, 900, 1, 0.3); },
  empty() { if (!this.ctx) return; this.tone(this.ctx.currentTime, 1800, 0.04, 0.12, 'square'); },
  step(dist = 0, water) { if (!this.ctx) return; const v = this.spatial(dist * 3); if (v < 0.05) return; this.noise(this.ctx.currentTime, 0.07, water ? 600 : 250 + Math.random() * 120, 1.2, (water ? 0.18 : 0.12) * v, 'bandpass'); },
  hit(head) { if (!this.ctx) return; const t = this.ctx.currentTime; this.tone(t, head ? 2400 : 1500, 0.07, head ? 0.25 : 0.18, 'square'); if (head) this.tone(t + 0.04, 3200, 0.08, 0.15, 'sine'); },
  shieldHit() { if (!this.ctx) return; const t = this.ctx.currentTime; this.tone(t, 2600, 0.1, 0.12, 'sine', null, 1800); },
  hurt() { if (!this.ctx) return; const t = this.ctx.currentTime; this.noise(t, 0.15, 400, 1, 0.4, 'lowpass'); this.tone(t, 160, 0.15, 0.2, 'sawtooth', null, 90); },
  elim() { if (!this.ctx) return; const t = this.ctx.currentTime;[880, 1175, 1568].forEach((f, i) => this.tone(t + i * 0.07, f, 0.25, 0.18, 'triangle')); },
  pickup() { if (!this.ctx) return; const t = this.ctx.currentTime; this.tone(t, 660, 0.08, 0.15, 'sine'); this.tone(t + 0.06, 990, 0.1, 0.15, 'sine'); },
  chest() { if (!this.ctx) return; const t = this.ctx.currentTime;[523, 659, 784, 1046, 1318].forEach((f, i) => this.tone(t + i * 0.06, f, 0.4, 0.12, 'triangle')); },
  heal() { if (!this.ctx) return; const t = this.ctx.currentTime; this.tone(t, 400, 0.6, 0.12, 'sine', null, 900); },
  ui() { if (!this.ctx) return; this.tone(this.ctx.currentTime, 1200, 0.05, 0.1, 'triangle'); },
  jump() { if (!this.ctx) return; this.noise(this.ctx.currentTime, 0.1, 500, 1, 0.12); },
  explosion(dist = 0) {
    if (!this.ctx) return; const v = this.spatial(dist * 0.6); if (v < 0.02) return; const t = this.ctx.currentTime;
    this.noise(t, 1.4, 120, 0.5, 1.0 * v, 'lowpass', null, 1.4); this.noise(t, 0.4, 900, 0.6, 0.5 * v, 'bandpass'); this.tone(t, 70, 0.8, 0.6 * v, 'sine', null, 30);
  },
  victory() {
    if (!this.ctx) return; const t = this.ctx.currentTime; const n = [523, 659, 784, 1046, 784, 1046, 1318, 1568];
    n.forEach((f, i) => { this.tone(t + i * 0.16, f, 0.5, 0.2, 'triangle'); this.tone(t + i * 0.16, f / 2, 0.5, 0.12, 'sawtooth'); });
  },
  defeat() { if (!this.ctx) return; const t = this.ctx.currentTime;[392, 349, 311, 262].forEach((f, i) => this.tone(t + i * 0.3, f, 0.6, 0.18, 'triangle')); },
  whoosh() { if (!this.ctx) return; const t = this.ctx.currentTime; const f = this.noise(t, 1.2, 400, 0.8, 0.3, 'bandpass', null, 1.2); f.frequency.linearRampToValueAtTime(1500, t + 1); },
  stormWarn() { if (!this.ctx) return; const t = this.ctx.currentTime; this.tone(t, 300, 0.6, 0.2, 'sawtooth', null, 600); this.tone(t + 0.6, 300, 0.6, 0.2, 'sawtooth', null, 600); },
  setStorm(level) {
    if (!this.ctx) return;
    if (!this.stormNode) {
      const c = this.ctx, s = c.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true;
      const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 300; const g = c.createGain(); g.gain.value = 0;
      const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 55; const og = c.createGain(); og.gain.value = 0.08;
      s.connect(f); o.connect(og); og.connect(f); f.connect(g); g.connect(this.sfxGain); s.start(); o.start(); this.stormNode = g;
    }
    this.stormNode.gain.setTargetAtTime(level * 0.5, this.ctx.currentTime, 0.3);
  },
  // ---- Musik: kleiner Sequenzer ----
  playMusic(name) {
    this.pendingTrack = name; if (!this.ctx) return; if (this.track === name) return;
    this.track = name; if (this.musicTimer) clearInterval(this.musicTimer); if (!name) return;
    const T = name === 'menu' ? { bpm: 96, chords: [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]], bass: true, hat: false, lead: [69, 72, 76, 74, 72, 69, 67, 69] }
      : { bpm: 128, chords: [[50, 53, 57], [46, 50, 53], [48, 52, 55], [45, 48, 52]], bass: true, hat: true, lead: null };
    const spb = 60 / T.bpm; let step = 0; let next = this.ctx.currentTime + 0.1;
    const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
    this.musicTimer = setInterval(() => {
      if (!this.ctx) return;
      while (next < this.ctx.currentTime + 0.3) {
        const bar = Math.floor(step / 8) % 4, ch = T.chords[bar], s8 = step % 8;
        if (s8 === 0) ch.forEach(n => this.tone(next, mtof(n), spb * 4, 0.05, 'triangle', this.musicGain));
        if (T.bass && (s8 % 2 === 0)) this.tone(next, mtof(ch[0] - 12), spb * 0.45, 0.14, name === 'menu' ? 'sine' : 'sawtooth', this.musicGain);
        if (T.hat) { this.noise(next, 0.04, 8000, 1, s8 % 2 ? 0.05 : 0.09, 'highpass', this.musicGain); if (s8 === 0 || s8 === 4) this.tone(next, 110, 0.18, 0.35, 'sine', this.musicGain, 40); if (s8 === 2 || s8 === 6) this.noise(next, 0.12, 1800, 0.8, 0.12, 'bandpass', this.musicGain); }
        if (T.lead && step % 2 === 0) { const ln = T.lead[(step / 2) % T.lead.length]; this.tone(next, mtof(ln), spb * 0.9, 0.035, 'sine', this.musicGain); }
        next += spb / 2; step++;
      }
    }, 100);
  }
};
