/* ── HUD／面板／提示。只讀 G.w，動作一律走 G ─────────────── */
const Modal = {
  el: null, isOpen: false,
  init() { this.el = $('#modal'); },
  show(html, opts = {}) { this.el.innerHTML = html; this.el.className = 'on' + (opts.clear ? ' clear' : '') + (opts.cls ? ' ' + opts.cls : ''); this.isOpen = true; this.el.scrollTop = 0; return this.el; },
  hide() { this.el.className = 'off'; this.el.innerHTML = ''; this.isOpen = false; },
};

const UI = {
  sig: '', infoSig: '', shown: new Set(), rateHist: [], feedN: 0,
  init() {
    this.hud = $('#hud'); this.pOre = $('#pOre'); this.pSup = $('#pSup'); this.pDebt = $('#pDebt'); this.pTrust = $('#pTrust');
    this.bc = $('#bc'); this.br = $('#br'); this.idle = $('#idle');
    this.br.addEventListener('click', e => { const b = e.target.closest('.cbtn'); if (b && !b.classList.contains('empty')) { SFX.init(); G.doCmd(b.dataset.cmd); } });
    this.idle.onclick = () => { SFX.init(); G.selectIdle(); };
    $('#home').onclick = () => G.goHome(); $('#layer').addEventListener('click', e => { const b = e.target.closest('button[data-eng]'); if (b && !b.disabled) { SFX.init(); G.engAct(b.dataset.eng); } }); $('#rep').onclick = () => { SFX.init(); Report.open(); };
    $('#bMute').onclick = () => { SFX.init(); $('#bMute').style.color = SFX.toggle() ? '' : '#5a6a78'; };
    $('#bMute').style.color = SFX.on ? '' : '#5a6a78';
    $('#bPause').onclick = () => G.togglePause();
    $('#bSpeed').onclick = () => G.cycleSpeed();
    $('#bMenu').onclick = () => G.menu(); $('#bTech').onclick = () => { SFX.init(); G.toggleTech(); };
    $('#tech').addEventListener('click', e => { const b = e.target.closest('button'); if (!b || b.disabled) return; SFX.init(); const a = b.dataset.act; if (a === 'close') G.toggleTech(false); else if (a === 'proj') G.techStart(b.closest('.proj').dataset.proj); else if (a) G.doCmd(a); });
    $$('#views button').forEach(b => b.onclick = () => G.setRole(b.dataset.role));
    $('#mm').addEventListener('pointerdown', e => { const r = e.target.getBoundingClientRect(), t = R.mmToTile((e.clientX - r.left) * (e.target.width / r.width), (e.clientY - r.top) * (e.target.height / r.height)); R.focus(t.x, t.y); const mv = ev => { const t2 = R.mmToTile((ev.clientX - r.left) * (e.target.width / r.width), (ev.clientY - r.top) * (e.target.height / r.height)); R.focus(t2.x, t2.y); }; const up = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); }; addEventListener('pointermove', mv); addEventListener('pointerup', up); });
  },
  reset() { this.techSig = ''; $('#tech').classList.add('hide'); $('#bTech').classList.add('hide'); this.layerH = ''; $('#layer').classList.add('hide'); $('#rep').classList.add('hide'); this.sig = ''; this.infoSig = ''; this.rateHist = []; this.shown.clear(); ['pSup', 'pDebt', 'pTrust', 'views', 'bl', 'bc', 'br', 'idle', 'home', 'layer', 'rep'].forEach(i => $('#' + i).classList.add('hide')); $('#views button.on')?.classList.remove('on'); $('#views [data-role=ground]').classList.add('on'); $('#feed').innerHTML = ''; },
  show(n) { const m = { sup: 'pSup', debt: 'pDebt', trust: 'pTrust', views: 'views', map: 'bl', home: 'home' }; const e = $('#' + (m[n] || n)); if (e) { e.classList.remove('hide'); this.shown.add(n); } },
  hide(n) { const m = { sup: 'pSup', debt: 'pDebt', trust: 'pTrust', views: 'views', map: 'bl', home: 'home' }; const e = $('#' + (m[n] || n)); if (e) e.classList.add('hide'); this.shown.delete(n); },
  toast(text, kind = '') { if (G.spectate) return; const d = el('div', kind, text); $('#toast').appendChild(d); setTimeout(() => d.remove(), 2700); while ($('#toast').children.length > 2) $('#toast').firstChild.remove(); },
  feed(text, kind = '') {
    const f = $('#feed'), d = el('div', kind, text); f.appendChild(d); while (f.children.length > 4) f.firstChild.remove();
    setTimeout(() => d.classList.add('old'), 7000); setTimeout(() => d.remove(), 7700);
  },
  alert(text, kind = 'warn') { this.toast(text, kind === 'bad' ? 'bad' : kind === 'good' ? 'good' : ''); this.feed(text, kind); SFX.play(kind === 'good' ? 'good' : 'alert'); },

  /* 指令卡 */
  cardDefs() {
    const g = G, w = g.w; if (!w) return []; const sel = g.selEnts(); if (!sel.length || g.role !== 'ground') return [];
    const us = sel.filter(e => e.kind === 'unit'), b = sel.length === 1 && sel[0].kind === 'bld' ? sel[0] : null, D = [];
    if (b && b.built && b.type === 'lab') {
      const lab = b, cur = w.tech.cur, asg = labAssigned(w, lab).length;
      return [{ cmd: 'tech-panel', name: '研發面板', cost: g.techOpen ? '收起 (T)' : '開啟 (T)', key: 'Q', on: g.techOpen }, { cmd: 'lab+1', name: '+1 研究員', cost: `派最近的人 · ${asg}/${LAB_SLOTS}`, key: 'W', dis: asg >= LAB_SLOTS }, { cmd: 'lab-1', name: '−1 研究員', cost: '召回最後派駐的', key: 'E', dis: !asg }, { cmd: 'tech-cancel', name: '取消研發', cost: cur ? `退 ●${Math.floor(cur.paid * .75)}（75%）` : '沒有進行中專案', key: 'A', dis: !cur }];
    }
    if (b && !b.built) {
      const paid = b.paid || 0; return [{ cmd: 'resume-site', name: '繼續建造', cost: '派最近的工程師', key: 'Q' }, { cmd: 'cancel-site', name: '取消建造', cost: `退 ●${Math.floor(paid * .75)}（75%）`, key: 'W' }];
    }
    const fu = us.filter(u => u.type !== 'eng');
    if (us.length && fu.length === us.length) {
      if (w.war) D.push({ cmd: 'amove', name: '攻擊移動', cost: '沿路遇敵就打', on: g.cmdMode === 'amove' });
      D.push({ cmd: 'move', name: '移動', cost: w.war ? '不還手，撤退用' : '再點地面／據點', on: g.cmdMode === 'move' });
      if (w.war) D.push({ cmd: 'hold', name: '原地駐守', cost: '只打靠近的' });
      D.push({ cmd: 'sunset', name: '下架', cost: '釋放▤·省維運', dis: false }); D.forEach((d, i) => d.key = 'QWEASDZXC'[i]);
    } else if (us.length) {
      if (g.has('comms')) { const c = bldCost(w, 'comms'); D.push({ cmd: 'build-comms', name: '協作制度', cost: `●${c} ▤+8`, short: w.ore < c }); }
      if (g.has('obs')) { const c = bldCost(w, 'obs'); D.push({ cmd: 'build-obs', name: '監控中心', cost: `●${c} Detector`, short: w.ore < c }); }
      if (g.has('lab')) { const c = bldCost(w, 'lab'), ok = w.blds.some(x => x.type === 'comms' && x.built); D.push({ cmd: 'build-lab', name: '研發中心', cost: ok ? `●${c} 升級・加速` : '先蓋協作制度', short: w.ore < c, dis: !ok }); }
      if (g.has('squad')) { const c = bldCost(w, 'squad'); D.push({ cmd: 'build-squad', name: '開發小隊', cost: `●${c} 出功能`, short: w.ore < c }); }
      if (g.has('plat')) { const c = bldCost(w, 'plat'), ok = w.blds.some(b => b.type === 'squad' && b.built); D.push({ cmd: 'build-plat', name: '平台組', cost: ok ? `●${c} 戰力＋15%` : '先蓋開發小隊', short: w.ore < c, dis: !ok }); }
      if (g.has('mine')) D.push({ cmd: 'mine', name: '採預算', cost: '去最近的礦' });
      if (g.has('lab') && labOf(w)) D.push({ cmd: 'assign-lab', name: '派駐研發', cost: `${labAssigned(w, labOf(w)).length}/${LAB_SLOTS} 研究位` });
      if (g.has('repay')) D.push({ cmd: 'repay', name: '還技術債', cost: w.detected ? `債 ${Math.ceil(debtTotal(w))} 點` : '需要 Detector', dis: !w.detected || !w.debts.length });
      if (g.has('move')) D.push({ cmd: 'move', name: '移動', cost: '再點地面', on: g.cmdMode === 'move' });
      D.forEach((d, i) => d.key = 'QWEASDZXC'[i]);
    } else if (b && BLD[b.type].makes && b.built) {
      const cap = supplyCap(w), used = supplyUsed(w), kind = BLD[b.type].makes, U = UNIT[kind], blocked = used + U.sup > cap;
      D[0] = { cmd: 'train', name: '訓練' + U.name, cost: `●${U.cost} ▤${U.sup} · ${Math.round(U.time * w.pace.mult)}s`, key: 'Q', short: w.ore < U.cost || blocked, pulse: false };
      if (g.has('pace')) for (const [i, k] of ['normal', 'fast', 'rush'].entries()) { const p = PACE[k]; D[3 + i] = { cmd: 'pace-' + k, name: p.name, cost: p.sub, key: 'ASD'[i], on: w.pace.key === k }; }
    }
    return D;
  },
  renderCard() {
    const D = this.cardDefs(), sig = JSON.stringify(D) + (G.role);
    if (sig === this.sigCard) return; this.sigCard = sig;
    if (!D.length) { this.br.classList.add('hide'); this.br.innerHTML = ''; return; }
    const rows = Math.ceil((D.length) / 3) * 3; let h = '';
    for (let i = 0; i < Math.max(3, rows); i++) { const d = D[i]; h += d ? `<button class="cbtn${d.short ? ' short' : ''}${d.dis ? ' dis' : ''}${d.on ? ' on' : ''}" data-cmd="${d.cmd}"><span class="k">${d.key}</span><span class="n">${d.name}</span><span class="c">${d.cost}</span></button>` : '<span class="cbtn empty"></span>'; }
    this.br.innerHTML = h; this.br.classList.remove('hide');
  },
  cardKey(k) { const D = this.cardDefs(); const d = D.find(x => x && x.key === k.toUpperCase()); if (d && !d.dis) { G.doCmd(d.cmd); return true; } return false; },

  /* 選取資訊 */
  infoHTML() {
    const g = G, w = g.w, sel = g.selEnts(); if (!w) return '';
    if (g.role !== 'ground') return '';
    if (!sel.length) return '';
    if (sel.length > 1 || sel[0].kind === 'unit' && sel.length > 1) {
      const ne = sel.filter(u => u.type === 'eng'), nf = sel.length - ne.length, idle = ne.filter(u => u.o && u.o.t === 'idle').length;
      const nm = nf && !ne.length ? '功能' : ne.length && !nf ? '工程師' : '單位';
      return `<div class="ihead"><div class="ico ${nf && !ne.length ? 'feat' : 'eng'}"></div><div><div class="iname">${nm} ×${sel.length}<small>${nf ? 'Feature' : 'Engineer'}</small></div><div class="istate">${nf && !ne.length ? (w.war ? `右鍵據點／敵人＝攻擊移動 · 右鍵地面＝移動（不還手）· 平均血量 <b>${Math.round(100 * sel.reduce((a, u) => a + (u.hp != null ? u.hp / u.maxHp : 1), 0) / sel.length)}%</b>` : '右鍵據點／地面 = 移動過去 · 站在據點上就有戰力') : `${idle ? `<b>${idle}</b> 人閒置` : '全員工作中'}　·　點礦點＝去採預算`}</div></div></div><div class="grp">${sel.slice(0, 24).map(u => `<span class="${u.type !== 'eng' ? 'f' : u.o.t === 'idle' ? 'idle' : ''}"></span>`).join('')}</div>`;
    }
    const e = sel[0];
    if (e.kind === 'node') {
      const vis = nodeVisible(w, e), ag = Math.round(w.t - e.seenAt), em = vis ? Math.round(e.emP) : (e.seenAt < 0 ? '?' : Math.round(e.seenEm) + '（快照 −' + ag + 's）');
      return `<div class="ihead"><div class="ico node"></div><div><div class="iname">${e.name}<small>市場據點</small><span class="tag ${e.owner === 0 ? 'good' : e.owner === 1 ? 'bad' : ''}">${e.owner === 0 ? '我方' : e.owner === 1 ? '對手' : '未佔領'}</span></div><div class="istate">佔領後每秒 <b>+${e.yield} ●</b>　·　我方戰力 <b>${Math.round(e.ourP)}</b> vs 對手 <b>${em}</b></div></div></div><div class="istate" style="margin-top:8px">${e.ent ? '需要 ≥1 個平台功能才能佔領。' : ''}把功能單位移到這裡；戰力持續高於對手 <b>20 秒</b>就佔領（進度 ${Math.round(Math.abs(e.bal))}/20）。</div>`;
    }
    if (e.kind === 'unit' && e.type !== 'eng') {
      const big = e.type === 'pfeat', pf = Math.min(.45, .15 * platCount(w));
      const hp = e.hp != null ? `<div class="bar ${e.hp / e.maxHp > .5 ? '' : 'amber'}" style="margin-top:6px"><i style="width:${Math.round(100 * e.hp / e.maxHp)}%"></i></div>` : '';
      if (w.war) return `<div class="ihead"><div class="ico feat"></div><div><div class="iname">${big ? '平台功能' : '功能'}<small>${big ? 'Platform' : 'Feature'}</small></div><div class="istate">血量 <b>${Math.ceil(e.hp || 0)}/${e.maxHp || '—'}</b>　·　傷害 <b>×${ourMult(w).toFixed(2)}</b>${effMult(w) < .99 ? `（技術債 −${Math.round(100 * (1 - effMult(w)))}%）` : ''}</div></div></div>${hp}<div class="istate" style="margin-top:8px">${big ? '平台功能：身邊的功能受到的傷害 <b>−25%</b>、全隊戰力 +15%（上限 +45%）。不直接搶據點。' : '站在據點上才有戰力；跟對手功能相遇會自動交戰。用不到就「下架」— 釋放頻寬、省維運。'}</div>`;
      return `<div class="ihead"><div class="ico feat"></div><div><div class="iname">${big ? '平台功能' : '功能'}<small>${big ? 'Platform' : 'Feature'}</small></div><div class="istate">${big ? '不直接搶據點；讓所有一般功能戰力 <b>+15%</b>（上限 +45%）' : `戰力 <b>${(FEAT_POWER * (1 + pf) * effMult(w)).toFixed(1)}</b>　·　維運 −${(UPKEEP_F * (1 + (feats(w).length) / 30)).toFixed(2)} ●/s`}</div></div></div><div class="istate" style="margin-top:8px">${big ? '佔 ▤2、每秒耗 0.10 ●。企業客戶據點需要至少 1 個。' : '站在市場據點上才有戰力。用不到就「下架」— 釋放頻寬、省維運（不退款）。'}</div>`;
    }
    if (e.kind === 'unit') {
      const o = e.o, st = o.t === 'idle' ? '<b style="color:var(--amber)">閒置</b> — 點礦點叫他工作' : o.t === 'move' ? '移動中' : o.t === 'mine' ? (o.ph === 'work' ? '採集預算中' : o.ph === 'back' ? '扛著預算回基地' : '前往礦點') : o.t === 'build' ? (o.ph === 'work' ? '建造中' : '前往工地') : o.t === 'repay' ? (o.ph === 'work' ? '還技術債中' : '前往技術債') : '';
      return `<div class="ihead"><div class="ico eng"></div><div><div class="iname">工程師<small>Engineer</small></div><div class="istate">${st}</div></div></div><div class="istate" style="margin-top:8px">採集 · 建造 · 還技術債 · 偵察，同一個人只能做一件事</div>`;
    }
    if (e.kind === 'bld') {
      const D = BLD[e.type];
      if (!e.built) { const nw = siteWorkers(w, e).length; return `<div class="ihead"><div class="ico ${e.type}"></div><div><div class="iname">${D.name}<small>${D.en}</small><span class="tag${nw ? '' : ' bad'}">${nw ? '建造中' : '停工'}</span></div><div class="istate">${Math.round(e.prog * 100)}% · ${nw ? `${nw} 位工程師在現場（蓋完前他們不能做別的）` : '<b>沒有工程師在施工</b> — 選工程師再點這座工地，或按「繼續建造」'}</div></div></div><div class="bar amber"><i style="width:${e.prog * 100}%"></i></div><div class="istate" style="margin-top:6px">想放棄？「取消建造」退回 ${Math.floor((e.paid || 0) * .75)} ●（75%）。</div>`; }
      if (BLD[e.type].makes) {
        const q = e.queue, cap = supplyCap(w), used = supplyUsed(w), qh = q.map((it, i) => `<span class="f">${i === 0 ? `<i style="height:${Math.min(100, it.t / it.dur * 100)}%"></i>` : ''}</span>`).join('') + '<span></span>'.repeat(Math.max(0, 3 - q.length));
        return `<div class="ihead"><div class="ico ${e.type}"></div><div><div class="iname">${D.name}<small>${D.en}</small></div><div class="istate">管理頻寬 <b>▤ ${used}/${cap}</b>${used >= cap ? '<span class="tag bad">Supply Block</span>' : ''}${e.haltT > 0 ? '<span class="tag bad">事故停擺</span>' : ''}</div></div></div><div class="queue">${qh}</div><div class="istate" style="margin-top:6px">右鍵地面${e.type === 'hub' ? '／礦點' : ''}＝設集合點${g.has('pace') ? `　·　節奏 <b>${w.pace.name}</b>` : ''}</div>`;
      }
      if (e.type === 'lab') {
        const cur = w.tech.cur, asg = labAssigned(w, e), work = labWorking(w, e).length, r = rankSum(work);
        return `<div class="ihead"><div class="ico lab"></div><div><div class="iname">${D.name}<small>${D.en}</small>${cur ? '<span class="tag v">研發中</span>' : ''}</div><div class="istate">${cur ? `<b>${cur.name}${cur.lvl > 1 ? ' ' + 'I'.repeat(cur.lvl) : ''}</b> ${Math.round(cur.prog / cur.W * 100)}% · ${work ? '速度 <b>×' + r.toFixed(2) + '</b>' : '<b style="color:var(--red)">沒人在研究</b>'}` : '沒有進行中的專案 — 開研發面板挑一個'}</div></div></div><div class="queue">${Array.from({ length: LAB_SLOTS }, (_, i) => `<span class="${i < work ? 'f' : ''}" title="第 ${i + 1} 位貢獻 ${RANK[i]}">${i < asg.length ? '' : ''}</span>`).join('')}</div><div class="istate" style="margin-top:6px">${work} 人 = ×${r.toFixed(2)}（不是 ×${work}）· 第 ${Math.min(work + 1, LAB_SLOTS)} 位只貢獻 ${RANK[Math.min(work, LAB_SLOTS - 1)]} · 研究員不採礦</div>`;
      }
      if (e.type === 'comms') return `<div class="ihead"><div class="ico comms"></div><div><div class="iname">${D.name}<small>${D.en}</small></div><div class="istate">提供 <b>▤ +${commsSupply(w)}</b> 管理頻寬 —— 團隊的「帶人容量」</div></div></div>`;
      if (e.type === 'obs') return `<div class="ihead"><div class="ico obs"></div><div><div class="iname">${D.name}<small>${D.en}</small><span class="tag v">Detector</span></div><div class="istate">${w.debts.length ? `已揭露技術債 <b>${Math.ceil(debtTotal(w))}</b> 點 — 選工程師，點債務塊還債` : '沒有偵測到技術債'}</div></div></div>`;
    }
    if (e.kind === 'patch') return `<div class="ihead"><div class="ico ore"></div><div><div class="iname">預算礦<small>Budget</small></div><div class="istate">選工程師後點它 = 去採預算 ●</div></div></div>`;
    return '';
  },
  renderInfo() {
    const h = this.infoHTML(); if (h === this.infoSig) return; this.infoSig = h;
    if (!h) { this.bc.classList.add('hide'); this.bc.innerHTML = ''; return; } this.bc.innerHTML = h; this.bc.classList.remove('hide');
  },

  layer(w, g) {
    const L = $('#layer'), role = g.role; this.hud.classList.toggle('r-eng', role === 'engineer'); if (role === 'ground' || !g.has('views')) { if (!L.classList.contains('hide')) L.classList.add('hide'); $('#bl').classList.toggle('hide', !this.shown.has('map')); return; }
    $('#bl').classList.add('hide'); let h = '';
    if (role === 'engineer') {
      const v = project(w, 'engineer', g, g);
      if (v.none) h = '<div class="lk" style="color:#ff8fb1">執行層 · 工程師</div><div class="lx">沒有工程師可以附身。</div>';
      else {
        const ago = v.lastOrder ? Math.round(w.t - v.lastOrder.at) : null;
        h = `<div class="lk" style="color:#ff8fb1">執行層 · 工程師 <small>ENGINEER · 同一個世界的第 4 種投影 · 只看得到身邊</small></div>
        <div class="l4"><div><span>我的任務</span><b class="sm">${v.task}</b></div><div><span>收到的指令</span><b class="sm">${v.lastOrder ? '「' + v.lastOrder.text + '」' : '—'}</b><span style="color:var(--dim)">${v.lastOrder ? ago + 's 前 · 沒說原因' : ''}</span></div>
        <div><span>這趟帶回</span><b class="${v.slowed ? 'bad' : ''}" style="${v.slowed ? 'color:var(--amber)' : ''}">${v.trip} / ${v.full}</b></div><div><span>視線內</span><b class="sm">同事 ${v.mates} · 卡點 ${v.friction ? v.friction + ' 點' : '0'}</b></div></div>
        <div class="lx">${v.slowed ? `<b style="color:#ffb3c8">我覺得：</b>最近每趟帶回的變少了（${v.trip}/${v.full}）—— 不知道為什麼，也沒人問過我。` : '<b style="color:#ffb3c8">我覺得：</b>一切照做就是了。'}${v.friction ? ` 我旁邊有 <b style="color:#ffb3c8">${v.friction} 點</b>很難改的地方，每動一處都得繞路。` : ''}</div>
        <div class="lx" style="opacity:.8">—— 我不知道：<b>預算 · 管理頻寬 · 為什麼要做 · 老闆要什麼 · 競品 · 整體進度</b></div>
        <div class="acts"><button class="btn ghost" data-eng="prev">◀ 換同事</button><button class="btn ghost" data-eng="next">換同事 ▶</button><button class="btn" data-eng="report" style="background:#ff8fb1;color:#2a0a16" ${v.cd ? 'disabled' : ''}>回報：這附近很難改${v.cd ? '（' + v.cd + 's）' : ''}</button></div>`;
      }
    } else if (role === 'orbit') {
      const v = project(w, 'orbit', g), lamp = { green: '綠', yellow: '黃', red: '紅' }[v.light], ms = v.milestone;
      h = `<div class="lk">軌道層 · 老闆 <small>ORBIT · 同一個世界的第 1 種投影</small></div>
      <div class="l4"><div><span>帳上現金</span><b>NT$${(v.cash / 1e6).toFixed(1)}M</b></div><div><span>總人數</span><b>${v.people}</b></div>
      <div><span>下個里程碑</span><b class="sm">${ms.text}</b><div class="pb"><i style="width:${Math.round(ms.pct * 100)}%"></i></div></div><div><span>風險燈號</span><b><i class="lamp ${v.light}"></i>${lamp}</b></div>${v.share != null ? `<div><span>市佔</span><b>${v.share}%</b></div>` : ''}</div>
      <div class="lx">看不到：<b>管理頻寬 · 建造佇列 · 技術債 · 個別工程師</b>　·　競品那格卻很清楚：<em>「${v.enemy.headline}」</em>（${v.enemy.source}，免費）</div>`;
    } else {
      const v = project(w, 'bridge', g), mx = Math.max(v.ourPower, v.rivalPower, 1);
      h = `<div class="lk">艦橋層 · 主管 <small>BRIDGE · 同一個世界的第 2 種投影</small></div>
      <div class="cmp"><div><div class="row2"><span>我方</span><div class="b"><i style="width:${v.ourPower / mx * 100}%;background:var(--teal)"></i></div><b>${v.ourPower}</b></div><div class="row2"><span>對手</span><div class="b"><i style="width:${v.rivalPower / mx * 100}%;background:var(--red)"></i></div><b>${v.rivalPower}</b></div><div class="row2"><span>效率</span><div class="b"><i style="width:${v.efficiency}%;background:var(--amber)"></i></div><b>${v.efficiency}%</b></div></div>
      <div class="big"><b>−${v.behind}%</b><span>戰力落後</span></div></div>
      <div class="lx">看得到「落後 ${v.behind}%」，但<b>看不到原因</b>（頻寬？技術債？）— 翻譯的責任全在主管身上。</div>`;
    }
    if (h !== this.layerH) { L.innerHTML = h; this.layerH = h; } L.classList.remove('hide');
  },
  rep(w, g) {
    const b = $('#rep'), dp = g.dp; if (!dp || dp.resolved || g.role !== 'ground' || Coach.active()) { b.classList.add('hide'); return; }
    b.classList.remove('hide'); b.classList.toggle('done', dp.reported); b.textContent = dp.reported ? '✔ 已回報老闆（風險燈 ' + ({ green: '綠', yellow: '黃', red: '紅' }[g.light]) + '）' : '📋 回報老闆（四格表）';
  },
  /* 研發面板 */
  payback(w, p) {
    const st = techStatus(w, p), lab = labOf(w); if (st.maxed) return '';
    const miners = Math.max(1, w.units.filter(u => u.team === 0 && u.o.t === 'mine').length), per = (w.gross || 0) / miners, team = per * (miners + (lab ? labAssigned(w, lab).length : 0)), secs = st.next.W / rankSum(3), opp = 3 * per * secs, total = st.next.cost + opp;
    let gain = 0;
    if (p.id === 'auto') gain = .10 * team; else if (p.id === 'ci') gain = .35 * ((w.drain || 0) + team * (1 - effMult(w))); else if (p.id === 'arch') gain = .25 * (w.upkeep || 0);
    else if (p.id === 'refactor') { const d = Math.min(6, debtTotal(w)); gain = d * (DEBT_DRAIN * debtK(w) + team * DEBT_SLOW * debtK(w)); }
    else if (p.id === 'proc') return `每 100 秒多出約 ${(100 * (speedMult(w) * 1 / .88 - speedMult(w)) / BASE_TRAIN).toFixed(1)} 個工程師的產能（若一直在訓練）`;
    else return '';
    if (gain < .03) return '目前沒有可回收的損失 — 現在研發太早';
    return `預估回本 ≈ <b>${Math.round(total / gain)} 秒</b>（+${gain.toFixed(2)} ●/s；含 3 人研發的機會成本 ≈${Math.round(opp)}●）`;
  },
  techHTML(w, lab, cur, asg, work) {
    const r = rankSum(work), R_ = n => 'I'.repeat(n);
    const crew = Array.from({ length: LAB_SLOTS }, (_, i) => `<div class="pip ${i < work ? 'on' : i < asg ? 'go' : ''}"><i style="height:${RANK[i] * 100}%"></i><span>${RANK[i]}</span></div>`).join('');
    const eta = cur && r > 0 ? Math.ceil((cur.W - cur.prog) / r) : null;
    const head = `<div class="th"><b>研發</b><span class="sub">${work}/${asg} 人就位 · 速度 ×${r.toFixed(2)}</span><button class="x" data-act="close">✕</button></div>
      <div class="curr">${cur ? `<div class="cn">研發中：<b>${cur.name}${cur.lvl > 1 ? ' ' + R_(cur.lvl) : ''}</b></div><div class="bar" style="background:rgba(255,255,255,.12)"><i id="techProg" style="background:var(--violet);width:${cur.prog / cur.W * 100}%"></i></div><div class="cm"><span id="techPct">${Math.round(cur.prog / cur.W * 100)}%</span> · ${r > 0 ? `剩約 <b id="techEta">${eta}</b> 秒` : '<b style="color:var(--red)">沒人在研究 — 按 +1 研究員</b>'}</div>` : '<div class="cn dim">沒有進行中的專案 — 從下面挑一個（一次一個）</div>'}</div>
      <div class="crew">${crew}</div>
      <div class="acts"><button class="btn" data-act="lab+1" ${asg >= LAB_SLOTS ? 'disabled' : ''}>+1 研究員</button><button class="btn ghost" data-act="lab-1" ${asg ? '' : 'disabled'}>−1</button><button class="btn ghost" data-act="tech-cancel" ${cur ? '' : 'disabled'}>取消研發${cur ? '（退 75%）' : ''}</button></div>
      <div class="note">人越多越快，但<b>遞減</b>：${work} 人只有 ×${r.toFixed(2)}，不是 ×${work}。研究員不採礦，產出會掉；沒人在研究，進度不動。</div>`;
    const cards = TECH.map(p => {
      const st = techStatus(w, p), why = st.maxed ? '已完成' : st.locked ? '🔒 ' + techNeedText(p.need) : '', can = !st.maxed && !st.locked && !cur && w.ore >= st.next.cost;
      const pb = this.payback(w, p);
      return `<div class="proj ${st.maxed ? 'done' : st.locked ? 'lock' : ''} ${st.cur ? 'cur' : ''}" data-proj="${p.id}"><div class="pn">${p.name}${p.lv.length > 1 ? ` <small>${Array.from({ length: p.lv.length }, (_, i) => `<i class="lv ${i < st.lvl ? 'on' : ''}"></i>`).join('')}</small>` : (p.repeat ? `<small>×${st.lvl}</small>` : '')}</div><div class="pf">${p.fx}</div>
        <div class="pc">●${st.next.cost} · 研發量 ${st.next.W} 人·秒${!st.locked && !st.maxed ? ` · 3 人約 ${Math.ceil(st.next.W / rankSum(3))} 秒` : ''}</div>${pb && !st.locked ? `<div class="pb">${pb}</div>` : ''}${why ? `<div class="pw">${why}</div>` : ''}
        <button class="btn go" data-act="proj" ${can ? '' : 'disabled'}>${st.maxed ? '已完成' : st.cur ? '研發中' : cur ? '等目前專案' : w.ore < st.next.cost ? '預算不足' : '開始研發'}</button></div>`;
    }).join('');
    return head + `<div class="projs">${cards}</div>`;
  },
  renderTech() {
    const g = G, w = g.w, box = $('#tech'), has = g.has('lab') && labOf(w), btn = $('#bTech');
    btn.classList.toggle('hide', !has || g.role !== 'ground'); const cur = w.tech.cur;
    if (has) { btn.querySelector('small').textContent = cur ? Math.round(cur.prog / cur.W * 100) + '%' : ''; btn.classList.toggle('flash', false); }
    const open = g.techOpen && has && g.role === 'ground'; box.classList.toggle('hide', !open); if (!open) { this.techSig = ''; return; }
    const lab = labOf(w), asg = labAssigned(w, lab).length, work = labWorking(w, lab).length;
    const sig = JSON.stringify([w.tech.done, cur && cur.id, asg, work, TECH.map(p => { const s = techStatus(w, p); return [s.locked, s.maxed, w.ore >= s.next.cost]; }), Math.round(w.gross / 2), Math.round(debtTotal(w) / 3), g.role]);
    if (sig !== this.techSig) { this.techSig = sig; box.innerHTML = this.techHTML(w, lab, cur, labAssigned(w, lab).length, work); }
    if (cur) { const pr = $('#techProg'); if (pr) pr.style.width = cur.prog / cur.W * 100 + '%'; const pc = $('#techPct'), v1 = Math.round(cur.prog / cur.W * 100) + '%'; if (pc && pc.textContent !== v1) pc.textContent = v1; const e = $('#techEta'), v2 = String(Math.ceil((cur.W - cur.prog) / Math.max(.01, rankSum(work)))); if (e && e.textContent !== v2) e.textContent = v2; }
  },
  /* 每幀／每 0.1s 更新 */
  tick() {
    const g = G, w = g.w; if (!w) return;
    this.renderCard(); this.renderInfo(); this.renderTech();
    { const bh = this.br.classList.contains('hide') ? 0 : this.br.offsetHeight, ih = this.bc.classList.contains('hide') ? 0 : this.bc.offsetHeight, st = bh + (ih ? ih + 8 : 0) + (bh ? 8 : 0);
      if (st !== this._st || bh !== this._bh) { this._st = st; this._bh = bh; const r = document.documentElement.style; r.setProperty('--brh', (bh ? bh + 8 : 0) + 'px'); r.setProperty('--stack', st + 'px'); } }
    const cap = supplyCap(w), used = supplyUsed(w);
    // 預算與速率
    const rate = w.rate; this.rateHist.push([w.t, rate]); while (this.rateHist.length && this.rateHist[0][0] < w.t - 8) this.rateHist.shift();
    const old = this.rateHist[0] ? this.rateHist[0][1] : rate, falling = w.t > 10 && rate < old - .35 && (w.drain > 0);
    const oreH = `<i class="g ore"></i><b>${Math.floor(w.ore)}</b><small>${rate >= 0 ? '+' : '−'}${Math.abs(rate).toFixed(1)}/s${falling ? ' ▼' : ''}</small>`;
    if (oreH !== this.oreH) { this.pOre.innerHTML = oreH; this.oreH = oreH; }
    this.pOre.classList.toggle('down', falling);
    const supH = `<i class="g sup"></i><b>${used}/${cap}</b><small>${w.microTax ? '老闆佔用 −' + w.microTax : ''}</small>`;
    if (supH !== this.supH) { this.pSup.innerHTML = supH; this.supH = supH; }
    this.pSup.classList.toggle('bad', w.isBlocked && (w.trackBlock || g.forceBlockFlag)); this.pSup.classList.toggle('warn', !w.isBlocked && used >= cap - 1 && used > 0);
    const debt = debtTotal(w);
    this.pDebt.innerHTML = `<i class="g debt"></i><b>${w.detected ? Math.ceil(debt - 1e-6) : '?'}</b><small>${w.detected ? '−' + w.drain.toFixed(2) + '●/s' : '看不見'}</small>`;
    this.pDebt.classList.toggle('warn', w.detected && debt >= 8); this.pDebt.classList.toggle('bad', w.detected && debt >= 20);
    this.pTrust.innerHTML = `<i class="g trust"></i><b>${Math.round(w.trust)}</b><small>${w.trust >= 80 ? '自由' : w.trust >= 50 ? '正常' : w.trust >= 30 ? '微管理' : '高壓'}</small>`;
    this.pTrust.classList.toggle('warn', w.trust < 60); this.pTrust.classList.toggle('bad', w.trust < 40);
    // 任務追蹤
    const m = g.mission; if (m && m.hud) { const h = m.hud(g); if (h) { $('#mTitle').textContent = h.title || ''; $('#mGoal').innerHTML = h.goal || ''; $('#mSub').innerHTML = h.sub || ''; } }
    $('#clock').textContent = m && m.clockText ? m.clockText(g) : g.clockOn ? fmtTime(m && m.limit ? m.limit - g.clock : g.clock) : ''; $('#clock').style.color = g.clockOn && m && m.limit && m.limit - g.clock < 30 ? 'var(--red)' : '';
    const tag = $('#pausedTag');
    if (Coach.state === 'wait') { tag.textContent = '⏸ 教學暫停中 · 時間不會走'; tag.className = ''; }
    else if (Coach.state === 'beat' || g.beat) { tag.textContent = '▶ 看結果…'; tag.className = 'go'; }
    else if (g.userPause) { tag.textContent = '⏸ 已暫停（P 繼續）'; tag.className = ''; }
    else if (g.decisionPause) { tag.textContent = '⏸ 決策點 · 時間暫停'; tag.className = ''; }
    else { tag.textContent = ''; tag.className = ''; }
    $('#bPause').textContent = g.userPause ? '▶' : '❚❚'; $('#bSpeed').textContent = '×' + g.speed;
    // 閒置按鈕
    if (g.has('idle') && g.role === 'ground') { const n = w.units.filter(u => u.team === 0 && u.type === 'eng' && u.o.t === 'idle').length; this.idle.classList.toggle('hide', !n); this.idle.textContent = `閒置工程師 ${n}（F1）`; } else this.idle.classList.add('hide');
    // 視野按鈕
    $$('#views button').forEach(b => b.classList.toggle('on', b.dataset.role === g.role));
    this.layer(w, g);
    this.rep(w, g);
    // 卡片狀態（預算不足時）
    $('#stage').classList.toggle('cmd', !!g.cmdMode || !!g.place);
  },
};
