/* ═════ 觀戰導播：AI 對 AI，自動運鏡＋專案管理字幕＋自動換位子 ═════
   觀眾坐在 PM 的位子看（迷霧照舊）；字幕會把「PM 這時看不到的東西」講出來 —— 這正是這套教材要讓人看見的落差。 */
const TAGS = { scout: '偵察 Scouting', 'b-comms': 'Supply Block 預防', 'b-squad': '產能', 'b-obs': 'Detector', 'b-plat': '平台化', 'b-lab': '研發投資', repay: '還技術債', tech: '研發', retreat: '止損', defend: '防守', attack: '算過才打', mass: '集結' };
const TELLS = { // 觀察得到的人設線索（不直接說出是誰）
  'ESPOO-2007': [{ t: 280, text: '觀察：對手兵力一直停在差不多的數字，打掉多少補多少 —— 很穩，但從不變多。' }, { t: 520, text: '觀察：對手剛剛挑的進攻目標，用的是我們「兩分鐘前」的兵力 —— 它有偵察，但沒在更新判斷。' }],
  'QUIBI-1750': [{ t: 120, text: '觀察：對手兵多、錢多、一路狂攻。這時候硬碰硬，是拿自己的單位去換它的錢。' }, { t: 305, text: '觀察：對手的單位開始自己掉血 —— 它沒有營收，錢燒完了。撐住的人，現在開始收割。' }],
  'REDMOND-EDU': [{ t: 200, text: '觀察：對手的兵比我們弱，一打不贏就撤 —— 但它沒在跟你比打仗。' }, { t: 560, text: '觀察：沒人守的據點，會被它「直接吸收」：一場仗都不用打。' }],
  'NEIHU-884': [{ t: 240, text: '觀察：對手前期很弱、兵也少。這是最容易鬆懈、開始砍基礎建設的時候。' }, { t: 500, text: '觀察：對手的單位突然變得很硬、很痛 —— 不是兵變多，是它整個升級了（全域生效）。' }],
};
const Director = {
  on: false, cast: [], cur: null, curUntil: 0, shot: null, shotUntil: 0, interest: [], userAt: 0, roleBack: 0, nextRole: 70, tellK: 0, cam: true,
  init() {
    const emit = G.emit; G.emit = function (t, d) { emit.call(this, t, d); if (Director.on) try { Director.event(t, d); } catch (e) { console.error(e); } };
    const play = SFX.play; SFX.play = function (n, o) { if (G.backdrop) return; return play.call(this, n, o); };
    const cv = $('#stage'); ['pointerdown', 'wheel'].forEach(ev => cv.addEventListener(ev, () => { this.userAt = performance.now(); }, { passive: true }));
  },
  watch(opts = {}) {
    const fi = MISSIONS.findIndex(x => x.id === 'free');
    G.start(fi, { spectate: true, skipTutorial: true, persona: opts.persona, diff: opts.diff || store.get('diff', 'normal') });
  },
  begin(g) {
    this.on = true; this.cast = []; this.cur = null; this.shot = null; this.interest = []; this.roleBack = 0; this.nextRole = 70; this.tellK = 0; this.cam = true; this.ff = false; G.speed = 1;
    $('#hud').classList.add('spec'); g.unlocked.add('views'); UI.show('views');
    let bar = $('#specbar'); if (!bar) { bar = el('div', 'panel', ''); bar.id = 'specbar'; $('#hud').appendChild(bar); }
    bar.innerHTML = `<span class="lv"><i></i>觀戰 · AI 對 AI</span><button class="btn ghost" data-s="spd">速度 ×1</button><button class="btn ghost on" data-s="cam">導播 開</button><button class="btn teal" data-s="take">接手操作</button><button class="btn ghost" data-s="quit">離開</button>`;
    bar.classList.remove('hide');
    bar.onclick = e => { const b = e.target.closest('button'); if (!b) return; SFX.init(); const a = b.dataset.s;
      if (a === 'spd') { G.speed = G.speed === 1 ? 2 : G.speed === 2 ? 4 : 1; b.textContent = '速度 ×' + G.speed; }
      if (a === 'cam') { this.cam = !this.cam; b.classList.toggle('on', this.cam); b.textContent = this.cam ? '導播 開' : '導播 關'; }
      if (a === 'take') this.takeOver(g);
      if (a === 'quit') Screens.title(); };
    let c = $('#cast'); if (!c) { c = el('div', '', ''); c.id = 'cast'; $('#hud').appendChild(c); } c.className = 'hide';
    this.say('開場', `對手是四位真實案例之一（結束時揭曉）。PM 那一方由 AI 操作，字幕會講它<b>為什麼</b>這樣做 —— 以及<b>它這時候看不到什麼</b>。`, 3, 7);
  },
  end(keepBar) {
    if (!this.on) return; this.on = false; $('#hud').classList.remove('spec'); const c = $('#cast'); if (c) c.className = 'hide';
    const b = $('#specbar'); if (b && !keepBar) b.classList.add('hide'); if (b && keepBar) b.classList.add('hide');
  },
  takeOver(g) {
    const w = g.w; w.auto = null; g.spectate = false; this.end(); if (g.role !== 'ground') g.setRole('ground'); G.speed = 1;
    UI.show('bl'); UI.alert('你接手了 —— 從現在起由你指揮（右鍵據點＝攻擊移動，F2 全選部隊）', 'good'); UI.sigCard = ''; UI.infoSig = '';
  },
  say(tag, html, pri = 1, dur, fog) {
    const it = { tag, html, pri, dur: dur || clamp(3.6 + html.replace(/<[^>]+>/g, '').length * .075, 4.5, 9), fog };
    if (this.cast.length >= 4) { const lo = this.cast.reduce((a, b) => (b.pri < a.pri ? b : a)); if (lo.pri <= pri) this.cast.splice(this.cast.indexOf(lo), 1); else return; }
    this.cast.push(it); this.cast.sort((a, b) => b.pri - a.pri);
  },
  look(x, y, score, secs, zoom) { const w = G.w; this.interest.push({ x, y, score, until: w.t + secs, zoom }); if (this.interest.length > 12) this.interest.shift(); },
  event(t, d) {
    const g = G, w = g.w; if (!w) return;
    if (t === 'autoNote') { this.say(TAGS[d.key] || 'PM 決策', d.text, d.key === 'attack' || d.key === 'retreat' ? 2 : 1); if (d.x != null) this.look(d.x, d.y, d.key === 'attack' ? 18 : 12, 6); }
    else if (t === 'wave') { const vis = (d.ids || []).some(id => { const u = w.byId.get(id); return u && tileVis(w, u.x, u.y); }); this.say(vis ? '對手出兵' : '迷霧外', vis ? d.text : `<b>PM 現在看不到：</b>${d.text}。等它走進視野，才會變成警報。`, 2, null, !vis); this.look(d.x, d.y, 16, 8, .9); }
    else if (t === 'sighted') { this.say('現在才看見', `${d.text} —— PM 的畫面上，到這一刻才出現`, 2); this.look(d.x, d.y, 22, 6); }
    else if (t === 'nodeFlip') { const n = d.n; this.say(d.owner === 0 ? '佔領' : '失守', d.owner === 0 ? `拿下 <b>${n.name}</b>：每秒 +${n.yield} ●，市佔 ${marketShare(w)}%` : d.absorbed ? `<b>${n.name}</b> 沒人守，被對手直接吸收 —— 一仗都沒打` : `<b>${n.name}</b> 被對手拿走，市佔 ${marketShare(w)}%`, 3); this.look(n.x, n.y, 30, 6, 1); }
    else if (t === 'dpOpen') { this.say('決策點', `老闆下令：「${d.say}」<br><span class="dim">他的畫面只有現金、人數、市佔、燈號 —— 看不到頻寬、技術債、對手兵力。</span>`, 3, 8); this.role('orbit', 7); }
    else if (t === 'dpWarn') this.say('事前預警', `PM 在四格表標紅：<b>${d.flags}</b> → 老闆看到黃燈。失約時信任 −12 會變 −4。`, 3);
    else if (t === 'dpResolved') this.say('信任', `決策點結算：<b>${d.label}</b>（信任 ${d.delta > 0 ? '+' : ''}${d.delta} → ${Math.round(w.trust)}）`, 3);
    else if (t === 'techDone') { const lab = labOf(w); this.say('研發完成', `${d.name}${d.lvl > 1 ? ' ' + 'I'.repeat(d.lvl) : ''}：${(TECH.find(p => p.id === d.id) || {}).fx || ''}`, 1); if (lab) this.look(bcx(lab), bcy(lab), 10, 4); }
    else if (t === 'detected') this.say('Detector', '監控中心上線：原本看不到的技術債現形了。看不到的東西，沒辦法管', 2);
    else if (t === 'incident') this.say('技術債', '技術債爆發：需求池停擺 8 秒，信任 −15', 3);
    else if (t === 'underAttack' && d.turret) this.say('護城河', '追到對手基地附近，被它的本土市場火力壓著打 —— 別在巨頭的主場決戰', 1);
  },
  role(r, secs) { const g = G; if (!g.has('views') || g.role === r) return; g.setRole(r); this.roleBack = g.w.t + secs; },
  frame(dt) {
    const g = G, w = g.w; if (!w || !this.on) return;
    // 字幕
    const now = performance.now() / 1000, c = $('#cast');
    if (this.cur && now > this.curUntil) this.cur = null;
    if (!this.cur && this.cast.length) { this.cur = this.cast.shift(); this.curUntil = now + this.cur.dur; c.innerHTML = `<div class="tg${this.cur.fog ? ' fog' : ''}">${this.cur.tag}</div><div class="tx">${this.cur.html}</div><i style="animation-duration:${this.cur.dur}s"></i>`; c.className = 'on'; }
    else if (!this.cur && c.className !== 'hide') c.className = 'hide';
    // 對手退場（例如燒完錢）：剩下的時間快轉
    if (w.war && !this.ff && g.clock > 330 && !rivalArmy(w).length && w.persona.ai.income(w.t, w) <= 0) { this.ff = true; G.speed = 4; const b = $('#specbar [data-s=spd]'); if (b) b.textContent = '速度 ×4'; this.say('快轉', '對手的軍隊散光了、也沒有收入 —— 剩下的時間沒有人跟你搶。快轉到結算。', 3, 7); }
    // 人設線索
    const tl = TELLS[w.persona.id] || []; if (this.tellK < tl.length && g.clock >= tl[this.tellK].t) this.say('觀察', tl[this.tellK++].text, 2, 8);
    // 自動換位子：決策點時看老闆；平常偶爾看主管或工程師
    if (this.roleBack && w.t >= this.roleBack) { this.roleBack = 0; g.setRole('ground'); }
    if (!this.roleBack && g.clock >= this.nextRole && (!g.dp || g.dp.resolved)) {
      this.nextRole = g.clock + 80 + Math.random() * 30;
      if (Math.random() < .5) { this.role('bridge', 8); const v = project(w, 'bridge', g); this.say('換位子 · 主管', `主管此刻看到：我方戰力 ${v.ourPower} vs 對手 ${v.rivalPower}，「落後 ${v.behind}%」—— 看得到落後，看不到原因。`, 2, 8); }
      else { this.role('engineer', 8); this.say('換位子 · 工程師', '工程師此刻：只看得到身邊。他知道哪裡難改，卻不知道為什麼要做、老闆要什麼。', 2, 8); }
    }
    // 運鏡（工程師視角由 G.frame 跟人；使用者剛動過鏡頭就先不搶）
    if (!this.cam || g.role === 'engineer' || performance.now() - this.userAt < 7000) return;
    this.interest = this.interest.filter(i => i.until > w.t);
    let best = null, bs = 0;
    const hs = hotSpot(w); if (hs && hs.n >= 3 && tileVis(w, hs.x, hs.y)) { best = { x: hs.x, y: hs.y, zoom: 1.05 }; bs = 8 + hs.n; }
    for (const i of this.interest) if (i.score > bs) { bs = i.score; best = i; }
    if (this.shot && w.t < this.shotUntil && bs < this.shot.score + 12) best = this.shot.at;
    else if (best) { this.shot = { at: best, score: bs }; this.shotUntil = w.t + 5; }
    else if (!this.shot || w.t >= this.shotUntil) { const h = hubOf(w), n = w.nodes[Math.floor(Math.random() * w.nodes.length)], pick = Math.random() < .35 ? { x: bcx(h) + 2, y: bcy(h) - 1 } : n; best = { x: pick.x, y: pick.y, zoom: .8 }; this.shot = { at: best, score: 0 }; this.shotUntil = w.t + 7; }
    else best = this.shot.at;
    const z = R.playZoom() * (best.zoom || .9), p = iso(best.x, best.y); R.goal = { x: p.x, y: p.y + 10, z };
  },
  backdropCam(dt) { // 標題頁背景：慢慢跟著交火跑
    const w = G.w, hs = hotSpot(w), t = performance.now() / 1000;
    if (hs && hs.n >= 3) this.bd = { x: hs.x, y: hs.y }; else if (!this.bd || t - (this.bdAt || 0) > 9) { const n = w.nodes[Math.floor(Math.random() * w.nodes.length)]; this.bd = { x: n.x, y: n.y }; this.bdAt = t; }
    const p = iso(this.bd.x, this.bd.y), off = R.vw > 900 ? R.vw * .2 / R.cam.z : 0, k = 1 - Math.exp(-dt * .6);
    R.goal = null; R.cam.x += (p.x - off - R.cam.x) * k; R.cam.y += (p.y - 10 - R.cam.y) * k;
  },
};

