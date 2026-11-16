'use strict';
/* 戰爭迷霧 · 專案管理即時戰略 — 單檔、零外部請求。模擬層與畫面層分離（見 20-sim / 40-render） */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const ease = t => (t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const easeOut = t => 1 - Math.pow(1 - t, 3);
const fmtTime = s => { s = Math.max(0, Math.floor(s)); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function hash2(x, y) { let h = (x * 374761393 + y * 668265263) ^ 0x5bd1e995; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
const store = {
  get(k, d) { try { const v = localStorage.getItem('fogrts.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('fogrts.' + k, JSON.stringify(v)); } catch (e) { } },
};
/* ── 語言（i18n）：?lang=en|zh 優先 → 使用者切換過的選擇（localStorage）→ 瀏覽器語言（zh* 用繁中，其餘英文）。
   L(繁中, English)：繁中模式原樣回傳第一個參數，原版行為不變 ── */
const LANG = (() => {
  let q = ''; try { q = (new URLSearchParams(location.search).get('lang') || '').toLowerCase(); } catch (e) { }
  if (q.startsWith('zh')) return 'zh'; if (q.startsWith('en')) return 'en';
  const s = store.get('lang', null); if (s === 'zh' || s === 'en') return s;
  let nav = ''; try { nav = navigator.language || (navigator.languages || [])[0] || ''; } catch (e) { }
  return /^zh/i.test(nav) ? 'zh' : 'en';
})();
const EN = LANG === 'en';
const L = (zh, en) => (EN ? en : zh);
function setLang(l) {
  if (l !== 'zh' && l !== 'en') return; store.set('lang', l);
  try { const u = new URL(location.href); u.searchParams.set('lang', l); location.href = u.toString(); } catch (e) { location.reload(); }
}
try { document.documentElement.lang = EN ? 'en' : 'zh-Hant'; } catch (e) { }
function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
