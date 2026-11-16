/* ── 模擬層：世界狀態 + tick。畫面層只讀、不寫 ───────────────── */
function EMIT(t, d) { if (typeof G !== 'undefined' && G.emit) G.emit(t, d); }

function newWorld(seed) {
  return {
    t: 0, t0: 0, nid: 1, ore: 0, units: [], blds: [], patches: [], debts: [], props: [], byId: new Map(),
    blocked: new Uint8Array(N * N), vis: new Uint8Array(N * N), rng: mulberry32(seed || 7),
    income: [], rate: 0, gross: 0, drain: 0, blockT: 0, isBlocked: false, trackBlock: false, delivered: 0,
    pace: PACE.normal, detected: false, incidentCd: 0, scanT: -99,
    trust: 70, microTax: 0, rival: null, engMade: 0, warned: 0, tag: {}, pings: [], tech: { done: {}, cur: null, seq: 0 },
  };
}
const inb = (x, y) => x >= 0 && y >= 0 && x < N && y < N;
const tileFree = (w, x, y) => inb(x, y) && !w.blocked[y * N + x];

function addPatch(w, x, y, amt = 1800) { const p = { id: w.nid++, kind: 'patch', x, y, amt, seed: w.rng() }; w.patches.push(p); w.byId.set(p.id, p); return p; }
function addProp(w, x, y, ww = 1, hh = 1, type = 'rock') { const p = { id: w.nid++, kind: 'prop', type, x, y, w: ww, h: hh, seed: w.rng() }; w.props.push(p); w.byId.set(p.id, p); return p; }
function addBld(w, type, x, y, built = true, team = 0) {
  const d = BLD[type];
  const b = { id: w.nid++, kind: 'bld', type, team, x, y, w: d.w, h: d.h, built, prog: built ? 1 : 0, queue: [], rally: null, haltT: 0, anim: w.rng() * 6, done: built ? -9 : 0, builder: null };
  w.blds.push(b); w.byId.set(b.id, b); rebuildBlocked(w); return b;
}
function addUnit(w, x, y, team = 0, type = 'eng') {
  const u = { id: w.nid++, kind: 'unit', type, team, x, y, path: [], o: { t: 'idle' }, prev: null, carry: 0, face: 1, anim: w.rng() * 9, spawnT: 1, moving: false, hitT: 0 };
  w.units.push(u); w.byId.set(u.id, u); return u;
}
function rebuildBlocked(w) {
  w.blocked.fill(0);
  for (const p of w.patches) w.blocked[p.y * N + p.x] = 1;
  for (const r of w.props) for (let j = 0; j < r.h; j++) for (let i = 0; i < r.w; i++) if (inb(r.x + i, r.y + j)) w.blocked[(r.y + j) * N + r.x + i] = 1;
  for (const b of w.blds) for (let j = 0; j < b.h; j++) for (let i = 0; i < b.w; i++) w.blocked[(b.y + j) * N + b.x + i] = 1;
  if (w.rival) for (const b of w.rival.blds) for (let j = 0; j < b.h; j++) for (let i = 0; i < b.w; i++) w.blocked[(b.y + j) * N + b.x + i] = 1;
}
const bcx = b => b.x + b.w / 2, bcy = b => b.y + b.h / 2;
const hubOf = w => w.blds.find(b => b.type === 'hub' && b.built && b.team === 0);
const engs = w => w.units.filter(u => u.team === 0 && u.type === 'eng');
const feats = w => w.units.filter(u => u.team === 0 && u.type !== 'eng');
const platCount = w => w.units.filter(u => u.team === 0 && u.type === 'pfeat' && u.sunset == null).length;

