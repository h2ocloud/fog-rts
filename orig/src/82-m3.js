/* ═════ 第 3 關：老闆看不到的 · 三層視野 + 四格表 + 信任 ═════
   流程：暫停式「換位子」教學（老闆／主管／PM）→ 決策點 1（加人令，頻寬其實已滿）→ 四格表 → 結算＋換位子重看
        → 決策點 2（趕工令，隱形技術債）→ 結算。過關：信任 ≥ 50 且送出 2 次「標中」的預警。 */
const RISKS = [['supply', '頻寬已滿 ▤'], ['ore', '預算不夠 ●'], ['debt', '技術債偏高'], ['time', '時程估不準'], ['rnd', '研發投入中，產出暫時下降']];
const LIGHT = { green: '綠', yellow: '黃', red: '紅' };

function estimate(g) {
  const w = g.w, dp = g.dp, left = Math.max(0, dp.deadline - w.t);
  if (dp.key === 'headcount') {
    const n = engs(w).length, need = Math.max(0, dp.target - n), used = supplyUsed(w), cap = supplyCap(w);
    const comms = w.blds.some(b => b.type === 'comms') ? 0 : (used + need > cap ? 17 : 0);
    const est = Math.round(need * BASE_TRAIN * w.pace.mult + comms);
    return { late: est > left * .9, line: `預估還要 <b class="${est > left ? 'bad' : est > left * .9 ? '' : 'ok'}">${est} 秒</b>　·　剩 <b>${Math.round(left)} 秒</b>${comms ? '（含先蓋協作制度 ≈17 秒）' : ''}` };
  }
  if (dp.key === 'cash') {
    const need = (dp.oreTarget - w.ore) / Math.max(1, left);
    return { late: need > w.rate * 1.02, line: `目標需平均 <b class="${need > w.rate ? 'bad' : 'ok'}">${need.toFixed(1)} ●/s</b>　·　你現在 <b>${w.rate.toFixed(1)} ●/s</b>` };
  }
  const p = clamp(dp.progress(w), 0, 1), el = clamp(1 - left / dp.secs, 0, 1);
  return { late: p < el * .75 && p < 1, line: `目前完成 <b class="${p >= el ? 'ok' : 'bad'}">${Math.round(p * 100)}%</b>　·　時間已過 <b>${Math.round(el * 100)}%</b>　·　剩 <b>${Math.round(left)} 秒</b>` };
}
function riskTruth(g) {
  const w = g.w, used = supplyUsed(w), cap = supplyCap(w);
  const lab = labOf(w);
  return { supply: used >= cap - 1, ore: w.ore < 120, debt: (w.detected || pingsActive(w).length) ? debtTotal(w) >= 6 : null, time: estimate(g).late, rnd: lab ? labAssigned(w, lab).length > 0 : null };
}
function snapshot(g) { const w = g.w; return { pm: project(w, 'ground', g), boss: project(w, 'orbit', g), used: supplyUsed(w), cap: supplyCap(w), debtTrue: Math.ceil(debtTotal(w) - 1e-6), detected: w.detected, ore: Math.floor(w.ore), rate: w.rate, feats: feats(w).length, rs: labOf(w) ? labAssigned(w, labOf(w)).length : 0, share: marketShare(w), nodes: ownedNodes(w), upkeep: w.upkeep || 0 }; }

