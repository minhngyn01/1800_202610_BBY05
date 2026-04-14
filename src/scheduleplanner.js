// src/schedulePlanner.js
import { db, auth }      from "/src/firebaseConfig.js";
import { renderWeather } from "/src/weather.js";
import {
  collection, doc, setDoc, deleteDoc, getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// ─── DOM Elements ─────────────────────────────────────────────────────────────

const msg           = document.getElementById("msg");
const scheduleList  = document.getElementById("scheduleList");
const dateEl        = document.getElementById("date");
const startEl       = document.getElementById("startTime");
const endEl         = document.getElementById("endTime");
const areaEl        = document.getElementById("area");
const typeEl        = document.getElementById("type");
const titleEl       = document.getElementById("title");
const viewDateEl    = document.getElementById("viewDate");
const weatherWidget = document.getElementById("weatherWidget");
const tmplItem      = document.getElementById("tmpl-item");
const tmplEmpty     = document.getElementById("tmpl-empty");

const BADGE = {
  Eat:    "text-bg-success",
  Explore:"text-bg-info",
  Match:  "text-bg-warning",
  Travel: "text-bg-secondary"
};

let currentUser = null; // Set by onAuthStateChanged

// ─── Pinned FIFA Match Items (read-only, never stored or deletable) ────────────

const FIFA_MATCHES = [
  {
    id: "fifa-match-1",
    date: "2026-06-13", start: "21:00", end: "23:00",
    title: "⚽ Australia vs UEFA Playoff C Winner — Group D",
    area: "Downtown", type: "Match", pinned: true
  },
  {
    id: "fifa-match-2",
    date: "2026-06-18", start: "12:00", end: "14:00",
    title: "⚽ Canada vs Qatar — Group B",
    area: "Downtown", type: "Match", pinned: true
  },
  {
    id: "fifa-match-3",
    date: "2026-06-21", start: "18:00", end: "20:00",
    title: "⚽ New Zealand vs Egypt — Group G",
    area: "Downtown", type: "Match", pinned: true
  },
  {
    id: "fifa-match-4",
    date: "2026-06-24", start: "12:00", end: "14:00",
    title: "⚽ Switzerland vs Canada — Group B",
    area: "Downtown", type: "Match", pinned: true
  },
  {
    id: "fifa-match-5",
    date: "2026-06-26", start: "19:00", end: "21:00",
    title: "⚽ New Zealand vs Belgium — Group G",
    area: "Downtown", type: "Match", pinned: true
  },
  {
    id: "fifa-match-6",
    date: "2026-07-02", start: "19:00", end: "21:00",
    title: "⚽ Round of 32 — TBD vs TBD",
    area: "Downtown", type: "Match", pinned: true
  },
  {
    id: "fifa-match-7",
    date: "2026-07-07", start: "16:00", end: "18:00",
    title: "⚽ Round of 16 — TBD vs TBD",
    area: "Downtown", type: "Match", pinned: true
  },
];

// ─── Storage Helpers ──────────────────────────────────────────────────────────
// Logged in → Firestore | Guest → localStorage

async function getItems() {
  if (currentUser) {
    const snap = await getDocs(collection(db, "users", currentUser.uid, "scheduleItems"));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }
  try { return JSON.parse(localStorage.getItem("scheduleItems") || "[]"); }
  catch { return []; }
}

async function saveItem(item) {
  if (currentUser) {
    await setDoc(doc(db, "users", currentUser.uid, "scheduleItems", item.id), item);
  } else {
    const items = await getItems();
    const idx = items.findIndex(i => i.id === item.id);
    if (idx !== -1) items[idx] = item; else items.push(item);
    localStorage.setItem("scheduleItems", JSON.stringify(items));
  }
}

async function removeItem(id) {
  if (currentUser) {
    await deleteDoc(doc(db, "users", currentUser.uid, "scheduleItems", id));
  } else {
    const items = (await getItems()).filter(i => i.id !== id);
    localStorage.setItem("scheduleItems", JSON.stringify(items));
  }
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function todayISO() { return new Date().toISOString().split("T")[0]; }
function toMins(t) { const [h, m] = t.split(":").map(Number); return h * 60 + m; }

function showMessage(text, ok = true) {
  msg.className   = ok ? "mt-2 text-success fw-semibold" : "mt-2 text-danger fw-semibold";
  msg.textContent = text;
  clearTimeout(msg._t);
  msg._t = setTimeout(() => { msg.textContent = ""; }, 4000);
}

function clearForm() {
  dateEl.value  = viewDateEl.value || todayISO();
  startEl.value = "10:00"; endEl.value = "12:00";
  areaEl.value  = "Downtown"; typeEl.value = "Explore";
  titleEl.value = "";
}

function validate() {
  if (!dateEl.value)                  return "Pick a date.";
  if (!startEl.value || !endEl.value) return "Pick start and end time.";
  if (endEl.value <= startEl.value)   return "End time must be after start.";
  if (!titleEl.value.trim())          return "Enter a title.";
  return null;
}

async function hasOverlap(date, start, end, excludeId = null) {
  const userItems = await getItems();
  const allItems = [...userItems, ...FIFA_MATCHES];
  const ns = toMins(start), ne = toMins(end);
  return allItems.some(item =>
    item.date === date && item.id !== excludeId &&
    ns < toMins(item.end) && ne > toMins(item.start)
  );
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

async function addItem() {
  const err = validate();
  if (err) { showMessage(err, false); return; }
  if (await hasOverlap(dateEl.value, startEl.value, endEl.value)) {
    showMessage("Time overlaps an existing item.", false); return;
  }
  const item = {
    id: crypto.randomUUID(), date: dateEl.value, start: startEl.value,
    end: endEl.value, area: areaEl.value, type: typeEl.value,
    title: titleEl.value.trim(), createdAt: Date.now()
  };
  await saveItem(item);
  showMessage(`"${item.title}" added!`);
  viewDateEl.value = item.date;
  await renderForDate(item.date);
  titleEl.value = "";
}

async function deleteItem(id) {
  await removeItem(id);
  showMessage("Item deleted.");
  await renderForDate(viewDateEl.value || todayISO());
}

async function saveEdit(id) {
  const card     = scheduleList.querySelector(`[data-id="${id}"]`);
  const editForm = card.querySelector(".t-edit-form");
  const date     = editForm.querySelector(".t-edit-date").value;
  const start    = editForm.querySelector(".t-edit-start").value;
  const end      = editForm.querySelector(".t-edit-end").value;
  const area     = editForm.querySelector(".t-edit-area").value;
  const type     = editForm.querySelector(".t-edit-type").value;
  const title    = editForm.querySelector(".t-edit-title").value.trim();
  if (!date || !start || !end || !title) { showMessage("Fill in all fields.", false); return; }
  if (end <= start) { showMessage("End must be after start.", false); return; }
  if (await hasOverlap(date, start, end, id)) { showMessage("Time overlaps another item.", false); return; }
  await saveItem({ id, date, start, end, area, type, title, createdAt: Date.now() });
  showMessage(`"${title}" updated!`);
  await renderForDate(viewDateEl.value || todayISO());
}

// ─── Render Helpers ───────────────────────────────────────────────────────────

function renderPinnedCard(item) {
  const clone  = document.getElementById("tmpl-pinned-match").content.cloneNode(true);
  const colDiv = clone.querySelector(".col-12");
  colDiv.dataset.id = item.id;
  clone.querySelector(".t-title").textContent = item.title;
  clone.querySelector(".t-meta").textContent  = `${item.date} • ${item.start}–${item.end} • BC Place, Downtown`;
  return clone;
}

function renderUserCard(item) {
  const clone  = tmplItem.content.cloneNode(true);
  const colDiv = clone.querySelector(".col-12");
  colDiv.dataset.id = item.id;

  clone.querySelector(".t-badge").className  += ` ${BADGE[item.type] || "text-bg-secondary"}`;
  clone.querySelector(".t-badge").textContent = item.type;
  clone.querySelector(".t-title").textContent = item.title;
  clone.querySelector(".t-meta").textContent  = `${item.date} • ${item.start}–${item.end} • ${item.area}`;

  clone.querySelector(".t-edit-date").value  = item.date;
  clone.querySelector(".t-edit-start").value = item.start;
  clone.querySelector(".t-edit-end").value   = item.end;
  clone.querySelector(".t-edit-area").value  = item.area;
  clone.querySelector(".t-edit-type").value  = item.type;
  clone.querySelector(".t-edit-title").value = item.title;

  const viewDiv  = clone.querySelector(".t-view");
  const editForm = clone.querySelector(".t-edit-form");

  clone.querySelector(".t-edit").addEventListener("click", () => {
    viewDiv.style.display = "none";
    editForm.style.display = "block";
  });
  clone.querySelector(".t-cancel").addEventListener("click", () => {
    viewDiv.style.display = "flex";
    editForm.style.display = "none";
  });
  clone.querySelector(".t-save").addEventListener("click",   () => saveEdit(item.id));
  clone.querySelector(".t-delete").addEventListener("click", () => deleteItem(item.id));
  return clone;
}

// ─── Render ───────────────────────────────────────────────────────────────────

async function renderForDate(date) {
  const userItems = (await getItems())
    .filter(item => item.date === date)
    .sort((a, b) => a.start.localeCompare(b.start));

  const pinnedItems = FIFA_MATCHES
    .filter(m => m.date === date)
    .sort((a, b) => a.start.localeCompare(b.start));

  scheduleList.innerHTML = "";

  if (!date || (!userItems.length && !pinnedItems.length)) {
    const clone = tmplEmpty.content.cloneNode(true);
    const msgEl = clone.querySelector(".t-msg");
    msgEl.classList.add(!date ? "alert-secondary" : "alert-info");
    msgEl.textContent = !date ? "Select a date." : `No items for ${date}. Add one above.`;
    scheduleList.appendChild(clone);
    return;
  }

  const allItems = [
    ...pinnedItems.map(i => ({ ...i, _pinned: true })),
    ...userItems.map(i => ({ ...i, _pinned: false })),
  ].sort((a, b) => a.start.localeCompare(b.start));

  for (const item of allItems) {
    scheduleList.appendChild(item._pinned ? renderPinnedCard(item) : renderUserCard(item));
  }
}

async function renderForRange(startDate, endDate) {
  const userItems = (await getItems())
    .filter(item => item.date >= startDate && item.date <= endDate)
    .sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start));

  const pinnedItems = FIFA_MATCHES
    .filter(m => m.date >= startDate && m.date <= endDate)
    .sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start));

  const allItems = [
    ...pinnedItems.map(i => ({ ...i, _pinned: true })),
    ...userItems.map(i => ({ ...i, _pinned: false })),
  ].sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start));

  scheduleList.innerHTML = "";

  if (!allItems.length) {
    const clone = tmplEmpty.content.cloneNode(true);
    const msgEl = clone.querySelector(".t-msg");
    msgEl.classList.add("alert-info");
    msgEl.textContent = `No items between ${startDate} and ${endDate}.`;
    scheduleList.appendChild(clone);
    return;
  }

  let lastDate = null;
  for (const item of allItems) {
    if (item.date !== lastDate) {
      const header = document.getElementById("tmpl-day-header").content.cloneNode(true);
      header.querySelector(".t-day-label").textContent =
        new Date(item.date + "T12:00:00").toLocaleDateString("en-CA",
          { weekday: "long", year: "numeric", month: "long", day: "numeric" });
      scheduleList.appendChild(header);
      lastDate = item.date;
    }
    if (item._pinned) {
      scheduleList.appendChild(renderPinnedCard(item));
    } else {
      const clone  = tmplItem.content.cloneNode(true);
      const colDiv = clone.querySelector(".col-12");
      colDiv.dataset.id = item.id;
      clone.querySelector(".t-badge").className  += ` ${BADGE[item.type] || "text-bg-secondary"}`;
      clone.querySelector(".t-badge").textContent = item.type;
      clone.querySelector(".t-title").textContent = item.title;
      clone.querySelector(".t-meta").textContent  = `${item.date} • ${item.start}–${item.end} • ${item.area}`;
      clone.querySelector(".t-delete").addEventListener("click", () => deleteItem(item.id));
      scheduleList.appendChild(clone);
    }
  }
}

