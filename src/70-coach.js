/* ── 教學引擎：一次一步。等待時遊戲暫停，只放行「亮起的那個動作」；做完才播一小段結果 ───── */
const Coach = {
  steps: null, i: -1, state: 'off', mark: null, onEnd: null, n: 0, total: 0, nudgeT: 0,
  active() { return this.state !== 'off'; },
  cur() { return this.steps && this.steps[this.i]; },
  start(steps, opts = {}) {
    this.steps = steps; this.onEnd = opts.onEnd || null; this.i = -1; this.n = 0; this.total = steps.filter(s => s.count !== false).length;
    $('#coach').classList.remove('off'); this.next();
  },
  stop() { this.state = 'off'; this.steps = null; this.mark = null; this.i = -1; $('#coach').classList.add('off'); $$('.tut').forEach(e => e.classList.remove('tut')); },

  ok(kind, data, silent) {
    if (this.state === 'off') return true;
    if (this.state === 'beat') return false;
    const s = this.cur(); if (!s) return true;
    if (kind === 'camera') return !!s.camera;
    const r = !!(s.ok && s.ok(kind, data, G));
    if (!r && !silent) this.nudge();
    return r;
  },
  nudge() {
    const now = performance.now(); if (now - this.nudgeT < 400) return; this.nudgeT = now;
    const b = $('#bubble'); b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); SFX.play('warn');
  },
  event(t, d) {
    if (this.state !== 'wait') return; const s = this.cur(); if (!s || !s.done) return;
    if (s.done(t, d, G)) this.finish();
  },
  finish() {
    const s = this.cur(); SFX.play('ping'); this.mark = null; $$('.tut').forEach(e => e.classList.remove('tut'));
    if (s.after) s.after(G);
    if (s.beat) {
      this.state = 'beat'; this.showCap(s.beat.cap);
      G.runBeat({ sec: s.beat.sec, speed: s.beat.speed, until: s.beat.until ? () => s.beat.until(G) : null });
    } else this.next();
  },
  beatDone() { if (this.state === 'beat') this.next(); },
  next() {
    this.i++;
    if (this.i >= this.steps.length) { const cb = this.onEnd; this.stop(); if (cb) cb(); return; }
    this.enter();
  },
  enter() {
    const s = this.cur(); this.state = 'wait'; if (s.count !== false) this.n++;
    if (s.enter) s.enter(G);
    const b = $('#bubble'); b.classList.remove('cap');
    const dots = s.count === false ? '' : `<span class="dots">${Array.from({ length: this.total }, (_, k) => `<i class="${k < this.n ? 'd' : ''}"></i>`).join('')}</span>`;
    $('#cStep').innerHTML = `<span>${s.label || L('教學', 'Tutorial')} ${s.count === false ? '' : this.n + ' / ' + this.total}</span>${dots}`;
    $('#cMsg').innerHTML = typeof s.text === 'function' ? s.text(G) : s.text; $('#cSub').innerHTML = (typeof s.sub === 'function' ? s.sub(G) : s.sub) || '';
    const act = $('#cAct'); act.innerHTML = '';
    if (s.ack) { const bt = el('button', 'btn' + (s.ackClass ? ' ' + s.ackClass : ''), s.ack); bt.onclick = () => { SFX.init(); if (!s.noAckClose) this.finish(); }; act.appendChild(bt); }
    if (G.opts && this.n <= this.total && s.skip !== false && this.i > 0) { const sk = el('button', 'skip', L('跳過教學', 'Skip tutorial')); sk.onclick = () => G.start(G.missionIdx, { skipTutorial: true }); act.insertBefore(sk, act.firstChild); }
    this.target = s.target ? s.target(G) : null;
    if (this.target && this.target.mark) this.mark = this.target.mark; else this.mark = null;
    if (this.target && this.target.ui) { const e = $(this.target.ui); if (e) e.classList.add('tut'); }
    if (s.cam) { const c = s.cam(G); if (c) R.focus(c.x, c.y, c.z || R.cam.z); }
    $('#coach').classList.remove('cap'); $('#spot').classList.remove('none');
    SFX.play('click');
  },
  showCap(text) {
    const b = $('#bubble'); b.classList.add('cap'); $('#cStep').innerHTML = L('<span>▶ 看結果</span>', '<span>▶ Watch what happens</span>'); $('#cMsg').innerHTML = text || ''; $('#cSub').innerHTML = ''; $('#cAct').innerHTML = '';
    $('#spot').classList.add('none'); $('#ptr').classList.add('none'); this.target = null;
  },

  rectOf(t) {
    if (!t) return null; const z = R.cam.z;
    if (t.ui) { const e = $(t.ui); if (!e || e.closest('.hide') || !e.offsetParent && getComputedStyle(e).position !== 'fixed') return null; const r = e.getBoundingClientRect(); if (!r.width) return null; return { x: r.left - 5, y: r.top - 5, w: r.width + 10, h: r.height + 10, round: false }; }
    const W = G.w; if (!W) return null;
    if (t.ent) {
      const e = typeof t.ent === 'function' ? t.ent() : W.byId.get(t.ent); if (!e) return null; let c, rad;
      if (e.kind === 'unit') { c = R.t2s(e.x, e.y, 13); rad = 24 * z + 8; }
      else if (e.kind === 'patch') { c = R.t2s(e.x + .5, e.y + .5, 12); rad = 30 * z + 6; }
      else if (e.kind === 'debt') { c = R.t2s(e.x, e.y, 14); rad = 34 * z; }
      else { const H = BLD[e.type].hgt; c = R.t2s(bcx(e), bcy(e), H * .5); rad = (e.w * 27 + 22) * z; }
      return { x: c.x - rad, y: c.y - rad, w: rad * 2, h: rad * 2, round: true };
    }
    if (t.tile) { const c = R.t2s(t.tile.x, t.tile.y, 0), rw = (t.tile.r || 1.4) * 46 * z; return { x: c.x - rw, y: c.y - rw * .7, w: rw * 2, h: rw * 1.4, round: true }; }
    return null;
  },
  render() {
    if (this.state === 'off') return; const s = this.cur(), spot = $('#spot'), ptr = $('#ptr'), b = $('#bubble'), vw = innerWidth, vh = innerHeight;
    if (this.state === 'beat') { spot.classList.add('none'); ptr.classList.add('none'); b.style.left = Math.round((vw - b.offsetWidth) / 2) + 'px'; b.style.top = Math.round(Math.min(vh * .2, 150)) + 'px'; return; }
    if (!s) return; if (s.target) this.target = s.target(G);
    const r = this.rectOf(this.target);
    if (!r) {
      spot.classList.add('none'); ptr.classList.add('none');
      const bw = b.offsetWidth, bh = b.offsetHeight; b.style.left = Math.round((vw - bw) / 2) + 'px'; b.style.top = Math.round(Math.max(90, (vh - bh) / 2 - 40)) + 'px'; return;
    }
    spot.classList.remove('none'); spot.classList.toggle('round', r.round); ptr.classList.remove('none');
    spot.style.transform = `translate(${r.x}px,${r.y}px)`; spot.style.width = r.w + 'px'; spot.style.height = r.h + 'px';
    const up = r.y < 110; ptr.classList.toggle('up', up); ptr.style.transform = `translate(${r.x + r.w / 2}px,${up ? r.y + r.h : r.y}px)`;
    const bw = b.offsetWidth, bh = b.offsetHeight, M = 14, cx = r.x + r.w / 2, cy = r.y + r.h / 2;
    if (this.target && !this.target.ui) { const nar = vw < 760; b.style.left = Math.round(nar ? (vw - bw) / 2 : vw - bw - 16) + 'px'; b.style.top = (nar ? 118 : 74) + 'px'; return; }
    const cand = [
      { x: cx - bw / 2, y: r.y - bh - 46 }, { x: cx - bw / 2, y: r.y + r.h + M + 4 },
      { x: r.x + r.w + M + 10, y: cy - bh / 2 }, { x: r.x - bw - M - 10, y: cy - bh / 2 },
    ];
    let pick = cand.find(c => { const x = clamp(c.x, 8, vw - bw - 8); return c.y > 56 && c.y + bh < vh - 8 && (x + bw < r.x - 6 || x > r.x + r.w + 6 || c.y + bh < r.y - 40 || c.y > r.y + r.h + 4); }) || { x: (vw - bw) / 2, y: 100 };
    b.style.left = Math.round(clamp(pick.x, 8, vw - bw - 8)) + 'px'; b.style.top = Math.round(clamp(pick.y, 56, vh - bh - 8)) + 'px';
  },
};
