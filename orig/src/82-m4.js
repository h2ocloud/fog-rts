/* ═════ 第 4 關：研發（升級）· 多人研發與人月神話 ═════
   研發不產出單位，只讓現有單位變強。多人研發有遞減（6 人 = ×3.64，不是 ×6），研究員不採礦（機會成本），
   效益隨團隊規模放大 —— 所以「小團隊不該急著上重流程」。 */
MISSIONS.push({
  id: 'm4', title: '研發 · 升級與人月神話', blurb: '研發不出新單位，只讓現有單位變強。派人研發有多快？加人有用嗎？研究員不採礦，產出怎麼辦？（含暫停式教學）', limit: 270,
  setup(g, opts) {
    const w = g.w; w.pads = [{ x: 5, y: 15, w: 8, h: 8, c: '#21364a', line: 'rgba(62,224,161,.22)' }, { x: 1, y: 11, w: 5, h: 13, c: '#15222d' }];
    const hub = layoutBase(w, 7, 17);
    scatterRocks(w, [[2, 9, 2], [1, 26], [4, 25], [12, 25, 2], [14, 15], [16, 21, 2], [21, 8], [23, 20, 2], [10, 9], [18, 4, 2], [24, 12], [15, 26], [13, 11]]);
    addBld(w, 'comms', 11, 17, true); w.ore = 450; spawnCrew(w, hub, 8); hub.rally = { patch: nearestPatch(w, hub.x, hub.y + 1).id };
    w.units.forEach(u => cmdMine(w, [u], w.patches[u.id % w.patches.length]));
    g.unlocked = new Set(['train', 'comms', 'lab', 'mine', 'idle']); w.t0 = 0; computeVision(w); warm(w, 40); w.t0 = w.t - 35; g.m4 = { base: w.rate };
    if (opts.skipTutorial) { const l = addBld(w, 'lab', 11, 14, true); l.done = -9; computeVision(w); }
  },
  reveal(g) { UI.show('sup'); UI.show('map'); UI.show('home'); },
  steps(g) {
    const w = g.w, SPOT = { x: 11, y: 14 }, isUnitSel = (k, d) => k === 'select' && d.ids.length === 1 && isEng(w, d.ids[0]);
    const anyEng = () => w.units.find(u => u.o.t === 'mine') || w.units[0]; let assigned = 0;
    return [
      { label: '研發', text: '第 4 關：<em>研發</em>', sub: '研發不出新單位，只讓現有單位變強。重點有兩個：<b>多人研發會遞減</b>，而且<b>研究員不採礦</b>。', ack: '開始', target: () => null },
      { label: '研發', text: '先<em>選一個工程師</em>', target: () => ({ ent: anyEng().id }), ok: isUnitSel, done: (t, d) => isUnitSel(t, d) },
      { label: '研發', text: '按 <em>研發中心</em>', sub: '●200，蓋好就能開始研發。', target: () => ({ ui: '[data-cmd=build-lab]' }), ok: (k, d) => k === 'menu' && d.type === 'lab', done: (t, d) => t === 'menu' && d.type === 'lab' },
      { label: '研發', text: '在亮起的位置<em>點一下</em>', target: () => ({ tile: { x: SPOT.x + 1, y: SPOT.y + 1, r: 1.5 }, mark: { x: SPOT.x + 1, y: SPOT.y + 1, r: 1.7, tiles: { x: SPOT.x, y: SPOT.y, w: 2, h: 2 } } }),
        ok: (k, d) => k === 'place' && Math.abs(d.x - SPOT.x) <= 1 && Math.abs(d.y - SPOT.y) <= 1, done: t => t === 'place', beat: { sec: 30, speed: 4, until: g => g.w.blds.some(b => b.type === 'lab' && b.built), cap: '蓋研發中心 …' } },
      { label: '研發', text: '研發中心蓋好了。按 <em>研發面板</em>', sub: '（已幫你選好它。選著工程師時點研發中心＝派他去研究。）', enter: g => { const l = labOf(g.w); g.sel = [l.id]; UI.sigCard = ''; UI.infoSig = ''; }, target: () => ({ ui: '[data-cmd=tech-panel]' }), ok: k => k === 'tech', done: t => t === 'techOpen' },
      { label: '研發', text: '開始研發 <em>流程改善</em>', sub: '效果：生產與建造時間 −12%。花 ●100，並需要「研發量 50 人·秒」。', target: () => ({ ui: '#tech [data-proj=proc] .go' }), ok: (k, d) => k === 'projstart' && d.id === 'proc', done: (t, d) => t === 'projstart' },
      { label: '研發', text: '專案開了，但<em>進度不會動</em>', sub: '沒有人在研究。研究員要從礦場調 —— 注意：調走一個，採礦就少一個。', ack: '派一個人去', target: () => ({ ui: '#tech .curr' }) },
      { label: '研發', text: '按 <em>+1 研究員</em>', target: () => ({ ui: '#tech [data-act="lab+1"]' }), ok: (k, d) => k === 'assign' && d.n > 0, done: (t, d) => { if (t === 'assign') { assigned++; return true; } return false; }, beat: { sec: 7, speed: 3, cap: '工程師走進研發中心、坐到桌位 —— 進度開始動，產出少了一個人' } },
      { label: '研發', text: '再按 <em>+1 研究員</em> 兩次', sub: '看看人多了會怎樣。', target: () => ({ ui: '#tech [data-act="lab+1"]' }), ok: (k, d) => k === 'assign' && d.n > 0, done: (t, d) => { if (t === 'assign') { assigned++; return assigned >= 3; } return false; }, beat: { sec: 8, speed: 3, cap: '3 人 = ×2.44，不是 ×3' } },
      { label: '研發', text: '看這排格子：<em>邊際貢獻遞減</em>', sub: '第 1 位貢獻 1.0、第 4 位只有 0.5、第 6 位只有 0.3。<b>6 個人不是 6 倍速</b>（×3.64），卻有 6 個人不採礦。這就是《人月神話》。', target: () => ({ ui: '#tech .crew' }), ack: '懂了' },
      { label: '研發', text: '把研究位塞滿：再按 <em>+1 研究員</em> 三次', sub: '試試看塞滿的效果。', target: () => ({ ui: '#tech [data-act="lab+1"]' }), ok: (k, d) => k === 'assign' && d.n > 0, done: (t, d) => { if (t === 'assign') { assigned++; return assigned >= 6; } return false; }, beat: { sec: 40, speed: 5, until: g => techLv(g.w, 'proc') >= 1, cap: '6 人研發中 … 完成後，生產與建造全部變快' } },
      { label: '研發', text: '✔ <em>流程改善 I</em> 完成', sub: '看右上角：產出掉了一大截 —— 6 位研究員不在採礦。<br><b>任務：4 分鐘內完成「流程改善 II」，而且結束時產出要回到起點的 90%。</b><br>提示：做完要把人<b>調回來</b>（−1 研究員）；人多不一定快。', target: () => ({ ui: '#pOre' }), ack: '開始任務 ▶', ackClass: 'teal' },
    ];
  },
  afterTutorial(g, skipped) {
    const w = g.w; g.clockOn = true; g.clock = 0; ['sup', 'map', 'home'].forEach(k => UI.show(k)); g.winHold = 0; g.techOpen = true; UI.techSig = '';
    R.focus(bcx(hubOf(w)) + 1, bcy(hubOf(w)), R.playZoom()); UI.feed('任務：完成「流程改善 II」，且產出回到起點的 90%', 'good');
  },
  hud(g) {
    const w = g.w, base = g.m4.base, p2 = techLv(w, 'proc'), cur = w.tech.cur;
    return { title: 'MISSION 04 · 研發', goal: g.clockOn ? `完成「流程改善 II」　產出 ≥ <b>${(base * .9).toFixed(1)}</b> ●/s` : '教學：派人研發', sub: g.clockOn ? `流程改善 <b>${'I'.repeat(Math.max(0, Math.min(p2, 3))) || '—'}</b>　·　產出 <b class="${w.rate < base * .9 ? 'bad' : ''}">${w.rate.toFixed(1)}</b> ●/s${cur ? `　·　研發 ${Math.round(cur.prog / cur.W * 100)}%` : ''}` : '' };
  },
  update(g, dt) {
    if (!g.clockOn) return; const w = g.w;
    if (techLv(w, 'proc') >= 2 && w.rate >= g.m4.base * .9) { g.winHold += dt; if (g.winHold >= 5) g.finish(true, {}); } else g.winHold = 0;
    if (g.clock >= 270) g.finish(false, {});
  },
  debrief(g, win) {
    const w = g.w, lv = techLv(w, 'proc'), ms = Math.round(w.tech.manSec || 0), ideal = [50, 90, 150].slice(0, lv).reduce((a, b) => a + b, 0);
    return {
      title: win ? '研發做完了，而且人調回來了' : lv >= 2 ? '研發做完了，但產出沒回來' : '時間到：研發還沒做完',
      stats: [{ label: '流程改善', val: lv ? 'I'.repeat(lv) : '—', ok: lv >= 2 }, { label: '產出', val: w.rate.toFixed(1) + ' ●/s', ok: w.rate >= g.m4.base * .9 }, { label: '研發花掉人·秒', val: ms, ok: undefined }, { label: '最省（1 人單打）', val: ideal }, { label: '用時', val: fmtTime(g.clock) }],
      lesson: `<b>人月神話：</b>研發量一樣，派 6 個人只快 3.6 倍，卻多花 ${ideal ? Math.round((ms / Math.max(1, ideal) - 1) * 100) : 0}% 的人·秒（你這局 ${ms} vs 最省 ${ideal}）。加人能「更早做完」，但永遠不會「更省」。<br><br><b>機會成本：</b>研究員不採礦，研發期間產出一定掉；做完忘了調回，就是永久少人。<br><b>效益隨規模放大：</b>同一個「+10% 採集」，8 人團隊 +0.6 ●/s、14 人 +1.0 ●/s —— 小團隊不該急著上重流程。<br><b>三層視野：</b>老闆看得到人數沒變、現金變少、產出變慢，看不到誰在研發 —— 研發期間要事前預警。`,
    };
  },
});
