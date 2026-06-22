const residentRates = [
  { maxYears: 2, rate: 0.45, label: "持有 2 年以內" },
  { maxYears: 5, rate: 0.35, label: "超過 2 年，未逾 5 年" },
  { maxYears: 10, rate: 0.2, label: "超過 5 年，未逾 10 年" },
  { maxYears: Infinity, rate: 0.15, label: "超過 10 年" },
];

const nonResidentRates = [
  { maxYears: 2, rate: 0.45, label: "持有 2 年以內" },
  { maxYears: Infinity, rate: 0.35, label: "超過 2 年" },
];

let expenseMode = "actual";
let autoSelfUseActive = false;

const $ = (id) => document.getElementById(id);
const fallbackValues = {
  estimatedExpenseRate: 3,
  estimatedExpenseCap: 300000,
  selfUseExemption: 4000000,
  selfUseRate: 10,
  specialRate: 20,
};

const money = (value) =>
  new Intl.NumberFormat("zh-TW", {
    style: "currency",
    currency: "TWD",
    maximumFractionDigits: 0,
  }).format(Math.round(value || 0));

const number = (id, fallback = 0) =>
  Math.max(0, Number($(id).value || fallback) || 0);
const wan = (id) => number(id) * 10000;

function rocDate(prefix) {
  if (!$(`${prefix}Year`).value || !$(`${prefix}Month`).value || !$(`${prefix}Day`).value) {
    return null;
  }
  const year = Math.floor(number(`${prefix}Year`)) + 1911;
  const month = Math.min(12, Math.max(1, Math.floor(number(`${prefix}Month`))));
  const day = Math.min(31, Math.max(1, Math.floor(number(`${prefix}Day`))));
  return new Date(year, month - 1, day);
}

function yearsBetween(startDate, endDate) {
  if (!startDate || !endDate) return 0;
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return 0;
  const days = Math.max(0, (endDate - startDate) / 86400000);
  return days / 365.25;
}

function formatYears(years) {
  const wholeYears = Math.floor(years);
  const months = Math.max(0, Math.round((years - wholeYears) * 12));
  if (wholeYears === 0) return months + " 個月";
  if (months === 0 || months === 12) return String(wholeYears + (months === 12 ? 1 : 0)) + " 年";
  return wholeYears + " 年 " + months + " 個月";
}

function generalRate(residentType, holdingYears) {
  const rates = residentType === "nonResident" ? nonResidentRates : residentRates;
  return rates.find((item) => holdingYears <= item.maxYears) || rates.at(-1);
}

function isSelfUseQualified() {
  const registryDate = rocDate("registry");
  const sellDate = rocDate("sell");
  const registryYears = yearsBetween(registryDate, sellDate);
  return registryYears >= 6 && $("hasRegistryResidence").checked && $("noRental").checked && $("noBusinessUse").checked;
}

function applyAutoSelfUse() {
  const qualified = isSelfUseQualified();
  $("selfUseAutoNote").hidden = !qualified;

  if (qualified) {
    $("scenario").value = "selfUse";
    autoSelfUseActive = true;
    return;
  }

  if (autoSelfUseActive && $("scenario").value === "selfUse") {
    $("scenario").value = "general";
  }
  autoSelfUseActive = false;
}

function calculate() {
  applyAutoSelfUse();

  const salePrice = wan("salePriceWan");
  const baseAcquisitionCost = wan("acquisitionCostWan");
  const improvementCost = number("improvementCost");
  const scrivenerFee = number("scrivenerFee");
  const advertisingFee = number("advertisingFee");
  const brokerageFee = number("brokerageFee");
  const purchaseBrokerageFee = number("purchaseBrokerageFee");
  const deedTax = number("deedTax");
  const stampTax = number("stampTax");
  const registrationFee = number("registrationFee");
  const serviceExpense = scrivenerFee + advertisingFee + brokerageFee;
  const taxAndFeeCost = deedTax + stampTax + registrationFee + purchaseBrokerageFee;
  const otherCost = number("otherCost");
  const landValueIncrement = number("landValueIncrement");
  const holdingYears = yearsBetween(rocDate("buy"), rocDate("sell"));
  const residentType = $("residentType").value;
  const scenario = $("scenario").value;

  const expense = serviceExpense;
  const totalCost =
    baseAcquisitionCost + improvementCost + taxAndFeeCost + otherCost + expense;
  const gainBeforeLandAdjustment = salePrice - totalCost;
  const income = Math.max(0, gainBeforeLandAdjustment - landValueIncrement);

  let rateInfo = generalRate(residentType, holdingYears);
  let taxableBase = income;
  let ruleLabel = rateInfo.label;

  if (scenario === "special20") {
    rateInfo = {
      rate: number("specialRate", fallbackValues.specialRate) / 100,
      label: "特殊情形 20%",
    };
    ruleLabel = "特殊情形適用稅率";
  }

  if (scenario === "selfUse") {
    const exemption = number("selfUseExemption", fallbackValues.selfUseExemption);
    taxableBase = Math.max(0, income - exemption);
    rateInfo = {
      rate: number("selfUseRate", fallbackValues.selfUseRate) / 100,
      label: "自住房地優惠",
    };
    ruleLabel = `自住優惠：已扣除 ${money(exemption)} 免稅額`;
  }

  const taxDue = Math.max(0, taxableBase * rateInfo.rate);

  updateResult({
    salePrice,
    baseAcquisitionCost,
    improvementCost,
    scrivenerFee,
    advertisingFee,
    brokerageFee,
    purchaseBrokerageFee,
    serviceExpense,
    deedTax,
    stampTax,
    registrationFee,
    taxAndFeeCost,
    otherCost,
    expense,
    totalCost,
    landValueIncrement,
    income,
    taxableBase,
    holdingYears,
    residentType,
    rateInfo,
    ruleLabel,
    taxDue,
  });
}

