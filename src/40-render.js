/* ── 畫面層：Canvas 2D 等角沙盤。只讀 world，不改 world ──────────── */
const SLAB = 34;
const P = (x, y, z = 0) => ({ x: (x - y) * TW / 2, y: (x + y) * TH / 2 - z });
function poly(c, pts, fill, stroke, lw) {
  c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)); c.closePath();
  if (fill) { c.fillStyle = fill; c.fill(); } if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw || 1; c.stroke(); }
}
const lerpP = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
function box(c, x, y, w, h, z0, H, cols, edge) {
  const A = P(x, y, z0 + H), B = P(x + w, y, z0 + H), C = P(x + w, y + h, z0 + H), D = P(x, y + h, z0 + H);
  const B0 = P(x + w, y, z0), C0 = P(x + w, y + h, z0), D0 = P(x, y + h, z0);
  poly(c, [D, C, C0, D0], cols.l); poly(c, [C, B, B0, C0], cols.r); poly(c, [A, B, C, D], cols.t);
  if (edge) { c.strokeStyle = edge; c.lineWidth = 1; c.beginPath(); c.moveTo(D.x, D.y); c.lineTo(C.x, C.y); c.lineTo(B.x, B.y); c.moveTo(C.x, C.y); c.lineTo(C0.x, C0.y); c.stroke(); }
  return { A, B, C, D, B0, C0, D0 };
}
function face(c, p0, p1, H, cols, rows, fn) { // 在牆面上畫小窗格
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
    const col = fn(i, j); if (!col) continue;
    const u1 = (i + .2) / cols, u2 = (i + .8) / cols, v1 = (j + .25) / rows, v2 = (j + .72) / rows;
    const q = (u, v) => ({ x: p0.x + (p1.x - p0.x) * u, y: p0.y + (p1.y - p0.y) * u - v * H });
    poly(c, [q(u1, v1), q(u2, v1), q(u2, v2), q(u1, v2)], col);
  }
}
function ellipse(c, x, y, rx, ry, fill, stroke, lw) { c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, 6.2832); if (fill) { c.fillStyle = fill; c.fill(); } if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw || 1; c.stroke(); } }
const isoR = r => ({ rx: r * TW / 2 * 1.4142, ry: r * TH / 2 * 1.4142 });
const FONT = L('"PingFang TC","Noto Sans TC","Microsoft JhengHei",system-ui,sans-serif', '-apple-system,system-ui,"Segoe UI",Roboto,"Helvetica Neue",Arial,"PingFang TC",sans-serif');
function alpha(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${n >> 8 & 255},${n & 255},${a})`; }

const R = {
  cv: null, c: null, dpr: 1, vw: 0, vh: 0, t: 0,
  cam: { x: 0, y: N * TH / 2, z: .9 }, goal: null,
  terrain: null, TS: 1.35, fogCv: null, fogC: null, fogImg: null, fogA: new Float32Array(N * N).fill(1),
  mm: null, mmc: null,

  init() {
    this.cv = $('#stage'); this.c = this.cv.getContext('2d'); this.mm = $('#mm'); this.mmc = this.mm.getContext('2d');
    this.fogCv = document.createElement('canvas'); this.fogCv.width = this.fogCv.height = N; this.fogC = this.fogCv.getContext('2d'); this.fogImg = this.fogC.createImageData(N, N);
    this.resize(); addEventListener('resize', () => this.resize());
  },
  resize() {
    this.dpr = Math.min(2, window.devicePixelRatio || 1); this.vw = innerWidth; this.vh = innerHeight;
    this.cv.width = Math.round(this.vw * this.dpr); this.cv.height = Math.round(this.vh * this.dpr);
  },
  playZoom() { return clamp(this.defaultZoom() * 1.28, .7, 1.45); },
  defaultZoom() { return clamp(Math.min(this.vw / 1500, this.vh / 820), .55, 1.25); },
  focus(tx, ty, z, instant) {
    const p = iso(tx, ty); this.goal = { x: p.x, y: p.y - 10, z: z || this.cam.z };
    if (instant) { this.cam.x = this.goal.x; this.cam.y = this.goal.y; this.cam.z = this.goal.z; this.goal = null; }
  },
  pan(dx, dy) { this.goal = null; this.cam.x += dx / this.cam.z; this.cam.y += dy / this.cam.z; },
  zoomAt(f, sx, sy) {
    const z0 = this.cam.z, z1 = clamp(z0 * f, .5, 1.7); if (z1 === z0) return; this.goal = null;
    const wx = (sx - this.vw / 2) / z0 + this.cam.x, wy = (sy - this.vh / 2) / z0 + this.cam.y;
    this.cam.z = z1; this.cam.x = wx - (sx - this.vw / 2) / z1; this.cam.y = wy - (sy - this.vh / 2) / z1;
  },
  clampCam() { const lim = N * TW / 2; this.cam.x = clamp(this.cam.x, -lim * .9, lim * .9); this.cam.y = clamp(this.cam.y, 40, N * TH - 20); },
  step(dt) {
    if (this.goal) {
      const k = 1 - Math.exp(-dt * 6), g = this.goal;
      this.cam.x += (g.x - this.cam.x) * k; this.cam.y += (g.y - this.cam.y) * k; this.cam.z += (g.z - this.cam.z) * k;
      if (Math.abs(g.x - this.cam.x) < .5 && Math.abs(g.y - this.cam.y) < .5 && Math.abs(g.z - this.cam.z) < .003) { this.cam.x = g.x; this.cam.y = g.y; this.cam.z = g.z; this.goal = null; }
    }
    this.clampCam();
  },
  /* 座標轉換 */
  t2s(tx, ty, z = 0) { const p = P(tx, ty, z); return { x: (p.x - this.cam.x) * this.cam.z + this.vw / 2, y: (p.y - this.cam.y) * this.cam.z + this.vh / 2 }; },
  s2t(sx, sy) { const wx = (sx - this.vw / 2) / this.cam.z + this.cam.x, wy = (sy - this.vh / 2) / this.cam.z + this.cam.y, a = wx / (TW / 2), b = wy / (TH / 2); return { x: (a + b) / 2, y: (b - a) / 2 }; },

  /* ── 地形預先渲染（等角沙盤：有厚度的台面）── */
  buildTerrain(w) {
    const S = this.TS, X0 = -N * TW / 2 - 50, Y0 = -50, W = N * TW + 100, H = N * TH + SLAB + 100;
    const cv = document.createElement('canvas'); cv.width = Math.ceil(W * S); cv.height = Math.ceil(H * S); const c = cv.getContext('2d');
    c.scale(S, S); c.translate(-X0, -Y0);
    // 台面側面
    const L = P(0, N), Bm = P(N, N), Rr = P(N, 0);
    let g = c.createLinearGradient(0, Bm.y, 0, Bm.y + SLAB);
    g.addColorStop(0, '#20303f'); g.addColorStop(1, '#0a1119');
    poly(c, [L, Bm, { x: Bm.x, y: Bm.y + SLAB }, { x: L.x, y: L.y + SLAB }], g);
    g = c.createLinearGradient(0, Bm.y, 0, Bm.y + SLAB); g.addColorStop(0, '#182634'); g.addColorStop(1, '#070c13');
    poly(c, [Bm, Rr, { x: Rr.x, y: Rr.y + SLAB }, { x: Bm.x, y: Bm.y + SLAB }], g);
    // 台面磚
    const pads = w.pads || [];
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const h = hash2(i, j), pad = pads.find(p => i >= p.x && i < p.x + p.w && j >= p.y && j < p.y + p.h);
      let col; if (pad) col = pad.c; else { const v = Math.floor(33 + h * 8); col = `rgb(${v - 4},${v + 13},${v + 24})`; }
      const a = P(i, j), b = P(i + 1, j), cc = P(i + 1, j + 1), d = P(i, j + 1);
      poly(c, [a, b, cc, d], col, 'rgba(140,190,220,.055)', 1);
      if (!pad && h > .86) { const m = P(i + .5, j + .5); c.fillStyle = 'rgba(160,210,235,.07)'; c.fillRect(m.x - 6 + h * 6, m.y - 1, 3, 1.6); c.fillRect(m.x + 3 - h * 5, m.y + 3, 2, 1.4); }
    }
    for (const p of pads) if (p.line) { poly(c, [P(p.x, p.y), P(p.x + p.w, p.y), P(p.x + p.w, p.y + p.h), P(p.x, p.y + p.h)], null, p.line, 1.6); }
    // 台面亮邊
    poly(c, [P(0, 0), Rr, Bm, L], null, 'rgba(150,210,240,.35)', 1.5);
    // 電路紋（很淡的科技感）
    c.strokeStyle = 'rgba(62,224,161,.05)'; c.lineWidth = 1;
    for (let k = 0; k < 14; k++) { const x = 2 + Math.floor(hash2(k, 91) * (N - 4)), y = 2 + Math.floor(hash2(k, 17) * (N - 4)), l = 2 + Math.floor(hash2(k, 5) * 5); const a = P(x, y), b = P(x + l, y), d = P(x + l, y + 1); c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.lineTo(d.x, d.y); c.stroke(); }
    this.terrain = { cv, X0, Y0, W, H };
  },

  /* ── 主繪製 ── */
  draw(w, S) {
    const c = this.c, dpr = this.dpr, z = this.cam.z; this.t += 1 / 60;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    const bg = c.createRadialGradient(this.vw / 2, this.vh * .42, 40, this.vw / 2, this.vh * .5, Math.max(this.vw, this.vh) * .75);
    bg.addColorStop(0, '#0f1a27'); bg.addColorStop(1, '#04070c'); c.fillStyle = bg; c.fillRect(0, 0, this.vw, this.vh);
    if (!w) return;
    const sk = this.shk > .05 ? this.shk : 0, sx = sk ? (Math.random() - .5) * sk * 2 : 0, sy = sk ? (Math.random() - .5) * sk * 1.4 : 0; this.shk *= .86;
    c.save(); c.translate(this.vw / 2 - this.cam.x * z + sx, this.vh / 2 - this.cam.y * z + sy); c.scale(z, z);
    if (!this.terrain) this.buildTerrain(w);
    const T = this.terrain; c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
    c.drawImage(T.cv, T.X0, T.Y0, T.W, T.H);

    // 地面層：光環／放置預覽／教學標記
    this.drawGround(c, w, S);
    // 依深度排序的實體
    const items = [];
    for (const p of w.patches) items.push([p.x + p.y + 1, () => this.drawPatch(c, w, p, S)]);
    for (const p of w.props) items.push([p.x + p.y + (p.w + p.h) / 2, () => this.drawProp(c, p)]);
    for (const b of w.blds) items.push([b.x + b.y + (b.w + b.h) / 2, () => this.drawBld(c, w, b, S)]);
    const own = S.role === 'ground' || !S.role, eng = S.role === 'engineer';
    for (const u of w.units) if (own || eng || u.team === 1) items.push([u.x + u.y + .02, () => this.drawUnit(c, w, u, S)]);
    if (w.rival && !eng) items.push([w.rival.b.x + w.rival.b.y + 3, () => this.drawRival(c, w, w.rival.b, S)]);
    if (w.nodes && own) for (const n of w.nodes) items.push([n.x + n.y - 1.8, () => this.drawNode(c, w, n, S)]);
    if (own || eng) for (const d of w.debts) { const f = S.focus; if (eng ? (f && Math.hypot(d.x - f.x, d.y - f.y) < ENG_SIGHT + .8) : debtVisible(w, d)) items.push([d.x + d.y + .5, () => this.drawDebt(c, w, d, S)]); }
    if (own) for (const pg of w.pings) if (pg.until > w.t) items.push([pg.x + pg.y + 2, () => this.drawPing(c, w, pg)]);
    if (S.extra) S.extra(items, c, this);
    items.sort((a, b) => a[0] - b[0]); for (const it of items) it[1]();

    // 特效
    for (const r of FX.rings) { const k = r.t / r.max, p = P(r.x ?? r.tx, r.y ?? r.ty), e = isoR(r.r * (.4 + .9 * easeOut(k))); ellipse(c, p.x, p.y, e.rx, e.ry, null, alpha(r.color, (1 - k) * .9), 2.2); }
    for (const b of FX.beams) {
      const k = b.t / b.max, a = P(b.x0, b.y0, b.z0 || 15), e = P(b.x1, b.y1, 13); c.lineCap = 'round';
      c.strokeStyle = alpha(b.color, (1 - k) * .35); c.lineWidth = 6; c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(e.x, e.y); c.stroke();
      c.strokeStyle = `rgba(255,255,255,${(1 - k) * .9})`; c.lineWidth = 1.6; c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(e.x, e.y); c.stroke();
      ellipse(c, e.x, e.y, 5 * (1 - k) + 2, 3 * (1 - k) + 1.5, alpha(b.color, (1 - k) * .8)); c.lineCap = 'butt';
    }
    for (const p of FX.parts) { const q = P(p.tx, p.ty, p.z); const k = 1 - p.t / p.max; c.fillStyle = alpha(p.color, k); c.fillRect(q.x + p.ox - p.s / 2, q.y + p.oy - p.s / 2, p.s, p.s); }
    c.textAlign = 'center'; c.font = `700 13px ${FONT}`;
    for (const f of FX.floats) { const q = P(f.tx, f.ty, f.z + f.t * 26), k = f.t / f.max; c.fillStyle = 'rgba(0,0,0,' + (1 - k) * .6 + ')'; c.fillText(f.text, q.x + 1, q.y + 1); c.fillStyle = alpha(f.color.length === 7 ? f.color : '#ffffff', 1 - k * k); c.fillText(f.text, q.x, q.y); }

    this.drawFog(c, w, S);
    this.roleOverlay(c, w, S); if (S.role === 'engineer' && S.focus) this.drawTunnel(c, S.focus); if (S.after) S.after(c, this, w);
    c.restore();
    this.drawMinimap(w, S);
  },

  drawGround(c, w, S) {
    if (S.role === 'engineer' && S.focus) { const q = P(S.focus.x, S.focus.y); ellipse(c, q.x, q.y + 1, 15, 7.5, 'rgba(255,143,177,.12)', '#ff8fb1', 1.6); }
    // 選取光圈
    for (const id of S.sel || []) {
      const e = w.byId.get(id); if (!e) continue;
      if (e.kind === 'unit') { const p = P(e.x, e.y); ellipse(c, p.x, p.y + 1, 13, 6.5, 'rgba(62,224,161,.14)', COL.team, 1.6); }
      else if (e.kind === 'bld') { const pts = [P(e.x - .15, e.y - .15), P(e.x + e.w + .15, e.y - .15), P(e.x + e.w + .15, e.y + e.h + .15), P(e.x - .15, e.y + e.h + .15)]; poly(c, pts, 'rgba(62,224,161,.1)', COL.team, 2); }
    }
    // 放置預覽
    if (S.place) {
      const d = BLD[S.place.type], tx = S.place.x, ty = S.place.y;
      for (let j = 0; j < d.h; j++) for (let i = 0; i < d.w; i++) {
        const ok = tileFree(w, tx + i, ty + j) && w.vis[(ty + j) * N + tx + i] > 0;
        poly(c, [P(tx + i, ty + j), P(tx + i + 1, ty + j), P(tx + i + 1, ty + j + 1), P(tx + i, ty + j + 1)], ok ? 'rgba(62,224,161,.34)' : 'rgba(255,90,77,.4)', ok ? COL.team : COL.red, 1);
      }
      const ok = canPlace(w, S.place.type, tx, ty);
      c.globalAlpha = ok ? .55 : .3; box(c, tx, ty, d.w, d.h, 0, d.hgt, { l: '#2b4a5c', r: '#1c3443', t: '#3b6479' }); c.globalAlpha = 1;
    }
    // 教學目標（世界座標）
    if (S.mark) {
      const m = S.mark, t = this.t, p = P(m.x, m.y), e = isoR(m.r || 1.2), k = .5 + .5 * Math.sin(t * 5);
      ellipse(c, p.x, p.y, e.rx * (1 + .08 * k), e.ry * (1 + .08 * k), 'rgba(245,185,66,.12)', 'rgba(245,185,66,.95)', 2.5);
      if (m.tiles) for (let j = 0; j < m.tiles.h; j++) for (let i = 0; i < m.tiles.w; i++) poly(c, [P(m.tiles.x + i, m.tiles.y + j), P(m.tiles.x + i + 1, m.tiles.y + j), P(m.tiles.x + i + 1, m.tiles.y + j + 1), P(m.tiles.x + i, m.tiles.y + j + 1)], `rgba(245,185,66,${.16 + .14 * k})`, 'rgba(245,185,66,.8)', 1.5);
    }
  },

  drawPatch(c, w, p, S) {
    const v = w.vis[p.y * N + p.x]; if (v === 0) return;
    const q = P(p.x + .5, p.y + .5), t = this.t, s = p.seed;
    const g = c.createRadialGradient(q.x, q.y, 2, q.x, q.y, 34); g.addColorStop(0, 'rgba(90,169,255,.30)'); g.addColorStop(1, 'rgba(90,169,255,0)');
    c.fillStyle = g; ellipse(c, q.x, q.y + 2, 36, 18, g);
    const shards = [[-9, 3, 11, 20], [8, 4, 9, 15], [0, -4, 13, 27], [-2, 9, 8, 11]];
    shards.forEach((sh, i) => {
      const hh = sh[3] * (.85 + .3 * hash2(p.x * 7 + i, p.y * 3)), ww = sh[2] * .55, x = q.x + sh[0], y = q.y + sh[1];
      poly(c, [{ x: x - ww, y: y - hh * .38 }, { x, y: y - hh }, { x, y }, { x: x - ww * .7, y: y - 1 }], '#4d8ee0');
      poly(c, [{ x, y: y - hh }, { x: x + ww, y: y - hh * .38 }, { x: x + ww * .7, y: y - 1 }, { x, y }], '#2c5fb0');
      poly(c, [{ x: x - ww, y: y - hh * .38 }, { x, y: y - hh }, { x: x + ww, y: y - hh * .38 }, { x, y: y - hh * .3 }], '#9fd0ff');
      const tw = Math.sin(t * 3 + s * 20 + i * 1.7); if (tw > .8) { c.fillStyle = `rgba(255,255,255,${(tw - .8) * 4})`; c.fillRect(x - 1, y - hh * .7 - 1, 2.4, 2.4); }
    });
  },
  drawProp(c, p) {
    const q = P(p.x + p.w / 2, p.y + p.h / 2), s = p.seed, r = 14 * (p.w + p.h) / 2;
    ellipse(c, q.x, q.y + 3, r * 1.15, r * .55, 'rgba(0,0,0,.28)');
    const pts = []; for (let i = 0; i < 7; i++) { const a = i / 7 * 6.28 + s * 3, rr = r * (.75 + .3 * hash2(i, Math.floor(s * 1000))); pts.push({ x: q.x + Math.cos(a) * rr, y: q.y - r * .3 + Math.sin(a) * rr * .5 }); }
    poly(c, pts.map(p => ({ x: p.x, y: p.y + 6 })), '#1b2733'); poly(c, pts, '#33485a', 'rgba(200,230,250,.18)', 1);
    poly(c, pts.slice(0, 4).map(p => ({ x: lerp(p.x, q.x, .35), y: lerp(p.y, q.y - r * .45, .35) })), '#3f586d');
  },

  drawBld(c, w, b, S) {
    const D = BLD[b.type], t = this.t, cx = bcx(b), cy = bcy(b), H = D.hgt, prog = b.built ? 1 : b.prog;
    const accent = b.type === 'hub' ? COL.team : b.type === 'comms' ? COL.amber : b.type === 'squad' ? COL.amber : COL.violet;
    const cols = b.type === 'lab' ? { l: '#2e4a66', r: '#1b3149', t: '#4f7ea3' } : b.type === 'squad' ? { l: '#5a4a26', r: '#3a2f18', t: '#7d6634' } : b.type === 'plat' ? { l: '#463a6e', r: '#2e2650', t: '#61529a' } : b.type === 'obs' ? { l: '#2d3556', r: '#1c2340', t: '#3f4a78' } : b.type === 'comms' ? { l: '#4a4a3a', r: '#33342a', t: '#66684f' } : { l: '#2b4a5c', r: '#1c3443', t: '#3b6479' };
    const pop = b.built && w.t - b.done < .6 ? 1 + .05 * Math.sin((w.t - b.done) / .6 * 3.14) : 1;
    // 地墊
    poly(c, [P(b.x - .25, b.y - .25), P(b.x + b.w + .25, b.y - .25), P(b.x + b.w + .25, b.y + b.h + .25), P(b.x - .25, b.y + b.h + .25)], 'rgba(20,34,46,.9)', alpha(accent, b.built ? .55 : .8), 1.6);
    if (!b.built) {
      // 施工中：虛線輪廓＋腳手架＋升起的主體
      const A = P(b.x, b.y, H), B = P(b.x + b.w, b.y, H), C = P(b.x + b.w, b.y + b.h, H), Dd = P(b.x, b.y + b.h, H);
      c.setLineDash([5, 4]); poly(c, [A, B, C, Dd], null, 'rgba(245,185,66,.55)', 1); c.setLineDash([]);
      c.strokeStyle = 'rgba(245,185,66,.55)'; c.lineWidth = 1.4;
      for (const [x, y] of [[b.x, b.y + b.h], [b.x + b.w, b.y + b.h], [b.x + b.w, b.y]]) { const g0 = P(x, y), g1 = P(x, y, H); c.beginPath(); c.moveTo(g0.x, g0.y); c.lineTo(g1.x, g1.y); c.stroke(); }
      const Hc = H * (.08 + .92 * ease(prog)); c.globalAlpha = .92;
      box(c, b.x + .06, b.y + .06, b.w - .12, b.h - .12, 0, Hc, cols, 'rgba(255,255,255,.25)'); c.globalAlpha = 1;
      // 掃描線
      const sy = P(cx, cy, Hc); c.strokeStyle = alpha(COL.amber, .8); c.lineWidth = 2; const a0 = P(b.x, b.y + b.h, Hc), a1 = P(b.x + b.w, b.y + b.h, Hc), a2 = P(b.x + b.w, b.y, Hc); c.beginPath(); c.moveTo(a0.x, a0.y); c.lineTo(a1.x, a1.y); c.lineTo(a2.x, a2.y); c.stroke();
      // 進度條
      const bp = P(cx, cy, H + 22), idle = !w.units.some(u => u.o.t === 'build' && u.o.site === b.id);
      this.bar(c, bp.x, bp.y, 46, prog, idle ? '#7b8a97' : COL.amber); this.speedTag(c, w, bp.x + 36, bp.y + 3);
      c.font = `700 11px ${FONT}`; c.textAlign = 'center'; c.fillStyle = idle ? '#ff9f8c' : '#ffe2a0'; c.fillText(idle ? L(`⏸ ${D.name} 停工 ${Math.round(prog * 100)}%`, `⏸ ${D.name} stalled ${Math.round(prog * 100)}%`) : L(`${D.name} 建造中 ${Math.round(prog * 100)}%`, `${D.name} building ${Math.round(prog * 100)}%`), bp.x, bp.y - 8);
      if (idle) { c.font = `600 10px ${FONT}`; c.fillStyle = 'rgba(255,200,180,.9)'; c.fillText(L('選工程師 → 點我繼續', 'Select engineer → click to resume'), bp.x, bp.y - 21); }
      return;
    }
    c.save(); if (pop !== 1) { const q = P(cx, cy); c.translate(q.x, q.y); c.scale(pop, pop); c.translate(-q.x, -q.y); }
    const f = box(c, b.x, b.y, b.w, b.h, 0, H, cols, 'rgba(190,225,250,.35)');
    // 類型細節
    if (b.type === 'hub') {
      const act = b.queue.length > 0 && b.haltT <= 0;
      // 隊色飾帶
      poly(c, [lerpP(f.D0, f.D, .16), lerpP(f.C0, f.C, .16), lerpP(f.C0, f.C, .3), lerpP(f.D0, f.D, .3)], alpha(accent, .8));
      poly(c, [lerpP(f.C0, f.C, .16), lerpP(f.B0, f.B, .16), lerpP(f.B0, f.B, .3), lerpP(f.C0, f.C, .3)], alpha(accent, .55));
      // 左面：窗＋門
      face(c, f.D0, f.C0, H, 6, 3, (i, j) => (j === 0 && i >= 2 && i <= 3) ? null : (hash2(i * 3 + j, 4) > .35 ? `rgba(255,${210 + 20 * Math.sin(t + i)},130,${.5 + .3 * hash2(i, j)})` : 'rgba(20,40,55,.9)'));
      const d0 = lerpP(f.D0, f.C0, .36), d1 = lerpP(f.D0, f.C0, .64);
      poly(c, [d0, d1, { x: d1.x, y: d1.y - H * .36 }, { x: d0.x, y: d0.y - H * .36 }], act ? alpha(COL.team, .55 + .25 * Math.sin(t * 8)) : '#0b1620', alpha(accent, .8), 1);
      // 右面：看板（Kanban 卡片）
      const cardCols = [COL.amber, COL.ore, COL.team];
      for (let col = 0; col < 3; col++) for (let row = 0; row < 3; row++) {
        const u1 = (col * 2 + .5) / 6.2, u2 = (col * 2 + 1.7) / 6.2, v1 = (row * .29 + .12), v2 = v1 + .2, q = (u, v) => ({ x: f.C0.x + (f.B0.x - f.C0.x) * u, y: f.C0.y + (f.B0.y - f.C0.y) * u - v * H });
        if ((row + col) % 3 === 2 && ((t * .6 + col) | 0) % 2) continue;
        poly(c, [q(u1, v1), q(u2, v1), q(u2, v2), q(u1, v2)], alpha(cardCols[(row + col) % 3], .75));
      }
      // 頂層塔
      const tw = box(c, b.x + 1, b.y + 1, 1, 1, H, 20, { l: '#345a70', r: '#234356', t: '#4b7a94' }, 'rgba(190,225,250,.3)');
      const top = P(cx, cy, H + 20 + 10), pulse = .5 + .5 * Math.sin(t * 3);
      c.strokeStyle = 'rgba(190,225,250,.7)'; c.lineWidth = 1.5; const m0 = P(cx, cy, H + 20); c.beginPath(); c.moveTo(m0.x, m0.y); c.lineTo(top.x, top.y - 8); c.stroke();
      ellipse(c, top.x, top.y - 8, 3.5, 3.5, alpha(COL.amber, .6 + .4 * pulse)); ellipse(c, top.x, top.y - 8, 8 + 6 * pulse, 4 + 3 * pulse, null, alpha(COL.amber, .5 * (1 - pulse)), 1);
      // 旋轉天線盤
      const ang = t * 1.4, dx = Math.cos(ang) * 11, dy = Math.sin(ang) * 5; c.strokeStyle = alpha(COL.team, .85); c.lineWidth = 2; const dc = P(cx, cy, H + 24); c.beginPath(); c.moveTo(dc.x - dx, dc.y - dy); c.lineTo(dc.x + dx, dc.y + dy); c.stroke();
      // 名牌與生產條
      const np = P(cx, cy, H + 46); c.font = `700 11px ${FONT}`; c.textAlign = 'center'; c.fillStyle = 'rgba(200,225,240,.8)'; c.fillText(D.name, np.x, np.y - 3);
      if (b.queue.length) { const q0 = b.queue[0], bp = P(cx, cy, H + 58); this.bar(c, bp.x, bp.y, 46, q0.t / q0.dur, b.haltT > 0 ? COL.red : (q0.pace.debt ? COL.amber : COL.team)); this.speedTag(c, w, bp.x + 36, bp.y + 3); }
      if (b.haltT > 0) { const hp = P(cx, cy, H + 74); c.fillStyle = COL.red; c.font = `700 12px ${FONT}`; c.fillText(L('⚠ 事故停擺', '⚠ Incident halt'), hp.x, hp.y); }
    } else if (b.type === 'comms') {
      face(c, f.D0, f.C0, H, 4, 2, (i, j) => hash2(i + j * 5, 8) > .3 ? `rgba(255,220,140,${.45 + .3 * Math.sin(t * 2 + i)})` : 'rgba(20,30,40,.9)');
      face(c, f.C0, f.B0, H, 4, 2, (i, j) => hash2(i * 3 + j, 2) > .4 ? 'rgba(255,200,110,.35)' : 'rgba(20,30,40,.8)');
      const m = P(cx, cy, H), k = t * 1.6;
      c.strokeStyle = 'rgba(210,225,235,.85)'; c.lineWidth = 2; c.beginPath(); c.moveTo(m.x, m.y); c.lineTo(m.x, m.y - 26); c.stroke();
      for (let i = 0; i < 3; i++) { const ph = ((k + i / 3) % 1), e = isoR(.4 + ph * 1.1); ellipse(c, m.x, m.y - 26, e.rx * .8, e.ry * .8, null, alpha(COL.amber, (1 - ph) * .8), 1.6); }
      ellipse(c, m.x, m.y - 27, 3, 3, COL.amber);
      const np = P(cx, cy, H + 40); c.font = `700 11px ${FONT}`; c.textAlign = 'center'; c.fillStyle = 'rgba(245,220,150,.85)'; c.fillText(D.name, np.x, np.y);
      const sp = P(cx, cy, H + 52); c.fillStyle = COL.amber; c.font = `700 10px ${FONT}`; c.fillText('+8 ▤', sp.x, sp.y);
    } else if (b.type === 'lab') {
      const cur = w.tech && w.tech.cur, lab = labAssigned(w, b), work = lab.filter(u => u.o.ph === 'work').length, on = !!cur && work > 0, m = P(cx, cy, H);
      face(c, f.D0, f.C0, H, 4, 3, (i, j) => hash2(i * 3 + j, 31) > .3 ? `rgba(150,210,255,${.35 + .3 * Math.sin(t * 2.4 + i + j)})` : 'rgba(14,26,40,.9)');
      face(c, f.C0, f.B0, H, 4, 3, (i, j) => hash2(i + j * 5, 33) > .4 ? 'rgba(160,200,255,.32)' : 'rgba(14,26,40,.85)');
      // 全像穹頂
      const g = c.createRadialGradient(m.x, m.y - 10, 2, m.x, m.y - 10, 26); g.addColorStop(0, on ? 'rgba(201,184,255,.55)' : 'rgba(150,200,255,.22)'); g.addColorStop(1, 'rgba(150,200,255,0)');
      ellipse(c, m.x, m.y - 6, 24, 12, g, alpha(COL.violet, on ? .9 : .45), 1.6);
      const ang = t * (on ? 2.6 : .8); c.strokeStyle = alpha(COL.violet, on ? .95 : .5); c.lineWidth = 2; ellipse(c, m.x, m.y - 14, 15, 7.5, null, alpha('#c9b8ff', on ? .8 : .4), 1.4);
      c.beginPath(); c.moveTo(m.x, m.y - 14); c.lineTo(m.x + Math.cos(ang) * 15, m.y - 14 + Math.sin(ang) * 7.5); c.stroke();
      if (on) { const bh = 46 + Math.sin(t * 5) * 4, gg = c.createLinearGradient(0, m.y - 6 - bh, 0, m.y - 6); gg.addColorStop(0, 'rgba(201,184,255,0)'); gg.addColorStop(1, 'rgba(201,184,255,.5)'); c.fillStyle = gg; c.fillRect(m.x - 6, m.y - 6 - bh, 12, bh); }
      const np = P(cx, cy, H + 34); c.font = `700 11px ${FONT}`; c.textAlign = 'center'; c.fillStyle = 'rgba(210,195,255,.95)'; c.fillText(D.name, np.x, np.y);
      if (cur) { const bp = P(cx, cy, H + 46); this.bar(c, bp.x, bp.y, 54, cur.prog / cur.W, work ? COL.violet : '#7b8a97'); c.font = `700 10px ${FONT}`; c.fillStyle = work ? '#d9ccff' : '#ff9f8c'; c.fillText(work ? `${cur.name}${cur.lvl > 1 ? ' ' + 'I'.repeat(cur.lvl) : ''} ×${rankSum(work).toFixed(2)}` : L(`⏸ ${cur.name}：沒人研究`, `⏸ ${cur.name}: no researchers`), bp.x, bp.y - 7); }
    } else if (b.type === 'squad' || b.type === 'plat') {
      const pl = b.type === 'plat', act = b.queue.length > 0 && b.haltT <= 0;
      face(c, f.D0, f.C0, H, 4, 2, (i, j) => hash2(i * 2 + j, pl ? 21 : 13) > .35 ? (pl ? `rgba(200,180,255,${.45 + .3 * Math.sin(t * 2 + i)})` : `rgba(255,214,140,${.45 + .3 * Math.sin(t * 2 + i)})`) : 'rgba(20,20,34,.9)');
      face(c, f.C0, f.B0, H, 4, 2, (i, j) => hash2(i + j * 3, pl ? 5 : 7) > .5 ? (pl ? 'rgba(180,160,255,.4)' : 'rgba(255,190,110,.4)') : 'rgba(20,20,34,.85)');
      const d0 = lerpP(f.D0, f.C0, .34), d1 = lerpP(f.D0, f.C0, .66); poly(c, [d0, d1, { x: d1.x, y: d1.y - H * .38 }, { x: d0.x, y: d0.y - H * .38 }], act ? alpha(pl ? COL.violet : COL.amber, .6 + .25 * Math.sin(t * 8)) : '#0b1620', alpha(accent, .8), 1);
      const m = P(cx, cy, H);
      if (pl) { for (let i = 0; i < 3; i++) { const k = ((t * .5 + i / 3) % 1); ellipse(c, m.x, m.y - 6 - k * 22, 14 * (1 - k * .3), 7 * (1 - k * .3), null, alpha(COL.violet, (1 - k) * .8), 1.6); } }
      else { const ang = t * 1.8; c.strokeStyle = alpha(COL.amber, .9); c.lineWidth = 2; c.beginPath(); c.moveTo(m.x - Math.cos(ang) * 9, m.y - 6 - Math.sin(ang) * 4.5); c.lineTo(m.x + Math.cos(ang) * 9, m.y - 6 + Math.sin(ang) * 4.5); c.stroke(); ellipse(c, m.x, m.y - 6, 10, 5, null, alpha(COL.amber, .5), 1.4); }
      const np = P(cx, cy, H + 30); c.font = `700 11px ${FONT}`; c.textAlign = 'center'; c.fillStyle = pl ? 'rgba(210,195,255,.9)' : 'rgba(255,225,160,.9)'; c.fillText(D.name, np.x, np.y);
      if (b.queue.length) { const q0 = b.queue[0], bp = P(cx, cy, H + 42); this.bar(c, bp.x, bp.y, 46, q0.t / q0.dur, q0.pace.debt ? COL.amber : COL.team); this.speedTag(c, w, bp.x + 36, bp.y + 3); }
    } else if (b.type === 'obs') {
      face(c, f.D0, f.C0, H, 4, 3, (i, j) => hash2(i * 2 + j, 3) > .45 ? `rgba(165,139,255,${.5 + .3 * Math.sin(t * 3 + j)})` : 'rgba(15,20,40,.9)');
      // 螢幕（波形）
      const q = (u, v) => ({ x: f.C0.x + (f.B0.x - f.C0.x) * u, y: f.C0.y + (f.B0.y - f.C0.y) * u - v * H });
      poly(c, [q(.12, .22), q(.88, .22), q(.88, .78), q(.12, .78)], '#0b1023', alpha(COL.violet, .8), 1);
      c.strokeStyle = alpha(COL.team, .9); c.lineWidth = 1.3; c.beginPath();
      for (let i = 0; i <= 14; i++) { const u = .16 + i * .052, v = .5 + .18 * Math.sin(t * 5 + i * .9) * (i % 5 === 0 ? 1.6 : .7), p = q(u, v); i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y); } c.stroke();
      // 雷達盤
      const dc = P(cx, cy, H + 8); ellipse(c, dc.x, dc.y, 15, 7.5, '#3b4470', 'rgba(210,200,255,.6)', 1.4);
      const ang = t * 2.2; c.strokeStyle = alpha(COL.violet, .95); c.lineWidth = 2; c.beginPath(); c.moveTo(dc.x, dc.y); c.lineTo(dc.x + Math.cos(ang) * 14, dc.y + Math.sin(ang) * 7); c.stroke();
      ellipse(c, dc.x, dc.y - 6, 3, 3, COL.violet);
      const np = P(cx, cy, H + 32); c.font = `700 11px ${FONT}`; c.textAlign = 'center'; c.fillStyle = 'rgba(200,190,255,.9)'; c.fillText(D.name, np.x, np.y);
      // 掃描脈衝
      if (w.detectT != null && w.t - w.detectT < 3) { const k = (w.t - w.detectT) / 3, e = isoR(3 + 13 * easeOut(k)), p = P(cx, cy); ellipse(c, p.x, p.y, e.rx, e.ry, alpha(COL.violet, .08 * (1 - k)), alpha(COL.violet, .8 * (1 - k)), 3); }
    }
    c.restore();
  },
  speedTag(c, w, x, y) { const s = speedMult(w); if (s > 1.01) { c.font = `700 9px ${FONT}`; c.textAlign = 'left'; c.fillStyle = '#c9b8ff'; c.fillText('×' + s.toFixed(2), x, y); c.textAlign = 'center'; } },
  bar(c, x, y, wd, k, color) { c.fillStyle = 'rgba(0,0,0,.6)'; c.fillRect(x - wd / 2 - 1, y - 3, wd + 2, 7); c.fillStyle = 'rgba(255,255,255,.14)'; c.fillRect(x - wd / 2, y - 2, wd, 5); c.fillStyle = color; c.fillRect(x - wd / 2, y - 2, wd * clamp(k, 0, 1), 5); },

  drawUnit(c, w, u, S) {
    if (u.type === 'feat' || u.type === 'pfeat' || u.type === 'efeat') return this.drawFeat(c, w, u, S);
    const p = P(u.x, u.y), t = this.t, sc = u.spawnT < 1 ? .3 + .7 * easeOut(u.spawnT) : 1;
    const rival = u.team === 1; if (rival && w.vis[Math.floor(u.y) * N + Math.floor(u.x)] !== 2) return;
    const col = rival ? COL.rival : COL.team, colD = rival ? '#a3341f' : COL.teamD;
    const working = (u.o.t === 'mine' || u.o.t === 'build' || u.o.t === 'repay') && u.o.ph === 'work';
    const wk = u.moving ? Math.sin(u.anim * 14) : 0, bob = u.moving ? Math.abs(wk) * 1.8 : (working ? Math.abs(Math.sin(u.anim * 10)) * .6 : Math.sin(u.anim * 2) * .3);
    c.save(); c.translate(p.x, p.y); c.scale(sc, sc);
    ellipse(c, 0, 1, 8.5, 4, 'rgba(0,0,0,.4)');
    const f = u.face;
    // 腿
    c.fillStyle = '#1e2c38'; c.fillRect(-4.5, -7 - (wk > 0 ? wk * 2 : 0), 3.4, 8 + (wk > 0 ? wk * 2 : 0)); c.fillRect(1.2, -7 + (wk < 0 ? wk * 2 : 0), 3.4, 8 - (wk < 0 ? wk * 2 : 0));
    // 背包
    c.fillStyle = colD; c.fillRect(-f * 8 - 2.5, -20 - bob, 5, 9);
    // 身體
    const by = -21 - bob; c.fillStyle = col; c.beginPath(); c.roundRect(-6, by, 12, 15, [6, 6, 3, 3]); c.fill();
    c.fillStyle = 'rgba(0,0,0,.22)'; c.fillRect(-6, by + 10, 12, 5); c.fillStyle = 'rgba(255,255,255,.25)'; c.fillRect(-4, by + 3, 3, 8);
    c.fillStyle = COL.amber; c.fillRect(-6, by + 7, 12, 2);
    // 頭
    ellipse(c, 0, by - 4, 5.4, 5.2, '#e9f0f5'); ellipse(c, f * 1.8, by - 3.6, 3.4, 2.6, '#123', null); c.fillStyle = 'rgba(120,230,255,.9)'; c.fillRect(f * 1.8 + (f > 0 ? .2 : -2.6), by - 4.4, 2.4, 1.2);
    // 安全帽
    c.fillStyle = rival ? '#ffb199' : COL.amber; c.beginPath(); c.arc(0, by - 6, 5.6, Math.PI, 0); c.fill(); c.fillRect(-6.3, by - 6.4, 12.6, 1.8);
    // 研究員：燈泡＋平板
    if (u.o.t === 'research' && u.o.ph === 'work') {
      const bz = by - 20 + Math.sin(t * 5 + u.id) * 1.5, pu = .5 + .5 * Math.sin(t * 6 + u.id);
      const gl = c.createRadialGradient(0, bz, 1, 0, bz, 13); gl.addColorStop(0, `rgba(255,236,150,${.55 + .3 * pu})`); gl.addColorStop(1, 'rgba(255,236,150,0)'); c.fillStyle = gl; c.fillRect(-14, bz - 14, 28, 28);
      ellipse(c, 0, bz, 3.6, 3.6, '#fff3b0', '#f5b942', 1); c.fillStyle = '#c9b8ff'; c.fillRect(-2, bz + 3.6, 4, 2.4);
      c.fillStyle = '#9ab8d4'; c.fillRect(f * 5 - 3, by + 6, 8, 6); c.fillStyle = '#0b1620'; c.fillRect(f * 5 - 2, by + 7, 6, 4);
    } else
    // 工具
    if (working) {
      const sw = Math.sin(u.anim * 13), tool = u.o.t === 'repay' ? COL.pink : u.o.t === 'build' ? '#d8dde2' : '#cfd6dc';
      const hx = f * (10 + sw * 3), hy = by + 6 + sw * 4; c.strokeStyle = '#8a9299'; c.lineWidth = 2; c.beginPath(); c.moveTo(f * 5, by + 8); c.lineTo(hx, hy); c.stroke();
      c.fillStyle = tool; c.fillRect(hx - 3, hy - 3, 6, 4);
    } else { c.strokeStyle = colD; c.lineWidth = 2.4; c.beginPath(); c.moveTo(f * 5.5, by + 6); c.lineTo(f * 7.5, by + 12 + wk); c.stroke(); }
    // 攜帶的預算
    if (u.carry > 0) { const cy = by - 17 + Math.sin(t * 8) * 1.2; poly(c, [{ x: -5, y: cy + 3 }, { x: 0, y: cy - 6 }, { x: 5, y: cy + 3 }, { x: 0, y: cy + 7 }], '#7dc0ff', '#dff0ff', 1); const g = c.createRadialGradient(0, cy, 1, 0, cy, 12); g.addColorStop(0, 'rgba(120,190,255,.45)'); g.addColorStop(1, 'rgba(120,190,255,0)'); c.fillStyle = g; c.fillRect(-12, cy - 12, 24, 24); }
    c.restore();
  },

  drawRival(c, w, b, S) {
    const v = [0, 1, 2].map(() => 0); let best = 0;
    for (let j = 0; j < b.h; j++) for (let i = 0; i < b.w; i++) best = Math.max(best, w.vis[(b.y + j) * N + b.x + i]);
    const orbit = S.role === 'orbit'; if (best === 0 && !orbit) return;
    const H = b.hgt, t = this.t, cx = b.x + b.w / 2, cy = b.y + b.h / 2, cols = { l: '#5c302c', r: '#3f2120', t: '#7d4642' };
    poly(c, [P(b.x - .25, b.y - .25), P(b.x + b.w + .25, b.y - .25), P(b.x + b.w + .25, b.y + b.h + .25), P(b.x - .25, b.y + b.h + .25)], 'rgba(46,22,22,.9)', alpha(COL.rival, .6), 1.6);
    const f = box(c, b.x, b.y, b.w, b.h, 0, H, cols, 'rgba(255,190,170,.3)');
    face(c, f.D0, f.C0, H, 5, 3, (i, j) => hash2(i * 3 + j, 6) > .4 ? `rgba(255,150,110,${.4 + .3 * Math.sin(t * 2 + i)})` : 'rgba(30,14,14,.9)');
    face(c, f.C0, f.B0, H, 5, 3, (i, j) => hash2(i + j * 4, 9) > .5 ? 'rgba(255,140,100,.35)' : 'rgba(30,14,14,.85)');
    poly(c, [lerpP(f.D0, f.D, .12), lerpP(f.C0, f.C, .12), lerpP(f.C0, f.C, .22), lerpP(f.D0, f.D, .22)], alpha(COL.rival, .85));
    const tw = box(c, b.x + 1, b.y + 1, 1, 1, H, 16, { l: '#6b3833', r: '#4a2826', t: '#8a4f49' }, 'rgba(255,190,170,.3)');
    const m = P(cx, cy, H + 16); c.strokeStyle = 'rgba(255,200,180,.8)'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(m.x, m.y); c.lineTo(m.x, m.y - 30); c.stroke();
    const wv = Math.sin(t * 4) * 2; poly(c, [{ x: m.x, y: m.y - 30 }, { x: m.x + 16, y: m.y - 26 + wv }, { x: m.x, y: m.y - 20 }], COL.rival);
    const np = P(cx, cy, H + 58); c.font = `700 11px ${FONT}`; c.textAlign = 'center'; c.fillStyle = 'rgba(255,190,170,.9)'; c.fillText(L('競品 · 對手基地', 'Rival HQ'), np.x, np.y);
    if (best === 1 && !orbit) { const ago = w.rival.seenAt < 0 ? null : Math.round(w.t - w.rival.seenAt); c.fillStyle = 'rgba(255,255,255,.85)'; c.font = `700 11px ${FONT}`; c.fillText(ago == null ? L('偵察快照', 'Scouted snapshot') : L(`偵察快照 −${ago}s`, `Snapshot −${ago}s`), np.x, np.y - 15); }
  },
  drawFeat(c, w, u, S) {
    const foe = u.team === 1; if (foe && w.vis[Math.floor(u.y) * N + Math.floor(u.x)] !== 2) return;
    const p = P(u.x, u.y), t = this.t, big = u.type === 'pfeat', sc = (u.spawnT < 1 ? .3 + .7 * easeOut(u.spawnT) : 1) * (u.sunset != null ? clamp(u.sunset / 3, 0, 1) : 1);
    const hov = (big ? 15 : 12) + Math.sin(t * 3 + u.id) * 1.6 + (u.moving ? Math.abs(Math.sin(u.anim * 12)) * 1.5 : 0), s = big ? 11 : 8.5;
    c.save(); c.translate(p.x, p.y); c.scale(sc, sc); if (u.sunset != null) c.globalAlpha = clamp(u.sunset / 3, .15, 1);
    ellipse(c, 0, 1, s * 1.05, s * .52, 'rgba(0,0,0,.4)');
    const top = { x: 0, y: -hov - s }, R_ = { x: s, y: -hov - s * .5 }, B = { x: 0, y: -hov }, Lp = { x: -s, y: -hov - s * .5 };
    const fl = u.hitFx > 0, col = fl ? ['#ffffff', '#ffe9e0', '#ffd0c4'] : foe ? ['#ff9f8c', '#d9503a', '#8f2c1e'] : big ? ['#c9b8ff', '#8a6fe0', '#5a43a8'] : ['#ffd98a', '#e0a02e', '#a86f12'];
    if (foe) { // 對手：倒立的尖錐，一眼分得出敵我
      poly(c, [Lp, B, { x: 0, y: -hov + s * 1.25 }], col[1]); poly(c, [B, R_, { x: 0, y: -hov + s * 1.25 }], col[2]); poly(c, [top, R_, B, Lp], col[0], 'rgba(255,255,255,.45)', 1);
    } else { poly(c, [Lp, B, { x: B.x, y: B.y + s * 1.05 }, { x: Lp.x, y: Lp.y + s * 1.05 }], col[1]); poly(c, [B, R_, { x: R_.x, y: R_.y + s * 1.05 }, { x: B.x, y: B.y + s * 1.05 }], col[2]); poly(c, [top, R_, B, Lp], col[0], 'rgba(255,255,255,.5)', 1); }
    if (big) { ellipse(c, 0, -hov - s * .5, s * 1.5, s * .75, null, alpha('#c9b8ff', .55 + .3 * Math.sin(t * 4)), 1.6); if (w.war) ellipse(c, 0, 0, isoR(WAR.aura).rx * .5, isoR(WAR.aura).ry * .5, null, alpha('#c9b8ff', .14 + .06 * Math.sin(t * 2)), 1.2); }
    const g = c.createRadialGradient(0, -hov - s * .4, 1, 0, -hov - s * .4, s * 2.3); g.addColorStop(0, foe ? 'rgba(255,106,74,.35)' : big ? 'rgba(165,139,255,.35)' : 'rgba(245,185,66,.35)'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(-s * 2.4, -hov - s * 2.7, s * 4.8, s * 4.6);
    if (u.hp != null && (u.hp < u.maxHp - .5 || (S.sel && S.sel.includes(u.id)))) { const k = clamp(u.hp / u.maxHp, 0, 1), y = -hov - s * 2 - 4; c.fillStyle = 'rgba(0,0,0,.65)'; c.fillRect(-11, y - 1, 22, 4.4); c.fillStyle = foe ? '#ff6a4a' : k > .5 ? '#3ee0a1' : k > .25 ? '#f5b942' : '#ff5a4d'; c.fillRect(-10, y, 20 * k, 2.4); }
    if (foe && u.job === 'retreat') { c.font = `700 9px ${FONT}`; c.textAlign = 'center'; c.fillStyle = '#ffb199'; c.fillText(L('撤退', 'Retreat'), 0, -hov - s * 2 - 8); }
    c.restore();
  },
  drawNode(c, w, n, S) {
    const v = w.vis[Math.floor(n.y) * N + Math.floor(n.x)], t = this.t, p = P(n.x, n.y), e = isoR(1.75);
    const col = n.owner === 0 ? COL.team : n.owner === 1 ? COL.rival : '#8aa3b5', vis = v === 2, known = v >= 1;
    const g = c.createRadialGradient(p.x, p.y, 4, p.x, p.y, e.rx); g.addColorStop(0, alpha(col.length === 7 ? col : '#8aa3b5', .3)); g.addColorStop(1, alpha(col.length === 7 ? col : '#8aa3b5', .04));
    ellipse(c, p.x, p.y, e.rx, e.ry, g, alpha(col.length === 7 ? col : '#8aa3b5', .8), 2);
    // 佔領進度弧
    if (Math.abs(n.bal) > .3) { const k = clamp(Math.abs(n.bal) / 20, 0, 1), cc = n.bal > 0 ? COL.team : COL.rival; c.strokeStyle = cc; c.lineWidth = 4; c.beginPath(); c.ellipse(p.x, p.y, e.rx * .8, e.ry * .8, 0, -Math.PI / 2, -Math.PI / 2 + k * 6.2832); c.stroke(); }
    // 台座光柱
    const pulse = .5 + .5 * Math.sin(t * 2 + n.id), bh = 34 + pulse * 6;
    const gg = c.createLinearGradient(0, p.y - bh, 0, p.y); gg.addColorStop(0, 'rgba(255,255,255,0)'); gg.addColorStop(1, alpha(col.length === 7 ? col : '#8aa3b5', .35)); c.fillStyle = gg; c.fillRect(p.x - 6, p.y - bh, 12, bh);
    // 對手單位（紅色小方塊）：看得到或有快照時
    const em = vis ? (w.war ? 0 : n.emP) : known ? n.seenEm : 0, k = Math.min(9, Math.round(em / FEAT_POWER));
    if (w.war && vis && n.bp > 0) { c.font = `700 10px ${FONT}`; c.textAlign = 'center'; c.fillStyle = '#ffb199'; c.fillText(L(`綁約客戶 +${Math.round(n.bp)}`, `Locked-in clients +${Math.round(n.bp)}`), p.x, p.y + e.ry + 14); ellipse(c, p.x, p.y, e.rx * .92, e.ry * .92, null, alpha(COL.rival, .35 + .2 * Math.sin(t * 3)), 1.4); }
    for (let i = 0; i < k; i++) { const a = i / Math.max(1, k) * 6.28 + .5, q = P(n.x + Math.cos(a) * 1.35, n.y + Math.sin(a) * 1.35), hv = 9 + (vis ? Math.sin(t * 3 + i) * 1.5 : 0); c.globalAlpha = vis ? 1 : .4; poly(c, [{ x: q.x, y: q.y - hv - 7 }, { x: q.x + 7, y: q.y - hv - 3.5 }, { x: q.x, y: q.y - hv }, { x: q.x - 7, y: q.y - hv - 3.5 }], '#ff9f8c', 'rgba(255,255,255,.4)', 1); poly(c, [{ x: q.x - 7, y: q.y - hv - 3.5 }, { x: q.x, y: q.y - hv }, { x: q.x, y: q.y - hv + 7 }, { x: q.x - 7, y: q.y - hv + 3.5 }], '#d9503a'); poly(c, [{ x: q.x, y: q.y - hv }, { x: q.x + 7, y: q.y - hv - 3.5 }, { x: q.x + 7, y: q.y - hv + 3.5 }, { x: q.x, y: q.y - hv + 7 }], '#8f2c1e'); c.globalAlpha = 1; }
    // 標籤
    c.textAlign = 'center'; const ly = p.y - bh - (w.war ? 40 : 14);   // 交戰時單位會擠在據點上，標籤抬高避免被血條蓋住
    c.font = `700 12px ${FONT}`; c.fillStyle = '#e9f1f7'; c.fillText(n.name, p.x, ly);
    c.font = `600 11px ${FONT}`; const own = n.owner === 0 ? L('我方 · +' + n.yield + '/s', 'Ours · +' + n.yield + '/s') : n.owner === 1 ? L('對手佔領', 'Rival-held') : L('未佔領 · +' + n.yield + '/s', 'Unclaimed · +' + n.yield + '/s');
    c.fillStyle = col.length === 7 ? col : '#a9bccb'; c.fillText(own, p.x, ly + 14);
    let line, lc = '#a9bccb';
    if (vis) { line = L(`我方 ${Math.round(n.ourP)} vs 對手 ${Math.round(n.emP)}`, `Us ${Math.round(n.ourP)} vs Rival ${Math.round(n.emP)}`); lc = n.ourP > n.emP ? '#7ff0c3' : n.emP > n.ourP ? '#ff9f8c' : '#a9bccb'; }
    else if (known) { const ag = Math.round(w.t - n.seenAt); line = L(`對手 ${Math.round(n.seenEm)}（快照 −${ag}s）`, `Rival ${Math.round(n.seenEm)} (snapshot −${ag}s)`); lc = ag > 45 ? '#7b8a97' : '#e0b56a'; }
    else { line = L('未偵察', 'Unscouted'); lc = '#7b8a97'; }
    c.fillStyle = lc; c.fillText(line, p.x, ly + 28);
    if (n.ent && platCount(w) < 1) { c.fillStyle = COL.amber; c.font = `700 10px ${FONT}`; c.fillText(L('需要 ≥1 平台功能', 'Needs ≥1 Platform Feature'), p.x, ly + 41); }
    if (S.sel && S.sel.includes(n.id)) ellipse(c, p.x, p.y, e.rx * 1.08, e.ry * 1.08, null, '#fff', 2);
  },
  /* 工程師的隧道視野：只看得到身邊，其餘幾乎全黑 */
  drawTunnel(c, f) {
    const p = P(f.x, f.y), e = isoR(ENG_SIGHT), t = this.t;
    c.save(); c.translate(p.x, p.y - 8); c.scale(1, e.ry / e.rx);
    const g = c.createRadialGradient(0, 0, e.rx * .55, 0, 0, e.rx * 1.18); g.addColorStop(0, 'rgba(2,4,8,0)'); g.addColorStop(.62, 'rgba(2,4,8,.72)'); g.addColorStop(1, 'rgba(2,4,8,.985)');
    c.fillStyle = g; c.fillRect(-6000, -6000, 12000, 12000); c.restore();
    ellipse(c, p.x, p.y + 1, 14, 7, null, alpha('#ff8fb1', .55 + .35 * Math.sin(t * 4)), 1.8);
    c.font = `700 11px ${FONT}`; c.textAlign = 'center'; c.fillStyle = '#ffb3c8'; c.fillText(L('我', 'Me'), p.x, p.y - 48);
  },
  drawPing(c, w, pg) {
    const p = P(pg.x, pg.y), t = this.t, k = clamp((pg.until - w.t) / 60, 0, 1), bob = Math.sin(t * 4) * 3;
    ellipse(c, p.x, p.y, 26, 13, 'rgba(255,143,177,.1)', alpha('#ff8fb1', .35 + .4 * Math.abs(Math.sin(t * 2))), 1.6);
    c.beginPath(); c.arc(p.x, p.y - 58 + bob, 11, 0, 6.2832); c.fillStyle = '#ff8fb1'; c.fill(); c.fillStyle = '#2a0a16'; c.font = `800 15px ${FONT}`; c.textAlign = 'center'; c.fillText('!', p.x, p.y - 52.5 + bob);
    c.font = `700 11px ${FONT}`; c.fillStyle = '#ffd0dc'; c.fillText(L('工程師回報：這附近很難改', 'Engineer report: hard to change here'), p.x, p.y - 80 + bob); c.font = `600 10px ${FONT}`; c.fillStyle = 'rgba(255,208,220,.8)'; c.fillText(L(`約 ${pg.n} 點 · 還剩 ${Math.ceil(pg.until - w.t)}s`, `~${pg.n} pts · ${Math.ceil(pg.until - w.t)}s left`), p.x, p.y - 67 + bob);
  },
  drawDebt(c, w, d, S) {
    const p = P(d.x, d.y), t = this.t, r = 8 + Math.min(10, d.pts * 3.2), j = Math.sin(t * 23 + d.seed * 30) > .85 ? 3 : 0, born = clamp((w.t - (w.detectT || 0)) * 1.4, 0, 1);
    const g = c.createRadialGradient(p.x, p.y, 2, p.x, p.y, r * 2.4); g.addColorStop(0, 'rgba(255,60,120,.4)'); g.addColorStop(1, 'rgba(255,60,120,0)'); c.fillStyle = g; ellipse(c, p.x, p.y, r * 2.4, r * 1.2, g);
    c.save(); c.translate(p.x, p.y - r * .35 * born); c.scale(born, born);
    for (const [dx, col] of [[-2, 'rgba(0,255,255,.35)'], [2, 'rgba(255,40,90,.45)']]) { c.save(); c.translate(dx * (1 + j), 0); const hgt = r * 1.3; const A = { x: 0, y: -hgt }, B = { x: r, y: -hgt + r * .5 }, C = { x: 0, y: -hgt + r }, D = { x: -r, y: -hgt + r * .5 }; poly(c, [A, B, C, D], col); c.restore(); }
    const hgt = r * 1.3, A = { x: 0, y: -hgt }, B = { x: r, y: -hgt + r * .5 }, C = { x: 0, y: -hgt + r }, D = { x: -r, y: -hgt + r * .5 }, B0 = { x: r, y: r * .5 }, C0 = { x: 0, y: r }, D0 = { x: -r, y: r * .5 };
    poly(c, [D, C, C0, D0], '#b0264f'); poly(c, [C, B, B0, C0], '#7d1a38'); poly(c, [A, B, C, D], '#ff5c8a', 'rgba(255,255,255,.4)', 1);
    c.strokeStyle = 'rgba(255,255,255,.25)'; c.lineWidth = 1; for (let i = 1; i < 5; i++) { const y = -hgt + r + i * (hgt / 5); c.beginPath(); c.moveTo(-r + 2, y - r * .5 + 2); c.lineTo(0, y + 1); c.stroke(); }
    c.restore();
    c.font = `700 11px ${FONT}`; c.textAlign = 'center'; c.fillStyle = '#ffd1df'; c.fillText(S.role === 'engineer' ? L(`卡點 ×${Math.ceil(d.pts - 1e-6)}`, `Blocker ×${Math.ceil(d.pts - 1e-6)}`) : L(`債 ×${Math.ceil(d.pts - 1e-6)}`, `Debt ×${Math.ceil(d.pts - 1e-6)}`), p.x, p.y - r * 1.3 - 10);
  },

  /* ── 戰爭迷霧：逐格 alpha，雙線性放大成柔邊 ── */
  drawFog(c, w, S) {
    const A = this.fogA, d = this.fogImg.data, k = .18;
    for (let i = 0; i < N * N; i++) {
      const v = w.vis[i], tgt = (S.noFog || (S.clearFog && S.clearFog(i))) ? 0 : v === 2 ? 0 : v === 1 ? .42 : .9;
      A[i] += (tgt - A[i]) * k; const a = A[i], o = i * 4;
      d[o] = 4; d[o + 1] = 7; d[o + 2] = 13; d[o + 3] = Math.round(a * 255);
    }
    this.fogC.putImageData(this.fogImg, 0, 0);
    c.save(); c.transform(TW / 2, TH / 2, -TW / 2, TH / 2, 0, 0); c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
    c.drawImage(this.fogCv, 0, 0, N, N); c.restore();
  },

  /* ── 小地圖 ── */
  mmXY(tx, ty) { const W = this.mm.width - 8, H = this.mm.height - 8; return { x: 4 + ((tx - ty) / N * .5 + .5) * W, y: 4 + ((tx + ty) / (2 * N)) * H }; },
  mmToTile(mx, my) { const W = this.mm.width - 8, H = this.mm.height - 8, a = ((mx - 4) / W - .5) * 2 * N, b = ((my - 4) / H) * 2 * N; return { x: clamp((a + b) / 2, 0, N), y: clamp((b - a) / 2, 0, N) }; },
  drawMinimap(w, S) {
    const c = this.mmc, W = this.mm.width, H = this.mm.height; c.clearRect(0, 0, W, H);
    const pt = (x, y) => this.mmXY(x, y);
    const dia = [pt(0, 0), pt(N, 0), pt(N, N), pt(0, N)]; poly(c, dia, '#0b141d');
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const v = w.vis[j * N + i]; if (!v) continue; const a = pt(i, j), b = pt(i + 1, j), cc = pt(i + 1, j + 1), d = pt(i, j + 1);
      poly(c, [a, b, cc, d], v === 2 ? '#25394a' : '#17242f');
    }
    for (const p of w.patches) if (w.vis[p.y * N + p.x]) { const q = pt(p.x + .5, p.y + .5); c.fillStyle = COL.ore; c.fillRect(q.x - 1.5, q.y - 1.5, 3, 3); }
    for (const b of w.blds) { const q = pt(bcx(b), bcy(b)); c.fillStyle = b.built ? COL.team : COL.amber; c.fillRect(q.x - 3.5, q.y - 2.5, 7, 5); }
    if (S.role !== 'orbit') for (const d of w.debts) { if (!debtVisible(w, d)) continue; const q = pt(d.x, d.y); c.fillStyle = COL.pink; c.fillRect(q.x - 1.5, q.y - 1.5, 3, 3); }
    for (const u of w.units) { if (u.team && w.vis[Math.floor(u.y) * N + Math.floor(u.x)] !== 2 && !w.demo) continue; const q = pt(u.x, u.y), big = u.type !== 'eng'; c.fillStyle = u.team ? COL.rival : big ? COL.amber : '#b9ffe6'; c.fillRect(q.x - 1, q.y - 1, big ? 3 : 2.2, big ? 3 : 2.2); }
    if (this.mmPings) { const now = performance.now() / 1000; this.mmPings = this.mmPings.filter(p => now - p.t0 < 3.2); for (const p of this.mmPings) { const k = (now - p.t0) % 1.05, q = pt(p.x, p.y); c.strokeStyle = alpha(p.col, 1 - k); c.lineWidth = 2; c.beginPath(); c.arc(q.x, q.y, 4 + k * 14, 0, 6.28); c.stroke(); } }
    for (const n of w.nodes || []) { const q = pt(n.x, n.y); c.strokeStyle = n.owner === 0 ? COL.team : n.owner === 1 ? COL.rival : '#8aa3b5'; c.lineWidth = 1.6; c.beginPath(); c.arc(q.x, q.y, 4, 0, 6.28); c.stroke(); }
    if (S.mmExtra) S.mmExtra(c, pt);
    poly(c, dia, null, 'rgba(150,210,240,.45)', 1);
    const cs = [[0, 0], [this.vw, 0], [this.vw, this.vh], [0, this.vh]].map(([sx, sy]) => { const t = this.s2t(sx, sy); return pt(clamp(t.x, -2, N + 2), clamp(t.y, -2, N + 2)); });
    poly(c, cs, null, 'rgba(255,255,255,.85)', 1.2);
    if (S.fogOn === false) return;
  },

  /* ── 選取用 ── */
  pick(w, sx, sy) {
    const z = this.cam.z, wx = (sx - this.vw / 2) / z + this.cam.x, wy = (sy - this.vh / 2) / z + this.cam.y;
    let best = null, bd = 1e9;
    for (const u of w.units) {
      if (u.team !== 0) continue; const p = P(u.x, u.y), d = Math.hypot(p.x - wx, (p.y - 13) - wy); if (d < 17 && d < bd) { bd = d; best = u; }
    }
    if (best) return best;
    for (const d of w.debts) { if (!debtVisible(w, d)) continue; const p = P(d.x, d.y), r = 10 + Math.min(10, d.pts * 3.2); const dd = Math.hypot(p.x - wx, (p.y - r) - wy); if (dd < r * 1.5) return d; }
    for (const b of w.blds) {
      if (b.team !== 0) continue; const H = BLD[b.type].hgt;
      const pts = [P(b.x, b.y + b.h), P(b.x + b.w, b.y + b.h), P(b.x + b.w, b.y), P(b.x + b.w, b.y, H), P(b.x, b.y, H), P(b.x, b.y + b.h, H)];
      if (ptInPoly(wx, wy, pts)) return b;
    }
    for (const p of w.patches) { if (!w.vis[p.y * N + p.x]) continue; const q = P(p.x + .5, p.y + .5); if (Math.hypot(q.x - wx, (q.y - 12) - wy) < 24) return p; }
    for (const n of w.nodes || []) { if (!w.vis[Math.floor(n.y) * N + Math.floor(n.x)]) continue; const q = P(n.x, n.y), e = isoR(1.75); if (((wx - q.x) / e.rx) ** 2 + ((wy - q.y) / e.ry) ** 2 < 1) return n; }
    return null;
  },
  unitsInRect(w, x0, y0, x1, y1) {
    const r = [], lx = Math.min(x0, x1), hx = Math.max(x0, x1), ly = Math.min(y0, y1), hy = Math.max(y0, y1);
    for (const u of w.units) { if (u.team !== 0) continue; const s = this.t2s(u.x, u.y, 12); if (s.x >= lx && s.x <= hx && s.y >= ly && s.y <= hy) r.push(u); }
    return r;
  },
};
function ptInPoly(x, y, pts) { let ins = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const a = pts[i], b = pts[j]; if ((a.y > y) !== (b.y > y) && x < (b.x - a.x) * (y - a.y) / (b.y - a.y) + a.x) ins = !ins; } return ins; }


/* ── 三層視野的覆蓋層（迷霧也罩自己人）── */
R.roleOverlay = function (c, w, S) {
  const role = S.role; if (role === 'ground' || role === 'engineer') return; const t = this.t, hub = hubOf(w); if (!hub) return;
  const hp = P(bcx(hub), bcy(hub)), e = isoR(role === 'orbit' ? 7.2 : 6.2);
  const dark = role === 'orbit' ? .96 : .5;
  const g = c.createRadialGradient(hp.x, hp.y, 10, hp.x, hp.y, e.rx);
  g.addColorStop(0, `rgba(5,8,14,${dark})`); g.addColorStop(.7, `rgba(5,8,14,${dark * .88})`); g.addColorStop(1, 'rgba(5,8,14,0)');
  c.save(); c.translate(hp.x, hp.y); c.scale(1, e.ry / e.rx); c.translate(-hp.x, -hp.y); c.fillStyle = g; c.beginPath(); c.arc(hp.x, hp.y, e.rx, 0, 6.2832); c.fill(); c.restore();
  // 漂移的雲
  for (let k = 0; k < 7; k++) {
    const a = t * .12 + k * .9, r = e.rx * (.35 + .35 * ((k * 37 % 10) / 10)), x = hp.x + Math.cos(a) * r, y = hp.y + Math.sin(a) * r * (e.ry / e.rx);
    const gg = c.createRadialGradient(x, y, 4, x, y, 90); gg.addColorStop(0, `rgba(12,20,32,${dark * .55})`); gg.addColorStop(1, 'rgba(12,20,32,0)'); c.fillStyle = gg; c.fillRect(x - 90, y - 90, 180, 180);
  }
  c.textAlign = 'center';
  if (role === 'orbit') {
    c.font = `700 14px ${FONT}`; c.fillStyle = 'rgba(190,210,225,.75)'; c.fillText(L('你的團隊在這裡', 'Your team is here'), hp.x, hp.y - 4); c.font = `12px ${FONT}`; c.fillStyle = 'rgba(160,185,205,.6)'; c.fillText(L('（老闆的畫面上，這裡是一團霧）', '(on the Boss\'s screen, it\'s all fog)'), hp.x, hp.y + 16);
  } else {
    const v = project(w, 'bridge', G);
    const pill = (x, y, txt, col) => { c.font = `700 13px ${FONT}`; const wd = c.measureText(txt).width + 22; c.fillStyle = 'rgba(8,14,24,.92)'; c.strokeStyle = col; c.lineWidth = 1.5; c.beginPath(); c.roundRect(x - wd / 2, y - 14, wd, 26, 8); c.fill(); c.stroke(); c.fillStyle = col; c.fillText(txt, x, y + 4); };
    pill(hp.x, hp.y - 44, L(`經濟效率 ${v.efficiency}%`, `Efficiency ${v.efficiency}%`), v.efficiency < 75 ? COL.red : COL.amber); pill(hp.x, hp.y - 12, v.state, '#9fb4c6');
    c.font = `12px ${FONT}`; c.fillStyle = 'rgba(190,205,220,.7)'; c.fillText(L('（聚合指標，看不到個別工程師）', '(aggregate metrics — no individual engineers)'), hp.x, hp.y + 22);
  }
  // 對手：老闆有「結論卡」
  if (w.rival && role === 'orbit') {
    const b = w.rival.b, rp = P(b.x + b.w / 2, b.y + b.h / 2, b.hgt + 66), wd = 218, hh = 60;
    c.fillStyle = 'rgba(28,10,10,.95)'; c.strokeStyle = COL.rival; c.lineWidth = 2; c.beginPath(); c.roundRect(rp.x - wd / 2, rp.y - hh, wd, hh, 10); c.fill(); c.stroke();
    c.textAlign = 'center'; c.fillStyle = '#ffd6cc'; c.font = `700 14px ${FONT}`; c.fillText(L('競品已上線「即時協作」', 'Rival shipped ‘Live Collab’'), rp.x, rp.y - hh + 24); c.fillStyle = '#c08a80'; c.font = `11px ${FONT}`; c.fillText(L('來源：市場報告 · 延遲 60s · 免費', 'Market report · 60s delay · free'), rp.x, rp.y - hh + 44);
  }
};
R.roleClear = function (w, S) { // 老闆層：對手周圍不起霧（市場報告是免費、清楚的）
  if (S.role !== 'orbit' || !w.rival) return null; const b = w.rival.b, cx = b.x + 1.5, cy = b.y + 1.5;
  return i => { const x = i % N + .5, y = ((i / N) | 0) + .5; return (x - cx) ** 2 + (y - cy) ** 2 < 42; };
};
/* v6：畫面震動、小地圖警示、點敵人 */
R.shk = 0;
R.shake = function (m) { if (G.backdrop) return; this.shk = Math.min(9, Math.max(this.shk, m)); };
R.mmPing = function (x, y, col) { (this.mmPings = this.mmPings || []).push({ x, y, col: col || COL.red, t0: performance.now() / 1000 }); if (this.mmPings.length > 6) this.mmPings.shift(); };
R.pickEnemy = function (w, sx, sy) {
  const z = this.cam.z, wx = (sx - this.vw / 2) / z + this.cam.x, wy = (sy - this.vh / 2) / z + this.cam.y; let best = null, bd = 20;
  for (const u of w.units) { if (u.team !== 1 || u.type !== 'efeat' || w.vis[Math.floor(u.y) * N + Math.floor(u.x)] !== 2) continue; const p = P(u.x, u.y), d = Math.hypot(p.x - wx, (p.y - 16) - wy); if (d < bd) { bd = d; best = u; } }
  return best;
};
