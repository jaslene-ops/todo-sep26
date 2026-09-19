const STORAGE_KEY = "todo-tasks";
const THEME_KEY = "todo-theme";
const MAX_TASK_LENGTH = 500;
const MAX_TASKS = 1000;
const VALID_PRIORITIES = ["low", "medium", "high"];

const form = document.getElementById("add-form");
const input = document.getElementById("task-input");
const dueDateInput = document.getElementById("due-date-input");
const priorityInput = document.getElementById("priority-input");
const list = document.getElementById("task-list");
const count = document.getElementById("count");
const themeToggle = document.getElementById("theme-toggle");
const filterButtons = document.querySelectorAll(".filter-btn");
const clearCompletedBtn = document.getElementById("clear-completed");
const searchInput = document.getElementById("search-input");

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };

let tasks = loadTasks();
let filter = "all";
let searchQuery = "";

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function isValidTask(task) {
  return (
    task &&
    typeof task.id !== "undefined" &&
    typeof task.text === "string" &&
    task.text.length > 0 &&
    task.text.length <= MAX_TASK_LENGTH &&
    typeof task.done === "boolean" &&
    VALID_PRIORITIES.includes(task.priority) &&
    (task.dueDate === undefined || task.dueDate === null || typeof task.dueDate === "string")
  );
}

function loadTasks() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!Array.isArray(data)) return [];
    return data.filter(isValidTask);
  } catch {
    return [];
  }
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function getDueDateStatus(dueDate) {
  if (!dueDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const diff = due - today;

  if (diff < 0) return "overdue";
  if (diff === 0) return "today";
  return "upcoming";
}

function getVisibleTasks() {
  const filtered = tasks.filter((t) => {
    const statusMatch = filter === "all" ? true : filter === "active" ? !t.done : t.done;
    const searchMatch = searchQuery === "" || t.text.toLowerCase().includes(searchQuery.toLowerCase());
    return statusMatch && searchMatch;
  });

  return filtered.slice().sort((a, b) => {
    const statusA = getDueDateStatus(a.dueDate);
    const statusB = getDueDateStatus(b.dueDate);

    const dueDateOrder = { overdue: 0, today: 1, upcoming: 2, null: 3 };
    const statusOrderA = dueDateOrder[statusA];
    const statusOrderB = dueDateOrder[statusB];

    if (statusOrderA !== statusOrderB) return statusOrderA - statusOrderB;

    if (statusA && statusB && a.dueDate && b.dueDate) {
      const dateA = new Date(a.dueDate);
      const dateB = new Date(b.dueDate);
      if (dateA - dateB !== 0) return dateA - dateB;
    }

    return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
  });
}

function formatDueDate(dueDate) {
  if (!dueDate) return null;
  const date = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(date);
  due.setHours(0, 0, 0, 0);

  const diff = due - today;
  const daysFromNow = Math.ceil(diff / (1000 * 60 * 60 * 24));

  if (daysFromNow < 0) return `Overdue: ${date.toLocaleDateString()}`;
  if (daysFromNow === 0) return "Due today";
  if (daysFromNow === 1) return "Due tomorrow";
  return `Due: ${date.toLocaleDateString()}`;
}

function render() {
  list.innerHTML = "";
  getVisibleTasks().forEach((task) => {
    const li = document.createElement("li");
    li.className = task.done ? "done" : "";
    li.setAttribute("data-id", task.id);

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = task.done;
    checkbox.addEventListener("change", () => toggleTask(task.id));

    const badge = document.createElement("span");
    badge.className = `priority-badge priority-${task.priority}`;
    badge.textContent = task.priority;

    const taskInfo = document.createElement("div");
    taskInfo.className = "task-info";

    const text = document.createElement("span");
    text.className = "text";
    text.textContent = task.text;
    text.title = "Double-click to edit";
    text.addEventListener("dblclick", () => startEditing(task.id, li, text));

    taskInfo.appendChild(text);

    if (task.dueDate) {
      const dueSpan = document.createElement("span");
      dueSpan.className = "due-date";
      const status = getDueDateStatus(task.dueDate);
      if (status) dueSpan.classList.add(status);
      dueSpan.textContent = formatDueDate(task.dueDate);
      taskInfo.appendChild(dueSpan);
    }

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "delete";
    deleteBtn.textContent = "✕";
    deleteBtn.addEventListener("click", () => deleteTask(task.id));

    li.append(checkbox, badge, taskInfo, deleteBtn);
    list.appendChild(li);
  });

  const remaining = tasks.filter((t) => !t.done).length;
  count.textContent = tasks.length
    ? `${remaining} of ${tasks.length} remaining`
    : "";
}

function startEditing(id, li, textEl) {
  const editInput = document.createElement("input");
  editInput.type = "text";
  editInput.className = "edit-input";
  editInput.value = textEl.textContent;

  li.replaceChild(editInput, textEl);
  editInput.focus();
  editInput.select();

  const finish = (save) => {
    if (save) {
      const value = editInput.value.trim();
      if (value) editTask(id, value);
      else render();
    } else {
      render();
    }
  };

  editInput.addEventListener("blur", () => finish(true));
  editInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") finish(true);
    if (e.key === "Escape") finish(false);
  });
}