function updateResult(data) {
  $("taxDue").textContent = money(data.taxDue);
  $("taxableIncome").textContent = money(data.income);
  $("holdingPeriod").textContent = formatYears(data.holdingYears);
  $("taxRate").textContent = String(Math.round(data.rateInfo.rate * 100)) + "%";
  $("resultNote").textContent =
    data.income <= 0
      ? "本次試算無交易獲利，房地合一稅為 0"
      : data.ruleLabel + "，課稅所得 " + money(data.taxableBase);

  const rows = [
    ["出售成交價", data.salePrice],
    ["取得成本", data.baseAcquisitionCost],
    ["改良與裝修成本", data.improvementCost],
    ["代書費", data.scrivenerFee],
    ["廣告費", data.advertisingFee],
    ["出售時仲介費", data.brokerageFee],
    ["契稅", data.deedTax],
    ["印花稅", data.stampTax],
    ["規費", data.registrationFee],
    ["購買時仲介費", data.purchaseBrokerageFee],
    ["其他可列成本", data.otherCost],
    ["出售時成本合計", data.expense],
    ["購買時成本合計", data.taxAndFeeCost],
    ["成本費用合計", data.totalCost],
    ["減土地漲價總數額", data.landValueIncrement],
    ["交易獲利", data.income],
    ["課稅所得", data.taxableBase],
  ];

  $("breakdownList").innerHTML = rows
    .map(
      ([label, value]) =>
        '<div class="breakdown-row"><dt>' +
        label +
        "</dt><dd>" +
        money(value) +
        "</dd></div>"
    )
    .join("");

  const rates = data.residentType === "nonResident" ? nonResidentRates : residentRates;
  const selfUseCelebration =
    data.residentType === "resident" && isSelfUseQualified()
      ? '<div class="self-use-celebration" role="status" aria-label="已符合自住優惠"><div class="celebration-burst" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div><strong>已符合自住優惠<br />享400萬免稅額</strong></div>'
      : "";
  $("rateList").innerHTML = rates
    .map((item, index) => {
      const active = item === generalRate(data.residentType, data.holdingYears);
      const row =
        '<div class="bracket-row' +
        (active ? " active" : "") +
        '"><span>' +
        item.label +
        '</span><span class="rate-badge">' +
        Math.round(item.rate * 100) +
        "%</span></div>";
      return data.residentType === "resident" && index === 1 ? row + selfUseCelebration : row;
    })
    .join("");
}

function setExpenseMode(mode) {
  expenseMode = "actual";
  calculate();
}

function fillSelect(select, values, placeholder) {
  select.innerHTML = [
    `<option value="">${placeholder}</option>`,
    ...values.map((value) => `<option value="${value}">${value}</option>`),
  ].join("");
}

function setupDateSelects() {
  const currentRocYear = new Date().getFullYear() - 1911;
  const years = Array.from({ length: 90 }, (_, index) => currentRocYear - index);
  const months = Array.from({ length: 12 }, (_, index) => index + 1);
  const days = Array.from({ length: 31 }, (_, index) => index + 1);

  ["buy", "sell", "registry"].forEach((prefix) => {
    fillSelect($(`${prefix}Year`), years, "年");
    fillSelect($(`${prefix}Month`), months, "月");
    fillSelect($(`${prefix}Day`), days, "日");
  });
}

function resetForm() {
  document.querySelectorAll(".clearable").forEach((field) => {
    if (field.type === "checkbox") {
      field.checked = false;
    } else {
      field.value = "";
    }
  });
  $("residentType").value = "resident";
  $("scenario").value = "general";
  $("selfUseAutoNote").hidden = true;
  autoSelfUseActive = false;
  setExpenseMode("actual");
}

