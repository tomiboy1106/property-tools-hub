const form = document.querySelector("#calculator");
const downPaymentInput = document.querySelector("#downPayment");
const interestRateInput = document.querySelector("#interestRate");
const loanYearsInput = document.querySelector("#loanYears");
const highPriceInput = document.querySelector("#highPrice");
const resetButton = document.querySelector("#resetButton");
const pdfButton = document.querySelector("#pdfButton");
const numberInputs = [downPaymentInput, interestRateInput, loanYearsInput];

const output = {
  totalPrice: document.querySelector("#totalPrice"),
  loanAmount: document.querySelector("#loanAmount"),
  monthlyPayment: document.querySelector("#monthlyPayment"),
  loanRatio: document.querySelector("#loanRatio"),
  totalInterest: document.querySelector("#totalInterest"),
  hint: document.querySelector("#calculationHint")
};

const numberFormatter = new Intl.NumberFormat("zh-TW", {
  maximumFractionDigits: 1
});
const integerFormatter = new Intl.NumberFormat("zh-TW", {
  maximumFractionDigits: 0
});

function safeNumber(input) {
  const number = Number.parseFloat(input.value);
  return Number.isFinite(number) && number >= 0 ? number : 0;
}

function updateZeroAppearance(input) {
  input.classList.toggle("is-zero", input.value === "" || Number(input.value) === 0);
}

numberInputs.forEach((input) => {
  updateZeroAppearance(input);

  input.addEventListener("focus", () => {
    if (Number(input.value) === 0) {
      input.value = "";
      updateZeroAppearance(input);
    } else {
      input.select();
    }
  });

  input.addEventListener("input", () => {
    if (input.value.length > 1 && input.value.startsWith("0") && !input.value.startsWith("0.")) {
      input.value = String(Number(input.value));
    }
    updateZeroAppearance(input);
  });

  input.addEventListener("blur", () => {
    if (input.value === "") input.value = "0";
    updateZeroAppearance(input);
    calculate();
  });
});

function getLoanRatio() {
  if (highPriceInput.checked) return 0.3;
  return Number(document.querySelector('input[name="identity"]:checked').value);
}

