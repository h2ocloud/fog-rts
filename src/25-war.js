/* ── v6 市場戰爭：雙方功能單位真的交戰；對手有預算、生產、守備、偵察、出兵與反攻 ─────────────
   功能＝產品在市場上的戰力。我方戰力 × (1 − 技術債拖慢)：債越多，同樣的功能越打不贏。
   對手的行為不是難度旋鈕，是人設：它當年犯的錯，寫成一條規則（見 83-freeplay 的 PERSONAS[].ai）。 */
const WAR = { range: 1.9, acquire: 3.8, leash: 5.5, cd: .75, dmg: 6, hp: 60, phpMax: 110, pdmg: 3, aura: 3.0, auraK: .25, heal: 7, regen: 2.5 };
const isCombat = u => u.type === 'feat' || u.type === 'pfeat' || u.type === 'efeat';
const rivalArmy = w => w.units.filter(u => u.team === 1 && u.type === 'efeat');
const ourArmy = w => w.units.filter(u => u.team === 0 && (u.type === 'feat' || u.type === 'pfeat') && u.sunset == null);
const uDist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const tileVis = (w, x, y) => w.vis[clamp(Math.floor(y), 0, N - 1) * N + clamp(Math.floor(x), 0, N - 1)] === 2;
function ourMult(w) { const pf = Math.min(.45, .15 * platCount(w)); return (1 + pf) * archPower(w) * effMult(w); }
function rivalMult(w) { const A = w.persona && w.persona.ai; return A ? A.pow(w.t, w) * (w.diff ? w.diff.pow : 1) : 1; }
const aiVal = (v, t) => typeof v === 'function' ? v(t) : v;
function initHp(u) { if (u.hp == null || u.hp !== u.hp) { u.maxHp = u.maxHp || (u.type === 'pfeat' ? WAR.phpMax : WAR.hp); u.hp = u.maxHp; u.cd = u.cd || 0; u.lastHit = u.lastHit == null ? -99 : u.lastHit; } }

