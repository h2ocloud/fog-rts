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
  normal: { key: 'normal', mult: 1.00, debt: 0, name: L('正常', 'Normal'), sub: L('×1.0 · 零債', '×1.0 · no debt') },
  fast: { key: 'fast', mult: 0.72, debt: 2, name: L('加速', 'Fast'), sub: L('×0.72 · +2 債', '×0.72 · +2 debt') },
  rush: { key: 'rush', mult: 0.55, debt: 5, name: L('硬趕', 'Crunch'), sub: L('×0.55 · +5 債', '×0.55 · +5 debt') },
};

const BLD = {
  hub: { name: L('需求池', 'Backlog Hub'), en: L('Backlog Hub', 'Command Center'), w: 3, h: 3, hgt: 46, supply: 8, vision: 7.6, cost: 0, time: 0 },
  comms: { name: L('協作制度', 'Comms Layer'), en: L('Comms Layer', 'Supply Depot'), w: 2, h: 2, hgt: 24, supply: 8, vision: 5, cost: 100, step: 45, time: 14 },
  obs: { name: L('監控中心', 'Observability'), en: L('Observability', 'Detector'), w: 2, h: 2, hgt: 38, supply: 0, vision: 7, cost: 125, step: 0, time: 14 },
};

BLD.hub.makes = 'eng';
BLD.squad = { name: L('開發小隊', 'Dev Squad'), en: L('Dev Squad', 'Barracks'), w: 2, h: 2, hgt: 30, supply: 0, vision: 5, cost: 150, step: 0, time: 20, makes: 'feat' };
BLD.plat = { name: L('平台組', 'Platform Team'), en: L('Platform Team', 'Factory'), w: 2, h: 2, hgt: 34, supply: 0, vision: 5, cost: 150, step: 0, time: 24, makes: 'pfeat', needs: 'squad' };
BLD.lab = { name: L('研發中心', 'R&D Lab'), en: L('R&D Lab', 'Tech Lab'), w: 2, h: 2, hgt: 38, supply: 0, vision: 5, cost: 200, step: 0, time: 22, needs: 'comms' };
const RANK = [1, .8, .64, .5, .4, .3];   // 第 n 位研究員的邊際貢獻（人月神話：6 人 = 3.64 倍速，不是 6 倍）
const LAB_SLOTS = RANK.length;
const TECH = [
  { id: 'proc', name: L('流程改善', 'Process Improvement'), lv: [{ cost: 100, W: 50 }, { cost: 200, W: 90 }, { cost: 350, W: 150 }], need: null, fx: L('生產與建造時間 −12%／級（複利）', 'Training & build time −12% per level (compounding)') },
  { id: 'auto', name: L('開發環境自動化 CI/CD', 'Dev Environment Automation (CI/CD)'), lv: [{ cost: 150, W: 70 }, { cost: 250, W: 120 }], need: { proc: 1 }, fx: L('採集效率 +10%／級', 'Mining efficiency +10% per level') },
  { id: 'test', name: L('自動化測試', 'Automated Testing'), lv: [{ cost: 150, W: 80 }], need: { bld: 'obs' }, fx: L('趕工產生的技術債 −40%；事故門檻 25→32', 'Tech debt from rushing −40%; incident threshold 25→32') },
  { id: 'ci', name: L('程式碼審查・持續整合', 'Code Review & Continuous Integration'), lv: [{ cost: 200, W: 100 }], need: { test: 1 }, fx: L('技術債利息（扣預算＋拖慢產出）−35%', 'Tech-debt interest (budget drain + slower output) −35%') },
  { id: 'onboard', name: L('Onboarding 手冊', 'Onboarding Handbook'), lv: [{ cost: 150, W: 90 }], need: { comms: 2 }, fx: L('每座協作制度 +8 → +11 ▤', 'Each Comms Layer +8 → +11 ▤') },
  { id: 'arch', name: L('平台化架構', 'Platform Architecture'), lv: [{ cost: 250, W: 120 }], need: { bld: 'plat' }, fx: L('全部功能戰力 +10%；維運 −25%', 'All Features +10% power; upkeep −25%') },
  { id: 'refactor', name: L('重構', 'Refactoring'), lv: [{ cost: 80, W: 40 }], need: { bld: 'obs' }, repeat: true, fx: L('一次清掉 6 點技術債（可重複）', 'Clears 6 points of tech debt at once (repeatable)') },
  { id: 'insight', name: L('市場調研', 'Market Research'), lv: [{ cost: 120, W: 60 }], need: null, fx: L('所有單位視野 +2 格，更早看到據點', 'All units +2 tiles of sight — spot market zones sooner') },
];
const UNIT = {
  eng: { name: L('工程師', 'Engineer'), cost: 50, time: 8, sup: 1 },
  feat: { name: L('功能', 'Feature'), cost: 50, time: 8, sup: 1 },
  pfeat: { name: L('平台功能', 'Platform Feature'), cost: 125, time: 12, sup: 2 },
};
const FEAT_POWER = 10, UPKEEP_F = 0.04, UPKEEP_P = 0.10, NODE_R = 2.6;

const COL = {
  bg: '#070b12', team: '#3ee0a1', teamD: '#1f8f6a', ore: '#5aa9ff', amber: '#f5b942', red: '#ff5a4d', pink: '#ff6b9a', violet: '#a58bff',
  rival: '#ff6a4a',
};

const ENG_SIGHT = 3.4;   // 工程師視野半徑（格）：他只看得到身邊
const ROLES = {
  ground: { key: 'ground', name: 'PM', en: 'Ground', tag: L('地面層', 'Ground layer') },
  engineer: { key: 'engineer', name: L('工程師', 'Engineer'), en: 'Engineer', tag: L('執行層', 'Execution layer') },
  bridge: { key: 'bridge', name: L('主管', 'Manager'), en: 'Bridge', tag: L('艦橋層', 'Bridge layer') },
  orbit: { key: 'orbit', name: L('老闆', 'Boss'), en: 'Orbit', tag: L('軌道層', 'Orbit layer') },
};
