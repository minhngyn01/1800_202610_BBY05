// src/schedulePlanner.js
import { renderWeather } from "/src/weather.js";
import "/src/backToTop.js";

// ─── DOM Elements ─────────────────────────────────────────────────────────────


const scheduleList = document.getElementById("scheduleList");
const dateEl       = document.getElementById("date");
const startEl      = document.getElementById("startTime");
const endEl        = document.getElementById("endTime");
const areaEl       = document.getElementById("area");
const typeEl       = document.getElementById("type");
const titleEl      = document.getElementById("title");
const viewDateEl      = document.getElementById("viewDate");
const weatherWidget   = document.getElementById("weatherWidget");

// HTML templates defined in schedule.html
const tmplItem  = document.getElementById("tmpl-item");
const tmplEmpty = document.getElementById("tmpl-empty");

// ─── Badge Colors ─────────────────────────────────────────────────────────────
// Maps each activity type to a Bootstrap badge color class

const BADGE = {
  Eat:    "text-bg-success",
  Explore:"text-bg-info",
  Match:  "text-bg-warning",
  Travel: "text-bg-secondary"
};

function formatTime(t) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${ampm}`;
}

function formatDateLabel(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-CA", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

function showToast(msg, type = "bg-success") {
  const el = document.getElementById("toast");
  const msgEl = document.getElementById("toastMsg");
  el.className = `toast align-items-center text-white border-0 ${type}`;
  msgEl.textContent = msg;
  bootstrap.Toast.getOrCreateInstance(el, { delay: 2500 }).show();
}

// ── Storage: Firestore + localStorage fallback ─────────────────────────────

let currentUser = null;

// Shows a success (green) or error (red) message that auto-clears after 4s
function showMessage(text, ok = true) {
  const toastEl = document.getElementById("toast");
  const toastMsg = document.getElementById("toastMsg");

  toastEl.classList.remove("text-bg-success", "text-bg-danger");
  toastEl.classList.add(ok ? "text-bg-success" : "text-bg-danger");
  toastMsg.textContent = text;

  bootstrap.Toast.getOrCreateInstance(toastEl, { delay: 4000 }).show();
}

async function saveItem(item) {
  if (currentUser) {
    await setDoc(doc(db, "users", currentUser.uid, "scheduleItems", item.id), item);
  } else {
    const items = JSON.parse(localStorage.getItem("scheduleItems") || "[]");
    const idx = items.findIndex(i => i.id === item.id);
    if (idx >= 0) items[idx] = item; else items.push(item);
    localStorage.setItem("scheduleItems", JSON.stringify(items));
  }
}

async function removeItem(id) {
  if (currentUser) {
    await deleteDoc(doc(db, "users", currentUser.uid, "scheduleItems", id));
  } else {
    const items = JSON.parse(localStorage.getItem("scheduleItems") || "[]")
      .filter(i => i.id !== id);
    localStorage.setItem("scheduleItems", JSON.stringify(items));
  }
}

async function clearAll() {
  if (currentUser) {
    const ref = collection(db, "users", currentUser.uid, "scheduleItems");
    const snap = await getDocs(ref);
    await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
  } else {
    localStorage.removeItem("scheduleItems");
  }
}

// ── Rendering ──────────────────────────────────────────────────────────────

function buildItemCard(item, onEdit, onDelete) {
  const tmpl = document.getElementById("tmpl-item");
  const clone = tmpl.content.cloneNode(true);
  const col = clone.querySelector(".col-12");

  // View mode
  clone.querySelector(".t-badge").className =
    `t-badge badge ${BADGE_COLORS[item.type] || "bg-secondary"}`;
  clone.querySelector(".t-badge").textContent = item.type;
  clone.querySelector(".t-title").textContent = item.title;
  clone.querySelector(".t-meta").textContent =
    `${item.area} · ${formatTime(item.startTime)}${item.endTime ? " – " + formatTime(item.endTime) : ""}`;

  // Populate edit form with current values
  clone.querySelector(".t-edit-date").value  = item.date;
  clone.querySelector(".t-edit-start").value = item.startTime;
  clone.querySelector(".t-edit-end").value   = item.endTime;
  clone.querySelector(".t-edit-title").value = item.title;
  clone.querySelector(".t-edit-area").value  = item.area;
  clone.querySelector(".t-edit-type").value  = item.type;

  // Toggle edit mode
  clone.querySelector(".t-edit").addEventListener("click", () => {
    col.querySelector(".t-view").style.display     = "none";
    col.querySelector(".t-edit-form").style.display = "";
  });
  clone.querySelector(".t-cancel").addEventListener("click", () => {
    col.querySelector(".t-view").style.display     = "";
    col.querySelector(".t-edit-form").style.display = "none";
  });

  // Save edits
  clone.querySelector(".t-save").addEventListener("click", async () => {
    const updated = {
      ...item,
      date:      col.querySelector(".t-edit-date").value,
      startTime: col.querySelector(".t-edit-start").value,
      endTime:   col.querySelector(".t-edit-end").value,
      title:     col.querySelector(".t-edit-title").value.trim(),
      area:      col.querySelector(".t-edit-area").value,
      type:      col.querySelector(".t-edit-type").value,
    };
    if (!updated.title || !updated.date) {
      showToast("Title and date are required.", "bg-danger"); return;
    }
    await saveItem(updated);
    onEdit();
    showToast("Item updated.");
  });

  // Delete
  clone.querySelector(".t-delete").addEventListener("click", async () => {
    await removeItem(item.id);
    onDelete();
    showToast("Item removed.", "bg-secondary");
  });

  return clone;
}

async function renderList() {
  const list   = document.getElementById("scheduleList");
  const items  = await loadItems();
  const mode   = document.querySelector('input[name="viewMode"]:checked')?.value || "single";

  let filtered = [];

  if (mode === "single") {
    const viewDate = document.getElementById("viewDate").value;
    filtered = viewDate ? items.filter(i => i.date === viewDate) : items;
  } else {
    const start = document.getElementById("rangeStart").value;
    const end   = document.getElementById("rangeEnd").value;
    filtered = items.filter(i => (!start || i.date >= start) && (!end || i.date <= end));
  }

  list.innerHTML = "";

  if (filtered.length === 0) {
    const tmpl  = document.getElementById("tmpl-empty");
    const clone = tmpl.content.cloneNode(true);
    clone.querySelector(".t-msg").className = "t-msg alert alert-info mb-0";
    clone.querySelector(".t-msg").textContent = "No items found for this date range.";
    list.appendChild(clone);
    return;
  }

  if (mode === "range") {
    // Group by date
    const byDate = {};
    filtered.forEach(item => {
      (byDate[item.date] = byDate[item.date] || []).push(item);
    });
    Object.keys(byDate).sort().forEach(date => {
      // Day header
      const hTmpl  = document.getElementById("tmpl-day-header");
      const hClone = hTmpl.content.cloneNode(true);
      hClone.querySelector(".t-day-label").textContent = formatDateLabel(date);
      list.appendChild(hClone);
      // Items for that day
      byDate[date].forEach(item => {
        list.appendChild(buildItemCard(item, renderList, renderList));
      });
    });
  } else {
    filtered.forEach(item => {
      list.appendChild(buildItemCard(item, renderList, renderList));
    });
  }
}

// ── Random populate ────────────────────────────────────────────────────────

const RANDOM_ITEMS = [
  { title: "Stanley Park Walk",        area: "Downtown",       type: "Explore", startTime: "09:00", endTime: "11:00" },
  { title: "Granville Island Market",  area: "Kitsilano",      type: "Explore", startTime: "11:30", endTime: "13:00" },
  { title: "Lunch at The Naam",        area: "Kitsilano",      type: "Eat",     startTime: "13:00", endTime: "14:00" },
  { title: "UBC Museum of Anthropology", area: "UBC",          type: "Explore", startTime: "14:30", endTime: "16:30" },
  { title: "Dinner in Richmond",       area: "Richmond",       type: "Eat",     startTime: "18:00", endTime: "19:30" },
  { title: "Canada Place Walk",        area: "Downtown",       type: "Explore", startTime: "10:00", endTime: "11:00" },
  { title: "Lonsdale Quay",            area: "North Vancouver", type: "Explore", startTime: "13:00", endTime: "15:00" },
  { title: "Robson Street Shopping",   area: "Downtown",       type: "Explore", startTime: "15:00", endTime: "17:00" },
  { title: "Sushi at Miku",            area: "Downtown",       type: "Eat",     startTime: "19:00", endTime: "20:30" },
  { title: "Watch FIFA Match",         area: "Downtown",       type: "Match",   startTime: "20:00", endTime: "22:00" },
];

function getNextDays(n) {
  const dates = [];
  for (let i = 0; i < n; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    dates.push(d.toISOString().split("T")[0]);
  }
  return dates;
}

async function randomPopulate() {
  const dates = getNextDays(3);
  const shuffled = [...RANDOM_ITEMS].sort(() => Math.random() - 0.5).slice(0, 6);
  for (let i = 0; i < shuffled.length; i++) {
    const item = {
      ...shuffled[i],
      id:   crypto.randomUUID(),
      date: dates[i % dates.length],
    };
    await saveItem(item);
  }
  await renderList();
  showToast("Schedule randomly populated!");
}

// ── Weather widget ─────────────────────────────────────────────────────────

async function loadWeather(dateStr) {
  const widget = document.getElementById("weatherWidget");
  if (!dateStr) { widget.innerHTML = ""; return; }

  // Open-Meteo is free and requires no API key
  const today = new Date().toISOString().split("T")[0];
  if (dateStr < today) { widget.innerHTML = ""; return; }

  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=49.2827&longitude=-123.1207` +
      `&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum` +
      `&timezone=America%2FVancouver&start_date=${dateStr}&end_date=${dateStr}`
    );
    const data = await res.json();
    if (!data.daily?.weathercode?.length) { widget.innerHTML = ""; return; }

    const code  = data.daily.weathercode[0];
    const tMax  = Math.round(data.daily.temperature_2m_max[0]);
    const tMin  = Math.round(data.daily.temperature_2m_min[0]);
    const rain  = data.daily.precipitation_sum[0];

    const icons = {
      0: "☀️", 1: "🌤️", 2: "⛅", 3: "☁️",
      45: "🌫️", 48: "🌫️",
      51: "🌦️", 53: "🌦️", 55: "🌧️",
      61: "🌧️", 63: "🌧️", 65: "🌧️",
      71: "🌨️", 73: "🌨️", 75: "🌨️",
      80: "🌦️", 81: "🌧️", 82: "⛈️",
      95: "⛈️",
    };
    const icon = icons[code] ?? "🌡️";

    widget.innerHTML = `
      <div class="card shadow-sm">
        <div class="card-body d-flex align-items-center gap-3 flex-wrap">
          <span style="font-size:2rem;">${icon}</span>
          <div>
            <strong>Vancouver Weather — ${formatDateLabel(dateStr)}</strong>
            <div class="text-muted small">
              High ${tMax}°C / Low ${tMin}°C · 
              ${rain > 0 ? `${rain} mm precipitation` : "No precipitation expected"}
            </div>
          </div>
        </div>
      </div>`;
  } catch {
    widget.innerHTML = "";
  }
}