function setTaxTab(tabName) {
  document.querySelectorAll("[data-tax-tab]").forEach((button) => {
    button.classList.toggle("active", button.dataset.taxTab === tabName);
  });

  const isHouseLand = tabName === "houseLand";
  $("houseLandView").hidden = !isHouseLand;
  $("propertyIncomeView").hidden = isHouseLand;
  $("houseLandView").classList.toggle("active", isHouseLand);
  $("propertyIncomeView").classList.toggle("active", !isHouseLand);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function collectBreakdownRows() {
  return [...document.querySelectorAll("#breakdownList .breakdown-row")]
    .map((row) => ({
      label: row.querySelector("dt")?.textContent || "",
      value: row.querySelector("dd")?.textContent || "",
    }));
}


function collectPdfFormState() {
  const fields = {};
  document.querySelectorAll("input, select").forEach((field) => {
    fields[field.id] = field.type === "checkbox" ? field.checked : field.value;
  });
  return { fields, expenseMode };
}

function encodePdfState(state) {
  return btoa(unescape(encodeURIComponent(JSON.stringify(state))));
}

function decodePdfState(value) {
  return JSON.parse(decodeURIComponent(escape(atob(value))));
}

function isLineMobileBrowser() {
  const ua = navigator.userAgent || "";
  return /Line/i.test(ua) && /Android|iPhone|iPad|iPod/i.test(ua);
}

function restorePdfFormState() {
  const params = new URLSearchParams(window.location.hash.slice(1));
  const encoded = params.get("pdfState");
  if (!encoded) return false;

  try {
    const state = decodePdfState(encoded);
    Object.entries(state.fields || {}).forEach(([id, value]) => {
      const field = $(id);
      if (!field) return;
      if (field.type === "checkbox") {
        field.checked = Boolean(value);
      } else {
        field.value = value;
      }
    });
    setExpenseMode(state.expenseMode || "actual");
    return params.get("autoPdf") === "1" && !isLineMobileBrowser();
  } catch (error) {
    return false;
  }
}

function buildPdfStateUrl() {
  const url = new URL(window.location.href);
  url.hash = "pdfState=" + encodePdfState(collectPdfFormState()) + "&autoPdf=1";
  return url.href;
}

function openPdfInExternalBrowser() {
  if (!isLineMobileBrowser() || window.location.hash.includes("pdfState=")) {
    return false;
  }

  const target = buildPdfStateUrl();
  const ua = navigator.userAgent || "";

  if (/Android/i.test(ua) && /^https?:/i.test(target)) {
    const targetUrl = new URL(target);
    window.location.href =
      "intent://" +
      target.replace(/^https?:\/\//i, "") +
      "#Intent;scheme=" +
      targetUrl.protocol.replace(":", "") +
      ";package=com.android.chrome;S.browser_fallback_url=" +
      encodeURIComponent(target) +
      ";end";
    return true;
  }

  window.location.href = target;
  return true;
}

function handlePdfButtonClick() {
  if (openPdfInExternalBrowser()) return;
  generatePdfReport();
}

function generatePdfReport() {
  calculate();

  const logoUrl = new URL("./assets/logo-transparent.png", window.location.href).href;
  const legalText = document.querySelector(".legal-disclaimer")?.innerHTML || "";
  const rows = collectBreakdownRows();
  const transactionLabels = new Set(["出售成交價", "取得成本"]);
  const transactionRows = rows.filter((row) => transactionLabels.has(row.label));
  const detailRows = rows.filter((row) => !transactionLabels.has(row.label));
  const reportWindow = window.open("", "_blank", "width=900,height=1100");

  if (!reportWindow) {
    window.print();
    return;
  }

  const resultCards = [
    ["預估房地合一稅", $("taxDue").textContent],
    ["交易獲利", $("taxableIncome").textContent],
    ["持有期間", $("holdingPeriod").textContent],
    ["適用稅率", $("taxRate").textContent],
  ];

  reportWindow.document.write(`
    <!doctype html>
    <html lang="zh-Hant">
      <head>
        <meta charset="utf-8" />
        <title>售屋稅務試算報告</title>
        <style>
          @page { size: A4; margin: 0; }
          * { box-sizing: border-box; }
          :root {
            --yellow: #ffd110;
            --black: #161616;
            --ink: #202020;
            --muted: #707070;
            --line: #dddddd;
          }
          body {
            margin: 0;
            color: var(--ink);
            background: #ececea;
            font-family: "Noto Sans TC", "Microsoft JhengHei", Arial, sans-serif;
          }
          .printbar {
            position: sticky;
            z-index: 10;
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
            border: 0;
            border-radius: 8px;
            padding: 9px 20px;
            color: var(--black);
            background: var(--yellow);
            font-weight: 900;
            cursor: pointer;
          }
          .printbar .close {
            color: #fff;
            border: 1px solid #555;
            background: #292929;
          }
          .sheet {
            position: relative;
            display: flex;
            width: 210mm;
            min-height: 297mm;
            flex-direction: column;
            margin: 18px auto;
            overflow: hidden;
            padding: 11mm 12mm 9mm;
            background: #fff;
            box-shadow: 0 14px 40px rgba(0,0,0,.12);
          }
          .header {
            position: relative;
            display: grid;
            grid-template-columns: 25mm 1fr;
            gap: 7mm;
            min-height: 44mm;
            align-items: center;
            overflow: hidden;
            padding: 7mm 9mm;
            border-radius: 3mm;
            color: #fff;
            background: var(--black);
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
          }
          .header-copy {
            position: relative;
            z-index: 1;
          }
          .eyebrow {
            margin: 0 0 1.5mm;
            color: var(--yellow);
            font-size: 8pt;
            font-weight: 900;
          }
          h1 {
            margin: 0;
            font-size: 23pt;
            line-height: 1.12;
          }
          .subtitle {
            margin: 2mm 0 0;
            color: #d2d2d2;
            font-size: 8.5pt;
          }
          .report-meta {
            display: flex;
            justify-content: space-between;
            gap: 8mm;
            margin: 3.5mm 0 0;
            color: #777;
            font-size: 7.5pt;
          }
          .hero {
            display: grid;
            grid-template-columns: 48mm minmax(0, 1fr);
            gap: 5mm;
            min-height: 31mm;
            align-items: center;
            margin-top: 4mm;
            padding: 5mm 8mm 5mm 6mm;
            border-left: 4mm solid var(--yellow);
            border-radius: 2mm;
            color: #fff;
            background: var(--black);
          }
          .hero span {
            display: block;
            color: var(--yellow);
            font-size: 12pt;
            font-weight: 900;
            line-height: 1.3;
          }
          .hero strong {
            display: block;
            color: var(--yellow);
            font-size: 37pt;
            line-height: 1;
            text-align: left;
          }
          .hero p {
            grid-column: 1 / -1;
            margin: -1mm 0 0;
            color: #c8c8c8;
            font-size: 8pt;
          }
          .cards {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            margin-top: 3mm;
            border: 1px solid var(--line);
            border-radius: 2mm;
          }
          .card {
            min-height: 18mm;
            padding: 4mm;
            border-right: 1px solid var(--line);
            background: #fafafa;
          }
          .card:last-child { border-right: 0; }
          .card span {
            display: block;
            color: var(--muted);
            font-size: 7.5pt;
            font-weight: 700;
          }
          .card strong {
            display: block;
            margin-top: 1.5mm;
            color: var(--ink);
            font-size: 13pt;
          }
          .section {
            margin-top: 3.2mm;
          }
          .section-title {
            display: flex;
            align-items: center;
            gap: 2.5mm;
            margin-bottom: 2mm;
          }
          .section-index {
            display: grid;
            width: 9mm;
            height: 9mm;
            place-items: center;
            border-radius: 2mm;
            color: var(--black);
            background: var(--yellow);
            font-size: 7.5pt;
            font-weight: 900;
          }
          h2 {
            margin: 0;
            font-size: 11pt;
          }
          .rows {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            border-top: 1px solid var(--line);
            border-left: 1px solid var(--line);
          }
          .primary-rows {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .primary-rows .row {
            min-height: 13mm;
            background: #fafafa;
          }
          .primary-rows .row .label {
            font-size: 8.5pt;
            font-weight: 800;
          }
          .primary-rows .row .value {
            font-size: 13pt;
          }
          .row {
            display: grid;
            grid-template-columns: minmax(0, 1fr) auto;
            gap: 4mm;
            min-height: 10mm;
            align-items: center;
            padding: 2.3mm 3mm;
            border-right: 1px solid var(--line);
            border-bottom: 1px solid var(--line);
            font-size: 7.7pt;
          }
          .row:nth-child(4n+3),
          .row:nth-child(4n+4) {
            background: #fafafa;
          }
          .row .label { color: #666; }
          .row .value {
            color: var(--ink);
            font-weight: 900;
            text-align: right;
            white-space: nowrap;
          }
          .footer {
            display: flex;
            flex-direction: column;
            gap: 2.5mm;
            margin-top: auto;
            padding-top: 4mm;
            border-top: 1px solid var(--line);
          }
          .legal {
            order: 2;
            margin: 0;
            color: #777;
            font-size: 5.8pt;
            line-height: 1.45;
          }
          .company {
            display: grid;
            grid-template-columns: 15mm auto;
            justify-content: center;
            gap: 4mm;
            width: 100%;
            min-height: 19mm;
            align-items: center;
            padding: 3mm 6mm;
            border-radius: 2mm;
            color: #fff;
            background: var(--black);
          }
          .company img {
            width: 15mm;
            height: 15mm;
            object-fit: contain;
          }
          .company strong {
            display: block;
            color: var(--yellow);
            font-size: 10pt;
            line-height: 1.2;
            text-align: center;
          }
          .company span {
            display: block;
            margin-top: 1mm;
            color: #d0d0d0;
            font-size: 7.5pt;
            line-height: 1.25;
            text-align: center;
          }
          @media print {
            body {
              background: #fff;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .printbar { display: none; }
            .sheet {
              width: 210mm;
              min-height: 297mm;
              margin: 0;
              box-shadow: none;
              page-break-after: avoid;
              break-after: avoid-page;
            }
          }
          @media screen and (max-width: 760px) {
            .sheet {
              width: 100%;
              min-height: 0;
              margin: 0;
              padding: 16px;
              box-shadow: none;
            }
            .header {
              grid-template-columns: 64px 1fr;
              min-height: 150px;
              padding: 20px;
            }
            .logo { width: 60px; height: 60px; }
            h1 { font-size: 22px; }
            .hero { grid-template-columns: 1fr; }
            .hero strong { text-align: left; }
            .cards,
            .rows { grid-template-columns: 1fr; }
            .card { border-right: 0; border-bottom: 1px solid var(--line); }
            .row:nth-child(n) { background: #fff; }
            .row:nth-child(2n) { background: #fafafa; }
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
            <img class="logo" src="${logoUrl}" alt="岠鋐不動產事業有限公司 LOGO" />
            <div class="header-copy">
              <p class="eyebrow">售屋試算・快速掌握</p>
              <h1>售屋稅務試算報告</h1>
              <p class="subtitle">房地合一稅初步試算結果</p>
            </div>
          </header>
          <div class="report-meta">
            <span>報告用途：售屋稅務初步評估</span>
            <span>產出日期：${new Intl.DateTimeFormat("zh-TW", { dateStyle: "long" }).format(new Date())}</span>
          </div>

          <section class="hero">
            <span>預估房地合一稅</span>
            <strong>${escapeHtml($("taxDue").textContent)}</strong>
            <p>${escapeHtml($("resultNote").textContent)}</p>
          </section>

          <section class="cards">
            ${resultCards
              .slice(1)
              .map(
                ([label, value]) => `
                  <div class="card">
                    <span>${escapeHtml(label)}</span>
                    <strong>${escapeHtml(value)}</strong>
                  </div>
                `
              )
              .join("")}
          </section>

          <section class="section">
            <div class="section-title">
              <span class="section-index">01</span>
              <h2>交易主要資料</h2>
            </div>
            <div class="rows primary-rows">
              ${transactionRows
                .map(
                  (row) => `
                    <div class="row">
                      <span class="label">${escapeHtml(row.label)}</span>
                      <span class="value">${escapeHtml(row.value)}</span>
                    </div>
                  `
                )
                .join("")}
            </div>
          </section>

          <section class="section">
            <div class="section-title">
              <span class="section-index">02</span>
              <h2>細項成本與試算明細</h2>
            </div>
            <div class="rows">
              ${detailRows
                .map(
                  (row) => `
                    <div class="row">
                      <span class="label">${escapeHtml(row.label)}</span>
                      <span class="value">${escapeHtml(row.value)}</span>
                    </div>
                  `
                )
                .join("")}
            </div>
          </section>

          <footer class="footer">
            <section class="company">
              <img src="${logoUrl}" alt="岠鋐不動產事業有限公司 LOGO" />
              <div>
                <strong>岠鋐不動產事業有限公司</strong>
                <span>如仍有疑問，歡迎來電洽詢 (07)-7779365</span>
              </div>
            </section>
            <p class="legal">${legalText}</p>
          </footer>
        </main>
      </body>
    </html>
  `);
  reportWindow.document.close();
}


const propertyIncomeData = {
  cityOrder: [
    "臺北市",
    "新北市",
    "桃園市",
    "新竹市",
    "臺中市",
    "臺南市",
    "高雄市",
    "基隆市",
    "新竹縣",
    "苗栗縣",
    "彰化縣",
    "南投縣",
    "雲林縣",
    "嘉義市",
    "嘉義縣",
    "屏東縣",
    "宜蘭縣",
    "花蓮縣",
    "臺東縣",
    "澎湖縣",
    "金門縣",
  ],
  luxuryThresholdWan: {
    "臺北市": 6000,
    "新北市": 4000,
    "桃園市": 3000,
    "新竹縣": 3000,
    "新竹市": 3000,
    "臺中市": 3000,
    "臺南市": 3000,
    "高雄市": 3000,
  },
  defaultLuxuryThresholdWan: 2200,
  luxuryUnitThresholdWan: {
    "臺北市": 120,
    "新北市": 75,
    "桃園市": 50,
    "新竹縣": 50,
    "新竹市": 50,
    "臺中市": 50,
    "臺南市": 50,
    "高雄市": 50,
  },
  defaultLuxuryUnitThresholdWan: 35,
  rates: {
    "臺北市": [
      ["中山區", 50], ["松山區", 50], ["中正區", 50], ["大安區", 50], ["信義區", 50],
      ["士林區", 48], ["內湖區", 48], ["大同區", 48], ["南港區", 48],
      ["北投區", 47], ["萬華區", 47], ["文山區", 47],
    ],
    "新北市": [
      ["板橋區", 47], ["永和區", 47], ["中和區", 47], ["三重區", 47], ["新店區", 47], ["蘆洲區", 47], ["新莊區", 47], ["土城區", 47], ["林口區", 47],
      ["汐止區", 46], ["樹林區", 46], ["泰山區", 41], ["五股區", 39], ["三峽區", 34], ["淡水區", 31], ["八里區", 27], ["深坑區", 25], ["鶯歌區", 24],
      ["萬里區", 23], ["瑞芳區", 23], ["三芝區", 20], ["金山區", 19], ["石碇區", 14], ["烏來區", 14], ["平溪區", 14], ["坪林區", 14], ["石門區", 14], ["雙溪區", 14], ["貢寮區", 14],
    ],
    "桃園市": [
      ["桃園區", 38], ["中壢區", 38], ["八德區", 37], ["蘆竹區", 35], ["龜山區", 35], ["平鎮區", 30], ["楊梅區", 27], ["大園區", 27], ["龍潭區", 23], ["大溪區", 23], ["新屋區", 18], ["觀音區", 16], ["復興區", 8],
    ],
    "臺中市": [
      ["西屯區", 40], ["南屯區", 38], ["南區", 35], ["北屯區", 34], ["西區", 32], ["東區", 32], ["北區", 30], ["太平區", 29], ["中區", 28], ["烏日區", 26], ["大里區", 26],
      ["豐原區", 24], ["潭子區", 23], ["沙鹿區", 23], ["大雅區", 22], ["龍井區", 21], ["大肚區", 21], ["霧峰區", 21], ["后里區", 20], ["神岡區", 20], ["大甲區", 19], ["梧棲區", 18], ["清水區", 17], ["東勢區", 15], ["外埔區", 14], ["新社區", 12], ["大安區", 12], ["石岡區", 10], ["和平區", 8],
    ],
    "臺南市": [
      ["東區", 32], ["安南區", 30], ["北區", 30], ["中西區", 30], ["安平區", 30], ["永康區", 28], ["南區", 28], ["善化區", 26], ["新市區", 26], ["歸仁區", 25], ["仁德區", 25], ["安定區", 24], ["新營區", 21],
      ["官田區", 20], ["西港區", 20], ["麻豆區", 19], ["新化區", 19], ["柳營區", 18], ["佳里區", 18], ["關廟區", 17], ["鹽水區", 16], ["學甲區", 16], ["六甲區", 15], ["玉井區", 14], ["白河區", 12], ["後壁區", 12], ["東山區", 12], ["下營區", 12], ["山上區", 12], ["將軍區", 11], ["七股區", 11], ["龍崎區", 8], ["北門區", 8], ["左鎮區", 8], ["大內區", 8], ["楠西區", 8], ["南化區", 8],
    ],
    "高雄市": [
      ["左營區", 38], ["鼓山區", 38], ["三民區", 38], ["前金區", 37], ["新興區", 36], ["前鎮區", 36], ["苓雅區", 35], ["楠梓區", 33], ["小港區", 33], ["鳳山區", 31],
      ["橋頭區", 27], ["仁武區", 27], ["岡山區", 26], ["鳥松區", 26], ["鹽埕區", 26], ["路竹區", 25], ["燕巢區", 21], ["大社區", 21], ["大樹區", 20], ["梓官區", 20], ["大寮區", 20], ["旗津區", 20], ["湖內區", 18], ["林園區", 17], ["美濃區", 16], ["阿蓮區", 16], ["茄萣區", 15], ["旗山區", 13], ["永安區", 13], ["彌陀區", 13], ["田寮區", 8], ["甲仙區", 8], ["六龜區", 8], ["桃源區", 8], ["茂林區", 8], ["杉林區", 8], ["內門區", 8], ["那瑪夏區", 8],
    ],
    "新竹市": [["東區", 32], ["北區", 32], ["香山區", 32]],
    "嘉義市": [["東區", 25], ["西區", 25]],
    "基隆市": [["仁愛區", 24], ["信義區", 24], ["中正區", 24], ["中山區", 24], ["安樂區", 24], ["暖暖區", 24], ["七堵區", 24]],
    "新竹縣": [["竹北市", 42], ["新埔鎮", 18], ["新豐鄉", 17], ["寶山鄉", 15], ["竹東鎮", 15], ["芎林鄉", 14], ["湖口鄉", 14], ["關西鎮", 12], ["其他", 8]],
    "苗栗縣": [["頭份市", 20], ["竹南鎮", 21], ["後龍鎮", 17], ["苗栗市", 16], ["苑裡鎮", 15], ["造橋鄉", 13], ["銅鑼鄉", 13], ["公館鄉", 12], ["頭屋鄉", 11], ["通霄鎮", 11], ["三義鄉", 11], ["大湖鄉", 10], ["三灣鄉", 9], ["卓蘭鎮", 9], ["南庄鄉", 9], ["獅潭鄉", 9], ["其他", 8]],
    "彰化縣": [["彰化市", 19], ["員林市", 18], ["二林鎮", 17], ["溪湖鎮", 16], ["埔心鄉", 16], ["田中鎮", 15], ["大村鄉", 15], ["永靖鄉", 15], ["溪州鄉", 15], ["秀水鄉", 15], ["和美鎮", 15], ["北斗鎮", 14], ["社頭鄉", 14], ["伸港鄉", 14], ["鹿港鎮", 14], ["福興鄉", 14], ["線西鄉", 13], ["埤頭鄉", 13], ["芬園鄉", 12], ["埔鹽鄉", 12], ["花壇鄉", 12], ["田尾鄉", 12], ["芳苑鄉", 10], ["二水鄉", 10], ["竹塘鄉", 9], ["大城鄉", 9], ["其他", 8]],
    "南投縣": [["南投市", 19], ["埔里鎮", 16], ["草屯鎮", 15], ["鹿谷鄉", 13], ["竹山鎮", 12], ["名間鄉", 12], ["水里鄉", 11], ["集集鎮", 10], ["中寮鄉", 9], ["信義鄉", 9], ["國姓鄉", 9], ["魚池鄉", 9], ["其他", 8]],
    "雲林縣": [["斗六市", 19], ["斗南鎮", 15], ["土庫鎮", 14], ["虎尾鎮", 14], ["莿桐鄉", 13], ["古坑鄉", 13], ["西螺鎮", 13], ["崙背鄉", 13], ["北港鎮", 12], ["麥寮鄉", 12], ["二崙鄉", 12], ["元長鄉", 10], ["大埤鄉", 10], ["林內鄉", 9], ["褒忠鄉", 9], ["口湖鄉", 9], ["水林鄉", 9], ["其他", 8]],
    "嘉義縣": [["太保市", 23], ["朴子市", 21], ["中埔鄉", 18], ["大林鎮", 17], ["民雄鄉", 17], ["水上鄉", 16], ["新港鄉", 13], ["六腳鄉", 13], ["梅山鄉", 11], ["竹崎鄉", 11], ["番路鄉", 11], ["其他", 8]],
    "屏東縣": [["屏東市", 22], ["長治鄉", 19], ["九如鄉", 18], ["萬丹鄉", 18], ["潮州鎮", 18], ["新園鄉", 18], ["東港鎮", 18], ["里港鄉", 17], ["內埔鄉", 17], ["麟洛鄉", 15], ["鹽埔鄉", 15], ["枋寮鄉", 15], ["竹田鄉", 13], ["萬巒鄉", 12], ["崁頂鄉", 12], ["佳冬鄉", 12], ["恆春鎮", 12], ["琉球鄉", 12], ["高樹鄉", 11], ["南州鄉", 11], ["林邊鄉", 11], ["車城鄉", 11], ["其他", 8]],
    "宜蘭縣": [["宜蘭市", 18], ["羅東鎮", 15], ["員山鄉", 15], ["礁溪鄉", 14], ["頭城鎮", 14], ["三星鄉", 14], ["五結鄉", 13], ["壯圍鄉", 13], ["冬山鄉", 12], ["蘇澳鎮", 12], ["其他", 8]],
    "花蓮縣": [["花蓮市", 17], ["吉安鄉", 13], ["新城鄉", 13], ["壽豐鄉", 12], ["玉里鎮", 10], ["鳳林鎮", 9], ["其他", 8]],
    "臺東縣": [["臺東市", 18], ["卑南鄉", 10], ["成功鎮", 9], ["太麻里鄉", 9], ["其他", 8]],
    "澎湖縣": [["馬公市", 15], ["其他", 8]],
    "金門縣": [["金寧鄉", 15], ["金湖鎮", 14], ["金城鎮", 14], ["烈嶼鄉", 12], ["烏坵鄉", 12], ["金沙鎮", 12], ["其他", 8]],
  },
};

function getPropertyLuxuryThreshold(city) {
  return propertyIncomeData.luxuryThresholdWan[city] || propertyIncomeData.defaultLuxuryThresholdWan;
}

function getPropertyLuxuryUnitThreshold(city) {
  return propertyIncomeData.luxuryUnitThresholdWan[city] || propertyIncomeData.defaultLuxuryUnitThresholdWan;
}

function getPropertyRate(city, district) {
  const districts = propertyIncomeData.rates[city] || [];
  return districts.find(([name]) => name === district) || districts.find(([name]) => name === "其他") || null;
}

function setupPropertyDateSelects() {
  const currentRocYear = new Date().getFullYear() - 1911;
  const years = Array.from({ length: 115 }, (_, index) => currentRocYear - index);
  const months = Array.from({ length: 12 }, (_, index) => index + 1);
  const days = Array.from({ length: 31 }, (_, index) => index + 1);

  fillSelect($("propertyAcquireYear"), years, "年");
  fillSelect($("propertyAcquireMonth"), months, "月");
  fillSelect($("propertyAcquireDay"), days, "日");
}

function propertyAcquireDate() {
  if (!$("propertyAcquireYear").value || !$("propertyAcquireMonth").value || !$("propertyAcquireDay").value) {
    return null;
  }
  const year = Math.floor(number("propertyAcquireYear")) + 1911;
  const month = Math.min(12, Math.max(1, Math.floor(number("propertyAcquireMonth"))));
  const day = Math.min(31, Math.max(1, Math.floor(number("propertyAcquireDay"))));
  return new Date(year, month - 1, day);
}

function updatePropertyDistrictOptions() {
  const city = $("propertyCity").value;
  const districts = propertyIncomeData.rates[city] || [];
  fillSelect($("propertyDistrict"), districts.map(([name]) => name), "請選擇");
}

function calculatePropertyIncome() {
  const city = $("propertyCity").value;
  const district = $("propertyDistrict").value;
  const rateInfo = getPropertyRate(city, district);
  const salePriceWan = number("propertySalePriceWan");
  const salePrice = salePriceWan * 10000;
  const assessedValue = number("propertyAssessedValue");
  const hasLocation = Boolean(city && district && rateInfo);
  const thresholdWan = hasLocation ? getPropertyLuxuryThreshold(city) : 0;
  const unitThresholdWan = hasLocation ? getPropertyLuxuryUnitThreshold(city) : 0;
  const isLuxury = hasLocation && salePriceWan >= thresholdWan && salePriceWan > 0;
  const acquireDate = propertyAcquireDate();
  const newSystemStart = new Date(2016, 0, 1);
  const isNewSystem = acquireDate && acquireDate >= newSystemStart;
  const rate = rateInfo ? rateInfo[1] : 0;

  $("propertyRate").textContent = rateInfo ? String(rate) + "%" : "0%";
  $("propertyRateNote").textContent = rateInfo
    ? city + district + "依房屋評定現值之 " + rate + "% 計算財產交易所得。"
    : "請選擇縣市與地區。";
  $("luxuryThreshold").innerHTML = hasLocation
    ? '<span class="threshold-line"><small>總價</small>' +
      thresholdWan.toLocaleString("zh-TW") +
      ' 萬元以上</span><span class="threshold-line"><small>每坪</small>' +
      unitThresholdWan.toLocaleString("zh-TW") +
      " 萬元以上</span>"
    : "請先選擇縣市及地區";
  $("propertySalePrice").textContent = money(salePrice);
  $("propertyEstimatedIncome").textContent = money(assessedValue * (rate / 100));
  $("propertySystemStatus").textContent = isNewSystem ? "可能適用新制" : acquireDate ? "舊制可參考" : "待判斷";

  $("luxuryWarning").hidden = !isLuxury;
  $("luxuryWarningText").textContent = isLuxury
    ? (city || "所選地區") + "總成交價格已達 " + money(thresholdWan * 10000) + " 高價房屋門檻，若無法證明原始取得成本，可能需按實際房地總成交金額歸屬房屋收入之 20% 計算所得額。"
    : "";
  $("newSystemWarning").hidden = !isNewSystem;
}

function setupPropertyIncomePage() {
  fillSelect($("propertyCity"), propertyIncomeData.cityOrder, "請選擇");
  setupPropertyDateSelects();
  updatePropertyDistrictOptions();

  $("propertyCity").addEventListener("change", () => {
    updatePropertyDistrictOptions();
    calculatePropertyIncome();
  });

  ["propertyDistrict", "propertySalePriceWan", "propertyAssessedValue", "propertyAcquireYear", "propertyAcquireMonth", "propertyAcquireDay"].forEach((id) => {
    $(id).addEventListener("input", calculatePropertyIncome);
    $(id).addEventListener("change", calculatePropertyIncome);
  });

  calculatePropertyIncome();
}


document.querySelectorAll("input, select").forEach((input) => {
  input.addEventListener("input", calculate);
  input.addEventListener("change", calculate);
});



document.querySelectorAll("[data-tax-tab]").forEach((button) => {
  button.addEventListener("click", () => setTaxTab(button.dataset.taxTab));
});

$("resetButton").addEventListener("click", resetForm);
$("pdfButton").addEventListener("click", handlePdfButtonClick);

expenseMode = "actual";
setupDateSelects();
setupPropertyIncomePage();
const shouldAutoGeneratePdf = restorePdfFormState();
calculate();
if (shouldAutoGeneratePdf) {
  setTimeout(generatePdfReport, 650);
}
