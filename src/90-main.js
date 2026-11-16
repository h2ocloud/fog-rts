/* ── 啟動與主迴圈 ── */
G.demo = function () {
  Modal.hide(); this.mission = null; this.missionIdx = -1; this.over = false; this.beat = null; this.userPause = false; this.sel = []; this.place = null; this.role = 'ground'; this.unlocked = new Set(); FX.clear();
  this.opts = {}; this.clockOn = false; UI.reset(); R.terrain = null; R.fogA.fill(1);
  const fi = MISSIONS.findIndex(x => x.id === 'free'); // 背景：一場正在打的 AI 對 AI 市場戰爭
  this.w = newWorld(3 + Math.floor(Math.random() * 90)); this.w.demo = true; MISSIONS[fi].setup(this, { demo: true, skipTutorial: true, persona: PERSONAS[Math.floor(Math.random() * PERSONAS.length)], diff: 'normal' }); this.spectate = false; this.backdrop = true; $('#hud').classList.add('off');
  R.focus(bcx(hubOf(this.w)) + 1, bcy(hubOf(this.w)), Math.max(.95, R.defaultZoom() * 1.15), true); this.demoCam = { x: R.cam.x - (R.vw > 900 ? R.vw * .3 / R.cam.z : 0), y: R.cam.y - (R.vw > 900 ? 40 : 0) };
  computeVision(this.w); for (let i = 0; i < N * N; i++) R.fogA[i] = 0;
  for (let i = 0; i < 1300; i++) { tick(this.w, .1); Auto.step(this.w, .1); } FX.clear(); this.w.vis.fill(2);
  Music.start(); Music.setMood('menu');
};

let lastT = performance.now();
function loop(now) {
  const dt = Math.min(.05, (now - lastT) / 1000); lastT = now;
  try { Input.step(dt); G.frame(dt); G.render(); } catch (e) { console.error(e); }
  requestAnimationFrame(loop);
}
/* ── 英文模式：HTML 裡寫死的中文（標題、meta、HUD 提示）於啟動時換成英文；繁中模式完全不動 ── */
function i18nStatic() {
  if (!EN) return;
  document.title = 'Fog of War — a project-management RTS';
  const md = $('meta[name="description"]'); if (md) md.setAttribute('content', 'A StarCraft-style real-time strategy game for learning project management: a paused step-by-step tutorial, then Supply Block, tech debt, the four views (Boss / Manager / PM / Engineer) and trust.');
  const T = { pOre: 'Budget', pSup: 'Management bandwidth (Supply)', pDebt: 'Tech Debt', pTrust: 'Trust (how much freedom the Boss gives you)', bTech: 'R&D panel (T)', bMute: 'Sound (M)', bSpeed: 'Speed up (+)', bPause: 'Pause (P)', bMenu: 'Menu (Esc)', home: 'Back to base (H)' };
  for (const k in T) { const e = $('#' + k); if (e) e.title = T[k]; }
  const tb = $('#bTech b'); if (tb) tb.textContent = 'R&D';
  const V = { orbit: [3, 'Boss'], bridge: [2, 'Manager'], ground: [1, 'PM'], engineer: [4, 'Engineer'] };
  $$('#views button').forEach(b => { const v = V[b.dataset.role]; if (v) b.innerHTML = `<i>${v[0]}</i>${v[1]}`; });
}
function boot() {
  i18nStatic(); R.init(); Modal.init(); UI.init(); Input.init(); Director.init(); Screens.title();
  requestAnimationFrame(loop);
  window.__fog = { G, R, Coach, UI, FX, SFX, MISSIONS, Director, Auto };
}
if (document.readyState === 'loading') addEventListener('DOMContentLoaded', boot); else boot();