/* 通用決策點：o = {key,who,say,why,secs,milestone,progress(w),done(w),pmLines(s),bossLines(s),note} ；meta = {idx,total,first,onNext(g)} */
function openDP(g, o, meta) {
  const w = g.w, snap = snapshot(g), first = !!meta.first;
  const m = Modal.show(`<div class="card"><div class="kicker">DECISION POINT ${meta.idx + 1} / ${meta.total} · 老闆的指令卡</div>
    <div class="order"><div class="who">${o.who}</div><div class="say">「${o.say}」</div><div class="why">${o.why}</div></div>
    <div class="stats"><div class="stat"><b>${o.milestone}</b><span>老闆要的結果</span></div><div class="stat"><b>${o.secs}s</b><span>期限</span></div><div class="stat"><b>♥ ${Math.round(w.trust)}</b><span>目前信任</span></div></div>
    ${first ? `<div class="tip"><b>你看得到，他看不到。</b>你的畫面上：頻寬 <b>▤ ${snap.used}/${snap.cap}</b>。老闆的畫面沒有這一格。接下來你要練的是<b>事前預警</b> —— 失約之前，在四格表把風險標紅。<br>操作忘了？選工程師按 <b>Q</b> 蓋協作制度、選基地按 <b>Q</b> 訓練。</div>` : `<div class="tip">${o.note || '這個指令，你的畫面上看到什麼、他的畫面上看到什麼？想清楚再回報。'}</div>`}
    <div class="row"><button class="btn teal big" id="ok">接令，開始計時 ▶</button></div></div>`);
  m.querySelector('#ok').onclick = () => {
    SFX.init(); Modal.hide();
    g.dp = { idx: meta.idx, total: meta.total, key: o.key, milestone: o.milestone, short: o.say.length > 26 ? o.say.slice(0, 25) + '…' : o.say, deadline: w.t + o.secs, secs: o.secs, target: o.target, ore0: o.ore0, oreTarget: o.oreTarget,
      reported: false, flags: [], valid: [], extended: false, resolved: false, snap, progress: o.progress, done: o.done, pmLines: o.pmLines, bossLines: o.bossLines, engLines: o.engLines, onNext: meta.onNext, nextLabel: meta.nextLabel };
    g.light = 'green'; UI.feed(meta.idx === 0 ? '點上方「📋 回報老闆」— 事前預警不花任何資源' : '想清楚風險是什麼再回報 — 標「現在真的存在」的', 'good'); SFX.play('ping');
    if (!meta.noFocus) R.focus(bcx(hubOf(w)), bcy(hubOf(w)) + 1, R.playZoom());
  };
}

function startDP(g, idx) { // 第 3 關專用的兩個決策點
  const w = g.w; let cashGain = 0;
  if (idx === 1) {
    w.pace = PACE.normal; ['obs', 'pace', 'repay'].forEach(k => g.unlocked.add(k)); UI.sigCard = '';
    for (let i = 0; i < 6; i++) addDebt(w, 3.34);   // 散成 6 塊：工程師一次只看得到腳邊那幾塊
    const hr = engs(w).length * (CHUNK / (MINE_T + 1.4)); cashGain = Math.round(.47 * hr * 150 * 10000 / 100000) * 100000;
  }
  const b = bossOrder(w, g, idx, { cashGain }), ore0 = w.ore, oreTarget = Math.floor(w.ore + cashGain / 10000);
  const o = { ...b, ore0, oreTarget,
    progress: b.key === 'headcount' ? w => engs(w).length / b.target : w => (w.ore - ore0) / Math.max(1, oreTarget - ore0),
    done: b.key === 'headcount' ? w => engs(w).length >= b.target : w => w.ore >= oreTarget,
    pmLines: idx === 0 ? s => `工程師 <b>${s.pm.workers}</b> · 預算 ● <b>${s.ore}</b><br>管理頻寬 <b class="miss">▤ ${s.used}/${s.cap}（已滿）</b><br><span class="dim">→ 要加人，先得蓋協作制度</span>`
      : s => `工程師 <b>${s.pm.workers}</b> · 產出 <b>${s.rate.toFixed(1)}</b> ●/s<br>技術債 <b class="${s.detected ? '' : 'miss'}">${s.detected ? s.debtTrue : '？'}</b><br><span class="miss">真相：技術債 ${s.debtTrue} 點${s.detected ? '' : '（你當時看不到）'}</span>`,
    bossLines: idx === 0 ? s => `現金 <b>NT$${(s.boss.cash / 1e6).toFixed(1)}M</b><br>人數 <b>${s.boss.people}</b><br>燈號 <b>${LIGHT.green}</b><br><span class="miss">沒有「管理頻寬」這一格</span><br><span class="dim">→ 「錢夠就該加人」在他的畫面上完全合理</span>`
      : s => `現金 <b>NT$${(s.boss.cash / 1e6).toFixed(1)}M</b><br>人數 <b>${s.boss.people}</b><br>競品：<b>已上線「即時協作」</b><br><span class="miss">沒有「技術債」這一格</span><br><span class="dim">→ 「為什麼慢？全面趕工」在他的畫面上完全合理</span>`,
    engLines: idx === 0 ? s => `我只收到：「去採礦」「多接一點，新人會來」。<br>新人誰帶？沒人說。我手上三張票都還沒做完。<br><span class="miss">我不知道頻寬已經滿了</span>` : s => `我早就覺得慢了 —— 每趟帶回的比以前少，旁邊的程式碼動一處要繞三處。<br><span class="miss">沒人問過我，我也不知道這叫「技術債」</span><br><span class="dim">→ 想知道？到我的位子（按 4）按「回報」</span>`,
    note: idx === 1 ? '<b>這次換技術債。</b>老闆建議「硬趕」，但你看得到趕工的後果嗎？<b>最便宜的偵測器是工程師</b> —— 按 4 附身一位，按「回報」，他腳邊的卡點會亮給你（局部、限時 60 秒）。' : null };
  openDP(g, o, { idx, total: 2, first: idx === 0 && !g.tag.seenDP, onNext: g2 => { if (idx === 0) startDP(g2, 1); else g2.finish(g2.w.trust >= 50 && g2.tag.validWarn >= 2, {}); }, nextLabel: idx === 0 ? '下一個決策點 ▶' : '看總結 ▶' });
  g.tag.seenDP = true;
}

