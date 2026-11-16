/* ── 遊戲控制器：狀態、指令、主迴圈。所有玩家動作先過 Coach.ok() 閘門 ─────── */
const G = {
  w: null, mission: null, missionIdx: -1, sel: [], role: 'ground', speed: 1, userPause: false, beat: null, place: null, cmdMode: null,
  unlocked: new Set(), over: false, clock: 0, clockOn: false, decisionPause: false, hover: null, lastSpeedMsg: 0, opts: {},
  has(k) { return this.unlocked.has(k); },
  engId: null,
  engFocus() { // 工程師視角跟隨的那個人
    const w = this.w; if (!w) return null; let u = w.byId.get(this.engId); if (u && u.kind === 'unit' && u.type === 'eng' && u.team === 0) return u;
    const h = hubOf(w), us = engs(w); if (!us.length) return null;
    return us.slice().sort((a, b) => ((a.o.t === 'idle') - (b.o.t === 'idle')) * 50 + Math.hypot(a.x - bcx(h), a.y - bcy(h)) - Math.hypot(b.x - bcx(h), b.y - bcy(h)))[0];
  },
  engCycle(dir) { const us = engs(this.w).sort((a, b) => a.id - b.id); if (!us.length) return; const cur = this.engFocus(), i = us.indexOf(cur); const nx = us[(i + (dir || 1) + us.length) % us.length]; this.engId = nx.id; SFX.play('select'); UI.layerH = ''; },
  engAct(a) {
    if (a === 'prev') return this.engCycle(-1); if (a === 'next') return this.engCycle(1);
    if (a === 'report') {
      const u = this.engFocus(), r = cmdEngReport(this.w, u);
      if (r.ok) { UI.toast(`我回報了：這附近有 ${r.n} 點很難改的地方`, 'good'); SFX.play('ping'); UI.layerH = ''; this.emit('engReport', r); }
      else UI.toast(r.why === 'cd' ? `剛回報過（${r.left}s 後再說）` : '這附近沒什麼卡點', 'bad');
    }
  },
  techOpen: false,
  toggleTech(v) { if (!this.has('lab')) return; if (!Coach.ok('tech', {})) return; this.techOpen = v === undefined ? !this.techOpen : v; UI.sigCard = ''; UI.techSig = ''; SFX.play('click'); this.emit('techOpen', { open: this.techOpen }); },
  techStart(id) {
    if (!Coach.ok('projstart', { id })) return; const r = cmdTechStart(this.w, id), p = TECH.find(t => t.id === id);
    if (!r.ok) { UI.alert({ ore: '預算不足', busy: '已有進行中的專案（一次一個）', locked: '前置條件未滿足', maxed: '已完成', nolab: '需要研發中心' }[r.why] || '無法研發', 'warn'); return; }
    SFX.play('order'); UI.feed(`開始研發：${p.name}。派研究員過去 —— 沒人在研究，進度不會動`, 'good'); UI.techSig = ''; UI.sigCard = ''; this.emit('projstart', { id });
  },
  get tag() { return this.w ? this.w.tag : {}; },
  emit(t, d) { try {
      if (t === 'techDone') { UI.toast(`研發完成：${d.name}${d.lvl > 1 ? ' ' + 'I'.repeat(d.lvl) : ''}`, 'good'); UI.feed(`研發完成：${d.name}${d.lvl > 1 ? ' ' + 'I'.repeat(d.lvl) : ''}`, 'good'); UI.techSig = ''; UI.sigCard = ''; }
      if (t === 'techCancel') { UI.feed(`已取消研發，退回 ●${d.refund}（75%）`, 'good'); UI.techSig = ''; } Coach.event(t, d); if (this.mission && this.mission.on) this.mission.on(this, t, d); } catch (e) { console.error(e); } },
  selEnts() { return this.w ? this.sel.map(id => this.w.byId.get(id)).filter(Boolean) : []; },
  selUnits() { return this.selEnts().filter(e => e.kind === 'unit'); },
  selBld() { const e = this.selEnts(); return e.length === 1 && e[0].kind === 'bld' ? e[0] : null; },
  running() { return this.w && !this.over && !this.userPause && !this.decisionPause && (!Modal.isOpen || this.backdrop) && Coach.state !== 'wait'; },

  /* ── 選取 ── */
  select(ids, quiet) {
    if (!Coach.ok('select', { ids })) return false;
    this.sel = ids.slice(); this.place = null; this.cmdMode = null;
    if (ids.length && !quiet) SFX.play('select');
    this.emit('select', { ids: this.sel }); UI.tick(); return true;
  },
  selectIdle() {
    const us = this.w.units.filter(u => u.team === 0 && u.type === 'eng' && u.o.t === 'idle'); if (!us.length) return;
    if (this.select(us.map(u => u.id)) && !Coach.active()) { R.focus(us[0].x, us[0].y, R.cam.z); }
  },
  selectArmy() { if (!this.w || this.role !== 'ground') return; const ids = ourArmy(this.w).map(u => u.id); if (!ids.length) return; if (this.select(ids)) { const c = ids.map(i => this.w.byId.get(i)).reduce((a, u, _, A) => ({ x: a.x + u.x / A.length, y: a.y + u.y / A.length }), { x: 0, y: 0 }); R.focus(c.x, c.y, R.cam.z); } },
  lastAlert: null,
  jumpAlert() { const a = this.lastAlert; if (a && Coach.ok('camera', {})) R.focus(a.x, a.y, Math.max(R.cam.z, R.playZoom())); },
  goHome() { const h = hubOf(this.w); if (h && Coach.ok('camera', {})) R.focus(bcx(h), bcy(h) + 1, R.playZoom()); },

  /* ── 指令 ── */
  ping(x, y, col) { FX.ring(x, y, .7, col || COL.team, .5); },
  command(sx, sy, forced) { // 右鍵／命令模式下的左鍵
    const w = this.w, us = this.selUnits(), hub = this.selBld(); if (this.role !== 'ground') return;
    const tgt = R.pick(w, sx, sy), t = R.s2t(sx, sy), eu = us.filter(u => u.type === 'eng');
    if (us.length) {
      if (tgt && tgt.kind === 'patch' && eu.length) { if (!Coach.ok('order', { kind: 'mine', patch: tgt })) return; cmdMine(w, eu, tgt); this.ping(tgt.x + .5, tgt.y + .5); SFX.play('order'); this.cmdMode = null; this.emit('order', { kind: 'mine', ids: this.sel.slice(), patch: tgt.id }); }
      else if (tgt && tgt.kind === 'bld' && tgt.type === 'lab' && tgt.built && eu.length) {
        if (!Coach.ok('assign', { n: eu.length })) return; const n = cmdResearch(w, eu, tgt);
        if (n) { this.ping(bcx(tgt), bcy(tgt), COL.violet); SFX.play('order'); UI.feed(`${n} 位工程師前往研發中心`, 'good'); UI.techSig = ''; this.emit('assign', { n }); } else UI.feed(`研究位已滿（${LAB_SLOTS}）`, 'warn');
      }
      else if (tgt && tgt.kind === 'bld' && !tgt.built && tgt.team === 0 && eu.length) {
        if (!Coach.ok('order', { kind: 'build', site: tgt })) return; const n = cmdBuildSite(w, eu, tgt);
        if (n) { this.ping(bcx(tgt), bcy(tgt), COL.amber); SFX.play('order'); UI.feed(`${n} 位工程師前往工地繼續建造`, 'good'); this.emit('order', { kind: 'build', ids: this.sel.slice(), site: tgt.id }); }
      }
      else if (tgt && tgt.kind === 'debt' && eu.length) { if (!this.has('repay') || !Coach.ok('order', { kind: 'repay', debt: tgt })) return; cmdRepay(w, eu, tgt); this.ping(tgt.x, tgt.y, COL.pink); SFX.play('order'); this.cmdMode = null; this.emit('order', { kind: 'repay', ids: this.sel.slice(), debt: tgt.id }); }
      else {
        const nodeAt = tgt && tgt.kind === 'node' ? tgt : (w.nodes || []).find(n => w.vis[Math.floor(n.y) * N + Math.floor(n.x)] && Math.hypot(n.x - t.x, n.y - t.y) < 1.7);
        let mx = t.x, my = t.y; if (nodeAt) { mx = nodeAt.x; my = nodeAt.y; }
        const fu = us.filter(u => u.type !== 'eng'), foe = w.war && R.pickEnemy(w, sx, sy);
        if (w.war && fu.length && (foe || nodeAt || this.cmdMode === 'amove')) { // 攻擊移動：沿路遇敵就打（點到據點上的自己人也算點據點）
          if (foe) { mx = foe.x; my = foe.y; } if (!inb(Math.floor(mx), Math.floor(my)) || !Coach.ok('order', { kind: 'amove' })) return;
          cmdAttackMove(w, fu, mx, my); const eu2 = us.filter(u => u.type === 'eng'); if (eu2.length) cmdMove(w, eu2, mx, my);
          FX.ring(mx, my, .9, COL.red, .6); SFX.play('order'); this.cmdMode = null; this.emit('order', { kind: 'amove', x: mx, y: my }); return;
        }
        if (!inb(Math.floor(mx), Math.floor(my))) return;
        if (!this.has('move')) { if (!Coach.active()) UI.feed('這一關先不用移動 — 點礦點叫他採預算', 'warn'); return; }
        if (!Coach.ok('order', { kind: 'move' })) return; cmdMove(w, us, mx, my); this.ping(mx, my); SFX.play('order'); this.cmdMode = null; this.emit('order', { kind: 'move', x: mx, y: my });
      }
    } else if (hub && BLD[hub.type].makes) {
      if (tgt && tgt.kind === 'patch' && hub.type === 'hub') { cmdRally(w, hub, { patch: tgt.id }); this.ping(tgt.x + .5, tgt.y + .5, COL.ore); UI.feed('集合點：新工程師會自動去採這個礦', 'good'); SFX.play('order'); }
      else if (inb(Math.floor(t.x), Math.floor(t.y))) { cmdRally(w, hub, { x: t.x, y: t.y }); this.ping(t.x, t.y, COL.amber); UI.feed('集合點已設定', 'good'); SFX.play('order'); }
    }
  },
  doCmd(cmd) {
    const w = this.w; if (!w) return;
    if (cmd === 'resume-site') {
      const s = this.selBld(); if (!s || s.built || !Coach.ok('order', { kind: 'build', site: s })) return;
      const eu = w.units.filter(u => u.team === 0 && u.type === 'eng' && !(u.o.t === 'build' && u.o.site === s.id));
      if (!eu.length) { UI.feed('沒有可派的工程師', 'warn'); return; }
      const rank = u => (u.o.t === 'idle' ? 0 : u.o.t === 'mine' ? 1 : 2) * 100 + Math.hypot(u.x - bcx(s), u.y - bcy(s));
      const u = eu.sort((a, b) => rank(a) - rank(b))[0]; cmdBuildSite(w, [u], s); R.focus(bcx(s), bcy(s), R.cam.z); SFX.play('order'); UI.feed('已派最近的工程師回工地', 'good'); UI.infoSig = ''; return;
    }
    if (cmd === 'cancel-site') {
      const s = this.selBld(); if (!s || s.built || !Coach.ok('cancel', {})) return;
      const r = cmdCancelSite(w, s); if (r.ok) { this.sel = []; this.place = null; SFX.play('click'); UI.feed(`已取消建造，退回 ●${r.refund}（75%）`, 'good'); UI.sigCard = ''; UI.infoSig = ''; }
      return;
    }
    if (cmd === 'train') return this.train();
    if (cmd === 'tech-panel') return this.toggleTech();
    if (cmd === 'tech-cancel') { if (!Coach.ok('cancel', {})) return; const r = cmdTechCancel(w); if (r.ok) { SFX.play('click'); UI.sigCard = ''; } return; }
    if (cmd === 'lab+1' || cmd === 'assign-lab') {
      const sb = this.selBld(), lab = sb && sb.type === 'lab' ? sb : labOf(w); if (!lab) return;
      let us;
      if (cmd === 'assign-lab') us = this.selUnits().filter(u => u.type === 'eng');
      else { const eng = w.units.filter(u => u.team === 0 && u.type === 'eng' && !(u.o.t === 'research' && u.o.lab === lab.id)); const rank = u => (u.o.t === 'idle' ? 0 : u.o.t === 'mine' ? 1 : 2) * 100 + Math.hypot(u.x - bcx(lab), u.y - bcy(lab)); us = eng.sort((a, b) => rank(a) - rank(b)).slice(0, 1); }
      if (!us.length) { UI.feed('沒有可派的工程師', 'warn'); return; } if (!Coach.ok('assign', { n: us.length })) return;
      const n = cmdResearch(w, us, lab); if (n) { SFX.play('order'); UI.feed(`${n} 位工程師前往研發中心`, 'good'); UI.sigCard = ''; UI.techSig = ''; this.emit('assign', { n }); } else UI.feed(`研究位已滿（${LAB_SLOTS}）`, 'warn'); return;
    }
    if (cmd === 'lab-1') { const sb = this.selBld(), lab = sb && sb.type === 'lab' ? sb : labOf(w); if (!lab || !Coach.ok('assign', { n: -1 })) return; if (cmdRecall(w, lab, 1)) { SFX.play('click'); UI.feed('召回 1 位研究員，回去採礦', 'good'); UI.sigCard = ''; UI.techSig = ''; } return; }
    if (cmd === 'sunset') { const us = this.selUnits().filter(u => u.type !== 'eng'); if (!us.length) return; cmdSunset(w, us); SFX.play('order'); UI.feed(`下架 ${us.length} 個功能（不退款）— 頻寬與維運會釋放`, 'good'); this.sel = []; UI.sigCard = ''; UI.infoSig = ''; this.emit('sunsetCmd', { n: us.length }); return; }
    if (cmd.startsWith('pace-')) { if (!Coach.ok('pace', { key: cmd.slice(5) })) return; w.pace = PACE[cmd.slice(5)]; SFX.play('click'); UI.sigCard = ''; this.emit('pace', { key: w.pace.key }); return; }
    if (cmd.startsWith('build-')) return this.buildMenu(cmd.slice(6));
    if (cmd === 'mine') { const us = this.selUnits(); if (!us.length) return; const p = nearestPatch(w, us[0].x, us[0].y); if (!Coach.ok('order', { kind: 'mine', patch: p })) return; cmdMine(w, us, p); SFX.play('order'); this.emit('order', { kind: 'mine', ids: this.sel.slice(), patch: p.id }); return; }
    if (cmd === 'repay') { const us = this.selUnits(); if (!us.length || !w.debts.some(x => debtVisible(w, x))) return; const d = w.debts.filter(x => debtVisible(w, x)).sort((a, b) => Math.hypot(a.x - us[0].x, a.y - us[0].y) - Math.hypot(b.x - us[0].x, b.y - us[0].y))[0]; if (!Coach.ok('order', { kind: 'repay', debt: d })) return; cmdRepay(w, us, d); this.ping(d.x, d.y, COL.pink); SFX.play('order'); this.emit('order', { kind: 'repay', ids: this.sel.slice(), debt: d.id }); return; }
    if (cmd === 'move') { this.cmdMode = this.cmdMode === 'move' ? null : 'move'; SFX.play('click'); UI.sigCard = ''; return; }
    if (cmd === 'amove') { this.cmdMode = this.cmdMode === 'amove' ? null : 'amove'; SFX.play('click'); UI.sigCard = ''; return; }
    if (cmd === 'hold') { const fu = this.selUnits().filter(u => u.type !== 'eng'); for (const u of fu) { u.o = { t: 'idle' }; u.path = []; u.anchor = { x: u.x, y: u.y }; } SFX.play('order'); return; }
  },
  train() {
    const w = this.w, hub = this.selBld(); if (!hub || !BLD[hub.type].makes) return;
    if (!Coach.ok('train', {})) return;
    const r = cmdTrain(w, hub, w.pace);
    if (r.ok) { SFX.play('click'); this.emit('train', { hub }); }
    else {
      if (r.why === 'supply') { UI.alert('頻寬不足！先蓋協作制度（▤ 滿了）', 'bad'); const p = R.t2s(bcx(hub), bcy(hub)); FX.float(bcx(hub), bcy(hub), 'SUPPLY BLOCK', COL.red, 90); }
      else if (r.why === 'ore') UI.alert('預算不足', 'warn'); else if (r.why === 'queue') UI.alert('生產佇列已滿（5）', 'warn');
      this.emit('trainFail', { why: r.why });
    }
    UI.sigCard = '';
  },
  buildMenu(type) {
    const w = this.w, us = this.selUnits(); if (!us.length) return; if (!Coach.ok('menu', { type })) return;
    const c = bldCost(w, type); if (w.ore < c) { UI.alert(`預算不足（需要 ●${c}）`, 'warn'); return; }
    this.place = { type, x: -9, y: -9, unit: us[0].id }; this.cmdMode = null; SFX.play('click'); this.emit('menu', { type });
  },
  placeAt(sx, sy, commit) {
    const p = this.place; if (!p) return; const d = BLD[p.type], t = R.s2t(sx, sy);
    p.x = Math.round(t.x - d.w / 2); p.y = Math.round(t.y - d.h / 2);
    if (!commit) return;
    if (!Coach.ok('place', { x: p.x, y: p.y, type: p.type })) return;
    const w = this.w, us = this.selUnits(); const u = w.byId.get(p.unit) || us[0]; if (!u) { this.place = null; return; }
    const r = cmdBuild(w, u, p.type, p.x, p.y);
    if (!r.ok) { UI.alert(r.why === 'ore' ? '預算不足' : '這裡不能蓋（要在已探索、沒有東西的空地）', 'warn'); return; }
    this.place = null; SFX.play('order'); UI.sigCard = ''; this.emit('place', { type: p.type, x: p.x, y: p.y, site: r.site.id });
  },
  cancelPlace() { if (Coach.active()) return false; if (this.place || this.cmdMode) { this.place = null; this.cmdMode = null; SFX.play('click'); return true; } return false; },

  /* ── 視野切換（三層）── */
  setRole(role) {
    if (!this.has('views') || role === this.role) return; if (!Coach.ok('view', { role })) return;
    if (role === 'engineer') { const u = this.engFocus(); this.engId = u ? u.id : null; } else if (this.role === 'engineer' && this.w) { const h = hubOf(this.w); if (h) R.focus(bcx(h), bcy(h) + 1, R.playZoom()); }
    this.role = role; this.sel = []; this.place = null; this.cmdMode = null; SFX.play('swap'); UI.sigCard = ''; UI.infoSig = ''; this.emit('view', { role });
  },
  addTrust(d, why) { const w = this.w; w.trust = clamp(w.trust + d, 0, 100); w.tag.microOn = true; UI.alert(`信任 ${d > 0 ? '+' : ''}${d}　${why || ''}`, d > 0 ? 'good' : 'bad'); },
  togglePause() { if (Coach.state !== 'off' || this.over || this.decisionPause) return; this.userPause = !this.userPause; },
  cycleSpeed() { if (Coach.state !== 'off') return; this.speed = this.speed === 1 ? 2 : this.speed === 2 ? 3 : 1; },
  menu() { if (Coach.state !== 'off' && Coach.state !== undefined && Coach.active()) { Coach.nudge(); return; } this.userPause = true; Screens.pause(); },

  /* ── 節拍（教學用：跑一小段時間看結果）── */
  runBeat(b) { this.beat = { left: b.sec, speed: b.speed || 2, until: b.until || null, done: b.done || null }; },

  /* ── 主迴圈 ── */
  frame(dt) {
    const w = this.w;
    if (this.role === 'engineer' && w) { const fu = this.engFocus(); if (fu) { const q = iso(fu.x, fu.y); const zz = Math.max(1.3, R.playZoom() * 1.25); R.goal = { x: q.x, y: q.y - 16 + R.vh * .13 / zz, z: zz }; } }
    R.step(dt);
    if (this.backdrop && this.demoCam) { if (w && w.auto) Director.backdropCam(dt); else { const t = performance.now() / 1000; R.goal = null; R.cam.x = this.demoCam.x + Math.sin(t * .13) * 90; R.cam.y = this.demoCam.y + Math.cos(t * .1) * 24; } }
    else if (Director.on) Director.frame(dt);
    if (w) {
      let sim = 0;
      if (this.beat) sim = dt * this.beat.speed; else if (this.running()) sim = dt * this.speed;
      while (sim > 1e-6) {
        const s = Math.min(.05, sim); sim -= s; tick(w, s); if (w.auto) Auto.step(w, s); FX.update(s);
        if (this.clockOn) this.clock += s;
        if (this.mission && this.mission.update) this.mission.update(this, s);
        if (this.beat) {
          this.beat.left -= s; if (this.beat.left <= 0 || (this.beat.until && this.beat.until())) { const d = this.beat.done; this.beat = null; if (d) d(); Coach.beatDone(); break; }
        }
        if (this.over || this.decisionPause || Modal.isOpen) break;
      }
      if (!sim && !this.beat && !this.running()) FX.update(dt * .0);
    }
    FX.floatStep(dt); UI.tick();
  },
  render() {
    const w = this.w; if (!w) { R.draw(null, {}); return; }
    const S = { sel: this.sel, place: this.place, role: this.role, mark: Coach.mark, noFog: !!this.backdrop };
    S.clearFog = R.roleClear(w, S);
    if (this.role === 'engineer') { const fu = this.engFocus(); if (fu) S.focus = { x: fu.x, y: fu.y }; S.noFog = true; }
    if (this.mission && this.mission.scene) this.mission.scene(this, S);
    R.draw(w, S); Coach.render();
  },

  /* ── 任務 ── */
  start(idx, opts = {}) {
    Modal.hide(); Coach.stop(); Director.end(); this.backdrop = false; this.spectate = false; this.lastAlert = null; this.opts = opts; this.missionIdx = idx; this.mission = MISSIONS[idx]; this.over = false; this.userPause = false; this.decisionPause = false; this.beat = null; this.speed = 1;
    this.sel = []; this.place = null; this.cmdMode = null; this.role = 'ground'; this.techOpen = false; this.clock = 0; this.clockOn = false; this.unlocked = new Set(); this.dp = null; this.light = 'green'; FX.clear(); UI.reset();
    $('#hud').classList.remove('off'); R.terrain = null; R.fogA.fill(1);
    this.w = newWorld(idx * 101 + 7); this.mission.setup(this, opts);
    R.focus(bcx(hubOf(this.w)), bcy(hubOf(this.w)) + 1, R.playZoom(), true);
    UI.reset(); this.mission.reveal && this.mission.reveal(this, opts);
    computeVision(this.w); for (let i = 0; i < N * N; i++) R.fogA[i] = this.w.vis[i] === 2 ? 0 : this.w.vis[i] === 1 ? .42 : .9;
    UI.sigCard = ''; UI.infoSig = ''; UI.tick();
    Music.start(); Music.setMood('calm'); Music.setIntensity(this.mission.id === 'free' ? .15 : .06);
    if (!opts.skipTutorial && this.mission.steps) Coach.start(this.mission.steps(this), { onEnd: () => this.mission.afterTutorial && this.mission.afterTutorial(this) });
    else if (this.mission.afterTutorial) this.mission.afterTutorial(this, true);
  },
  finish(win, data) {
    if (this.over) return; this.over = true; this.clockOn = false; Coach.stop(); SFX.play(win ? 'victory' : 'defeat'); Music.setMood(win ? 'victory' : 'defeat'); if (this.spectate) Director.end(true);
    if (win) { const d = store.get('done', {}); d[this.mission.id] = true; store.set('done', d); }
    setTimeout(() => Screens.debrief(win, data), 700);
  },
};
