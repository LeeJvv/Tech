const STORAGE_KEY = "quick-todo-notes-v1";
const form = document.querySelector("#task-form");
const titleInput = document.querySelector("#task-title");
const dueInput = document.querySelector("#task-due");
const list = document.querySelector("#task-list");
const emptyState = document.querySelector("#empty-state");
const openCount = document.querySelector("#open-count");
const nextDue = document.querySelector("#next-due");
const enableReminders = document.querySelector("#enable-reminders");
const filters = [...document.querySelectorAll(".filter")];
const template = document.querySelector("#task-template");

let tasks = loadTasks();
let activeFilter = "open";

setDefaultDueDate();
render();
checkReminders();
setInterval(checkReminders, 30000);

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const title = titleInput.value.trim();
  const dueAt = dueInput.value;
  if (!title || !dueAt) return;

  tasks.unshift({
    id: crypto.randomUUID(),
    title,
    dueAt,
    completed: false,
    remindedAt: null,
    createdAt: new Date().toISOString(),
  });

  saveTasks();
  titleInput.value = "";
  setDefaultDueDate();
  titleInput.focus();
  render();
});

enableReminders.addEventListener("click", async () => {
  if (!("Notification" in window)) {
    alert("This browser does not support desktop notifications.");
    return;
  }

  const permission = await Notification.requestPermission();
  updateReminderButton(permission);
  if (permission === "granted") {
    showNotification("Reminders are on", "Incomplete tasks will alert you when they become due.");
  }
});

filters.forEach((button) => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    filters.forEach((item) => item.classList.toggle("active", item === button));
    render();
  });
});

function render() {
  list.innerHTML = "";
  const visibleTasks = getVisibleTasks();

  visibleTasks.forEach((task) => {
    const node = template.content.firstElementChild.cloneNode(true);
    const complete = node.querySelector(".task-complete");
    const name = node.querySelector(".task-name");
    const date = node.querySelector(".task-date");
    const status = node.querySelector(".task-status");
    const remove = node.querySelector(".delete-task");

    complete.checked = task.completed;
    name.value = task.title;
    date.value = task.dueAt;
    status.textContent = getStatusText(task);
    node.classList.toggle("completed", task.completed);
    node.classList.toggle("overdue", isOverdue(task));

    complete.addEventListener("change", () => {
      updateTask(task.id, { completed: complete.checked });
    });

    name.addEventListener("input", () => {
      updateTask(task.id, { title: name.value.trim() || "Untitled task" }, false);
    });

    name.addEventListener("blur", () => render());

    date.addEventListener("change", () => {
      updateTask(task.id, { dueAt: date.value, remindedAt: null });
    });

    remove.addEventListener("click", () => {
      tasks = tasks.filter((item) => item.id !== task.id);
      saveTasks();
      render();
    });

    list.append(node);
  });

  emptyState.hidden = visibleTasks.length > 0;
  updateSummary();
  updateReminderButton(window.Notification?.permission);
}

function updateTask(id, changes, shouldRender = true) {
  tasks = tasks.map((task) => (task.id === id ? { ...task, ...changes } : task));
  saveTasks();
  if (shouldRender) render();
}

function getVisibleTasks() {
  return tasks
    .filter((task) => {
      if (activeFilter === "completed") return task.completed;
      if (activeFilter === "open") return !task.completed;
      return true;
    })
    .sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt));
}

function updateSummary() {
  const openTasks = tasks.filter((task) => !task.completed);
  const nextOpenTask = [...openTasks].sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt))[0];
  openCount.textContent = `${openTasks.length} open`;
  nextDue.textContent = nextOpenTask ? `Next due: ${formatDate(nextOpenTask.dueAt)}` : "No open due dates";
}

function checkReminders() {
  const now = Date.now();
  let changed = false;

  tasks.forEach((task) => {
    const dueTime = new Date(task.dueAt).getTime();
    const shouldRemind = !task.completed && !task.remindedAt && dueTime <= now;
    if (!shouldRemind) return;

    showNotification("Task due", `${task.title} is due ${formatDate(task.dueAt)}.`);
    task.remindedAt = new Date().toISOString();
    changed = true;
  });

  if (changed) {
    saveTasks();
    render();
  }
}

function showNotification(title, body) {
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification(title, { body });
    return;
  }

  if (document.visibilityState === "visible") {
    alert(`${title}\n\n${body}`);
  }
}

function getStatusText(task) {
  if (task.completed) return `Completed. Due was ${formatDate(task.dueAt)}.`;
  if (isOverdue(task)) return `Overdue since ${formatDate(task.dueAt)}`;
  return `Due ${formatDate(task.dueAt)}`;
}

function isOverdue(task) {
  return !task.completed && new Date(task.dueAt).getTime() < Date.now();
}

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function setDefaultDueDate() {
  const nextHour = new Date(Date.now() + 60 * 60 * 1000);
  nextHour.setMinutes(0, 0, 0);
  dueInput.value = toDateTimeInputValue(nextHour);
}

function toDateTimeInputValue(date) {
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function loadTasks() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function updateReminderButton(permission) {
  const isEnabled = permission === "granted";
  enableReminders.classList.toggle("enabled", isEnabled);
  enableReminders.title = isEnabled ? "Reminders enabled" : "Enable reminders";
  enableReminders.setAttribute("aria-label", enableReminders.title);
}