function initWar(w) {
  const A = w.persona.ai;
  w.war = { bank: A.bank0 || 0, prodT: 2, think: 1, lastWave: -999, lastScout: 0, seen: {}, seenT: -999, made: 0, kills: 0, losses: 0, heat: 0, alertAt: -99, react: null, waves: 0, shots: [] };
  for (const [key, cnt] of Object.entries(A.start || {})) {
    const n = w.nodes.find(x => x.key === key); if (!n) continue;
    for (let i = 0; i < cnt; i++) { const a = i / cnt * 6.28 + w.rng(), u = spawnRival(w, n.x + Math.cos(a) * 1.1, n.y + Math.sin(a) * 1.1); u.job = 'g:' + n.id; u.spawnT = 1; u.anchor = { x: u.x, y: u.y }; }
    n.owner = 1; n.bal = 0;
  }
}
function spawnRival(w, x, y) {
  const A = w.persona.ai, b = w.rival.b, door = x == null;
  const u = addUnit(w, door ? b.x + b.w + .45 : x, door ? b.y + 1.5 + (w.rng() - .5) * 1.2 : y, 1, 'efeat');   // 出口在基地東側（不會一出門就被據點上的守軍堵）
  u.maxHp = WAR.hp * (A.hpMul ? A.hpMul(w.t) : 1); u.hp = u.maxHp; u.cd = w.rng() * .5; u.spawnT = door ? 0 : 1; u.job = null; u.lastHit = -99; w.war.made++;
  if (door && tileVis(w, u.x, u.y)) { FX.ring(u.x, u.y, .8, COL.rival); SFX.play('spawn', sndAt(u)); }
  return u;
}
function killUnit(w, u, by) {
  const i = w.units.indexOf(u); if (i < 0) return; w.units.splice(i, 1); w.byId.delete(u.id);
  const col = u.team === 0 ? (u.type === 'pfeat' ? COL.violet : COL.amber) : COL.rival, seen = tileVis(w, u.x, u.y);
  if (u.team === 0) w.war.losses++; else w.war.kills++;
  if (seen) {
    FX.burst(u.x, u.y, 14, col, by ? 18 : 8); FX.ring(u.x, u.y, 1.1, col, .6);
    if (by) { if (R.shake) R.shake(u.team === 0 ? 5 : 3); SFX.play('boom', sndAt(u)); } else FX.float(u.x, u.y, L('資金見底・解散', 'Out of cash · disbanded'), '#ff9f8c', 30);
  }
  EMIT('unitDied', { u, team: u.team, by: by ? by.team : null });
}
function sndAt(u) { // 依畫面位置給聲像與距離衰減
  if (typeof R === 'undefined' || !R.vw) return undefined; const s = R.t2s(u.x, u.y); const dx = (s.x - R.vw / 2) / (R.vw / 2), dy = (s.y - R.vh / 2) / (R.vh / 2);
  return { pan: clamp(dx * .8, -1, 1), vol: clamp(1.15 - Math.hypot(dx, dy) * .5, .12, 1) };
}
function nearestEnemy(w, u, range) {
  let best = null, bd = range;
  for (const o of w.units) {
    if (o.team === u.team || !isCombat(o) || o.sunset != null) continue;
    if (u.team === 0 && !tileVis(w, o.x, o.y)) continue;
    const d = uDist(u, o) + (o.type === 'pfeat' ? .6 : 0); if (d < bd) { bd = d; best = o; }   // 平台功能較耐打，敵方先打一般功能
  }
  return best;
}
function shoot(w, u, t) {
  const mult = u.team === 0 ? ourMult(w) : rivalMult(w);
  let dmg = (u.type === 'pfeat' ? WAR.pdmg : WAR.dmg) * mult;
  if (t.team === 0 && w.units.some(p => p.team === 0 && p.type === 'pfeat' && p !== t && p.sunset == null && uDist(p, t) < WAR.aura)) dmg *= 1 - WAR.auraK;
  initHp(t); t.hp -= dmg; t.hitFx = .12; t.lastHit = w.t; u.lastHit = Math.max(u.lastHit || -99, w.t - 3);
  w.war.heat = Math.min(1.2, w.war.heat + .02); w.war.shots.push({ x: t.x, y: t.y, t: w.t });
  const seen = tileVis(w, t.x, t.y) || tileVis(w, u.x, u.y);
  if (seen) { FX.beam(u.x, u.y, t.x, t.y, u.team === 0 ? (u.type === 'pfeat' ? COL.violet : COL.amber) : COL.rival); SFX.play(u.team === 0 ? 'zap' : 'hit', sndAt(u)); }
  if (t.team === 0 && w.t - w.war.alertAt > 10) {
    w.war.alertAt = w.t; const n = w.nodes && w.nodes.find(n => uDist(n, t) < NODE_R + 1.5);
    EMIT('underAttack', { x: t.x, y: t.y, node: n || null });
  }
  if (t.hp <= 0) killUnit(w, t, u);
}

/* 指令：攻擊移動（沿路遇敵就打，打完繼續走） */
function cmdAttackMove(w, us, x, y) {
  us.forEach((u, i) => {
    const a = i * 2.4, r = us.length > 1 ? .45 + .3 * Math.sqrt(i) : 0, tx = clamp(x + Math.cos(a) * r, .5, N - .5), ty = clamp(y + Math.sin(a) * r, .5, N - .5);
    u.o = { t: 'amove', dest: { x: tx, y: ty } }; u.prev = null; u.tgt = null; u.anchor = null; u.path = findPath(w, u.x, u.y, tx, ty) || [];
    if (u.team === 0) u.lastOrder = { text: L('去那邊跟對手搶市場', 'Go take that market from the rival'), at: w.t };
  });
}

