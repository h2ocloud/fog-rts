/* ── 特效（粒子／浮字／光環）與合成音效。皆不影響模擬。 ───────── */
const FX = {
  parts: [], floats: [], rings: [], beams: [],
  clear() { this.parts.length = 0; this.floats.length = 0; this.rings.length = 0; this.beams.length = 0; },
  beam(x0, y0, x1, y1, color) { this.beams.push({ x0, y0, x1, y1, color, t: 0, max: .16 }); this.spark(x1, y1, 13, color, 2); },
  spark(tx, ty, z, color, n = 3) {
    for (let i = 0; i < n; i++) this.parts.push({ tx, ty, z, ox: 0, oy: 0, vx: (Math.random() - .5) * 60, vy: -20 - Math.random() * 40, g: 160, t: 0, max: .35 + Math.random() * .25, color, s: 1.6 + Math.random() * 1.4 });
  },
  burst(tx, ty, z, color, n = 12) {
    for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, sp = 30 + Math.random() * 70; this.parts.push({ tx, ty, z, ox: 0, oy: 0, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * .6 - 30, g: 120, t: 0, max: .5 + Math.random() * .5, color, s: 2 + Math.random() * 2 }); }
  },
  float(tx, ty, text, color, z = 30) { this.floats.push({ tx, ty, z, text, color, t: 0, max: 1.3 }); },
  ring(tx, ty, r, color, max = .7) { this.rings.push({ tx, ty, r, color, t: 0, max }); },
  update(dt) {
    for (const p of this.parts) { p.t += dt; p.vy += p.g * dt; p.ox += p.vx * dt; p.oy += p.vy * dt; }
    for (const r of this.rings) r.t += dt; for (const b of this.beams) b.t += dt;
    this.parts = this.parts.filter(p => p.t < p.max); this.rings = this.rings.filter(r => r.t < r.max); if (this.beams.length) this.beams = this.beams.filter(b => b.t < b.max);
  },
  floatStep(dt) { for (const f of this.floats) f.t += dt; this.floats = this.floats.filter(f => f.t < f.max); },
};

