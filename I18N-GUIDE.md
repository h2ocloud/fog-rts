# Fog of War（戰爭迷霧）英文化指南 — 給翻譯 subagent

專案：`~/sf-work/fog-en/`。原始碼 `src/*.js` 由 `build.mjs` 依檔名排序串接成單一 `<script>`（非 module，全部共用全域）。原版備份在 `orig/`，**不要動 orig/**。

## 機制（已寫好在 `src/00-util.js`，最先載入）
- `LANG`：`'zh'` 或 `'en'`（頁面載入時決定，執行期間不變；切語言＝重載）。
- `EN`：布林，`LANG === 'en'`。
- `L(zh, en)`：繁中模式回傳 `zh`（原字串，原封不動），英文模式回傳 `en`。

## 規則（硬性）
1. **繁中行為必須與原版一字不差**：只把顯示字串包成 `L('原中文', 'English')`，原中文一個字都不能改（含全形標點、空白）。不要重排、不要改邏輯、不要改數值。
2. **含插值的 template literal**：整段包起來，兩邊各自插值，例如
   `` `研發完成：${d.name}` `` → `` L(`研發完成：${d.name}`, `Research complete: ${d.name}`) ``。
   兩個參數都會被求值，所以插值內不可有副作用（一般沒有；若有，先存到變數）。
   長 HTML 片段只需包住含中文的部分，不必整段複製；但要確保英文語序自然（必要時整句包）。
3. **只翻顯示文字**：程式碼註解（`//`、`/* */`）保留中文不用翻。物件 key、id、CSS class、事件名不要動。若發現中文字串被拿來做比較／當 key／`replace()`，保留原邏輯，只在顯示處翻譯（或用 `L()` 讓兩邊各用各的字串，確保英文模式邏輯也成立）。
4. **英文要自然、口語、像遊戲 UI**，不是逐字硬翻。保留原文的語氣與教學重點（例如老闆的台詞要像老闆講話）。專有名詞用下方術語表，全專案一致。英文通常比中文長，UI 按鈕／標籤請精簡（按鈕 1–3 個字，狀態列短句）。
5. **HTML 結構保留**：`<b>`、`<em>`、`<br>`、`<span class=...>`、`<kbd>` 等標籤在英文版也要保留在對應位置。全形標點（，。：「」（）、）在英文版換成英文標點（, . : " " ( )）。中文的「　」全形空白在英文版用一般空白或 ` · `。
6. **數字單位**：`秒`→`s`、`格`→`tiles`、`人`→依語境（people / engineers）、`點`（債務點數）→`pts`/`points`、`座`（建築）→ 直接用數量。單複數要對（必要時 `n === 1 ? 'engineer' : 'engineers'`）。
7. **canvas 文字**（`fillText`）也要翻，且注意長度（英文寬，可能需縮字或縮短）。
8. 每改完一個檔案跑 `node --check src/<檔名>`（語法）。**不要**跑 `build.mjs`（會跟其他人搶寫 dist/）。最後用下方指令確認自己負責的檔案裡，**所有含中文的字串都在 `L(` 的第一個參數裡或在註解裡**：
   `perl -CSD -ne 'print "$.: $_" if /\p{Han}/ && !/^\s*(\/\/|\/\*|\*)/' src/<檔名>` 逐行人工確認。
9. **不要開瀏覽器／Playwright**（8GB RAM 機器、多人同時跑）；QA 由主線程統一做。
10. 只改分派給你的檔案。完成後回報：改了哪些檔、有沒有發現中文字串被當邏輯用的地方（以及怎麼處理）、你不確定的翻譯。

## 術語表（全專案統一）
| 中文 | English |
|---|---|
| 戰爭迷霧 | Fog of War |
| 專案管理即時戰略 | project-management RTS / a real-time strategy game about project management |
| 預算（● 資源）| Budget (●) |
| 管理頻寬（▤，Supply）| Bandwidth (▤) — 首次說明可寫 "management bandwidth" |
| 人才（◆，劇場）| Talent (◆) |
| 技術債 | tech debt |
| 信任 | Trust |
| 研發 / 研發面板 | R&D / R&D panel |
| 研究員 | researcher |
| 工程師 | Engineer（單位名大寫）/ engineers |
| 功能（作戰單位）| Feature / Features |
| 平台功能 | Platform Feature |
| 需求池（主基地）| Backlog Hub（口語可稱 base / HQ）|
| 協作制度 | Comms Layer |
| 監控中心 | Observability |
| 開發小隊 | Dev Squad |
| 平台組 | Platform Team |
| 研發中心 | R&D Lab |
| 老闆 / 主管 / PM / 工程師（四層視野）| Boss / Manager / PM / Engineer |
| 軌道層 / 艦橋層 / 地面層 / 執行層 | Orbit layer / Bridge layer / Ground layer / Execution layer |
| 四層視野 / 三層視野 | four views / three views（the four layers of vision）|
| 迷霧也罩自己人 | the fog covers your own side too |
| 市佔 | market share |
| 據點 / 市場據點 | market zone / zone |
| 利基市場 / 大眾市場·南 / 大眾市場·北 / 企業客戶 | Niche Market / Mass Market · S / Mass Market · N / Enterprise |
| 對手 / 競品 | Rival / rival（competitor 也可）|
| 我方 | us / our side（標籤用 "Ours"）|
| 戰力 | power |
| 決策點 | decision point |
| 四格表 | 4-box report |
| 回報老闆 | report to the Boss |
| 風險燈 綠/黃/紅 | risk light green / amber / red |
| 換位子 | switch seats（"see it from their seat"）|
| 事前預警 | early warning / flag it early |
| 節奏 正常／加速／硬趕 | pace Normal / Fast / Crunch |
| 趕工 | rushing / crunch |
| 維運 | upkeep |
| 事故 / 事故停擺 | incident / incident halt |
| 還債 / 卡點 | pay down debt / blocker |
| 礦點 / 採礦 / 採集 | ore field / mine / mining |
| 集合點 | rally point |
| 攻擊移動 | attack-move |
| 停工 / 建造中 | stalled / building |
| 閒置工人 | idle engineer |
| 人月神話 | The Mythical Man-Month |
| 機會成本 | opportunity cost |
| 遞減 | diminishing returns |
| 劇場模式 / 劇場 | Theater mode / Theater |
| 自由對戰・市場戰爭 | Free Play · Market War |
| 觀戰 · AI 對打 | Spectate · AI vs AI |
| 對手強度 輕鬆／標準／困難 | Rival strength Easy / Normal / Hard |
| 三條活路 | three ways out |
| 旁白 | narration |
| 關卡 / 第 N 關 | mission / Mission N |
| 已通關 | cleared |
| NT$ | 保留 NT$ |
| Supply Block / Detector / Tech Debt 等原文英文 | 保留 |
