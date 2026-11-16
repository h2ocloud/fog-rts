/* ── 關卡腳本：setup（世界）＋ steps（暫停式教學）＋ update（勝敗）＋ debrief ───────────── */
function layoutBase(w, hx, hy, { arc = [135, 255], n = 6, r = 4.6 } = {}) {
  const hub = addBld(w, 'hub', hx, hy), cx = bcx(hub), cy = bcy(hub);
  for (let k = 0; k < n; k++) {
    const a = (arc[0] + (arc[1] - arc[0]) * k / (n - 1)) * Math.PI / 180;
    let x = Math.round(cx + Math.cos(a) * r - .5), y = Math.round(cy + Math.sin(a) * r - .5);
    if (!tileFree(w, x, y)) continue; addPatch(w, x, y);
  }
  rebuildBlocked(w); return hub;
}
function scatterRocks(w, list) { for (const [x, y, ww, hh] of list) if (tileFree(w, x, y)) addProp(w, x, y, ww || 1, hh || ww || 1); rebuildBlocked(w); }
function spawnCrew(w, hub, n, mode) {
  const pos = [[6.6, 21.3], [7.9, 21.7], [9.2, 21.5], [10.4, 21.0], [5.9, 20.2], [11.2, 20.0], [6.4, 22.6], [8.4, 22.8], [10.2, 22.4], [11.6, 21.6]];
  const out = []; for (let i = 0; i < n; i++) { const p = pos[i % pos.length]; const dx = hub.x - 7, dy = hub.y - 17; out.push(addUnit(w, p[0] + dx, p[1] + dy)); }
  return out;
}
const nearestPatchTo = (w, x, y) => nearestPatch(w, x, y);
const isEng = (w, id) => { const e = w.byId.get(id); return e && e.kind === 'unit'; };

const MISSIONS = [];

