/* ── 常數與資料表 ───────────────────────── */
const N = 28;               // 地圖 N×N 格
const TW = 64, TH = 32;     // 等角格寬高（world px）
const iso = (x, y) => ({ x: (x - y) * TW / 2, y: (x + y) * TH / 2 });

const SPEED = 3.0;          // 工程師移動速度（格/秒）
const MINE_T = 4.0;         // 每趟採集時間（秒）
const CHUNK = 4;            // 每趟帶回預算
const ENG_COST = 50;
const BASE_TRAIN = 8;       // 工程師訓練秒數（教材用縮短值）
const DEBT_DRAIN = 0.05;    // 每點技術債每秒扣的預算（教材用放大值，規格為 0.03）
const DEBT_SLOW = 0.025;    // 每點技術債讓產出 −2.5%（規格為 1.2%）
const REPAY_S = 3;          // 每點技術債需要的工程師秒數（規格為 10，教材縮短）

const PACE = {
  normal: { key: 'normal', mult: 1.00, debt: 0, name: '正常', sub: '×1.0 · 零債' },
  fast: { key: 'fast', mult: 0.72, debt: 2, name: '加速', sub: '×0.72 · +2 債' },
  rush: { key: 'rush', mult: 0.55, debt: 5, name: '硬趕', sub: '×0.55 · +5 債' },
};

const BLD = {
  hub: { name: '需求池', en: 'Backlog Hub', w: 3, h: 3, hgt: 46, supply: 8, vision: 7.6, cost: 0, time: 0 },
  comms: { name: '協作制度', en: 'Comms Layer', w: 2, h: 2, hgt: 24, supply: 8, vision: 5, cost: 100, step: 45, time: 14 },
  obs: { name: '監控中心', en: 'Observability', w: 2, h: 2, hgt: 38, supply: 0, vision: 7, cost: 125, step: 0, time: 14 },
};

BLD.hub.makes = 'eng';
BLD.squad = { name: '開發小隊', en: 'Dev Squad', w: 2, h: 2, hgt: 30, supply: 0, vision: 5, cost: 150, step: 0, time: 20, makes: 'feat' };
BLD.plat = { name: '平台組', en: 'Platform Team', w: 2, h: 2, hgt: 34, supply: 0, vision: 5, cost: 150, step: 0, time: 24, makes: 'pfeat', needs: 'squad' };
BLD.lab = { name: '研發中心', en: 'R&D Lab', w: 2, h: 2, hgt: 38, supply: 0, vision: 5, cost: 200, step: 0, time: 22, needs: 'comms' };
const RANK = [1, .8, .64, .5, .4, .3];   // 第 n 位研究員的邊際貢獻（人月神話：6 人 = 3.64 倍速，不是 6 倍）
const LAB_SLOTS = RANK.length;
const TECH = [
  { id: 'proc', name: '流程改善', lv: [{ cost: 100, W: 50 }, { cost: 200, W: 90 }, { cost: 350, W: 150 }], need: null, fx: '生產與建造時間 −12%／級（複利）' },
  { id: 'auto', name: '開發環境自動化 CI/CD', lv: [{ cost: 150, W: 70 }, { cost: 250, W: 120 }], need: { proc: 1 }, fx: '採集效率 +10%／級' },
  { id: 'test', name: '自動化測試', lv: [{ cost: 150, W: 80 }], need: { bld: 'obs' }, fx: '趕工產生的技術債 −40%；事故門檻 25→32' },
  { id: 'ci', name: '程式碼審查・持續整合', lv: [{ cost: 200, W: 100 }], need: { test: 1 }, fx: '技術債利息（扣預算＋拖慢產出）−35%' },
  { id: 'onboard', name: 'Onboarding 手冊', lv: [{ cost: 150, W: 90 }], need: { comms: 2 }, fx: '每座協作制度 +8 → +11 ▤' },
  { id: 'arch', name: '平台化架構', lv: [{ cost: 250, W: 120 }], need: { bld: 'plat' }, fx: '全部功能戰力 +10%；維運 −25%' },
  { id: 'refactor', name: '重構', lv: [{ cost: 80, W: 40 }], need: { bld: 'obs' }, repeat: true, fx: '一次清掉 6 點技術債（可重複）' },
  { id: 'insight', name: '市場調研', lv: [{ cost: 120, W: 60 }], need: null, fx: '所有單位視野 +2 格，更早看到據點' },
];
const UNIT = {
  eng: { name: '工程師', cost: 50, time: 8, sup: 1 },
  feat: { name: '功能', cost: 50, time: 8, sup: 1 },
  pfeat: { name: '平台功能', cost: 125, time: 12, sup: 2 },
};
const FEAT_POWER = 10, UPKEEP_F = 0.04, UPKEEP_P = 0.10, NODE_R = 2.6;

const COL = {
  bg: '#070b12', team: '#3ee0a1', teamD: '#1f8f6a', ore: '#5aa9ff', amber: '#f5b942', red: '#ff5a4d', pink: '#ff6b9a', violet: '#a58bff',
  rival: '#ff6a4a',
};

const ENG_SIGHT = 3.4;   // 工程師視野半徑（格）：他只看得到身邊
const ROLES = {
  ground: { key: 'ground', name: 'PM', en: 'Ground', tag: '地面層' },
  engineer: { key: 'engineer', name: '工程師', en: 'Engineer', tag: '執行層' },
  bridge: { key: 'bridge', name: '主管', en: 'Bridge', tag: '艦橋層' },
  orbit: { key: 'orbit', name: '老闆', en: 'Orbit', tag: '軌道層' },
};
