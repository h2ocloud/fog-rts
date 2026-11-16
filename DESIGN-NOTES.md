
2026-09-30 Howard 要求「舊版完全不知道怎麼玩」→ 重做並更新**同一支工具**（規格書 4853de0b 連得回去）。
公開網址：<ToolHub 私人站網址已移除>

**位置**：`~/sf-work/fog-rts/`。`src/NN-*.js` 模組＋`style.css`＋`index.template.html`，`node build.mjs` 內聯成單檔 `dist/index.html`（~154 KB、零外部請求）。
測試腳本同目錄：`walk.mjs <關卡idx>`（照 Coach 亮點自動點完教學，真實滑鼠／觸控）、`play-m1/m2/m3.mjs`、`live.mjs`（打公開網址）、`make-cover.mjs`（封面）。
Playwright 從 `~/Projects/code_private/lineage-enchant/node_modules` 借（`pw.mjs`），系統 python 沒裝。
**舊版備份**：`~/sf-work/fog-rts/backup/`（伺服器資料夾 tgz、record json、public html；回滾＝把 tgz 內 index.html/cover.png scp 回去）。

**舊版卡關點**：一進場 20+ 按鈕、時間直接跑、無第一步提示；操作是「人力配置 −/+」不是選人點礦；開場彈《人月神話》與新手無關；沒敵人卻跳「失守」。

**新版設計**：Canvas2D 等角沙盤；`Coach`（70-coach.js）暫停式教學＝一次只放行亮起的動作（`step.ok/done/beat`），做完才播一小段結果。
四關：M1 供給線（13 步教學）、M2 看不見的技術債（趕工→產出▼→蓋監控中心→債務塊現形→還債）、M3 老闆看不到的（換位子看三層→決策點×2→四格表→結算＋「換位子重看同一刻」；過關＝信任≥50 且 2 次標中的預警）。
`project(w, role)`（35-view.js）是三層視野的純函式；老闆 AI 只吃 orbit 那份投影。沒做 MAX-737。

**數值踩過的坑**：採礦太快（每人 1.05 ●/s）→ MINE_T 拉到 4.0；還債後工程師會變閒置導致「最佳打法輸給什麼都不做」→ 還債前在採礦者自動回去採；決策點期限太緊（真人／bot 有延遲）→ DP1=110s、DP2=120s（目標＝理想產出×40%，用 diag-dp2.mjs 純模擬校過）。
CSS 教訓：媒體查詢必須放在基礎規則**之後**，否則被蓋掉（手機版 #rep 被撐成巨大橘色膠囊）；`filter: drop-shadow` 疊在超大 box-shadow 暗幕上會把整片染成棕色。