function combatStep(w, dt) {
  const base = w.rival.b, bx = base.x + 1.5, by = base.y + 1.5, A = w.persona.ai, burn = !!(A.decay && A.decay(w.t) > 0);
  for (const u of w.units) {
    if (!isCombat(u) || u.sunset != null) continue;
    initHp(u);
    u.cd = Math.max(0, u.cd - dt); if (u.hitFx > 0) u.hitFx -= dt;
    if (u.team === 1 && burn) { if (u.job === 'retreat') u.job = null; }   // 燒錢中：不回血
    else if (u.team === 1 && Math.hypot(u.x - bx, u.y - by) < 3.6) { u.hp = Math.min(u.maxHp, u.hp + WAR.heal * dt); if (u.job === 'retreat' && u.hp >= u.maxHp * .95) u.job = null; }
    else if (w.t - (u.lastHit || -99) > 6) u.hp = Math.min(u.maxHp, u.hp + WAR.regen * dt);
    const o = u.o;
    if (o.t === 'retreat') { u.tgt = null; if (!u.path.length) { u.o = { t: 'idle' }; u.anchor = { x: u.x, y: u.y }; } continue; }
    if (o.t === 'move') { u.tgt = null; u.anchor = null; continue; }   // 一般移動：不還手（星海的 move vs attack-move）
    if (o.t !== 'idle' && o.t !== 'amove') continue;
    if (o.t === 'idle' && !u.anchor) u.anchor = { x: u.x, y: u.y };
    let t = u.tgt ? w.byId.get(u.tgt) : null;
    if (t && (t.hp <= 0 || uDist(u, t) > WAR.acquire + 1.4 || (u.team === 0 && !tileVis(w, t.x, t.y)))) t = null;
    if (!t || u.cd <= 0) { const nt = nearestEnemy(w, u, WAR.acquire); if (nt && (!t || uDist(u, nt) < uDist(u, t) - .8)) t = nt; }
    u.tgt = t ? t.id : null;
    if (!t) {
      if (o.t === 'amove' && !u.path.length) { if (Math.hypot(u.x - o.dest.x, u.y - o.dest.y) > .9) u.path = findPath(w, u.x, u.y, o.dest.x, o.dest.y) || []; if (!u.path.length) { u.o = { t: 'idle' }; u.anchor = { x: u.x, y: u.y }; } }
      else if (o.t === 'idle' && u.anchor && Math.hypot(u.x - u.anchor.x, u.y - u.anchor.y) > 1 && !u.path.length) u.path = findPath(w, u.x, u.y, u.anchor.x, u.anchor.y) || [];
      continue;
    }
    const d = uDist(u, t);
    if (d <= WAR.range) {
      u.path = []; u.face = faceTo(u, t.x, t.y);
      if (u.cd <= 0) { shoot(w, u, t); u.cd = WAR.cd * (u.type === 'pfeat' ? 1.4 : 1) * (.9 + w.rng() * .2); }
    } else {
      if (o.t === 'idle' && u.anchor && Math.hypot(t.x - u.anchor.x, t.y - u.anchor.y) > WAR.leash) { u.tgt = null; continue; }
      u.repath = (u.repath || 0) - dt; if (!u.path.length || u.repath <= 0) { u.repath = .5; u.path = findPath(w, u.x, u.y, t.x, t.y) || []; }
    }
  }
}

