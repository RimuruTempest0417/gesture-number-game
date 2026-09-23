# 手勢數字小遊戲 (gesture-number-game)

用鏡頭 + MediaPipe Hands 玩的手指數字遊戲，專為小朋友設計：螢幕出一個數字，用單手比出對應數量的手指就過關。

## 玩法

1. 打開網頁，允許瀏覽器使用鏡頭。
2. 畫面上會顯示一個目標數字（**1 ～ 10**）同對應的示範手勢（例如 `7 🖐️✌️`）。
3. 用**兩隻手的手指數量加埋**等於目標數字就過關（例如目標 7 = 左手 3 + 右手 4）。
   1 ～ 5 用一隻手比出都可以，因為加總只有一隻手的手指。
4. 系統偵測正確就自動 +1 分再出下一題（同一題唔會連續出現）。
5. 連續答對 **10 題**就會出現 🎉 通關畫面，可以按「再玩一次」。

小提示：手掌盡量**直立面向鏡頭**、手離鏡頭約 40–60 公分，兩隻手分開少少唔好重疊，偵測最穩定（見下方「已知限制」）。

## 畫面元素

| 元素 | 用途 |
| --- | --- |
| 目標數字 + 示範手勢 | 告知要伸幾隻手指（6 以上會顯示兩隻手的組合） |
| 進度 `N / 10` + ⭐ | 已完成題數與星星獎勵 |
| 鏡頭畫面上的綠色／橙色骨架 | 顯示系統抓到的兩隻手關節，讓小朋友知道隻手有冇被睇到 |
| 右下角「左手 N + 右手 M = 總數」 | 目前兩隻手各自的手指數與加總 |
| 底部圖例 `1 ☝️ … 5 🖐️ 6 🖐️☝️ … 10 🖐️🖐️` | 每個數字的示範手勢 |
| 右上角「🔊 音效」 | 開啟／關閉音效（答對、換題、通關提示音） |

## 技術

- HTML5 / CSS3 / JavaScript (ES6+)，零建置步驟、零框架。
- [MediaPipe Hands](https://developers.google.com/mediapipe) 手部 21 點關節偵測（CDN 載入），追蹤最多兩隻手（`maxNumHands: 2`）。
- 兩隻手各自數手指，**加總**後與目標數字比對。
- 骨架用原生 `<canvas>` 繪製（兩隻手兩隻色），沒有使用已停止維護的 `drawing_utils`。
- 音效用 Web Audio API 即時合成，不需要任何音效檔。
- 部署在 GitHub Pages（純靜態）。

## 檔案結構

```text
gesture-number-game/
├── index.html   # 版面：目標數字、進度、鏡頭、骨架圖層、圖例、通關彈窗
├── style.css    # 兒童向配色與版面
├── script.js    # 手勢偵測、兩手加總、遊戲流程、骨架繪圖、音效
├── .github/workflows/release.yml   # 每次 push 到 main 自動發 Release
└── README.md
```

## 自動發佈 Release

`.github/workflows/release.yml` 會在**每次 push 到 `main`**（或手動 `workflow_dispatch`）時自動：

1. 打包 `index.html`、`style.css`、`script.js`、`README.md` 成 `gesture-number-game-<版本>.zip`。
2. 建立標籤 `vYYYY.MM.DD.<run number>`（例如 `v2026.09.23.7`）。
3. 用 `gh release create --generate-notes` 發佈 Release，zip 作為下載附件。

GitHub Pages 亦會同步重新發佈，所以 push 一次＝線上版更新＋一個新 Release。想跳過自動發佈時，在 commit message 加 `[skip ci]`。

## 本機執行

鏡頭權限只在 `https://` 或 `localhost` 下可用，所以不能直接雙擊 `index.html`，要起一個本機伺服器：

```bash
git clone https://github.com/RimuruTempest0417/gesture-number-game.git
cd gesture-number-game
python3 -m http.server 8000
# 開啟 http://localhost:8000
```

## 已知限制

- **手勢計數對手掌角度敏感。** `countFingers()` 現時用「指尖 y 是否高於 PIP 關節」判斷手指張開、用「手腕與中指根部嘅 x 位置」推斷左右手，因此手掌打斜、打橫或手掌反轉時有機會數錯（實測理想手模型在 ±60° 以上會出錯，手掌橫放時五指可能被讀成 0 隻）。手掌維持直立面向鏡頭時最準確。
- **目標 10 特別受上者影響**：10 需要兩隻手都讀成 5 隻手指，而「5」一定要拇指判定正確；拇指一被判錯，該題就會永遠做不到。若想玩得順，建議先修好 `countFingers()`（見下）。
- 兩隻手太近或互相遮擋時，MediaPipe 可能只偵測到一隻手，加總就會唔夠數。
- 一次只追蹤兩隻手（`maxNumHands: 2`）。
- 需要網絡連線載入 MediaPipe 的 CDN 資源（首次載入模型約數 MB）。
- 鏡頭畫面會鏡像翻轉（`scaleX(-1)`）令操作更直覺，MediaPipe 座標同時鏡像，所以骨架才會對得上。

## 想玩得更順？

- 提升偵測準確度：改用 MediaPipe 提供的 `multiHandedness` 判斷左右手，並用「指尖到手腕距離 vs PIP 到手腕距離」取代單純的 y 比較，就可以做到旋轉不變的判斷。

## 授權

個人教學用途，隨意使用。
