/* ── 賽後統計：星海風格的戰後分析 ─────────────────────────────
   每 2 秒模擬時間取樣一筆 + 收集事件 → 結算畫面插入 4 個分頁的 SVG 曲線、關鍵數字、教材解讀。
   不改任何既有檔案：以 monkeypatch 包裝全域 tick、G.emit、G.start、G.finish、Screens.debrief。 */
const Stats = {
  S: [], E: [], t0: 0, acc: 0, active: false, hasRival: false, usesTrust: false, tab: 'eco',
  block: 0, blockRun: 0, blockMax: 0, blockMaxAt: 0, lastRes: 0, clockWas: false,
  sunsets: 0, sunBatch: 0, diedUs: 0, diedEm: 0, batchUs: 0, batchEm: 0, rsAcc: 0, firstSeen: null, firstDebt: null,

  reset(w) {
    Object.assign(this, { S: [], E: [], acc: 0, block: 0, blockRun: 0, blockMax: 0, blockMaxAt: 0, lastRes: 0, clockWas: false, sunsets: 0, sunBatch: 0, diedUs: 0, diedEm: 0, batchUs: 0, batchEm: 0, rsAcc: 0, firstSeen: null, firstDebt: null, tab: 'eco' });
    this.active = !!(w && G.mission && !G.mission.theater && !G.backdrop);
    this.t0 = w ? w.t : 0; this.hasRival = !!(w && (w.rival || w.nodes)); this.usesTrust = !!(w && (G.has('views') || (w.tag && w.tag.microOn)));
    if (this.active) { this.lastRes = ((w.tag && w.tag.results) || []).length; this.sample(w, G); }
  },
  rel(w) { return Math.max(0, w.t - this.t0); },
  live(g) { return this.active && g && g.w && g.mission && !g.mission.theater && !g.backdrop; },

  tick(w, g, dt) {
    if (!this.live(g) || w !== g.w || g.over) return;
    // Supply Block 精確累計（每個 tick）
    const coachOff = typeof Coach === 'undefined' || Coach.state === 'off'; // 教學刻意製造的卡頓不算玩家的
    if (w.isBlocked && coachOff) { this.block += dt; this.blockRun += dt; if (this.blockRun > this.blockMax) { this.blockMax = this.blockRun; this.blockMaxAt = this.rel(w); } } else this.blockRun = 0;
    if (g.clockOn && !this.clockWas && this.S.length > 1) this.ev(w, 'start', L('任務開始（教學結束）', 'Mission start (tutorial over)'), '#3ee0a1', '▶');
    this.clockWas = !!g.clockOn;
    // 決策點結算（主線尚未 emit dpResolved 時，從 results 長度補）
    const res = (w.tag && w.tag.results) || [];
    if (res.length > this.lastRes) {
      for (let i = this.lastRes; i < res.length; i++) { const r = res[i]; if (!this.E.some(e => e.type === 'dp' && Math.abs(e.t - this.rel(w)) < 6)) this.ev(w, 'dp', L(`決策點 ${(r.idx ?? i) + 1}：${r.label}（♥${r.delta > 0 ? '+' : ''}${r.delta}）`, `Decision point ${(r.idx ?? i) + 1}: ${r.label} (♥${r.delta > 0 ? '+' : ''}${r.delta})`), '#f5b942', '◆'); }
      this.lastRes = res.length;
    }
    this.acc += dt; if (this.acc >= 2) { this.acc = 0; this.sample(w, g); }
  },

  sample(w, g) {
    const us = engs(w), crew = { mine: 0, build: 0, research: 0, repay: 0, idle: 0, other: 0 };
    for (const u of us) { const t = u.o.t; if (t in crew && t !== 'other') crew[t]++; else crew.other++; }
    let br = null; if (this.hasRival) { try { br = project(w, 'bridge', g); } catch (e) { br = null; } }
    const debt = debtTotal(w), sees = debt > .05 && w.debts.some(d => typeof debtVisible === 'function' ? debtVisible(w, d) : w.detected);
    const t = this.rel(w);
    if (debt >= 3 && this.firstDebt == null) this.firstDebt = t;
    if (sees && this.firstSeen == null) this.firstSeen = t;
    const army = w.rival && w.rival.army != null ? (Array.isArray(w.rival.army) ? w.rival.army.length : +w.rival.army) : null;
    this.S.push({
      t, ore: w.ore, rate: w.rate || 0, eng: us.length, feat: typeof feats === 'function' ? feats(w).length : 0, debt, sees, detected: !!w.detected,
      trust: w.trust, share: w.nodes ? marketShare(w) : null, our: br ? br.ourPower : null, riv: br ? br.rivalPower : null,
      used: supplyUsed(w), cap: supplyCap(w), blocked: !!w.isBlocked && (typeof Coach === 'undefined' || Coach.state === 'off'), crew, tech: w.tech && w.tech.cur ? w.tech.cur.name : null,
      army, kills: w.stats ? w.stats.kills : null, losses: w.stats ? w.stats.losses : null,
    });
    if (this.sunBatch) { this.ev(w, 'sunset', L(`下架 ${this.sunBatch} 個功能`, `Retired ${this.sunBatch} ${this.sunBatch === 1 ? 'feature' : 'features'}`), '#ff6b9a', '−'); this.sunBatch = 0; }
    if (this.batchUs + this.batchEm >= 3) this.ev(w, 'fight', L(`激戰：我方 −${this.batchUs}、對手 −${this.batchEm}`, `Heavy fighting: us −${this.batchUs}, rival −${this.batchEm}`), '#ff5a4d', '✕');
    this.batchUs = 0; this.batchEm = 0;
  },

  ev(w, type, text, color, icon) {
    const t = this.rel(w);
    if (this.E.some(e => e.type === type && e.text === text && Math.abs(e.t - t) < 1.5)) return;
    this.E.push({ t, type, text, color, icon });
  },
  onEvent(type, d) {
    const g = G; if (!this.live(g) || g.over) return; const w = g.w;
    switch (type) {
      case 'nodeFlip': { const n = d.n; if (d.owner === 0) this.ev(w, 'node', L(`拿下 ${n.name}`, `Took ${n.name}`), '#3ee0a1', '⚑'); else this.ev(w, 'node', d.absorbed ? L(`${n.name} 被對手吸收（沒人駐守）`, `${n.name} absorbed by rival (unguarded)`) : L(`${n.name} 被對手佔領`, `${n.name} taken by rival`), '#ff5a4d', '⚑'); break; }
      case 'techDone': this.ev(w, 'tech', L(`研發完成：${d.name}${d.lvl > 1 ? ' ' + 'I'.repeat(d.lvl) : ''}`, `Research complete: ${d.name}${d.lvl > 1 ? ' ' + 'I'.repeat(d.lvl) : ''}`), '#a58bff', '★'); break;
      case 'incident': this.ev(w, 'incident', L('技術債事故：需求池停擺', 'Tech debt incident: Backlog Hub halted'), '#ff5a4d', '!'); break;
      case 'built': {
        const b = d.b, map = { obs: [L('監控中心完工：技術債被看見', 'Observability built: tech debt now visible'), '#a58bff', '◉'], lab: [L('研發中心完工', 'R&D Lab built'), '#a58bff', '⌂'], squad: [L('開發小隊完工', 'Dev Squad built'), '#f5b942', '⌂'], plat: [L('平台組完工', 'Platform Team built'), '#f5b942', '⌂'], comms: [L('協作制度完工（+▤）', 'Comms Layer built (+▤)'), '#f5b942', '▤'] };
        const m = b && map[b.type]; if (m) this.ev(w, 'built', m[0], m[1], m[2]); break;
      }
      case 'engReport': this.ev(w, 'seen', L(`工程師回報：腳邊 ${d.n || '?'} 點債被看見`, `Engineer report: ${d.n || '?'} pts of debt spotted underfoot`), '#ff8fb1', '!'); break;
      case 'sunset': this.sunsets++; this.sunBatch++; break;
      case 'unitDied': if (d && d.team === 0) { this.diedUs++; this.batchUs++; } else { this.diedEm++; this.batchEm++; } break;
      case 'wave': this.ev(w, 'wave', L(`對手出兵${d && d.text ? '：' + d.text : ''}`, d && d.text ? d.text : 'Rival attack'), '#ff6a4a', '▲'); break; // 英文 d.text 已以 "Rival wave…" 開頭，不再加前綴
      case 'dpResolved': this.ev(w, 'dp', L(`決策點：${d.label}（♥${d.delta > 0 ? '+' : ''}${d.delta}）`, `Decision point: ${d.label} (♥${d.delta > 0 ? '+' : ''}${d.delta})`), '#f5b942', '◆'); break;
    }
  },

  /* ── 圖表 ── */
  fmt(t) { return fmtTime(t); },
  niceMax(v) { if (!(v > 0)) return 1; const p = Math.pow(10, Math.floor(Math.log10(v))), m = v / p; return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p; },
  tabs() {
    const t = [['eco', L('經濟', 'Economy')], ['crew', L('團隊', 'Team')], ['health', L('健康', 'Health')]];
    if (this.hasRival && this.S.some(s => s.our != null)) t.splice(1, 0, ['power', L('戰力', 'Power')]);
    return t;
  },
  chart(kind, W) {
    const S = this.S, mob = W < 520, H = mob ? 178 : 210, Lm = 40, Rm = 42, T = 26, B = 24, iw = W - Lm - Rm, ih = H - T - B;
    const t1 = Math.max(10, S[S.length - 1].t), x = t => Lm + clamp(t / t1, 0, 1) * iw;
    const steps = [10, 15, 30, 60, 120, 180, 300, 600], st = steps.find(s => t1 / s <= (mob ? 4 : 6)) || 600;
    let g = `<rect x="${Lm}" y="${T}" width="${iw}" height="${ih}" fill="rgba(255,255,255,.02)" stroke="rgba(130,180,215,.18)"/>`;
    for (let t = 0; t <= t1 + .01; t += st) g += `<line x1="${x(t)}" y1="${T}" x2="${x(t)}" y2="${T + ih}" stroke="rgba(130,180,215,.08)"/><text x="${x(t)}" y="${H - 7}" class="st-ax" text-anchor="middle">${this.fmt(t)}</text>`;
    const axisL = (max, unit) => { let s = ''; for (let i = 0; i <= 4; i++) { const v = max * i / 4, y = T + ih - ih * i / 4; s += `<line x1="${Lm}" y1="${y}" x2="${Lm + iw}" y2="${y}" stroke="rgba(130,180,215,${i ? .07 : .2})"/><text x="${Lm - 5}" y="${y + 3.5}" class="st-ax" text-anchor="end">${Math.round(v)}${unit || ''}</text>`; } return s; };
    const axisR = (max, unit, col) => { let s = ''; for (let i = 0; i <= 4; i++) { const v = max * i / 4, y = T + ih - ih * i / 4; s += `<text x="${Lm + iw + 5}" y="${y + 3.5}" class="st-ax" fill="${col}" style="fill:${col}">${(max < 10 && v % 1) ? v.toFixed(1) : Math.round(v)}${unit || ''}</text>`; } return s; };
    const line = (key, max, col, opt = {}) => {
      let d = '', pen = false;
      for (const s of S) { const v = typeof key === 'function' ? key(s) : s[key]; if (v == null || !isFinite(v)) { pen = false; continue; } const y = T + ih - ih * clamp(v / max, 0, 1.02); d += (pen ? 'L' : 'M') + x(s.t).toFixed(1) + ' ' + y.toFixed(1); pen = true; }
      if (!d) return '';
      let area = '';
      if (opt.area) { const pts = S.filter(s => (typeof key === 'function' ? key(s) : s[key]) != null); if (pts.length > 1) area = `<path d="${d} L${x(pts[pts.length - 1].t)} ${T + ih} L${x(pts[0].t)} ${T + ih} Z" fill="${col}" opacity=".13"/>`; }
      return area + `<path d="${d}" fill="none" stroke="${col}" stroke-width="${opt.w || 2}" ${opt.dash ? `stroke-dasharray="${opt.dash}"` : ''} stroke-linejoin="round" stroke-linecap="round"/>`;
    };
    const bands = (pred, col, op) => { let s = '', a = null; for (let i = 0; i < S.length; i++) { const on = pred(S[i]); if (on && a == null) a = S[i].t; if ((!on || i === S.length - 1) && a != null) { const b2 = on ? S[i].t : S[i].t; s += `<rect x="${x(a)}" y="${T}" width="${Math.max(2, x(b2) - x(a))}" height="${ih}" fill="${col}" opacity="${op}"/>`; a = null; } } return s; };
    let legend = [];
    if (kind === 'eco') {
      const mo = this.niceMax(Math.max(...S.map(s => s.ore)) * 1.05), mr = this.niceMax(Math.max(1, ...S.map(s => s.rate)) * 1.1);
      g += axisL(mo) + axisR(mr, '', '#3ee0a1') + line('ore', mo, '#5aa9ff', { area: true }) + line(s => Math.max(0, s.rate), mr, '#3ee0a1', { w: 2.2 });
      legend = [['#5aa9ff', L('預算 ●（左軸）', 'Budget ● (left axis)')], ['#3ee0a1', L('產出 ●/s（右軸）', 'Output ●/s (right axis)')]];
    } else if (kind === 'power') {
      const mp = this.niceMax(Math.max(10, ...S.map(s => Math.max(s.our || 0, s.riv || 0))) * 1.08);
      g += axisL(mp) + line('riv', mp, '#ff5a4d', { area: true }) + line('our', mp, '#3ee0a1', { w: 2.2 });
      legend = [['#3ee0a1', L('我方戰力', 'Our power')], ['#ff5a4d', L('對手戰力（主管看到的）', 'Rival power (as the Manager sees it)')]];
      if (S.some(s => s.share != null)) { g += axisR(100, '%', '#f5b942') + line('share', 100, '#f5b942', { dash: '5 4' }); legend.push(['#f5b942', L('市佔 %（右軸）', 'Market share % (right axis)')]); }
      if (S.some(s => s.army != null)) { const ma = this.niceMax(Math.max(1, ...S.map(s => s.army || 0))); g += line('army', ma, '#ff9f8c', { dash: '2 3', w: 1.6 }); legend.push(['#ff9f8c', L(`對手單位數（0–${ma}）`, `Rival units (0–${ma})`)]); }
    } else if (kind === 'crew') {
      const keys = [['mine', '#5aa9ff', L('採礦', 'Mining')], ['build', '#f5b942', L('建造', 'Building')], ['research', '#a58bff', L('研發', 'R&D')], ['repay', '#ff6b9a', L('還債', 'Paying debt')], ['other', '#7b8a97', L('移動／其他', 'Moving / other')], ['idle', '#ff5a4d', L('閒置', 'Idle')]];
      const mt = this.niceMax(Math.max(1, ...S.map(s => s.eng)));
      g += axisL(mt);
      const base = S.map(() => 0);
      for (const [k, col] of keys) {
        if (!S.some(s => s.crew[k] > 0)) continue;
        let top = '', bot = '';
        S.forEach((s, i) => { const y0 = T + ih - ih * base[i] / mt, y1 = T + ih - ih * (base[i] + s.crew[k]) / mt; top += (i ? 'L' : 'M') + x(s.t).toFixed(1) + ' ' + y1.toFixed(1); bot = 'L' + x(s.t).toFixed(1) + ' ' + y0.toFixed(1) + bot; base[i] += s.crew[k]; });
        g += `<path d="${top} ${bot} Z" fill="${col}" opacity=".62" stroke="${col}" stroke-width=".6"/>`;
      }
      legend = keys.filter(([k]) => S.some(s => s.crew[k] > 0)).map(([, c, n]) => [c, n]);
    } else {
      const md = this.niceMax(Math.max(5, ...S.map(s => s.debt)) * 1.1);
      g += bands(s => s.blocked, '#ff5a4d', .16) + axisL(md);
      // 技術債：PM 看得見的段落實線、看不見的段落虛線
      let dv = '', dh = '';
      for (let i = 1; i < S.length; i++) { const a = S[i - 1], b = S[i]; const seg = `M${x(a.t).toFixed(1)} ${(T + ih - ih * clamp(a.debt / md, 0, 1)).toFixed(1)}L${x(b.t).toFixed(1)} ${(T + ih - ih * clamp(b.debt / md, 0, 1)).toFixed(1)}`; if (a.debt < .05 && b.debt < .05) dv += seg; else if (b.sees) dv += seg; else dh += seg; }
      g += `<path d="${dv}" fill="none" stroke="#ff6b9a" stroke-width="2.2"/><path d="${dh}" fill="none" stroke="#ff6b9a" stroke-width="2" stroke-dasharray="4 4" opacity=".85"/>`;
      legend = [['#ff6b9a', L('技術債（實線＝PM 看得見、虛線＝看不見）', 'Tech debt (solid = PM can see it, dashed = can\'t)')]];
      if (S.some(s => s.blocked)) legend.push(['rgba(255,90,77,.5)', L('Supply Block 區段', 'Supply Block periods')]);
      if (this.usesTrust || S.some(s => s.trust !== S[0].trust)) { g += axisR(100, '', '#ffb36b') + line('trust', 100, '#ffb36b', { w: 2 }); legend.push(['#ffb36b', L('信任（右軸 0–100）', 'Trust (right axis, 0–100)')]); }
    }
    // 事件標記（同位置的往下疊）
    const lanes = [];
    this.E.forEach((e, i) => {
      if (e.t > t1 + 1) return; const ex = x(e.t); let lane = 0; while (lanes[lane] != null && ex - lanes[lane] < 15) lane++; lanes[lane] = ex;
      const cy = T + 8 + lane * 15;
      g += `<g class="st-ev" data-i="${i}"><line x1="${ex}" y1="${cy + 6}" x2="${ex}" y2="${T + ih}" stroke="${e.color}" stroke-dasharray="2 3" opacity=".55"/><circle cx="${ex}" cy="${cy}" r="7" fill="#0b121c" stroke="${e.color}" stroke-width="1.5"/><text x="${ex}" y="${cy + 3.5}" text-anchor="middle" class="st-ic" style="fill:${e.color}">${e.icon}</text><title>${this.fmt(e.t)} ${e.text}</title><rect x="${ex - 9}" y="${cy - 9}" width="18" height="${T + ih - cy + 9}" fill="transparent"/></g>`;
    });
    const lg = legend.map(([c, n]) => `<span><i style="background:${c}"></i>${n}</span>`).join('');
    return `<div class="st-legend">${lg}</div><svg class="st-svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${L('賽後曲線', 'Post-game charts')}">${g}</svg>`;
  },

  /* ── 關鍵數字與教材解讀 ── */
  summary() {
    const S = this.S, w = G.w, last = S[S.length - 1];
    const peakRate = S.reduce((m, s) => s.rate > m.rate ? s : m, S[0]);
    const peakDebt = S.reduce((m, s) => s.debt > m.debt ? s : m, S[0]);
    const minTrust = S.reduce((m, s) => s.trust < m.trust ? s : m, S[0]);
    const manSec = Math.round((w && w.tech && w.tech.manSec) || 0);
    const lostFeat = this.sunsets + this.diedUs;
    const idleAvg = S.reduce((a, s) => a + s.crew.idle, 0) / S.length, engAvg = S.reduce((a, s) => a + s.eng, 0) / S.length;
    const keys = [
      [L('最高產出', 'Peak output'), `${Math.max(0, peakRate.rate).toFixed(1)} ●/s`, L(`在 ${this.fmt(peakRate.t)}`, `at ${this.fmt(peakRate.t)}`)],
      [L('Supply Block 累計', 'Supply Block total'), L(`${Math.round(this.block)} 秒`, `${Math.round(this.block)}s`), this.blockMax >= 1 ? L(`最長一次 ${Math.round(this.blockMax)}s`, `longest ${Math.round(this.blockMax)}s`) : L('幾乎沒卡', 'barely blocked')],
      [L('技術債最高點', 'Peak tech debt'), peakDebt.debt >= .5 ? L(`${Math.ceil(peakDebt.debt)} 點`, `${Math.ceil(peakDebt.debt)} pts`) : '0', peakDebt.debt >= .5 ? L(`${this.fmt(peakDebt.t)}・PM ${peakDebt.sees ? '看得見' : '<b class="st-bad">看不見</b>'}`, `${this.fmt(peakDebt.t)} · PM ${peakDebt.sees ? 'could see it' : '<b class="st-bad">couldn\'t see it</b>'}`) : L('這局沒欠債', 'no debt this match')],
      [L('研發投入', 'R&D (person-sec)'), L(`${manSec} 人·秒`, `${manSec}`), manSec ? L('研究員那段時間不採礦', 'researchers weren\'t mining meanwhile') : L('沒有研發', 'no R&D')],
      [L('失去的功能', 'Features lost'), L(`${lostFeat} 個`, `${lostFeat}`), lostFeat ? L(`下架 ${this.sunsets}・被擊退 ${this.diedUs}`, `retired ${this.sunsets} · destroyed ${this.diedUs}`) : '—'],
    ];
    if (this.usesTrust || S.some(s => s.trust !== S[0].trust)) keys.push([L('信任最低點', 'Lowest Trust'), `♥ ${Math.round(minTrust.trust)}`, L(`在 ${this.fmt(minTrust.t)}${minTrust.trust < 50 ? '・<b class="st-bad">已低於 50</b>' : ''}`, `at ${this.fmt(minTrust.t)}${minTrust.trust < 50 ? ' · <b class="st-bad">below 50</b>' : ''}`)]);
    if (this.diedEm || (last.kills != null)) keys.push([L('擊退對手', 'Rival kills'), `${last.kills != null ? last.kills : this.diedEm}`, L('對手被擊退的單位', 'rival units knocked out')]);
    // 教材解讀：依序挑最有料的 1–2 條
    const reads = [];
    if (peakDebt.debt >= 8) {
      const fd = this.firstDebt, fs = this.firstSeen;
      if (fs == null) reads.push(L(`技術債在 ${this.fmt(peakDebt.t)} 達到 ${Math.ceil(peakDebt.debt)} 點，<b>你整局都沒看見它</b> —— 產出掉了，卻不知道原因。蓋監控中心，或坐到工程師的位子按「回報」。`, `Tech debt hit ${Math.ceil(peakDebt.debt)} pts at ${this.fmt(peakDebt.t)}, and <b>you never saw it the whole match</b> — output dropped and you didn't know why. Build Observability, or take the Engineer's seat and hit "Report".`));
      else if (fd != null && fs - fd >= 15) reads.push(L(`技術債從 ${this.fmt(fd)} 開始累積，你到 ${this.fmt(fs)} 才看見 —— <b>中間 ${Math.round(fs - fd)} 秒，你在為看不見的東西付錢</b>。`, `Tech debt started piling up at ${this.fmt(fd)}, but you only saw it at ${this.fmt(fs)} — <b>for ${Math.round(fs - fd)}s you were paying for something you couldn't see</b>.`));
    }
    if (this.block >= 10) reads.push(L(`你被 Supply Block 卡了 <b>${Math.round(this.block)} 秒</b>（最長一次 ${Math.round(this.blockMax)} 秒，在 ${this.fmt(Math.max(0, this.blockMaxAt - this.blockMax))}）—— 錢在帳上，人卻生不出來。協作制度要在滿之前就蓋。`, `You were Supply Blocked for <b>${Math.round(this.block)}s</b> (longest stretch ${Math.round(this.blockMax)}s, at ${this.fmt(Math.max(0, this.blockMaxAt - this.blockMax))}) — money in the bank, but nobody could be hired. Build the Comms Layer before you hit the cap.`));
    if (engAvg >= 3 && idleAvg / engAvg >= .15) reads.push(L(`平均有 <b>${idleAvg.toFixed(1)} 位工程師閒著</b>（約 ${Math.round(idleAvg / engAvg * 100)}%）—— 閒置是最安靜的浪費。F1 一鍵找出他們。`, `On average <b>${idleAvg.toFixed(1)} engineers sat idle</b> (about ${Math.round(idleAvg / engAvg * 100)}%) — idling is the quietest kind of waste. Press F1 to find them.`));
    if (manSec > 0) {
      const rs = S.filter(s => s.crew.research > 0), nr = S.filter(s => s.crew.research === 0 && s.t > 20);
      if (rs.length >= 3 && nr.length >= 3) { const a = rs.reduce((x, s) => x + s.rate, 0) / rs.length, b = nr.reduce((x, s) => x + s.rate, 0) / nr.length; if (b > 0) reads.push(L(`研發共投入 <b>${manSec} 人·秒</b>；研發期間平均產出 ${a.toFixed(1)} ●/s，其他時間 ${b.toFixed(1)} ●/s —— ${a < b ? `研發那段少了 ${Math.round((1 - a / b) * 100)}%，這就是機會成本` : '研發沒有拖慢產出'}。`, `You put <b>${manSec} person-seconds</b> into R&D; output averaged ${a.toFixed(1)} ●/s during research vs ${b.toFixed(1)} ●/s the rest of the time — ${a < b ? `${Math.round((1 - a / b) * 100)}% less while researching. That's opportunity cost` : 'research didn\'t slow output down'}.`)); }
    }
    if (minTrust.trust < 50) reads.push(L(`信任在 ${this.fmt(minTrust.t)} 掉到 <b>${Math.round(minTrust.trust)}</b> —— 低於 50 老闆開始微管理，佔走你的管理頻寬。事前預警是唯一不花資源的止血。`, `Trust fell to <b>${Math.round(minTrust.trust)}</b> at ${this.fmt(minTrust.t)} — below 50 the Boss starts micromanaging and eats into your bandwidth. Flagging risks early is the only fix that costs nothing.`));
    if (S.some(s => s.share != null)) { const ms = S.reduce((m, s) => (s.share || 0) > (m.share || 0) ? s : m, S[0]); if (ms.share > 0) reads.push(L(`市佔最高 ${ms.share}%（${this.fmt(ms.t)}），結束時 <b>${last.share}%</b>。${last.share < ms.share ? '拿下的據點沒守住 —— 據點要有人駐守。' : ''}`, `Market share peaked at ${ms.share}% (${this.fmt(ms.t)}) and ended at <b>${last.share}%</b>.${last.share < ms.share ? ' You didn\'t hold the zones you took — zones need someone stationed there.' : ''}`)); }
    if (!reads.length) reads.push(L(`產出在 ${this.fmt(peakRate.t)} 達到最高 ${Math.max(0, peakRate.rate).toFixed(1)} ●/s。這局沒有明顯的卡點 —— 試試自由對戰，對手會讓局面複雜得多。`, `Output peaked at ${Math.max(0, peakRate.rate).toFixed(1)} ●/s at ${this.fmt(peakRate.t)}. No obvious bottlenecks this match — try Free Play; a Rival makes things a lot messier.`));
    return { keys, reads: reads.slice(0, 2) };
  },

  /* ── 插入結算畫面 ── */
  inject() {
    if (!this.active || this.S.length < 3) return;
    const card = document.querySelector('#modal .card'); if (!card || card.querySelector('.st-wrap')) return;
    const box = el('div', 'st-wrap'), sm = this.summary(), tabs = this.tabs();
    if (!tabs.some(t => t[0] === this.tab)) this.tab = 'eco';
    box.innerHTML = `<div class="st-head"><b>${L('戰後分析', 'Post-Game Analysis')}</b><span>${L(`${this.fmt(this.S[this.S.length - 1].t)} · ${this.S.length} 筆取樣 · ${this.E.length} 個事件`, `${this.fmt(this.S[this.S.length - 1].t)} · ${this.S.length} samples · ${this.E.length} ${this.E.length === 1 ? 'event' : 'events'}`)}</span></div>
      <div class="st-tabs">${tabs.map(([k, n]) => `<button data-tab="${k}" class="${k === this.tab ? 'on' : ''}">${n}</button>`).join('')}</div>
      <div class="st-chart"></div><div class="st-cap">${L('點圖上的標記看事件', 'Click a marker on the chart to see the event')}</div>
      <div class="st-keys">${sm.keys.map(([k, v, s]) => `<div><span>${k}</span><b>${v}</b><small>${s}</small></div>`).join('')}</div>
      <div class="st-read"><b>${L('教材解讀', 'What it means')}</b>${sm.reads.map(r => `<p>${r}</p>`).join('')}</div>`;
    const lesson = card.querySelector('.lesson'); if (lesson) card.insertBefore(box, lesson); else card.appendChild(box);
    const draw = () => { const c = box.querySelector('.st-chart'); if (!c || !box.isConnected) return; const W = Math.max(260, Math.floor(c.clientWidth || box.clientWidth || 600)); c.innerHTML = this.chart(this.tab, W); };
    box.querySelector('.st-tabs').addEventListener('click', e => { const b = e.target.closest('button[data-tab]'); if (!b) return; this.tab = b.dataset.tab; box.querySelectorAll('.st-tabs button').forEach(x => x.classList.toggle('on', x === b)); draw(); box.querySelector('.st-cap').textContent = L('點圖上的標記看事件', 'Click a marker on the chart to see the event'); if (typeof SFX !== 'undefined') SFX.play('click'); });
    box.querySelector('.st-chart').addEventListener('click', e => { const gEl = e.target.closest('.st-ev'); if (!gEl) return; const ev = this.E[+gEl.dataset.i]; if (ev) box.querySelector('.st-cap').innerHTML = `<b style="color:${ev.color}">${ev.icon} ${this.fmt(ev.t)}</b>${L('　', ' ')}${ev.text}`; });
    draw();
    if (!this._rz) { this._rz = true; let tm = 0; addEventListener('resize', () => { clearTimeout(tm); tm = setTimeout(() => { const b = document.querySelector('#modal .st-wrap'); if (b) { const c = b.querySelector('.st-chart'); c.innerHTML = this.chart(this.tab, Math.max(260, Math.floor(c.clientWidth))); } }, 120); }); }
  },
};

/* ── 掛鉤（monkeypatch，不改既有檔案）── */
(function () {
  const _tick = tick;
  tick = function (w, dt) { _tick(w, dt); try { Stats.tick(w, G, dt); } catch (e) { console.error(e); } };
  const _emit = G.emit;
  G.emit = function (t, d) { try { Stats.onEvent(t, d); } catch (e) { console.error(e); } return _emit.call(this, t, d); };
  const _start = G.start;
  G.start = function (idx, opts) { const r = _start.apply(this, arguments); try { Stats.reset(this.w); } catch (e) { console.error(e); } return r; };
  const _finish = G.finish;
  G.finish = function (win, data) { try { if (!this.over && Stats.live(this)) Stats.sample(this.w, this); } catch (e) { console.error(e); } return _finish.apply(this, arguments); };
  const _deb = Screens.debrief;
  Screens.debrief = function (win, data) { const r = _deb.apply(this, arguments); try { Stats.inject(); } catch (e) { console.error(e); } return r; };
})();