function calculateMonthlyPayment(principal, annualRate, years) {
  const months = years * 12;
  if (principal <= 0 || months <= 0) return 0;
  const monthlyRate = annualRate / 100 / 12;
  if (monthlyRate === 0) return principal / months;
  const factor = Math.pow(1 + monthlyRate, months);
  return principal * monthlyRate * factor / (factor - 1);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function calculate() {
  const downPaymentWan = safeNumber(downPaymentInput);
  const annualRate = safeNumber(interestRateInput);
  const years = safeNumber(loanYearsInput);
  const ratio = getLoanRatio();
  const selfFundingRatio = 1 - ratio;

  const totalPriceWan = selfFundingRatio > 0 ? downPaymentWan / selfFundingRatio : 0;
  const loanAmountWan = totalPriceWan * ratio;
  const principal = loanAmountWan * 10000;
  const monthlyPayment = calculateMonthlyPayment(principal, annualRate, years);
  const totalPaid = monthlyPayment * years * 12;
  const totalInterestWan = Math.max(0, (totalPaid - principal) / 10000);

  output.totalPrice.textContent = numberFormatter.format(totalPriceWan);
  output.loanAmount.textContent = numberFormatter.format(loanAmountWan);
  output.monthlyPayment.textContent = integerFormatter.format(monthlyPayment);
  output.loanRatio.textContent = integerFormatter.format(ratio * 100);
  output.totalInterest.textContent = numberFormatter.format(totalInterestWan);

  if (downPaymentWan === 0) {
    output.hint.textContent = "請輸入自備款金額，即可估算可購屋總價。";
  } else if (years === 0) {
    output.hint.textContent = "可購總價已算出；再輸入貸款年限，即可估算每月還款。";
  } else if (annualRate === 0) {
    output.hint.textContent = "目前以零利率平均攤還試算；輸入實際年利率可得到更準確結果。";
  } else {
    output.hint.textContent = `以上採本息平均攤還法，依年利率 ${annualRate}%、貸款 ${numberFormatter.format(years)} 年估算。`;
  }
}

function generatePdfPreview() {
  calculate();

  const reportWindow = window.open("", "_blank", "width=980,height=1100");
  if (!reportWindow) {
    window.alert("預覽視窗遭瀏覽器阻擋，請允許此網站開啟彈出式視窗後再試一次。");
    return;
  }

  const selectedCard = document.querySelector('input[name="identity"]:checked')?.closest(".identity-card");
  const identityName = selectedCard?.querySelector("b")?.textContent?.trim() || "未選擇";
  const identityDetails = Array.from(selectedCard?.querySelectorAll("small") || [])
    .map((item) => item.textContent.trim())
    .filter(Boolean)
    .join("・");
  const logoUrl = new URL("logo.png?v=4", window.location.href).href;
  const highPriceText = highPriceInput.checked ? "是（以貸款 3 成試算）" : "否";
  const downPayment = `${numberFormatter.format(safeNumber(downPaymentInput))} 萬元`;
  const annualRate = `${numberFormatter.format(safeNumber(interestRateInput))}%`;
  const loanYears = `${numberFormatter.format(safeNumber(loanYearsInput))} 年`;
  const reportDate = new Intl.DateTimeFormat("zh-TW", { dateStyle: "long" }).format(new Date());
  const disclaimer = document.querySelector(".disclaimer")?.textContent?.trim() || "";
  const rules = Array.from(document.querySelectorAll(".rule-grid article")).map((item) => ({
    tag: item.querySelector(".rule-tag")?.textContent?.trim() || "",
    text: item.querySelector("p")?.textContent?.trim() || ""
  }));

  reportWindow.document.write(`
    <!doctype html>
    <html lang="zh-Hant">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>自備款可購總價試算報告</title>
        <style>
          @page { size: A4 portrait; margin: 0; }
          * { box-sizing: border-box; }
          :root {
            --yellow: #ffd110;
            --black: #171717;
            --ink: #202020;
            --muted: #707070;
            --line: #dedede;
            --green: #138a5b;
            --red: #e33a35;
          }
          body {
            margin: 0;
            color: var(--ink);
            background: #ececea;
            font-family: "Noto Sans TC", "Microsoft JhengHei", Arial, sans-serif;
          }
          .printbar {
            position: sticky;
            z-index: 20;
            top: 0;
            display: flex;
            justify-content: center;
            gap: 10px;
            padding: 12px;
            background: var(--black);
            box-shadow: 0 5px 18px rgba(0,0,0,.18);
          }
          .printbar button {
            min-height: 42px;
            padding: 9px 20px;
            cursor: pointer;
            border: 0;
            border-radius: 8px;
            color: var(--black);
            background: var(--yellow);
            font-weight: 900;
          }
          .printbar .close {
            color: white;
            border: 1px solid #555;
            background: #292929;
          }
          .sheet {
            display: flex;
            width: 210mm;
            min-height: 297mm;
            flex-direction: column;
            margin: 18px auto;
            padding: 9mm 11mm 8mm;
            overflow: hidden;
            background: white;
            box-shadow: 0 14px 40px rgba(0,0,0,.12);
          }
          .header {
            position: relative;
            display: grid;
            grid-template-columns: 25mm 1fr;
            gap: 7mm;
            min-height: 42mm;
            align-items: center;
            overflow: hidden;
            padding: 6mm 9mm;
            color: white;
            background: var(--black);
            border-radius: 2mm;
          }
          .header::after {
            position: absolute;
            top: -31mm;
            right: -26mm;
            width: 64mm;
            height: 64mm;
            border: 9mm solid var(--yellow);
            border-radius: 50%;
            content: "";
          }
          .logo {
            position: relative;
            z-index: 1;
            width: 25mm;
            height: 25mm;
            object-fit: contain;
            filter: drop-shadow(0 2mm 2mm rgba(0,0,0,.35));
          }
          .header-copy { position: relative; z-index: 1; }
          .eyebrow {
            margin: 0 0 1.5mm;
            color: var(--yellow);
            font-size: 8pt;
            font-weight: 900;
          }
          h1 { margin: 0; font-size: 22pt; line-height: 1.12; }
          .subtitle { margin: 2mm 0 0; color: #d2d2d2; font-size: 8.5pt; }
          .report-meta {
            display: flex;
            justify-content: space-between;
            gap: 8mm;
            margin: 3mm 0 0;
            color: #777;
            font-size: 7.5pt;
          }
          .result {
            position: relative;
            margin-top: 3mm;
            padding: 5mm 7mm;
            overflow: hidden;
            color: white;
            background: var(--black);
            border-radius: 2mm;
          }
          .result::after {
            position: absolute;
            right: -22mm;
            bottom: -30mm;
            width: 55mm;
            height: 55mm;
            border: 8mm solid rgba(255,209,16,.12);
            border-radius: 50%;
            content: "";
          }
          .result-label {
            position: relative;
            z-index: 1;
            margin: 0;
            color: var(--yellow);
            font-size: 8pt;
            font-weight: 900;
          }
          .result-price {
            position: relative;
            z-index: 1;
            margin: 1mm 0 3mm;
            color: var(--yellow);
            font-size: 34pt;
            font-weight: 950;
            line-height: 1;
          }
          .result-price small { margin-left: 2mm; color: white; font-size: 11pt; }
          .result-grid {
            position: relative;
            z-index: 1;
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            border-top: 1px solid #444;
            border-bottom: 1px solid #444;
          }
          .metric { padding: 3mm; border-right: 1px solid #444; }
          .metric:first-child { padding-left: 0; }
          .metric:last-child { border-right: 0; }
          .metric span { display: block; color: #aaa; font-size: 7pt; }
          .metric strong { display: block; margin-top: 1mm; font-size: 10pt; }
          .section { margin-top: 3mm; }
          .section-title {
            display: flex;
            align-items: center;
            gap: 2.5mm;
            margin-bottom: 2mm;
          }
          .section-index {
            display: grid;
            width: 8mm;
            height: 8mm;
            place-items: center;
            border-radius: 2mm;
            background: var(--yellow);
            font-size: 7pt;
            font-weight: 900;
          }
          h2 { margin: 0; font-size: 10.5pt; }
          .conditions {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            border-top: 1px solid var(--line);
            border-left: 1px solid var(--line);
          }
          .condition {
            min-height: 12mm;
            padding: 2.5mm 3mm;
            border-right: 1px solid var(--line);
            border-bottom: 1px solid var(--line);
            background: #fafafa;
          }
          .condition span { display: block; color: var(--muted); font-size: 7pt; }
          .condition strong { display: block; margin-top: 1mm; font-size: 9.5pt; }
          .condition small { display: block; margin-top: .7mm; color: var(--green); font-size: 6.5pt; }
          .rule-list {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 1.5mm;
          }
          .rule {
            display: flex;
            gap: 2mm;
            align-items: flex-start;
            padding: 2mm;
            background: #f7f7f6;
            border-radius: 1.5mm;
            font-size: 6.7pt;
          }
          .rule b {
            flex: 0 0 auto;
            padding: .7mm 1.5mm;
            color: white;
            background: var(--green);
            border-radius: 1mm;
            font-size: 6pt;
          }
          .rule:nth-child(n+3) b { color: var(--black); background: var(--yellow); }
          .rule:last-child { grid-column: 1 / -1; }
          .rule:last-child b { color: white; background: var(--red); }
          .rule p { margin: .5mm 0 0; color: #555; }
          .footer {
            display: flex;
            flex-direction: column;
            gap: 2mm;
            margin-top: auto;
            padding-top: 3mm;
            border-top: 1px solid var(--line);
          }
          .company {
            display: grid;
            justify-items: center;
            gap: 1mm;
            padding: 3mm 6mm;
            color: white;
            background: var(--black);
            border-radius: 2mm;
            text-align: center;
          }
          .company img { width: 15mm; height: 15mm; object-fit: contain; }
          .company strong { color: var(--yellow); font-size: 9pt; }
          .company span { color: #d0d0d0; font-size: 7pt; }
          .legal { margin: 0; color: #777; font-size: 5.8pt; line-height: 1.45; }
          @media print {
            body {
              background: white;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .printbar { display: none; }
            .sheet {
              width: 210mm;
              min-height: 297mm;
              margin: 0;
              box-shadow: none;
              break-after: avoid-page;
            }
          }
          @media screen and (max-width: 760px) {
            .sheet { width: 100%; min-height: 0; margin: 0; padding: 16px; box-shadow: none; }
            .header { grid-template-columns: 64px 1fr; min-height: 145px; padding: 20px; }
            .logo { width: 60px; height: 60px; }
            h1 { font-size: 22px; }
            .result-grid, .conditions, .rule-list { grid-template-columns: 1fr 1fr; }
          }
        </style>
      </head>
      <body>
        <div class="printbar">
          <button type="button" onclick="window.print()">列印 / 儲存 PDF</button>
          <button class="close" type="button" onclick="window.close()">關閉預覽</button>
        </div>
        <main class="sheet">
          <header class="header">
            <img class="logo" src="${logoUrl}" alt="岠鋐不動產事業有限公司 LOGO">
            <div class="header-copy">
              <p class="eyebrow">買房預算・快速掌握</p>
              <h1>自備款可購總價試算報告</h1>
              <p class="subtitle">購屋總價、貸款金額及月付金初步評估</p>
            </div>
          </header>
          <div class="report-meta">
            <span>報告用途：購屋預算初步評估</span>
            <span>產出日期：${reportDate}</span>
          </div>

          <section class="result">
            <p class="result-label">預估可購屋總價</p>
            <div class="result-price">${escapeHtml(output.totalPrice.textContent)}<small>萬元</small></div>
            <div class="result-grid">
              <div class="metric"><span>預估貸款金額</span><strong>${escapeHtml(output.loanAmount.textContent)} 萬元</strong></div>
              <div class="metric"><span>每月本息攤還</span><strong>約 ${escapeHtml(output.monthlyPayment.textContent)} 元</strong></div>
              <div class="metric"><span>適用貸款成數</span><strong>${escapeHtml(output.loanRatio.textContent)}%</strong></div>
              <div class="metric"><span>預估總利息</span><strong>${escapeHtml(output.totalInterest.textContent)} 萬元</strong></div>
            </div>
          </section>

          <section class="section">
            <div class="section-title"><span class="section-index">01</span><h2>本次試算條件</h2></div>
            <div class="conditions">
              <div class="condition"><span>自備款金額</span><strong>${escapeHtml(downPayment)}</strong></div>
              <div class="condition"><span>貸款身分別</span><strong>${escapeHtml(identityName)}</strong><small>${escapeHtml(identityDetails)}</small></div>
              <div class="condition"><span>年利率／貸款年限</span><strong>${escapeHtml(annualRate)}／${escapeHtml(loanYears)}</strong></div>
              <div class="condition"><span>高總價住宅</span><strong>${escapeHtml(highPriceText)}</strong></div>
            </div>
          </section>

          <section class="section">
            <div class="section-title"><span class="section-index">02</span><h2>貸款成數說明</h2></div>
            <div class="rule-list">
              ${rules.map((rule) => `
                <div class="rule">
                  <b>${escapeHtml(rule.tag)}</b>
                  <p>${escapeHtml(rule.text)}</p>
                </div>
              `).join("")}
            </div>
          </section>

          <footer class="footer">
            <section class="company">
              <img src="${logoUrl}" alt="岠鋐不動產事業有限公司 LOGO">
              <strong>岠鋐不動產事業有限公司</strong>
              <span>如仍有疑問，歡迎來電洽詢 (07)-7779365</span>
            </section>
            <p class="legal">${escapeHtml(disclaimer)}</p>
          </footer>
        </main>
      </body>
    </html>
  `);
  reportWindow.document.close();
}

form.addEventListener("input", calculate);
form.addEventListener("change", calculate);

resetButton.addEventListener("click", () => {
  form.reset();
  downPaymentInput.value = 0;
  interestRateInput.value = 0;
  loanYearsInput.value = 0;
  numberInputs.forEach(updateZeroAppearance);
  calculate();
  downPaymentInput.blur();
});

pdfButton.addEventListener("click", () => {
  generatePdfPreview();
});

calculate();