// ─── Recommendations Context ──────────────────────────────────────────────────

async function getScheduleContext(date) {
  const items = (await getItems()).filter(item => item.date === date);
  if (!items.length) return { area: "All", coveredTypes: [], suggestedCategory: "All", totalItems: 0 };
  const counts = {};
  for (const item of items) counts[item.area] = (counts[item.area] || 0) + 1;
  const area = Object.entries(counts).reduce((b, [a, c]) => c > b[1] ? [a, c] : b, ["All", 0])[0];
  const coveredTypes = [...new Set(items.map(i => i.type))];
  const suggestedCategory = !coveredTypes.includes("Eat") ? "Eat"
    : !coveredTypes.includes("Explore") ? "Explore" : "All";
  return { area, coveredTypes, suggestedCategory, totalItems: items.length };
}

// ─── Random Populate ──────────────────────────────────────────────────────────

async function randomPopulate() {
  // earliestHour = earliest the activity can START
  // latestHour   = latest the activity can START
  // dur          = fixed duration in hours
  const activities = [
    
    { title: "Morning Walk",          type: "Explore", earliestHour: 6,  latestHour: 9,  dur: 1 },
    { title: "Breakfast",             type: "Eat",     earliestHour: 7,  latestHour: 10, dur: 1 },
    { title: "Transit",               type: "Travel",  earliestHour: 8,  latestHour: 20, dur: 1 },
    { title: "Coffee Break",          type: "Eat",     earliestHour: 9,  latestHour: 16, dur: 1 },
    { title: "Visit Local Market",    type: "Explore", earliestHour: 9,  latestHour: 15, dur: 2 },
    { title: "Sightseeing",           type: "Explore", earliestHour: 9,  latestHour: 17, dur: 2 },
    { title: "Museum Visit",          type: "Explore", earliestHour: 10, latestHour: 16, dur: 2 },
    { title: "Lunch",                 type: "Eat",     earliestHour: 11, latestHour: 14, dur: 1 },
    { title: "Explore Neighbourhood", type: "Explore", earliestHour: 11, latestHour: 18, dur: 2 },
    
    { title: "Dinner",                type: "Eat",     earliestHour: 17, latestHour: 20, dur: 2 },
  ];

  const areas = ["Downtown", "Kitsilano", "UBC", "North Vancouver", "Richmond"];
  const date  = viewDateEl.value || todayISO();
  let added   = 0;

  // Assign each activity a random start within its window, then sort chronologically
  // so the generated day flows in a natural order.
  const candidates = activities
    .map(act => {
      const startHour = act.earliestHour + Math.floor(Math.random() * (act.latestHour - act.earliestHour + 1));
      return { ...act, startHour, endHour: startHour + act.dur };
    })
    .filter(act => act.endHour <= 23)
    .sort((a, b) => a.startHour - b.startHour);

  for (const act of candidates) {
    if (added >= 5) break;
    const start = String(act.startHour).padStart(2, "0") + ":00";
    const end   = String(act.endHour).padStart(2, "0")   + ":00";
    if (!await hasOverlap(date, start, end)) {
      await saveItem({
        id: crypto.randomUUID(), date, start, end,
        area: areas[Math.floor(Math.random() * areas.length)],
        type: act.type, title: act.title, createdAt: Date.now()
      });
      added++;
    }
  }

  showMessage(`${added} random item${added !== 1 ? "s" : ""} added!`);
  await renderForDate(date);
}