/* ── 尋路：A*（8 向、不切角）+ 拉直 ── */
function nearestFree(w, tx, ty) {
  for (let r = 0; r < 8; r++) {
    let best = null, bd = 1e9;
    for (let j = ty - r; j <= ty + r; j++) for (let i = tx - r; i <= tx + r; i++) {
      if (Math.max(Math.abs(i - tx), Math.abs(j - ty)) !== r) continue;
      if (!tileFree(w, i, j)) continue;
      const d = (i - tx) ** 2 + (j - ty) ** 2; if (d < bd) { bd = d; best = { x: i, y: j }; }
    }
    if (best) return best;
  }
  return null;
}
function astar(w, sx, sy, gx, gy) {
  const M = N * N, g = new Float32Array(M).fill(1e9), from = new Int16Array(M).fill(-1), closed = new Uint8Array(M);
  const heap = []; // [f, idx]
  const push = (f, i) => { heap.push([f, i]); let c = heap.length - 1; while (c > 0) { const p = (c - 1) >> 1; if (heap[p][0] <= heap[c][0]) break;[heap[p], heap[c]] = [heap[c], heap[p]]; c = p; } };
  const pop = () => { const t = heap[0], l = heap.pop(); if (heap.length) { heap[0] = l; let c = 0; for (; ;) { let a = c * 2 + 1, b = a + 1, m = c; if (a < heap.length && heap[a][0] < heap[m][0]) m = a; if (b < heap.length && heap[b][0] < heap[m][0]) m = b; if (m === c) break;[heap[m], heap[c]] = [heap[c], heap[m]]; c = m; } } return t; };
  const h = (x, y) => { const dx = Math.abs(x - gx), dy = Math.abs(y - gy); return (dx + dy) + (1.414 - 2) * Math.min(dx, dy); };
  const s = sy * N + sx; g[s] = 0; push(h(sx, sy), s);
  const D = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  while (heap.length) {
    const [, cur] = pop(); if (closed[cur]) continue; closed[cur] = 1;
    const cx = cur % N, cy = (cur / N) | 0;
    if (cx === gx && cy === gy) { const out = []; let c = cur; while (c !== -1) { out.push({ x: c % N, y: (c / N) | 0 }); c = from[c]; } return out.reverse(); }
    for (const [dx, dy] of D) {
      const nx = cx + dx, ny = cy + dy; if (!inb(nx, ny)) continue;
      const ni = ny * N + nx; if (closed[ni] || (w.blocked[ni] && !(nx === gx && ny === gy))) continue;
      if (dx && dy && (w.blocked[cy * N + nx] || w.blocked[ny * N + cx])) continue;
      const ng = g[cur] + (dx && dy ? 1.414 : 1);
      if (ng < g[ni]) { g[ni] = ng; from[ni] = cur; push(ng + h(nx, ny), ni); }
    }
  }
  return null;
}
function clearLine(w, ax, ay, bx, by) {
  const d = Math.hypot(bx - ax, by - ay), n = Math.max(1, Math.ceil(d / 0.2));
  for (let k = 0; k <= n; k++) {
    const x = ax + (bx - ax) * k / n, y = ay + (by - ay) * k / n;
    if (!tileFree(w, Math.floor(x), Math.floor(y))) return false;
    for (const [ox, oy] of [[.27, 0], [-.27, 0], [0, .27], [0, -.27]]) if (!tileFree(w, Math.floor(x + ox), Math.floor(y + oy)) && tileFree(w, Math.floor(ax), Math.floor(ay))) return false;
  }
  return true;
}
function findPath(w, x, y, gx, gy) {
  const sx = clamp(Math.floor(x), 0, N - 1), sy = clamp(Math.floor(y), 0, N - 1);
  let tx = clamp(Math.floor(gx), 0, N - 1), ty = clamp(Math.floor(gy), 0, N - 1);
  if (!tileFree(w, tx, ty)) { const f = nearestFree(w, tx, ty); if (!f) return null; tx = f.x; ty = f.y; gx = tx + .5; gy = ty + .5; }
  if (sx === tx && sy === ty) return [{ x: gx, y: gy }];
  const tiles = astar(w, sx, sy, tx, ty); if (!tiles) return null;
  const pts = tiles.slice(1).map(t => ({ x: t.x + .5, y: t.y + .5 })); pts[pts.length - 1] = { x: gx, y: gy };
  const out = []; let cur = { x, y }, i = 0;
  while (i < pts.length) { let j = pts.length - 1; while (j > i && !clearLine(w, cur.x, cur.y, pts[j].x, pts[j].y)) j--; out.push(pts[j]); cur = pts[j]; i = j + 1; }
  return out;
}
function ringTiles(x, y, ww, hh) { const r = []; for (let j = y - 1; j <= y + hh; j++) for (let i = x - 1; i <= x + ww; i++) { if (i >= x && i < x + ww && j >= y && j < y + hh) continue; r.push({ x: i, y: j }); } return r; }
function pickSpot(w, ring, u) {
  const c = ring.filter(t => tileFree(w, t.x, t.y)).map(t => ({ t, d: Math.hypot(t.x + .5 - u.x, t.y + .5 - u.y) })).sort((a, b) => a.d - b.d);
  if (!c.length) return null; const k = c[Math.min(u.id % 3, c.length - 1)].t;
  const jx = (hash2(u.id, 3) - .5) * .36, jy = (hash2(u.id, 5) - .5) * .36;
  return { x: k.x + .5 + jx, y: k.y + .5 + jy };
}