const Report = {
  open() {
    const g = G, w = g.w, dp = g.dp; if (!dp || dp.resolved || dp.reported) return;
    const truth = riskTruth(g), est = estimate(g), used = supplyUsed(w), cap = supplyCap(w), n = engs(w).length, debt = Math.ceil(debtTotal(w) - 1e-6);
    const pct = Math.round(clamp(dp.progress(w), 0, 1) * 100);
    const prog = dp.key === 'headcount' ? `工程師 <b>${n}</b> / ${dp.target}` : dp.key === 'cash' ? `現金 <b>${Math.floor(w.ore)}</b> / ${dp.oreTarget} ●` : `完成度 <b>${pct}%</b>` + (w.nodes ? `<br>據點 <b>${ownedNodes(w)}</b> · 市佔 <b>${marketShare(w)}%</b>` : '') + (feats(w).length ? `<br>功能 <b>${feats(w).length}</b> · 維運 −${(w.upkeep || 0).toFixed(2)}/s` : '') + (labOf(w) && labAssigned(w, labOf(w)).length ? `<br>研發 <b>${labAssigned(w, labOf(w)).length}</b> 人（不採礦）` : '');
    const first = dp.idx === 0 && !g.tag.reportedOnce;
    const m = Modal.show(`<div class="card"><div class="kicker">STATUS REPORT · 狀態報告（四格表）</div>
      <h2>只有四格，你要塞進正確的資訊</h2>
      <div class="order" style="margin-top:8px"><div class="who">老闆的指令</div><div class="say" style="font-size:15px">「${dp.milestone}」· 剩 ${Math.round(dp.deadline - w.t)} 秒</div></div>
      <div class="form4">
        <div class="box4"><h3>① 進度<em>你的畫面</em></h3><div class="fact">${prog}<br>管理頻寬 <b class="${used >= cap ? 'bad' : ''}">▤ ${used}/${cap}</b>${used >= cap ? '（已滿）' : ''}<br>產出 <b>${w.rate.toFixed(1)}</b> ●/s<br>技術債 <b>${w.detected ? debt : pingsActive(w).length ? '≥' + pingsActive(w).reduce((a, p) => a + p.n, 0) : '？'}</b>${w.detected ? '' : pingsActive(w).length ? '（工程師回報，局部）' : '（沒有 Detector，你也看不到）'}</div></div>
        <div class="box4"><h3>② 風險<em>標紅＝預警</em></h3><div class="chips" id="risks">${RISKS.map(([k, t]) => truth[k] === null ? `<button class="chip" disabled>${t} <small>🔒 ${k === 'rnd' ? '尚無研發中心' : '需要 Detector'}</small></button>` : `<button class="chip${first && k === 'supply' ? ' hintpulse' : ''}" data-k="${k}">${t}</button>`).join('')}</div><div class="ex">只標「現在真的存在」的風險。標中＝有效預警。</div></div>
        <div class="box4"><h3>③ 需要<em>向老闆要什麼</em></h3><div class="chips" id="needs"><button class="chip sel" data-n="none">不需要</button>${dp.extended ? '' : '<button class="chip" data-n="extend">請延長 30 秒 <small>信任 −3</small></button>'}</div></div>
        <div class="box4"><h3>④ 預估<em>你的判斷</em></h3><div class="fact">${est.line}</div></div>
      </div>
      ${first ? '<div class="tip"><b>第一次：</b>② 你看得到「頻寬已滿」，老闆看不到。<b>把它標紅</b> —— 不花任何資源，但失約時信任 <b>−12</b> 會變成 <b>−4</b>。</div>' : ''}
      <div class="row"><button class="btn teal" id="send">送出四格表</button><button class="btn ghost" id="cancel">先不回報，回遊戲</button></div></div>`);
    const flags = new Set(); let need = 'none'; g.tag.reportedOnce = true;
    m.querySelectorAll('#risks .chip[data-k]').forEach(b => b.onclick = () => { const k = b.dataset.k; flags.has(k) ? flags.delete(k) : flags.add(k); b.classList.toggle('on', flags.has(k)); b.classList.remove('hintpulse'); SFX.play('click'); });
    m.querySelectorAll('#needs .chip').forEach(b => b.onclick = () => { need = b.dataset.n; m.querySelectorAll('#needs .chip').forEach(x => x.classList.toggle('sel', x === b)); SFX.play('click'); });
    m.querySelector('#cancel').onclick = () => Modal.hide();
    m.querySelector('#send').onclick = () => {
      Modal.hide(); dp.reported = true; dp.flags = [...flags]; dp.valid = dp.flags.filter(k => truth[k] === true);
      if (need === 'extend' && !dp.extended) { dp.extended = true; dp.deadline += 30; g.addTrust(-3, '要求延期'); }
      if (dp.valid.length) { g.tag.validWarn++; g.light = 'yellow'; UI.alert('老闆看到黃燈 — 你事前預警了（標中）', 'good'); }
      else if (dp.flags.length) UI.alert('你標的風險目前不成立 — 預警要標「現在看得到的」', 'warn');
      else UI.feed('你回報了「一切順利」— 老闆的燈號是綠的', 'warn');
      SFX.play('ping');
    };
  },
};

