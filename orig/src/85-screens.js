/* ── 標題／選關／暫停／結算 ─────────────────────── */
const SPEC_URL = 'https://www.toolhubmaster.com/tools/4853de0b-d04c-492e-861c-729b75a8c3ff/index.html';
const Screens = {
  title() {
    G.demo(); Coach.stop();
    const done = store.get('done', {}), n = Object.keys(done).length;
    const m = Modal.show(`<div class="card">
      <div class="kicker">FOG OF WAR · 專案管理即時戰略</div>
      <h1>四個人看同一場戰役，<br><em>畫面卻不一樣</em></h1>
      <p class="lead">星海爭霸風格的即時戰略，用來學專案管理。<b>前 90 秒是暫停式教學</b>：一次只教一個動作，下一步該點哪裡會亮給你看。</p>
      <div class="row"><button class="btn teal big" id="go">▶ ${n ? '從第 1 關開始' : '開始（含 90 秒教學）'}</button></div>
      <div class="row" style="margin-top:10px"><button class="btn ghost" id="th">劇場 · 先看懂</button><button class="btn ghost" id="sel">關卡 · 再上手</button><button class="btn ghost" id="free">自由對戰</button><button class="btn ghost" id="watch">觀戰 · AI 對打</button><a class="hint" style="margin:0 0 0 auto" href="${SPEC_URL}" target="_blank" rel="noopener">教材規格書 ↗</a></div>
      <div class="hint">滑鼠：<kbd>左鍵</kbd>選取／拖曳框選　<kbd>右鍵</kbd>下指令　<kbd>F1</kbd>選閒置工人　<kbd>P</kbd>暫停<br><kbd>F2</kbd>全選部隊　<kbd>空白</kbd>跳到警報<br>手機：點選工程師，再點礦點；⌂ 回基地。你會學到：Supply Block、Tech Debt、四層視野（老闆／主管／PM／工程師）、信任、研發與人月神話。</div>
    </div>`, { clear: true, cls: 'title' });
    m.querySelector('#go').onclick = () => { SFX.init(); G.start(0); };
    m.querySelector('#sel').onclick = () => { SFX.init(); this.select(); };
    m.querySelector('#free').onclick = () => { SFX.init(); G.start(MISSIONS.findIndex(x => x.id === 'free')); };
    m.querySelector('#th').onclick = () => { SFX.init(); Theater.menu(); };
    m.querySelector('#watch').onclick = () => { SFX.init(); Director.watch(); };
  },
  select() {
    const done = store.get('done', {});
    const m = Modal.show(`<div class="card"><div class="kicker">MISSIONS</div><h2>選關卡</h2>
      <div class="mlist"><button class="mcard" data-th="1"><span class="no">SHOW</span><span><div class="t">劇場 · 先看懂</div><div class="d">六個編排好的情境，一步一句旁白；三層視野可隨時開關，結尾給三條活路。不用操作。</div></span></button>${MISSIONS.map((x, i) => `<button class="mcard" data-i="${i}"><span class="no">${x.id === 'free' ? 'FREE' : '0' + (i + 1)}</span><span><div class="t">${x.title}</div><div class="d">${x.blurb}</div></span>${done[x.id] ? '<span class="ok">✔ 已通關</span>' : ''}</button>`).join('')}</div>
      <div class="row"><button class="btn ghost" id="back">← 返回</button></div></div>`);
    m.querySelectorAll('.mcard').forEach(b => b.onclick = () => { SFX.init(); if (b.dataset.th) Theater.menu(); else G.start(+b.dataset.i); });
    m.querySelector('#back').onclick = () => G.w && G.mission ? this.pause() : this.title();
  },
  pause() {
    const m = Modal.show(`<div class="card" style="width:min(460px,100%)"><div class="kicker">PAUSED</div><h2>已暫停</h2>
      <div class="row"><button class="btn teal" id="r">繼續</button><button class="btn ghost" id="re">重玩本關</button><button class="btn ghost" id="sel">選關卡</button></div></div>`, { clear: true });
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
      <div class="row">${next ? '<button class="btn teal big" id="nx">下一關 ▶</button>' : ''}<button class="btn ${next ? 'ghost' : 'teal'}" id="re">${G.opts.spectate ? '再看一場' : '再玩一次'}</button>${G.mission.id === 'free' ? `<button class="btn ghost" id="sw">${G.opts.spectate ? '換我上場' : '觀戰一場 AI 對打'}</button>` : ''}<button class="btn ghost" id="sel">選關卡</button></div></div>`);
    if (next) m.querySelector('#nx').onclick = () => G.start(G.missionIdx + 1);
    const spec = G.opts.spectate, fi = G.missionIdx; m.querySelector('#re').onclick = () => spec ? Director.watch() : G.start(fi);
    if (m.querySelector('#sw')) m.querySelector('#sw').onclick = () => spec ? G.start(fi) : Director.watch();
    m.querySelector('#sel').onclick = () => this.select();
  },
};
