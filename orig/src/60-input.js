/* ── 輸入：滑鼠／觸控／鍵盤。動作交給 G（其內先過 Coach 閘門）─────────── */
const Input = {
  down: null, drag: false, keys: new Set(), lastTap: 0,
  init() {
    const cv = $('#stage'), box = $('#dragbox');
    cv.addEventListener('contextmenu', e => e.preventDefault());
    cv.addEventListener('pointerdown', e => {
      SFX.init(); if (!G.w || Modal.isOpen) return; cv.setPointerCapture(e.pointerId);
      this.down = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, btn: e.button, touch: e.pointerType === 'touch', moved: false, cam: null };
      if (e.button === 2) { e.preventDefault(); }
    });
    cv.addEventListener('pointermove', e => {
      const d = this.down; G.hover = { x: e.clientX, y: e.clientY };
      if (G.place) G.placeAt(e.clientX, e.clientY, false);
      if (!d) return; const dx = e.clientX - d.sx, dy = e.clientY - d.sy;
      if (!d.moved && Math.hypot(dx, dy) > 6) d.moved = true;
      if (!d.moved) return;
      if (d.btn === 1 || d.btn === 2 || (d.touch && !G.place)) { if (Coach.ok('camera', {})) { R.pan(-(e.clientX - d.x), -(e.clientY - d.y)); } }
      else if (d.btn === 0 && !d.touch && !G.place && G.role === 'ground') {
        box.style.display = 'block'; box.style.left = Math.min(d.sx, e.clientX) + 'px'; box.style.top = Math.min(d.sy, e.clientY) + 'px'; box.style.width = Math.abs(e.clientX - d.sx) + 'px'; box.style.height = Math.abs(e.clientY - d.sy) + 'px';
      }
      d.x = e.clientX; d.y = e.clientY;
    });
    const up = e => {
      const d = this.down; this.down = null; box.style.display = 'none'; if (!d || !G.w || Modal.isOpen) return;
      if (d.moved) {
        if (d.btn === 0 && !d.touch && !G.place && G.role === 'ground') { const us = R.unitsInRect(G.w, d.sx, d.sy, e.clientX, e.clientY); if (us.length) G.select(us.map(u => u.id)); }
        return;
      }
      if (d.btn === 2) { G.command(e.clientX, e.clientY); return; }
      if (d.btn !== 0) return;
      this.click(e.clientX, e.clientY);
    };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', () => { this.down = null; box.style.display = 'none'; });
    cv.addEventListener('wheel', e => { e.preventDefault(); if (!Coach.ok('camera', {})) return; R.zoomAt(e.deltaY < 0 ? 1.1 : 1 / 1.1, e.clientX, e.clientY); }, { passive: false });
    addEventListener('keydown', e => this.key(e)); addEventListener('keyup', e => this.keys.delete(e.key.toLowerCase()));
  },
  click(sx, sy) {
    const w = G.w; if (G.role !== 'ground') return;
    if (G.place) { G.placeAt(sx, sy, true); return; }
    if (G.cmdMode === 'move' || G.cmdMode === 'amove') { G.command(sx, sy); return; }
    const t = R.pick(w, sx, sy);
    if (t && t.kind === 'bld' && ((!t.built) || t.type === 'lab') && G.selUnits().some(u => u.type === 'eng')) { G.command(sx, sy); return; }
    if (t && (t.kind === 'unit' || t.kind === 'bld')) {
      const now = performance.now();
      if (t.kind === 'unit' && now - this.lastTap < 320 && G.sel.length === 1 && G.sel[0] === t.id) { const ids = w.units.filter(u => u.team === 0 && u.type === t.type && R.t2s(u.x, u.y).x > 0 && R.t2s(u.x, u.y).x < R.vw && R.t2s(u.x, u.y).y > 0 && R.t2s(u.x, u.y).y < R.vh).map(u => u.id); G.select(ids); }
      else G.select([t.id]);
      this.lastTap = now; return;
    }
    if (t && t.kind === 'node') { if (G.selUnits().length && G.has('move')) { G.command(sx, sy); return; } G.select([t.id]); return; }
    if (t && (t.kind === 'patch' || t.kind === 'debt') && G.selUnits().length) { G.command(sx, sy); return; }
    if (G.sel.length) G.select([], true);
  },
  key(e) {
    if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
    // 快捷鍵不分大小寫、不受 Caps Lock／Shift／中文輸入法影響：字母與數字優先用實體按鍵 e.code，其餘（F1、Esc、Tab、方向鍵、+）用 e.key
    const k = /^Key[A-Z]$/.test(e.code) ? e.code.slice(3).toLowerCase() : /^Digit[0-9]$/.test(e.code) ? e.code.slice(5) : String(e.key).toLowerCase(); this.keys.add(k);
    if ((e.metaKey || e.ctrlKey || e.altKey) && k !== 'f1') return;
    if (Modal.isOpen) return;
    if (k === 'escape') { if (G.cancelPlace()) return; if (G.sel.length && !Coach.active()) { G.select([], true); return; } G.menu(); return; }
    if (k === 'p') { G.togglePause(); return; }
    if (k === 'm') { $('#bMute').click(); return; }
    if (k === 'h') { G.goHome(); return; }
    if (k === 't') { G.toggleTech(); return; }
    if (k === 'f1') { e.preventDefault(); G.selectIdle(); return; }
    if (k === 'f2') { e.preventDefault(); G.selectArmy(); return; }
    if (k === ' ' && G.w && G.w.war) { e.preventDefault(); G.jumpAlert(); return; }
    if (k === '+' || k === '=') { G.cycleSpeed(); return; }
    if (G.has('views') && (k === '1' || k === '2' || k === '3' || k === '4')) { G.setRole({ '1': 'ground', '2': 'bridge', '3': 'orbit', '4': 'engineer' }[k]); return; }
    if (k === 'tab' && G.role === 'engineer') { e.preventDefault(); G.engCycle(e.shiftKey ? -1 : 1); return; }
    if (G.role === 'ground' && !e.ctrlKey && !e.metaKey && k.length === 1 && 'qweasdzxc'.includes(k)) { if (UI.cardKey(k)) e.preventDefault(); }
  },
  step(dt) { // 鍵盤移動鏡頭
    if (Modal.isOpen || !Coach.ok('camera', {}, true)) return; const k = this.keys; let dx = 0, dy = 0;
    if (k.has('arrowleft')) dx -= 1; if (k.has('arrowright')) dx += 1; if (k.has('arrowup')) dy -= 1; if (k.has('arrowdown')) dy += 1;
    if (dx || dy) R.pan(dx * 600 * dt, dy * 600 * dt);
  },
};
