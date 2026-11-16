/* ── 劇場模式（Theater）：6 個編排好的情境，每個 5 步 + 三條活路 ─────────────
   三個視野圖層可隨時開關；關掉 PM 層，等角地圖會淡出，只剩卡片。
   卡片全由「情境狀態 S」推出（84-theater-data.js），地圖與卡片共用同一份數字。 */
const TH_NODE_POS = { niche: [12, 10.5], massS: [16.5, 15.5], massN: [14.5, 6.2], ent: [21, 13] };
const TH_CREW = { budget: '採預算', talent: '採專才', build: '蓋建築', repay: '還技術債', scout: '偵察', idle: '待命', qa: 'QA/SRE' };
const TH_LIGHT = { green: '綠', amber: '黃', red: '紅' };
const TH_LAYER_NM = { o: ['老闆', 'ORBIT'], b: ['主管', 'BRIDGE'], g: ['PM', 'GROUND'], e: ['工程師', 'ENGINEER'] };
const TH_ROCKS = [[2, 9, 2], [1, 26], [26, 9], [24, 15], [23, 21, 2], [9, 4, 2], [18, 22], [5, 27], [26, 24]];

function thMerge(a, b) {
  if (b === undefined || b === null) return a; if (typeof b !== 'object' || Array.isArray(b)) return Array.isArray(b) ? b.slice() : b;
  const o = { ...(a && typeof a === 'object' && !Array.isArray(a) ? a : {}) }; for (const k in b) o[k] = thMerge(o[k], b[k]); return o;
}
const thText = h => String(h).replace(/<[^>]+>/g, '');

