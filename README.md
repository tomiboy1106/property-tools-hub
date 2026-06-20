# Property Tools Hub

單一 Git Repository，包含：

- `homepage/`：Next.js 入口網站
- `buyer-budget/`：自備款可購總價試算（靜態 HTML）
- `seller-net/`：房地合一稅及財產交易所得稅試算（靜態 HTML）

## Vercel 部署

在 Vercel 建立一個 Project，Repository Root Directory 保持為專案根目錄，不要設定成 `homepage`。

根目錄的 `vercel.json` 會分別建置 Next.js 首頁與兩個靜態工具，正式路徑為：

- `/`
- `/buyer-budget/`
- `/seller-net/`

`homepage/` 僅為 Repository 內的原始碼目錄名稱，不會出現在公開網址中。根網址 `/` 直接由 Next.js Homepage 提供。

Homepage 僅使用網址導向工具，不讀取或修改工具內部程式。

## Homepage 本機開發

```powershell
cd homepage
npm install
npm run dev
```

Next.js 本機伺服器只預覽 Homepage。完整的同網域路由請使用 Vercel Preview Deployment 驗證。
