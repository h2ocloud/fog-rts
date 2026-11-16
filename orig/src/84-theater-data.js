/* ── 劇場模式資料 ─────────────────────────────────────────
   文案（旁白／老闆指令／三條活路）原文取自舊版；狀態欄位（S）為新版補上，卡片與地圖共用同一份數字 */
const THEATER_NAMES = {"niche":"利基市場","massS":"大眾市場·南","massN":"大眾市場·北","ent":"企業客戶"};
const THEATER_SCENES = [
 {
  "n": 0,
  "id": "s1",
  "kicker": "SCENE 01",
  "title": "「人太少了，加人」",
  "sub": "老闆看不到管理頻寬這一格",
  "hook": "錢夠、人少 → 加人。這個推論在他的畫面上完全正確。",
  "steps": [
   {
    "layers": {
     "o": 0,
     "b": 0,
     "g": 1,
     "e": 0
    },
    "say": "先看 <b>PM 的畫面</b>。十八個人、三個佇列排著、頻寬 <b>26 / 28</b>。<em>再進兩個人，生產線就整條停住。</em>",
    "order": null,
    "mode": null,
    "act": null
   },
   {
    "layers": {
     "o": 1,
     "b": 0,
     "g": 0,
     "e": 0
    },
    "say": "現在把 PM 這一層關掉 —— 這就是<b>老闆真正看到的東西</b>。四張卡，沒有頻寬、沒有佇列、沒有技術債。",
    "order": null,
    "mode": null,
    "act": null
   },
   {
    "layers": {
     "o": 1,
     "b": 0,
     "g": 0,
     "e": 0
    },
    "say": "他看到現金 <b>1402</b>、人數 <b>18</b>、綠燈。<em>錢夠就該加人</em> —— 在這張畫面上，這個推論沒有任何毛病。",
    "order": "人太少了，這季把團隊擴到 24 人。",
    "mode": null,
    "act": null
   },
   {
    "layers": {
     "o": 1,
     "b": 1,
     "g": 1,
     "e": 0
    },
    "say": "兩層一起打開。<b>差距不在能力，在欄位。</b>右邊那些琥珀色的資訊，從來沒有出現在他的畫面上過。",
    "order": null,
    "mode": null,
    "act": null
   },
   {
    "layers": {
     "o": 1,
     "b": 1,
     "g": 1,
     "e": 1
    },
    "say": "三欄並排：老闆四個數字、主管四個聚合指標、PM 二十幾格細節。<b>唯一能把兩端接起來的，是中間那個人願意翻譯。</b>",
    "order": null,
    "mode": "triple",
    "act": null,
    "addSay": "第四欄是工程師：他只知道手上那張票 —— 連「為什麼要加人」都沒人跟他說。"
   }
  ],
  "ways": [
   {
    "c": "a",
    "t": "路線 A · 先蓋容量",
    "h": "先做，但順序反過來",
    "b": "答應擴編，但把第一週的預算<b>先花在協作制度上</b>（+8 ▤）。人進來的時候有位子坐，第二週的產出才真的會上升。",
    "cost": "代價：第一週的交付數字會更難看 —— 你得先講好這件事。"
   },
   {
    "c": "b2",
    "t": "路線 B · 事前預警",
    "h": "把「頻寬」翻譯成他看得懂的話",
    "b": "在決策點的狀態表標紅：<b>「現在加人，前三週產出不會增加」</b>。不要講頻寬、不要講 supply block —— 講他畫面上有的東西：時間與數字。",
    "cost": "代價：零。這是全遊戲唯一不花資源就能止血的動作（−12 變 −4）。"
   },
   {
    "c": "c",
    "t": "路線 C · 減法換空間",
    "h": "不加人，先騰出位子",
    "b": "下架幾個低價值功能，把頻寬讓給新人。<b>24 人這個數字可以達成，只是達成的方式不是招募</b>。",
    "cost": "代價：要承認某些東西當初做錯了 —— 這是全遊戲最難按的按鈕。"
   }
  ],
  "map": {
   "comms": 2,
   "workers": 14,
   "obs": true,
   "debt": 6,
   "feats": 5
  },
  "S": {
   "cash": 1402,
   "cashTrend": 1,
   "talent": 40,
   "milestone": "Q4 產品發表",
   "light": "green",
   "share": 50,
   "runway": null,
   "headline": null,
   "eco": 84,
   "ourArmy": 26,
   "emArmy": 24,
   "hist": {
    "our": 20,
    "em": 18
   },
   "shipped": 5,
   "crew": {
    "budget": 11,
    "talent": 3,
    "build": 2,
    "repay": 0,
    "scout": 1,
    "idle": 0,
    "qa": 1
   },
   "bw": [
    26,
    28
   ],
   "queue": 3,
   "debtVisible": true,
   "debt": 6,
   "feats": 5,
   "net": null,
   "platform": 0,
   "nodes": {
    "niche": {
     "owner": "us",
     "our": 24,
     "em": 0,
     "snapAge": null
    },
    "massS": {
     "owner": "us",
     "our": 30,
     "em": 12,
     "snapAge": 45
    },
    "massN": {
     "owner": "em",
     "our": 0,
     "em": 20,
     "snapAge": 60
    },
    "ent": {
     "owner": "none",
     "our": 0,
     "em": 0,
     "snapAge": null
    }
   },
   "eng": {
    "tix": 3,
    "tickets": "3 張排隊中",
    "order": "多接一點，新人會來",
    "feel": "工位都坐滿了，我連插座都要排隊",
    "peers": 6,
    "blockers": 1,
    "sightNote": "插座與工位",
    "say": "新人是誰帶？沒人跟我說。我手上三張票都還沒做完。"
   }
  },
  "patches": [
   null,
   null,
   null,
   null,
   null
  ],
  "deferred": {}
 },
 {
  "n": 1,
  "id": "s2",
  "kicker": "SCENE 02",
  "title": "「為什麼還沒好？」",
  "sub": "三層都看到產出在掉，沒有一層看得到原因",
  "hook": "人越加越多，產出卻一路往下。這一關的答案不是紀律，是可觀測性。",
  "steps": [
   {
    "layers": {
     "o": 0,
     "b": 1,
     "g": 0,
     "e": 0
    },
    "say": "<b>主管層</b>先講話：經濟效率掉到 53%、戰力被對手拉開。他看得到<em>症狀</em>。",
    "order": null,
    "mode": null,
    "act": null
   },
   {
    "layers": {
     "o": 1,
     "b": 0,
     "g": 0,
     "e": 0
    },
    "say": "<b>老闆層</b>：里程碑黃燈、現金在掉。他問的問題完全合理 —— 因為他畫面上只有結果，沒有過程。",
    "order": "進度落後兩週了，為什麼還沒好？",
    "mode": null,
    "act": null
   },
   {
    "layers": {
     "o": 0,
     "b": 0,
     "g": 1,
     "e": 1
    },
    "say": "打開 <b>PM 層</b>。你會以為終於有答案了。<em>但這個團隊沒有 QA、沒有監控中心 —— 連 PM 都看不到原因。</em>",
    "order": null,
    "mode": null,
    "act": null,
    "engNote": "PM 沒有偵測器，所以看不到的 —— 他每天都在踩。只是沒人問。"
   },
   {
    "layers": {
     "o": 0,
     "b": 0,
     "g": 1,
     "e": 0
    },
    "say": "花 ●75 買一個 QA。<b>十七個紅方塊立刻出現在你的基地裡。</b>它們一直都在，只是沒有人看得到。",
    "order": null,
    "mode": null,
    "act": "qa"
   },
   {
    "layers": {
     "o": 1,
     "b": 1,
     "g": 1,
     "e": 1
    },
    "say": "算一次帳：17 點債 = 產出效率 −20% + 每秒漏 0.51。<b>還清它只要 170 個工程師·秒，大約 36 秒回本。</b><em>還債從來都是划算的 —— 問題是你的畫面上沒有那個數字。</em>",
    "order": null,
    "mode": null,
    "act": null,
    "addSay": "再多開一層：工程師。他早就知道慢在哪，只是從來沒人問過。"
   }
  ],
  "ways": [
   {
    "c": "a",
    "t": "路線 A · 先買眼睛",
    "h": "偵測器優先於一切",
    "b": "在還沒有任何偵測能力的時候，<b>不要先猜原因</b>。QA / SRE 只要 ●75，比你亂改三個禮拜便宜太多。",
    "cost": "代價：這筆錢不產出任何功能，是全公司最難爭取的預算 —— 所以要拿數字去要。"
   },
   {
    "c": "b2",
    "t": "路線 B · 把還債排進進度",
    "h": "不要用「技術債」這三個字",
    "b": "對老闆講：<b>「這兩週投三個人，之後每週多出七個人的產能」</b>。這是同一件事，但它落在他畫面上有的欄位裡（人、時間、產能）。",
    "cost": "代價：你得先量得出來。所以還是要先有偵測器。"
   },
   {
    "c": "c",
    "t": "路線 C · 停止流血",
    "h": "先別再趕工",
    "b": "把趕工檔位切回正常。<b>加速一級省 28% 時間、+2 債；加速二級再省 17%、債翻 2.5 倍</b> —— 第二段永遠不值得。",
    "cost": "代價：這一季的交付數字會少一到兩個。要在決策點先講。"
   }
  ],
  "map": {
   "comms": 3,
   "workers": 14,
   "obs": false,
   "debt": 17,
   "feats": 9
  },
  "S": {
   "cash": 640,
   "cashTrend": -1,
   "talent": 20,
   "milestone": "Q3 交付（已落後兩週）",
   "light": "amber",
   "share": 44,
   "runway": 5,
   "headline": null,
   "eco": 53,
   "ourArmy": 20,
   "emArmy": 32,
   "hist": {
    "our": 30,
    "em": 22
   },
   "shipped": 9,
   "crew": {
    "budget": 14,
    "talent": 0,
    "build": 2,
    "repay": 0,
    "scout": 1,
    "idle": 0,
    "qa": 0
   },
   "bw": [
    31,
    36
   ],
   "queue": 2,
   "debtVisible": false,
   "debt": 17,
   "feats": 9,
   "net": null,
   "platform": 0,
   "nodes": {
    "niche": {
     "owner": "us",
     "our": 20,
     "em": 10,
     "snapAge": 30
    },
    "massS": {
     "owner": "em",
     "our": 14,
     "em": 32,
     "snapAge": 30
    },
    "massN": {
     "owner": "none",
     "our": 0,
     "em": 0,
     "snapAge": null
    },
    "ent": {
     "owner": "none",
     "our": 0,
     "em": 0,
     "snapAge": null
    }
   },
   "eng": {
    "tix": 2,
    "tickets": "2 張（都標「今天」）",
    "order": "這張今天要好",
    "feel": "每改一個檔案都要先繞過一堆趕工留下的暫解，每張票多花三成",
    "peers": 5,
    "blockers": 7,
    "sightNote": "趕工留下的暫解",
    "slow": 30,
    "say": "我早就知道慢在哪——可是沒人問過我，我也不知道這叫「技術債」。"
   }
  },
  "patches": [
   null,
   null,
   null,
   {
    "cash": 565,
    "crew": {
     "qa": 1
    },
    "debtVisible": true
   },
   null
  ],
  "deferred": {}
 },
 {
  "n": 2,
  "id": "s3",
  "kicker": "SCENE 03",
  "title": "「人家做到了，為什麼我們沒有」",
  "sub": "兩個人講的不是同一件事，只是差了四十七秒",
  "hook": "老闆的競品情報是銳利的、有結論的；你的是四十七秒前的快照。",
  "steps": [
   {
    "layers": {
     "o": 1,
     "b": 0,
     "g": 0,
     "e": 0
    },
    "say": "<b>老闆層</b>：一張很清楚的競品卡片 ——「競品已上線『即時協作』」。<em>來源是市場報告，沒有經過任何內部美化。</em>",
    "order": null,
    "mode": null,
    "act": null
   },
   {
    "layers": {
     "o": 0,
     "b": 0,
     "g": 1,
     "e": 0
    },
    "say": "<b>PM 層</b>同一個地方：大眾市場的偵察快照是 <b>−470 秒</b>前的，戰力寫著 26。<em>現在它其實是 41。</em>",
    "order": null,
    "mode": null,
    "act": null
   },
   {
    "layers": {
     "o": 1,
     "b": 1,
     "g": 1,
     "e": 0
    },
    "say": "兩層疊在一起看：<b>他手上的資訊比你新，你手上的資訊比他細。</b>吵起來的時候，兩邊都是對的。",
    "order": "競品都上線了，我們的進度呢？",
    "mode": null,
    "act": null
   },
   {
    "layers": {
     "o": 1,
     "b": 1,
     "g": 1,
     "e": 0
    },
    "say": "派兩個人去偵察。快照更新成 <b>41</b>。<em>成本是兩個人的採集時間 —— 這就是調研預算最難爭取的原因：它不產出，它只是讓你不要瞎。</em>",
    "order": null,
    "mode": null,
    "act": "scout"
   },
   {
    "layers": {
     "o": 1,
     "b": 1,
     "g": 1,
     "e": 1
    },
    "say": "這一格才是重點：<b>老闆對競品比對自己清楚</b>。因為競品的資訊從外面直接進來，而你的資訊要穿過三層向上匯報。",
    "order": null,
    "mode": "triple",
    "act": null,
    "addSay": "第四欄是工程師：競品、爭論、時戳，他一個都沒有。他只負責把票做完。"
   }
  ],
  "ways": [
   {
    "c": "a",
    "t": "路線 A · 講時間差",
    "h": "先對齊時間，再對齊事實",
    "b": "「你看到的是他們<b>上禮拜</b>發布的，我手上的是<b>今天</b>的量測。」<em>把兩份資訊的時戳擺在一起</em>，八成的爭執會當場消失。",
    "cost": "代價：你得真的有時戳。所以偵察不能停。"
   },
   {
    "c": "b2",
    "t": "路線 B · 用他的來源反推",
    "h": "拿市場報告當校準基準",
    "b": "主動去讀他讀的那份市場報告，然後告訴他<b>那份報告沒說的部分</b>（對方燒了多少錢、跳過了什麼）。你不是反駁他，你是把他的圖補完。",
    "cost": "代價：要花時間讀對方的公開資料。但這是最便宜的一種偵察。"
   },
   {
    "c": "c",
    "t": "路線 C · 常態化偵察",
    "h": "把「更新快照」變成固定成本",
    "b": "固定留一到兩個人做市場與競品追蹤。<b>不是為了做出決定，是為了讓決策點上大家看到的是同一張圖。</b>",
    "cost": "代價：那一到兩個人的產出。看起來很貴，直到你算一次「打錯方向」的成本。"
   }
  ],
  "map": {
   "comms": 3,
   "workers": 14,
   "obs": true,
   "debt": 5,
   "feats": 7
  },
  "S": {
   "cash": 880,
   "cashTrend": 0,
   "talent": 55,
   "milestone": "Q4 產品發表",
   "light": "amber",
   "share": 46,
   "runway": 9,
   "headline": "競品已上線「即時協作」",
   "eco": 78,
   "ourArmy": 30,
   "emArmy": 41,
   "hist": {
    "our": 26,
    "em": 24
   },
   "shipped": 7,
   "crew": {
    "budget": 10,
    "talent": 3,
    "build": 1,
    "repay": 0,
    "scout": 0,
    "idle": 0,
    "qa": 1
   },
   "bw": [
    30,
    36
   ],
   "queue": 2,
   "debtVisible": true,
   "debt": 5,
   "feats": 7,
   "net": null,
   "platform": 1,
   "nodes": {
    "niche": {
     "owner": "us",
     "our": 20,
     "em": 22,
     "snapAge": 20
    },
    "massS": {
     "owner": "none",
     "our": 30,
     "em": 26,
     "snapAge": 470
    },
    "massN": {
     "owner": "em",
     "our": 0,
     "em": 26,
     "snapAge": 300
    },
    "ent": {
     "owner": "none",
     "our": 0,
     "em": 0,
     "snapAge": null
    }
   },
   "eng": {
    "tix": 1,
    "tickets": "1 張",
    "order": "照規格做",
    "feel": "競品？我不知道",
    "peers": 4,
    "blockers": 0,
    "sightNote": "",
    "say": "老闆跟 PM 在吵什麼？我只負責把這張票做完。"
   }
  },
  "patches": [
   null,
   null,
   null,
   {
    "crew": {
     "scout": 2,
     "budget": 8
    }
   },
   null
  ],
  "deferred": {
   "3": {
    "delay": 2600,
    "patch": {
     "nodes": {
      "massS": {
       "em": 41,
       "snapAge": 0
      }
     }
    },
    "fx": "massS"
   }
  }
 },
 {
  "n": 3,
  "id": "s4",
  "kicker": "SCENE 04",
  "title": "「這季也要進企業市場」",
  "sub": "前置條件不在他的畫面上",
  "hook": "不是他亂下指令，是「要先有平台功能」這件事在他的投影裡不存在。",
  "steps": [
   {
    "layers": {
     "o": 1,
     "b": 0,
     "g": 0,
     "e": 0
    },
    "say": "<b>老闆層</b>：競品動態＋市佔 17%＋董事會 D−7。<em>指令是這三個數字的必然結果。</em>",
    "order": "競品進企業客戶了，我們這季也要進去。",
    "mode": null,
    "act": null
   },
   {
    "layers": {
     "o": 0,
     "b": 0,
     "g": 1,
     "e": 0
    },
    "say": "<b>PM 層</b>：企業據點的門檻是戰力 30，<b>而且硬性要求至少一個平台功能</b>（合規／SLA／SSO）。<em>我們手上是 0 個。</em>",
    "order": null,
    "mode": null,
    "act": null
   },
   {
    "layers": {
     "o": 0,
     "b": 0,
     "g": 1,
     "e": 0
    },
    "say": "平台功能要 ●125 ◆50、32 秒，而且得先蓋平台組（●150 ◆100、60 秒）。<b>光是進場資格就要一個半月。</b>",
    "order": null,
    "mode": null,
    "act": null
   },
   {
    "layers": {
     "o": 1,
     "b": 1,
     "g": 1,
     "e": 0
    },
    "say": "這不是「做不做得到」的問題，是<b>他的畫面上沒有「前置條件」這種東西</b>。你不能用拒絕回應他，你要用<em>時間軸</em>回應他。",
    "order": null,
    "mode": null,
    "act": null
   },
   {
    "layers": {
     "o": 1,
     "b": 1,
     "g": 1,
     "e": 1
    },
    "say": "在決策點標紅「沒有平台功能，進不了企業市場」：<b>指令一樣要接，但未達成從 −12 變成 −4。</b><em>它不會讓事情早一天做完，但它是唯一零成本的動作。</em>",
    "order": null,
    "mode": null,
    "act": null,
    "addSay": "再多開一層：工程師。「為什麼是 SSO」—— 這句話從沒有人對他說過。"
   }
  ],
  "ways": [
   {
    "c": "a",
    "t": "路線 A · 接，但拆成兩段",
    "h": "把「這季進去」翻成「這季拿到資格」",
    "b": "本季交付<b>平台功能＋一個企業試點</b>，下季才談市佔。你給了他一個可以對董事會講的進度，也沒有承諾做不到的事。",
    "cost": "代價：大眾市場的推進會慢一拍，對手可能趁機拿走一個據點。"
   },
   {
    "c": "b2",
    "t": "路線 B · 給替代路徑",
    "h": "同樣的目標，更便宜的打法",
    "b": "「企業市場我們要一個半月；但同樣的營收，<b>大眾市場・南現在只要三週</b>。」提供替代方案，比單純說不有用一百倍。",
    "cost": "代價：你得先算過。沒算過的替代方案聽起來像藉口。"
   },
   {
    "c": "c",
    "t": "路線 C · 要資源換時間",
    "h": "接下來，但把代價講清楚",
    "b": "「可以這季進去，需要把兩個人從維運調過來 —— 代價是既有客戶的問題回應會變慢。<b>你選。</b>」把取捨還給有權做取捨的人。",
    "cost": "代價：如果他選了，你就真的要承擔那個後果。所以要先講清楚，不要事後才說。"
   }
  ],
  "map": {
   "comms": 3,
   "workers": 14,
   "obs": true,
   "debt": 9,
   "feats": 8
  },
  "S": {
   "cash": 520,
   "cashTrend": -1,
   "talent": 30,
   "milestone": "董事會 D−7",
   "light": "amber",
   "share": 17,
   "runway": 7,
   "headline": "競品宣布進入企業客戶市場",
   "eco": 72,
   "ourArmy": 28,
   "emArmy": 34,
   "hist": {
    "our": 22,
    "em": 24
   },
   "shipped": 8,
   "crew": {
    "budget": 12,
    "talent": 0,
    "build": 2,
    "repay": 1,
    "scout": 1,
    "idle": 0,
    "qa": 1
   },
   "bw": [
    30,
    36
   ],
   "queue": 2,
   "debtVisible": true,
   "debt": 9,
   "feats": 8,
   "net": null,
   "platform": 0,
   "platformNote": true,
   "nodes": {
    "niche": {
     "owner": "us",
     "our": 24,
     "em": 10,
     "snapAge": 20
    },
    "massS": {
     "owner": "none",
     "our": 20,
     "em": 20,
     "snapAge": 30
    },
    "massN": {
     "owner": "em",
     "our": 0,
     "em": 22,
     "snapAge": 60
    },
    "ent": {
     "owner": "em",
     "our": 12,
     "em": 34,
     "snapAge": 90,
     "thr": 30,
     "needPlatform": true
    }
   },
   "eng": {
    "tix": 2,
    "tickets": "SSO 相關 2 張",
    "order": "先把 SSO 做出來",
    "feel": "為什麼是 SSO？沒人解釋",
    "peers": 3,
    "blockers": 2,
    "sightNote": "SSO 前置沒人排",
    "say": "他們說要進企業客戶，可是平台那一塊還沒人排。我只看到我這張票。"
   }
  },
  "patches": [
   null,
   null,
   null,
   null,
   null
  ],
  "deferred": {}
 },
 {
  "n": 4,
  "id": "s5",
  "kicker": "SCENE 05",
  "title": "「維運太貴了，省點錢」",
  "sub": "二十二個上線功能，正在吃掉你的團隊",
  "hook": "功能越多，你的團隊越像在養舊東西，而這個轉變沒有人宣布過。",
  "steps": [
   {
    "layers": {
     "o": 0,
     "b": 0,
     "g": 1,
     "e": 0
    },
    "say": "<b>PM 層</b>：22 個上線功能、頻寬 <b>34 / 36</b>、維運每秒吃掉 1.52。<em>淨收已經是負的 —— 你在慢慢失血。</em>",
    "order": null,
    "mode": null,
    "act": null
   },
   {
    "layers": {
     "o": 0,
     "b": 0,
     "g": 1,
     "e": 0
    },
    "say": "每個功能佔 1 ▤ 並持續耗預算，而且<b>複雜度是乘的不是加的</b>（×1.73）。<em>十六個功能吃掉的，大約等於一個半工程師的全部產出。</em>",
    "order": null,
    "mode": null,
    "act": null
   },
   {
    "layers": {
     "o": 1,
     "b": 0,
     "g": 0,
     "e": 0
    },
    "say": "<b>老闆層</b>只看到現金 210 在往下掉、紅燈。他的指令方向是<b>對的</b> —— 只是「兩個」這個數字是猜的。",
    "order": "維運太貴了，這季砍掉兩個功能。",
    "mode": null,
    "act": null
   },
   {
    "layers": {
     "o": 1,
     "b": 1,
     "g": 1,
     "e": 0
    },
    "say": "下架 <b>8 個</b>。頻寬放出來、維運降下去、<em>淨收由負轉正</em>。真正難的不是知道該砍，是承認那些東西當初做錯了。",
    "order": null,
    "mode": null,
    "act": "sunset"
   },
   {
    "layers": {
     "o": 1,
     "b": 1,
     "g": 1,
     "e": 1
    },
    "say": "注意三欄的差別：老闆看到<b>現金止跌</b>、主管看到<b>經濟效率回升</b>、你看到<b>頻寬多出八格</b>。<em>同一個動作，三種語言。挑他聽得懂的那一種去講。</em>",
    "order": null,
    "mode": "triple",
    "act": null,
    "addSay": "第四欄是工程師：他知道哪些功能沒人用，可是沒有人問他。"
   }
  ],
  "ways": [
   {
    "c": "a",
    "t": "路線 A · 主動下架",
    "h": "在被要求之前就動手",
    "b": "定期盤點，把使用率最低的一批直接下線。<b>退款為零，但它立刻停止流血並釋放頻寬。</b><em>這是全遊戲最反直覺、也最值得練的按鈕。</em>",
    "cost": "代價：一定會有人（包括當初做的人）不高興。所以要拿數字，不要拿感覺。"
   },
   {
    "c": "b2",
    "t": "路線 B · 把複雜度講成一句話",
    "h": "「我們現在有一個半人在養舊東西」",
    "b": "不要講維運成本、不要講技術複雜度。<b>換算成人</b>：他的畫面上有「人數」這一格，你就把答案放進那一格。",
    "cost": "代價：要先算得出來。這也是為什麼要有可觀測性。"
   },
   {
    "c": "c",
    "t": "路線 C · 先關水龍頭",
    "h": "停止新增，比砍舊的容易談",
    "b": "如果砍不動，至少讓<b>新增的速度低於下架的速度</b>。方向對了，時間會幫你。",
    "cost": "代價：慢。而且在功能數還在成長的期間，你的頻寬會一直是緊的。"
   }
  ],
  "map": {
   "comms": 3,
   "workers": 12,
   "obs": true,
   "debt": 4,
   "feats": 22
  },
  "S": {
   "cash": 210,
   "cashTrend": -1,
   "talent": 12,
   "milestone": "季末現金",
   "light": "red",
   "share": 41,
   "runway": 3,
   "headline": null,
   "eco": 58,
   "ourArmy": 30,
   "emArmy": 24,
   "hist": {
    "our": 24,
    "em": 20
   },
   "shipped": 22,
   "crew": {
    "budget": 12,
    "talent": 0,
    "build": 0,
    "repay": 0,
    "scout": 1,
    "idle": 0,
    "qa": 1
   },
   "bw": [
    34,
    36
   ],
   "queue": 0,
   "debtVisible": true,
   "debt": 4,
   "feats": 22,
   "net": -0.22,
   "platform": 1,
   "nodes": {
    "niche": {
     "owner": "us",
     "our": 24,
     "em": 8,
     "snapAge": 30
    },
    "massS": {
     "owner": "em",
     "our": 16,
     "em": 24,
     "snapAge": 80
    },
    "massN": {
     "owner": "none",
     "our": 0,
     "em": 0,
     "snapAge": null
    },
    "ent": {
     "owner": "none",
     "our": 0,
     "em": 0,
     "snapAge": null
    }
   },
   "eng": {
    "tix": 5,
    "tickets": "修舊功能 5 張",
    "order": "這個 bug 今天修掉",
    "feel": "我一半時間在修舊功能，22 個功能我只熟 6 個",
    "peers": 6,
    "blockers": 4,
    "sightNote": "沒人敢動的舊模組",
    "say": "砍功能？我們早就想砍了——沒人問我哪些沒人用。"
   }
  },
  "patches": [
   null,
   null,
   null,
   {
    "feats": 14,
    "bw": [
     26,
     36
    ],
    "net": 0.48,
    "cashTrend": 0,
    "eco": 71,
    "light": "amber",
    "runway": 5
   },
   null
  ],
  "deferred": {}
 },
 {
  "n": 5,
  "id": "s6",
  "kicker": "SCENE 06",
  "title": "每一場都贏，市佔卻一直掉",
  "sub": "你打贏了所有遭遇戰，輸掉了地圖",
  "hook": "當對手的分發成本是零，你的產品優勢要多大才夠？先算這一題。",
  "steps": [
   {
    "layers": {
     "o": 0,
     "b": 0,
     "g": 1,
     "e": 0
    },
    "say": "<b>PM 層</b>：看每個據點的戰力條 —— 我方 50 對上對手 26。<em>單兵對決你贏兩倍。</em>",
    "order": null,
    "mode": null,
    "act": null
   },
   {
    "layers": {
     "o": 0,
     "b": 0,
     "g": 1,
     "e": 0
    },
    "say": "但整張地圖上，<b>三個據點是對手的</b>。而其中兩個<em>你根本沒有打過</em> —— 它們是被生態系直接吸收的。",
    "order": null,
    "mode": null,
    "act": null
   },
   {
    "layers": {
     "o": 0,
     "b": 1,
     "g": 0,
     "e": 0
    },
    "say": "<b>主管層</b>看得到那條交叉的曲線：我方戰力線平穩，對手線一路往上。<em>他看得到差距擴大，看不到差距是怎麼來的。</em>",
    "order": null,
    "mode": null,
    "act": null
   },
   {
    "layers": {
     "o": 1,
     "b": 0,
     "g": 0,
     "e": 0
    },
    "say": "<b>老闆層</b>只有一個數字：市佔 17%、紅燈。<em>他的問題非常合理，而三層加起來才拼得出答案。</em>",
    "order": "市佔從 50% 掉到 17%，發生什麼事？",
    "mode": null,
    "act": null
   },
   {
    "layers": {
     "o": 1,
     "b": 1,
     "g": 1,
     "e": 1
    },
    "say": "答案是：<b>你贏了產品，輸了通路。</b>正面對決繼續贏也沒有用 —— 要打的是<em>分發</em>，或者把資源從單位轉到<em>升級</em>（全域生效、複利，中段才顯現）。",
    "order": null,
    "mode": null,
    "act": null,
    "addSay": "再多開一層：工程師。他覺得「每場都贏」就夠了 —— 通路不在他的視野裡。"
   }
  ],
  "ways": [
   {
    "c": "a",
    "t": "路線 A · 搶通路",
    "h": "不要跟它拚產品，去拚渠道",
    "b": "把力氣從「再好 20%」移到<b>整合、嵌入、通路合作</b>。對手能免費散布，是因為它綁在別人已經付過錢的東西裡 —— 你也可以找一個。",
    "cost": "代價：這是完全不同的能力，可能要換人、換組織。半年起跳。"
   },
   {
    "c": "b2",
    "t": "路線 B · 投升級不投單位",
    "h": "複利在中段才顯現",
    "b": "把 60% 資源投在<b>全域生效的升級</b>（履約、自動化、流程）。前八分鐘你會一直比較弱 —— <em>而那正是大部分人放棄的時候</em>。",
    "cost": "代價：中段的數字會很難看，你得先跟老闆借到那段時間。"
   },
   {
    "c": "c",
    "t": "路線 C · 收縮到守得住的地方",
    "h": "不是每個據點都值得守",
    "b": "放掉大眾市場，把全部戰力集中在利基＋企業客戶。<b>佔了難被搶的地方，才是你的地圖。</b>",
    "cost": "代價：市佔數字短期會更難看。這條路必須在決策點事先講清楚，否則會被當成潰敗。"
   }
  ],
  "map": {
   "comms": 4,
   "workers": 14,
   "obs": true,
   "debt": 3,
   "feats": 16
  },
  "S": {
   "cash": 700,
   "cashTrend": -1,
   "talent": 44,
   "milestone": "Q4 守住市佔",
   "light": "red",
   "share": 17,
   "runway": 10,
   "headline": "競品把產品綁進既有套裝免費送",
   "eco": 90,
   "ourArmy": 50,
   "emArmy": 58,
   "hist": {
    "our": 50,
    "em": 20,
    "flat": true
   },
   "shipped": 16,
   "crew": {
    "budget": 12,
    "talent": 3,
    "build": 1,
    "repay": 1,
    "scout": 2,
    "idle": 0,
    "qa": 0
   },
   "bw": [
    38,
    44
   ],
   "queue": 2,
   "debtVisible": true,
   "debt": 3,
   "feats": 16,
   "net": null,
   "platform": 2,
   "nodes": {
    "niche": {
     "owner": "us",
     "our": 50,
     "em": 26,
     "snapAge": 20
    },
    "massS": {
     "owner": "em",
     "our": 50,
     "em": 26,
     "snapAge": 20
    },
    "massN": {
     "owner": "em",
     "our": 0,
     "em": 24,
     "snapAge": 50
    },
    "ent": {
     "owner": "em",
     "our": 0,
     "em": 22,
     "snapAge": 40
    }
   },
   "eng": {
    "tix": 2,
    "tickets": "2 張",
    "order": "把這個做得更好",
    "feel": "我們的功能明明比對手好",
    "peers": 5,
    "blockers": 0,
    "sightNote": "",
    "say": "我們每場都贏啊。通路？那是別人的事吧。"
   }
  },
  "patches": [
   null,
   null,
   null,
   null,
   null
  ],
  "deferred": {}
 }
];
