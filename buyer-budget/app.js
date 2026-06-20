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
  document.title = `自備款可購總價試算_${new Date().toLocaleDateString("zh-TW").replaceAll("/", "-")}`;
  window.print();
});

calculate();
