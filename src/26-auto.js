/* ── PM 自動駕駛：觀戰模式由它操作我方，也是校平衡的「合理打法」基準線 ───────────
   只用玩家也能下的指令（cmd*）。每個決定都附一句「為什麼」，觀戰導播拿去當字幕。 */
const Auto = {
  init(w, o = {}) { w.auto = { t: 0, slow: 0, notes: [], said: {}, scout: null, rally: { x: 13.6, y: 15.8 }, target: null, lastPush: -99, skill: o.skill || 1 }; },
  say(w, key, text, x, y, cd = 40) { // 同一類字幕 cd 秒內不重複
    const A = w.auto; if (A.said[key] && w.t - A.said[key] < cd) return; A.said[key] = w.t;
    A.notes.push({ t: w.t, key, text, x, y }); if (A.notes.length > 30) A.notes.shift(); EMIT('autoNote', { key, text, x, y });
  },
  spot(w, type, near) { // 找一塊四周留一格走道的空地
    const d = BLD[type], c = near || { x: 12.5, y: 18.5 }; let best = null, bd = 1e9;
    for (let y = 1; y < N - d.h - 1; y++) for (let x = 1; x < N - d.w - 1; x++) {
      const dist = Math.hypot(x + d.w / 2 - c.x, y + d.h / 2 - c.y); if (dist > 9 || dist >= bd) continue;
      let ok = canPlace(w, type, x, y);
      for (let j = y - 1; ok && j <= y + d.h; j++) for (let i = x - 1; ok && i <= x + d.w; i++) if (inb(i, j) && w.blocked[j * N + i]) ok = false;
      if (ok && w.patches.some(p => Math.hypot(p.x + .5 - (x + d.w / 2), p.y + .5 - (y + d.h / 2)) < 2.6)) ok = false;
      if (ok) { best = { x, y }; bd = dist; }
    }
    return best;
  },
  worker(w, near) { const ms = engs(w).filter(u => u.o.t === 'mine' || u.o.t === 'idle'); if (!near) return ms[0]; return ms.sort((a, b) => Math.hypot(a.x - near.x, a.y - near.y) - Math.hypot(b.x - near.x, b.y - near.y))[0]; },
  build(w, type, why) {
    const s = this.spot(w, type); if (!s) return false; const u = this.worker(w, { x: s.x, y: s.y }); if (!u) return false;
    const r = cmdBuild(w, u, type, s.x, s.y); if (r.ok) this.say(w, 'b-' + type, why, s.x + 1, s.y + 1, 5); return r.ok;
  },
  step(w, dt) {
    const A = w.auto; if (!A || !hubOf(w)) return; A.t -= dt; if (A.t > 0) return; A.t = 1;
    this.economy(w); if (w.war) this.army(w);
  },
  economy(w) {
    const A = w.auto, hub = hubOf(w), es = engs(w), used = supplyUsed(w), cap = supplyCap(w);
    const has = t => w.blds.some(b => b.type === t && b.team === 0), built = t => w.blds.find(b => b.type === t && b.team === 0 && b.built), site = t => w.blds.some(b => b.type === t && b.team === 0 && !b.built);
    for (const u of es) if (u.o.t === 'idle' && u !== A.scout) { const p = nearestPatch(w, u.x, u.y); if (p) cmdMine(w, [u], p); }
    for (const s of w.blds.filter(b => !b.built && b.team === 0)) if (!siteWorkers(w, s).length) { const u = this.worker(w, { x: bcx(s), y: bcy(s) }); if (u) cmdBuildSite(w, [u], s); }
    // 開場偵察：派一個工程師繞一圈據點，回來繼續採（PM 第一件事是「先看清楚」）
    if (!A.scouted && w.t > 6 && w.nodes) {
      const u = es.find(u => u.o.t === 'mine'); if (u) { A.scouted = true; A.scout = u; A.scoutPath = ['niche', 'mass-n', 'mass-s'].map(k => w.nodes.find(n => n.key === k)).filter(Boolean); A.scoutAt = w.t; this.say(w, 'scout', L('派一個工程師去看據點 —— 沒偵察過的地方，PM 的畫面上也是「？」', 'Sending an Engineer to scout the zones — anywhere unscouted is a "?" on the PM\'s screen too'), u.x, u.y); }
    }
    if (A.scout) {
      const u = A.scout; if (!w.byId.get(u.id)) A.scout = null;
      else if (u.o.t !== 'move' || !u.path.length) { const n = A.scoutPath.shift(); if (n && w.t - A.scoutAt < 70) cmdMove(w, [u], n.x - 1.5, n.y + 1.5); else { A.scout = null; cmdMine(w, [u], nearestPatch(w, u.x, u.y)); } }
    }
    const reserve = w.dpRisk ? 0 : 0;
    // 1) 頻寬快滿 → 先蓋協作制度（Supply Block 的解法是提前，不是事後）
    if (cap - used <= 2 && !site('comms') && w.ore >= bldCost(w, 'comms')) this.build(w, 'comms', L(`頻寬 ▤ ${used}/${cap} 快滿了 → 先蓋協作制度。等卡住才蓋，就是 Supply Block`, `Bandwidth ▤ ${used}/${cap} almost full → build a Comms Layer now. Wait until you're stuck and it's a Supply Block`));
    // 2) 第一座開發小隊
    if (!has('squad') && w.ore >= bldCost(w, 'squad') && (es.length >= 9 || w.t > 25)) this.build(w, 'squad', L('蓋開發小隊：沒有功能，就搶不到市場', 'Building a Dev Squad: no Features, no market'));
    // 3) 工程師補到 14 人
    const engT = w.t < 150 ? 12 : 15;
    if (es.length < engT && hub.queue.length < 1 && used + 1 <= cap && w.ore >= 50 + reserve && (!has('squad') ? w.ore >= 50 : true)) cmdTrain(w, hub, PACE.normal, 'eng');
    // 4) 監控中心：沒有 Detector，技術債是隱形的
    if (has('squad') && !has('obs') && w.t > 170 && w.ore >= 125) this.build(w, 'obs', L('蓋監控中心：沒有 Detector，技術債是隱形的 —— 看不到就管不到', 'Building Observability: without a Detector, tech debt is invisible — you can\'t manage what you can\'t see'));
    // 5) 平台組
    if (built('squad') && !has('plat') && w.t > 200 && w.ore >= 160) this.build(w, 'plat', L('蓋平台組：企業客戶需要平台功能，而且平台功能讓全隊戰力 +15%', 'Building a Platform Team: Enterprise needs Platform Features, and they give the whole army +15% power'));
    // 6) 研發中心（中期投資）
    if (built('comms') && !has('lab') && w.t > 330 && w.ore >= 260 && built('plat')) this.build(w, 'lab', L('中期投資：蓋研發中心。研發期間產出會掉 —— 要先跟老闆講', 'Mid-game investment: building an R&D Lab. Output dips during research — tell the Boss first'));
    // 7) 出兵
    // 錢堆著不用＝浪費：存款多就加開第二座小隊、提高兵力上限
    const nSq = w.blds.filter(b => b.type === 'squad' && b.team === 0).length;
    if (nSq < 2 && built('squad') && w.ore >= 700 && w.t > 300) this.build(w, 'squad', L(`存款 ●${Math.floor(w.ore)} 堆著不用＝浪費 → 加開第二座開發小隊，產能翻倍`, `●${Math.floor(w.ore)} sitting idle in the bank = waste → opening a second Dev Squad to double output`));
    const armyCap = Math.min(36, 22 + Math.floor(w.ore / 300) * 2), pCap = rivalMult(w) > 1.3 ? 3 : 2;
    const pl = built('plat');
    if (pl && w.units.filter(u => u.team === 0 && u.type === 'pfeat').length + pl.queue.length < pCap && used + 2 <= cap && w.ore >= 125) cmdTrain(w, pl, PACE.normal);
    for (const sq of w.blds.filter(b => b.type === 'squad' && b.team === 0 && b.built)) if (ourArmy(w).length + sq.queue.length < armyCap) { let k = 0; while (sq.queue.length < 2 && supplyUsed(w) + 1 <= supplyCap(w) && w.ore >= 50 && k++ < 2) if (!cmdTrain(w, sq, PACE.normal).ok) break; }
    // 8) 還債：看得到才還；還債的人會自己回去採
    if (w.detected && debtTotal(w) >= 3 && w.units.filter(u => u.team === 0 && u.o.t === 'repay').length < 2) {
      const d = w.debts.slice().sort((a, b) => b.pts - a.pts)[0], us = es.filter(u => u.o.t === 'mine').sort((a, b) => uDist(a, d) - uDist(b, d)).slice(0, 2);
      if (d && us.length) { cmdRepay(w, us, d); this.say(w, 'repay', L(`技術債 ${Math.ceil(debtTotal(w))} 點：派兩個人去還。債會讓每趟產出變少、功能也打不贏`, `Tech debt at ${Math.ceil(debtTotal(w))} pts: sending two people to pay it down. Debt shrinks every mining trip and makes Features lose fights`), d.x, d.y, 60); }
    }
    // 9) 研發：平台化架構 > 流程改善 > 自動化測試；2 人研發，做完召回
    const lab = labOf(w);
    if (lab) {
      if (!w.tech.cur) { for (const id of ['arch', 'proc', 'test', 'ci']) { const p = TECH.find(t => t.id === id), st = techStatus(w, p); if (!st.maxed && !st.locked && w.ore >= st.next.cost + 80) { if (cmdTechStart(w, id).ok) { this.say(w, 'tech', L(`研發「${p.name}」：${p.fx}`, `Researching "${p.name}": ${p.fx}`), bcx(lab), bcy(lab), 5); break; } } } }
      const asg = labAssigned(w, lab).length;
      if (w.tech.cur && asg < 2) { const u = this.worker(w, { x: bcx(lab), y: bcy(lab) }); if (u) cmdResearch(w, [u], lab); }
      if (!w.tech.cur && asg) cmdRecall(w, lab, asg);
    }
  },
  army(w) {
    const A = w.auto, us = ourArmy(w), fs = us.filter(u => u.type === 'feat'), ps = us.filter(u => u.type === 'pfeat'), m = ourMult(w);
    const est = n => nodeVisible(w, n) ? n.emP : n.seenAt > 0 ? n.seenEm + Math.min(15, (w.t - n.seenAt) / 8) : 25;
    // 守軍：每個我方據點留 2 個（REDMOND 會吸收「戰力 < 20」的據點）
    const gar = new Map(); for (const n of w.nodes) gar.set(n.id, []);
    for (const u of fs) if (u.job && u.job.startsWith('g:')) { const n = w.byId.get(+u.job.slice(2)); if (n && n.owner === 0) gar.get(n.id).push(u); else u.job = null; }
    for (const n of w.nodes.filter(n => n.owner === 0)) {
      const g = gar.get(n.id), need = 2 - g.length;
      for (let i = 0; i < need; i++) { const c = fs.filter(u => !u.job && uDist(u, n) < 6).sort((a, b) => uDist(a, n) - uDist(b, n))[0]; if (!c) break; c.job = 'g:' + n.id; g.push(c); cmdAttackMove(w, [c], n.x + (w.rng() - .5), n.y + (w.rng() - .5)); }
      for (const u of g) if (u.o.t === 'idle' && uDist(u, n) > NODE_R - .3) cmdAttackMove(w, [u], n.x, n.y);
    }
    const strike = fs.filter(u => !u.job), sp = strike.length * FEAT_POWER * m;
    if (!strike.length) return;
    const cen = strike.reduce((a, u) => ({ x: a.x + u.x / strike.length, y: a.y + u.y / strike.length }), { x: 0, y: 0 });
    // 撤退：正在打、而且局部打不贏 → 一般移動撤回（不還手地跑）
    const near = w.units.filter(u => u.team === 1 && u.type === 'efeat' && Math.hypot(u.x - cen.x, u.y - cen.y) < 5 && tileVis(w, u.x, u.y)), ep = near.length * FEAT_POWER * rivalMult(w);
    const ally = us.filter(u => Math.hypot(u.x - cen.x, u.y - cen.y) < 5).length * FEAT_POWER * m;
    if (ep > ally * 1.5 && ep > 15 && w.t - A.lastPush > 4) {
      cmdMove(w, strike, A.rally.x, A.rally.y); A.target = null; A.lastPush = w.t;
      this.say(w, 'retreat', L(`打不贏就撤：對手 ${Math.round(ep)} vs 我方 ${Math.round(ally)}。保住單位，比硬拚一個據點划算`, `Can't win this one, so pull back: rival ${Math.round(ep)} vs us ${Math.round(ally)}. Saving units beats forcing a single zone`), cen.x, cen.y, 30); return;
    }
    // 防守：我方據點正被打 → 先救
    const hurt = w.nodes.filter(n => n.owner === 0 && nodeVisible(w, n) && n.emP > n.ourP).sort((a, b) => b.yield - a.yield)[0];
    if (hurt && sp >= hurt.emP * .9) { if (A.target !== hurt.id) { A.target = hurt.id; cmdAttackMove(w, strike, hurt.x, hurt.y); ps.forEach(p => cmdAttackMove(w, [p], hurt.x, hurt.y)); this.say(w, 'defend', L(`${hurt.name} 被攻擊 → 主力回防`, `${hurt.name} under attack → main force falls back to defend`), hurt.x, hurt.y, 15); } return; }
    // 進攻：挑「打得贏、又值錢」的據點
    let best = null, bs = -1e9;
    for (const n of w.nodes) {
      if (n.owner === 0 && n.emP <= n.ourP) continue; if (n.ent && platCount(w) < 1) continue;
      const e = est(n); if (sp < e * 1.3 + 8) continue;
      const s = n.yield * 12 - e * .4 - Math.hypot(n.x - cen.x, n.y - cen.y) * .5; if (s > bs) { bs = s; best = n; }
    }
    if (best) {
      if (A.target !== best.id || strike.some(u => u.o.t === 'idle' && uDist(u, best) > NODE_R + 1)) {
        const fresh = A.target !== best.id; A.target = best.id; cmdAttackMove(w, strike.filter(u => fresh || u.o.t === 'idle'), best.x, best.y); if (fresh) ps.forEach(p => cmdAttackMove(w, [p], best.x - .6, best.y + .6));
        if (fresh) { const e = est(best); this.say(w, 'attack', L(`出兵 ${strike.length} 個功能 → ${best.name}（估計對手 ${nodeVisible(w, best) || best.seenAt > 0 ? Math.round(e) : '?'}，我方 ${Math.round(sp)}）。先算過才打`, `Sending ${strike.length} ${strike.length === 1 ? 'Feature' : 'Features'} → ${best.name} (rival est. ${nodeVisible(w, best) || best.seenAt > 0 ? Math.round(e) : '?'}, us ${Math.round(sp)}). Do the math before you fight`), best.x, best.y, 8); }
      }
    } else {
      // 打不過任何地方：集結等兵（也是一種決策）
      if (A.target != null || strike.some(u => u.o.t === 'idle' && Math.hypot(u.x - A.rally.x, u.y - A.rally.y) > 3)) { A.target = null; cmdAttackMove(w, strike.filter(u => u.o.t === 'idle' || u.o.t === 'amove'), A.rally.x, A.rally.y); }
      if (strike.length >= 3) this.say(w, 'mass', L(`兵力 ${Math.round(sp)} 還不夠打任何據點 → 先集結。不急著送頭`, `Power ${Math.round(sp)} can't take any zone yet → mass up first. No rushing in to feed the enemy`), A.rally.x, A.rally.y, 60);
    }
    // 交給守軍：抵達目標、而且已佔領的據點，挑幾個留下
  },
};
