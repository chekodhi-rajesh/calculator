const currentDisplay = document.querySelector("#current");
const previousDisplay = document.querySelector("#previous");
const keys = document.querySelector(".keys");
const historyPanel = document.querySelector("#history-panel");
const historyList = document.querySelector("#history-list");
const historyEmpty = document.querySelector("#history-empty");
const saveStatus = document.querySelector("#save-status");

let currentValue = "0";
let storedValue = null;
let pendingOperator = null;
let shouldReplace = false;

const symbols = { "/": "÷", "*": "×", "-": "−", "+": "+" };

function openHistoryDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("calculator-history", 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore("calculations", { keyPath: "id", autoIncrement: true });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("Close other calculator tabs to open local history."));
  });
}

function renderHistory(entries) {
  historyList.replaceChildren();
  historyEmpty.hidden = entries.length !== 0;
  for (const entry of entries) {
    const item = document.createElement("li");
    const expression = document.createElement("span");
    const result = document.createElement("strong");
    const date = document.createElement("span");
    expression.textContent = entry.expression;
    result.textContent = entry.result;
    date.textContent = new Date(entry.createdAt).toLocaleString();
    item.append(expression, result, date);
    historyList.append(item);
  }
}

function getHistory() {
  return openHistoryDatabase().then((db) => new Promise((resolve, reject) => {
    const transaction = db.transaction("calculations", "readonly");
    const request = transaction.objectStore("calculations").getAll();
    request.onsuccess = () => resolve(request.result.sort((left, right) => right.id - left.id));
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => db.close();
    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  }));
}

function loadHistory() {
  return getHistory().then(renderHistory);
}

function saveCalculation(left, operator, right, result) {
  return openHistoryDatabase().then((db) => new Promise((resolve, reject) => {
    const transaction = db.transaction("calculations", "readwrite");
    const store = transaction.objectStore("calculations");
    store.add({
      expression: `${left} ${symbols[operator]} ${right} =`,
      result,
      createdAt: new Date().toISOString(),
    });
    store.count().onsuccess = (event) => {
      const excessEntries = event.target.result - 100;
      if (excessEntries <= 0) return;
      let deletedEntries = 0;
      const cursorRequest = store.openCursor();
      cursorRequest.onsuccess = (cursorEvent) => {
        const cursor = cursorEvent.target.result;
        if (!cursor || deletedEntries >= excessEntries) return;
        cursor.delete();
        deletedEntries += 1;
        cursor.continue();
      };
    };
    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
    transaction.onabort = () => {
      db.close();
      reject(transaction.error || new Error("Could not save this calculation."));
    };
  })).then(loadHistory).then(() => {
    saveStatus.textContent = "";
  }).catch((error) => {
    saveStatus.textContent = `Calculation was not saved: ${error.message}`;
  });
}

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
  const left = storedValue;
  const right = currentValue;
  const operator = pendingOperator;
  const result = calculate(storedValue, Number(currentValue), pendingOperator);
  previousDisplay.textContent = `${storedValue} ${symbols[pendingOperator]} ${currentValue} =`;
  currentValue = result === null ? "Error" : formatResult(result);
  storedValue = null;
  pendingOperator = null;
  shouldReplace = true;
  currentDisplay.textContent = currentValue;
  if (result !== null && currentValue !== "Error") {
    void saveCalculation(left, operator, right, currentValue);
  }
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
  if (event.target instanceof HTMLInputElement || event.target.isContentEditable) return;
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

void loadHistory().catch((error) => {
  saveStatus.textContent = `History is unavailable: ${error.message}`;
});