**同日 v2（Howard 要求補回）**：加了**劇場模式**（6 情境×5 步＋三層開關＋三欄並排＋三條活路，文案從舊版 `orig/scenes.json` 機器抽出原文沿用；用 fork 在隔離副本 `~/sf-work/fog-rts-theater/` 做完再把 `84-theater-data.js／86-theater.js／theater.css` 交回）與**自由對戰**（`83-freeplay.js`：開發小隊出功能→搶 4 個市場據點、維運/下架、平台組、4 個隨機對手人設 ESPOO/QUIBI/REDMOND/NEIHU、老闆決策點×5、16:00 結算並揭曉對手＋真實案例）。決策點/四格表抽成通用 `openDP()`（82-m3.js）。標題頁三顆副按鈕：劇場／關卡／自由對戰。
**v2 踩坑**：① 原地工作（被錨定）的工人會用防重疊推力把路過的工人永遠頂回去（基地轉角窄縫）→ `separate()` 讓移動中的單位穿過錨定單位；前幾關只是運氣沒撞到。② 決策點 2 期限/目標要用純模擬（`diag-dp2.mjs`）校：什麼都不做必輸、慢半拍處理仍過（150s、目標＝理想產出×41%）。③ 別在 draw 裡呼叫 FX.spark（暫停時每幀累積粒子）。④ 迷霧中據點被佔領的提示會洩漏情報，要過濾。
**10/01 修的兩個玩法 bug（Howard 試玩回報）**：工地只認原下令的工程師，被叫走就停工且無法派回；蓋一半不能取消。→ `cmdBuildSite`（選工程師後左/右鍵點工地，或選工地按「繼續建造」派最近的人）、`cmdCancelSite`（取消退 75%，`site.paid` 記付款）、停工視覺（灰條＋紅字＋提示）。RTS 的「單位被打斷後能續做、投入可放棄」是基本盤，新增任何會綁住單位的指令都要同時想：打斷後怎麼續、能不能取消。測試 `test-site.mjs`。
**10/01 研發（R&D）**：計畫書 `~/sf-work/fog-rts/PLAN-research.md`（Howard 說「都加」→ 全做）。研發中心 `lab`（6 研究位、`RANK=[1,.8,.64,.5,.4,.3]` 遞減＝人月神話、研究員不採礦）、`TECH` 8 條專案（流程改善×3／CI/CD×2／自動化測試／程式碼審查降債息／Onboarding／平台化架構／重構可重複／市場調研）、效果走全域乘數（speedMult/mineMult/debtGenMult/debtK/commsSupply/archPower…），面板 `#tech`（非 modal，教學可聚光）含即時回本估算；第 4 關 `82-m4.js`（11 步暫停式教學，過關＝流程改善 II 做完且產出回到起點 90%，結算比「人·秒」vs 1 人單打）；自由對戰開放＋老闆「產出怎麼掉了？」指令＋四格表風險「研發投入中」。測試 `diag-rnd*.mjs`（純模擬）、`test-lab.mjs`、`play-m4.mjs good|bad`、`test-rnd-dp.mjs`。
**研發踩坑**：① 選著工程師時左鍵點研發中心＝派駐（與點工地同規則），教學要「選取」得自動選好；② 新增建造按鈕會改變後面按鈕的熱鍵（E 從開發小隊變研發中心），測試腳本要用按鈕名稱找鍵；③ 手機版指令卡列數會變（工程師 8 顆＝2 列、空格要 display:none），底部元件要用 JS 量高度寫 `--stack/--brh` 變數堆疊，別寫死 bottom；④ 面板每幀全量重繪會讓點擊失敗，簽章只放離散狀態、進度條用局部更新。
**10/01 第四視野：工程師（執行層）**：隧道視野 `ENG_SIGHT=3.4`、鍵 4、資源列/目標/頻寬全隱藏（CSS `#hud.r-eng`）、面板只有任務/收到的指令（無原因）/這趟帶回/視線內/「我不知道」清單；唯一向上動作「回報：這附近很難改」＝`cmdEngReport` 讓腳邊債塊 `reveal` 60s＋PM 畫面冒「!」（冷卻 20s；`debtVisible(w,d)` 取代到處的 `w.detected`）；四格表「技術債」風險在有回報時也能標；結算 swap 多「工程師當時看到的」；M3 教學多 3 步；劇場第 4 欄（fork 做，四欄對齊表）。決策點 2 的隱形債改成散 6 塊、目標係數 .47（純模擬校：idle 必輸、慢半拍仍過）。
**快捷鍵**：Howard 要求不分大小寫 → 一律用 `e.code`（KeyQ/DigitN）轉小寫，其餘用 e.key；ctrl/meta/alt 不攔。劇場自己的 keydown 也要同樣處理。
**規格書（tool 180）10/01 更新到 v5**：`update-spec.py` 以 `backup/spec-server-index.html` 為底做逐段替換（四層視野、研發、人設實作狀況、關卡對照、決議紀錄、第 12 節重寫、附錄實作值），產出 `spec-new.html` → `report.py update 180 --html spec-new.html --summary …`（只送有給的欄位，日期/分類不會被改）。**更新規格書要以伺服器乾淨版為底，公開版多 ~8KB 平台注入。**
**分類**：10/01 發現 181／hub 94／打字學堂 的分類已是 Education(11)，不是我改的（Howard 自己調的），別改回 Games。
**測試**：`play-free.mjs`（真實輸入打整場）、`fp-sim.mjs`（4 人設×idle/ok 純模擬）、`qa-menu.mjs`、`live2.mjs`（公開網址）。

