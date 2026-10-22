
const STORAGE_KEY = "expenseflow-expenses";
const THEME_KEY = "expenseflow-theme";
const BUDGET_KEY = "expenseflow-budget";

const expenseForm = document.getElementById("expense-form");
const expenseTitle = document.getElementById("expense-title");
const expenseAmount = document.getElementById("expense-amount");
const expenseCategory = document.getElementById("expense-category");
const expenseDate = document.getElementById("expense-date");
const expenseList = document.getElementById("expense-list");
const formHeading = document.getElementById("form-heading");
const formMessage = document.getElementById("form-message");
const saveExpenseButton = document.getElementById("save-expense-button");
const cancelEditButton = document.getElementById("cancel-edit-button");
const searchInput = document.getElementById("expense-search");
const categoryFilter = document.getElementById("category-filter");
const monthFilter = document.getElementById("month-filter");
const sortOrder = document.getElementById("sort-order");
const themeToggle = document.getElementById("theme-toggle");
const monthlyTotal = document.getElementById("monthly-total");
const expenseCount = document.getElementById("expense-count");
const budgetTotal = document.getElementById("budget-total");
const categoryTotals = document.getElementById("category-totals");
const monthlyBudgetInput = document.getElementById("monthly-budget");
const saveBudgetButton = document.getElementById("save-budget");
const budgetMessage = document.getElementById("budget-message");
const budgetAlert = document.getElementById("budget-alert");
const exportButton = document.getElementById("export-expenses");
const addExpenseShortcut = document.getElementById("add-expense-shortcut");

let expenses = loadExpenses();
let editingId = null;
let monthlyBudget = loadBudget();

function loadExpenses() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(saved) ? saved.filter((expense) =>
      expense &&
      typeof expense.id === "string" &&
      typeof expense.title === "string" &&
      Number.isFinite(Number(expense.amount)) &&
      typeof expense.category === "string" &&
      typeof expense.date === "string"
    ).map((expense) => ({
      ...expense,
      amount: Number(expense.amount)
    })) : [];
  } catch {
    return [];
  }
}

function loadBudget() {
  try {
    const saved = Number(localStorage.getItem(BUDGET_KEY));
    return Number.isFinite(saved) && saved > 0 ? saved : 0;
  } catch {
    return 0;
  }
}

function saveExpenses() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
}

function formatMoney(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2
  }).format(amount);
}

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function getSelectedMonth() {
  return monthFilter.value || getCurrentMonth();
}

function getMonthlyExpenses(month = getCurrentMonth()) {
  return expenses.filter((expense) => expense.date.startsWith(month));
}