function addTask(text, priority, dueDate) {
  text = text.trim();
  if (!VALID_PRIORITIES.includes(priority)) {
    console.error("Invalid priority:", priority);
    return;
  }
  if (!text || text.length > MAX_TASK_LENGTH) {
    alert(`Task must be 1-${MAX_TASK_LENGTH} characters`);
    return;
  }
  if (tasks.length >= MAX_TASKS) {
    alert(`Maximum ${MAX_TASKS} tasks allowed`);
    return;
  }
  tasks.push({ id: generateId(), text, done: false, priority, dueDate: dueDate || null });
  saveTasks();
  render();
}

function toggleTask(id) {
  const task = tasks.find((t) => t.id === id);
  if (task) task.done = !task.done;
  saveTasks();
  render();
}

function deleteTask(id) {
  const li = list.querySelector(`li[data-id="${id}"]`);
  if (li) {
    li.classList.add("removing");
    setTimeout(() => {
      tasks = tasks.filter((t) => t.id !== id);
      saveTasks();
      render();
    }, 300);
  } else {
    tasks = tasks.filter((t) => t.id !== id);
    saveTasks();
    render();
  }
}

function editTask(id, text) {
  text = text.trim();
  if (!text || text.length > MAX_TASK_LENGTH) {
    console.error("Invalid task text length");
    return;
  }
  const task = tasks.find((t) => t.id === id);
  if (task) {
    task.text = text;
    saveTasks();
    render();
  }
}

function clearCompleted() {
  tasks = tasks.filter((t) => !t.done);
  saveTasks();
  render();
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = input.value.trim();
  const priority = priorityInput.value;
  const dueDate = dueDateInput.value;

  if (!text) return;
  if (text.length > MAX_TASK_LENGTH) {
    alert(`Task must be 1-${MAX_TASK_LENGTH} characters`);
    return;
  }
  if (!VALID_PRIORITIES.includes(priority)) {
    alert("Invalid priority selected");
    return;
  }

  addTask(text, priority, dueDate);
  input.value = "";
  dueDateInput.value = "";
  input.focus();
});

function applyTheme(theme) {
  if (theme === "dark") {
    document.documentElement.setAttribute("data-theme", "dark");
    themeToggle.textContent = "☀️";
  } else {
    document.documentElement.removeAttribute("data-theme");
    themeToggle.textContent = "🌙";
  }
}

function loadTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved) return saved;
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

themeToggle.addEventListener("click", () => {
  const current = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
  const next = current === "dark" ? "light" : "dark";
  localStorage.setItem(THEME_KEY, next);
  applyTheme(next);
});

filterButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    filter = btn.dataset.filter;
    filterButtons.forEach((b) => b.classList.toggle("active", b === btn));
    render();
  });
});

clearCompletedBtn.addEventListener("click", clearCompleted);

searchInput.addEventListener("input", (e) => {
  searchQuery = e.target.value;
  render();
});

document.addEventListener("keydown", (e) => {
  const tag = document.activeElement.tagName;
  const isTyping = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
  if (e.key === "/" && !isTyping) {
    e.preventDefault();
    input.focus();
  }
});

applyTheme(loadTheme());
render();
