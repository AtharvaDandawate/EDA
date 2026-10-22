
"use strict";

const STORAGE_KEY = "expenseflow-expenses";
const THEME_KEY = "expenseflow-theme";

const expenseForm = document.querySelector("#expense-form");
const expenseTitle = document.querySelector("#expense-title");
const expenseAmount = document.querySelector("#expense-amount");
const expenseCategory = document.querySelector("#expense-category");
const expenseDate = document.querySelector("#expense-date");
const expenseList = document.querySelector("#expense-list");
const formMessage = document.querySelector("#form-message");
const monthlyTotal = document.querySelector("#monthly-total");
const expenseCount = document.querySelector("#expense-count");
const themeToggle = document.querySelector("#theme-toggle");
const addExpenseShortcut = document.querySelector("#add-expense-shortcut");
const searchInput = document.querySelector("#expense-search");
const categoryFilter = document.querySelector("#category-filter");
const sortOrder = document.querySelector("#sort-order");

function getLocalDate() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function loadExpenses() {
  try {
    const savedExpenses = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(savedExpenses) ? savedExpenses : [];
  } catch {
    return [];
  }
}

let expenses = loadExpenses();
expenseDate.value = getLocalDate();

function saveExpenses() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
}

function formatMoney(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2
  }).format(amount);
}

function showMessage(message) {
  formMessage.textContent = message;
}

function createCell(value) {
  const cell = document.createElement("td");
  cell.textContent = value;
  return cell;
}

function updateSummary() {
  const currentMonth = getLocalDate().slice(0, 7);

  const total = expenses
    .filter((expense) => expense.date.startsWith(currentMonth))
    .reduce((sum, expense) => sum + expense.amount, 0);

  monthlyTotal.textContent = formatMoney(total);
  expenseCount.textContent = String(expenses.length);
}

function renderExpenses() {
  const searchTerm = searchInput.value.trim().toLowerCase();
  const selectedCategory = categoryFilter.value;
  const selectedSort = sortOrder.value;

  const visibleExpenses = expenses.filter((expense) => {
    const matchesSearch =
      expense.title.toLowerCase().includes(searchTerm) ||
      expense.category.toLowerCase().includes(searchTerm);

    const matchesCategory =
      selectedCategory === "" || expense.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  visibleExpenses.sort((a, b) => {
    if (selectedSort === "oldest") {
      return a.date.localeCompare(b.date);
    }

    if (selectedSort === "highest") {
      return b.amount - a.amount;
    }

    if (selectedSort === "lowest") {
      return a.amount - b.amount;
    }

    return b.date.localeCompare(a.date);
  });

  expenseList.replaceChildren();

  if (visibleExpenses.length === 0) {
    const row = document.createElement("tr");
    const cell = createCell(
      expenses.length === 0
        ? "No expenses yet. Add your first expense."
        : "No expenses match your search or filter."
    );

    cell.colSpan = 5;
    row.appendChild(cell);
    expenseList.appendChild(row);
  } else {
    visibleExpenses.forEach((expense) => {
      const row = document.createElement("tr");

      row.appendChild(createCell(expense.title));
      row.appendChild(createCell(expense.category));
      row.appendChild(createCell(expense.date));
      row.appendChild(createCell(formatMoney(expense.amount)));

      const actionsCell = createCell("Actions will be added next");
      row.appendChild(actionsCell);
      expenseList.appendChild(row);
    });
  }

  updateSummary();
}

expenseForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const title = expenseTitle.value.trim();
  const amount = Number(expenseAmount.value);
  const category = expenseCategory.value;
  const date = expenseDate.value;

  if (title.length < 2) {
    showMessage("Please enter an expense name with at least 2 characters.");
    expenseTitle.focus();
    return;
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    showMessage("Please enter an amount greater than zero.");
    expenseAmount.focus();
    return;
  }

  if (!category || !date) {
    showMessage("Please select a category and date.");
    return;
  }

  expenses.push({
    id: crypto.randomUUID(),
    title,
    amount,
    category,
    date
  });

  saveExpenses();
  renderExpenses();

  expenseForm.reset();
  expenseDate.value = getLocalDate();
  showMessage("Expense saved successfully.");
  expenseTitle.focus();
});

searchInput.addEventListener("input", renderExpenses);
categoryFilter.addEventListener("change", renderExpenses);
sortOrder.addEventListener("change", renderExpenses);

addExpenseShortcut.addEventListener("click", () => {
  expenseTitle.focus();
  document.querySelector("#expense-form-panel").scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
});

function applyTheme(theme) {
  document.body.classList.toggle("dark-theme", theme === "dark");
  themeToggle.textContent = theme === "dark" ? "☀" : "☾";
  themeToggle.setAttribute(
    "aria-label",
    theme === "dark" ? "Switch to light theme" : "Switch to dark theme"
  );
}

applyTheme(localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light");

themeToggle.addEventListener("click", () => {
  const nextTheme = document.body.classList.contains("dark-theme")
    ? "light"
    : "dark";

  applyTheme(nextTheme);
  localStorage.setItem(THEME_KEY, nextTheme);
});

renderExpenses();
