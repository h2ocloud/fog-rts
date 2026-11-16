/* ═════ 自由對戰：16 分鐘完整機制 ═════
   開發小隊出功能 → 站在市場據點上搶佔（戰力持續高於對手 20 秒）→ 佔領後每秒產出；功能吃維運與頻寬、趕工生技術債、
   老闆每 ~3 分鐘下一道只看得到 4 個數字的指令、信任反饋回產能；對手是隨機一位「真實案例改寫」的 AI，身份要靠偵察與觀察推理。 */
const PERSONAS = [
  {
    id: 'ESPOO-2007', real: L('Nokia，2007–2013', 'Nokia, 2007–2013'), tag: L('它偵察了，但評估模型過時', 'It scouted — but read the intel with an outdated model'),
    headline: t => t < 300 ? L('競品維持既有產品線，市佔穩定', 'Rival sticks to its existing product line; share holds steady') : L('競品宣布進入企業客戶市場', 'Rival announces a push into the enterprise market'),
    pow: (n, t) => n.type === 'ent' ? (t >= 300 ? 34 : 0) : 30,
    // 戰爭版：開局就守住三個據點（每點 3 個），兵力固定、不反攻；評估模型 120 秒才更新一次，而且不把「平台功能」算進去 → 它會拿舊數字來決定打哪裡
    ai: { bank0: 200, start: { niche: 2, 'mass-n': 3, 'mass-s': 3 }, income: t => 2.6, cost: 50, cap: 16, prodEvery: 4, pow: t => 1, garrison: 3, wave: 5, waveEvery: 110, firstWave: 150,
      staleObs: 120, ignoreNew: true, caution: 1, react: false, scout: 75, retreat: 0, bias: (n, t) => n.type === 'ent' ? (t >= 300 ? 25 : -99) : 0, style: L('守成：兵力固定、不反攻、用兩分鐘前的情報做決定', 'Defender: fixed army, never counterattacks, decides on two-minute-old intel') },
    fact: L('2007 年 Nokia 手機市佔約四成，內部對 iPhone 的評估是「沒有實體鍵盤不會成功」；手機部門於 2013 年售予微軟（54.4 億歐元）。', 'In 2007 Nokia held about 40% of the phone market. Its internal verdict on the iPhone: "No physical keyboard — it won\'t succeed." The phone division was sold to Microsoft in 2013 (€5.44 billion).'),
    lesson: L('偵察到 ≠ 理解偵察結果。最危險的不是沒情報，是拿舊模型去解讀新情報。它的戰力固定不變、也不回應你的新兵種 —— 湊夠一次就能拿下。', 'Seeing the intel ≠ understanding it. The real danger isn\'t missing intel — it\'s reading new intel through an old model. Its power never changes and it ignores your new unit types — mass enough once and the zone is yours.'),
  },
  {
    id: 'QUIBI-1750', real: L('Quibi，2018–2020', 'Quibi, 2018–2020'), tag: L('資源三倍，build order 錯了還是死', 'Triple the resources — wrong build order, still dead'),
    headline: t => t < 270 ? L('競品宣布大規模投資，全面鋪開', 'Rival announces massive investment, rolls out everywhere') : t < 360 ? L('競品燒錢速度異常，營收未見起色', 'Rival burning cash at an alarming rate; revenue still flat') : L('競品資金見底，準備縮編', 'Rival nearly out of money, preparing to downsize'),
    pow: (n, t) => { const b = n.type === 'ent' ? 50 : 62; return t < 270 ? b : t >= 360 ? 0 : b * (1 - (t - 270) / 90); },
    // 戰爭版：錢多、兵多、狂攻；4:30 之後沒有收入、單位戰力下滑，5:00 起每秒掉血（燒錢）→ 6 分鐘左右整支軍隊散掉
    ai: { bank0: 600, start: { niche: 2, 'mass-n': 2, 'mass-s': 2, ent: 2 }, income: t => t < 270 ? 4.5 : 0, nodeInc: 0, cost: 50, cap: 26, prodEvery: 2,
      pow: t => t < 270 ? 1.15 : t < 360 ? 1.15 - .6 * (t - 270) / 90 : .55, decay: t => t < 290 ? 0 : 1.6, garrison: 2, wave: t => t < 270 ? 6 : 99, waveEvery: 50, firstWave: 70,
      caution: 0, react: true, reactDelay: 4, scout: 45, retreat: 0, style: L('閃電戰：錢多兵多、不計代價強攻；但沒有營收，撐不過六分鐘', 'Blitz: deep pockets, big army, attacks at any cost — but with no revenue it can\'t last six minutes') },
    fact: L('Quibi 募得約 17.5 億美元，2020 年 4 月上線、同年 10 月宣布關閉，前後約六個月。團隊資源與人脈都不缺；缺的是「先驗證再蓋」的順序。', 'Quibi raised about $1.75 billion, launched in April 2020 and announced its shutdown that October — about six months start to finish. It never lacked resources or connections; what it lacked was the order: "validate first, then build."'),
    lesson: L('錢可以買到單位，買不到順序。前 4 分鐘它壓著你打，第 5 分鐘之後產出斷崖式崩潰 —— 這局的答案只有一個字：撐。硬碰硬的人先死。', 'Money buys units, not sequence. For the first 4 minutes it pins you down; after minute 5 its output falls off a cliff — this match has a one-word answer: hold. Whoever trades blow for blow dies first.'),
  },
  {
    id: 'REDMOND-EDU', real: L('Microsoft Teams vs Slack，2017–', 'Microsoft Teams vs Slack, 2017–'), tag: L('兵比你爛，但地圖慢慢變成它的顏色', 'Weaker troops than yours — but the map slowly turns its color'),
    headline: t => L('競品把產品綁進既有套裝，免費送', 'Rival bundles its product into its existing suite — for free'),
    pow: (n, t, w) => n.rm ? 16 : 0,
    basePow: (n, t, w) => n.rm && n.owner === 1 ? 9 : 0,   // 戰爭版：被吸收的據點自帶「綁約客戶」戰力 9（不用派兵也守得住一點）
    ai: { bank0: 200, start: {}, income: t => 2.8, cost: 50, cap: 14, prodEvery: 4, pow: t => .75, garrison: 1, wave: 4, waveEvery: 120, firstWave: 180,
      caution: 1.3, react: false, retreat: .5, scout: 60, style: L('綁售：兵比你弱、打不贏就撤；但沒人守的據點會被直接吸收', 'Bundling: weaker troops that retreat when outmatched — but unguarded zones get absorbed outright') },
    tick(w, dt) {
      const P = w.persona, st = P.st || (P.st = { k: 0 }), times = [90, 240, 390, 540, 690, 840], order = ['niche', 'mass-n', 'mass-s', 'ent'];
      if (st.k < times.length && w.t >= times[st.k]) {
        st.k++; const cand = order.map(t => w.nodes.find(n => n.key === t)).filter(n => n && n.owner !== 1 && n.ourP < 20 && (w.war || !n.rm))[0];
        if (cand) { cand.rm = true; cand.owner = 1; cand.bal = 0; EMIT('nodeFlip', { n: cand, owner: 1, absorbed: true }); FX.ring(cand.x, cand.y, 2.4, COL.rival, 1); }
      }
    },
    fact: L('Teams 2017 年推出（晚於 Slack），綁在既有套裝裡零阻力散布；2021 年 10 月微軟公布 1.45 億日活。（常被拿來對比的「Slack 1200 萬日活」是 2019 年的數字，不是對等比較。）', 'Teams launched in 2017 (after Slack) and spread with zero friction by riding inside an existing suite; in October 2021 Microsoft reported 145 million daily active users. (The "Slack: 12 million DAU" figure often quoted next to it is from 2019 — not an apples-to-apples comparison.)'),
    lesson: L('贏產品不等於贏市場。它的兵比你弱、正面遭遇一定輸，但沒人駐守的據點會被「直接吸收」—— 你每場小戰都贏，佔有率卻在掉。要嘛派人守住，要嘛先算分發成本再決定要不要正面打。', 'Winning on product ≠ winning the market. Its troops are weaker and lose every head-on fight, but unguarded zones get "absorbed outright" — you win every skirmish while your share keeps slipping. Either garrison your zones, or count the distribution cost before deciding whether to fight head-on.'),
  },
  {
    id: 'NEIHU-884', real: L('momo（富邦媒）vs PChome（網家）', 'momo vs PChome (Taiwan e-commerce)'), tag: L('前八分鐘一直輸，第九分鐘反超', 'Loses for eight minutes, overtakes in the ninth'),
    headline: t => t < 480 ? L('競品仍在追趕，動作不大', 'Rival still playing catch-up, not much movement') : L('競品履約網路上線，當日／隔日到貨', 'Rival\'s fulfillment network goes live: same-day / next-day delivery'),
    pow: (n, t) => { const b = n.type === 'ent' ? 16 : 12; return t < 480 ? b : t >= 540 ? b * 3 : b + (b * 2) * ((t - 480) / 60); },
    // 戰爭版：前八分鐘兵少又弱；8:00–9:00 履約網路上線，所有單位戰力 ×0.8 → ×2（全域升級），之後每分鐘一波
    ai: { bank0: 150, start: { niche: 1, 'mass-n': 2 }, income: t => t < 480 ? 1.4 : 6, cost: 50, cap: t => t < 480 ? 10 : 20, prodEvery: t => t < 480 ? 5 : 2, hpMul: t => t < 480 ? 1 : 1.3,
      pow: t => t < 480 ? .8 : t < 540 ? .8 + 1.2 * (t - 480) / 60 : 2, garrison: 2, wave: t => t < 480 ? 3 : 7, waveEvery: t => t < 480 ? 150 : 50, firstWave: 200,
      caution: .9, react: true, reactDelay: 12, retreat: .35, scout: 80, style: L('後發：前八分鐘很弱；第九分鐘全域升級，每個單位強兩倍半', 'Late bloomer: weak for eight minutes; in minute nine a global upgrade makes every unit 2.5× stronger') },
    fact: L('PChome 1998 年創立、momo 電商 2004 年起步。2021 年全年營收：富邦媒 883.97 億、網家 485.79 億。差距普遍歸因於衛星倉與當日／隔日到貨的履約網路 —— 典型的「升級」而不是「單位」。', 'PChome was founded in 1998; momo\'s online store launched in 2004. Full-year 2021 revenue: momo (Fubon Media) NT$88.40B vs PChome NT$48.58B. The gap is widely credited to satellite warehouses and a same-day / next-day fulfillment network — a classic "upgrade," not a "unit."'),
    lesson: L('先發不等於先贏。前八分鐘你會覺得它很弱、開始鬆懈；第 9 分鐘之後它每個單位都強三倍，而且是全域生效、追不回來。升級（平台功能、還債、流程）的複利在中段才顯現，而那正好是大部分人放棄投資基礎建設的時候。', 'Moving first ≠ winning first. For eight minutes it looks weak and you start to relax; after minute 9 every one of its units is three times stronger — globally, and you can\'t claw it back. Upgrades (Platform Features, paying down debt, process) only compound mid-game — exactly when most people stop investing in infrastructure.'),
  },
];

