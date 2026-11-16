/* ── 程序化配樂：全部 Web Audio 合成、零外部檔案 ─────────────────
   底層：持續的長音 pad（8 個振盪器常駐，換和弦只改頻率）＋慢速琶音（共用延遲回授）。
   intensity 上升依序加入：低音脈衝（>0.25）→ kick/hat（>0.45）→ 張力和弦刺擊與 snare（>0.6/0.7）→ 16 分 hat（>0.85）。
   排程：setInterval 25ms，只排 0.12 秒內的音符（lookahead），分頁被節流時跳過錯過的拍子。 */
const Music = {
  on: store.get('music', true), want: false, running: false, target: 0, lvl: 0, floor: 0, cap: 1, mood: 'calm', prog: 'calm',
  bpm: 84, step: 0, nextT: 0, timer: null, duckUntil: 0, moodBack: 0, live: 0, made: 0, ticks: 0, tickMs: 0, scheduled: 0,
  BASE: .16,
  m2f: m => 440 * Math.pow(2, (m - 69) / 12),
  PROG: {
    calm: [{ r: 45, pad: [57, 60, 64, 71] }, { r: 41, pad: [53, 57, 60, 64] }, { r: 48, pad: [52, 55, 59, 62] }, { r: 43, pad: [55, 59, 62, 64] }],
    tense: [{ r: 45, pad: [57, 60, 64, 65] }, { r: 46, pad: [58, 62, 65, 69] }, { r: 50, pad: [53, 57, 62, 64] }, { r: 40, pad: [56, 59, 62, 65] }],
  },
  start() {
    this.want = true; const ac = SFX.ac; if (!ac || this.running) return;
    try { this._setup(ac); } catch (e) { return; }
    this.running = true; this.step = 0; this.nextT = ac.currentTime + .12; this._chord(0, ac.currentTime + .05, true);
    this.timer = setInterval(() => this._tick(), 25); this._applyGain(true);
  },
  stop() {
    this.want = false; if (!this.running) return; clearInterval(this.timer); this.timer = null; this.running = false;
    const ac = SFX.ac, nodes = this.nodes; if (!ac || !nodes) return;
    try { this.bus.gain.cancelScheduledValues(ac.currentTime); this.bus.gain.setTargetAtTime(0, ac.currentTime, .15); } catch (e) { }
    setTimeout(() => { for (const n of nodes) { try { n.stop && n.stop(); } catch (e) { } try { n.disconnect(); } catch (e) { } } }, 900);
    this.nodes = null;
  },
  setIntensity(v) { this.target = clamp(+v || 0, 0, 1); },
  setMood(m) {
    const ac = SFX.ac; this.mood = m;
    if (m === 'victory' || m === 'defeat') {
      if (ac && this.running && this._eff()) this._stinger(m, ac.currentTime + .08);
      if (ac) { this.duckUntil = ac.currentTime + 7.2; this.moodBack = ac.currentTime + 7.6; }
      return;
    }
    this.prog = m === 'tense' ? 'tense' : 'calm'; this.floor = m === 'tense' ? .38 : 0; this.cap = m === 'menu' ? .12 : 1;
  },
  toggle() { this.on = !this.on; store.set('music', this.on); if (this.on) { SFX.init(); if (!this.running) this.start(); } this._applyGain(true); return this.on; },
  _eff() { return this.on && SFX.on && !!SFX.ac; },
  _applyGain(force) {
    const ac = SFX.ac; if (!ac || !this.bus) return; const v = this._eff() ? this.BASE : 0;
    if (force || v !== this._gv) { this._gv = v; try { this.bus.gain.setTargetAtTime(v, ac.currentTime, .3); } catch (e) { } }
  },
  _setup(ac) {
    const n = []; this.nodes = n;
    this.bus = ac.createGain(); this.bus.gain.value = 0; this.bus.connect(SFX.master); n.push(this.bus);
    // pad：4 聲部 × 2 個微失諧鋸齒波 → 低通（慢 LFO 掃頻）→ pad gain
    this.padF = ac.createBiquadFilter(); this.padF.type = 'lowpass'; this.padF.frequency.value = 700; this.padF.Q.value = .7;
    this.padG = ac.createGain(); this.padG.gain.value = .05; this.padF.connect(this.padG); this.padG.connect(this.bus); n.push(this.padF, this.padG);
    const lfo = ac.createOscillator(), lfoG = ac.createGain(); lfo.frequency.value = .07; lfoG.gain.value = 260; lfo.connect(lfoG); lfoG.connect(this.padF.frequency); lfo.start(); n.push(lfo, lfoG);
    this.padO = [];
    for (let v = 0; v < 4; v++) for (const det of [-6, 6]) { const o = ac.createOscillator(); o.type = 'sawtooth'; o.detune.value = det; o.frequency.value = 220; const g = ac.createGain(); g.gain.value = .11; o.connect(g); g.connect(this.padF); o.start(); this.padO.push({ o, v }); n.push(o, g); }
    // 琶音延遲：共用一條回授延遲，低通在迴路內，越回越暗
    this.dly = ac.createDelay(1); this.dly.delayTime.value = .43; this.fb = ac.createGain(); this.fb.gain.value = .33; this.dlyF = ac.createBiquadFilter(); this.dlyF.type = 'lowpass'; this.dlyF.frequency.value = 2200;
    this.wet = ac.createGain(); this.wet.gain.value = .35;
    this.dly.connect(this.dlyF); this.dlyF.connect(this.fb); this.fb.connect(this.dly); this.dlyF.connect(this.wet); this.wet.connect(this.bus); n.push(this.dly, this.fb, this.dlyF, this.wet);
  },
  _track(src) { this.live++; this.made++; src.onended = () => { this.live--; try { src.disconnect(); } catch (e) { } }; },
  _note(f, t, dur, vol, type = 'triangle', toDelay = false, att = .008) {
    const ac = SFX.ac, o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + att); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g); g.connect(this.bus); if (toDelay) g.connect(this.dly); o.start(t); o.stop(t + dur + .05); this._track(o); this.scheduled++;
  },
  _hit(t, dur, vol, ftype, freq, q = 1) {
    const ac = SFX.ac, s = ac.createBufferSource(), fl = ac.createBiquadFilter(), g = ac.createGain(); s.buffer = SFX._noise();
    fl.type = ftype; fl.frequency.value = freq; fl.Q.value = q; g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .003); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    s.connect(fl); fl.connect(g); g.connect(this.bus); s.start(t, Math.random() * .4); s.stop(t + dur + .03); this._track(s); this.scheduled++;
  },
  _kick(t, vol) {
    const ac = SFX.ac, o = ac.createOscillator(), g = ac.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(42, t + .14);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .004); g.gain.exponentialRampToValueAtTime(.0001, t + .32);
    o.connect(g); g.connect(this.bus); o.start(t); o.stop(t + .36); this._track(o); this.scheduled++;
  },
  _chord(bar, t, instant) {
    const ch = this.PROG[this.prog][bar % 4];
    for (const p of this.padO) { const f = this.m2f(ch.pad[p.v]); try { if (instant) p.o.frequency.setValueAtTime(f, t); else p.o.frequency.setTargetAtTime(f, t, .35); } catch (e) { } }
    return ch;
  },
  _tick() {
    const ac = SFX.ac; if (!ac || !this.running) return; const t0 = performance.now(); this.ticks++;
    if (this.moodBack && ac.currentTime > this.moodBack) { this.moodBack = 0; this.setMood('calm'); }
    // intensity 平滑：時間常數約 1.1 秒（2–3 秒到位）
    const tgt = clamp(Math.max(this.target, this.floor), 0, this.cap); this.lvl += (tgt - this.lvl) * (1 - Math.exp(-.025 / 1.1));
    this._applyGain();
    const ducked = ac.currentTime < this.duckUntil;
    try {
      this.padF.frequency.setTargetAtTime(700 + 1100 * this.lvl, ac.currentTime, .6);
      this.padG.gain.setTargetAtTime(ducked ? .015 : .05 + .015 * this.lvl, ac.currentTime, .5);
    } catch (e) { }
    if (this.nextT < ac.currentTime - .05) { this.nextT = ac.currentTime + .05; this.step = (this.step + 1) % 64; }
    const sd = 60 / this.bpm / 4;
    while (this.nextT < ac.currentTime + .12) {
      if (this._eff() && !ducked) this._schedule(this.step, this.nextT);
      else if (this.step % 16 === 0) this._chord(this.step >> 4, this.nextT);
      this.nextT += sd; this.step = (this.step + 1) % 64;
    }
    this.tickMs += performance.now() - t0;
  },
  _schedule(s, t) {
    const L = this.lvl, bar = s >> 4, b = s % 16, ch = s % 16 === 0 ? this._chord(bar, t) : this.PROG[this.prog][bar % 4];
    const tones = ch.pad.map(m => m + 12);
    // 琶音：calm 每 8 分、緊張時 16 分；menu 更稀疏
    const every = L > .6 ? 1 : this.mood === 'menu' ? 4 : 2;
    if (b % every === 0) {
      const pat = [0, 1, 2, 3, 2, 1, 3, 2], k = (s / every | 0) % pat.length, skip = ((s * 7 + bar * 3) % 11) === 0;
      if (!skip) this._note(this.m2f(tones[pat[k]]), t, L > .6 ? .22 : .5, (.03 + .012 * L) * (this.mood === 'menu' ? .7 : 1), 'triangle', true);
    }
    // 低音脈衝
    if (L > .25 && b % 2 === 0) { const m = ch.r + (b % 8 === 6 ? 12 : 0); this._note(this.m2f(m), t, .2, .06 * Math.min(1, (L - .25) / .3), 'sawtooth'); }
    // 鼓
    if (L > .45) {
      const k = Math.min(1, (L - .45) / .25);
      if (b === 0 || b === 8 || (L > .8 && b === 10)) this._kick(t, .13 * k);
      if (b % 4 === 2) this._hit(t, .05, .022 * k, 'highpass', 7000);
      if (L > .85 && b % 2 === 1) this._hit(t, .03, .012 * k, 'highpass', 9000);
      if (L > .7 && (b === 4 || b === 12)) { this._hit(t, .14, .045 * k, 'bandpass', 1800, .9); this._note(185, t, .08, .03 * k, 'triangle'); }
    }
    // 張力和弦刺擊（每小節第一拍）
    if (L > .6 && b === 0) { for (const m of ch.pad) this._note(this.m2f(m), t, .38, .022 * Math.min(1, (L - .6) / .3), 'sawtooth'); }
  },
  _stinger(m, t) {
    if (m === 'victory') {
      [60, 64, 67, 72].forEach((mm, i) => { this._note(this.m2f(mm), t + i * .18, .5, .07, 'sawtooth'); this._note(this.m2f(mm + 12), t + i * .18, .4, .03, 'triangle', true); });
      [60, 64, 67, 72, 76].forEach(mm => this._note(this.m2f(mm), t + .8, 3.2, .035, 'triangle', true, .25));
      this._note(this.m2f(36), t + .8, 3.4, .06, 'sine', false, .2);
      [84, 88, 91, 96].forEach((mm, i) => this._note(this.m2f(mm), t + 1.2 + i * .12, .4, .02, 'sine', true));
    } else {
      [69, 65, 62, 57].forEach((mm, i) => this._note(this.m2f(mm), t + i * .55, .9, .06, 'triangle', true, .03));
      this._note(this.m2f(45), t + .4, 4.2, .07, 'sine', false, .4); this._note(this.m2f(52), t + 1.2, 3.4, .025, 'sawtooth', false, .6);
      this._hit(t + 2.2, 1.6, .02, 'lowpass', 300, .6);
    }
  },
};
// SFX.init() 之後補啟動：曾要求 start 但當時還沒有 AudioContext（瀏覽器要求使用者手勢）
(function () { const orig = SFX.init; SFX.init = function () { orig.call(SFX); if (Music.want && !Music.running && SFX.ac) Music.start(); }; })();
