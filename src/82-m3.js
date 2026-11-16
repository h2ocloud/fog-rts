/* ═════ 第 3 關：老闆看不到的 · 三層視野 + 四格表 + 信任 ═════
   流程：暫停式「換位子」教學（老闆／主管／PM）→ 決策點 1（加人令，頻寬其實已滿）→ 四格表 → 結算＋換位子重看
        → 決策點 2（趕工令，隱形技術債）→ 結算。過關：信任 ≥ 50 且送出 2 次「標中」的預警。 */
const RISKS = [['supply', L('頻寬已滿 ▤', 'Bandwidth maxed ▤')], ['ore', L('預算不夠 ●', 'Budget short ●')], ['debt', L('技術債偏高', 'Tech debt high')], ['time', L('時程估不準', 'Schedule slipping')], ['rnd', L('研發投入中，產出暫時下降', 'R&D underway, output temporarily down')]];
const LIGHT = { green: L('綠', 'Green'), yellow: L('黃', 'Amber'), red: L('紅', 'Red') };

function estimate(g) {
  const w = g.w, dp = g.dp, left = Math.max(0, dp.deadline - w.t);
  if (dp.key === 'headcount') {
    const n = engs(w).length, need = Math.max(0, dp.target - n), used = supplyUsed(w), cap = supplyCap(w);
    const comms = w.blds.some(b => b.type === 'comms') ? 0 : (used + need > cap ? 17 : 0);
    const est = Math.round(need * BASE_TRAIN * w.pace.mult + comms);
    return { late: est > left * .9, line: L(`預估還要 <b class="${est > left ? 'bad' : est > left * .9 ? '' : 'ok'}">${est} 秒</b>　·　剩 <b>${Math.round(left)} 秒</b>${comms ? '（含先蓋協作制度 ≈17 秒）' : ''}`, `Need about <b class="${est > left ? 'bad' : est > left * .9 ? '' : 'ok'}">${est}s</b> · <b>${Math.round(left)}s</b> left${comms ? ' (incl. ≈17s to build a Comms Layer first)' : ''}`) };
  }
  if (dp.key === 'cash') {
    const need = (dp.oreTarget - w.ore) / Math.max(1, left);
    return { late: need > w.rate * 1.02, line: L(`目標需平均 <b class="${need > w.rate ? 'bad' : 'ok'}">${need.toFixed(1)} ●/s</b>　·　你現在 <b>${w.rate.toFixed(1)} ●/s</b>`, `Target needs an average of <b class="${need > w.rate ? 'bad' : 'ok'}">${need.toFixed(1)} ●/s</b> · you're at <b>${w.rate.toFixed(1)} ●/s</b>`) };
  }
  const p = clamp(dp.progress(w), 0, 1), el = clamp(1 - left / dp.secs, 0, 1);
  return { late: p < el * .75 && p < 1, line: L(`目前完成 <b class="${p >= el ? 'ok' : 'bad'}">${Math.round(p * 100)}%</b>　·　時間已過 <b>${Math.round(el * 100)}%</b>　·　剩 <b>${Math.round(left)} 秒</b>`, `<b class="${p >= el ? 'ok' : 'bad'}">${Math.round(p * 100)}%</b> done · <b>${Math.round(el * 100)}%</b> of time used · <b>${Math.round(left)}s</b> left`) };
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
  const m = Modal.show(`<div class="card"><div class="kicker">DECISION POINT ${meta.idx + 1} / ${meta.total} · ${L('老闆的指令卡', "The Boss's Orders")}</div>
    <div class="order"><div class="who">${o.who}</div><div class="say">${L(`「${o.say}」`, `“${o.say}”`)}</div><div class="why">${o.why}</div></div>
    <div class="stats"><div class="stat"><b>${o.milestone}</b><span>${L('老闆要的結果', 'What the Boss wants')}</span></div><div class="stat"><b>${o.secs}s</b><span>${L('期限', 'Deadline')}</span></div><div class="stat"><b>♥ ${Math.round(w.trust)}</b><span>${L('目前信任', 'Current Trust')}</span></div></div>
    ${first ? L(`<div class="tip"><b>你看得到，他看不到。</b>你的畫面上：頻寬 <b>▤ ${snap.used}/${snap.cap}</b>。老闆的畫面沒有這一格。接下來你要練的是<b>事前預警</b> —— 失約之前，在四格表把風險標紅。<br>操作忘了？選工程師按 <b>Q</b> 蓋協作制度、選基地按 <b>Q</b> 訓練。</div>`, `<div class="tip"><b>You can see it. He can't.</b> On your screen: Bandwidth <b>▤ ${snap.used}/${snap.cap}</b>. The Boss's screen doesn't have that box. What you'll practice next is the <b>early warning</b> — before you miss the deadline, flag the risk red in the 4-box report.<br>Forgot the controls? Select an Engineer and press <b>Q</b> to build a Comms Layer; select the base and press <b>Q</b> to train.</div>`) : `<div class="tip">${o.note || L('這個指令，你的畫面上看到什麼、他的畫面上看到什麼？想清楚再回報。', 'For this order: what do you see on your screen, and what does he see on his? Think it through before you report.')}</div>`}
    <div class="row"><button class="btn teal big" id="ok">${L('接令，開始計時 ▶', 'Accept · Start the clock ▶')}</button></div></div>`);
  m.querySelector('#ok').onclick = () => {
    SFX.init(); Modal.hide();
    g.dp = { idx: meta.idx, total: meta.total, key: o.key, milestone: o.milestone, short: o.say.length > L(26, 80) ? o.say.slice(0, L(25, 79)) + '…' : o.say, deadline: w.t + o.secs, secs: o.secs, target: o.target, ore0: o.ore0, oreTarget: o.oreTarget,
      reported: false, flags: [], valid: [], extended: false, resolved: false, snap, progress: o.progress, done: o.done, pmLines: o.pmLines, bossLines: o.bossLines, engLines: o.engLines, onNext: meta.onNext, nextLabel: meta.nextLabel };
    g.light = 'green'; UI.feed(meta.idx === 0 ? L('點上方「📋 回報老闆」— 事前預警不花任何資源', 'Click "📋 Report to Boss" at the top — an early warning costs nothing') : L('想清楚風險是什麼再回報 — 標「現在真的存在」的', 'Know what the risk is before you report — flag only what exists right now'), 'good'); SFX.play('ping');
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
    pmLines: idx === 0 ? s => L(`工程師 <b>${s.pm.workers}</b> · 預算 ● <b>${s.ore}</b><br>管理頻寬 <b class="miss">▤ ${s.used}/${s.cap}（已滿）</b><br><span class="dim">→ 要加人，先得蓋協作制度</span>`, `Engineers <b>${s.pm.workers}</b> · Budget ● <b>${s.ore}</b><br>Bandwidth <b class="miss">▤ ${s.used}/${s.cap} (maxed)</b><br><span class="dim">→ To add people, you first need a Comms Layer</span>`)
      : s => L(`工程師 <b>${s.pm.workers}</b> · 產出 <b>${s.rate.toFixed(1)}</b> ●/s<br>技術債 <b class="${s.detected ? '' : 'miss'}">${s.detected ? s.debtTrue : '？'}</b><br><span class="miss">真相：技術債 ${s.debtTrue} 點${s.detected ? '' : '（你當時看不到）'}</span>`, `Engineers <b>${s.pm.workers}</b> · Output <b>${s.rate.toFixed(1)}</b> ●/s<br>Tech debt <b class="${s.detected ? '' : 'miss'}">${s.detected ? s.debtTrue : '?'}</b><br><span class="miss">The truth: ${s.debtTrue} pts of tech debt${s.detected ? '' : " (you couldn't see it at the time)"}</span>`),
    bossLines: idx === 0 ? s => L(`現金 <b>NT$${(s.boss.cash / 1e6).toFixed(1)}M</b><br>人數 <b>${s.boss.people}</b><br>燈號 <b>${LIGHT.green}</b><br><span class="miss">沒有「管理頻寬」這一格</span><br><span class="dim">→ 「錢夠就該加人」在他的畫面上完全合理</span>`, `Cash <b>NT$${(s.boss.cash / 1e6).toFixed(1)}M</b><br>Headcount <b>${s.boss.people}</b><br>Light <b>${LIGHT.green}</b><br><span class="miss">No "Bandwidth" box</span><br><span class="dim">→ "We have the money, so hire more" makes perfect sense on his screen</span>`)
      : s => L(`現金 <b>NT$${(s.boss.cash / 1e6).toFixed(1)}M</b><br>人數 <b>${s.boss.people}</b><br>競品：<b>已上線「即時協作」</b><br><span class="miss">沒有「技術債」這一格</span><br><span class="dim">→ 「為什麼慢？全面趕工」在他的畫面上完全合理</span>`, `Cash <b>NT$${(s.boss.cash / 1e6).toFixed(1)}M</b><br>Headcount <b>${s.boss.people}</b><br>Rival: <b>already shipped "Live Collaboration"</b><br><span class="miss">No "Tech debt" box</span><br><span class="dim">→ "Why so slow? Everyone crunch" makes perfect sense on his screen</span>`),
    engLines: idx === 0 ? s => L(`我只收到：「去採礦」「多接一點，新人會來」。<br>新人誰帶？沒人說。我手上三張票都還沒做完。<br><span class="miss">我不知道頻寬已經滿了</span>`, `All I got was "go mine" and "take on more, new hires are coming."<br>Who's onboarding them? Nobody said. I still have three tickets open.<br><span class="miss">I had no idea bandwidth was maxed</span>`) : s => L(`我早就覺得慢了 —— 每趟帶回的比以前少，旁邊的程式碼動一處要繞三處。<br><span class="miss">沒人問過我，我也不知道這叫「技術債」</span><br><span class="dim">→ 想知道？到我的位子（按 4）按「回報」</span>`, `I've felt us slowing down for a while — every trip brings back less, and changing one spot in the code means working around three others.<br><span class="miss">Nobody ever asked me, and I didn't know this was called "tech debt"</span><br><span class="dim">→ Want to know? Come to my seat (press 4) and hit "Report"</span>`),
    note: idx === 1 ? L('<b>這次換技術債。</b>老闆建議「硬趕」，但你看得到趕工的後果嗎？<b>最便宜的偵測器是工程師</b> —— 按 4 附身一位，按「回報」，他腳邊的卡點會亮給你（局部、限時 60 秒）。', `<b>This time it's tech debt.</b> The Boss wants "Crunch," but can you see what crunching costs? <b>Your cheapest detector is an engineer</b> — press 4 to take one's seat and hit "Report," and the blockers around him light up for you (nearby only, for 60s).`) : null };
  openDP(g, o, { idx, total: 2, first: idx === 0 && !g.tag.seenDP, onNext: g2 => { if (idx === 0) startDP(g2, 1); else g2.finish(g2.w.trust >= 50 && g2.tag.validWarn >= 2, {}); }, nextLabel: idx === 0 ? L('下一個決策點 ▶', 'Next decision point ▶') : L('看總結 ▶', 'See summary ▶') });
  g.tag.seenDP = true;
}