const DIFF = { easy: { key: 'easy', name: L('輕鬆', 'Easy'), inc: .75, pow: .85 }, normal: { key: 'normal', name: L('標準', 'Normal'), inc: 1, pow: 1 }, hard: { key: 'hard', name: L('困難', 'Hard'), inc: 1.3, pow: 1.12 } };
function freeOrder(g, k) { // 老闆 AI：整份輸入只有 orbit 那一份投影
  const w = g.w, v = project(w, 'orbit', g), M = (v.cash / 1e6).toFixed(1), lamp = { green: L('綠', 'green'), yellow: L('黃', 'amber'), red: L('紅', 'red') }[v.light];
  const seen = L(`我的畫面上：現金 NT$${M}M · 人數 ${v.people} · 市佔 ${v.share}% · 燈號 ${lamp}。`, `On my screen: cash NT$${M}M · headcount ${v.people} · share ${v.share}% · light ${lamp}. `);
  const own = ownedNodes(w), nf = feats(w).length, people = w.units.filter(u => u.team === 0).length;
  const lab = labOf(w), rs = lab ? labAssigned(w, lab).length : 0;
  let kind = rs >= 2 ? 'output' : ['nodes', 'headcount', nf >= 4 ? 'cost' : 'share', 'share', 'nodes'][k % 5];
  if (kind === 'nodes' && own >= 4) kind = 'share';
  const snapPM = s => L(`功能 <b>${s.feats}</b> · 據點 <b>${s.nodes}</b> · 預算 ● <b>${s.ore}</b><br>管理頻寬 <b class="${s.used >= s.cap - 1 ? 'miss' : ''}">▤ ${s.used}/${s.cap}</b> · 維運 <b>−${s.upkeep.toFixed(2)}</b>/s<br>技術債 <b>${s.detected ? s.debtTrue : '？'}</b>`, `Features <b>${s.feats}</b> · Zones <b>${s.nodes}</b> · Budget ● <b>${s.ore}</b><br>Bandwidth <b class="${s.used >= s.cap - 1 ? 'miss' : ''}">▤ ${s.used}/${s.cap}</b> · Upkeep <b>−${s.upkeep.toFixed(2)}</b>/s<br>Tech debt <b>${s.detected ? s.debtTrue : '?'}</b>`);
  const snapBoss = (miss, note) => s => L(`現金 <b>NT$${(s.boss.cash / 1e6).toFixed(1)}M</b><br>人數 <b>${s.boss.people}</b> · 市佔 <b>${s.boss.share}%</b><br>燈號 <b>${LIGHT.green}</b><br><span class="miss">沒有「${miss}」這一格</span><br><span class="dim">→ ${note}</span>`, `Cash <b>NT$${(s.boss.cash / 1e6).toFixed(1)}M</b><br>Headcount <b>${s.boss.people}</b> · Share <b>${s.boss.share}%</b><br>Light <b>${LIGHT.green}</b><br><span class="miss">No box for "${miss}"</span><br><span class="dim">→ ${note}</span>`);
  if (kind === 'output') {
    const peak = w.peakRate || w.rate, target = Math.round(Math.max(w.rate * 1.25, peak * .9) * 10) / 10;
    return { key: 'output', who: L('老闆 · 季度指令', 'Boss · Quarterly order'), say: L(`你們人那麼多，為什麼產出沒有變多？這季產出要到 ${target} ●/s。`, `You've got all these people — why isn't output going up? I want ${target} ●/s this quarter.`), why: seen + L('<b>我只看到人數沒變、現金變少，看不到誰在做什麼。</b>', '<b>All I see is headcount flat and cash shrinking — not who\'s doing what.</b>'), secs: 100, milestone: L(`產出 ${target} ●/s`, `Output ${target} ●/s`), target, progress: w => clamp(w.rate / target, 0, 1), done: w => w.rate >= target,
      pmLines: s => snapPM(s) + L(`<br>研發中 <b>${s.rs}</b> 人（不採礦）· 產出 <b>${s.rate.toFixed(1)}</b> ●/s`, `<br>In R&D <b>${s.rs}</b> (not mining) · Output <b>${s.rate.toFixed(1)}</b> ●/s`), engLines: s => L(`我被叫去研發，做的是一張票。<br><span class="miss">產出為什麼被問？我不知道 —— 我只知道我不在採礦</span>`, `I got pulled into R&D — to me it's just a ticket.<br><span class="miss">Why is anyone asking about output? No idea — all I know is I'm not mining</span>`), bossLines: snapBoss(L('研發投入與機會成本', 'R&D investment & opportunity cost'), L('「人那麼多卻沒產出」在他的畫面上只能是怠惰', 'On his screen, "lots of people, no output" can only mean slacking')), note: L('<b>研究員不採礦，產出一定掉。</b>研發是投資 —— 在四格表的風險欄標「研發投入中」，或把人調回來採礦，兩條路都對。', '<b>Researchers don\'t mine, so output will drop.</b> R&D is an investment — mark "R&D in progress" in the risk box of your 4-box report, or pull people back to mining. Either is right.') };
  }
  if (kind === 'nodes') { const target = own + 1; return { key: 'nodes', who: L('老闆 · 季度指令', 'Boss · Quarterly order'), say: L('競品在搶市佔，這季至少再拿下一個市場據點。', 'The rival is grabbing share. Take at least one more market zone this quarter.'), why: seen + L('<b>我看不到對手在每個據點的戰力，也看不到你要先偵察、湊夠兵力、還要撐滿 20 秒。</b>', '<b>I can\'t see the rival\'s power at each zone — or that you have to scout first, mass enough troops, and then hold for a full 20s.</b>'), secs: 110, milestone: L(`據點 ${target} 個`, `Hold ${target} zone${target === 1 ? '' : 's'}`), target, progress: w => own / target < 1 ? (ownedNodes(w) + 0) / target : 1, done: w => ownedNodes(w) >= target, pmLines: snapPM, engLines: s => L(`我只看到有一群「功能」被叫去別的地方。<br><span class="miss">為什麼？沒人說。對手有多強？我不知道</span>`, `All I see is a bunch of "Features" getting sent somewhere else.<br><span class="miss">Why? Nobody said. How strong is the rival? No idea</span>`), bossLines: snapBoss(L('對手戰力／佔領條件', 'rival power / capture rules'), L('「再拿一個據點」在他的畫面上只是一個數字', 'On his screen, "take one more zone" is just a number')), note: L('<b>據點要看得到對手戰力才好判斷。</b>沒偵察過的據點，你的畫面上也是「？」。', '<b>You can only judge a zone if you can see the rival\'s power there.</b> Unscouted zones show "?" on your screen too.') }; }
  if (kind === 'headcount') { const target = people + 4; return { key: 'people', who: L('老闆 · 季度指令', 'Boss · Quarterly order'), say: L(`人手不夠，這季把團隊加到 ${target} 人（工程師＋功能）。`, `We're short-handed. Grow the team to ${target} this quarter (Engineers + Features).`), why: seen + L('<b>沒有「管理頻寬」這一格</b> —— 在我看來，加人只是花錢。', '<b>There\'s no "management bandwidth" box</b> — to me, adding people just costs money.'), secs: 110, milestone: L(`團隊 ${target} 人`, `Team of ${target}`), target, progress: w => w.units.filter(u => u.team === 0).length / target, done: w => w.units.filter(u => u.team === 0).length >= target, pmLines: snapPM, engLines: s => L(`我只收到：「多接一點，新人會來」。新人誰帶？沒人說。<br><span class="miss">我不知道頻寬已經滿了</span>`, `All I got was: "Take on a bit more, new hires are coming." Who's onboarding them? Nobody said.<br><span class="miss">I have no idea bandwidth is already maxed</span>`), bossLines: snapBoss(L('管理頻寬', 'management bandwidth'), L('「錢夠就該加人」在他的畫面上完全合理', 'On his screen, "we have the cash, so hire" makes perfect sense')), note: L('頻寬滿了嗎？每個功能也佔 ▤1。', 'Is bandwidth maxed? Every Feature takes ▤1 too.') }; }
  if (kind === 'cost') { const target = Math.max(0, nf - 2); return { key: 'cost', who: L('老闆 · 季度指令', 'Boss · Quarterly order'), say: L('維運太貴了，這季砍掉兩個功能。', 'Upkeep is too expensive. Cut two Features this quarter.'), why: seen + L('<b>我只看到現金在掉，看不到哪些功能還有人用。</b>', '<b>All I see is cash dropping — not which Features anyone still uses.</b>'), secs: 90, milestone: L(`功能 ≤ ${target}`, `Features ≤ ${target}`), target, progress: w => clamp((nf - feats(w).length) / Math.max(1, nf - target), 0, 1), done: w => feats(w).length <= target, pmLines: snapPM, engLines: s => L(`砍功能？我們早就想砍了 —— <span class="miss">沒人問過我哪些根本沒人用</span>，我一半時間都在修舊功能。`, `Cut features? We've wanted to for ages — <span class="miss">nobody ever asked me which ones nobody uses</span>. I spend half my time fixing old ones.`), bossLines: snapBoss(L('維運成本與各功能貢獻', 'upkeep cost & what each Feature contributes'), L('方向是對的，只是「兩個」這個數字是猜的', 'Right direction — but "two" is a guess')), note: L('選功能單位按「下架」：釋放頻寬、省維運，但不退款。挑站在沒戰力位置的下架。', 'Select a Feature and hit "Sunset": frees bandwidth and saves upkeep, but no refund. Sunset the ones standing where they add no power.') }; }
  const cur = marketShare(w), target = Math.min(90, cur + 20);
  return { key: 'share', who: L('老闆 · 季度指令', 'Boss · Quarterly order'), say: L(`市佔要到 ${target}%，其他我不管。`, `Get market share to ${target}%. I don't care about anything else.`), why: seen + L('<b>我只看得到市佔這一個數字。</b>', '<b>Market share is the only number I can see.</b>'), secs: 120, milestone: L(`市佔 ${target}%`, `Share ${target}%`), target, progress: w => clamp(marketShare(w) / target, 0, 1), done: w => marketShare(w) >= target, pmLines: snapPM, engLines: s => L(`市佔？<span class="miss">我只知道我手上這張票</span>。通路、對手，不是我的畫面。`, `Market share? <span class="miss">All I know is the ticket in front of me</span>. Channels, rivals — not on my screen.`), bossLines: snapBoss(L('分發通路與前置條件', 'distribution channels & prerequisites'), L('市佔是結果，他看不到你為它付了什麼', 'Share is an outcome — he can\'t see what you paid for it')), note: L('企業客戶據點需要 ≥1 個平台功能；平台功能還讓所有功能戰力 +15%。', 'The Enterprise zone needs ≥1 Platform Feature; Platform Features also give all Features +15% power.') };
}

