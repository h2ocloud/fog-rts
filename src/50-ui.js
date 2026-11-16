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
      return [{ cmd: 'tech-panel', name: L('研發面板', 'R&D Panel'), cost: g.techOpen ? L('收起 (T)', 'Hide (T)') : L('開啟 (T)', 'Open (T)'), key: 'Q', on: g.techOpen }, { cmd: 'lab+1', name: L('+1 研究員', '+1 Researcher'), cost: L(`派最近的人 · ${asg}/${LAB_SLOTS}`, `Nearest · ${asg}/${LAB_SLOTS}`), key: 'W', dis: asg >= LAB_SLOTS }, { cmd: 'lab-1', name: L('−1 研究員', '−1 Researcher'), cost: L('召回最後派駐的', 'Recall latest'), key: 'E', dis: !asg }, { cmd: 'tech-cancel', name: L('取消研發', 'Cancel R&D'), cost: cur ? L(`退 ●${Math.floor(cur.paid * .75)}（75%）`, `Refund ●${Math.floor(cur.paid * .75)} (75%)`) : L('沒有進行中專案', 'No project'), key: 'A', dis: !cur }];
    }
    if (b && !b.built) {
      const paid = b.paid || 0; return [{ cmd: 'resume-site', name: L('繼續建造', 'Resume'), cost: L('派最近的工程師', 'Nearest engineer'), key: 'Q' }, { cmd: 'cancel-site', name: L('取消建造', 'Cancel'), cost: L(`退 ●${Math.floor(paid * .75)}（75%）`, `Refund ●${Math.floor(paid * .75)} (75%)`), key: 'W' }];
    }
    const fu = us.filter(u => u.type !== 'eng');
    if (us.length && fu.length === us.length) {
      if (w.war) D.push({ cmd: 'amove', name: L('攻擊移動', 'Attack-Move'), cost: L('沿路遇敵就打', 'Fights en route'), on: g.cmdMode === 'amove' });
      D.push({ cmd: 'move', name: L('移動', 'Move'), cost: w.war ? L('不還手，撤退用', 'No return fire') : L('再點地面／據點', 'Click ground/zone'), on: g.cmdMode === 'move' });
      if (w.war) D.push({ cmd: 'hold', name: L('原地駐守', 'Hold'), cost: L('只打靠近的', 'Hits only nearby') });
      D.push({ cmd: 'sunset', name: L('下架', 'Sunset'), cost: L('釋放▤·省維運', 'Frees ▤·upkeep'), dis: false }); D.forEach((d, i) => d.key = 'QWEASDZXC'[i]);
    } else if (us.length) {
      if (g.has('comms')) { const c = bldCost(w, 'comms'); D.push({ cmd: 'build-comms', name: L('協作制度', 'Comms Layer'), cost: `●${c} ▤+8`, short: w.ore < c }); }
      if (g.has('obs')) { const c = bldCost(w, 'obs'); D.push({ cmd: 'build-obs', name: L('監控中心', 'Observability'), cost: `●${c} Detector`, short: w.ore < c }); }
      if (g.has('lab')) { const c = bldCost(w, 'lab'), ok = w.blds.some(x => x.type === 'comms' && x.built); D.push({ cmd: 'build-lab', name: L('研發中心', 'R&D Lab'), cost: ok ? L(`●${c} 升級・加速`, `●${c} Upgrades`) : L('先蓋協作制度', 'Needs Comms Layer'), short: w.ore < c, dis: !ok }); }
      if (g.has('squad')) { const c = bldCost(w, 'squad'); D.push({ cmd: 'build-squad', name: L('開發小隊', 'Dev Squad'), cost: L(`●${c} 出功能`, `●${c} Features`), short: w.ore < c }); }
      if (g.has('plat')) { const c = bldCost(w, 'plat'), ok = w.blds.some(b => b.type === 'squad' && b.built); D.push({ cmd: 'build-plat', name: L('平台組', 'Platform Team'), cost: ok ? L(`●${c} 戰力＋15%`, `●${c} Power +15%`) : L('先蓋開發小隊', 'Needs Dev Squad'), short: w.ore < c, dis: !ok }); }
      if (g.has('mine')) D.push({ cmd: 'mine', name: L('採預算', 'Mine'), cost: L('去最近的礦', 'Nearest ore') });
      if (g.has('lab') && labOf(w)) D.push({ cmd: 'assign-lab', name: L('派駐研發', 'Assign R&D'), cost: L(`${labAssigned(w, labOf(w)).length}/${LAB_SLOTS} 研究位`, `${labAssigned(w, labOf(w)).length}/${LAB_SLOTS} seats`) });
      if (g.has('repay')) D.push({ cmd: 'repay', name: L('還技術債', 'Pay Debt'), cost: w.detected ? L(`債 ${Math.ceil(debtTotal(w))} 點`, `Debt ${Math.ceil(debtTotal(w))} pts`) : L('需要 Detector', 'Needs Detector'), dis: !w.detected || !w.debts.length });
      if (g.has('move')) D.push({ cmd: 'move', name: L('移動', 'Move'), cost: L('再點地面', 'Then click ground'), on: g.cmdMode === 'move' });
      D.forEach((d, i) => d.key = 'QWEASDZXC'[i]);
    } else if (b && BLD[b.type].makes && b.built) {
      const cap = supplyCap(w), used = supplyUsed(w), kind = BLD[b.type].makes, U = UNIT[kind], blocked = used + U.sup > cap;
      D[0] = { cmd: 'train', name: L('訓練' + U.name, 'Train ' + (kind === 'pfeat' ? 'Platform' : U.name)), cost: `●${U.cost} ▤${U.sup} · ${Math.round(U.time * w.pace.mult)}s`, key: 'Q', short: w.ore < U.cost || blocked, pulse: false };
      if (g.has('pace')) for (const [i, k] of ['normal', 'fast', 'rush'].entries()) { const p = PACE[k]; D[3 + i] = { cmd: 'pace-' + k, name: p.name, cost: p.sub, key: 'ASD'[i], on: w.pace.key === k }; }
    }
    return D;
  },
  renderCard() {
    const D = this.cardDefs(), sig = JSON.stringify(D) + (G.role);
    if (sig === this.sigCard) return; this.sigCard = sig;
    if (!D.length) { this.br.classList.add('hide'); this.br.innerHTML = ''; return; }
    const rows = Math.ceil((D.length) / 3) * 3; let h = '';
    for (let i = 0; i < Math.max(3, rows); i++) { const d = D[i]; h += d ? `<button class="cbtn${d.short ? ' short' : ''}${d.dis ? ' dis' : ''}${d.on ? ' on' : ''}" data-cmd="${d.cmd}"><span class="k">${d.key}</span><span class="n">${EN ? String(d.name).replace('Observability', 'Observ&shy;ability') : d.name}</span><span class="c">${d.cost}</span></button>` : '<span class="cbtn empty"></span>'; }
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
      const nm = nf && !ne.length ? L('功能', 'Features') : ne.length && !nf ? L('工程師', 'Engineers') : L('單位', 'Units');
      return `<div class="ihead"><div class="ico ${nf && !ne.length ? 'feat' : 'eng'}"></div><div><div class="iname">${nm} ×${sel.length}<small>${L(nf ? 'Feature' : 'Engineer', nf ? 'Marine' : 'SCV')}</small></div><div class="istate">${nf && !ne.length ? (w.war ? L(`右鍵據點／敵人＝攻擊移動 · 右鍵地面＝移動（不還手）· 平均血量 <b>${Math.round(100 * sel.reduce((a, u) => a + (u.hp != null ? u.hp / u.maxHp : 1), 0) / sel.length)}%</b>`, `Right-click zone/enemy = attack-move · right-click ground = move (no return fire) · avg HP <b>${Math.round(100 * sel.reduce((a, u) => a + (u.hp != null ? u.hp / u.maxHp : 1), 0) / sel.length)}%</b>`) : L('右鍵據點／地面 = 移動過去 · 站在據點上就有戰力', 'Right-click zone/ground = move there · units on a zone add power')) : L(`${idle ? `<b>${idle}</b> 人閒置` : '全員工作中'}　·　點礦點＝去採預算`, `${idle ? `<b>${idle}</b> idle` : 'Everyone busy'} · click an ore field = go mine`)}</div></div></div><div class="grp">${sel.slice(0, 24).map(u => `<span class="${u.type !== 'eng' ? 'f' : u.o.t === 'idle' ? 'idle' : ''}"></span>`).join('')}</div>`;
    }
    const e = sel[0];
    if (e.kind === 'node') {
      const vis = nodeVisible(w, e), ag = Math.round(w.t - e.seenAt), em = vis ? Math.round(e.emP) : (e.seenAt < 0 ? '?' : Math.round(e.seenEm) + L('（快照 −' + ag + 's）', ' (snapshot −' + ag + 's)'));
      return `<div class="ihead"><div class="ico node"></div><div><div class="iname">${e.name}<small>${L('市場據點', 'Market zone')}</small><span class="tag ${e.owner === 0 ? 'good' : e.owner === 1 ? 'bad' : ''}">${e.owner === 0 ? L('我方', 'Ours') : e.owner === 1 ? L('對手', 'Rival') : L('未佔領', 'Unclaimed')}</span></div><div class="istate">${L(`佔領後每秒 <b>+${e.yield} ●</b>　·　我方戰力 <b>${Math.round(e.ourP)}</b> vs 對手 <b>${em}</b>`, `Once held: <b>+${e.yield} ●</b>/s · our power <b>${Math.round(e.ourP)}</b> vs rival <b>${em}</b>`)}</div></div></div><div class="istate" style="margin-top:8px">${L(`${e.ent ? '需要 ≥1 個平台功能才能佔領。' : ''}把功能單位移到這裡；戰力持續高於對手 <b>20 秒</b>就佔領（進度 ${Math.round(Math.abs(e.bal))}/20）。`, `${e.ent ? 'Needs ≥1 Platform Feature to capture. ' : ''}Move Features here; out-power the rival for <b>20s</b> straight to capture it (progress ${Math.round(Math.abs(e.bal))}/20).`)}</div>`;
    }
    if (e.kind === 'unit' && e.type !== 'eng') {
      const big = e.type === 'pfeat', pf = Math.min(.45, .15 * platCount(w));
      const hp = e.hp != null ? `<div class="bar ${e.hp / e.maxHp > .5 ? '' : 'amber'}" style="margin-top:6px"><i style="width:${Math.round(100 * e.hp / e.maxHp)}%"></i></div>` : '';
      if (w.war) return `<div class="ihead"><div class="ico feat"></div><div><div class="iname">${big ? L('平台功能', 'Platform Feature') : L('功能', 'Feature')}<small>${L(big ? 'Platform' : 'Feature', big ? 'Siege Tank' : 'Marine')}</small></div><div class="istate">${L('血量', 'HP')} <b>${Math.ceil(e.hp || 0)}/${e.maxHp || '—'}</b>${L('　·　傷害', ' · damage')} <b>×${ourMult(w).toFixed(2)}</b>${effMult(w) < .99 ? L(`（技術債 −${Math.round(100 * (1 - effMult(w)))}%）`, ` (tech debt −${Math.round(100 * (1 - effMult(w)))}%)`) : ''}</div></div></div>${hp}<div class="istate" style="margin-top:8px">${big ? L('平台功能：身邊的功能受到的傷害 <b>−25%</b>、全隊戰力 +15%（上限 +45%）。不直接搶據點。', 'Platform Feature: nearby Features take <b>−25%</b> damage; whole army +15% power (max +45%). Doesn\'t capture zones itself.') : L('站在據點上才有戰力；跟對手功能相遇會自動交戰。用不到就「下架」— 釋放頻寬、省維運。', 'Only has power while standing on a zone; fights rival Features automatically on contact. Not needed? "Sunset" it — frees bandwidth, saves upkeep.')}</div>`;
      return `<div class="ihead"><div class="ico feat"></div><div><div class="iname">${big ? L('平台功能', 'Platform Feature') : L('功能', 'Feature')}<small>${L(big ? 'Platform' : 'Feature', big ? 'Siege Tank' : 'Marine')}</small></div><div class="istate">${big ? L('不直接搶據點；讓所有一般功能戰力 <b>+15%</b>（上限 +45%）', 'Doesn\'t capture zones; gives all regular Features <b>+15%</b> power (max +45%)') : L(`戰力 <b>${(FEAT_POWER * (1 + pf) * effMult(w)).toFixed(1)}</b>　·　維運 −${(UPKEEP_F * (1 + (feats(w).length) / 30)).toFixed(2)} ●/s`, `Power <b>${(FEAT_POWER * (1 + pf) * effMult(w)).toFixed(1)}</b> · upkeep −${(UPKEEP_F * (1 + (feats(w).length) / 30)).toFixed(2)} ●/s`)}</div></div></div><div class="istate" style="margin-top:8px">${big ? L('佔 ▤2、每秒耗 0.10 ●。企業客戶據點需要至少 1 個。', 'Takes ▤2 and costs 0.10 ● per second. Enterprise zones need at least 1.') : L('站在市場據點上才有戰力。用不到就「下架」— 釋放頻寬、省維運（不退款）。', 'Only has power while standing on a market zone. Not needed? "Sunset" it — frees bandwidth, saves upkeep (no refund).')}</div>`;
    }
    if (e.kind === 'unit') {
      const o = e.o, st = o.t === 'idle' ? L('<b style="color:var(--amber)">閒置</b> — 點礦點叫他工作', '<b style="color:var(--amber)">Idle</b> — click an ore field to put them to work') : o.t === 'move' ? L('移動中', 'Moving') : o.t === 'mine' ? (o.ph === 'work' ? L('採集預算中', 'Mining budget') : o.ph === 'back' ? L('扛著預算回基地', 'Hauling budget to base') : L('前往礦點', 'Heading to ore field')) : o.t === 'build' ? (o.ph === 'work' ? L('建造中', 'Building') : L('前往工地', 'Heading to site')) : o.t === 'repay' ? (o.ph === 'work' ? L('還技術債中', 'Paying down debt') : L('前往技術債', 'Heading to the debt')) : '';
      return `<div class="ihead"><div class="ico eng"></div><div><div class="iname">${L('工程師', 'Engineer')}<small>${L('Engineer', 'SCV')}</small></div><div class="istate">${st}</div></div></div><div class="istate" style="margin-top:8px">${L('採集 · 建造 · 還技術債 · 偵察，同一個人只能做一件事', 'Mine · build · pay down debt · scout — one person, one job at a time')}</div>`;
    }
    if (e.kind === 'bld') {
      const D = BLD[e.type];
      if (!e.built) { const nw = siteWorkers(w, e).length; return `<div class="ihead"><div class="ico ${e.type}"></div><div><div class="iname">${D.name}<small>${D.en}</small><span class="tag${nw ? '' : ' bad'}">${nw ? L('建造中', 'Building') : L('停工', 'Stalled')}</span></div><div class="istate">${Math.round(e.prog * 100)}% · ${nw ? L(`${nw} 位工程師在現場（蓋完前他們不能做別的）`, `${nw} ${nw === 1 ? 'engineer' : 'engineers'} on site (tied up until it's done)`) : L('<b>沒有工程師在施工</b> — 選工程師再點這座工地，或按「繼續建造」', '<b>No one is building</b> — select an engineer and click this site, or press "Resume"')}</div></div></div><div class="bar amber"><i style="width:${e.prog * 100}%"></i></div><div class="istate" style="margin-top:6px">${L(`想放棄？「取消建造」退回 ${Math.floor((e.paid || 0) * .75)} ●（75%）。`, `Giving up? "Cancel" refunds ${Math.floor((e.paid || 0) * .75)} ● (75%).`)}</div>`; }
      if (BLD[e.type].makes) {
        const q = e.queue, cap = supplyCap(w), used = supplyUsed(w), qh = q.map((it, i) => `<span class="f">${i === 0 ? `<i style="height:${Math.min(100, it.t / it.dur * 100)}%"></i>` : ''}</span>`).join('') + '<span></span>'.repeat(Math.max(0, 3 - q.length));
        return `<div class="ihead"><div class="ico ${e.type}"></div><div><div class="iname">${D.name}<small>${D.en}</small></div><div class="istate">${L('管理頻寬', 'Bandwidth')} <b>▤ ${used}/${cap}</b>${used >= cap ? '<span class="tag bad">Supply Block</span>' : ''}${e.haltT > 0 ? L('<span class="tag bad">事故停擺</span>', '<span class="tag bad">Incident halt</span>') : ''}</div></div></div><div class="queue">${qh}</div><div class="istate" style="margin-top:6px">${L(`右鍵地面${e.type === 'hub' ? '／礦點' : ''}＝設集合點${g.has('pace') ? `　·　節奏 <b>${w.pace.name}</b>` : ''}`, `Right-click ground${e.type === 'hub' ? '/ore field' : ''} = set rally point${g.has('pace') ? ` · pace <b>${w.pace.name}</b>` : ''}`)}</div>`;
      }
      if (e.type === 'lab') {
        const cur = w.tech.cur, asg = labAssigned(w, e), work = labWorking(w, e).length, r = rankSum(work);
        return `<div class="ihead"><div class="ico lab"></div><div><div class="iname">${D.name}<small>${D.en}</small>${cur ? L('<span class="tag v">研發中</span>', '<span class="tag v">Researching</span>') : ''}</div><div class="istate">${cur ? `<b>${cur.name}${cur.lvl > 1 ? ' ' + 'I'.repeat(cur.lvl) : ''}</b> ${Math.round(cur.prog / cur.W * 100)}% · ${work ? L('速度 <b>×', 'speed <b>×') + r.toFixed(2) + '</b>' : L('<b style="color:var(--red)">沒人在研究</b>', '<b style="color:var(--red)">No one researching</b>')}` : L('沒有進行中的專案 — 開研發面板挑一個', 'No active project — open the R&D panel and pick one')}</div></div></div><div class="queue">${Array.from({ length: LAB_SLOTS }, (_, i) => `<span class="${i < work ? 'f' : ''}" title="${L(`第 ${i + 1} 位貢獻 ${RANK[i]}`, `Researcher #${i + 1} adds ${RANK[i]}`)}">${i < asg.length ? '' : ''}</span>`).join('')}</div><div class="istate" style="margin-top:6px">${L(`${work} 人 = ×${r.toFixed(2)}（不是 ×${work}）· 第 ${Math.min(work + 1, LAB_SLOTS)} 位只貢獻 ${RANK[Math.min(work, LAB_SLOTS - 1)]} · 研究員不採礦`, `${work} ${work === 1 ? 'person' : 'people'} = ×${r.toFixed(2)} (not ×${work}) · researcher #${Math.min(work + 1, LAB_SLOTS)} adds only ${RANK[Math.min(work, LAB_SLOTS - 1)]} · researchers don't mine`)}</div>`;
      }
      if (e.type === 'comms') return `<div class="ihead"><div class="ico comms"></div><div><div class="iname">${D.name}<small>${D.en}</small></div><div class="istate">${L(`提供 <b>▤ +${commsSupply(w)}</b> 管理頻寬 —— 團隊的「帶人容量」`, `Provides <b>▤ +${commsSupply(w)}</b> management bandwidth — how many people the team can actually lead`)}</div></div></div>`;
      if (e.type === 'obs') return `<div class="ihead"><div class="ico obs"></div><div><div class="iname">${D.name}<small>${D.en}</small><span class="tag v">Detector</span></div><div class="istate">${w.debts.length ? L(`已揭露技術債 <b>${Math.ceil(debtTotal(w))}</b> 點 — 選工程師，點債務塊還債`, `Tech debt revealed: <b>${Math.ceil(debtTotal(w))}</b> pts — select an engineer and click a debt block to pay it down`) : L('沒有偵測到技術債', 'No tech debt detected')}</div></div></div>`;
    }
    if (e.kind === 'patch') return `<div class="ihead"><div class="ico ore"></div><div><div class="iname">${L('預算礦', 'Budget Ore')}<small>${L('Budget', 'Minerals')}</small></div><div class="istate">${L('選工程師後點它 = 去採預算 ●', 'Select an engineer, then click it = go mine budget ●')}</div></div></div>`;
    return '';
  },
  renderInfo() {
    const h = this.infoHTML(); if (h === this.infoSig) return; this.infoSig = h;
    if (!h) { this.bc.classList.add('hide'); this.bc.innerHTML = ''; return; } this.bc.innerHTML = h; this.bc.classList.remove('hide');
  },

  layer(w, g) {
    const Ly = $('#layer'), role = g.role; this.hud.classList.toggle('r-eng', role === 'engineer'); if (role === 'ground' || !g.has('views')) { if (!Ly.classList.contains('hide')) Ly.classList.add('hide'); $('#bl').classList.toggle('hide', !this.shown.has('map')); return; }
    $('#bl').classList.add('hide'); let h = '';
    if (role === 'engineer') {
      const v = project(w, 'engineer', g, g);
      if (v.none) h = L('<div class="lk" style="color:#ff8fb1">執行層 · 工程師</div><div class="lx">沒有工程師可以附身。</div>', '<div class="lk" style="color:#ff8fb1">Execution layer · Engineer</div><div class="lx">No engineer to step into.</div>');
      else {
        const ago = v.lastOrder ? Math.round(w.t - v.lastOrder.at) : null;
        h = `<div class="lk" style="color:#ff8fb1">${L('執行層 · 工程師 <small>ENGINEER · 同一個世界的第 4 種投影 · 只看得到身邊</small>', 'Execution layer · Engineer <small>ENGINEER · 4th projection of the same world · sees only what\'s nearby</small>')}</div>
        <div class="l4"><div><span>${L('我的任務', 'My task')}</span><b class="sm">${v.task}</b></div><div><span>${L('收到的指令', 'Orders received')}</span><b class="sm">${v.lastOrder ? L('「' + v.lastOrder.text + '」', '“' + v.lastOrder.text + '”') : '—'}</b><span style="color:var(--dim)">${v.lastOrder ? L(ago + 's 前 · 沒說原因', ago + 's ago · no reason given') : ''}</span></div>
        <div><span>${L('這趟帶回', 'This trip')}</span><b class="${v.slowed ? 'bad' : ''}" style="${v.slowed ? 'color:var(--amber)' : ''}">${v.trip} / ${v.full}</b></div><div><span>${L('視線內', 'In sight')}</span><b class="sm">${L(`同事 ${v.mates} · 卡點 ${v.friction ? v.friction + ' 點' : '0'}`, `Coworkers ${v.mates} · blockers ${v.friction ? v.friction + ' pts' : '0'}`)}</b></div></div>
        <div class="lx">${v.slowed ? L(`<b style="color:#ffb3c8">我覺得：</b>最近每趟帶回的變少了（${v.trip}/${v.full}）—— 不知道為什麼，也沒人問過我。`, `<b style="color:#ffb3c8">How it feels:</b> I've been bringing back less each trip lately (${v.trip}/${v.full}) — no idea why, and nobody's asked me.`) : L('<b style="color:#ffb3c8">我覺得：</b>一切照做就是了。', '<b style="color:#ffb3c8">How it feels:</b> I just do what I\'m told.')}${v.friction ? L(` 我旁邊有 <b style="color:#ffb3c8">${v.friction} 點</b>很難改的地方，每動一處都得繞路。`, ` There are <b style="color:#ffb3c8">${v.friction} pts</b> of hard-to-change code right next to me — every change means a detour.`) : ''}</div>
        <div class="lx" style="opacity:.8">${L('—— 我不知道：<b>預算 · 管理頻寬 · 為什麼要做 · 老闆要什麼 · 競品 · 整體進度</b>', '— What I don\'t know: <b>budget · management bandwidth · why we\'re doing this · what the Boss wants · competitors · overall progress</b>')}</div>
        <div class="acts"><button class="btn ghost" data-eng="prev">${L('◀ 換同事', '◀ Prev')}</button><button class="btn ghost" data-eng="next">${L('換同事 ▶', 'Next ▶')}</button><button class="btn" data-eng="report" style="background:#ff8fb1;color:#2a0a16" ${v.cd ? 'disabled' : ''}>${L('回報：這附近很難改', 'Report: hard to change here')}${v.cd ? L('（' + v.cd + 's）', ' (' + v.cd + 's)') : ''}</button></div>`;
      }
    } else if (role === 'orbit') {
      const v = project(w, 'orbit', g), lamp = L({ green: '綠', yellow: '黃', red: '紅' }, { green: 'Green', yellow: 'Amber', red: 'Red' })[v.light], ms = v.milestone;
      h = `<div class="lk">${L('軌道層 · 老闆 <small>ORBIT · 同一個世界的第 1 種投影</small>', 'Orbit layer · Boss <small>ORBIT · 1st projection of the same world</small>')}</div>
      <div class="l4"><div><span>${L('帳上現金', 'Cash on hand')}</span><b>NT$${(v.cash / 1e6).toFixed(1)}M</b></div><div><span>${L('總人數', 'Headcount')}</span><b>${v.people}</b></div>
      <div><span>${L('下個里程碑', 'Next milestone')}</span><b class="sm">${ms.text}</b><div class="pb"><i style="width:${Math.round(ms.pct * 100)}%"></i></div></div><div><span>${L('風險燈號', 'Risk light')}</span><b><i class="lamp ${v.light}"></i>${lamp}</b></div>${v.share != null ? `<div><span>${L('市佔', 'Market share')}</span><b>${v.share}%</b></div>` : ''}</div>
      <div class="lx">${L(`看不到：<b>管理頻寬 · 建造佇列 · 技術債 · 個別工程師</b>　·　競品那格卻很清楚：<em>「${v.enemy.headline}」</em>（${v.enemy.source}，免費）`, `Can't see: <b>management bandwidth · build queue · tech debt · individual engineers</b> · yet the competitor box is crystal clear: <em>“${v.enemy.headline}”</em> (${v.enemy.source}, free)`)}</div>`;
    } else {
      const v = project(w, 'bridge', g), mx = Math.max(v.ourPower, v.rivalPower, 1);
      h = `<div class="lk">${L('艦橋層 · 主管 <small>BRIDGE · 同一個世界的第 2 種投影</small>', 'Bridge layer · Manager <small>BRIDGE · 2nd projection of the same world</small>')}</div>
      <div class="cmp"><div><div class="row2"><span>${L('我方', 'Us')}</span><div class="b"><i style="width:${v.ourPower / mx * 100}%;background:var(--teal)"></i></div><b>${v.ourPower}</b></div><div class="row2"><span>${L('對手', 'Rival')}</span><div class="b"><i style="width:${v.rivalPower / mx * 100}%;background:var(--red)"></i></div><b>${v.rivalPower}</b></div><div class="row2"><span>${L('效率', 'Eff.')}</span><div class="b"><i style="width:${v.efficiency}%;background:var(--amber)"></i></div><b>${v.efficiency}%</b></div></div>
      <div class="big"><b>−${v.behind}%</b><span>${L('戰力落後', 'behind in power')}</span></div></div>
      <div class="lx">${L(`看得到「落後 ${v.behind}%」，但<b>看不到原因</b>（頻寬？技術債？）— 翻譯的責任全在主管身上。`, `Sees "${v.behind}% behind" but <b>not why</b> (bandwidth? tech debt?) — translating it is all on the Manager.`)}</div>`;
    }
    if (h !== this.layerH) { Ly.innerHTML = h; this.layerH = h; } Ly.classList.remove('hide');
  },
  rep(w, g) {
    const b = $('#rep'), dp = g.dp; if (!dp || dp.resolved || g.role !== 'ground' || Coach.active()) { b.classList.add('hide'); return; }
    b.classList.remove('hide'); b.classList.toggle('done', dp.reported); b.textContent = dp.reported ? L('✔ 已回報老闆（風險燈 ' + ({ green: '綠', yellow: '黃', red: '紅' }[g.light]) + '）', '✔ Reported to the Boss (risk light ' + ({ green: 'green', yellow: 'amber', red: 'red' }[g.light]) + ')') : L('📋 回報老闆（四格表）', '📋 Report to the Boss (4-box)');
  },
  /* 研發面板 */
  payback(w, p) {
    const st = techStatus(w, p), lab = labOf(w); if (st.maxed) return '';
    const miners = Math.max(1, w.units.filter(u => u.team === 0 && u.o.t === 'mine').length), per = (w.gross || 0) / miners, team = per * (miners + (lab ? labAssigned(w, lab).length : 0)), secs = st.next.W / rankSum(3), opp = 3 * per * secs, total = st.next.cost + opp;
    let gain = 0;
    if (p.id === 'auto') gain = .10 * team; else if (p.id === 'ci') gain = .35 * ((w.drain || 0) + team * (1 - effMult(w))); else if (p.id === 'arch') gain = .25 * (w.upkeep || 0);
    else if (p.id === 'refactor') { const d = Math.min(6, debtTotal(w)); gain = d * (DEBT_DRAIN * debtK(w) + team * DEBT_SLOW * debtK(w)); }
    else if (p.id === 'proc') return L(`每 100 秒多出約 ${(100 * (speedMult(w) * 1 / .88 - speedMult(w)) / BASE_TRAIN).toFixed(1)} 個工程師的產能（若一直在訓練）`, `≈${(100 * (speedMult(w) * 1 / .88 - speedMult(w)) / BASE_TRAIN).toFixed(1)} extra engineers' worth of output per 100s (if you keep training)`);
    else return '';
    if (gain < .03) return L('目前沒有可回收的損失 — 現在研發太早', 'Nothing to win back yet — too early to research this');
    return L(`預估回本 ≈ <b>${Math.round(total / gain)} 秒</b>（+${gain.toFixed(2)} ●/s；含 3 人研發的機會成本 ≈${Math.round(opp)}●）`, `Est. payback ≈ <b>${Math.round(total / gain)}s</b> (+${gain.toFixed(2)} ●/s; incl. ≈${Math.round(opp)}● opportunity cost of 3 researchers)`);
  },
  techHTML(w, lab, cur, asg, work) {
    const r = rankSum(work), R_ = n => 'I'.repeat(n);
    const crew = Array.from({ length: LAB_SLOTS }, (_, i) => `<div class="pip ${i < work ? 'on' : i < asg ? 'go' : ''}"><i style="height:${RANK[i] * 100}%"></i><span>${RANK[i]}</span></div>`).join('');
    const eta = cur && r > 0 ? Math.ceil((cur.W - cur.prog) / r) : null;
    const head = `<div class="th"><b>${L('研發', 'R&D')}</b><span class="sub">${L(`${work}/${asg} 人就位 · 速度 ×${r.toFixed(2)}`, `${work}/${asg} at desks · speed ×${r.toFixed(2)}`)}</span><button class="x" data-act="close">✕</button></div>
      <div class="curr">${cur ? `<div class="cn">${L('研發中：', 'Researching: ')}<b>${cur.name}${cur.lvl > 1 ? ' ' + R_(cur.lvl) : ''}</b></div><div class="bar" style="background:rgba(255,255,255,.12)"><i id="techProg" style="background:var(--violet);width:${cur.prog / cur.W * 100}%"></i></div><div class="cm"><span id="techPct">${Math.round(cur.prog / cur.W * 100)}%</span> · ${r > 0 ? L(`剩約 <b id="techEta">${eta}</b> 秒`, `≈<b id="techEta">${eta}</b>s left`) : L('<b style="color:var(--red)">沒人在研究 — 按 +1 研究員</b>', '<b style="color:var(--red)">No one researching — press +1 Researcher</b>')}</div>` : L('<div class="cn dim">沒有進行中的專案 — 從下面挑一個（一次一個）</div>', '<div class="cn dim">No active project — pick one below (one at a time)</div>')}</div>
      <div class="crew">${crew}</div>
      <div class="acts"><button class="btn" data-act="lab+1" ${asg >= LAB_SLOTS ? 'disabled' : ''}>${L('+1 研究員', '+1 Researcher')}</button><button class="btn ghost" data-act="lab-1" ${asg ? '' : 'disabled'}>−1</button><button class="btn ghost" data-act="tech-cancel" ${cur ? '' : 'disabled'}>${L('取消研發', 'Cancel R&D')}${cur ? L('（退 75%）', ' (75% refund)') : ''}</button></div>
      <div class="note">${L(`人越多越快，但<b>遞減</b>：${work} 人只有 ×${r.toFixed(2)}，不是 ×${work}。研究員不採礦，產出會掉；沒人在研究，進度不動。`, `More people = faster, but with <b>diminishing returns</b>: ${work} ${work === 1 ? 'person gets' : 'people get'} only ×${r.toFixed(2)}, not ×${work}. Researchers don't mine, so output drops; with no one researching, progress stops.`)}</div>`;
    const cards = TECH.map(p => {
      const st = techStatus(w, p), why = st.maxed ? L('已完成', 'Done') : st.locked ? '🔒 ' + techNeedText(p.need) : '', can = !st.maxed && !st.locked && !cur && w.ore >= st.next.cost;
      const pb = this.payback(w, p);
      return `<div class="proj ${st.maxed ? 'done' : st.locked ? 'lock' : ''} ${st.cur ? 'cur' : ''}" data-proj="${p.id}"><div class="pn">${p.name}${p.lv.length > 1 ? ` <small>${Array.from({ length: p.lv.length }, (_, i) => `<i class="lv ${i < st.lvl ? 'on' : ''}"></i>`).join('')}</small>` : (p.repeat ? `<small>×${st.lvl}</small>` : '')}</div><div class="pf">${p.fx}</div>
        <div class="pc">${L(`●${st.next.cost} · 研發量 ${st.next.W} 人·秒${!st.locked && !st.maxed ? ` · 3 人約 ${Math.ceil(st.next.W / rankSum(3))} 秒` : ''}`, `●${st.next.cost} · ${st.next.W} person-sec of work${!st.locked && !st.maxed ? ` · ≈${Math.ceil(st.next.W / rankSum(3))}s with 3` : ''}`)}</div>${pb && !st.locked ? `<div class="pb">${pb}</div>` : ''}${why ? `<div class="pw">${why}</div>` : ''}
        <button class="btn go" data-act="proj" ${can ? '' : 'disabled'}>${st.maxed ? L('已完成', 'Done') : st.cur ? L('研發中', 'Researching') : cur ? L('等目前專案', 'Wait for current') : w.ore < st.next.cost ? L('預算不足', 'Not enough budget') : L('開始研發', 'Start R&D')}</button></div>`;
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
    const supH = `<i class="g sup"></i><b>${used}/${cap}</b><small>${w.microTax ? L('老闆佔用 −', 'Boss overhead −') + w.microTax : ''}</small>`;
    if (supH !== this.supH) { this.pSup.innerHTML = supH; this.supH = supH; }
    this.pSup.classList.toggle('bad', w.isBlocked && (w.trackBlock || g.forceBlockFlag)); this.pSup.classList.toggle('warn', !w.isBlocked && used >= cap - 1 && used > 0);
    const debt = debtTotal(w);
    this.pDebt.innerHTML = `<i class="g debt"></i><b>${w.detected ? Math.ceil(debt - 1e-6) : '?'}</b><small>${w.detected ? '−' + w.drain.toFixed(2) + '●/s' : L('看不見', 'hidden')}</small>`;
    this.pDebt.classList.toggle('warn', w.detected && debt >= 8); this.pDebt.classList.toggle('bad', w.detected && debt >= 20);
    this.pTrust.innerHTML = `<i class="g trust"></i><b>${Math.round(w.trust)}</b><small>${w.trust >= 80 ? L('自由', 'Free rein') : w.trust >= 50 ? L('正常', 'Normal') : w.trust >= 30 ? L('微管理', 'Micromanaged') : L('高壓', 'Pressure')}</small>`;
    this.pTrust.classList.toggle('warn', w.trust < 60); this.pTrust.classList.toggle('bad', w.trust < 40);
    // 任務追蹤
    const m = g.mission; if (m && m.hud) { const h = m.hud(g); if (h) { $('#mTitle').textContent = h.title || ''; $('#mGoal').innerHTML = h.goal || ''; $('#mSub').innerHTML = h.sub || ''; } }
    $('#clock').textContent = m && m.clockText ? m.clockText(g) : g.clockOn ? fmtTime(m && m.limit ? m.limit - g.clock : g.clock) : ''; $('#clock').style.color = g.clockOn && m && m.limit && m.limit - g.clock < 30 ? 'var(--red)' : '';
    const tag = $('#pausedTag');
    if (Coach.state === 'wait') { tag.textContent = L('⏸ 教學暫停中 · 時間不會走', '⏸ Tutorial paused · time is frozen'); tag.className = ''; }
    else if (Coach.state === 'beat' || g.beat) { tag.textContent = L('▶ 看結果…', '▶ Watch what happens…'); tag.className = 'go'; }
    else if (g.userPause) { tag.textContent = L('⏸ 已暫停（P 繼續）', '⏸ Paused (P to resume)'); tag.className = ''; }
    else if (g.decisionPause) { tag.textContent = L('⏸ 決策點 · 時間暫停', '⏸ Decision point · time paused'); tag.className = ''; }
    else { tag.textContent = ''; tag.className = ''; }
    $('#bPause').textContent = g.userPause ? '▶' : '❚❚'; $('#bSpeed').textContent = '×' + g.speed;
    // 閒置按鈕
    if (g.has('idle') && g.role === 'ground') { const n = w.units.filter(u => u.team === 0 && u.type === 'eng' && u.o.t === 'idle').length; this.idle.classList.toggle('hide', !n); this.idle.textContent = L(`閒置工程師 ${n}（F1）`, `Idle engineer${n === 1 ? '' : 's'} ${n} (F1)`); } else this.idle.classList.add('hide');
    // 視野按鈕
    $$('#views button').forEach(b => b.classList.toggle('on', b.dataset.role === g.role));
    this.layer(w, g);
    this.rep(w, g);
    // 卡片狀態（預算不足時）
    $('#stage').classList.toggle('cmd', !!g.cmdMode || !!g.place);
  },
};