/* 觀戰用的決策點：不開視窗；PM 自動駕駛在時間過了三成、而且看起來會失約時，送出標中的預警 */
function quietDP(g, o, k) {
  const w = g.w;
  g.dp = { idx: k, total: 5, key: o.key, milestone: o.milestone, short: o.say.length > 26 ? o.say.slice(0, 25) + '…' : o.say, deadline: w.t + o.secs, secs: o.secs, target: o.target, ore0: o.ore0, oreTarget: o.oreTarget,
    reported: false, flags: [], valid: [], extended: false, resolved: false, snap: snapshot(g), progress: o.progress, done: o.done, pmLines: o.pmLines, bossLines: o.bossLines, engLines: o.engLines, nextLabel: '繼續 ▶' };
  g.light = 'green'; g.emit('dpOpen', { say: o.say, idx: k });
}
function autoWarn(g) {
  const dp = g.dp, w = g.w; if (dp.reported || w.t < dp.deadline - dp.secs * .7) return;
  const est = estimate(g); if (!est.late) return;
  const truth = riskTruth(g), flags = Object.keys(truth).filter(k => truth[k] === true).slice(0, 2); if (!flags.length) flags.push('time');
  dp.reported = true; dp.flags = flags; dp.valid = flags.filter(k => truth[k] === true || k === 'time' && est.late);
  if (dp.valid.length) { g.tag.validWarn++; g.light = 'yellow'; }
  g.emit('dpWarn', { flags: flags.map(k => (RISKS.find(r => r[0] === k) || [k, k])[1]).join('、') });
}
function quietResolve(g) {
  const dp = g.dp, w = g.w; if (dp.resolved) return; dp.resolved = true; const ok = dp.done(w);
  const delta = ok ? 6 : dp.valid.length ? -4 : -12, label = ok ? '達成' : dp.valid.length ? '未達成，但事前預警了' : '未達成，而且沒有預警';
  w.trust = clamp(w.trust + delta, 0, 100); w.tag.microOn = true; g.tag.results.push({ idx: dp.idx, ok, delta, label, warned: dp.valid.length > 0 }); g.light = 'green';
  g.emit('dpResolved', { ok, delta, label, idx: dp.idx });
}
