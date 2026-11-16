/* ── 標題／選關／暫停／結算 ─────────────────────── */
const SPEC_URL = 'https://www.toolhubmaster.com/tools/4853de0b-d04c-492e-861c-729b75a8c3ff/index.html';
// 語言切換鈕（標題頁／暫停頁右上角）：顯示「另一個語言」；英文畫面不出現中文字
const langBtn = () => `<button class="btn ghost langsw" id="lang" title="${L('切換為英文（English）', 'Switch to Traditional Chinese')}">🌐 ${L('English', 'Chinese')}</button>`;
const Screens = {
  title() {
    G.demo(); Coach.stop();
    const done = store.get('done', {}), n = Object.keys(done).length;
    const m = Modal.show(`<div class="card">
      ${langBtn()}<div class="kicker">${L('FOG OF WAR · 專案管理即時戰略', 'FOG OF WAR · A PROJECT-MANAGEMENT RTS')}</div>
      ${L(`<h1>四個人看同一場戰役，<br><em>畫面卻不一樣</em></h1>`, `<h1>Four people watch the same battle.<br><em>Each sees a different screen.</em></h1>`)}
      ${L(`<p class="lead">星海爭霸風格的即時戰略，用來學專案管理。<b>前 90 秒是暫停式教學</b>：一次只教一個動作，下一步該點哪裡會亮給你看。</p>`, `<p class="lead">A StarCraft-style real-time strategy game for learning project management. <b>The first 90 seconds are a paused tutorial</b>: one action at a time, and the next thing to click lights up for you.</p>`)}
      <div class="row"><button class="btn teal big" id="go">▶ ${n ? L('從第 1 關開始', 'Start from Mission 1') : L('開始（含 90 秒教學）', 'Start (90-second tutorial)')}</button></div>
      <div class="row" style="margin-top:10px"><button class="btn ghost" id="th">${L('劇場 · 先看懂', 'Theater · Watch first')}</button><button class="btn ghost" id="sel">${L('關卡 · 再上手', 'Missions · Then play')}</button><button class="btn ghost" id="free">${L('自由對戰', 'Free Play')}</button><button class="btn ghost" id="watch">${L('觀戰 · AI 對打', 'Spectate · AI vs AI')}</button><a class="hint" style="margin:0 0 0 auto" href="${SPEC_URL}" target="_blank" rel="noopener">${L('教材規格書 ↗', 'Design spec (Chinese) ↗')}</a></div>
      ${L(`<div class="hint">滑鼠：<kbd>左鍵</kbd>選取／拖曳框選　<kbd>右鍵</kbd>下指令　<kbd>F1</kbd>選閒置工人　<kbd>P</kbd>暫停<br><kbd>F2</kbd>全選部隊　<kbd>空白</kbd>跳到警報<br>手機：點選工程師，再點礦點；⌂ 回基地。你會學到：Supply Block、Tech Debt、四層視野（老闆／主管／PM／工程師）、信任、研發與人月神話。</div>`, `<div class="hint">Mouse: <kbd>Left-click</kbd> select / drag to box-select · <kbd>Right-click</kbd> give orders · <kbd>F1</kbd> idle engineer · <kbd>P</kbd> pause<br><kbd>F2</kbd> select all units · <kbd>Space</kbd> jump to alert<br>Mobile: tap an Engineer, then tap an ore field; ⌂ returns to base. You'll learn: Supply Block, Tech Debt, the four views (Boss / Manager / PM / Engineer), Trust, R&D and The Mythical Man-Month.</div>`)}
    </div>`, { clear: true, cls: 'title' });
    m.querySelector('#lang').onclick = () => setLang(EN ? 'zh' : 'en');
    m.querySelector('#go').onclick = () => { SFX.init(); G.start(0); };
    m.querySelector('#sel').onclick = () => { SFX.init(); this.select(); };
    m.querySelector('#free').onclick = () => { SFX.init(); G.start(MISSIONS.findIndex(x => x.id === 'free')); };
    m.querySelector('#th').onclick = () => { SFX.init(); Theater.menu(); };
    m.querySelector('#watch').onclick = () => { SFX.init(); Director.watch(); };
  },
  select() {
    const done = store.get('done', {});
    const m = Modal.show(`<div class="card"><div class="kicker">MISSIONS</div><h2>${L('選關卡', 'Select a mission')}</h2>
      <div class="mlist"><button class="mcard" data-th="1"><span class="no">SHOW</span><span><div class="t">${L('劇場 · 先看懂', 'Theater · Watch first')}</div><div class="d">${L('六個編排好的情境，一步一句旁白；三層視野可隨時開關，結尾給三條活路。不用操作。', 'Six scripted scenarios, one line of narration per step. Toggle the three views any time; each ends with three ways out. No controls needed.')}</div></span></button>${MISSIONS.map((x, i) => `<button class="mcard" data-i="${i}"><span class="no">${x.id === 'free' ? 'FREE' : '0' + (i + 1)}</span><span><div class="t">${x.title}</div><div class="d">${x.blurb}</div></span>${done[x.id] ? `<span class="ok">${L('✔ 已通關', '✔ Cleared')}</span>` : ''}</button>`).join('')}</div>
      <div class="row"><button class="btn ghost" id="back">${L('← 返回', '← Back')}</button></div></div>`);
    m.querySelectorAll('.mcard').forEach(b => b.onclick = () => { SFX.init(); if (b.dataset.th) Theater.menu(); else G.start(+b.dataset.i); });
    m.querySelector('#back').onclick = () => G.w && G.mission ? this.pause() : this.title();
  },
  pause() {
    const m = Modal.show(`<div class="card" style="width:min(460px,100%)">${langBtn()}<div class="kicker">PAUSED</div><h2>${L('已暫停', 'Paused')}</h2>
      <div class="row"><button class="btn teal" id="r">${L('繼續', 'Resume')}</button><button class="btn ghost" id="re">${L('重玩本關', 'Restart mission')}</button><button class="btn ghost" id="sel">${L('選關卡', 'Missions')}</button></div></div>`, { clear: true });
    m.querySelector('#lang').onclick = () => setLang(EN ? 'zh' : 'en');
    m.querySelector('#r').onclick = () => { Modal.hide(); G.userPause = false; };
    m.querySelector('#re').onclick = () => G.start(G.missionIdx);
    m.querySelector('#sel').onclick = () => this.select();
  },
  debrief(win, data) {
    const d = G.mission.debrief(G, win, data), next = win && MISSIONS[G.missionIdx + 1];
    const m = Modal.show(`<div class="card"><div class="kicker">${d.kicker || (win ? 'MISSION COMPLETE' : 'MISSION FAILED')}</div>
      <h2>${d.title}</h2>
      <div class="stats">${d.stats.map(s => `<div class="stat ${s.ok === true ? 'ok' : s.ok === false ? 'no' : ''}"><b>${s.val}</b><span>${s.label}</span></div>`).join('')}</div>
      ${d.body || ''}
      <div class="lesson">${d.lesson}</div>
      <div class="row">${next ? `<button class="btn teal big" id="nx">${L('下一關 ▶', 'Next mission ▶')}</button>` : ''}<button class="btn ${next ? 'ghost' : 'teal'}" id="re">${G.opts.spectate ? L('再看一場', 'Watch another') : L('再玩一次', 'Play again')}</button>${G.mission.id === 'free' ? `<button class="btn ghost" id="sw">${G.opts.spectate ? L('換我上場', 'Let me play') : L('觀戰一場 AI 對打', 'Watch an AI vs AI match')}</button>` : ''}<button class="btn ghost" id="sel">${L('選關卡', 'Missions')}</button></div></div>`);
    if (next) m.querySelector('#nx').onclick = () => G.start(G.missionIdx + 1);
    const spec = G.opts.spectate, fi = G.missionIdx; m.querySelector('#re').onclick = () => spec ? Director.watch() : G.start(fi);
    if (m.querySelector('#sw')) m.querySelector('#sw').onclick = () => spec ? G.start(fi) : Director.watch();
    m.querySelector('#sel').onclick = () => this.select();
  },
};