/* ── 指令（UI 呼叫）─────────────────────── */
const patchLoad = (w, id) => w.units.reduce((n, u) => n + (u.o.t === 'mine' && u.o.patch === id ? 1 : 0), 0);
function cmdMine(w, us, patch) {
  for (const u of us) {
    let best = patch, bs = 1e9;
    for (const p of w.patches) {
      const s = patchLoad(w, p.id) * 2.6 + (p.id === patch.id ? 0 : 1.5) + Math.hypot(p.x - patch.x, p.y - patch.y) * .25;
      if (s < bs) { bs = s; best = p; }
    }
    u.o = { t: 'mine', patch: best.id, ph: 'go' }; u.prev = null; u.lastOrder = { text: '去採預算', at: w.t }; goPatch(w, u, best);
  }
}
function goPatch(w, u, p) {
  const spot = pickSpot(w, ringTiles(p.x, p.y, 1, 1), u); if (!spot) { u.o = { t: 'idle' }; return; }
  u.o.spot = spot; const path = findPath(w, u.x, u.y, spot.x, spot.y);
  if (!path) { u.o = { t: 'idle' }; u.path = []; return; } u.path = path;
}
function goHub(w, u) {
  const h = hubOf(w); if (!h) { u.o = { t: 'idle' }; return; }
  const spot = pickSpot(w, ringTiles(h.x, h.y, h.w, h.h), u); const path = spot && findPath(w, u.x, u.y, spot.x, spot.y);
  if (!path) { u.o = { t: 'idle' }; return; } u.path = path; u.o.drop = spot;
}
function cmdMove(w, us, x, y) {
  us.forEach((u, i) => {
    const a = i * 2.4, r = us.length > 1 ? .5 + .28 * Math.sqrt(i) : 0;
    const path = findPath(w, u.x, u.y, clamp(x + Math.cos(a) * r, .5, N - .5), clamp(y + Math.sin(a) * r, .5, N - .5));
    u.o = { t: 'move' }; u.prev = null; u.path = path || []; u.carry = 0; u.lastOrder = { text: '移動到指定位置', at: w.t };
  });
}
function cmdRepay(w, us, d) {
  for (const u of us) { u.prev = u.o.t === 'mine' ? { t: 'mine', patch: u.o.patch, ph: 'go' } : (u.o.t === 'repay' ? u.prev : null); u.o = { t: 'repay', debt: d.id, ph: 'go' }; u.carry = 0; u.lastOrder = { text: '去處理那一塊', at: w.t }; u.path = findPath(w, u.x, u.y, d.x, d.y) || []; }
}
function canPlace(w, type, tx, ty) {
  const d = BLD[type];
  for (let j = 0; j < d.h; j++) for (let i = 0; i < d.w; i++) {
    const x = tx + i, y = ty + j; if (!inb(x, y) || w.blocked[y * N + x] || w.vis[y * N + x] === 0) return false;
  }
  return true;
}
function bldCost(w, type) { const d = BLD[type]; const n = w.blds.filter(b => b.type === type && b.team === 0).length; return d.cost + (d.step || 0) * Math.max(0, n - (type === 'comms' ? 0 : 0)); }
function cmdBuild(w, u, type, tx, ty) {
  const need = BLD[type].needs; if (need && !w.blds.some(b => b.type === need && b.built && b.team === 0)) return { ok: false, why: 'needs' };
  const cost = bldCost(w, type); if (w.ore < cost) return { ok: false, why: 'ore' };
  if (!canPlace(w, type, tx, ty)) return { ok: false, why: 'place' };
  w.ore -= cost;
  const site = addBld(w, type, tx, ty, false); site.builder = u.id; site.paid = cost;
  for (const o of w.units) { const ix = Math.floor(o.x), iy = Math.floor(o.y); if (ix >= tx && ix < tx + site.w && iy >= ty && iy < ty + site.h) { const f = nearestFree(w, ix, iy); if (f) { o.x = f.x + .5; o.y = f.y + .5; o.path = []; if (o.o.t === 'mine' || o.o.t === 'move') { /* 讓它重新算路 */ o.path = []; if (o.o.t === 'mine') { o.o.ph = 'go'; const p = w.byId.get(o.o.patch); if (p) goPatch(w, o, p); } } } } }
  u.prev = u.o.t === 'mine' ? { t: 'mine', patch: u.o.patch, ph: 'go' } : null; u.carry = 0;
  u.o = { t: 'build', site: site.id, ph: 'go' }; u.lastOrder = { text: '去蓋' + BLD[type].name, at: w.t };
  const spot = pickSpot(w, ringTiles(tx, ty, site.w, site.h), u); u.path = (spot && findPath(w, u.x, u.y, spot.x, spot.y)) || [];
  // 其他工人若正在跑向被佔用的格子，重新導路
  for (const o of w.units) if (o !== u && o.path.length && o.o.t === 'mine') { const p = w.byId.get(o.o.patch); if (p && o.o.ph === 'go') goPatch(w, o, p); else if (o.o.ph === 'back') goHub(w, o); }
  EMIT('siteStart', { site }); return { ok: true, site, cost };
}
/* ── 研發（升級）：多人研發有遞減，效果是全域乘數 ── */
const techLv = (w, id) => (w.tech && w.tech.done[id]) || 0;
const speedMult = w => Math.pow(1 / .88, techLv(w, 'proc'));
const mineMult = w => 1 + .10 * techLv(w, 'auto');
const debtGenMult = w => techLv(w, 'test') ? .6 : 1;
const debtK = w => techLv(w, 'ci') ? .65 : 1;
const incidentAt = w => techLv(w, 'test') ? 32 : 25;
const commsSupply = w => 8 + (techLv(w, 'onboard') ? 3 : 0);
const archPower = w => 1 + .10 * techLv(w, 'arch');
const archUpkeep = w => techLv(w, 'arch') ? .75 : 1;
const visBonus = w => techLv(w, 'insight') ? 2 : 0;
const bSupply = (w, b) => b.type === 'comms' ? commsSupply(w) : BLD[b.type].supply;
const labOf = w => w.blds.find(b => b.type === 'lab' && b.built && b.team === 0);
const labAssigned = (w, lab) => w.units.filter(u => u.team === 0 && u.o.t === 'research' && u.o.lab === lab.id);
const labWorking = (w, lab) => labAssigned(w, lab).filter(u => u.o.ph === 'work');
const rankSum = n => RANK.slice(0, n).reduce((a, b) => a + b, 0);
const researchRate = w => { const lab = labOf(w); return lab ? rankSum(labWorking(w, lab).length) : 0; };
function techNeedMet(w, need) {
  if (!need) return true;
  for (const [k, v] of Object.entries(need)) {
    if (k === 'bld') { if (!w.blds.some(b => b.type === v && b.built && b.team === 0)) return false; }
    else if (k === 'comms') { if (w.blds.filter(b => b.type === 'comms' && b.built && b.team === 0).length < v) return false; }
    else if (techLv(w, k) < v) return false;
  }
  return true;
}
function techNeedText(need) {
  if (!need) return ''; const names = { obs: '監控中心', plat: '平台組' };
  return Object.entries(need).map(([k, v]) => k === 'bld' ? '需要' + names[v] : k === 'comms' ? `需要 ${v} 座協作制度` : '需要「' + TECH.find(t => t.id === k).name + (TECH.find(t => t.id === k).lv.length > 1 ? ' ' + 'I'.repeat(v) : '') + '」').join('、');
}
function techStatus(w, p) {
  const lvl = techLv(w, p.id), maxed = !p.repeat && lvl >= p.lv.length, nx = p.lv[Math.min(lvl, p.lv.length - 1)];
  return { lvl, maxed, next: nx, locked: !techNeedMet(w, p.need), cur: w.tech.cur && w.tech.cur.id === p.id };
}
function removeDebt(w, n) {
  for (const d of w.debts.slice()) { const t = Math.min(d.pts, n); d.pts -= t; n -= t; if (d.pts <= .001) { w.debts.splice(w.debts.indexOf(d), 1); w.byId.delete(d.id); FX.burst(d.x, d.y, 10, COL.pink, 10); } if (n <= 0) break; }
}
function cmdTechStart(w, id) {
  const p = TECH.find(t => t.id === id), lab = labOf(w), st = p && techStatus(w, p);
  if (!lab) return { ok: false, why: 'nolab' }; if (w.tech.cur) return { ok: false, why: 'busy' }; if (st.maxed) return { ok: false, why: 'maxed' }; if (st.locked) return { ok: false, why: 'locked' };
  if (w.ore < st.next.cost) return { ok: false, why: 'ore' };
  w.ore -= st.next.cost; w.tech.cur = { id, lvl: st.lvl + 1, name: p.name, W: st.next.W, prog: 0, paid: st.next.cost }; EMIT('techStart', { id }); return { ok: true };
}
function cmdTechCancel(w) {
  const c = w.tech.cur; if (!c) return { ok: false }; const refund = Math.floor(c.paid * .75); w.ore += refund; w.tech.cur = null; FX.float(bcx(labOf(w) || hubOf(w)), bcy(labOf(w) || hubOf(w)), '+' + refund + ' ●', COL.ore, 50); EMIT('techCancel', { refund }); return { ok: true, refund };
}
const DESKS = [[.4, 2.45], [1.2, 2.45], [2.0, 2.45], [2.45, 1.6], [2.45, .7], [-.45, 1.6], [-.45, .7], [.4, -.45]];
function cmdResearch(w, us, lab) { // 派駐研發：最多 6 個研究位
  if (!lab || !lab.built) return 0; const taken = new Set(labAssigned(w, lab).map(u => u.o.slot)); let n = 0;
  for (const u of us) {
    if (u.type !== 'eng' || (u.o.t === 'research' && u.o.lab === lab.id)) continue; if (labAssigned(w, lab).length >= LAB_SLOTS) break;
    let slot = 0; while (taken.has(slot)) slot++; const d = DESKS[slot % DESKS.length]; taken.add(slot);
    u.prev = u.o.t === 'mine' ? { t: 'mine', patch: u.o.patch, ph: 'go' } : (u.o.t === 'research' || u.o.t === 'build' ? u.prev : null);
    u.o = { t: 'research', lab: lab.id, ph: 'go', slot, seq: ++w.tech.seq, desk: { x: lab.x + d[0], y: lab.y + d[1] } }; u.carry = 0; u.lastOrder = { text: '去研發中心坐著', at: w.t };
    const tx = clamp(lab.x + d[0], .5, N - .5), ty = clamp(lab.y + d[1], .5, N - .5); u.o.desk = { x: tx, y: ty }; u.path = findPath(w, u.x, u.y, tx, ty) || []; n++;
  }
  return n;
}
function cmdRecall(w, lab, n) { // 召回最後派駐的 n 位研究員
  const us = labAssigned(w, lab).sort((a, b) => b.o.seq - a.o.seq).slice(0, n); for (const u of us) resumeOrIdle(w, u); return us.length;
}
function updateResearch(w, dt) {
  const c = w.tech.cur; if (!c) return; const r = researchRate(w); c.rate = r; if (r <= 0) return;
  c.prog += r * dt; const lab0 = labOf(w); w.tech.manSec = (w.tech.manSec || 0) + (lab0 ? labWorking(w, lab0).length : 0) * dt;
  if (c.prog >= c.W) {
    const p = TECH.find(t => t.id === c.id); w.tech.done[c.id] = (w.tech.done[c.id] || 0) + 1; w.tech.cur = null;
    if (c.id === 'refactor') removeDebt(w, 6);
    const lab = labOf(w); if (lab) { FX.ring(bcx(lab), bcy(lab), 3, COL.violet, 1.2); FX.burst(bcx(lab), bcy(lab), 40, COL.violet, 24); }
    SFX.play('good'); EMIT('techDone', { id: c.id, lvl: c.lvl, name: c.name });
  }
}

