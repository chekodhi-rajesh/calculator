const currentDisplay = document.querySelector("#current");
const previousDisplay = document.querySelector("#previous");
const keys = document.querySelector(".keys");

let currentValue = "0";
let storedValue = null;
let pendingOperator = null;
let shouldReplace = false;

const symbols = { "/": "÷", "*": "×", "-": "−", "+": "+" };

function render() {
  currentDisplay.textContent = currentValue;
  previousDisplay.textContent = storedValue !== null && pendingOperator
    ? `${storedValue} ${symbols[pendingOperator]}`
    : "";
}

function enterDigit(digit) {
  if (currentValue === "Error" || shouldReplace) {
    currentValue = digit;
    shouldReplace = false;
  } else if (currentValue === "0") {
    currentValue = digit;
  } else if (currentValue.replace("-", "").replace(".", "").length < 12) {
    currentValue += digit;
  }
  render();
}

function calculate(left, right, operator) {
  switch (operator) {
    case "+": return left + right;
    case "-": return left - right;
    case "*": return left * right;
    case "/": return right === 0 ? null : left / right;
    default: return right;
  }
}

function formatResult(value) {
  if (!Number.isFinite(value)) return "Error";
  return String(Number(value.toPrecision(10)));
}

function chooseOperator(operator) {
  if (currentValue === "Error") return;
  if (storedValue !== null && pendingOperator && shouldReplace) {
    pendingOperator = operator;
    render();
    return;
  }
  const input = Number(currentValue);
  if (storedValue !== null && pendingOperator && !shouldReplace) {
    const result = calculate(storedValue, input, pendingOperator);
    if (result === null) {
      currentValue = "Error";
      storedValue = null;
      pendingOperator = null;
      shouldReplace = true;
      render();
      return;
    }
    currentValue = formatResult(result);
  }
  storedValue = Number(currentValue);
  pendingOperator = operator;
  currentValue = "0";
  shouldReplace = true;
  render();
}

function equals() {
  if (storedValue === null || !pendingOperator || currentValue === "Error") return;
  const result = calculate(storedValue, Number(currentValue), pendingOperator);
  previousDisplay.textContent = `${storedValue} ${symbols[pendingOperator]} ${currentValue} =`;
  currentValue = result === null ? "Error" : formatResult(result);
  storedValue = null;
  pendingOperator = null;
  shouldReplace = true;
  currentDisplay.textContent = currentValue;
}

function handleAction(action) {
  if (action === "clear") {
    currentValue = "0";
    storedValue = null;
    pendingOperator = null;
    shouldReplace = false;
  } else if (action === "decimal") {
    if (currentValue === "Error" || shouldReplace) {
      currentValue = "0.";
      shouldReplace = false;
    } else if (!currentValue.includes(".")) {
      currentValue += ".";
    }
  } else if (action === "sign" && currentValue !== "Error" && Number(currentValue) !== 0) {
    currentValue = currentValue.startsWith("-") ? currentValue.slice(1) : `-${currentValue}`;
  } else if (action === "percent" && currentValue !== "Error") {
    currentValue = formatResult(Number(currentValue) / 100);
    shouldReplace = true;
  } else if (action === "equals") {
    equals();
    return;
  }
  render();
}

function backspace() {
  if (currentValue === "Error" || shouldReplace) {
    currentValue = "0";
    shouldReplace = false;
  } else {
    currentValue = currentValue.length > 1
      ? currentValue.slice(0, -1)
      : "0";
    if (currentValue === "-") currentValue = "0";
  }
  render();
}

keys.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  if (button.dataset.digit !== undefined) enterDigit(button.dataset.digit);
  else if (button.dataset.operator) chooseOperator(button.dataset.operator);
  else if (button.dataset.action) handleAction(button.dataset.action);
});

document.addEventListener("keydown", (event) => {
  if (/^[0-9]$/.test(event.key)) enterDigit(event.key);
  else if (event.key === ".") handleAction("decimal");
  else if (["+", "-", "*", "/"].includes(event.key)) chooseOperator(event.key);
  else if (event.key === "Enter" || event.key === "=") {
    event.preventDefault();
    equals();
  } else if (event.key === "Backspace") backspace();
  else if (event.key === "Escape") handleAction("clear");
  else if (event.key === "%") handleAction("percent");
});