function resolveDP(g) {
  const dp = g.dp, w = g.w; if (dp.resolved) return; dp.resolved = true; const ok = dp.done(w);
  let delta, label;
  if (ok) { delta = 6; label = '達成'; } else if (dp.valid.length) { delta = -4; label = '未達成，但你事前預警了'; } else { delta = -12; label = '未達成，而且沒有有效預警'; }
  g.addTrust(delta, label); g.tag.results.push({ idx: dp.idx, ok, delta, label, warned: dp.valid.length > 0 }); g.emit('dpResolved', { ok, delta, label, idx: dp.idx });
  const s = dp.snap, before = w.trust - delta, lamp = dp.valid.length ? 'yellow' : 'green'; g.light = 'green';
  const m = Modal.show(`<div class="card"><div class="kicker">決策點 ${dp.idx + 1} 結算 · 換位子重看同一刻</div>
    <h2>${ok ? '✔ ' : '✖ '}${label}</h2>
    <div class="stats"><div class="stat ${delta > 0 ? 'ok' : 'no'}"><b>♥ ${Math.round(before)} → ${Math.round(w.trust)}</b><span>信任 ${delta > 0 ? '+' : ''}${delta}</span></div><div class="stat ${dp.valid.length ? 'ok' : ''}"><b>${dp.valid.length ? '有效' : dp.flags.length ? '標錯' : '沒有'}</b><span>事前預警</span></div><div class="stat"><b><i class="lamp ${lamp}"></i>${LIGHT[lamp]}</b><span>老闆看到的燈號</span></div></div>
    <div class="swap"><div class="view"><h3>你當時看到的 · PM 地面層</h3>${dp.pmLines(s)}</div><div class="view boss"><h3>老闆當時看到的 · 軌道層</h3>${dp.bossLines(s)}</div>${dp.engLines ? `<div class="view eng"><h3>工程師當時看到的 · 執行層</h3>${dp.engLines(s)}</div>` : ''}</div>
    <div class="lesson">${delta === -12 ? '<b>沒有預警的失約 −12。</b>' : delta === -4 ? '<b>同樣失約，預警把 −12 變 −4</b>（止血三分之二，而且成本為零）。' : '<b>達成 +6。</b>但別忘了，要的是「標中的預警」——不是只要把事做完。'} 老闆不是刁難你，他的畫面上真的沒有那個資訊。</div>
    <div class="row"><button class="btn teal big" id="nx">${dp.nextLabel || '繼續 ▶'}</button></div></div>`);
  m.querySelector('#nx').onclick = () => { Modal.hide(); if (dp.onNext) dp.onNext(g); };
}