const SFX = {
  ac: null, on: store.get('sound', true), last: {}, cur: null, noiseBuf: null, live: 0, made: 0,
  // 每種音效的節流（毫秒）：zap 每 60ms 一次、警報 3 秒內不重複、號角 4 秒
  gap: { coin: 140, zap: 60, hit: 50, boom: 80, alarm: 3000, wave: 4000, capture: 400, lost: 400, research: 500, victory: 3000, defeat: 3000 },
  init() { if (this.ac) { if (this.ac.state === 'suspended') this.ac.resume(); return; } try { const A = window.AudioContext || window.webkitAudioContext; if (!A) return; this.ac = new A(); this.master = this.ac.createGain(); this.master.gain.value = .5; this.master.connect(this.ac.destination); } catch (e) { this.ac = null; } },
  _track(src) { this.live++; this.made++; src.onended = () => { this.live--; try { src.disconnect(); } catch (e) { } }; },
  _noise() { // 共用 1 秒白噪音（只建一次）
    if (this.noiseBuf) return this.noiseBuf; const ac = this.ac, n = ac.sampleRate, b = ac.createBuffer(1, n, n), d = b.getChannelData(0);
    let x = 12345; for (let i = 0; i < n; i++) { x = (x * 1103515245 + 12345) & 0x7fffffff; d[i] = x / 0x3fffffff - 1; }
    return (this.noiseBuf = b);
  },
  tone(f, dur, type = 'sine', vol = .1, when = 0, f2 = null, dest = null) {
    if (!this.on || !this.ac) return; try {
      const t = this.ac.currentTime + when, o = this.ac.createOscillator(), g = this.ac.createGain();
      o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
      o.connect(g); g.connect(dest || this.cur || this.master); o.start(t); o.stop(t + dur + .02); this._track(o);
    } catch (e) { }
  },
  noise(dur, vol = .05, when = 0, ftype = 'bandpass', freq = 1800, q = 1, f2 = null) {
    if (!this.on || !this.ac) return; try {
      const ac = this.ac, t = ac.currentTime + when, s = ac.createBufferSource(), fl = ac.createBiquadFilter(), g = ac.createGain();
      s.buffer = this._noise(); fl.type = ftype; fl.frequency.setValueAtTime(freq, t); if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + dur); fl.Q.value = q;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .005); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
      s.connect(fl); fl.connect(g); g.connect(this.cur || this.master); s.start(t, Math.random() * .5); s.stop(t + dur + .02); this._track(s);
    } catch (e) { }
  },
  // 依畫面位置的聲像／距離衰減：每次呼叫一個臨時匯流排，2.5 秒後拆掉
  _bus(opt) {
    if (!opt || (opt.pan == null && opt.vol == null)) return null;
    const ac = this.ac, g = ac.createGain(); g.gain.value = clamp(opt.vol == null ? 1 : opt.vol, 0, 1);
    let out = g; if (opt.pan != null && ac.createStereoPanner) { const p = ac.createStereoPanner(); p.pan.value = clamp(opt.pan, -1, 1); g.connect(p); out = p; }
    out.connect(this.master); setTimeout(() => { try { g.disconnect(); if (out !== g) out.disconnect(); } catch (e) { } }, 2500);
    return g;
  },
  play(n, opt) {
    if (!this.on || !this.ac) return; const now = performance.now(); if (this.last[n] && now - this.last[n] < (this.gap[n] || 40)) return; this.last[n] = now;
    if (opt && opt.vol != null && opt.vol <= .01) return;
    this.cur = this._bus(opt);
    const r = (a, b) => a + Math.random() * (b - a);
    switch (n) {
      case 'coin': this.tone(1046, .07, 'triangle', .035, 0, 1568); break;
      case 'click': this.tone(620, .04, 'square', .04); break;
      case 'select': this.tone(520, .06, 'triangle', .07, 0, 760); break;
      case 'order': this.tone(420, .09, 'triangle', .09, 0, 700); break;
      case 'spawn': this.tone(523, .12, 'triangle', .09); this.tone(659, .12, 'triangle', .09, .08); this.tone(784, .18, 'triangle', .09, .16); break;
      case 'built': [392, 523, 659, 784].forEach((f, i) => this.tone(f, .3, 'triangle', .08, i * .07)); break;
      case 'alert': this.tone(240, .16, 'square', .09); this.tone(190, .22, 'square', .09, .14); break;
      case 'warn': this.tone(150, .3, 'sawtooth', .07, 0, 90); break;
      case 'repay': this.tone(330, .07, 'triangle', .05, 0, 500); break;
      case 'ping': this.tone(660, .12, 'sine', .08); this.tone(990, .2, 'sine', .07, .09); break;
      case 'scan': this.tone(200, .9, 'sine', .07, 0, 1200); break;
      case 'good': [523, 659, 784, 1046].forEach((f, i) => this.tone(f, .22, 'triangle', .09, i * .09)); break;
      case 'bad': this.tone(300, .3, 'sawtooth', .08, 0, 140); break;
      case 'swap': this.tone(300, .25, 'sine', .08, 0, 900); break;
      // ── 戰鬥音效（v6）──
      case 'zap': { const f = r(1250, 1550); this.tone(f, .045, 'square', .018, 0, f * .5); break; }                       // 功能單位射擊：極短的雷射啾
      case 'hit': this.noise(.05, .045, 0, 'bandpass', r(1800, 2600), 1.2); this.tone(r(170, 200), .06, 'sine', .04, 0, 90); break; // 命中：短促的「噠」
      case 'boom': this.noise(.42, .11, 0, 'lowpass', 900, .7, 110); this.tone(95, .45, 'sine', .11, 0, 38); break;          // 陣亡：低沉短爆
      case 'capture': [523, 659, 784, 1046].forEach((f, i) => this.tone(f, .45 - i * .05, 'triangle', .085, i * .085)); this.tone(2093, .5, 'sine', .03, .34); break; // 佔領：上揚大三和弦
      case 'lost': [392, 311, 262].forEach((f, i) => this.tone(f, .34, 'triangle', .08, i * .14, f * .97)); this.tone(98, .55, 'sine', .07, .28); break;  // 失守：下行小三
      case 'alarm': [0, .32].forEach(w => { this.tone(880, .12, 'square', .05, w); this.tone(660, .14, 'square', .05, w + .13); }); break;                  // 據點遭攻擊：兩聲警報
      case 'wave': [110, 110.9, 164.8].forEach((f, i) => this.tone(f, 1.25, 'sawtooth', i === 2 ? .025 : .045, i * .02, f * 1.02)); this.noise(1.1, .02, 0, 'lowpass', 250, .6, 700); break; // 對手大舉出兵：低頻號角
      case 'research': [784, 988, 1175, 1568, 1976].forEach((f, i) => this.tone(f, .3, 'sine', .055, i * .055)); this.tone(3136, .4, 'sine', .018, .3); break; // 研發完成：晶亮琶音
      case 'victory': [523, 659, 784, 1046].forEach((f, i) => this.tone(f, .5, 'triangle', .09, i * .12)); [523, 659, 784, 1046].forEach(f => this.tone(f, 1.4, 'sawtooth', .022, .55)); break;
      case 'defeat': [440, 349, 294, 220].forEach((f, i) => this.tone(f, .6, 'triangle', .075, i * .22, f * .98)); this.tone(110, 1.5, 'sine', .07, .7, 82); break;
    }
    this.cur = null;
  },
  toggle() { this.on = !this.on; store.set('sound', this.on); if (this.on) { this.init(); this.play('click'); } if (typeof Music !== 'undefined') Music._applyGain(true); return this.on; },
};