/* ── 對手 AI：每 2.5 秒想一次。它只知道它「看得到」的東西 ── */
const rivalStage = w => ({ x: Math.min(N - 1.2, w.rival.b.x + w.rival.b.w + 1.6), y: w.rival.b.y + .6 });
function rivalSees(w, n) { return n.owner === 1 || w.units.some(u => u.team === 1 && u.type === 'efeat' && uDist(u, n) < 5.5); }
function rivalThink(w) {
  const war = w.war, A = w.persona.ai, army = rivalArmy(w), b = w.rival.b, stage = rivalStage(w);
  // 情報：它眼中的我方戰力。ESPOO 的評估模型很久才更新一次，而且不把新兵種算進去
  if (!A.staleObs || w.t - war.seenT >= A.staleObs) {
    war.seenT = w.t;
    for (const n of w.nodes) if (rivalSees(w, n)) {
      let p = 0; for (const u of w.units) if (u.team === 0 && u.sunset == null && uDist(u, n) < NODE_R + 1) { if (u.type === 'feat') p += FEAT_POWER * ourMult(w); else if (u.type === 'pfeat' && !A.ignoreNew) p += FEAT_POWER * .8; }
      war.seen[n.id] = { p, t: w.t };
    }
  }
  const est = n => war.seen[n.id] ? war.seen[n.id].p : (A.assumeUnknown || 0);
  // 1) 撤退：血少回基地補（REDMOND、NEIHU 會；QUIBI 不會）
  if (A.retreat) for (const u of army) if (u.job !== 'retreat' && u.hp < u.maxHp * A.retreat && w.t - u.lastHit < 3) { u.job = 'retreat'; u.o = { t: 'retreat' }; u.tgt = null; u.path = findPath(w, u.x, u.y, stage.x, stage.y) || []; }
  // 2) 守備：每個自家據點留 garrison 個；據點丟了，守軍變自由兵
  for (const u of army) if (u.job && u.job.startsWith('g:')) { const n = w.byId.get(+u.job.slice(2)); if (!n || (n.owner !== 1 && u.o.t === 'idle' && n.ourP > 0)) u.job = null; }
  const gN = aiVal(A.garrison, w.t);
  for (const n of w.nodes.filter(n => n.owner === 1)) {
    const g = army.filter(u => u.job === 'g:' + n.id);
    for (let i = g.length; i < gN; i++) {
      const c = army.filter(u => !u.job).sort((a, c2) => uDist(a, n) - uDist(c2, n))[0]; if (!c) break;
      c.job = 'g:' + n.id; cmdAttackMove(w, [c], n.x, n.y);
    }
    for (const u of g) if (uDist(u, n) > NODE_R && u.o.t === 'idle') cmdAttackMove(w, [u], n.x, n.y);
  }
  // 3) 反攻：自家據點有我方單位 → 派兵（會不會、多快，是人設）
  if (A.react && !war.react) for (const n of w.nodes) if (n.owner === 1 && n.ourP > 0) { war.react = { n: n.id, at: w.t + (A.reactDelay || 8) }; break; }
  if (war.react && w.t >= war.react.at) {
    const n = w.byId.get(war.react.n); war.react = null;
    const free = army.filter(u => !u.job || u.job === 'strike' && u.o.t === 'idle');
    const pow = free.length * FEAT_POWER * rivalMult(w);
    if (n && n.ourP > 0 && free.length >= 2 && (!A.caution || pow >= n.ourP * A.caution * .8)) { free.forEach(u => u.job = 'strike'); cmdAttackMove(w, free, n.x, n.y); war.lastWave = w.t; war.waves++; EMIT('wave', { text: L(`對手反攻 → ${n.name}`, `Rival counterattack → ${n.name}`), node: n, n: free.length, x: n.x, y: n.y, ids: free.map(u => u.id) }); }
  }
  // 4) 出兵：湊夠一波，挑一個划算的據點打
  const free = army.filter(u => !u.job), waveN = aiVal(A.wave, w.t), every = aiVal(A.waveEvery, w.t);
  if (free.length >= waveN && w.t - war.lastWave >= every && w.t >= (A.firstWave || 0)) {
    const pow = free.length * FEAT_POWER * rivalMult(w);
    let best = null, bs = -1e9;
    for (const n of w.nodes) {
      if (n.owner === 1) continue; const e = est(n);
      if (A.caution && e * A.caution > pow) continue;
      const s = n.yield * 10 + (n.owner === 0 ? 6 : 0) - e * .5 + (A.bias ? A.bias(n, w.t) : 0) + w.rng() * 3;
      if (s > bs) { bs = s; best = n; }
    }
    if (best && bs > -50) {
      war.lastWave = w.t; war.waves++; free.forEach(u => u.job = 'strike'); cmdAttackMove(w, free, best.x, best.y);
      EMIT('wave', { text: L(`競品出兵 ×${free.length} → ${best.name}`, `Rival wave ×${free.length} → ${best.name}`), node: best, n: free.length, x: best.x, y: best.y, ids: free.map(u => u.id) });
    }
  }
  // 5) 突擊隊打完：據點拿下就留守，其餘回集結點
  for (const u of army.filter(u => u.job === 'strike' && u.o.t === 'idle' && w.t - u.lastHit > 4)) {
    const n = w.nodes.find(n => uDist(n, u) < NODE_R + 1);
    if (n && (n.owner === 1 || n.emP > n.ourP) && army.filter(x => x.job === 'g:' + n.id).length < gN + 2) u.job = 'g:' + n.id;
    else { u.job = null; cmdAttackMove(w, [u], stage.x + (w.rng() - .5) * 2, stage.y + (w.rng() - .5) * 1.5); }
  }
  // 6) 偵察：派一個過來看看（玩家會在霧邊看到紅點）
  if (A.scout && w.t - war.lastScout > A.scout && army.filter(u => !u.job).length >= 2) {
    const s = army.find(u => !u.job); war.lastScout = w.t; s.job = 'scout'; const h = hubOf(w), n = w.nodes[Math.floor(w.rng() * w.nodes.length)];
    const tx = w.rng() < .5 ? n.x : bcx(h) + 5 + w.rng() * 2, ty = w.rng() < .5 ? n.y : bcy(h) - 4 + w.rng() * 2;
    s.o = { t: 'move' }; s.path = findPath(w, s.x, s.y, tx, ty) || []; s.scoutUntil = w.t + 24;
  }
  for (const s of army.filter(u => u.job === 'scout' && (w.t > (u.scoutUntil || 0) || u.o.t === 'idle'))) { s.job = null; cmdAttackMove(w, [s], stage.x, stage.y); }
}

