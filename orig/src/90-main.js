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
function boot() {
  R.init(); Modal.init(); UI.init(); Input.init(); Director.init(); Screens.title();
  requestAnimationFrame(loop);
  window.__fog = { G, R, Coach, UI, FX, SFX, MISSIONS, Director, Auto };
}
if (document.readyState === 'loading') addEventListener('DOMContentLoaded', boot); else boot();