// ── Init ───────────────────────────────────────────────────────────────────

onAuthStateChanged(auth, async (user) => {
  currentUser = user || null;
  await renderList();
});

// Set today as default view date
const today = new Date().toISOString().split("T")[0];
document.getElementById("viewDate").value = today;
loadWeather(today);
renderList();

// View date change
document.getElementById("viewDate").addEventListener("change", async (e) => {
  await renderList();
  loadWeather(e.target.value);
});

// Mode toggle
document.querySelectorAll('input[name="viewMode"]').forEach(radio => {
  radio.addEventListener("change", () => {
    const isSingle = radio.value === "single";
    document.getElementById("singleDayPicker").style.display = isSingle ? "" : "none";
    document.getElementById("rangePicker").style.display     = isSingle ? "none" : "";
    if (!isSingle) loadWeather(""); // clear weather in range mode
    renderList();
  });
});

// Apply range
document.getElementById("btnApplyRange").addEventListener("click", renderList);

// Add
document.getElementById("btnAdd").addEventListener("click", async () => {
  const date      = document.getElementById("date").value;
  const startTime = document.getElementById("startTime").value;
  const endTime   = document.getElementById("endTime").value;
  const area      = document.getElementById("area").value;
  const type      = document.getElementById("type").value;
  const title     = document.getElementById("title").value.trim();
  if (!date || !title) { showToast("Date and title are required.", "bg-danger"); return; }
  const item = { id: crypto.randomUUID(), date, startTime, endTime, area, type, title };
  await saveItem(item);
  document.getElementById("title").value = "";
  await renderList();
  showToast("Item added!");
});

// Clear form
document.getElementById("btnClear").addEventListener("click", () => {
  ["date","startTime","endTime","title"].forEach(id => {
    document.getElementById(id).value = "";
  });
  document.getElementById("area").value = "Downtown";
  document.getElementById("type").value = "Explore";
});

// Clear all
document.getElementById("btnClearAll").addEventListener("click", async () => {
  if (!confirm("Clear all schedule items?")) return;
  await clearAll();
  await renderList();
  showToast("All items cleared.", "bg-secondary");
});

// Random populate
document.getElementById("btnRandom").addEventListener("click", randomPopulate);

// Get recommendations
document.getElementById("btnRecs").addEventListener("click", () => {
  const d = document.getElementById("viewDate").value;
  window.location.href = `recommendations.html${d ? `?date=${d}` : ""}`;
});

// Back to top
window.addEventListener("scroll", () => {
  document.getElementById("backToTop").style.display =
    window.scrollY > 300 ? "flex" : "none";
});
document.getElementById("backToTop").addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});