**10/19 v6「市場戰爭」（Howard：「可玩性跟觀賞性本質上的提升」）**：`25-war.js` 交戰＋對手 AI（預算／生產／守備／偵察／出兵／反攻，參數在 `PERSONAS[].ai`；人設＝行為規則）、`26-auto.js` PM 自動駕駛（觀戰＋平衡基準）、`88-director.js` 觀戰導播（字幕講「PM 看不到什麼」、自動換位子、`quietDP/autoWarn/quietResolve`、標題頁背景＝AI 對打）、F1 `31-music.js`＋SFX(name,{pan,vol})、F2 `87-stats.js` 賽後曲線（monkeypatch，吃 `unitDied/wave/dpResolved`、`w.rival.army`、`w.stats`）。難度三檔 `DIFF`。平衡腳本 `war-sim.mjs <diff> <seeds>`；UI 測試 `v6-shot/v6-fight/v6-end/v6-live-spec.mjs`。備份 `backup/v5-server-index.html`、`spec-v5-server-index.html`、`tool180-record-v5.json`；規格書用 `update-spec-v6.py`。
**v6 踩坑**：① 新單位被打時 hp 還沒初始化 → NaN＝打不死（用 `initHp`）② 對手出口靠近企業據點會被守軍堵門 → 出口改東側＋基地護城河火力 ③ QUIBI 掉血被回血抵銷 → 燒錢中不回血 ④ 手機觀戰列被平台注入的 ToolHub／♥ 蓋住 → 底部元件桌機 right:104px、手機 bottom:56px（跟 #br 同規則）⑤ zsh 迴圈 `node $t` 不分字（要 `${=t}`），別誤判測試壞掉。

**還沒做**：對手 AI 只有 4 個人設（規格 7 個；缺 Kodak/Blockbuster/Instagram 盟友）、重播、邊際遞減採集（Brooks）、真人試玩回饋（音效只驗證無錯誤，沒人聽過）、自由對戰難度只用 bot 驗證（合理打法四人設皆能中段拿下多數據點；QUIBI 前 4:30 守不住）。

相關：[[reference-toolhub-publish]]、[[feedback-report-means-publish-toolhub]]

## 併自舊庫：project_pm_rts_fogofwar（2026-11-14 併入，內文未改寫）
出處：created 2026-09-06T19:20:03.041Z｜updated 2026-09-08T19:14:08.670Z｜model claude-sonnet-5｜machine mac-private｜source `~/.claude/projects/-Users-howard/memory/project_pm_rts_fogofwar.md`

《戰爭迷霧》星海爭霸式 PM 教材 — 規劃書 t180@hub90 + 可玩遊戲 t181@hub94 皆已上線；第 7 關 MAX-737 仍待 Howard 拍板

## 戰爭迷霧：星海爭霸式的專案管理教材（2026-09-05 規劃書 + 遊戲同日上線）

- **規劃書** tool **180** uuid `4853de0b-d04c-492e-861c-729b75a8c3ff`（hub90）— `tech-brief` 版型自訂深色 hero；封面模式 `make_cover.py rts`
- **可玩遊戲** tool **181** uuid `a92c8cad-e1f6-4ffe-8fc8-7a3c5a63743b`（**hub94 遊戲學習合集**）— 封面模式 `make_cover.py fogwar`
- 皆未鎖（無個資無內網資訊）。原始碼在該次 scratchpad `fogwar/src/*.js` + `build.py`（8 個模組串成單檔 143KB dist.html）；⚠️scratchpad 會被清，要保留得另外歸檔。

### 核心設計（一句話）
把戰爭迷霧從「對敵方」改成**也對自己人**：老闆／主管／PM 指揮同一支軍隊，看到的地圖不同。
- **軌道層(老闆)**：4 個聚合數字 + **敵方比己方細節還清楚**（市場報告不經內部美化管線）+ 獨有跑道倒數
- **艦橋層(主管)**：聚合指標 + 唯一能看雙邊對比曲線；翻譯責任全在他
- **地面層(PM)**：己方全知 + 敵方只有帶時戳的偵察快照；唯一看得到技術債的層