/* 工地：被叫走的工程師可以派回來繼續蓋；蓋到一半也能取消（退 75%）*/
const siteWorkers = (w, s) => w.units.filter(u => u.team === 0 && u.o.t === 'build' && u.o.site === s.id);
function cmdBuildSite(w, us, s) {
  if (!s || s.built) return 0; let n = 0;
  for (const u of us) {
    if (u.type !== 'eng') continue; if (u.o.t === 'build' && u.o.site === s.id) continue;
    u.prev = u.o.t === 'mine' ? { t: 'mine', patch: u.o.patch, ph: 'go' } : (u.o.t === 'build' ? u.prev : null);
    u.o = { t: 'build', site: s.id, ph: 'go' }; u.lastOrder = { text: '回去繼續蓋那座工地', at: w.t }; u.carry = 0; const sp = pickSpot(w, ringTiles(s.x, s.y, s.w, s.h), u); u.path = (sp && findPath(w, u.x, u.y, sp.x, sp.y)) || []; n++;
  }
  return n;
}
function cmdCancelSite(w, s) {
  if (!s || s.built || s.team !== 0) return { ok: false };
  const refund = Math.floor((s.paid || 0) * .75); w.ore += refund;
  for (const u of w.units) if (u.o.t === 'build' && u.o.site === s.id) resumeOrIdle(w, u);
  w.blds.splice(w.blds.indexOf(s), 1); w.byId.delete(s.id); rebuildBlocked(w);
  FX.burst(bcx(s), bcy(s), 14, COL.amber, 16); FX.float(bcx(s), bcy(s), '+' + refund + ' ●', COL.ore, 40); EMIT('siteCancel', { site: s, refund });
  return { ok: true, refund };
}
/* 工程師回報：把他腳邊的卡點（技術債）暫時亮給 PM —— 局部、限時，不等於監控中心 */
function cmdEngReport(w, u) {
  if (!u) return { ok: false, why: 'none' }; if ((u.reportCd || 0) > w.t) return { ok: false, why: 'cd', left: Math.ceil(u.reportCd - w.t) };
  const near = w.debts.filter(d => Math.hypot(d.x - u.x, d.y - u.y) < ENG_SIGHT + .3);
  if (!near.length) { u.reportCd = w.t + 6; return { ok: false, why: 'nothing' }; }
  const n = Math.ceil(near.reduce((a, d) => a + d.pts, 0) - 1e-6); for (const d of near) d.reveal = w.t + 60;
  w.pings.push({ x: u.x, y: u.y, at: w.t, until: w.t + 60, n, by: u.id }); u.reportCd = w.t + 20; EMIT('engReport', { u, n, count: near.length });
  return { ok: true, n, count: near.length };
}
const supplyCap = w => w.blds.reduce((n, b) => n + (b.built && b.team === 0 ? bSupply(w, b) : 0), 0) - w.microTax;
const supplyUsed = w => w.units.reduce((n, u) => n + (u.team === 0 ? (UNIT[u.type] ? UNIT[u.type].sup : 1) : 0), 0) + w.blds.reduce((n, b) => n + b.queue.reduce((m, q) => m + (q.sup || 1), 0), 0);
function cmdTrain(w, hub, pace, kind) {
  if (!hub || !hub.built) return { ok: false, why: 'build' };
  kind = kind || BLD[hub.type].makes || 'eng'; const U = UNIT[kind];
  if (hub.queue.length >= 5) return { ok: false, why: 'queue' };
  if (supplyUsed(w) + U.sup > supplyCap(w)) { w.tag.blockedTry = (w.tag.blockedTry || 0) + 1; return { ok: false, why: 'supply' }; }
  if (w.ore < U.cost) return { ok: false, why: 'ore' };
  w.ore -= U.cost; hub.queue.push({ t: 0, dur: U.time * pace.mult, pace, kind, sup: U.sup }); return { ok: true };
}
function cmdRally(w, hub, target) { hub.rally = target; }
function cmdCancel(w, hub, i) { const q = hub.queue[i]; if (!q) return; hub.queue.splice(i, 1); w.ore += UNIT[q.kind || 'eng'].cost; }