MISSIONS.push({
  id: 'free', title: L('自由對戰 · 16 分鐘', 'Free Play · 16 Minutes'), blurb: L('完整機制：開發小隊出功能、搶 4 個市場據點、維運與技術債、老闆的決策點與信任；對手是隨機一位真實案例改寫的 AI，身份靠偵察推理。', 'The full game: Dev Squads train Features, you fight over 4 market zones, juggle upkeep and tech debt, the Boss\'s decision points and Trust. The rival is a random AI based on a real-world case — scout to work out who it is.'), limit: 960,
  setup(g, opts) {
    const w = g.w; w.pads = [{ x: 5, y: 15, w: 8, h: 8, c: '#21364a', line: 'rgba(62,224,161,.22)' }, { x: 1, y: 11, w: 5, h: 13, c: '#15222d' }, { x: 18, y: 1, w: 8, h: 8, c: '#3a2424', line: 'rgba(255,106,74,.3)' }];
    const hub = layoutBase(w, 7, 17);
    scatterRocks(w, [[2, 9, 2], [1, 26], [4, 25], [12, 25, 2], [14, 14], [10, 9], [19, 16, 2], [20, 9], [13, 19], [24, 17, 2], [18, 10], [26, 6], [9, 3], [21, 24, 2], [5, 5, 2]]);
    addBld(w, 'comms', 11, 17, true); addRival(w, 21, 4);
    for (const d of [{ key: 'niche', name: L('利基市場', 'Niche Market'), type: 'niche', x: 12.5, y: 11.5, yield: .5 }, { key: 'mass-s', name: L('大眾市場 · 南', 'Mass Market · S'), type: 'mass', x: 17.5, y: 21.5, yield: .8 }, { key: 'mass-n', name: L('大眾市場 · 北', 'Mass Market · N'), type: 'mass', x: 15.5, y: 6.5, yield: .8 }, { key: 'ent', name: L('企業客戶', 'Enterprise'), type: 'ent', x: 23.5, y: 12.5, yield: 1.4, ent: true }]) addNode(w, d).key = d.key;
    w.ore = 300; w.trust = 70; w.tag = { results: [], validWarn: 0, microOn: true };
    spawnCrew(w, hub, 8); hub.rally = { patch: nearestPatch(w, hub.x, hub.y + 1).id };
    w.units.filter(u => u.team === 0).forEach(u => cmdMine(w, [u], w.patches[u.id % w.patches.length]));
    const P = opts.persona || PERSONAS[Math.floor(Math.random() * PERSONAS.length)]; P.st = null; w.persona = P;
    w.diff = DIFF[opts.diff || store.get('diff', 'normal')] || DIFF.normal; if (!opts.noWar) { initWar(w); w.stats = w.war; }
    g.spectate = !!opts.spectate; if (opts.spectate || opts.demo) Auto.init(w);
    g.fp = { times: [150, 330, 510, 690, 850], next: 0 };
    g.unlocked = new Set(['train', 'comms', 'obs', 'squad', 'plat', 'lab', 'pace', 'mine', 'idle', 'repay', 'move', 'views']); g.dp = null; g.light = 'green';
    computeVision(w); w.t0 = -4;
  },
  reveal(g, opts) { UI.show('sup'); UI.show('map'); UI.show('home'); UI.show('trust'); UI.show('views'); },
  afterTutorial(g) {
    const w = g.w; R.focus(bcx(hubOf(w)), bcy(hubOf(w)) + 1, R.playZoom());
    if (g.spectate) { g.clockOn = true; g.clock = 0; Director.begin(g); return; }
    g.clockOn = false; let diff = store.get('diff', 'normal');
    const m = Modal.show(`<div class="card"><div class="kicker">${L('FREE PLAY · 16 分鐘 · 市場戰爭', 'FREE PLAY · 16 MIN · MARKET WAR')}</div><h2>${L('自由對戰', 'Free Play')}</h2>
      <p class="lead">${L('前幾關學的東西，這裡全部一起來。<b>撐到 16:00，市佔 ≥ 50%，而且信任別掉到 30 以下。</b>對手會出兵、會偵察、會反攻 —— 雙方的功能在據點上真的交戰。', 'Everything from the earlier missions, all at once. <b>Last until 16:00 with market share ≥ 50%, and don\'t let Trust fall below 30.</b> The rival builds armies, scouts, and counterattacks — both sides\' Features really fight over the zones.')}</p>
      <div class="stats"><div class="stat"><b>4</b><span>${L('個市場據點（要偵察才看得到對手）', 'market zones (scout to see the rival)')}</span></div><div class="stat"><b>5</b><span>${L('道老闆指令（時間不停）', 'Boss orders (the clock never stops)')}</span></div><div class="stat"><b>?</b><span>${L('對手是誰 —— 結束時揭曉', 'Who\'s the rival? Revealed at the end')}</span></div></div>
      <div class="lesson">${L('<b>玩法：</b>① 蓋<b>開發小隊</b>→ 訓練<b>功能</b> ② 選功能，右鍵<b>據點或敵人＝攻擊移動</b>（沿路遇敵就打）；右鍵地面＝一般移動（不還手，撤退用）③ 站在據點上、戰力持續高於對手 20 秒就佔領（優勢越大越快）④ <b>技術債會讓功能打不贏</b>（傷害跟著產出一起打折），要有監控中心才看得到 ⑤ <b>平台組</b>：平台功能讓身邊的功能少受 25% 傷害、全隊戰力 +15%，企業客戶也需要它 ⑥ 別追到對手基地 —— 它的本土市場有護城河火力。<br><b>快捷鍵：</b>F2 全選部隊　空白鍵 跳到最新警報　1~4 換位子（老闆／主管／PM／工程師）', '<b>How to play:</b> ① Build a <b>Dev Squad</b> → train <b>Features</b> ② Select Features and right-click a <b>zone or enemy = attack-move</b> (fights anything on the way); right-click ground = plain move (no return fire — use it to retreat) ③ Stand on a zone with more power than the rival for 20s to capture it (bigger edge = faster) ④ <b>Tech debt makes Features lose fights</b> (damage drops along with output) — you need Observability to see it ⑤ <b>Platform Team</b>: Platform Features cut damage to nearby Features by 25% and give the whole army +15% power; Enterprise needs them too ⑥ Don\'t chase into the rival\'s base — its home market has moat firepower.<br><b>Hotkeys:</b> F2 select army · Space jump to latest alert · 1–4 switch seats (Boss / Manager / PM / Engineer)')}</div>
      <div class="row" style="align-items:center"><span style="color:var(--dim);font-size:13px">${L('對手強度', 'Rival strength')}</span>${Object.values(DIFF).map(d => `<button class="chip${d.key === diff ? ' sel' : ''}" data-d="${d.key}">${d.name}</button>`).join('')}</div>
      <div class="row"><button class="btn teal big" id="go">${L('開始 ▶', 'Start ▶')}</button><button class="btn ghost" id="watch">${L('先觀戰一場（AI 對 AI）', 'Watch one first (AI vs AI)')}</button><button class="btn ghost" id="back">${L('回選單', 'Menu')}</button></div></div>`);
    m.querySelectorAll('[data-d]').forEach(b => b.onclick = () => { diff = b.dataset.d; store.set('diff', diff); m.querySelectorAll('[data-d]').forEach(x => x.classList.toggle('sel', x === b)); w.diff = DIFF[diff]; SFX.play('click'); });
    m.querySelector('#go').onclick = () => { SFX.init(); Modal.hide(); w.diff = DIFF[diff]; g.clockOn = true; g.clock = 0; Music.setMood('calm'); UI.feed(L('16 分鐘開始。先蓋開發小隊，並派一個人去看看據點', '16 minutes on the clock. Build a Dev Squad first, and send someone to scout the zones'), 'good'); };
    m.querySelector('#watch').onclick = () => { SFX.init(); Director.watch(); };
    m.querySelector('#back').onclick = () => Screens.title();
  },
  on(g, t, d) {
    if (t === 'nodeFlip') {
      const n = d.n; if (d.owner === 1 && g.w.vis[Math.floor(n.y) * N + Math.floor(n.x)] === 0) return; const txt = d.owner === 0 ? L(`${n.name} 被我方佔領！＋${n.yield} ●/s`, `${n.name} captured! +${n.yield} ●/s`) : d.absorbed ? L(`${n.name} 被對手「直接吸收」了（沒人駐守）`, `${n.name} was "absorbed outright" by the rival (nobody guarding it)`) : L(`${n.name} 被對手佔領`, `${n.name} taken by the rival`);
      UI.toast(txt, d.owner === 0 ? 'good' : 'bad'); UI.feed(txt, d.owner === 0 ? 'good' : 'bad'); SFX.play(d.owner === 0 ? 'capture' : 'lost'); R.shake(d.owner === 0 ? 3 : 6); R.mmPing(n.x, n.y, d.owner === 0 ? COL.team : COL.red); g.lastAlert = { x: n.x, y: n.y };
    }
    if (t === 'underAttack' && !g.spectate) { const where = d.turret ? L('我方部隊靠近對手基地，被護城河火力壓制', 'Our troops got too close to the rival base — pinned down by moat fire') : d.node ? L(`${d.node.name} 的部隊遭到攻擊`, `Troops at ${d.node.name} under attack`) : L('我方部隊遭到攻擊', 'Our troops are under attack'); UI.toast(where + L('（空白鍵跳過去）', ' (Space to jump there)'), 'bad'); UI.feed(where, 'bad'); SFX.play('alarm'); R.mmPing(d.x, d.y, COL.red); g.lastAlert = { x: d.x, y: d.y }; }
    if (t === 'wave') { const w = g.w; g.fp.pending = { at: w.t, ...d }; }
    if (t === 'detected') UI.show('debt');
    if (t === 'incident') { UI.alert(L('技術債爆發：需求池停擺 8 秒', 'Tech debt blew up: Backlog Hub halted for 8s'), 'bad'); g.addTrust(-15, L('事故', 'Incident')); }
    if (t === 'sunset') UI.sigCard = '';
    if (t === 'techDone' && d.id === 'insight') UI.feed(L('視野 +2：更早看到據點', 'Sight +2: spot zones sooner'), 'good');
  },
  hud(g) {
    const w = g.w, dp = g.dp, share = marketShare(w);
    if (dp && !dp.resolved) return { title: L(`${g.spectate ? '觀戰' : 'FREE PLAY'} · 決策點 ${dp.idx + 1} / 5`, `${g.spectate ? 'SPECTATING' : 'FREE PLAY'} · Decision point ${dp.idx + 1} / 5`), goal: L(`老闆：<b>${dp.milestone}</b> <span style="color:var(--dim);font-weight:400">${Math.round(clamp(dp.progress(w), 0, 1) * 100)}%</span>`, `Boss: <b>${dp.milestone}</b> <span style="color:var(--dim);font-weight:400">${Math.round(clamp(dp.progress(w), 0, 1) * 100)}%</span>`), sub: L(`市佔 <b>${share}%</b> · 據點 ${ownedNodes(w)}/4 · 信任 <b class="${w.trust < 50 ? 'bad' : ''}">${Math.round(w.trust)}</b>`, `Share <b>${share}%</b> · Zones ${ownedNodes(w)}/4 · Trust <b class="${w.trust < 50 ? 'bad' : ''}">${Math.round(w.trust)}</b>`) };
    const army = w.war ? L(` · 部隊 ${ourArmy(w).length} · 擊退 ${w.war.kills}／陣亡 ${w.war.losses}`, ` · Army ${ourArmy(w).length} · Kills ${w.war.kills} / Lost ${w.war.losses}`) : L(` · 功能 ${feats(w).length}`, ` · Features ${feats(w).length}`);
    return { title: g.spectate ? L(`觀戰 · AI 對 AI · ${(w.diff || DIFF.normal).name}`, `SPECTATING · AI vs AI · ${(w.diff || DIFF.normal).name}`) : L(`FREE PLAY · 16 分鐘 · ${(w.diff || DIFF.normal).name}`, `FREE PLAY · 16 MIN · ${(w.diff || DIFF.normal).name}`), goal: L(`市佔 <b>${share}%</b> <span style="color:var(--dim);font-weight:400">（目標 ≥ 50%）</span>`, `Share <b>${share}%</b> <span style="color:var(--dim);font-weight:400">(goal ≥ 50%)</span>`), sub: L(`據點 ${ownedNodes(w)}/4${army} · 信任 <b class="${w.trust < 50 ? 'bad' : ''}">${Math.round(w.trust)}</b>（需 ≥ 30）`, `Zones ${ownedNodes(w)}/4${army} · Trust <b class="${w.trust < 50 ? 'bad' : ''}">${Math.round(w.trust)}</b> (need ≥ 30)`) };
  },
  update(g, dt) {
    if (!g.clockOn) return; const w = g.w, fp = g.fp;
    if (w.war) {
      fp.sight = (fp.sight || 0) - dt;
      if (fp.sight <= 0) {
        fp.sight = 1; const seen = rivalArmy(w).filter(u => tileVis(w, u.x, u.y));
        const fresh = seen.filter(u => !u.spotted); fresh.forEach(u => u.spotted = w.t);
        if (fresh.length >= 2 && w.t - (fp.lastSight || -99) > 25) {
          fp.lastSight = w.t; const c = fresh.reduce((a, u) => ({ x: a.x + u.x / fresh.length, y: a.y + u.y / fresh.length }), { x: 0, y: 0 });
          const n = w.nodes.slice().sort((a, b) => uDist(a, c) - uDist(b, c))[0], txt = L(`發現對手部隊 ×${seen.length}（${n.name} 附近）`, `Rival troops spotted ×${seen.length} (near ${n.name})`);
          if (!g.spectate) { UI.toast(txt + L('（空白鍵跳過去）', ' (Space to jump there)'), 'bad'); UI.feed(txt, 'bad'); SFX.play('wave'); R.mmPing(c.x, c.y, COL.red); g.lastAlert = c; }
          fp.tense = w.t + 40; Music.setMood('tense'); EMIT('sighted', { x: c.x, y: c.y, n: seen.length, text: txt });
        }
        if (fp.tense && w.t > fp.tense) { fp.tense = 0; Music.setMood('calm'); }
        Music.setIntensity(clamp(.12 + w.war.heat * .75 + (g.dp && !g.dp.resolved ? .12 : 0) + (g.clock > 840 ? .15 : 0), 0, 1));
      }
    }
    if (g.dp && !g.dp.resolved) { if (g.dp.done(w) || w.t >= g.dp.deadline) (g.spectate ? quietResolve : resolveDP)(g); else if (g.spectate) autoWarn(g); }
    else if (fp.next < fp.times.length && g.clock >= fp.times[fp.next]) {
      const k = fp.next++, o = freeOrder(g, k); o.secs = Math.min(o.secs, Math.max(45, Math.floor(955 - g.clock)));
      if (g.spectate) quietDP(g, o, k); else openDP(g, o, { idx: k, total: 5, first: false, noFocus: true, nextLabel: L('繼續 ▶', 'Continue ▶') });
    }
    if (w.trust <= 0) g.finish(false, { fired: true });
    else if (g.clock >= 960) g.finish(marketShare(w) >= 50 && w.trust >= 30, {});
  },
  debrief(g, win, d) {
    const w = g.w, P = w.persona, share = marketShare(w), r = g.tag.results, v = g.tag.validWarn;
    const title = d && d.fired ? L('信任歸零：你被換掉了', 'Trust hit zero: you\'ve been replaced') : win ? L('撐到 16:00，而且守住了地圖', 'Made it to 16:00 — and held the map') : share >= 25 ? L('撐住了，但沒拿下多數市場', 'You held on, but never won the majority of the market') : L('地圖被對手吃掉了', 'The rival swallowed the map');
    return {
      title, kicker: (g.opts.spectate ? L('觀戰結束 · AI 對 AI · ', 'SPECTATING · AI vs AI · ') : 'FREE PLAY · ') + (win ? 'VICTORY' : 'ENDED'),
      stats: [{ label: L('市佔', 'Share'), val: share + '%', ok: share >= 50 }, { label: L('信任', 'Trust'), val: '♥ ' + Math.round(w.trust), ok: w.trust >= 30 }, { label: L('據點', 'Zones'), val: ownedNodes(w) + ' / 4' }, { label: L('功能', 'Features'), val: feats(w).length + L(' 個', '') }, { label: L('有效預警', 'Valid warnings'), val: v + ' / ' + r.length }, { label: L('技術債', 'Tech debt'), val: w.detected ? Math.ceil(debtTotal(w)) + L(' 點', ' pts') : L('沒偵測', 'Undetected') }],
      body: L(`<div class="swap" style="margin-top:0"><div class="view boss"><h3>對手揭曉</h3><b style="font-size:16px">${P.id}</b><br><span class="dim">${P.real}</span><br>「${P.tag}」</div><div class="view"><h3>真實案例</h3>${P.fact}</div></div>`, `<div class="swap" style="margin-top:0"><div class="view boss"><h3>Rival revealed</h3><b style="font-size:16px">${P.id}</b><br><span class="dim">${P.real}</span><br>"${P.tag}"</div><div class="view"><h3>The real case</h3>${P.fact}</div></div>`),
      lesson: L(`<b>這局的教訓：</b>${P.lesson}`, `<b>This match's lesson:</b> ${P.lesson}`),
    };
  },
});