function updateWar(w, dt) {
  const war = w.war; if (!war) return; const A = w.persona.ai, diff = w.diff || { inc: 1 };
  const owned = w.nodes.filter(n => n.owner === 1).reduce((a, n) => a + n.yield, 0);
  war.bank += (A.income(w.t, w) + (A.nodeInc == null ? .5 : A.nodeInc) * owned) * diff.inc * dt;
  war.prodT -= dt;
  if (war.prodT <= 0 && war.bank >= A.cost && rivalArmy(w).length < aiVal(A.cap, w.t)) { war.bank -= A.cost; spawnRival(w); war.prodT = aiVal(A.prodEvery, w.t) || 4; }
  if (A.decay) { const dd = A.decay(w.t); if (dd > 0) for (const u of rivalArmy(w)) { u.hp -= dd * dt; if (u.hp <= 0) killUnit(w, u, null); } }
  war.think -= dt; if (war.think <= 0) { war.think = 2.5; rivalThink(w); w.rival.army = rivalArmy(w).length; }
  baseTurret(w, dt); combatStep(w, dt);
  war.heat = Math.max(0, war.heat - dt * .1);
  while (war.shots.length && war.shots[0].t < w.t - 3) war.shots.shift();
}
function baseTurret(w, dt) { // 對手的本土市場有護城河：靠近它的基地會被打（攻打既有巨頭的主場，是在浪費兵）
  const war = w.war, b = w.rival.b, cx = b.x + 1.5, cy = b.y + 1.5; war.tcd = (war.tcd || 0) - dt; if (war.tcd > 0) return;
  let t = null, bd = 4.9; for (const u of w.units) if (u.team === 0 && isCombat(u) && u.sunset == null) { const d = Math.hypot(u.x - cx, u.y - cy); if (d < bd) { bd = d; t = u; } }
  if (!t) return; war.tcd = .85; initHp(t); t.hp -= 9; t.hitFx = .12; t.lastHit = w.t;
  if (tileVis(w, t.x, t.y)) { FX.beams.push({ x0: cx, y0: cy, x1: t.x, y1: t.y, color: COL.rival, t: 0, max: .2, z0: 70 }); FX.spark(t.x, t.y, 13, COL.rival, 3); SFX.play('hit', sndAt(t)); }
  if (w.t - war.alertAt > 10) { war.alertAt = w.t; EMIT('underAttack', { x: t.x, y: t.y, node: null, turret: true }); }
  if (t.hp <= 0) killUnit(w, t, { team: 1 });
}
function rivalPresence(w, n) { let p = 0; const m = rivalMult(w); for (const u of w.units) if (u.team === 1 && u.type === 'efeat' && uDist(u, n) < NODE_R) p += FEAT_POWER * m; return p; }
function hotSpot(w) { // 最近 3 秒交火最密集的地方（導播與音樂用）
  const s = w.war && w.war.shots; if (!s || !s.length) return null; let best = null, bn = 0;
  for (let i = 0; i < s.length; i += Math.max(1, s.length >> 5)) { const a = s[i]; let k = 0; for (const b of s) if (Math.abs(a.x - b.x) + Math.abs(a.y - b.y) < 3) k++; if (k > bn) { bn = k; best = a; } }
  return best && { x: best.x, y: best.y, n: bn };
}