/* ── 技術債 ── */
const debtVisible = (w, d) => w.detected || (d.reveal || 0) > w.t;
const pingsActive = w => w.pings.filter(p => p.until > w.t);
const debtTotal = w => w.debts.reduce((n, d) => n + d.pts, 0);
const effMult = w => clamp(1 - DEBT_SLOW * debtK(w) * debtTotal(w), .4, 1);
function addDebt(w, n) {
  n *= debtGenMult(w); if (n <= 0) return; const hub = w.blds.find(b => b.type === 'hub' && b.team === 0); if (!hub) return;
  const cand = w.debts.filter(d => d.pts < 3.2);
  if (cand.length && (w.debts.length >= 9 || w.rng() < .35)) { cand[Math.floor(w.rng() * cand.length)].pts += n; }
  else {
    let x, y, ok = false;
    for (let k = 0; k < 40 && !ok; k++) {
      const a = (-80 + w.rng() * 250) * Math.PI / 180, r = 2.9 + w.rng() * 1.5; x = bcx(hub) + Math.cos(a) * r; y = bcy(hub) + Math.sin(a) * r;
      ok = tileFree(w, Math.floor(x), Math.floor(y)) && !w.debts.some(d => Math.hypot(d.x - x, d.y - y) < .9);
    }
    if (!ok) { (w.debts[0] || { pts: 0 }).pts += n; return; }
    const d = { id: w.nid++, kind: 'debt', x, y, pts: n, seed: w.rng(), born: w.t }; w.debts.push(d); w.byId.set(d.id, d);
  }
  EMIT('debtAdded', { n });
}