### 三個刻意偏離星海之處
1. 已上線功能**持續吃錢**（0.04 ●/s + 1 ▤）→ 16 個功能 ≈ 一個工程師的全部產出；有「下架」指令
2. 隱形單位改成**你自己趕工生出來的技術債**：後果公開（產出變慢）、原因隱形（要 detector）
3. 第四資源 **信任 ♥**：未達成 −12、**事前預警只 −4**（零成本止血）；<30 觸發微管理死亡螺旋（每 30s 凍結 5s）

### 架構
四層：Command → Simulation(唯一真相, 100ms tick, 決定論) → **Perception `project(world, role, knowledge)` 純函數** → Presentation 三視野。
決定論 → replay <10KB → **多視角重播**（同一局換視野重看）＝教材殺手鐧，第 4 關完全建立在它上面。
禁 `Date.now()`/`Math.random()`/超越函數進模擬層（跨引擎重播同步），關鍵路徑用整數 1/1000。

### 7 個真實案例改寫成 AI 行為規格
ESPOO-2007(Nokia,威脅評估對新單位權重0.2)／QUIBI-1750(資源3×但零偵察,5分鐘後崩)／REDMOND-EDU(Teams,兵差20%但菌毯3×且免費附著)／ROCHESTER-75(Kodak,科技滿格但生產佇列永遠空)／DALLAS-9000(Blockbuster,第3季規則變建築全變負債)／NEIHU-884(momo,60%資源投升級,第9分鐘反超)／BURBN-13(Instagram,盟友示範主動下架80%)。
第 7 關 MAX-737(Boeing)特殊處理：**不計分、無勝利結局、不能重玩**。

⚠️**敏感內容決策，Howard 尚未拍板，不要自己決定**：第 7 關「MAX-737」提案是直接取材真實的 Boeing 737 MAX MCAS 空難（2018 Lion Air 610＋2019 Ethiopian Airlines ET302，共 346 死）。桌上有三個選項：(A) 照原案直接用真實案例（這是 Claude 一開始的建議方向）(B) 整關跳過不做 (C) 改用虛構化案例代替。這需要 Howard 明確拍板才能動工——下次提到本專案要先確認他選哪個，不要預設答案。

### ⭐ v2：劇場模式（2026-09-05 當日 Howard 回饋後補上）
Howard 看完第一版的回饋＝**「遊戲性有點差、美術差強人意、我以為會看到 3D、結果都是字」**，真正要的是
**可以直接播的教學模式＋可以開關大家的視野＋故意設計的情境＋提供思路活路**。這個回饋是對的：原版重心放在「打得贏嗎」，教材真正要解的是「看得懂嗎」。補上：
1. **地圖改等角(isometric)立體沙盤** — 建築有高度側面、據點有台座光柱、霧逐格鋪斜線、戰力對比畫成台座前緣長條。仍是 Canvas 2D，**沒有引入任何 3D 函式庫**
2. **劇場模式**（主選單預設分頁）6 情境 × 5 步，旁白＋可自動播放：加人／為什麼還沒好／競品上線了／進企業市場／維運吃掉一切／每場都贏卻掉市佔
3. **視野圖層開關** 3 個 checkbox（老闆/主管/PM）。⭐**關掉 PM 層 → 整張地圖淡出剩四張綠卡**，這一格比任何文字有說服力；另有「三畫面並排」
4. 每情境結尾 **3 條活路 + 各自代價**（不給出路的教材只會製造無力感）
主選單分兩頁籤：劇場·先看懂（預設）／關卡·再上手。單檔 143KB → 187KB。

✅**v2 已重做完成並確認上線**：等角渲染＋劇場模式＋視野開關＋三活路結局已全數送出並驗證線上生效（tool181 現況＝Canvas 等角投影地圖＋劇場模式 6 情境＋三層視野開關），不再是「完成度未確認」的半成品。ToolHub 單檔限制下做不到真 3D（Three.js 那類 WebGL 引擎），Canvas 手繪等角投影是在此限制下選定的替代方案，不是妥協半吊子。