/* ═════ 第 1 關：供給線 ═════ */
MISSIONS.push({
  id: 'm1', limit: 240, title: L('供給線 · Supply Block', 'Supply Lines · Supply Block'), blurb: L('錢很多，卻生不出人。先學選取、採礦、生產，再學怎麼解卡。（含 90 秒暫停式教學）', "Plenty of money, but you can't add people. Learn to select, mine and train — then how to get unblocked. (Includes a 90-second paused tutorial)"),
  setup(g, opts) {
    const w = g.w; w.pads = [{ x: 5, y: 15, w: 8, h: 8, c: '#21364a', line: 'rgba(62,224,161,.22)' }, { x: 1, y: 11, w: 5, h: 13, c: '#15222d' }];
    const hub = layoutBase(w, 7, 17);
    scatterRocks(w, [[2, 9, 2], [1, 26], [4, 25], [12, 25, 2], [14, 15], [16, 21, 2], [21, 8], [23, 20, 2], [10, 9], [18, 4, 2], [24, 12], [15, 26]]);
    w.ore = 250; const crew = spawnCrew(w, hub, 6);
    hub.rally = { patch: nearestPatch(w, hub.x, hub.y + 1).id };
    g.unlocked = new Set(['train', 'comms']); w.t0 = 0;
    if (opts.skipTutorial || opts.demo) {
      const c = addBld(w, 'comms', 14, 17, true); c.done = -9; spawnCrew(w, hub, 2);
      const p = nearestPatch(w, hub.x, hub.y + 1); w.units.forEach(u => cmdMine(w, [u], w.patches[(u.id) % w.patches.length]));
      w.ore = 260; w.tag.skipped = true;
    }
    computeVision(w);
  },
  reveal(g) { UI.hide('sup'); UI.hide('map'); },
  steps(g) {
    const w = g.w, hub = hubOf(w), patch = nearestPatch(w, hub.x, hub.y + 1), SPOT = { x: 14, y: 17 };
    const front = w.units.slice().sort((a, b) => (b.x + b.y) - (a.x + a.y))[1]; // 畫面上最前面的工程師之一
    const isUnitSel = (k, d) => k === 'select' && d.ids.length === 1 && isEng(w, d.ids[0]);
    const mineOK = (k, d) => k === 'order' && d.kind === 'mine', mineDone = (t, d) => t === 'order' && d.kind === 'mine';
    const trainOK = k => k === 'train', trainDone = t => t === 'train';
    return [
      { text: L('你是 PM，這些是你的工程師。第一個動作：<em>點一下</em>亮起的人', "You're the PM, and these are your engineers. First move: <em>click</em> the highlighted one."), sub: L('左鍵 ＝ 選取。放心，現在時間是暫停的。', "Left-click = select. Relax — time is paused."),
        target: () => ({ ent: front.id }), ok: isUnitSel, done: (t, d) => isUnitSel(t, d) },
      { text: L('他在發呆，閒著就是浪費。<em>點一下藍色礦點</em>，叫他去採預算', "He's idle, and idle is waste. <em>Click the blue ore field</em> to send him mining for Budget."), sub: L('電腦也可以右鍵。預算 ● 是你最重要的錢。', 'Right-click works too. Budget ● is your most important resource.'),
        target: () => ({ ent: patch.id }), ok: mineOK, done: mineDone, beat: { sec: 7.5, speed: 2, cap: L('看：走到礦 → 採集 → 扛回基地，預算 <b>●＋4</b>', 'Watch: walk to the ore → mine → carry it back to base, Budget <b>●+4</b>') } },
      { text: L('還有 5 個人在發呆。按 <em>閒置工程師</em>，一次全選', '5 more are idle. Press <em>Idle Engineers</em> to select them all at once.'), sub: L('鍵盤 F1 也行。RTS 的核心：一次選一群，一次下命令。', 'Or press F1. The heart of any RTS: select a group, give one order.'),
        enter: g => { g.unlocked.add('idle'); }, target: () => ({ ui: '#idle' }), ok: (k, d) => k === 'select' && d.ids.length >= 3, done: (t, d) => t === 'select' && d.ids.length >= 3 },
      { text: L('一樣，<em>點礦點</em> — 大家一起去採', 'Same as before: <em>click the ore field</em> — everyone goes mining.'), target: () => ({ ent: patch.id }), ok: mineOK, done: mineDone, beat: { sec: 6, speed: 3, cap: L('大家輪流採礦，預算開始穩定進帳', 'Everyone takes turns mining — Budget starts flowing in steadily') } },
      { text: L('很好。接著<em>點你的基地</em>（需求池）', 'Nice. Now <em>click your base</em> (the Backlog Hub).'), sub: L('蓋東西、生產人，都從「先選它」開始。', 'Building and training both start with selecting it first.'),
        target: () => ({ ent: hub.id }), ok: (k, d) => k === 'select' && d.ids.length === 1 && d.ids[0] === hub.id, done: (t, d) => t === 'select' && d.ids.length === 1 && d.ids[0] === hub.id },
      { text: L('按 <em>訓練工程師</em>（或鍵盤 Q）', 'Press <em>Train Engineer</em> (or Q).'), sub: L('●50。新人出爐會自己去採礦。', '●50. New hires head to the ore field on their own.'),
        target: () => ({ ui: '[data-cmd=train]' }), ok: trainOK, done: trainDone, beat: { sec: 14, speed: 3, until: g => g.w.engMade >= 1, cap: L('訓練中 … 新人出爐，自動去採礦', 'Training … the new hire is out and starts mining automatically') } },
      { text: L('看右上角 <em>▤ 管理頻寬</em>。再訓練 1 個，把它塞滿', 'See <em>▤ Bandwidth</em> at the top right? Train 1 more to fill it up.'), sub: L('每個工程師吃 1 ▤。你的上限現在只有 8。', 'Each engineer takes 1 ▤ of management bandwidth. Your cap is only 8 right now.'),
        enter: g => { UI.show('sup'); $('#pSup').classList.add('flash'); setTimeout(() => $('#pSup').classList.remove('flash'), 2400); },
        target: () => ({ ui: '[data-cmd=train]' }), ok: trainOK, done: trainDone, beat: { sec: 14, speed: 3, until: g => g.w.engMade >= 2, cap: L('<b>▤ 8/8</b> — 上限到了', '<b>▤ 8/8</b> — cap reached') } },
      { text: L('現在錢還很多。<em>再按一次訓練</em>看看會怎樣', 'You still have plenty of money. <em>Press Train again</em> and see what happens.'), target: () => ({ ui: '[data-cmd=train]' }), ok: trainOK, done: (t, d) => t === 'trainFail' && d.why === 'supply' },
      { text: L('紅燈了，這叫 <em>Supply Block</em>', "Red light. This is called a <em>Supply Block</em>."), sub: L('錢滿手，卻生不出人。翻成人話：<b>headcount 批下來了，但沒人帶得動</b>。星海高手最常死在這，PM 也是。', "Money in hand, but no new people. In plain terms: <b>the headcount got approved, but nobody has the bandwidth to lead them</b>. It's how StarCraft pros most often die — PMs too."),
        enter: g => { g.forceBlockFlag = true; }, ack: L('那怎麼辦？', 'So what now?'), target: () => ({ ui: '#pSup' }) },
      { text: L('解法：擴大管理容量。先<em>選一個工程師</em>', 'The fix: expand management capacity. First, <em>select an Engineer</em>.'), sub: L('管理容量不是花錢就有，要「蓋」出來。', "Management capacity isn't something you just buy — you have to build it."),
        enter: g => { g.forceBlockFlag = false; }, target: () => ({ ent: (w.units.find(u => u.o.t === 'idle') || front).id }), ok: isUnitSel, done: (t, d) => isUnitSel(t, d) },
      { text: L('按 <em>協作制度</em>（Q）', 'Press <em>Comms Layer</em> (Q).'), sub: L('●100，蓋好後管理頻寬 ▤ ＋8。', '●100. Once built: Bandwidth ▤ +8.'),
        target: () => ({ ui: '[data-cmd=build-comms]' }), ok: (k, d) => k === 'menu' && d.type === 'comms', done: (t, d) => t === 'menu' && d.type === 'comms' },
      { text: L('在亮起的位置<em>點一下</em>，放下工地', '<em>Click</em> the highlighted spot to place the build site.'), sub: L('綠色＝可以蓋；紅色＝不行。亮起的位置在<b>視野邊緣</b> — 蓋好後，迷霧會往外退開。', "Green = can build; red = can't. The spot is at the <b>edge of your vision</b> — once it's built, the fog pulls back."),
        target: () => ({ tile: { x: SPOT.x + 1, y: SPOT.y + 1, r: 1.5 }, mark: { x: SPOT.x + 1, y: SPOT.y + 1, r: 1.7, tiles: { x: SPOT.x, y: SPOT.y, w: 2, h: 2 } } }),
        ok: (k, d) => k === 'place' && Math.abs(d.x - SPOT.x) <= 1 && Math.abs(d.y - SPOT.y) <= 1, done: t => t === 'place',
        beat: { sec: 26, speed: 4, until: g => g.w.blds.some(b => b.type === 'comms' && b.built), cap: L('工人走過去、地基升起、一層一層蓋起來 …', 'The engineer walks over, the foundation rises, and it goes up floor by floor …') } },
      { text: L('✔ 頻寬 <em>8 → 16</em>，生產恢復了', '✔ Bandwidth <em>8 → 16</em> — training is back on'), sub: L('教學結束。<b>任務：4 分鐘內把團隊擴到 20 人，Supply Block 累計不超過 20 秒。</b><br>提醒：不要等滿了才蓋 — 在快滿之前就動工。', "Tutorial complete. <b>Mission: grow the team to 20 within 4 minutes, with no more than 20s of Supply Block in total.</b><br>Tip: don't wait until you're capped — start building before you hit the limit."),
        target: () => ({ ui: '#pSup' }), ack: L('開始任務 ▶', 'Start Mission ▶'), ackClass: 'teal' },
    ];
  },
  afterTutorial(g, skipped) {
    const w = g.w; ['train', 'comms', 'mine', 'idle'].forEach(k => g.unlocked.add(k)); UI.show('sup'); UI.show('map'); UI.show('home');
    w.trackBlock = true; w.blockT = 0; g.clockOn = true; g.clock = 0; g.forceBlockFlag = false; w.t0 = w.t - 5;
    R.focus(bcx(hubOf(w)), bcy(hubOf(w)) + 1, R.playZoom());
    UI.feed(L('任務開始：擴到 20 人。小技巧：拖曳框選一群、F1 選閒置工人', 'Mission start: grow to 20. Tip: drag to box-select a group; F1 selects idle engineers'), 'good');
  },
  hud(g) {
    const w = g.w, n = engs(w).length, active = g.clockOn;
    return { title: L('MISSION 01 · 供給線', 'MISSION 01 · Supply Lines'), goal: active ? L(`團隊擴到 <b>20</b> 人 <span style="color:var(--dim);font-weight:400">（現在 ${n}）</span>`, `Grow the team to <b>20</b> <span style="color:var(--dim);font-weight:400">(now ${n})</span>`) : L('教學：學會第一個動作', 'Tutorial: learn your first moves'),
      sub: active ? L(`Supply Block 累計 <b class="${w.blockT > 20 ? 'bad' : ''}">${Math.round(w.blockT)}s</b> / 20s　·　剩 ${fmtTime(240 - g.clock)}`, `Supply Block total <b class="${w.blockT > 20 ? 'bad' : ''}">${Math.round(w.blockT)}s</b> / 20s · ${fmtTime(240 - g.clock)} left`) : '' };
  },
  update(g, dt) {
    if (!g.clockOn) return; const w = g.w, n = engs(w).length;
    if (n >= 20) g.finish(true, { n });
    else if (g.clock >= 240) g.finish(false, { n });
  },
  debrief(g, win, d) {
    const w = g.w, n = engs(w).length, bt = Math.round(w.blockT), comms = w.blds.filter(b => b.type === 'comms').length;
    const perfect = win && bt <= 8;
    return {
      title: win ? (perfect ? L('幾乎零卡頓 — 你會提前蓋容量', 'Almost no blocking — you build capacity ahead of time') : L('達標，但你卡了 ' + bt + ' 秒', `Goal met, but you were blocked for ${bt}s`)) : L('時間到：團隊只有 ' + n + ' 人', `Time's up: the team only reached ${n}`),
      stats: [{ label: L('工程師', 'Engineers'), val: n + ' / 20', ok: n >= 20 }, { label: L('Supply Block 累計', 'Supply Block total'), val: bt + 's', ok: bt <= 20 }, { label: L('協作制度', 'Comms Layers'), val: L(comms + ' 座', String(comms)) }, { label: L('用時', 'Time'), val: fmtTime(g.clock) }],
      lesson: L(`<b>Supply Block：</b>錢很多、人卻生不出來 = 「headcount 批了，但沒人帶得動」。管理容量（▤）不是有錢就有，要<b>提前蓋</b> — 在滿之前 2 格就動工。<br><br><b>現實對應：</b>人數翻倍、產出不變，因為新人沒人帶、沒有 onboarding、沒有 code owner。`, `<b>Supply Block:</b> plenty of money, but no new people = "the headcount got approved, but nobody can lead them." Management capacity (▤) doesn't come with money — you have to <b>build it ahead of time</b>: start when you're 2 short of the cap.<br><br><b>In real life:</b> headcount doubles and output stays flat, because new hires have no one to lead them, no onboarding, and no code owner.`),
    };
  },
});