/* ── 單位更新 ── */
function walk(u, dt) {
  let step = SPEED * dt, moved = false;
  while (step > 0 && u.path.length) {
    const p = u.path[0], dx = p.x - u.x, dy = p.y - u.y, d = Math.hypot(dx, dy); moved = true;
    const sdx = dx - dy; if (Math.abs(sdx) > .04) u.face = sdx > 0 ? 1 : -1;
    if (d <= step) { u.x = p.x; u.y = p.y; u.path.shift(); step -= d; } else { u.x += dx / d * step; u.y += dy / d * step; step = 0; }
  }
  u.moving = moved;
}
function faceTo(u, x, y) { return ((x - u.x) - (y - u.y)) >= 0 ? 1 : -1; }
function nearestPatch(w, x, y) { let b = null, bd = 1e9; for (const p of w.patches) { const d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; b = p; } } return b; }
function resumeOrIdle(w, u) {
  if (u.prev && u.prev.t === 'mine') { const p = w.byId.get(u.prev.patch) || nearestPatch(w, u.x, u.y); u.o = { t: 'mine', patch: p.id, ph: 'go' }; u.prev = null; goPatch(w, u, p); }
  else { u.o = { t: 'idle' }; u.prev = null; }
}
function updateUnit(w, u, dt) {
  u.anim += dt; if (u.spawnT < 1) u.spawnT = Math.min(1, u.spawnT + dt * 2.2);
  u.moving = false; if (u.path.length) walk(u, dt);
  const o = u.o;
  if (o.t === 'move') { if (!u.path.length) u.o = { t: 'idle' }; }
  else if (o.t === 'mine') {
    const p = w.byId.get(o.patch);
    if (!p) { const np = nearestPatch(w, u.x, u.y); if (!np) { u.o = { t: 'idle' }; return; } o.patch = np.id; o.ph = 'go'; goPatch(w, u, np); return; }
    if (o.ph === 'go') {
      if (!u.path.length) {
        if (o.spot && Math.hypot(u.x - o.spot.x, u.y - o.spot.y) < .9) { o.ph = 'work'; o.tm = MINE_T * (.9 + .2 * w.rng()); u.face = faceTo(u, p.x + .5, p.y + .5); u.hitT = .2; }
        else { o.retry = (o.retry || 0) + 1; if (o.retry > 3) u.o = { t: 'idle' }; else goPatch(w, u, p); }
      }
    } else if (o.ph === 'work') {
      o.tm -= dt; u.hitT -= dt;
      if (u.hitT <= 0) { u.hitT = .55; FX.spark(p.x + .5, p.y + .5, 12, COL.ore, 3); }
      if (o.tm <= 0) { u.carry = CHUNK; o.ph = 'back'; goHub(w, u); }
    } else if (o.ph === 'back') {
      if (!u.path.length) {
        if (o.drop && Math.hypot(u.x - o.drop.x, u.y - o.drop.y) < 1.0) {
          const amt = u.carry * effMult(w) * mineMult(w); u.carry = 0; w.ore += amt; w.delivered += amt; w.income.push({ t: w.t, a: amt });
          FX.float(u.x, u.y, '+' + (Math.abs(amt - Math.round(amt)) < .05 ? Math.round(amt) : amt.toFixed(1)), amt < CHUNK - .05 ? COL.amber : COL.ore, 30); SFX.play('coin');
          o.ph = 'go'; o.retry = 0; goPatch(w, u, p);
        } else { o.retry = (o.retry || 0) + 1; if (o.retry > 3) u.o = { t: 'idle' }; else goHub(w, u); }
      }
    }
  } else if (o.t === 'build') {
    const s = w.byId.get(o.site); if (!s) { resumeOrIdle(w, u); return; }
    if (o.ph === 'go') {
      if (!u.path.length) {
        const dx = Math.max(s.x - u.x, 0, u.x - (s.x + s.w)), dy = Math.max(s.y - u.y, 0, u.y - (s.y + s.h));
        if (Math.hypot(dx, dy) < 1.4) { o.ph = 'work'; u.face = faceTo(u, bcx(s), bcy(s)); u.hitT = 0; }
        else { o.retry = (o.retry || 0) + 1; if (o.retry > 3) { u.o = { t: 'idle' }; } else { const sp = pickSpot(w, ringTiles(s.x, s.y, s.w, s.h), u); u.path = (sp && findPath(w, u.x, u.y, sp.x, sp.y)) || []; } }
      }
    } else {
      s.prog = Math.min(1, s.prog + dt * speedMult(w) / BLD[s.type].time); u.hitT -= dt;
      if (u.hitT <= 0) { u.hitT = .32; FX.spark(lerp(s.x, s.x + s.w, w.rng()), lerp(s.y, s.y + s.h, w.rng()), 8 + s.prog * BLD[s.type].hgt, COL.amber, 3); }
      if (s.prog >= 1) {
        s.built = true; s.done = w.t; s.builder = null; SFX.play('built');
        FX.ring(bcx(s), bcy(s), Math.max(s.w, s.h) * 1.1, COL.team); FX.burst(bcx(s), bcy(s), BLD[s.type].hgt, COL.team, 16);
        EMIT('built', { b: s }); resumeOrIdle(w, u);
      }
    }
  } else if (o.t === 'research') {
    const lab = w.byId.get(o.lab); if (!lab || !lab.built) { resumeOrIdle(w, u); return; }
    if (o.ph === 'go') {
      if (!u.path.length) {
        if (Math.hypot(u.x - o.desk.x, u.y - o.desk.y) < 1.0) { o.ph = 'work'; u.face = faceTo(u, bcx(lab), bcy(lab)); u.hitT = .3 + w.rng(); }
        else { o.retry = (o.retry || 0) + 1; if (o.retry > 3) resumeOrIdle(w, u); else u.path = findPath(w, u.x, u.y, o.desk.x, o.desk.y) || []; }
      }
    } else { u.hitT -= dt; if (u.hitT <= 0) { u.hitT = .9 + w.rng() * .5; FX.spark(u.x, u.y, 34, '#c9b8ff', 2); } }
  } else if (o.t === 'repay') {
    let d = w.byId.get(o.debt);
    if (!d || !(debtVisible(w, d) || o.ph === 'work')) { d = w.debts.filter(x => debtVisible(w, x)).sort((a, b) => Math.hypot(a.x - u.x, a.y - u.y) - Math.hypot(b.x - u.x, b.y - u.y))[0] || null; if (!d) { resumeOrIdle(w, u); return; } o.debt = d.id; o.ph = 'go'; u.path = findPath(w, u.x, u.y, d.x, d.y) || []; return; }
    if (o.ph === 'go') { if (Math.hypot(u.x - d.x, u.y - d.y) < 1.15 || !u.path.length) { o.ph = 'work'; u.face = faceTo(u, d.x, d.y); u.hitT = 0; } }
    else {
      u.hitT -= dt; if (u.hitT <= 0) { u.hitT = .3; FX.spark(d.x, d.y, 10, COL.pink, 3); }
      const before = Math.ceil(d.pts - 1e-6); d.pts -= dt / REPAY_S; const after = Math.max(0, Math.ceil(d.pts - 1e-6));
      if (after < before) { FX.float(d.x, d.y, '−1 債', COL.teal || COL.team, 34); SFX.play('repay'); EMIT('debtPaid', { d }); }
      if (d.pts <= .001) { w.debts.splice(w.debts.indexOf(d), 1); w.byId.delete(d.id); FX.burst(d.x, d.y, 10, COL.pink, 10); EMIT('debtCleared', { d }); }
    }
  }
}
function separate(w) {
  const us = w.units, anch = u => (u.o.t === 'mine' || u.o.t === 'build' || u.o.t === 'repay' || u.o.t === 'research') && u.o.ph === 'work';
  for (let i = 0; i < us.length; i++) for (let j = i + 1; j < us.length; j++) {
    const a = us[i], b = us[j], dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy;
    if (d2 < .16 && d2 > 1e-6) {
      const d = Math.sqrt(d2), push = (.4 - d), nx = dx / d * push, ny = dy / d * push, aa = anch(a), ba = anch(b);
      if (aa && ba) continue; if ((aa && b.path.length) || (ba && a.path.length)) continue; const fa = ba ? 1 : aa ? 0 : .5, fb = aa ? 1 : ba ? 0 : .5;
      const mv = (u, sx, sy) => { const x = u.x + sx, y = u.y + sy; if (tileFree(w, Math.floor(x), Math.floor(u.y))) u.x = x; if (tileFree(w, Math.floor(u.x), Math.floor(y))) u.y = y; };
      if (fa) mv(a, -nx * fa, -ny * fa); if (fb) mv(b, nx * fb, ny * fb);
    }
  }
}