const Report = {
  open() {
    const g = G, w = g.w, dp = g.dp; if (!dp || dp.resolved || dp.reported) return;
    const truth = riskTruth(g), est = estimate(g), used = supplyUsed(w), cap = supplyCap(w), n = engs(w).length, debt = Math.ceil(debtTotal(w) - 1e-6);
    const pct = Math.round(clamp(dp.progress(w), 0, 1) * 100);
    const prog = dp.key === 'headcount' ? L(`工程師 <b>${n}</b> / ${dp.target}`, `Engineers <b>${n}</b> / ${dp.target}`) : dp.key === 'cash' ? L(`現金 <b>${Math.floor(w.ore)}</b> / ${dp.oreTarget} ●`, `Cash <b>${Math.floor(w.ore)}</b> / ${dp.oreTarget} ●`) : L(`完成度 <b>${pct}%</b>`, `Progress <b>${pct}%</b>`) + (w.nodes ? L(`<br>據點 <b>${ownedNodes(w)}</b> · 市佔 <b>${marketShare(w)}%</b>`, `<br>Zones <b>${ownedNodes(w)}</b> · Market share <b>${marketShare(w)}%</b>`) : '') + (feats(w).length ? L(`<br>功能 <b>${feats(w).length}</b> · 維運 −${(w.upkeep || 0).toFixed(2)}/s`, `<br>Features <b>${feats(w).length}</b> · Upkeep −${(w.upkeep || 0).toFixed(2)}/s`) : '') + (labOf(w) && labAssigned(w, labOf(w)).length ? L(`<br>研發 <b>${labAssigned(w, labOf(w)).length}</b> 人（不採礦）`, `<br>R&D <b>${labAssigned(w, labOf(w)).length}</b> ${labAssigned(w, labOf(w)).length === 1 ? 'researcher' : 'researchers'} (not mining)`) : '');
    const first = dp.idx === 0 && !g.tag.reportedOnce;
    const m = Modal.show(`<div class="card"><div class="kicker">STATUS REPORT · ${L('狀態報告（四格表）', '4-Box Report')}</div>
      <h2>${L('只有四格，你要塞進正確的資訊', 'Only four boxes — fill them with the right information')}</h2>
      <div class="order" style="margin-top:8px"><div class="who">${L('老闆的指令', "The Boss's order")}</div><div class="say" style="font-size:15px">${L(`「${dp.milestone}」· 剩 ${Math.round(dp.deadline - w.t)} 秒`, `“${dp.milestone}” · ${Math.round(dp.deadline - w.t)}s left`)}</div></div>
      <div class="form4">
        <div class="box4"><h3>${L('① 進度<em>你的畫面</em>', '① Progress<em>Your screen</em>')}</h3><div class="fact">${prog}<br>${L('管理頻寬', 'Bandwidth')} <b class="${used >= cap ? 'bad' : ''}">▤ ${used}/${cap}</b>${used >= cap ? L('（已滿）', ' (maxed)') : ''}<br>${L('產出', 'Output')} <b>${w.rate.toFixed(1)}</b> ●/s<br>${L('技術債', 'Tech debt')} <b>${w.detected ? debt : pingsActive(w).length ? '≥' + pingsActive(w).reduce((a, p) => a + p.n, 0) : L('？', '?')}</b>${w.detected ? '' : pingsActive(w).length ? L('（工程師回報，局部）', ' (engineer report, partial)') : L('（沒有 Detector，你也看不到）', " (no Detector — you can't see it either)")}</div></div>
        <div class="box4"><h3>${L('② 風險<em>標紅＝預警</em>', '② Risks<em>Red = early warning</em>')}</h3><div class="chips" id="risks">${RISKS.map(([k, t]) => truth[k] === null ? `<button class="chip" disabled>${t} <small>🔒 ${k === 'rnd' ? L('尚無研發中心', 'No R&D Lab yet') : L('需要 Detector', 'Needs a Detector')}</small></button>` : `<button class="chip${first && k === 'supply' ? ' hintpulse' : ''}" data-k="${k}">${t}</button>`).join('')}</div><div class="ex">${L('只標「現在真的存在」的風險。標中＝有效預警。', 'Flag only risks that exist right now. A correct flag = a valid warning.')}</div></div>
        <div class="box4"><h3>${L('③ 需要<em>向老闆要什麼</em>', '③ Needs<em>What to ask the Boss for</em>')}</h3><div class="chips" id="needs"><button class="chip sel" data-n="none">${L('不需要', 'Nothing')}</button>${dp.extended ? '' : L('<button class="chip" data-n="extend">請延長 30 秒 <small>信任 −3</small></button>', '<button class="chip" data-n="extend">Extend 30s <small>Trust −3</small></button>')}</div></div>
        <div class="box4"><h3>${L('④ 預估<em>你的判斷</em>', '④ Forecast<em>Your call</em>')}</h3><div class="fact">${est.line}</div></div>
      </div>
      ${first ? L('<div class="tip"><b>第一次：</b>② 你看得到「頻寬已滿」，老闆看不到。<b>把它標紅</b> —— 不花任何資源，但失約時信任 <b>−12</b> 會變成 <b>−4</b>。</div>', `<div class="tip"><b>First time:</b> In ② you can see "Bandwidth maxed" — the Boss can't. <b>Flag it red.</b> It costs nothing, and if you miss the deadline, the Trust hit drops from <b>−12</b> to <b>−4</b>.</div>`) : ''}
      <div class="row"><button class="btn teal" id="send">${L('送出四格表', 'Send report')}</button><button class="btn ghost" id="cancel">${L('先不回報，回遊戲', 'Not now — back to game')}</button></div></div>`);
    const flags = new Set(); let need = 'none'; g.tag.reportedOnce = true;
    m.querySelectorAll('#risks .chip[data-k]').forEach(b => b.onclick = () => { const k = b.dataset.k; flags.has(k) ? flags.delete(k) : flags.add(k); b.classList.toggle('on', flags.has(k)); b.classList.remove('hintpulse'); SFX.play('click'); });
    m.querySelectorAll('#needs .chip').forEach(b => b.onclick = () => { need = b.dataset.n; m.querySelectorAll('#needs .chip').forEach(x => x.classList.toggle('sel', x === b)); SFX.play('click'); });
    m.querySelector('#cancel').onclick = () => Modal.hide();
    m.querySelector('#send').onclick = () => {
      Modal.hide(); dp.reported = true; dp.flags = [...flags]; dp.valid = dp.flags.filter(k => truth[k] === true);
      if (need === 'extend' && !dp.extended) { dp.extended = true; dp.deadline += 30; g.addTrust(-3, L('要求延期', 'Asked for an extension')); }
      if (dp.valid.length) { g.tag.validWarn++; g.light = 'yellow'; UI.alert(L('老闆看到黃燈 — 你事前預警了（標中）', 'The Boss sees amber — you warned early (on target)'), 'good'); }
      else if (dp.flags.length) UI.alert(L('你標的風險目前不成立 — 預警要標「現在看得到的」', "The risks you flagged aren't real right now — flag what you can actually see"), 'warn');
      else UI.feed(L('你回報了「一切順利」— 老闆的燈號是綠的', 'You reported "all good" — the Boss\'s light is green'), 'warn');
      SFX.play('ping');
    };
  },
};

function resolveDP(g) {
  const dp = g.dp, w = g.w; if (dp.resolved) return; dp.resolved = true; const ok = dp.done(w);
  let delta, label;
  if (ok) { delta = 6; label = L('達成', 'Achieved'); } else if (dp.valid.length) { delta = -4; label = L('未達成，但你事前預警了', 'Missed — but you warned early'); } else { delta = -12; label = L('未達成，而且沒有有效預警', 'Missed — with no valid warning'); }
  g.addTrust(delta, label); g.tag.results.push({ idx: dp.idx, ok, delta, label, warned: dp.valid.length > 0 }); g.emit('dpResolved', { ok, delta, label, idx: dp.idx });
  const s = dp.snap, before = w.trust - delta, lamp = dp.valid.length ? 'yellow' : 'green'; g.light = 'green';
  const m = Modal.show(`<div class="card"><div class="kicker">${L(`決策點 ${dp.idx + 1} 結算 · 換位子重看同一刻`, `Decision Point ${dp.idx + 1} Result · Switch seats and replay the same moment`)}</div>
    <h2>${ok ? '✔ ' : '✖ '}${label}</h2>
    <div class="stats"><div class="stat ${delta > 0 ? 'ok' : 'no'}"><b>♥ ${Math.round(before)} → ${Math.round(w.trust)}</b><span>${L('信任', 'Trust')} ${delta > 0 ? '+' : ''}${delta}</span></div><div class="stat ${dp.valid.length ? 'ok' : ''}"><b>${dp.valid.length ? L('有效', 'Valid') : dp.flags.length ? L('標錯', 'Wrong flag') : L('沒有', 'None')}</b><span>${L('事前預警', 'Early warning')}</span></div><div class="stat"><b><i class="lamp ${lamp}"></i>${LIGHT[lamp]}</b><span>${L('老闆看到的燈號', 'Light the Boss saw')}</span></div></div>
    <div class="swap"><div class="view"><h3>${L('你當時看到的 · PM 地面層', 'What you saw · PM, Ground layer')}</h3>${dp.pmLines(s)}</div><div class="view boss"><h3>${L('老闆當時看到的 · 軌道層', 'What the Boss saw · Orbit layer')}</h3>${dp.bossLines(s)}</div>${dp.engLines ? `<div class="view eng"><h3>${L('工程師當時看到的 · 執行層', 'What the Engineer saw · Execution layer')}</h3>${dp.engLines(s)}</div>` : ''}</div>
    <div class="lesson">${delta === -12 ? L('<b>沒有預警的失約 −12。</b>', '<b>A miss with no warning: −12.</b>') : delta === -4 ? L('<b>同樣失約，預警把 −12 變 −4</b>（止血三分之二，而且成本為零）。', '<b>Same miss, but the warning turned −12 into −4</b> (two-thirds of the damage avoided, at zero cost).') : L('<b>達成 +6。</b>但別忘了，要的是「標中的預警」——不是只要把事做完。', '<b>Achieved: +6.</b> But remember, the goal is an accurate early warning — not just getting the job done.')} ${L('老闆不是刁難你，他的畫面上真的沒有那個資訊。', "The Boss isn't out to get you — that information really isn't on his screen.")}</div>
    <div class="row"><button class="btn teal big" id="nx">${dp.nextLabel || L('繼續 ▶', 'Continue ▶')}</button></div></div>`);
  m.querySelector('#nx').onclick = () => { Modal.hide(); if (dp.onNext) dp.onNext(g); };
}

MISSIONS.push({
  id: 'm3', title: L('老闆看不到的 · 四層視野 + 信任', "What the Boss Can't See · Four Views + Trust"), blurb: L('同一場戰役，老闆、主管、PM、工程師看到的畫面都不一樣（迷霧也罩自己人）。學會用四格表「事前預警」，並且去聽工程師說。', 'Same battle, but the Boss, Manager, PM and Engineer each see a different screen (the fog covers your own side too). Learn to flag risks early with the 4-box report — and to listen to your engineers.'), limit: 0,
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
      { label: L('換位子', 'Switch Seats'), text: L('這關的主題：<em>同一場戰役，四個人看到的畫面都不一樣</em>', 'This mission: <em>one battle, four people, four different screens</em>'), sub: L('你現在是 PM（地面層）。老闆在「軌道層」，主管在「艦橋層」，工程師在最底下的「執行層」。先去老闆的位子看一眼。', "You're the PM (Ground layer). The Boss sits in the Orbit layer, the Manager in the Bridge layer, and the Engineer at the very bottom in the Execution layer. First, take a look from the Boss's seat."), ack: L('好，帶我去', 'OK, take me there'), target: () => null, enter: g => { g.unlocked.add('views'); } },
      { label: L('換位子', 'Switch Seats'), text: L('點 <em>老闆 Orbit</em>（或按 3）', 'Click <em>Boss</em> (or press 3).'), enter: g => { UI.show('views'); }, target: () => ({ ui: '[data-role=orbit]' }), ...role('orbit') },
      { label: L('換位子', 'Switch Seats'), text: L('迷霧也罩 <em>自己人</em>', 'The fog covers <em>your own side</em> too'), sub: L('老闆看不到你的團隊，只有 4 個數字。但<b>競品那格反而很清楚</b> —— 這是所有跨層溝通痛苦的來源。', "The Boss can't see your team — just 4 numbers. Yet <b>the rival's box is crystal clear</b>. That's the root of every cross-level communication headache."), enter: g => { const b = w.rival.b; R.focus(b.x + 1.5, b.y + 6, R.playZoom() * .82); setTimeout(() => R.focus((bcx(hubOf(w)) + b.x + 1.5) / 2, (bcy(hubOf(w)) + b.y + 1.5) / 2, R.playZoom() * .6), 1400); }, target: () => ({ ui: '#layer' }), ack: L('再去主管的位子', "Now the Manager's seat") },
      { label: L('換位子', 'Switch Seats'), text: L('點 <em>主管 Bridge</em>（或按 2）', 'Click <em>Manager</em> (or press 2).'), target: () => ({ ui: '[data-role=bridge]' }), ...role('bridge') },
      { label: L('換位子', 'Switch Seats'), text: g => { const behind = project(g.w, 'bridge').behind; return L(`主管看得到 <em>「落後 ${behind}%」</em>，看不到原因`, `The Manager sees <em>"${behind}% behind"</em> — but not why`); }, sub: L('原因是頻寬、技術債 —— 只有 PM 這層看得到。三個人要拼出完整圖像，只能靠講話，<b>這就是專案管理</b>。', "The causes — bandwidth, tech debt — are visible only at the PM layer. The only way three people can piece together the full picture is by talking. <b>That's project management.</b>"), target: () => ({ ui: '#layer' }), ack: L('回到我的位子', 'Back to my seat') },
      { label: L('換位子', 'Switch Seats'), text: L('點 <em>PM Ground</em>（或按 1）', 'Click <em>PM</em> (or press 1).'), target: () => ({ ui: '[data-role=ground]' }), ...role('ground') },
      { label: L('換位子', 'Switch Seats'), text: L('再往下一層：點 <em>工程師</em>（或按 4）', 'One level down: click <em>Engineer</em> (or press 4).'), sub: L('最後一個人 —— 真正動手的那位。', 'The last person — the one actually doing the work.'), target: () => ({ ui: '[data-role=engineer]' }), ...role('engineer') },
      { label: L('換位子', 'Switch Seats'), text: L('隧道視野 —— 他<em>只知道執行</em>', 'Tunnel vision — he <em>only knows execution</em>'), sub: L('資源列、任務目標全消失，只看得到身邊。他只收到「去採礦」，<b>沒有為什麼</b>；他覺得變慢了，卻不知道原因，也沒人問過他。<br><b>PM 不只向上翻譯給老闆，也要向下翻譯給工程師，並且主動去聽。</b>', `The resource bar and mission goals are gone — he only sees what's right around him. All he got was "go mine," <b>with no why</b>. He feels things slowing down but doesn't know why, and nobody has asked him.<br><b>A PM doesn't just translate up for the Boss — they translate down for engineers too, and go out of their way to listen.</b>`), target: () => ({ ui: '#layer' }), ack: L('回到我的位子', 'Back to my seat') },
      { label: L('換位子', 'Switch Seats'), text: L('點 <em>PM Ground</em>（或按 1）回來', 'Click <em>PM</em> (or press 1) to come back.'), target: () => ({ ui: '[data-role=ground]' }), ...role('ground') },
    ];
  },
  afterTutorial(g, skipped) {
    const w = g.w; g.unlocked.add('views'); UI.show('views'); UI.show('trust'); g.clockOn = false; R.focus(bcx(hubOf(w)), bcy(hubOf(w)) + 1, R.playZoom());
    setTimeout(() => { if (G.mission && G.mission.id === 'm3' && !G.dp && !G.over) startDP(G, 0); }, 350);
  },
  hud(g) {
    const w = g.w, dp = g.dp; if (!dp) return { title: L('MISSION 03 · 老闆看不到的', "MISSION 03 · What the Boss Can't See"), goal: L('教學：換位子看同一場戰役', 'Tutorial: switch seats, same battle'), sub: '' };
    const left = Math.max(0, Math.round(dp.deadline - w.t)), p = Math.round(clamp(dp.progress(w), 0, 1) * 100);
    return { title: L(`MISSION 03 · 決策點 ${dp.idx + 1} / 2`, `MISSION 03 · Decision Point ${dp.idx + 1} / 2`), goal: dp.resolved ? L('結算中…', 'Resolving…') : L(`老闆：<b>${dp.milestone}</b>　<span style="color:var(--dim);font-weight:400">${p}%</span>`, `Boss: <b>${dp.milestone}</b> <span style="color:var(--dim);font-weight:400">${p}%</span>`), sub: L(`有效預警 <b>${g.tag.validWarn}</b> / 2　·　信任 <b class="${w.trust < 50 ? 'bad' : ''}">${Math.round(w.trust)}</b>（需 ≥ 50）`, `Valid warnings <b>${g.tag.validWarn}</b> / 2 · Trust <b class="${w.trust < 50 ? 'bad' : ''}">${Math.round(w.trust)}</b> (need ≥ 50)`) };
  },
  clockText(g) { const dp = g.dp; return dp && !dp.resolved ? fmtTime(dp.deadline - g.w.t) : ''; },
  update(g, dt) {
    const dp = g.dp; if (!dp || dp.resolved) return; if (dp.done(g.w) || g.w.t >= dp.deadline) resolveDP(g);
  },
  debrief(g, win) {
    const w = g.w, r = g.tag.results, v = g.tag.validWarn;
    const why = win ? L('信任守住了，而且兩次預警都標中。', 'You held on to Trust, and both warnings were on target.') : (w.trust < 50 ? L('信任跌到 50 以下：老闆開始微管理，佔走你的管理頻寬。', 'Trust fell below 50: the Boss started micromanaging and ate into your management bandwidth.') : L('預警不夠：這關要求送出 2 次「標中」的預警 — 不是只要把事做完。', 'Not enough warnings: this mission requires 2 accurate early warnings — not just getting the job done.'));
    return {
      title: win ? L('你把老闆看不到的，塞進了四格', "You fit what the Boss can't see into four boxes") : L('信任或預警不足', 'Not enough Trust or warnings'), kicker: win ? 'MISSION COMPLETE' : 'MISSION FAILED',
      stats: [{ label: L('信任', 'Trust'), val: '♥ ' + Math.round(w.trust), ok: w.trust >= 50 }, { label: L('有效預警', 'Valid warnings'), val: v + ' / 2', ok: v >= 2 }, ...r.map(x => ({ label: L(`決策點 ${x.idx + 1}`, `Decision Point ${x.idx + 1}`), val: x.ok ? L('達成', 'Achieved') : x.warned ? L('失約·有預警', 'Missed · warned') : L('失約·無預警', 'Missed · no warning'), ok: x.ok ? true : x.warned ? undefined : false }))],
      body: `<p>${why}</p>`,
      lesson: L(`<b>信任是一條會反饋回產能的資源線：</b>≥80 少管你；<50 老闆開始微管理（佔你的 ▤）；<30 每 30 秒索取報告。死亡螺旋的唯一斷點是<b>事前預警</b> — 不花資源、成本永遠是零，把「未預警失約 −12」變成「−4」。<br><br><b>三層視野：</b>老闆對競品的了解常比對自己團隊還清楚，因為競品資訊直接進來、自家資訊要穿過三層。他不是刁難你 — 他的畫面上真的沒有那個資訊。<br><br><a href="${SPEC_URL}" target="_blank" rel="noopener" style="color:var(--teal)">完整教材規格書 ↗</a>`, `<b>Trust is a resource line that feeds back into capacity:</b> ≥80, the Boss leaves you alone; <50, he starts micromanaging (eating your ▤); <30, he demands a report every 30s. The only way out of that death spiral is an <b>early warning</b> — it costs no resources, ever, and turns "missed with no warning −12" into "−4".<br><br><b>Three views:</b> the Boss often knows the rival better than his own team, because news about the rival reaches him directly while news from his own team has to pass through three layers. He isn't out to get you — that information really isn't on his screen.<br><br><a href="${SPEC_URL}" target="_blank" rel="noopener" style="color:var(--teal)">Full course spec ↗</a>`),
    };
  },
});