/* ═════ 第 2 關：看不見的技術債 ═════ */
MISSIONS.push({
  id: 'm2', title: L('看不見的東西 · Tech Debt', "What You Can't See · Tech Debt"), blurb: L('趕工看起來免費。人越加越多，產出卻一路掉，畫面上沒有任何異常 —— 直到你蓋了 Detector。', 'Rushing looks free. You keep adding people, output keeps falling, and nothing on screen looks wrong — until you build a Detector.'), limit: 200,
  setup(g, opts) {
    const w = g.w; w.pads = [{ x: 5, y: 15, w: 8, h: 8, c: '#21364a', line: 'rgba(62,224,161,.22)' }, { x: 1, y: 11, w: 5, h: 13, c: '#15222d' }];
    const hub = layoutBase(w, 7, 17);
    scatterRocks(w, [[2, 9, 2], [1, 26], [4, 25], [12, 25, 2], [14, 15], [16, 21, 2], [21, 8], [23, 20, 2], [10, 9], [18, 4, 2], [24, 12], [15, 26], [13, 11]]);
    addBld(w, 'comms', 11, 17, true);
    w.ore = 380; spawnCrew(w, hub, 8); hub.rally = { patch: nearestPatch(w, hub.x, hub.y + 1).id };
    w.units.forEach(u => cmdMine(w, [u], w.patches[u.id % w.patches.length]));
    g.unlocked = new Set(['train', 'comms', 'obs', 'pace', 'mine', 'idle', 'repay']); w.t0 = 0;
    computeVision(w); warm(w, 45); w.t0 = w.t - 40;
    if (opts.skipTutorial) {
      const o = addBld(w, 'obs', 11, 14, true); o.done = -9; spawnCrew(w, hub, 3).forEach(u => cmdMine(w, [u], w.patches[u.id % w.patches.length]));
      addDebt(w, 15); w.ore = 300; warm(w, 3);
    }
  },
  reveal(g, opts) { UI.show('sup'); UI.show('map'); UI.show('home'); if (opts.skipTutorial) UI.show('debt'); },
  steps(g) {
    const w = g.w, hub = hubOf(w), SPOT = { x: 11, y: 14 };
    const isUnitSel = (k, d) => k === 'select' && d.ids.length >= 1 && d.ids.every(id => isEng(w, id));
    let trains = 0; const anyEng = () => w.units.find(u => u.o.t === 'mine') || w.units[0];
    return [
      { text: L('先看右上角 <em>產出 ●/s</em>，記住這個數字', 'First, check <em>Output ●/s</em> at the top right. Remember that number.'), sub: g => L(`八個人在採礦，現在約 <b>+${g.w.rate.toFixed(1)} ●/s</b>。`, `Eight engineers are mining — about <b>+${g.w.rate.toFixed(1)} ●/s</b> right now.`), target: () => ({ ui: '#pOre' }), ack: L('記住了', 'Got it') },
      { text: L('點你的基地（需求池）', 'Click your base (the Backlog Hub).'), sub: L('第 2 關，換一種操作：<b>生產的節奏</b>。', 'Mission 2 adds a new control: <b>production pace</b>.'), target: () => ({ ent: hub.id }), ok: (k, d) => k === 'select' && d.ids.length === 1 && d.ids[0] === hub.id, done: (t, d) => t === 'select' && d.ids.length === 1 && d.ids[0] === hub.id },
      { text: L('趕工看起來免費：時間 ×0.55。<em>切到「硬趕」</em>', 'Rushing looks free: time ×0.55. <em>Switch to "Crunch"</em>.'), sub: L('省 45% 的時間。代價不會馬上出現。', "Saves 45% of the time. The cost doesn't show up right away."), target: () => ({ ui: '[data-cmd=pace-rush]' }), ok: (k, d) => k === 'pace' && d.key === 'rush', done: (t, d) => t === 'pace' && d.key === 'rush' },
      { text: L('<em>連按 3 次訓練</em>（Q Q Q）', '<em>Press Train 3 times</em> (Q Q Q).'), sub: L('團隊要快點長大！', 'The team needs to grow — fast!'), target: () => ({ ui: '[data-cmd=train]' }), ok: k => k === 'train', done: t => t === 'train' && ++trains >= 3,
        beat: { sec: 26, speed: 4, until: g => g.w.engMade >= 3 && !g.w.units.some(u => u.spawnT < 1) && g.w.t - g.tag_lastSpawn > 9, cap: L('硬趕：每 4 秒出一個人。看右上角的產出 …', 'Crunch: a new hire every 4s. Watch Output at the top right …') } },
      { text: L('人變多了，產出卻 <em>往下掉</em>？', 'More people, yet output is <em>dropping</em>?'), sub: L('你看得到後果（▼），但畫面上沒有任何異常。原因在哪？', "You can see the effect (▼), but nothing on screen looks wrong. So what's the cause?"), target: () => ({ ui: '#pOre' }), ack: L('找找看…', "Let's find out…") },
      { text: L('先<em>選一個工程師</em>', 'First, <em>select an Engineer</em>.'), sub: L('想找出原因，你需要一個能「看見」的東西。', 'To find the cause, you need something that can "see" it.'), target: () => ({ ent: anyEng().id }), ok: isUnitSel, done: (t, d) => isUnitSel(t, d) },
      { text: L('按 <em>監控中心</em>（W）', 'Press <em>Observability</em> (W).'), sub: L('●125。它是 Detector：沒有偵測器，就看不到技術債。', "●125. It's your Detector: without one, tech debt stays invisible."), target: () => ({ ui: '[data-cmd=build-obs]' }), ok: (k, d) => k === 'menu' && d.type === 'obs', done: (t, d) => t === 'menu' && d.type === 'obs' },
      { text: L('在亮起的位置<em>點一下</em>', '<em>Click</em> the highlighted spot.'), target: () => ({ tile: { x: SPOT.x + 1, y: SPOT.y + 1, r: 1.5 }, mark: { x: SPOT.x + 1, y: SPOT.y + 1, r: 1.7, tiles: { x: SPOT.x, y: SPOT.y, w: 2, h: 2 } } }),
        ok: (k, d) => k === 'place' && Math.abs(d.x - SPOT.x) <= 1 && Math.abs(d.y - SPOT.y) <= 1, done: t => t === 'place',
        beat: { sec: 26, speed: 4, until: g => g.w.detected && g.w.t - g.w.detectT > 1.6, cap: L('監控中心啟動 …', 'Observability coming online …') } },
      { text: L('看到了：<em>技術債 ×<span id="dn">?</span></em>，就站在你的基地裡', 'There it is: <em>tech debt ×<span id="dn">?</span></em>, sitting right inside your base.'), sub: L('每一點債每秒吃掉預算、拖慢產出。它們是你按「加速」時<b>自己生出來的</b>，不會被打死，只會複利。', "Every point of debt eats Budget every second and slows output. <b>You created it yourself</b> by speeding things up. It can't be killed — it only compounds."),
        enter: g => { UI.show('debt'); SFX.play('scan'); const c = { x: bcx(hub) + 2.5, y: bcy(hub) - 1 }; R.focus(c.x, c.y, R.playZoom()); setTimeout(() => { const e = $('#dn'); if (e) e.textContent = Math.ceil(debtTotal(w)); }, 30); },
        ack: L('怎麼還？', 'How do I pay it down?'), target: () => ({ ui: '#pDebt' }) },
      { text: L('<em>選一個工程師</em>', '<em>Select an Engineer</em>.'), target: () => ({ ent: anyEng().id }), ok: isUnitSel, done: (t, d) => isUnitSel(t, d) },
      { text: L('點一塊粉紅色的<em>債務塊</em> = 還債', 'Click a pink <em>debt block</em> to pay it down.'), sub: L('還 1 點債要工程師花幾秒 —— 這幾秒他就不能採礦。', "Each point of debt takes an engineer a few seconds to pay down — seconds he can't spend mining."), target: () => ({ ent: () => w.debts.slice().sort((a, b) => (b.x + b.y) - (a.x + a.y))[0] }),
        ok: (k, d) => k === 'order' && d.kind === 'repay', done: (t, d) => t === 'order' && d.kind === 'repay', beat: { sec: 12, speed: 4, cap: L('工程師在還債：每還 1 點，預算損耗就少一點 …', 'Paying down debt: every point repaid means less Budget drain …') } },
      { text: L('✔ 債一點一點還掉，產出回來了', '✔ Debt paid down bit by bit — output is coming back'), sub: L('<b>任務：3 分鐘內把技術債壓到 3 點以下，產出回到 ≥ 7.0 ●/s。</b><br>再選幾個工程師一起還；別忘了節奏已切回「正常」。', '<b>Mission: within 3 minutes, get tech debt down to 3 pts or less and output back to ≥ 7.0 ●/s.</b><br>Select a few more engineers to help pay it down. Note: pace is back on "Normal".'), target: () => ({ ui: '#pDebt' }), ack: L('開始任務 ▶', 'Start Mission ▶'), ackClass: 'teal' },
    ];
  },
  afterTutorial(g, skipped) {
    const w = g.w; w.pace = PACE.normal; UI.sigCard = ''; g.clockOn = true; g.clock = 0; UI.show('debt'); UI.show('sup'); UI.show('map'); UI.show('home'); w.t0 = w.t - 8; g.winHold = 0;
    R.focus(bcx(hubOf(w)) + 1, bcy(hubOf(w)), R.playZoom()); UI.feed(L('節奏已切回「正常」。多選幾個工程師一起還債', 'Pace is back on "Normal". Select more engineers to pay down debt together'), 'good');
  },
  on(g, t, d) { if (t === 'spawn') g.tag_lastSpawn = g.w.t; },
  hud(g) {
    const w = g.w, active = g.clockOn, debt = Math.ceil(debtTotal(w) - 1e-6);
    return { title: L('MISSION 02 · 看不見的東西', "MISSION 02 · What You Can't See"), goal: active ? L('技術債 <b>≤ 3</b>　產出 <b>≥ 7.0 ●/s</b>', 'Tech debt <b>≤ 3</b> · Output <b>≥ 7.0 ●/s</b>') : L('教學：找出產出下滑的原因', 'Tutorial: find out why output is dropping'),
      sub: active ? L(`債 <b class="${debt > 3 ? 'bad' : ''}">${w.detected ? debt : '？'}</b>　·　產出 <b class="${w.rate < 7 ? 'bad' : ''}">${w.rate.toFixed(1)}</b> ●/s　·　需維持 5 秒`, `Debt <b class="${debt > 3 ? 'bad' : ''}">${w.detected ? debt : '?'}</b> · Output <b class="${w.rate < 7 ? 'bad' : ''}">${w.rate.toFixed(1)}</b> ●/s · hold for 5s`) : '' };
  },
  update(g, dt) {
    if (!g.clockOn) return; const w = g.w, debt = debtTotal(w);
    if (w.detected && debt <= 3 && w.rate >= 7.0) { g.winHold += dt; if (g.winHold >= 5) g.finish(true, {}); } else g.winHold = 0;
    if (g.clock >= 200) g.finish(false, {});
  },
  debrief(g, win) {
    const w = g.w, debt = Math.ceil(debtTotal(w) - 1e-6);
    return {
      title: win ? L('債清了，產出回來', 'Debt cleared, output restored') : L('時間到：債還在吃你的預算', "Time's up: debt is still eating your Budget"),
      stats: [{ label: L('技術債剩餘', 'Tech debt left'), val: L(debt + ' 點', debt + ' pts'), ok: debt <= 3 }, { label: L('產出', 'Output'), val: w.rate.toFixed(1) + ' ●/s', ok: w.rate >= 7 }, { label: L('工程師', 'Engineers'), val: L(engs(w).length + ' 人', String(engs(w).length)) }, { label: L('用時', 'Time'), val: fmtTime(g.clock) }],
      lesson: L(`<b>技術債：後果是公開的，原因是隱形的。</b>產出掉了三層視野都看得到，但沒有 Detector（監控／稽核／Code Review），就沒人知道原因是債。<br><br><b>還債永遠划算：</b>25 點債加 20 個工程師，每秒損失約 4.65 ●；還清約 250 工程師·秒，36 秒回本 —— 只是你得先看得到它。<br><b>對老闆解釋預算：</b>監控中心本身不產出任何東西，它的價值是讓「看不見的成本」變成數字。`, `<b>Tech debt: the effects are public, the cause is invisible.</b> All three views can see output falling, but without a Detector (monitoring / audits / code review), nobody knows the cause is debt.<br><br><b>Paying down debt always pays off:</b> 25 pts of debt with 20 engineers costs about 4.65 ● per second; clearing it takes about 250 engineer-seconds and pays for itself in 36s — you just have to see it first.<br><b>Justifying the budget to the Boss:</b> Observability produces nothing on its own. Its value is turning "invisible costs" into numbers.`),
    };
  },
});
