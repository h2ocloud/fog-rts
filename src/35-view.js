/* ── 視野投影：同一份世界 → 三種畫面（教材核心）。純讀取、無副作用 ─────────────────
   project(w, 'orbit')  老闆：4 個聚合數字 + 對手「結論卡」；沒有頻寬、建造佇列、技術債、個別工程師
   project(w, 'bridge') 主管：聚合指標 + 雙邊戰力對比；看得到「落後」，看不到原因
   project(w, 'ground') PM：己方全知；技術債只有蓋了 Detector 才有；對手只有偵察過的快照        */
function rivalPower(w) { return 98 + w.t * .12; }
function ourPower(w) { return engs(w).length * 10 * effMult(w); }
function project(w, role, g) {
  const us = engs(w), n = us.length, debt = debtTotal(w), used = supplyUsed(w), cap = supplyCap(w);
  const mining = us.filter(u => u.o.t === 'mine').length;
  if (role === 'orbit') {
    return {
      role, cash: Math.round(w.ore * 10000), people: w.units.filter(u => u.team === 0).length, share: w.nodes ? marketShare(w) : null,
      milestone: g && g.dp ? { text: g.dp.milestone, pct: clamp(g.dp.progress(w), 0, 1), left: Math.max(0, g.dp.deadline - w.t) } : { text: L('Q4 董事會', 'Q4 board meeting'), pct: .2, left: 0 },
      light: g && g.light || 'green',
      enemy: { headline: w.persona ? w.persona.headline(w.t) : L('競品已上線「即時協作」', 'Rival shipped ‘Live Collab’'), source: L('市場報告', 'market report'), delayS: 60, sharp: true },
    };
  }
  if (role === 'bridge') {
    const pf = Math.min(.45, .15 * platCount(w)), fpow = feats(w).filter(u => u.type === 'feat').length * FEAT_POWER * (1 + pf) * archPower(w) * effMult(w);
    const our = w.nodes ? fpow : ourPower(w), riv = w.nodes && w.persona ? w.nodes.reduce((a, nd) => a + Math.max(0, w.persona.pow(nd, w.t, w)), 0) / 2 : rivalPower(w);
    return {
      role, efficiency: Math.round(100 * effMult(w) * (n ? mining / n : 0)), behind: Math.max(0, Math.round((riv - our) / riv * 100)), ourPower: Math.round(our), rivalPower: Math.round(riv),
      shared: w.nodes ? { us: ownedNodes(w), em: w.nodes.filter(nd => nd.owner === 1).length } : null,
      state: engs(w).some(u => u.o.t === 'build') || w.blds.some(b => !b.built) ? L('產能建設中', 'Building capacity') : L('運轉中', 'Running'),
    };
  }
  if (role === 'engineer') {
    const u = g && g.engFocus ? g.engFocus() : engs(w)[0]; if (!u) return { role, none: true };
    const near = o => Math.hypot(o.x - u.x, o.y - u.y) < ENG_SIGHT, fr = w.debts.filter(d => Math.hypot(d.x - u.x, d.y - u.y) < ENG_SIGHT + .3);
    const per = CHUNK * effMult(w) * mineMult(w), o = u.o;
    const task = o.t === 'mine' ? (o.ph === 'work' ? L('採集中', 'Mining') : o.ph === 'back' ? L('扛著東西送回去', 'Hauling it back') : L('走去礦點', 'Walking to the ore field')) : o.t === 'build' ? L('蓋一座建築', 'Putting up a building') : o.t === 'repay' ? L('處理那一塊卡點', 'Working on that blocker') : o.t === 'research' ? L('研發：', 'R&D: ') + (w.tech.cur ? w.tech.cur.name : L('（沒有指定專案）', '(no project assigned)')) : o.t === 'move' ? L('走到指定位置', 'Walking to the marked spot') : L('沒事做（沒人給我票）', 'Nothing to do (nobody gave me a ticket)');
    return { role, id: u.id, task, lastOrder: u.lastOrder || null, trip: +per.toFixed(1), full: CHUNK, slowed: per < CHUNK - .05, mates: w.units.filter(x => x !== u && x.team === 0 && near(x)).length, friction: Math.ceil(fr.reduce((a, d) => a + d.pts, 0) - 1e-6), blobs: fr.length, cd: Math.max(0, Math.ceil((u.reportCd || 0) - w.t)) };
  }
  const r = w.rival;
  return {
    role, workers: n, supply: { used, cap }, ore: Math.floor(w.ore), rate: w.rate,
    debt: w.detected ? Math.ceil(debt - 1e-6) : null,
    enemy: r ? { seenAgoS: r.seenAt < 0 ? null : Math.round(w.t - r.seenAt) } : null,
  };
}

/* 老闆 AI：整份輸入只有老闆那一份投影。他不合理，是因為他的視野不合理，不是因為劇本要他不合理 */
function bossOrder(w, g, idx, opt = {}) {
  const v = project(w, 'orbit', g), M = (v.cash / 1e6).toFixed(1);
  const seen = L(`我的畫面上：現金 NT$${M}M · 人數 ${v.people} · 燈號 ${{ green: '綠', yellow: '黃', red: '紅' }[v.light]}。`, `On my screen: cash NT$${M}M · headcount ${v.people} · light ${{ green: 'green', yellow: 'amber', red: 'red' }[v.light]}. `);
  if (idx === 0) return { key: 'headcount', who: L('老闆 · 季初指令', 'Boss · start-of-quarter order'), say: L('錢夠就該加人。本季把團隊加到 ' + (v.people + 6) + ' 人。', 'We have the money, so hire. Get the team to ' + (v.people + 6) + ' people this quarter.'), why: seen + L('<b>沒有「管理頻寬」這一格</b> — 在我看來，加人只是花錢。', '<b>There\'s no "management bandwidth" box</b> — from where I sit, hiring just costs money.'), target: v.people + 6, secs: 110, milestone: L(`團隊 ${v.people + 6} 人`, `Team of ${v.people + 6}`) };
  return { key: 'cash', who: L('老闆 · 季中指令', 'Boss · mid-quarter order'), say: L('競品已經上線了，全面趕工。季末我要看到現金到 NT$' + (((v.cash + opt.cashGain) / 1e6).toFixed(1)) + 'M。', 'The competition already shipped — all-out crunch. By quarter end I want cash at NT$' + (((v.cash + opt.cashGain) / 1e6).toFixed(1)) + 'M.'), why: seen + L('競品那格我看得很清楚 — 他們做得到，我們為什麼慢？<b>我看不到技術債。</b>', 'I can see the competitor box just fine — they pulled it off, so why are we slow? <b>I can\'t see tech debt.</b>'), cashGain: opt.cashGain, secs: 150, milestone: L('現金目標', 'Cash target') };
}