/* ── 建築／生產 ── */
function spawnUnit(w, b, q) {
  const kind = q.kind || 'eng', door = { x: b.x + b.w / 2 + (w.rng() - .5) * .6, y: b.y + b.h + .35 };
  const u = addUnit(w, door.x, door.y, 0, kind); u.spawnT = 0; u.lastOrder = { text: '新人報到（沒人交代）', at: w.t }; if (kind === 'eng') w.engMade++; else w.featMade = (w.featMade || 0) + 1;
  FX.ring(door.x, door.y, .8, kind === 'eng' ? COL.team : COL.amber); FX.burst(door.x, door.y, 6, kind === 'eng' ? COL.team : COL.amber, 8); SFX.play('spawn');
  if (q && q.pace && q.pace.debt) addDebt(w, q.pace.debt);
  const r = b.rally;
  if (kind === 'eng') {
    if (r && r.patch && w.byId.get(r.patch)) cmdMine(w, [u], w.byId.get(r.patch));
    else if (r && r.x != null) cmdMove(w, [u], r.x, r.y);
  } else if (r && r.x != null) cmdMove(w, [u], r.x, r.y);
  EMIT('spawn', { u, hub: b });
}
function updateProducer(w, b, dt) {
  b.anim += dt; if (b.haltT > 0) b.haltT -= dt;
  const q = b.queue[0];
  if (q && b.haltT <= 0) { q.t += dt * speedMult(w); if (q.t >= q.dur) { b.queue.shift(); spawnUnit(w, b, q); } }
}
function cmdSunset(w, us) { for (const u of us) if (u.type !== 'eng' && u.sunset == null) { u.sunset = 3; u.o = { t: 'idle' }; u.path = []; } }

/* ── 市場據點（自由對戰）：功能單位在點上的戰力持續高於對手 20 秒 → 佔領；佔領後每秒產出 ── */
function addNode(w, d) {
  const n = { id: w.nid++, kind: 'node', name: d.name, type: d.type, x: d.x, y: d.y, yield: d.yield, thr: d.thr || 0, ent: !!d.ent, owner: null, bal: 0, ourP: 0, emP: 0, seenAt: -999, seenEm: 0 };
  (w.nodes = w.nodes || []).push(n); w.byId.set(n.id, n); return n;
}
function nodeVisible(w, n) { return w.vis[Math.floor(n.y) * N + Math.floor(n.x)] === 2; }
function updateNodes(w, dt) {
  if (!w.nodes) return; const P = w.persona; if (P && P.tick) P.tick(w, dt);
  const pf = Math.min(.45, .15 * platCount(w)), eff = effMult(w);
  let inc = 0;
  for (const n of w.nodes) {
    let ourP = 0; for (const u of w.units) if (u.team === 0 && u.type === 'feat' && u.sunset == null && Math.hypot(u.x - n.x, u.y - n.y) < NODE_R) ourP += FEAT_POWER * (1 + pf) * archPower(w) * eff;
    n.ourP = ourP; n.bp = w.war && P.basePow ? P.basePow(n, w.t, w) : 0; n.emP = w.war ? rivalPresence(w, n) + n.bp : P ? Math.max(0, P.pow(n, w.t, w)) : 0;
    if (nodeVisible(w, n)) { n.seenAt = w.t; n.seenEm = n.emP; }
    const blocked = n.ent && platCount(w) < 1, rush = w.war ? 1 + clamp(Math.abs(ourP - n.emP) / 40, 0, 1) : 1;   // 壓倒性優勢佔得更快（最多 2 倍）
    if (ourP > n.emP && ourP > 0 && !blocked) n.bal = Math.min(20, n.bal + dt * rush); else if (n.emP > ourP) n.bal = Math.max(-20, n.bal - dt * rush);
    else n.bal += (0 - n.bal) * Math.min(1, dt * .2);
    if (n.bal >= 20 && n.owner !== 0) { n.owner = 0; n.bal = 0; EMIT('nodeFlip', { n, owner: 0 }); FX.ring(n.x, n.y, 2.2, COL.team, 1); FX.burst(n.x, n.y, 12, COL.team, 16); }
    else if (n.bal <= -20 && n.owner !== 1) { n.owner = 1; n.bal = 0; EMIT('nodeFlip', { n, owner: 1 }); FX.ring(n.x, n.y, 2.2, COL.rival, 1); }
    if (n.owner === 0) inc += n.yield;
    n.sp = (n.sp || 0) - dt; if (n.sp <= 0 && nodeVisible(w, n) && n.ourP > 0 && n.emP > 0) { n.sp = .35; FX.spark(n.x + (w.rng() - .5) * 1.4, n.y + (w.rng() - .5) * 1.4, 14, w.rng() < .5 ? COL.amber : COL.rival, 2); }
  }
  w.nodeInc = inc; w.ore += inc * dt;
}
const ownedNodes = w => (w.nodes || []).filter(n => n.owner === 0).length;
function marketShare(w) { if (!w.nodes) return 0; const tot = w.nodes.reduce((a, n) => a + n.yield, 0); return Math.round(100 * w.nodes.filter(n => n.owner === 0).reduce((a, n) => a + n.yield, 0) / tot); }
const upkeepRate = w => { const f = w.units.filter(u => u.team === 0 && u.type === 'feat').length, p = w.units.filter(u => u.team === 0 && u.type === 'pfeat').length, k = 1 + (f + p) / 30; return (UPKEEP_F * f + UPKEEP_P * p) * k * archUpkeep(w); };