const Theater = {
  cur: null, keyFn: null, resizeFn: null, timers: [],

  /* ── 選單 ── */
  menu() {
    this.teardown(); G.demo();
    const seen = store.get('theaterSeen', {});
    const m = Modal.show(`<div class="card"><div class="kicker">THEATER · 劇場</div><h2>劇場 · 先看懂</h2>
      <p class="lead">六個編排好的情境，一步一句旁白。<b>四個視野（老闆／主管／PM／工程師）可以隨時開關</b> —— 把 PM 那層關掉，地圖會整個消失，只剩卡片；最底下還有一層：只知道執行的工程師。每個情境結尾給三條活路，附代價。</p>
      <div class="mlist">${THEATER_SCENES.map((s, i) => `<button class="mcard" data-i="${i}"><span class="no">S${i + 1}</span><span><div class="t">${s.title}</div><div class="d">${s.sub}　·　5 步 · 結尾給三條活路</div></span>${seen[s.id] ? '<span class="ok">✔ 看過</span>' : ''}</button>`).join('')}</div>
      <div class="row"><button class="btn teal" id="thAll">▶ 依序播放全部</button><button class="btn ghost" id="thBack">← 返回</button></div></div>`, { clear: true, cls: 'title' });
    m.querySelectorAll('.mcard').forEach(b => b.onclick = () => { SFX.init(); this.open(+b.dataset.i); });
    m.querySelector('#thAll').onclick = () => { SFX.init(); this.open(0, { chain: true, auto: true }); };
    m.querySelector('#thBack').onclick = () => Screens.title();
  },

  /* ── 進入情境 ── */
  open(i, opts = {}) {
    this.teardown(); const sc = THEATER_SCENES[i]; if (!sc) return this.menu();
    Modal.hide(); Coach.stop();
    this.cur = { i, sc, step: 0, worldStep: -1, layers: { ...sc.steps[0].layers }, triple: false, auto: !!opts.auto, chain: !!opts.chain, S: null, prevS: null, last: {} };
    this.buildDom(); this.stage(true); this.bind(); this.go(0, true);
  },
  exit() { this.teardown(); this.menu(); },
  teardown() {
    const t = $('#theater'); if (t) t.remove(); $('#app').classList.remove('th-on'); const st = $('#stage'); if (st) st.style.opacity = '';
    if (this.keyFn) removeEventListener('keydown', this.keyFn, true); if (this.resizeFn) removeEventListener('resize', this.resizeFn);
    this.keyFn = this.resizeFn = null; this.clearTimers(); clearTimeout(this.defT); if (G.mission && G.mission.theater) { G.mission = null; }
    this.cur = null;
  },
  later(ms, f) { const t = setTimeout(() => { this.timers = this.timers.filter(x => x !== t); f(); }, ms); this.timers.push(t); return t; },
  clearTimers() { this.timers.forEach(clearTimeout); this.timers = []; clearTimeout(this.autoT); },

  /* ── 地圖世界（活的：工人採礦、對手單位巡邏；卡片與它共用 S）── */
  stage(fresh) {
    const c = this.cur, sc = c.sc, mp = sc.map;
    G.mission = { theater: true, scene: (g, S) => this.scene(S) }; G.missionIdx = -1; G.over = false; G.beat = null; G.userPause = false; G.sel = []; G.place = null; G.role = 'ground'; G.unlocked = new Set(); G.opts = {}; G.clockOn = false; G.dp = null;
    FX.clear(); UI.reset(); if (fresh) { R.terrain = null; } R.fogA.fill(0);
    const w = newWorld(31 + sc.n); w.demo = true;
    w.pads = [{ x: 5, y: 15, w: 8, h: 8, c: '#21364a', line: 'rgba(62,224,161,.22)' }, { x: 1, y: 11, w: 5, h: 13, c: '#15222d' }, { x: 18, y: 3, w: 7, h: 7, c: '#3a2424', line: 'rgba(255,106,74,.3)' }];
    const hub = layoutBase(w, 7, 17); scatterRocks(w, TH_ROCKS);
    const cs = [[11, 17], [11, 19], [13, 17], [13, 19]]; for (let k = 0; k < mp.comms; k++) { const b = addBld(w, 'comms', cs[k][0], cs[k][1], true); b.done = -9; }
    if (mp.obs) { const o = addBld(w, 'obs', 11, 14, true); o.done = -9; }
    addRival(w, 20, 5);
    spawnCrew(w, hub, mp.workers); w.units.filter(u => u.team === 0).forEach(u => cmdMine(w, [u], w.patches[u.id % w.patches.length]));
    this.putDebt(w, mp.debt);
    computeVision(w); warm(w, 8); w.t0 = w.t - 20;
    G.w = w; G.backdrop = true; G.demoCam = null; $('#hud').classList.add('off');
    // 「上線功能」小方塊
    c.cubes = Array.from({ length: mp.feats }, (_, k) => ({ x: 6.6 + (k % 11) * .62, y: 24.6 + Math.floor(k / 11) * .72, k, st: 'alive', t0: 0 }));
    this.cam();
  },
  putDebt(w, total) {
    let left = total; const spots = [];
    while (left > 0) {
      const pts = left >= 4 ? 3 : left; left -= pts; let x, y, ok = false;
      for (let t = 0; t < 60 && !ok; t++) {
        const a = (-80 + w.rng() * 250) * Math.PI / 180, r = 2.9 + w.rng() * 2.6, hub = w.blds[0]; x = bcx(hub) + Math.cos(a) * r; y = bcy(hub) + Math.sin(a) * r;
        ok = tileFree(w, Math.floor(x), Math.floor(y)) && !spots.some(s => Math.hypot(s.x - x, s.y - y) < 1.5);
      }
      if (!ok) continue; spots.push({ x, y }); const d = { id: w.nid++, kind: 'debt', x, y, pts, seed: w.rng(), born: w.t }; w.debts.push(d); w.byId.set(d.id, d);
    }
  },
  cam() {
    const vw = innerWidth, vh = innerHeight, mob = vw <= 700; R.goal = null;
    if (mob) { R.cam.z = clamp(vw / 1080, .3, .55); R.cam.x = 80; R.cam.y = 430 + (vh / 2 - vh * .17) / R.cam.z; }
    else { // 桌機：避開右側 PM 卡片（約 330px），世界寬約 1080px
      R.cam.z = clamp((vw - 350) / 1240, .45, 1.05); const cx = (12 + vw - 330) / 2; R.cam.x = 40 - (cx - vw / 2) / R.cam.z;
      R.cam.y = 440 + (vh / 2 - (108 + (vh - 200)) / 2) / R.cam.z;
    }
  },
  scene(S) { // 由 G.render 每幀呼叫：畫上線功能方塊與市場據點
    const c = this.cur; if (!c) return; S.noFog = true; S.role = 'ground';
    S.extra = (items) => {
      for (const q of c.cubes) {
        if (q.st === 'gone') continue;
        items.push([q.x + q.y, () => {
          const cx = R.c, w = G.w; let k = 1, col = { l: '#2a6f63', r: '#1c4a45', t: '#3ee0a1' };
          if (q.st === 'dying') { k = 1 - clamp((w.t - q.t0) / .55, 0, 1); col = { l: '#a34a44', r: '#6b2b28', t: '#ff7a6a' }; if (k <= 0) { q.st = 'gone'; return; } }
          const H = (9 + (q.k % 3) * 3) * k; if (H < 1) return; box(cx, q.x - .2, q.y - .2, .4, .4, 0, H, col, 'rgba(200,255,235,.35)');
        }]);
      }
    };
    S.after = (cx, r, w) => {
      const st = c.S, nodes = Object.entries(st.nodes);
      for (const [id, n] of nodes) {
        const [nx, ny] = TH_NODE_POS[id], col = n.owner === 'us' ? COL.team : n.owner === 'em' ? COL.rival : '#8fa4b6', pul = .5 + .5 * Math.sin(r.t * 3 + nx);
        poly(cx, [P(nx - 1.35, ny - 1.35), P(nx + 1.35, ny - 1.35), P(nx + 1.35, ny + 1.35), P(nx - 1.35, ny + 1.35)], alpha(col, .13 + .05 * pul), alpha(col, .9), 2);
        const b0 = P(nx, ny), b1 = P(nx, ny, 46), gr = cx.createLinearGradient(b0.x, b0.y, b1.x, b1.y); gr.addColorStop(0, alpha(col, .55)); gr.addColorStop(1, alpha(col, 0)); cx.fillStyle = gr; cx.fillRect(b0.x - 5, b1.y, 10, b0.y - b1.y);
        const lp = P(nx, ny, 52), wd = 168, hh = n.snapAge ? 50 : 38, stale = n.snapAge != null && n.snapAge > 0;
        cx.fillStyle = 'rgba(8,14,24,.94)'; cx.strokeStyle = alpha(col, .9); cx.lineWidth = 1.6; cx.beginPath(); cx.roundRect(lp.x - wd / 2, lp.y - hh, wd, hh, 9); cx.fill(); cx.stroke();
        cx.textAlign = 'center'; cx.font = `700 12px ${FONT}`; cx.fillStyle = '#e9f1f7'; cx.fillText(`${THEATER_NAMES[id]}${n.owner === 'us' ? ' · 我方' : n.owner === 'em' ? ' · 對手' : ''}`, lp.x, lp.y - hh + 16);
        cx.font = `700 12px ${FONT}`; cx.fillStyle = COL.team; const a = `我方 ${n.our}`; cx.textAlign = 'right'; cx.fillText(a, lp.x - 6, lp.y - hh + 32);
        cx.textAlign = 'left'; cx.fillStyle = '#7d8b97'; cx.fillText('vs', lp.x - 2, lp.y - hh + 32); cx.fillStyle = stale ? '#8a8172' : COL.rival; cx.fillText(`對手 ${n.em}`, lp.x + 18, lp.y - hh + 32);
        if (stale) { cx.textAlign = 'center'; cx.font = `11px ${FONT}`; cx.fillStyle = '#c9a25a'; cx.fillText(`偵察快照 −${n.snapAge}s`, lp.x, lp.y - 6); }
      }
      // 上線功能標牌
      const alive = c.cubes.filter(q => q.st !== 'gone').length, p = P(9.7, 23.7, 30), f = c.S.feats, up = 0.04 * f * (1 + f / 30);
      cx.textAlign = 'center'; cx.font = `700 12px ${FONT}`; cx.fillStyle = 'rgba(190,240,225,.9)'; cx.fillText(`上線功能 ×${f}`, p.x, p.y); cx.font = `11px ${FONT}`; cx.fillStyle = 'rgba(245,185,66,.95)'; cx.fillText(`維運 −${up.toFixed(2)} ●/s`, p.x, p.y + 14);
      if (c.layers.e && !c.triple && c.step < 5) this.engSpot(cx, r, w);
    };
  },

  engSpot(cx, r, w) { // 工程師視野：只看得到身邊一小圈，其餘壓暗
    const us = w.units.filter(u => u.team === 0 && u.type === 'eng' && u.o.t === 'mine').sort((a, b) => a.id - b.id), u = us[0] || w.units.find(x => x.team === 0); if (!u) return;
    const p = P(u.x, u.y), e = isoR(2.7), t = r.t, ROSE = '#ff8fb1';
    cx.save(); cx.fillStyle = 'rgba(4,7,12,.55)'; cx.beginPath(); cx.rect(-1500, -300, 3000, 1800); cx.ellipse(p.x, p.y - 4, e.rx, e.ry, 0, 0, 6.2832); cx.fill('evenodd');
    cx.setLineDash([7, 5]); cx.lineDashOffset = -t * 10; cx.strokeStyle = alpha(ROSE, .95); cx.lineWidth = 2.2; cx.beginPath(); cx.ellipse(p.x, p.y - 4, e.rx, e.ry, 0, 0, 6.2832); cx.stroke(); cx.setLineDash([]);
    const g = cx.createRadialGradient(p.x, p.y - 4, 4, p.x, p.y - 4, e.rx); g.addColorStop(0, alpha(ROSE, .0)); g.addColorStop(1, alpha(ROSE, .13)); cx.fillStyle = g; cx.beginPath(); cx.ellipse(p.x, p.y - 4, e.rx, e.ry, 0, 0, 6.2832); cx.fill();
    const lp = P(u.x, u.y, 50); cx.font = `700 12px ${FONT}`; const tx = '我 · 視線只到這一圈', wd = cx.measureText(tx).width + 20;
    cx.fillStyle = 'rgba(30,8,18,.95)'; cx.strokeStyle = alpha(ROSE, .95); cx.lineWidth = 1.6; cx.beginPath(); cx.roundRect(lp.x - wd / 2, lp.y - 13, wd, 24, 8); cx.fill(); cx.stroke();
    cx.textAlign = 'center'; cx.fillStyle = '#ffd3e0'; cx.fillText(tx, lp.x, lp.y + 4);
    cx.restore();
  },

  /* ── 狀態 ── */
  stateAt(k, withDeferredAtK) {
    const sc = this.cur.sc; let S = sc.S;
    for (let j = 0; j <= k; j++) { S = thMerge(S, sc.patches[j]); const d = sc.deferred[j]; if (d && (j < k || withDeferredAtK)) S = thMerge(S, d.patch); }
    return S;
  },
  derive(S) {
    const f = S.feats, nodes = Object.entries(S.nodes).map(([id, n]) => ({ id, ...n }));
    return { f, upkeep: .04 * f * (1 + f / 30), cx: 1 + f / 30, nodes, us: nodes.filter(n => n.owner === 'us').length, em: nodes.filter(n => n.owner === 'em').length,
      people: Object.values(S.crew).reduce((a, b) => a + b, 0), gap: Math.round((S.ourArmy - S.emArmy) / S.emArmy * 100), debtEff: Math.round(S.debt * 1.2), drain: S.debt * .03 };
  },
  series(S) {
    const n = 12, our = [], em = []; for (let i = 0; i < n; i++) {
      const t = i / (n - 1), wig = Math.sin(i * 1.7 + S.ourArmy) * 1.6;
      our.push(S.hist.flat ? S.ourArmy + wig * .6 : S.hist.our + (S.ourArmy - S.hist.our) * t + wig);
      em.push(S.hist.em + (S.emArmy - S.hist.em) * Math.pow(t, S.hist.flat ? 1.5 : 1) + Math.cos(i * 1.3 + S.emArmy) * 1.4);
    } return { our, em };
  },

  /* ── 步驟切換（世界一致性：順著走播動畫；倒退／跳段就重建再瞬間套用）── */
  go(k, first) {
    const c = this.cur; if (!c) return; const seq = k === c.step + 1 || first;
    clearTimeout(this.defT); clearTimeout(this.autoT); c.prevS = c.S;
    const stepK = Math.min(k, 4);
    const needRebuild = c.sc.steps.slice(stepK + 1, c.worldStep + 1).some(x => x.act);   // 倒退跨過有 act 的步驟 → 世界要重建
    if (needRebuild) { this.stage(false); c.worldStep = -1; }
    // 補齊世界：worldStep+1 .. stepK 的 act（最後一步且是順著走 → 動畫，其餘瞬間）
    for (let j = c.worldStep + 1; j <= stepK; j++) this.doAct(c.sc.steps[j].act, !(j === stepK && seq && k < 5), j);
    c.worldStep = Math.max(c.worldStep, stepK);
    c.step = k; const dj = c.sc.deferred[stepK], animateDef = dj && seq && k <= 4;
    c.S = this.stateAt(stepK, !animateDef);
    if (animateDef) this.defT = setTimeout(() => { const cc = this.cur; if (!cc || cc.step !== stepK) return; cc.prevS = cc.S; cc.S = this.stateAt(stepK, true); this.render(); FX.ring(...TH_NODE_POS[dj.fx], 2, COL.amber, 1); SFX.play('ping'); }, dj.delay);
    if (k < 5) { c.layers = { ...c.sc.steps[k].layers }; c.triple = c.sc.steps[k].mode === 'triple'; } else c.triple = false;
    if (!first) SFX.play('ping');
    this.render(); this.autoArm();
    if (k === 5) { const seen = store.get('theaterSeen', {}); seen[c.sc.id] = true; store.set('theaterSeen', seen); }
  },
  doAct(act, instant, j) {
    if (!act) return; const w = G.w, c = this.cur;
    if (act === 'qa') {
      const o = addBld(w, 'obs', 11, 14, true); o.done = instant ? -9 : w.t; if (!instant) { FX.ring(12, 15, 2.4, COL.violet, 1.1); FX.burst(12, 15, 30, COL.violet, 18); SFX.play('scan'); }
    } else if (act === 'scout') {
      const us = w.units.filter(u => u.team === 0 && u.o.t === 'mine').slice(0, 2), [nx, ny] = TH_NODE_POS.massS;
      if (instant) us.forEach((u, i) => { u.x = nx - .6 + i * 1.2; u.y = ny + 1.2; u.path = []; u.o = { t: 'idle' }; }); else cmdMove(w, us, nx, ny + 1.2);
    } else if (act === 'sunset') {
      const alive = c.cubes.filter(q => q.st === 'alive').slice(-8);
      alive.forEach((q, i) => { if (instant) { q.st = 'gone'; return; } this.later(150 + i * 150, () => { if (q.st !== 'alive') return; q.st = 'dying'; q.t0 = G.w.t; FX.burst(q.x, q.y, 10, COL.red, 8); SFX.play('repay'); }); });
    }
  },
  autoArm() {
    clearTimeout(this.autoT); const c = this.cur; if (!c || !c.auto) return; let ms;
    if (c.step < 5) ms = 3500 + 90 * thText(c.sc.steps[c.step].say + (c.layers.e && c.sc.steps[c.step].addSay || '')).length + (c.sc.steps[c.step].order ? 900 : 0) + (c.layers.e ? 900 : 0);
    else if (c.chain) ms = 10000; else { c.auto = false; this.renderNav(); return; }
    this.autoT = setTimeout(() => this.next(true), ms);
  },
  next(fromAuto) {
    const c = this.cur; if (!c) return; if (!fromAuto) { c.auto = false; }
    if (c.step < 5) return this.go(c.step + 1);
    if (c.chain || fromAuto) { if (c.i + 1 < THEATER_SCENES.length) return this.open(c.i + 1, { chain: true, auto: c.auto }); return this.menu(); }
    this.nextScene();
  },
  prev() { const c = this.cur; if (!c) return; c.auto = false; if (c.step > 0) this.go(c.step - 1); },
  nextScene() { const c = this.cur; if (c.i + 1 < THEATER_SCENES.length) this.open(c.i + 1, { chain: c.chain, auto: false }); else this.menu(); },
  toggleAuto() { const c = this.cur; c.auto = !c.auto; if (c.auto && c.step === 5 && !c.chain) { c.auto = false; } this.renderNav(); this.autoArm(); },
  toggleLayer(l) { const c = this.cur; c.auto = false; clearTimeout(this.autoT); c.layers[l] = c.layers[l] ? 0 : 1; SFX.play('swap'); this.render(); },

  /* ── DOM ── */
  buildDom() {
    const c = this.cur, sc = c.sc, d = el('div'); d.id = 'theater';
    d.innerHTML = `<div class="th-catch"></div>
      <header class="th-top"><button class="th-back" id="thX">← 選單</button>
        <div class="th-title"><small>${sc.kicker}</small><b>${sc.title}</b><span>${sc.sub}</span></div>
        <div class="th-ctl"><span class="th-dots">${'<i></i>'.repeat(5)}</span><button class="th-auto" id="thAuto"></button></div></header>
      <div class="th-layers">${['o', 'b', 'g', 'e'].map(l => `<button data-l="${l}" class="l-${l}"><i></i><span class="n">${TH_LAYER_NM[l][0]}</span><small>${TH_LAYER_NM[l][1]}</small></button>`).join('')}</div>
      <main class="th-lay"><section class="th-pane p-o"></section><section class="th-pane p-b"></section><section class="th-pane p-g"></section><section class="th-pane p-e"></section><div class="th-tri"></div></main>
      <div class="th-ways"></div>
      <footer class="th-say"><div class="th-quotes"><div class="th-order"></div><div class="th-engq"></div></div><div class="th-text"></div>
        <div class="th-nav"><button id="thPrev">‹ 上一步</button><span class="th-cnt"></span><button id="thNext" class="pri">下一步 ›</button></div></footer>`;
    $('#app').appendChild(d); $('#app').classList.add('th-on');
    d.querySelector('#thX').onclick = () => { SFX.init(); this.exit(); };
    d.querySelector('#thAuto').onclick = () => { SFX.init(); this.toggleAuto(); };
    d.querySelector('#thPrev').onclick = () => { SFX.init(); this.prev(); };
    d.querySelector('#thNext').onclick = () => { SFX.init(); this.next(); };
    d.querySelectorAll('.th-layers button').forEach(b => b.onclick = () => { SFX.init(); this.toggleLayer(b.dataset.l); });
  },
  bind() {
    this.keyFn = e => {
      if (e.ctrlKey || e.metaKey || e.altKey || /^F\d+$/.test(e.key)) return; const k = /^Key[A-Z]$/.test(e.code) ? e.code.slice(3).toLowerCase() : /^Digit[0-9]$/.test(e.code) ? e.code.slice(5) : String(e.key).toLowerCase(); e.stopImmediatePropagation(); e.stopPropagation();
      if (k === 'escape') { e.preventDefault(); this.exit(); } else if (k === 'arrowright' || k === ' ' || k === 'enter') { e.preventDefault(); this.next(); } else if (k === 'arrowleft') { e.preventDefault(); this.prev(); }
      else if (k === 'p') this.toggleAuto(); else if (k === '3') this.toggleLayer('o'); else if (k === '2') this.toggleLayer('b'); else if (k === '1') this.toggleLayer('g'); else if (k === '4') this.toggleLayer('e');
    };
    addEventListener('keydown', this.keyFn, true);
    this.resizeFn = () => { this.cam(); this.sayH(); }; addEventListener('resize', this.resizeFn);
  },

  /* ── 卡片內容 ── */
  chipsO(S, D) {
    const tr = S.cashTrend > 0 ? '<i class="up">▲</i>' : S.cashTrend < 0 ? '<i class="dn">▼</i>' : '<i class="fl">▬</i>';
    return `<div class="th-grid">
      <div class="th-c" data-k="cash"><span>帳上現金</span><b>${S.cash}${tr}</b></div>
      <div class="th-c" data-k="people"><span>總人數</span><b>${D.people}</b></div>
      <div class="th-c" data-k="ms"><span>下一個里程碑</span><b class="sm">${S.milestone}</b></div>
      <div class="th-c" data-k="light"><span>風險燈號</span><b><i class="th-lamp ${S.light}"></i>${TH_LIGHT[S.light]}</b></div>
      <div class="th-c w2" data-k="share"><span>市佔　·　跑道</span><b>${S.share}%<em>${S.runway == null ? '穩定' : S.runway + ' 個月'}</em></b></div></div>
      ${S.headline ? `<div class="th-enemy" data-k="hl"><b>▲ ${S.headline}</b><small>來源：市場報告 · 延遲 60s · 免費 · 沒經過內部美化</small></div>` : '<div class="th-enemy mute" data-k="hl"><b>市場報告：本期沒有重大競品動態</b></div>'}
      <div class="th-blind">看不到：<b>管理頻寬 · 生產佇列 · 技術債 · 個別工程師</b></div>`;
  },
  chipsE(S, D) {
    const E = S.eng || {}, tix = Array.from({ length: E.tix || 0 }, () => '<i class="tk"></i>').join('');
    return `<div class="th-grid e2">
      <div class="th-c" data-k="e-tix"><span>我手上的票</span><b class="sm"><span class="tks">${tix}</span>${E.tickets}</b></div>
      <div class="th-c" data-k="e-ord"><span>收到的指令</span><b class="sm">「${E.order}」<em class="nowhy">沒說原因</em></b></div>
      <div class="th-c w2" data-k="e-feel"><span>我覺得</span><b class="sm">${E.feel}</b></div>
      <div class="th-c w2" data-k="e-sight"><span>視線</span><b class="sm">同事 ${E.peers} 人${E.blockers ? ` · 身邊 <em class="hot">${E.blockers} 處卡點</em>${E.sightNote ? '（' + E.sightNote + '）' : ''}` : ' · 沒有特別的卡點'}</b></div></div>
      <div class="th-blind e">—— 我不知道：<b>預算 · 管理頻寬 · 為什麼要做 · 老闆要什麼 · 競品</b>　<span class="up">↑ 我的摩擦，沒有管道往上講</span></div>`;
  },
  chartSvg(S) {
    const s = this.series(S), mx = Math.max(...s.our, ...s.em) * 1.15, mn = Math.min(...s.our, ...s.em) * .8, pt = a => a.map((v, i) => `${(i / 11 * 196 + 2).toFixed(1)},${(58 - (v - mn) / (mx - mn) * 54).toFixed(1)}`).join(' ');
    return `<svg class="th-chart" viewBox="0 0 200 62" preserveAspectRatio="none"><polyline points="${pt(s.em)}" fill="none" stroke="#ff6a4a" stroke-width="2"/><polyline points="${pt(s.our)}" fill="none" stroke="#3ee0a1" stroke-width="2"/></svg>`;
  },
  chipsB(S, D) {
    const gp = (D.gap > 0 ? '+' : '') + D.gap + '%';
    return `<div class="th-grid g4">
      <div class="th-c" data-k="eco"><span>經濟效率（聚合）</span><b>${S.eco}%</b></div>
      <div class="th-c" data-k="army"><span>戰力對比</span><b>${S.ourArmy}<em>:</em>${S.emArmy}<i class="${D.gap < 0 ? 'dn' : 'up'}">${gp}</i></b></div>
      <div class="th-c" data-k="own"><span>據點佔有</span><b>${D.us} : ${D.em}</b></div>
      <div class="th-c" data-k="ship"><span>累計已交付</span><b>${S.shipped}</b></div></div>
      <div class="th-chartbox" data-k="chart"><div class="th-leg"><em class="u">■ 我方戰力</em><em class="e">■ 對手戰力</em></div>${this.chartSvg(S)}</div>
      <div class="th-blind">看得到<b>症狀</b>，看不到<b>原因</b>（頻寬？技術債？）</div>`;
  },
  nodeRows(S, D) {
    return D.nodes.filter(n => n.owner !== 'none' || n.our || n.em).map(n => {
      const stale = n.snapAge != null && n.snapAge > 0, mx = 70;
      return `<div class="th-n" data-k="n-${n.id}"><div class="nh"><b>${THEATER_NAMES[n.id]}</b><span class="own ${n.owner}">${n.owner === 'us' ? '我方' : n.owner === 'em' ? '對手' : '無人'}</span><span class="nv"><span class="u">${n.our}</span> vs <span class="e ${stale ? 'stale' : ''}">${n.em}</span>${stale ? `<small>快照 −${n.snapAge}s</small>` : '<small>即時</small>'}</span></div>
        <div class="nb"><div class="bar u"><i style="width:${Math.min(100, n.our / mx * 100)}%"></i></div><div class="bar e ${stale ? 'stale' : ''}"><i style="width:${Math.min(100, n.em / mx * 100)}%"></i></div></div>
        ${n.needPlatform ? `<div class="nw">門檻 ${n.thr} · <b>需平台功能 ≥1（我方 ${S.platform}）</b></div>` : ''}</div>`;
    }).join('');
  },
  debtText(S, D) { return S.debtVisible ? `×${S.debt}<em>效率 −${D.debtEff}% · 每秒 −${D.drain.toFixed(2)}●</em>` : '<span class="hid">看不見（沒有 QA／監控中心）</span>'; },
  rowsG(S, D) {
    const bwWarn = S.bw[1] - S.bw[0] <= 2 ? (S.bw[1] - S.bw[0] <= 0 ? 'bad' : 'warn') : '';
    const crew = Object.entries(S.crew).filter(([, v]) => v > 0).map(([k, v]) => `${TH_CREW[k]} ${v}`).join(' · ');
    return `<div class="th-r" data-k="g-res"><span>預算 · 專才</span><b>●${S.cash}<em>◆${S.talent}</em></b></div>
      <div class="th-r" data-k="g-crew"><span>工作配置</span><b class="sm">${D.people} 人：${crew}</b></div>
      <div class="th-r ${bwWarn}" data-k="g-bw"><span>管理頻寬</span><b>▤ ${S.bw[0]} / ${S.bw[1]}${bwWarn ? `<em>${bwWarn === 'bad' ? '已滿' : '再進 ' + (S.bw[1] - S.bw[0]) + ' 人就停'}</em>` : ''}</b></div>
      <div class="th-r" data-k="g-q"><span>生產佇列</span><b>${S.queue}</b></div>
      <div class="th-r ${S.debtVisible ? '' : 'hidn'}" data-k="g-debt"><span>技術債</span><b>${this.debtText(S, D)}</b></div>
      <div class="th-r" data-k="g-feat"><span>上線功能 · 維運</span><b>${S.feats}<em>−${D.upkeep.toFixed(2)}●/s · 複雜度 ×${D.cx.toFixed(2)}</em></b></div>
      ${S.net != null ? `<div class="th-r ${S.net < 0 ? 'bad' : 'good'}" data-k="g-net"><span>淨收</span><b>${S.net > 0 ? '+' : ''}${S.net.toFixed(2)} ●/s</b></div>` : ''}
      <div class="th-r ${S.platformNote && !S.platform ? 'warn' : ''}" data-k="g-plat"><span>平台功能</span><b>${S.platform}${S.platformNote ? '<em>●125 ◆50 · 32s（先蓋平台組 ●150 ◆100 · 60s）</em>' : ''}</b></div>
      <div class="th-sub">各據點（我方 vs 對手）</div>${this.nodeRows(S, D)}`;
  },
  triRows(S, D) {
    const NO = '<span class="th-no">—— 這層沒有這一格</span>', oldest = D.nodes.filter(n => n.snapAge).reduce((m, n) => Math.max(m, n.snapAge), 0);
    const crew = Object.entries(S.crew).filter(([, v]) => v > 0).map(([k, v]) => `${TH_CREW[k]} ${v}`).join(' · ');
    const nodesShort = D.nodes.filter(n => n.owner !== 'none' || n.em).slice(0, 3).map(n => `${THEATER_NAMES[n.id].replace('大眾市場·', '大眾·')} <span class="u">${n.our}</span>:<span class="e ${n.snapAge > 0 ? 'stale' : ''}">${n.em}</span>${n.snapAge > 0 ? '<small>−' + n.snapAge + 's</small>' : ''}`).join('　');
    const E = S.eng || {};
    return [
      ['錢', `<b>NT$ ${S.cash}</b> 帳上現金`, null, `●${S.cash} · ◆${S.talent}`, null],
      ['人', `總人數 <b>${D.people}</b>`, null, `<b class="sm">${crew}</b>`, `視線內同事 <b>${E.peers}</b> 人`],
      ['里程碑', S.milestone, null, null, null],
      ['風險燈號', `<i class="th-lamp ${S.light}"></i>${TH_LIGHT[S.light]}`, null, null, null],
      ['地盤', `市佔 <b>${S.share}%</b> · 跑道 ${S.runway == null ? '穩定' : S.runway + ' 個月'}`, `據點佔有 <b>${D.us} : ${D.em}</b>`, `我方 ${D.us} · 對手 ${D.em} · 逐個看戰力`, null],
      ['敵情', S.headline ? `<b class="hl">▲ ${S.headline}</b><small>市場報告 · 結論式 · 免費</small>` : '本期沒有重大動態', `戰力 <b>${S.ourArmy}:${S.emArmy}</b>（${D.gap > 0 ? '+' : ''}${D.gap}%）`, nodesShort, null],
      ['為什麼要做', `<b class="sm">${S.milestone}</b><small>老闆自己的理由</small>`, `落後 <b>${Math.max(0, -D.gap)}%</b><small>結論，沒有原因</small>`, `頻寬 ${S.bw[0]}/${S.bw[1]} · 債 ${S.debtVisible ? S.debt : '？'}<small>現場條件</small>`, null],
      ['效率', null, `經濟效率 <b>${S.eco}%</b>`, S.debtVisible ? `債拖慢 −${D.debtEff}%（原因看得到）` : `產出 ${S.eco}% <span class="hid">原因：？</span>`, E.slow ? `我的票每張多花 <b>${E.slow}%</b>` : null],
      ['交付', null, `累計已交付 <b>${S.shipped}</b>`, `佇列 ${S.queue} · 上線功能 ${S.feats}`, null],
      ['管理頻寬', null, null, `<b>▤ ${S.bw[0]} / ${S.bw[1]}</b>`, null],
      ['技術債', null, null, this.debtText(S, D), E.blockers ? `天天繞過 <b>${E.blockers}</b> 處卡點<small>${E.sightNote || ''}</small>` : null],
      ['維運', null, null, `−${D.upkeep.toFixed(2)}●/s · ×${D.cx.toFixed(2)}${S.net != null ? ' · 淨收 ' + (S.net > 0 ? '+' : '') + S.net.toFixed(2) : ''}`, null],
      ['平台功能', null, null, `${S.platform} 個${S.platformNote ? '（企業據點要求 ≥1）' : ''}`, null],
      ['快照時戳', null, null, oldest ? `最舊 <b>−${oldest}s</b>` : '全是即時', null],
      ['手上的票', null, null, null, `<b class="sm">${E.tickets}</b>`],
      ['收到的指令', null, null, null, `「${E.order}」<small class="nowhy">沒說原因</small>`],
      ['我覺得', null, null, null, `<b class="sm">${E.feel}</b>`],
    ].map(([lab, o, b, g, e]) => `<div class="th-trow"><div class="th-tl">${lab}</div>${[['o', o], ['b', b], ['g', g], ['e', e]].map(([l, v]) => `<div class="th-tc l-${l} ${v == null ? 'empty' : ''}" data-l="${l}"><div>${v == null ? NO : v}</div></div>`).join('')}</div>`).join('');
  },

  /* ── 繪製 ── */
  render() {
    const c = this.cur, d = $('#theater'); if (!c || !d) return; const S = c.S, D = this.derive(S), L = c.layers, st = c.step, ways = st === 5, tri = c.triple && !ways;
    const on = k => L[k] && !ways; const nOn = ['o', 'b', 'g', 'e'].filter(k => L[k]).length; const step = st < 5 ? c.sc.steps[st] : null;
    d.classList.toggle('ways', ways); d.classList.toggle('tri', tri);
    d.querySelectorAll('.th-layers button').forEach(b => { b.classList.toggle('on', !!L[b.dataset.l]); });
    { const tt = $('#theater .th-tri'); if (tt && !tt.dataset.bound) { tt.dataset.bound = 1; ['wheel', 'touchmove', 'pointerdown'].forEach(ev => tt.addEventListener(ev, () => { tt.dataset.us = 1; }, { passive: true })); } }
    const po = d.querySelector('.p-o'), pb = d.querySelector('.p-b'), pg = d.querySelector('.p-g'), tr = d.querySelector('.th-tri');
    const setPane = (p, show, cls, html) => { p.classList.toggle('off', !show || tri); p.classList.remove('solo'); if (show && !tri && cls) p.classList.add('solo'); if (show && !tri) p.innerHTML = html; };
    setPane(po, on('o'), nOn === 1, `<h4><span>ORBIT</span>軌道層 · 老闆</h4>${this.chipsO(S, D)}`);
    setPane(pb, on('b'), nOn === 1, `<h4><span>BRIDGE</span>艦橋層 · 主管</h4>${this.chipsB(S, D)}`);
    setPane(pg, on('g'), false, `<h4><span>GROUND</span>地面層 · PM</h4>${this.rowsG(S, D)}`);
    const pe = d.querySelector('.p-e');
    setPane(pe, on('e'), nOn === 1, `<h4><span>ENGINEER</span>執行層 · 工程師</h4>${step && step.engNote ? `<div class="th-enote">${step.engNote}</div>` : ''}${this.chipsE(S, D)}`);
    pb.classList.toggle('compact', !!(on('b') && on('e') && !tri && nOn > 1 && !pb.classList.contains('solo')));
    if (innerWidth <= 700) { pe.style.top = ''; pe.style.maxHeight = ''; }
    else if (on('e') && !tri) { const bh = !pb.classList.contains('off') && !pb.classList.contains('solo') ? pb.offsetHeight : 0, top = bh ? bh + 8 : 0; pe.style.top = pe.classList.contains('solo') ? '' : top + 'px'; pe.style.maxHeight = pe.classList.contains('solo') ? '' : `calc(100% - ${top}px)`; }
    tr.classList.toggle('off', !tri);
    if (tri) tr.innerHTML = `<div class="th-trow th-th"><div class="th-tl"></div><div class="l-o">ORBIT · 老闆 <small>四五個數字</small></div><div class="l-b">BRIDGE · 主管 <small>四個聚合指標</small></div><div class="l-g">GROUND · PM <small>二十幾格細節</small></div><div class="l-e">ENGINEER · 工程師 <small>只有手上那張票</small></div></div>${this.triRows(S, D)}`;
    if (tri) { delete tr.dataset.us; tr.scrollTop = 0; const st0 = st; this.later(2600, () => { const cc = this.cur; if (cc && cc.step === st0 && cc.triple && !tr.dataset.us) tr.scrollTo({ top: tr.scrollHeight, behavior: 'smooth' }); }); }
    // 地圖：PM 層關掉 → 淡出；並排 → 壓暗；活路頁 → 暗
    const stg = $('#stage'); stg.style.opacity = ways ? .2 : tri ? .1 : L.g ? 1 : .06;
    // 旁白
    const say = d.querySelector('.th-text'), ord = d.querySelector('.th-order'), eq = d.querySelector('.th-engq'), qs = d.querySelector('.th-quotes');
    say.innerHTML = step ? step.say + (L.e && step.addSay ? ` <span class="th-add">${step.addSay}</span>` : '') : `<b>三條活路</b> —— ${c.sc.hook}`;
    const hasO = !!(step && step.order), hasE = !!(step && L.e && S.eng);
    ord.style.display = hasO ? '' : 'none'; if (hasO) ord.innerHTML = `<small>老闆</small>「${step.order}」`;
    eq.style.display = hasE ? '' : 'none'; if (hasE) eq.innerHTML = `<small>工程師</small>「${S.eng.say}」`;
    qs.style.display = hasO || hasE ? '' : 'none';
    d.classList.toggle('has-order', hasO || hasE);
    // 活路頁
    const wy = d.querySelector('.th-ways');
    wy.innerHTML = ways ? `<div class="th-wi"><div class="kicker">${c.sc.kicker} · 三條活路</div><h3>${c.sc.title}</h3><p class="hook">${c.sc.hook}</p>
      <div class="th-wg">${c.sc.ways.map((w, i) => `<article class="way w-${w.c}"><div class="wt">${w.t}</div><div class="wh">${w.h}</div><p>${w.b}</p><div class="wc">${w.cost}</div></article>`).join('')}</div>
      <div class="row"><button class="btn ghost" id="wRe">↺ 重看這一幕</button>${c.i + 1 < THEATER_SCENES.length ? '<button class="btn teal" id="wNx">下一個情境 ▶</button>' : ''}<button class="btn ghost" id="wMenu">回劇場選單</button></div></div>` : '';
    if (ways) { wy.querySelector('#wRe').onclick = () => { SFX.init(); c.auto = false; this.go(0); }; const nx = wy.querySelector('#wNx'); if (nx) nx.onclick = () => { SFX.init(); this.nextScene(); }; wy.querySelector('#wMenu').onclick = () => { SFX.init(); this.exit(); }; }
    this.renderNav(); this.flash(); this.sayH();
  },
  sayH() { const d = $('#theater'); if (!d) return; const f = d.querySelector('.th-say'); if (f && f.offsetHeight) d.style.setProperty('--sayh', f.offsetHeight + 'px'); },
  renderNav() {
    const c = this.cur, d = $('#theater'); if (!c || !d) return; const st = c.step;
    d.querySelectorAll('.th-dots i').forEach((e, k) => e.className = k < st || st === 5 ? 'd' : k === st ? 'c' : '');
    d.querySelector('.th-cnt').textContent = st < 5 ? `${st + 1} / 5` : '三條活路';
    d.querySelector('#thPrev').disabled = st === 0; const nx = d.querySelector('#thNext'); nx.textContent = st < 4 ? '下一步 ›' : st === 4 ? '看三條活路 ›' : (c.i + 1 < THEATER_SCENES.length ? '下一個情境 ›' : '回選單');
    const ab = d.querySelector('#thAuto'); ab.textContent = c.auto ? '❚❚ 自動中' : '▶ 自動'; ab.classList.toggle('on', c.auto);
  },
  flash() { // 這一步變動的欄位閃一下
    const d = $('#theater'), c = this.cur; if (!d) return; d.querySelectorAll('[data-k]').forEach(e => {
      const k = e.dataset.k, h = e.innerHTML; if (c.last[k] !== undefined && c.last[k] !== h) { e.classList.remove('chg'); void e.offsetWidth; e.classList.add('chg'); } c.last[k] = h;
    });
  },
};
