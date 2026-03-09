// src/schedulePlanner.js
const msg = document.getElementById("msg");
const scheduleList = document.getElementById("scheduleList");

const dateEl = document.getElementById("date");
const startEl = document.getElementById("startTime");
const endEl = document.getElementById("endTime");
const areaEl = document.getElementById("area");
const typeEl = document.getElementById("type");
const titleEl = document.getElementById("title");

const btnAdd = document.getElementById("btnAdd");
const btnClear = document.getElementById("btnClear");
const btnClearAll = document.getElementById("btnClearAll");
const btnRandom = document.getElementById("btnRandom");

const viewDateEl = document.getElementById("viewDate");
const btnRecs = document.getElementById("btnRecs");

function getItems() {
  return JSON.parse(localStorage.getItem("scheduleItems") || "[]");
}
function setItems(items) {
  localStorage.setItem("scheduleItems", JSON.stringify(items));
}

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function showMessage(text, ok = true) {
  msg.className = ok ? "mt-2 text-success" : "mt-2 text-danger";
  msg.textContent = text;
}

function clearForm() {
  dateEl.value = viewDateEl.value || todayISO();
  startEl.value = "10:00";
  endEl.value = "12:00";
  areaEl.value = "Downtown";
  typeEl.value = "Explore";
  titleEl.value = "";
}

function validate() {
  if (!dateEl.value) return "Pick a date.";
  if (!startEl.value || !endEl.value) return "Pick start and end time.";
  if (endEl.value <= startEl.value) return "End time must be after start time.";
  if (!titleEl.value.trim()) return "Enter a title.";
  return null;
}

function addItem() {
  const err = validate();
  if (err) {
    showMessage(err, false);
    return;
  }

  const item = {
    id: crypto.randomUUID(),
    date: dateEl.value,
    start: startEl.value,
    end: endEl.value,
    area: areaEl.value,
    type: typeEl.value,
    title: titleEl.value.trim(),
    createdAt: Date.now(),
  };

  const items = getItems();
  items.push(item);
  setItems(items);

  showMessage("Added to schedule!");
  renderForDate(viewDateEl.value || item.date);
}

function deleteItem(id) {
  const items = getItems().filter(x => x.id !== id);
  setItems(items);
  showMessage("Deleted item.");
  renderForDate(viewDateEl.value || todayISO());
}

function renderForDate(date) {
  const items = getItems()
    .filter(x => x.date === date)
    .sort((a, b) => a.start.localeCompare(b.start));

  scheduleList.innerHTML = "";

  if (items.length === 0) {
    scheduleList.innerHTML = `
      <div class="col-12">
        <div class="alert alert-info mb-0">No schedule items for ${date}. Add one above.</div>
      </div>
    `;
    return;
  }

  for (const it of items) {
    const col = document.createElement("div");
    col.className = "col-12";

    col.innerHTML = `
      <div class="card shadow-sm">
        <div class="card-body d-flex justify-content-between align-items-start gap-3 flex-wrap">
          <div>
            <div class="d-flex gap-2 align-items-center flex-wrap">
              <span class="badge ${it.type === "Eat" ? "text-bg-success" : it.type === "Explore" ? "text-bg-info" : "text-bg-secondary"}">${it.type}</span>
              <span class="fw-bold">${it.title}</span>
            </div>
            <div class="text-muted mt-1">
              ${it.date} • ${it.start}–${it.end} • ${it.area}
            </div>
          </div>

          <button class="btn btn-outline-danger btn-sm" data-del="${it.id}">Delete</button>
        </div>
      </div>
    `;

    scheduleList.appendChild(col);
  }

  document.querySelectorAll("[data-del]").forEach(btn => {
    btn.addEventListener("click", () => deleteItem(btn.dataset.del));
  });
}

function getDominantAreaForDate(date) {
  const items = getItems().filter(x => x.date === date);
  if (items.length === 0) return "All";

  // choose area with most items
  const counts = {};
  for (const it of items) counts[it.area] = (counts[it.area] || 0) + 1;

  let best = "All";
  let bestCount = 0;
  for (const [area, count] of Object.entries(counts)) {
    if (count > bestCount) {
      bestCount = count;
      best = area;
    }
  }
  return best;
}

function randomPopulate() {

  const activities = [
    { title: "Visit Stanley Park", type: "Explore" },
    { title: "Explore Granville Island", type: "Explore" },
    { title: "Walk the Seawall", type: "Explore" },
    { title: "Visit Vancouver Art Gallery", type: "Explore" },

    { title: "Lunch Downtown", type: "Eat" },
    { title: "Coffee Break", type: "Eat" },
    { title: "Dinner Downtown", type: "Eat" },

    { title: "Watch World Cup Match", type: "Match" },

    { title: "SkyTrain Ride", type: "Travel" }
  ];

  const areas = ["Downtown", "Kitsilano", "UBC", "North Vancouver", "Richmond"];
  const date = viewDateEl.value || todayISO();

  let items = getItems();

  let currentHour = 9; // start day at 9am

  for (let i = 0; i < 5; i++) {

    let activity = activities[Math.floor(Math.random() * activities.length)];

    let duration = Math.floor(Math.random() * 2) + 1; // 1–2 hours

    let start = String(currentHour).padStart(2, "0") + ":00";
    let end = String(currentHour + duration).padStart(2, "0") + ":00";

    const item = {
      id: crypto.randomUUID(),
      date: date,
      start: start,
      end: end,
      area: areas[Math.floor(Math.random() * areas.length)],
      type: activity.type,
      title: activity.title,
      createdAt: Date.now()
    };

    items.push(item);

    currentHour += duration; // move time forward
  }

  setItems(items);

  showMessage("Random schedule generated!");
  renderForDate(date);
}

// Events
btnAdd.addEventListener("click", addItem);
btnClear.addEventListener("click", () => {
  clearForm();
  showMessage("Form cleared.");
});
btnClearAll.addEventListener("click", () => {
  setItems([]);
  showMessage("Cleared all schedule items.");
  renderForDate(viewDateEl.value || todayISO());
});

btnRandom.addEventListener("click", randomPopulate);

viewDateEl.addEventListener("change", () => {
  renderForDate(viewDateEl.value);
});

btnRecs.addEventListener("click", () => {
  const date = viewDateEl.value || todayISO();
  const area = getDominantAreaForDate(date);

  // Open recommendations filtered by this date+area
  window.location.href = `recommendations.html?date=${encodeURIComponent(date)}&area=${encodeURIComponent(area)}`;
});


// Init defaults
viewDateEl.value = todayISO();
clearForm();
renderForDate(viewDateEl.value);