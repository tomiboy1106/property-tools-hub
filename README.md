# Property Tools Hub

單一 Git Repository，包含：

- `homepage/`：Next.js 入口網站
- `buyer-budget/`：自備款可購總價試算（靜態 HTML）
- `seller-net/`：房地合一稅及財產交易所得稅試算（靜態 HTML）

## Vercel 部署

此 Repository 在 Vercel 使用三個獨立 Project。Homepage Project 的 **Root Directory 請設定為 `homepage`**。這是建置來源位置，不會出現在公開網址中；Homepage 公開網址仍然是 `/`。

三個 Project：

- Homepage：網站根網址 `/`
- Buyer Budget：`https://buyer-budget.vercel.app/`
- Seller Net：`https://seller-net-calculator.vercel.app/`

根目錄不使用 `vercel.json` 路由或 rewrite，避免與 Next.js 自動路由產生循環。

Homepage 僅使用上述公開網址導向工具，不讀取、複製或修改工具內部程式。

## Homepage 本機開發

```powershell
cd homepage
npm install
npm run dev
```

Next.js 本機伺服器只預覽 Homepage。完整的同網域路由請使用 Vercel Preview Deployment 驗證。