/* ── 視野（戰爭迷霧）── */
function computeVision(w) {
  const v = w.vis; if (w.demo) { v.fill(2); return; } for (let i = 0; i < v.length; i++) if (v[i] === 2) v[i] = 1;
  const rev = (cx, cy, r) => {
    const r2 = r * r, j0 = Math.max(0, Math.floor(cy - r)), j1 = Math.min(N - 1, Math.ceil(cy + r)), i0 = Math.max(0, Math.floor(cx - r)), i1 = Math.min(N - 1, Math.ceil(cx + r));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const dx = i + .5 - cx, dy = j + .5 - cy; if (dx * dx + dy * dy <= r2) v[j * N + i] = 2; }
  };
  for (const u of w.units) if (u.team === 0) rev(u.x, u.y, 5.2 + visBonus(w));
  for (const b of w.blds) if (b.team === 0) rev(bcx(b), bcy(b), b.built ? BLD[b.type].vision : 3.2);
  if (w.t - w.scanT < 8 && w.scanAt) rev(w.scanAt.x, w.scanAt.y, 7);
}

function updateEconomy(w, dt) {
  const W = 10; while (w.income.length && w.income[0].t < w.t - W) w.income.shift();
  let s = 0; for (const e of w.income) s += e.a;
  w.gross = s / Math.max(4, Math.min(W, w.t - w.t0));
  const debt = debtTotal(w); w.drain = DEBT_DRAIN * debtK(w) * debt; w.upkeep = upkeepRate(w); w.ore = Math.max(0, w.ore - (w.drain + w.upkeep) * dt); w.rate = w.gross - w.drain - w.upkeep + (w.nodeInc || 0); if (w.t > 40) w.peakRate = Math.max(w.peakRate || 0, w.rate);
  const hub = hubOf(w);
  w.isBlocked = !!hub && supplyUsed(w) >= supplyCap(w) && w.ore >= ENG_COST && hub.queue.length === 0;
  if (w.trackBlock && w.isBlocked) w.blockT += dt;
  const det = w.blds.some(b => b.type === 'obs' && b.built && b.team === 0);
  if (det && !w.detected) { w.detected = true; w.detectT = w.t; EMIT('detected', {}); } else if (!det) w.detected = false;
  w.microTax = w.tag.microOn && w.trust < 50 ? 2 : 0;
  if (w.pings.length) w.pings = w.pings.filter(p => p.until > w.t);
  if (w.incidentCd > 0) w.incidentCd -= dt;
  if (debt >= incidentAt(w) && w.incidentCd <= 0 && hub) { hub.haltT = 8; w.incidentCd = 30; EMIT('incident', { hub }); }
}

function addRival(w, x, y) {
  const b = { id: w.nid++, kind: 'ebld', type: 'ebase', team: 1, x, y, w: 3, h: 3, hgt: 42, built: true };
  w.rival = { blds: [b], b, seenAt: -999, units: [] }; w.byId.set(b.id, b); rebuildBlocked(w);
  for (let i = 0; i < 3; i++) { const u = addUnit(w, x + .8 + i * .9, y + 3.9, 1); w.rival.units.push(u); u.wait = i; }
  return b;
}
function updateRival(w, dt) {
  const r = w.rival; if (!r) return; const b = r.b; let seen = false;
  for (let j = 0; j < b.h && !seen; j++) for (let i = 0; i < b.w; i++) if (w.vis[(b.y + j) * N + b.x + i] === 2) { seen = true; break; }
  if (seen) r.seenAt = w.t;
  for (const u of r.units) if (u.o.t === 'idle') {
    u.wait = (u.wait || 0) - dt;
    if (u.wait <= 0) { const a = w.rng() * 6.28, rr = 2.6 + w.rng() * 2.2; cmdMove(w, [u], b.x + 1.5 + Math.cos(a) * rr, b.y + 1.5 + Math.sin(a) * rr); u.wait = 1 + w.rng() * 3; }
  }
}
function tick(w, dt) {
  w.t += dt;
  for (const b of w.blds) { if (b.built && BLD[b.type].makes) updateProducer(w, b, dt); else b.anim += dt; }
  for (const u of w.units) updateUnit(w, u, dt);
  for (const u of w.units.filter(u => u.sunset != null)) { u.sunset -= dt; if (u.sunset <= 0) { w.units.splice(w.units.indexOf(u), 1); w.byId.delete(u.id); FX.burst(u.x, u.y, 12, COL.pink, 12); EMIT('sunset', { u }); } }
  separate(w); updateRival(w, dt); if (w.war) updateWar(w, dt); updateNodes(w, dt); updateResearch(w, dt);
  updateEconomy(w, dt);
  computeVision(w);
}
function warm(w, secs) { const n = Math.round(secs / .1); for (let i = 0; i < n; i++) tick(w, .1); FX.clear(); }