// ─── Event Listeners ──────────────────────────────────────────────────────────

document.getElementById("btnAdd").addEventListener("click", addItem);
document.getElementById("btnClear").addEventListener("click", () => { clearForm(); showMessage("Form cleared."); });
document.getElementById("btnClearAll").addEventListener("click", async () => {
  if (!confirm("Delete ALL schedule items?")) return;
  for (const item of await getItems()) await removeItem(item.id);
  showMessage("All items cleared.");
  await renderForDate(viewDateEl.value || todayISO());
});
document.getElementById("btnRandom").addEventListener("click", randomPopulate);

viewDateEl.addEventListener("change", async () => {
  dateEl.value = viewDateEl.value;
  await renderForDate(viewDateEl.value);
  renderWeather(weatherWidget, viewDateEl.value);
});

document.getElementById("btnRecs").addEventListener("click", async () => {
  const date = viewDateEl.value || todayISO();
  const ctx  = await getScheduleContext(date);
  if (!ctx.totalItems) { showMessage("Add schedule items first!", false); return; }
  const p = new URLSearchParams({ date, area: ctx.area, category: ctx.suggestedCategory, covered: ctx.coveredTypes.join(",") });
  window.location.href = `recommendations.html?${p.toString()}`;
});

document.querySelectorAll("input[name='viewMode']").forEach(radio => {
  radio.addEventListener("change", () => {
    const isRange = radio.value === "range";
    document.getElementById("singleDayPicker").style.display = isRange ? "none" : "flex";
    document.getElementById("rangePicker").style.display     = isRange ? "flex" : "none";
  });
});

document.getElementById("btnApplyRange")?.addEventListener("click", async () => {
  const start = document.getElementById("rangeStart").value;
  const end   = document.getElementById("rangeEnd").value;
  if (!start || !end || end < start) { showMessage("Pick a valid date range.", false); return; }
  await renderForRange(start, end);
});

const backToTop = document.getElementById("backToTop");
if (backToTop) {
  window.addEventListener("scroll", () => {
    backToTop.style.display = window.scrollY > 300 ? "flex" : "none";
  });
  backToTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
}

// ─── Auth State ───────────────────────────────────────────────────────────────

onAuthStateChanged(auth, async (user) => {
  currentUser = user || null;
  await renderForDate(viewDateEl.value || todayISO());
});

// ─── Init ─────────────────────────────────────────────────────────────────────

viewDateEl.value = todayISO();
clearForm();
renderForDate(viewDateEl.value);
renderWeather(weatherWidget, viewDateEl.value);