### 已實作（M1–M4 一次做完）
7 關＝6 教學（供給線／開場／看不見的東西／四格表★／減法／地圖在變色）＋自由對戰。Canvas 2D、SoA、無框架、Vite 不用，`build.py` 直接串檔。
**★ 老闆 AI 的整份輸入就是 `const v = project(w,'orbit')` 一行**；渲染器只吃 GroundView 所以畫不出視野裡沒有的東西；切到別層時兩側 PM 面板壓暗＋蓋「這一層沒有這一欄」。

### 實作階段的 5 處校正（規劃書第 12 節已補記）
1. QA/SRE 拿掉專才需求（●75 ◆0）— 原本三層依賴，玩家還沒看到債就輸了
2. 維運改**超線性** ×(1+n/30) — 線性的話後期可無限堆功能，「減法」課消失
3. 協作制度 `100+45×已有`、需求池 `400+130×已有` — 固定價會讓無腦鋪管理層變最優解
4. AI 新增 `react` 屬性（QUIBI/ROCHESTER 不回頭搶）— 讓人設變成可推理的線索而非難度旋鈕
5. 第 4 關過關條件加上「有效預警 ≥2」— 只看信任會讓玩家靠運氣過關、沒練到動作

### ⚠️ 仍待 Howard 拍板 / 未做
- **第 7 關 MAX-737（Boeing 346 人）做不做** — 兩個版本（A 含入真實案例／B 整關跳過）皆已做出來備選，但 Howard 仍未拍板選哪個定案上線，維持原本三選一（A照做/B跳過/C改虛構，C 尚未做）待決狀態，不要自己選
- 三人連線、重播拖曳定位、音效、**真正的 3D（目前是 Canvas 2D 手繪等角投影，不是 WebGL）**
- ⚠️機器人實測：**每秒完美重新調度戰力的玩家能穩定贏下自由對戰**（人手辦不到，體感會難得多）；若 Howard 說太簡單那是真的

### 切版/實作踩到的坑（可複用）
- `.hstats div` 這種**不加 `>` 的後代選擇器**會同時命中內層 div → 數字塊被灌 padding、多長邊框
- 手機版用 grid + `min-height:0` 的面板會被**壓縮到比內容矮**（auto track 分配容器高度）→ 改 `display:flex; flex-direction:column`
- 面板每 180ms 整塊 `innerHTML` 重建 → 按鈕在手指底下被抽走，Playwright 連點 5 次只成功 3 次。改成**結構有 signature 才重建、數字就地更新、disabled 每幀切**
- `.modal` append 在 `document.body`，換 `#app.innerHTML` 不會清掉 → 結算頁被舊 modal 蓋住點不到
- ⚠️**CSS 特異性**：`#cv{height:100%}`（ID）會蓋掉 media query 裡的 `.th-stage canvas{height:190px}`（class）→ 手機版畫布不縮。媒體查詢裡也要用 ID 才蓋得過
- 浮動資訊晶片會互相重疊 → 寫了 `deCollide()` 沿「重疊較小的軸」做分離鬆弛（純 CSS 做不到）
- 重播時 `UI.setView` 會觸發 `pause(true)` → 重播不動

### 流程教訓：計畫好的暫停點也要提早檢查
規劃書原本就設計了自我暫停點（先做完 M1：三層視野＋重播，做完先暫停評估再繼續，目的是避免方向錯了還一直往下蓋），但這個風險還是發生了——第一版文字量過重被 Howard 打回票，等於暫停點設得不夠早。**教訓**：大型創意/探索型專案，出 MVP 就該找回饋再繼續，即使已經有計畫的暫停點，也要比原計畫更早 check in。

相關：[[project_toolhub_report_hub]]、[[feedback-report-means-publish-toolhub]]、[[feedback-delivery-and-reports]]

### 索引原註（2026-11-13 自 MEMORY.md 移入，原文未改）
- 星海式三層視野+技術債+信任螺旋；規劃書t180@hub90+遊戲t181@hub94；✅首版被嫌後已重做上線；⚠️第7關MAX-737(真實空難案例)A/B兩版皆做出,採哪版待Howard拍板(A照做/B跳過/C改虛構)
