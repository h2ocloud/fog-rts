# Fog of War RTS（戰爭迷霧）

一款用 Canvas2D 做的等角 RTS 小遊戲，用遊戲的方式讓人體會 PM、工程師、主管、老闆各自看到的視野有多不同。純前端，沒有外部依賴。

## 建置
```
node build.mjs   # 輸出單一檔案 dist/index.html
```

## 結構
- `src/NN-*.js`：各模組，依編號順序內聯。
  - `20-sim.js`：模擬
  - `35-view.js`：三層視野的純函式
  - `40-render.js`：Canvas2D 等角繪製
  - `70-coach.js`：教學
  - `80-*`：關卡
  - `86-theater.js`：劇場模式
- `src/index.template.html`、`style.css`、`theater.css`、`stats.css`
- `orig/`：舊版，劇場模式的文案是從這裡抽出來的。
- `I18N-GUIDE.md`：中英文的做法。
- `DESIGN-NOTES.md`：設計筆記和踩過的坑。

## 相關
作品集首頁的嵌入版輕量迷霧地圖，在 `h2ocloud/portfolio-site` 的 `src/fog/engine.js`。