function getFilteredExpenses() {
  const searchTerm = searchInput.value.trim().toLowerCase();
  const selectedCategory = categoryFilter.value;
  const selectedMonth = monthFilter.value;
  const order = sortOrder.value;

  const filtered = expenses.filter((expense) => {
    const matchesSearch =
      expense.title.toLowerCase().includes(searchTerm) ||
      expense.category.toLowerCase().includes(searchTerm);

    const matchesCategory =
      !selectedCategory || expense.category === selectedCategory;

    const matchesMonth =
      !selectedMonth || expense.date.startsWith(selectedMonth);

    return matchesSearch && matchesCategory && matchesMonth;
  });

  filtered.sort((a, b) => {
    if (order === "amount-asc") return a.amount - b.amount;
    if (order === "amount-desc") return b.amount - a.amount;
    if (order === "date-asc") return a.date.localeCompare(b.date);
    return b.date.localeCompare(a.date);
  });

  return filtered;
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function renderExpenses() {
  const filtered = getFilteredExpenses();

  if (filtered.length === 0) {
    expenseList.innerHTML = `
      <tr>
        <td colspan="5" class="empty-state">No expenses found. Add an expense or change your filters.</td>
      </tr>
    `;
  } else {
    expenseList.innerHTML = filtered.map((expense) => `
      <tr>
        <td>${escapeHTML(expense.title)}</td>
        <td>${escapeHTML(expense.category)}</td>
        <td>${escapeHTML(expense.date)}</td>
        <td>${formatMoney(expense.amount)}</td>
        <td>
          <div class="row-actions">
            <button type="button" class="action-button" data-action="edit" data-id="${escapeHTML(expense.id)}">Edit</button>
            <button type="button" class="action-button delete" data-action="delete" data-id="${escapeHTML(expense.id)}">Delete</button>
          </div>
        </td>
      </tr>
    `).join("");
  }

  renderSummary();
  renderCategoryTotals();
}

function renderSummary() {
  const monthExpenses = getMonthlyExpenses();
  const total = monthExpenses.reduce((sum, expense) => sum + expense.amount, 0);

  monthlyTotal.textContent = formatMoney(total);
  expenseCount.textContent = String(monthExpenses.length);
  budgetTotal.textContent = monthlyBudget > 0 ? formatMoney(monthlyBudget) : "Not set";

  if (monthlyBudget > 0 && total > monthlyBudget) {
    budgetAlert.textContent = `Budget exceeded by ${formatMoney(total - monthlyBudget)} this month.`;
    budgetAlert.hidden = false;
  } else if (monthlyBudget > 0 && total >= monthlyBudget * 0.8) {
    budgetAlert.textContent = `You have used ${Math.round((total / monthlyBudget) * 100)}% of your monthly budget.`;
    budgetAlert.hidden = false;
  } else {
    budgetAlert.textContent = "";
    budgetAlert.hidden = true;
  }
}

function renderCategoryTotals() {
  const totals = {};

  getMonthlyExpenses().forEach((expense) => {
    totals[expense.category] = (totals[expense.category] || 0) + expense.amount;
  });

  const entries = Object.entries(totals).sort((a, b) => b[1] - a[1]);

  if (entries.length === 0) {
    categoryTotals.innerHTML = '<p class="empty-state">Category totals will appear here.</p>';
    return;
  }

  categoryTotals.innerHTML = entries.map(([category, total]) => `
    <div class="category-item">
      <span class="category-name">${escapeHTML(category)}</span>
      <span class="category-amount">${formatMoney(total)}</span>
    </div>
  `).join("");
}

function showFormMessage(message, isError = false) {
  formMessage.textContent = message;
  formMessage.setAttribute("role", "status");
  formMessage.style.color = isError ? "var(--danger)" : "var(--success)";
}

function resetForm() {
  expenseForm.reset();
  editingId = null;
  formHeading.textContent = "Add an expense";
  saveExpenseButton.textContent = "Save expense";
  cancelEditButton.hidden = true;
  formMessage.textContent = "";
  expenseDate.value = new Date().toISOString().slice(0, 10);
}

function handleFormSubmit(event) {
  event.preventDefault();

  const title = expenseTitle.value.trim();
  const amount = Number(expenseAmount.value);
  const category = expenseCategory.value;
  const date = expenseDate.value;

  if (title.length < 2 || title.length > 60) {
    showFormMessage("Title must contain between 2 and 60 characters.", true);
    return;
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    showFormMessage("Enter an amount greater than zero.", true);
    return;
  }

  if (!category || !date) {
    showFormMessage("Please complete every field.", true);
    return;
  }

  if (editingId) {
    expenses = expenses.map((expense) =>
      expense.id === editingId
        ? { ...expense, title, amount, category, date }
        : expense
    );
    showFormMessage("Expense updated successfully.");
  } else {
    expenses.push({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      title,
      amount,
      category,
      date
    });
    showFormMessage("Expense added successfully.");
  }

  saveExpenses();
  resetForm();
  renderExpenses();
}

function startEditing(id) {
  const expense = expenses.find((item) => item.id === id);
  if (!expense) return;

  editingId = id;
  expenseTitle.value = expense.title;
  expenseAmount.value = expense.amount;
  expenseCategory.value = expense.category;
  expenseDate.value = expense.date;
  formHeading.textContent = "Edit expense";
  saveExpenseButton.textContent = "Update expense";
  cancelEditButton.hidden = false;
  formMessage.textContent = "";

  document.getElementById("expense-form-panel").scrollIntoView({
    behavior: "smooth",
    block: "start"
  });

  expenseTitle.focus();
}

function deleteExpense(id) {
  const expense = expenses.find((item) => item.id === id);
  if (!expense) return;

  if (!window.confirm(`Delete "${expense.title}"? This cannot be undone.`)) {
    return;
  }

  expenses = expenses.filter((item) => item.id !== id);
  saveExpenses();

  if (editingId === id) resetForm();

  renderExpenses();
}

function handleExpenseListClick(event) {
  const button = event.target.closest("button[data-action]");
  if (!button || !expenseList.contains(button)) return;

  const { action, id } = button.dataset;

  if (action === "edit") startEditing(id);
  if (action === "delete") deleteExpense(id);
}

function applyTheme(theme) {
  document.body.classList.toggle("dark-theme", theme === "dark");
  themeToggle.textContent = theme === "dark" ? "Switch to light mode" : "Switch to dark mode";
  themeToggle.setAttribute("aria-pressed", String(theme === "dark"));
}

function initializeTheme() {
  let savedTheme = "light";

  try {
    savedTheme = localStorage.getItem(THEME_KEY) || "light";
  } catch {
    savedTheme = "light";
  }

  applyTheme(savedTheme === "dark" ? "dark" : "light");
}

function saveMonthlyBudget() {
  const value = Number(monthlyBudgetInput.value);

  if (!Number.isFinite(value) || value <= 0) {
    budgetMessage.textContent = "Enter a budget greater than zero.";
    budgetMessage.style.color = "var(--danger)";
    return;
  }

  monthlyBudget = value;
  localStorage.setItem(BUDGET_KEY, String(monthlyBudget));
  budgetMessage.textContent = "Monthly budget saved.";
  budgetMessage.style.color = "var(--success)";
  renderSummary();
}

function exportExpenses() {
  const rows = [
    ["Title", "Amount", "Category", "Date"],
    ...getFilteredExpenses().map((expense) => [
      expense.title,
      expense.amount.toFixed(2),
      expense.category,
      expense.date
    ])
  ];

  const csv = rows.map((row) =>
    row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")
  ).join("\r\n");

  const blob = new Blob(["\uFEFF", csv], {
    type: "text/csv;charset=utf-8;"
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "expenseflow-expenses.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

expenseForm.addEventListener("submit", handleFormSubmit);
expenseList.addEventListener("click", handleExpenseListClick);
cancelEditButton.addEventListener("click", resetForm);

searchInput.addEventListener("input", renderExpenses);
categoryFilter.addEventListener("change", renderExpenses);
monthFilter.addEventListener("change", renderExpenses);
sortOrder.addEventListener("change", renderExpenses);

themeToggle.addEventListener("click", () => {
  const nextTheme = document.body.classList.contains("dark-theme") ? "light" : "dark";
  applyTheme(nextTheme);

  try {
    localStorage.setItem(THEME_KEY, nextTheme);
  } catch {
    return;
  }
});

saveBudgetButton.addEventListener("click", saveMonthlyBudget);
exportButton.addEventListener("click", exportExpenses);

addExpenseShortcut.addEventListener("click", () => {
  document.getElementById("expense-form-panel").scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
  expenseTitle.focus();
});

monthlyBudgetInput.value = monthlyBudget > 0 ? String(monthlyBudget) : "";
expenseDate.value = new Date().toISOString().slice(0, 10);
initializeTheme();
renderExpenses();