MISSIONS.push({
  id: 'm3', title: '老闆看不到的 · 四層視野 + 信任', blurb: '同一場戰役，老闆、主管、PM、工程師看到的畫面都不一樣（迷霧也罩自己人）。學會用四格表「事前預警」，並且去聽工程師說。', limit: 0,
  setup(g, opts) {
    const w = g.w; w.pads = [{ x: 5, y: 15, w: 8, h: 8, c: '#21364a', line: 'rgba(62,224,161,.22)' }, { x: 1, y: 11, w: 5, h: 13, c: '#15222d' }, { x: 18, y: 3, w: 7, h: 7, c: '#3a2424', line: 'rgba(255,106,74,.3)' }];
    const hub = layoutBase(w, 7, 17);
    scatterRocks(w, [[2, 9, 2], [1, 26], [4, 25], [12, 25, 2], [14, 15], [16, 21, 2], [10, 9], [14, 6, 2], [24, 14], [15, 26], [13, 12], [22, 20, 2], [18, 13]]);
    addRival(w, 20, 5);
    w.ore = 200; w.trust = 70; w.tag = { results: [], validWarn: 0 };
    spawnCrew(w, hub, 8); hub.rally = { patch: nearestPatch(w, hub.x, hub.y + 1).id };
    w.units.filter(u => u.team === 0).forEach(u => cmdMine(w, [u], w.patches[u.id % w.patches.length]));
    g.unlocked = new Set(['train', 'comms', 'mine', 'idle', 'move']); g.dp = null; g.light = 'green';
    computeVision(w); warm(w, 30); w.t0 = w.t - 25;
  },
  reveal(g, opts) { UI.show('sup'); UI.show('map'); UI.show('home'); UI.show('trust'); if (opts.skipTutorial) { g.unlocked.add('views'); UI.show('views'); } },
  steps(g) {
    const w = g.w, role = r => ({ ok: (k, d) => k === 'view' && d.role === r, done: (t, d) => t === 'view' && d.role === r });
    return [
      { label: '換位子', text: '這關的主題：<em>同一場戰役，四個人看到的畫面都不一樣</em>', sub: '你現在是 PM（地面層）。老闆在「軌道層」，主管在「艦橋層」，工程師在最底下的「執行層」。先去老闆的位子看一眼。', ack: '好，帶我去', target: () => null, enter: g => { g.unlocked.add('views'); } },
      { label: '換位子', text: '點 <em>老闆 Orbit</em>（或按 3）', enter: g => { UI.show('views'); }, target: () => ({ ui: '[data-role=orbit]' }), ...role('orbit') },
      { label: '換位子', text: '迷霧也罩 <em>自己人</em>', sub: '老闆看不到你的團隊，只有 4 個數字。但<b>競品那格反而很清楚</b> —— 這是所有跨層溝通痛苦的來源。', enter: g => { const b = w.rival.b; R.focus(b.x + 1.5, b.y + 6, R.playZoom() * .82); setTimeout(() => R.focus((bcx(hubOf(w)) + b.x + 1.5) / 2, (bcy(hubOf(w)) + b.y + 1.5) / 2, R.playZoom() * .6), 1400); }, target: () => ({ ui: '#layer' }), ack: '再去主管的位子' },
      { label: '換位子', text: '點 <em>主管 Bridge</em>（或按 2）', target: () => ({ ui: '[data-role=bridge]' }), ...role('bridge') },
      { label: '換位子', text: g => `主管看得到 <em>「落後 ${project(g.w, 'bridge').behind}%」</em>，看不到原因`, sub: '原因是頻寬、技術債 —— 只有 PM 這層看得到。三個人要拼出完整圖像，只能靠講話，<b>這就是專案管理</b>。', target: () => ({ ui: '#layer' }), ack: '回到我的位子' },
      { label: '換位子', text: '點 <em>PM Ground</em>（或按 1）', target: () => ({ ui: '[data-role=ground]' }), ...role('ground') },
      { label: '換位子', text: '再往下一層：點 <em>工程師</em>（或按 4）', sub: '最後一個人 —— 真正動手的那位。', target: () => ({ ui: '[data-role=engineer]' }), ...role('engineer') },
      { label: '換位子', text: '隧道視野 —— 他<em>只知道執行</em>', sub: '資源列、任務目標全消失，只看得到身邊。他只收到「去採礦」，<b>沒有為什麼</b>；他覺得變慢了，卻不知道原因，也沒人問過他。<br><b>PM 不只向上翻譯給老闆，也要向下翻譯給工程師，並且主動去聽。</b>', target: () => ({ ui: '#layer' }), ack: '回到我的位子' },
      { label: '換位子', text: '點 <em>PM Ground</em>（或按 1）回來', target: () => ({ ui: '[data-role=ground]' }), ...role('ground') },
    ];
  },
  afterTutorial(g, skipped) {
    const w = g.w; g.unlocked.add('views'); UI.show('views'); UI.show('trust'); g.clockOn = false; R.focus(bcx(hubOf(w)), bcy(hubOf(w)) + 1, R.playZoom());
    setTimeout(() => { if (G.mission && G.mission.id === 'm3' && !G.dp && !G.over) startDP(G, 0); }, 350);
  },
  hud(g) {
    const w = g.w, dp = g.dp; if (!dp) return { title: 'MISSION 03 · 老闆看不到的', goal: '教學：換位子看同一場戰役', sub: '' };
    const left = Math.max(0, Math.round(dp.deadline - w.t)), p = Math.round(clamp(dp.progress(w), 0, 1) * 100);
    return { title: `MISSION 03 · 決策點 ${dp.idx + 1} / 2`, goal: dp.resolved ? '結算中…' : `老闆：<b>${dp.milestone}</b>　<span style="color:var(--dim);font-weight:400">${p}%</span>`, sub: `有效預警 <b>${g.tag.validWarn}</b> / 2　·　信任 <b class="${w.trust < 50 ? 'bad' : ''}">${Math.round(w.trust)}</b>（需 ≥ 50）` };
  },
  clockText(g) { const dp = g.dp; return dp && !dp.resolved ? fmtTime(dp.deadline - g.w.t) : ''; },
  update(g, dt) {
    const dp = g.dp; if (!dp || dp.resolved) return; if (dp.done(g.w) || g.w.t >= dp.deadline) resolveDP(g);
  },
  debrief(g, win) {
    const w = g.w, r = g.tag.results, v = g.tag.validWarn;
    const why = win ? '信任守住了，而且兩次預警都標中。' : (w.trust < 50 ? '信任跌到 50 以下：老闆開始微管理，佔走你的管理頻寬。' : '預警不夠：這關要求送出 2 次「標中」的預警 — 不是只要把事做完。');
    return {
      title: win ? '你把老闆看不到的，塞進了四格' : '信任或預警不足', kicker: win ? 'MISSION COMPLETE' : 'MISSION FAILED',
      stats: [{ label: '信任', val: '♥ ' + Math.round(w.trust), ok: w.trust >= 50 }, { label: '有效預警', val: v + ' / 2', ok: v >= 2 }, ...r.map(x => ({ label: `決策點 ${x.idx + 1}`, val: x.ok ? '達成' : x.warned ? '失約·有預警' : '失約·無預警', ok: x.ok ? true : x.warned ? undefined : false }))],
      body: `<p>${why}</p>`,
      lesson: `<b>信任是一條會反饋回產能的資源線：</b>≥80 少管你；<50 老闆開始微管理（佔你的 ▤）；<30 每 30 秒索取報告。死亡螺旋的唯一斷點是<b>事前預警</b> — 不花資源、成本永遠是零，把「未預警失約 −12」變成「−4」。<br><br><b>三層視野：</b>老闆對競品的了解常比對自己團隊還清楚，因為競品資訊直接進來、自家資訊要穿過三層。他不是刁難你 — 他的畫面上真的沒有那個資訊。<br><br><a href="${SPEC_URL}" target="_blank" rel="noopener" style="color:var(--teal)">完整教材規格書 ↗</a>`,
    };
  },
});
