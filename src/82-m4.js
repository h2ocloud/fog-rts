/* ═════ 第 4 關：研發（升級）· 多人研發與人月神話 ═════
   研發不產出單位，只讓現有單位變強。多人研發有遞減（6 人 = ×3.64，不是 ×6），研究員不採礦（機會成本），
   效益隨團隊規模放大 —— 所以「小團隊不該急著上重流程」。 */
MISSIONS.push({
  id: 'm4', title: L('研發 · 升級與人月神話', 'R&D · Upgrades and The Mythical Man-Month'), blurb: L('研發不出新單位，只讓現有單位變強。派人研發有多快？加人有用嗎？研究員不採礦，產出怎麼辦？（含暫停式教學）', "R&D doesn't make new units — it makes the ones you have stronger. How fast is research? Does adding people help? Researchers don't mine, so what happens to output? (Includes a paused tutorial)"), limit: 270,
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
      { label: L('研發', 'R&D'), text: L('第 4 關：<em>研發</em>', 'Mission 4: <em>R&D</em>'), sub: L('研發不出新單位，只讓現有單位變強。重點有兩個：<b>多人研發會遞減</b>，而且<b>研究員不採礦</b>。', "R&D doesn't produce new units — it makes existing ones stronger. Two key points: <b>more researchers means diminishing returns</b>, and <b>researchers don't mine</b>."), ack: L('開始', "Let's go"), target: () => null },
      { label: L('研發', 'R&D'), text: L('先<em>選一個工程師</em>', 'First, <em>select an Engineer</em>.'), target: () => ({ ent: anyEng().id }), ok: isUnitSel, done: (t, d) => isUnitSel(t, d) },
      { label: L('研發', 'R&D'), text: L('按 <em>研發中心</em>', 'Press <em>R&D Lab</em>.'), sub: L('●200，蓋好就能開始研發。', "●200. Once it's built, you can start research."), target: () => ({ ui: '[data-cmd=build-lab]' }), ok: (k, d) => k === 'menu' && d.type === 'lab', done: (t, d) => t === 'menu' && d.type === 'lab' },
      { label: L('研發', 'R&D'), text: L('在亮起的位置<em>點一下</em>', '<em>Click</em> the highlighted spot.'), target: () => ({ tile: { x: SPOT.x + 1, y: SPOT.y + 1, r: 1.5 }, mark: { x: SPOT.x + 1, y: SPOT.y + 1, r: 1.7, tiles: { x: SPOT.x, y: SPOT.y, w: 2, h: 2 } } }),
        ok: (k, d) => k === 'place' && Math.abs(d.x - SPOT.x) <= 1 && Math.abs(d.y - SPOT.y) <= 1, done: t => t === 'place', beat: { sec: 30, speed: 4, until: g => g.w.blds.some(b => b.type === 'lab' && b.built), cap: L('蓋研發中心 …', 'Building the R&D Lab …') } },
      { label: L('研發', 'R&D'), text: L('研發中心蓋好了。按 <em>研發面板</em>', 'The R&D Lab is ready. Press <em>R&D Panel</em>.'), sub: L('（已幫你選好它。選著工程師時點研發中心＝派他去研究。）', "(We've selected it for you. With an Engineer selected, clicking the R&D Lab sends him to research.)"), enter: g => { const l = labOf(g.w); g.sel = [l.id]; UI.sigCard = ''; UI.infoSig = ''; }, target: () => ({ ui: '[data-cmd=tech-panel]' }), ok: k => k === 'tech', done: t => t === 'techOpen' },
      { label: L('研發', 'R&D'), text: L('開始研發 <em>流程改善</em>', 'Start researching <em>Process Improvement</em>.'), sub: L('效果：生產與建造時間 −12%。花 ●100，並需要「研發量 50 人·秒」。', 'Effect: training & build time −12%. Costs ●100 and takes 50 person-seconds of research work.'), target: () => ({ ui: '#tech [data-proj=proc] .go' }), ok: (k, d) => k === 'projstart' && d.id === 'proc', done: (t, d) => t === 'projstart' },
      { label: L('研發', 'R&D'), text: L('專案開了，但<em>進度不會動</em>', "The project's started, but <em>progress isn't moving</em>."), sub: L('沒有人在研究。研究員要從礦場調 —— 注意：調走一個，採礦就少一個。', "Nobody's researching. Researchers come from the ore fields — and every one you pull is one fewer miner."), ack: L('派一個人去', 'Send someone'), target: () => ({ ui: '#tech .curr' }) },
      { label: L('研發', 'R&D'), text: L('按 <em>+1 研究員</em>', 'Press <em>+1 Researcher</em>.'), target: () => ({ ui: '#tech [data-act="lab+1"]' }), ok: (k, d) => k === 'assign' && d.n > 0, done: (t, d) => { if (t === 'assign') { assigned++; return true; } return false; }, beat: { sec: 7, speed: 3, cap: L('工程師走進研發中心、坐到桌位 —— 進度開始動，產出少了一個人', 'The engineer walks into the R&D Lab and takes a desk — progress starts moving, and you lose one miner') } },
      { label: L('研發', 'R&D'), text: L('再按 <em>+1 研究員</em> 兩次', 'Press <em>+1 Researcher</em> twice more.'), sub: L('看看人多了會怎樣。', 'See what happens with more people.'), target: () => ({ ui: '#tech [data-act="lab+1"]' }), ok: (k, d) => k === 'assign' && d.n > 0, done: (t, d) => { if (t === 'assign') { assigned++; return assigned >= 3; } return false; }, beat: { sec: 8, speed: 3, cap: L('3 人 = ×2.44，不是 ×3', '3 people = ×2.44, not ×3') } },
      { label: L('研發', 'R&D'), text: L('看這排格子：<em>邊際貢獻遞減</em>', 'Look at this row of slots: <em>diminishing returns</em>.'), sub: L('第 1 位貢獻 1.0、第 4 位只有 0.5、第 6 位只有 0.3。<b>6 個人不是 6 倍速</b>（×3.64），卻有 6 個人不採礦。這就是《人月神話》。', "The 1st researcher adds 1.0, the 4th only 0.5, the 6th just 0.3. <b>6 people ≠ 6× speed</b> (it's ×3.64), yet all 6 have stopped mining. That's The Mythical Man-Month."), target: () => ({ ui: '#tech .crew' }), ack: L('懂了', 'Got it') },
      { label: L('研發', 'R&D'), text: L('把研究位塞滿：再按 <em>+1 研究員</em> 三次', 'Fill every slot: press <em>+1 Researcher</em> three more times.'), sub: L('試試看塞滿的效果。', 'See what a full lab does.'), target: () => ({ ui: '#tech [data-act="lab+1"]' }), ok: (k, d) => k === 'assign' && d.n > 0, done: (t, d) => { if (t === 'assign') { assigned++; return assigned >= 6; } return false; }, beat: { sec: 40, speed: 5, until: g => techLv(g.w, 'proc') >= 1, cap: L('6 人研發中 … 完成後，生產與建造全部變快', '6 researching … once done, all training and building gets faster') } },
      { label: L('研發', 'R&D'), text: L('✔ <em>流程改善 I</em> 完成', '✔ <em>Process Improvement I</em> complete'), sub: L('看右上角：產出掉了一大截 —— 6 位研究員不在採礦。<br><b>任務：4 分鐘內完成「流程改善 II」，而且結束時產出要回到起點的 90%。</b><br>提示：做完要把人<b>調回來</b>（−1 研究員）；人多不一定快。', `Check the top right: output took a big hit — 6 researchers aren't mining.<br><b>Mission: finish "Process Improvement II" within 4 minutes, and end with output back to 90% of where it started.</b><br>Tip: when research is done, <b>pull people back</b> (−1 Researcher). More people isn't always faster.`), target: () => ({ ui: '#pOre' }), ack: L('開始任務 ▶', 'Start Mission ▶'), ackClass: 'teal' },
    ];
  },
  afterTutorial(g, skipped) {
    const w = g.w; g.clockOn = true; g.clock = 0; ['sup', 'map', 'home'].forEach(k => UI.show(k)); g.winHold = 0; g.techOpen = true; UI.techSig = '';
    R.focus(bcx(hubOf(w)) + 1, bcy(hubOf(w)), R.playZoom()); UI.feed(L('任務：完成「流程改善 II」，且產出回到起點的 90%', 'Mission: finish "Process Improvement II" and get output back to 90% of where it started'), 'good');
  },
  hud(g) {
    const w = g.w, base = g.m4.base, p2 = techLv(w, 'proc'), cur = w.tech.cur;
    return { title: L('MISSION 04 · 研發', 'MISSION 04 · R&D'), goal: g.clockOn ? L(`完成「流程改善 II」　產出 ≥ <b>${(base * .9).toFixed(1)}</b> ●/s`, `Finish "Process Improvement II" · Output ≥ <b>${(base * .9).toFixed(1)}</b> ●/s`) : L('教學：派人研發', 'Tutorial: assign researchers'), sub: g.clockOn ? L(`流程改善 <b>${'I'.repeat(Math.max(0, Math.min(p2, 3))) || '—'}</b>　·　產出 <b class="${w.rate < base * .9 ? 'bad' : ''}">${w.rate.toFixed(1)}</b> ●/s${cur ? `　·　研發 ${Math.round(cur.prog / cur.W * 100)}%` : ''}`, `Process Improvement <b>${'I'.repeat(Math.max(0, Math.min(p2, 3))) || '—'}</b> · Output <b class="${w.rate < base * .9 ? 'bad' : ''}">${w.rate.toFixed(1)}</b> ●/s${cur ? ` · R&D ${Math.round(cur.prog / cur.W * 100)}%` : ''}`) : '' };
  },
  update(g, dt) {
    if (!g.clockOn) return; const w = g.w;
    if (techLv(w, 'proc') >= 2 && w.rate >= g.m4.base * .9) { g.winHold += dt; if (g.winHold >= 5) g.finish(true, {}); } else g.winHold = 0;
    if (g.clock >= 270) g.finish(false, {});
  },
  debrief(g, win) {
    const w = g.w, lv = techLv(w, 'proc'), ms = Math.round(w.tech.manSec || 0), ideal = [50, 90, 150].slice(0, lv).reduce((a, b) => a + b, 0);
    return {
      title: win ? L('研發做完了，而且人調回來了', 'Research done — and people back on the job') : lv >= 2 ? L('研發做完了，但產出沒回來', "Research done, but output didn't recover") : L('時間到：研發還沒做完', "Time's up: research isn't finished"),
      stats: [{ label: L('流程改善', 'Process Improvement'), val: lv ? 'I'.repeat(lv) : '—', ok: lv >= 2 }, { label: L('產出', 'Output'), val: w.rate.toFixed(1) + ' ●/s', ok: w.rate >= g.m4.base * .9 }, { label: L('研發花掉人·秒', 'Person-seconds spent on R&D'), val: ms, ok: undefined }, { label: L('最省（1 人單打）', 'Minimum (1 person solo)'), val: ideal }, { label: L('用時', 'Time'), val: fmtTime(g.clock) }],
      lesson: L(`<b>人月神話：</b>研發量一樣，派 6 個人只快 3.6 倍，卻多花 ${ideal ? Math.round((ms / Math.max(1, ideal) - 1) * 100) : 0}% 的人·秒（你這局 ${ms} vs 最省 ${ideal}）。加人能「更早做完」，但永遠不會「更省」。<br><br><b>機會成本：</b>研究員不採礦，研發期間產出一定掉；做完忘了調回，就是永久少人。<br><b>效益隨規模放大：</b>同一個「+10% 採集」，8 人團隊 +0.6 ●/s、14 人 +1.0 ●/s —— 小團隊不該急著上重流程。<br><b>三層視野：</b>老闆看得到人數沒變、現金變少、產出變慢，看不到誰在研發 —— 研發期間要事前預警。`, `<b>The Mythical Man-Month:</b> for the same research work, 6 people are only 3.6× faster, yet burn ${ideal ? Math.round((ms / Math.max(1, ideal) - 1) * 100) : 0}% more person-seconds (this run: ${ms} vs. a minimum of ${ideal}). Adding people gets it done "sooner," but never "cheaper."<br><br><b>Opportunity cost:</b> researchers don't mine, so output always drops during R&D; forget to pull them back afterward and you're permanently short-staffed.<br><b>The payoff scales with team size:</b> the same "+10% mining" is +0.6 ●/s for an 8-person team but +1.0 ●/s for 14 — small teams shouldn't rush into heavyweight process.<br><b>Three views:</b> the Boss can see headcount unchanged, cash down and output slower — but not who's doing R&D. Flag it early while research is underway.`),
    };
  },
});
