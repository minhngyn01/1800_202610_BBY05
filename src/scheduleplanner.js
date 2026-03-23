// src/schedulePlanner.js

// ─── DOM Elements ─────────────────────────────────────────────────────────────

const msg          = document.getElementById("msg");
const scheduleList = document.getElementById("scheduleList");
const dateEl       = document.getElementById("date");
const startEl      = document.getElementById("startTime");
const endEl        = document.getElementById("endTime");
const areaEl       = document.getElementById("area");
const typeEl       = document.getElementById("type");
const titleEl      = document.getElementById("title");
const viewDateEl   = document.getElementById("viewDate");

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

// ─── Storage Helpers ──────────────────────────────────────────────────────────

function getItems() {
  try { return JSON.parse(localStorage.getItem("scheduleItems") || "[]"); }
  catch { return []; }
}

function setItems(items) {
  localStorage.setItem("scheduleItems", JSON.stringify(items));
}

// ─── Utility Helpers ──────────────────────────────────────────────────────────

// Returns today's date as "YYYY-MM-DD"
function todayISO() {
  return new Date().toISOString().split("T")[0];
}

// Converts "HH:MM" to total minutes — used for overlap detection
function toMins(timeStr) {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
}

// ─── Messages ─────────────────────────────────────────────────────────────────

// Shows a success (green) or error (red) message that auto-clears after 4s
function showMessage(text, ok = true) {
  msg.className   = ok ? "mt-2 text-success fw-semibold" : "mt-2 text-danger fw-semibold";
  msg.textContent = text;
  clearTimeout(msg._t);
  msg._t = setTimeout(() => { msg.textContent = ""; }, 4000);
}

// ─── Form ─────────────────────────────────────────────────────────────────────

// Resets the add-item form to default values
function clearForm() {
  dateEl.value  = viewDateEl.value || todayISO();
  startEl.value = "10:00";
  endEl.value   = "12:00";
  areaEl.value  = "Downtown";
  typeEl.value  = "Explore";
  titleEl.value = "";
}

// Returns an error message string if the form is invalid, or null if valid
function validate() {
  if (!dateEl.value)                  return "Pick a date.";
  if (!startEl.value || !endEl.value) return "Pick start and end time.";
  if (endEl.value <= startEl.value)   return "End time must be after start.";
  if (!titleEl.value.trim())          return "Enter a title.";
  return null;
}

// ─── Overlap Detection ────────────────────────────────────────────────────────

// Returns true if the given time slot on a date overlaps any saved item
function hasOverlap(date, start, end, excludeId = null) {
  const newStart = toMins(start);
  const newEnd   = toMins(end);

  return getItems().some(item =>
    item.date === date &&
    item.id   !== excludeId &&
    newStart  < toMins(item.end) &&
    newEnd    > toMins(item.start)
  );
}

// ─── Add / Delete Items ───────────────────────────────────────────────────────

function addItem() {
  const err = validate();
  if (err) { showMessage(err, false); return; }

  if (hasOverlap(dateEl.value, startEl.value, endEl.value)) {
    showMessage("Time overlaps an existing item.", false);
    return;
  }

  const item = {
    id:        crypto.randomUUID(),
    date:      dateEl.value,
    start:     startEl.value,
    end:       endEl.value,
    area:      areaEl.value,
    type:      typeEl.value,
    title:     titleEl.value.trim(),
    createdAt: Date.now()
  };

  const items = getItems();
  items.push(item);
  setItems(items);

  showMessage(`"${item.title}" added!`);
  viewDateEl.value = item.date;  // Switch view to the date that was just added
  renderForDate(item.date);
  titleEl.value = "";            // Clear only the title so user can add more items
}

function deleteItem(id) {
  setItems(getItems().filter(item => item.id !== id));
  showMessage("Item deleted.");
  renderForDate(viewDateEl.value || todayISO());
}

// ─── Render Schedule ──────────────────────────────────────────────────────────

// Renders all schedule items for the given date, sorted by start time
function renderForDate(date) {
  const items = getItems()
    .filter(item => item.date === date)
    .sort((a, b) => a.start.localeCompare(b.start));

  scheduleList.innerHTML = "";

  // Show an empty state message if no date is selected or no items exist
  if (!date || !items.length) {
    const clone = tmplEmpty.content.cloneNode(true);
    const msgEl = clone.querySelector(".t-msg");
    if (!date) {
      msgEl.classList.add("alert-secondary");
      msgEl.textContent = "Select a date.";
    } else {
      msgEl.classList.add("alert-info");
      msgEl.textContent = `No items for ${date}. Add one above.`;
    }
    scheduleList.appendChild(clone);
    return;
  }

  // Render a card for each item using the HTML template
  for (const item of items) {
    const clone = tmplItem.content.cloneNode(true);
    clone.querySelector(".t-badge").className  += ` ${BADGE[item.type] || "text-bg-secondary"}`;
    clone.querySelector(".t-badge").textContent = item.type;
    clone.querySelector(".t-title").textContent = item.title;
    clone.querySelector(".t-meta").textContent  = `${item.date} • ${item.start}–${item.end} • ${item.area}`;
    clone.querySelector(".t-delete").addEventListener("click", () => deleteItem(item.id));
    scheduleList.appendChild(clone);
  }
}

// ─── Recommendations Context ──────────────────────────────────────────────────
// Analyses the schedule for a given date to figure out:
// - which area has the most items (dominant area)
// - which activity types are already covered
// - what category to suggest (what's missing)

function getScheduleContext(date) {
  const items = getItems().filter(item => item.date === date);
  if (!items.length) return { area: "All", coveredTypes: [], suggestedCategory: "All", totalItems: 0 };

  // Count how many items are in each area to find the dominant one
  const areaCounts = {};
  for (const item of items) {
    areaCounts[item.area] = (areaCounts[item.area] || 0) + 1;
  }
  const dominantArea = Object.entries(areaCounts)
    .reduce((best, [area, count]) => count > best[1] ? [area, count] : best, ["All", 0])[0];

  const coveredTypes = [...new Set(items.map(item => item.type))];

  // Suggest Eat if no food planned, Explore if no explore planned, otherwise All
  let suggestedCategory = "All";
  if (!coveredTypes.includes("Eat"))     suggestedCategory = "Eat";
  else if (!coveredTypes.includes("Explore")) suggestedCategory = "Explore";

  return { area: dominantArea, coveredTypes, suggestedCategory, totalItems: items.length };
}

// ─── Random Populate ──────────────────────────────────────────────────────────

// Fills the selected date with up to 5 random non-overlapping activities
function randomPopulate() {
  const activities = [
    { title: "Visit Stanley Park",          type: "Explore" },
    { title: "Explore Granville Island",    type: "Explore" },
    { title: "Walk the Seawall",            type: "Explore" },
    { title: "Visit Vancouver Art Gallery", type: "Explore" },
    { title: "Lunch Downtown",              type: "Eat"     },
    { title: "Coffee Break",               type: "Eat"     },
    { title: "Dinner Downtown",             type: "Eat"     },
    { title: "Watch World Cup Match",       type: "Match"   },
    { title: "SkyTrain Ride",              type: "Travel"  },
  ];

  const areas = ["Downtown", "Kitsilano", "UBC", "North Vancouver", "Richmond"];
  const date  = viewDateEl.value || todayISO();
  let items   = getItems();
  let currentHour = 9; // Start scheduling from 9 AM
  let added = 0;

  // Shuffle so we don't always get the same activities
  const shuffled = [...activities].sort(() => Math.random() - 0.5);

  for (const activity of shuffled) {
    if (added >= 5) break;

    const duration = Math.floor(Math.random() * 2) + 1; // 1 or 2 hours
    const endHour  = currentHour + duration;

    if (endHour > 23) break; // Don't schedule past midnight

    const start = String(currentHour).padStart(2, "0") + ":00";
    const end   = String(endHour).padStart(2, "0") + ":00";

    // Only add if the slot doesn't conflict with existing items
    if (!hasOverlap(date, start, end)) {
      items.push({
        id:        crypto.randomUUID(),
        date,
        start,
        end,
        area:      areas[Math.floor(Math.random() * areas.length)],
        type:      activity.type,
        title:     activity.title,
        createdAt: Date.now()
      });
      added++;
    }

    currentHour = endHour;
  }

  setItems(items);
  showMessage(`${added} random item${added !== 1 ? "s" : ""} added!`);
  renderForDate(date);
}

// ─── Event Listeners ──────────────────────────────────────────────────────────

document.getElementById("btnAdd").addEventListener("click", addItem);

document.getElementById("btnClear").addEventListener("click", () => {
  clearForm();
  showMessage("Form cleared.");
});

document.getElementById("btnClearAll").addEventListener("click", () => {
  if (!confirm("Delete ALL schedule items?")) return;
  setItems([]);
  showMessage("All items cleared.");
  renderForDate(viewDateEl.value || todayISO());
});

document.getElementById("btnRandom").addEventListener("click", randomPopulate);

// When the user picks a different view date, sync the form date and re-render
viewDateEl.addEventListener("change", () => {
  dateEl.value = viewDateEl.value;
  renderForDate(viewDateEl.value);
});

// Build the URL with schedule context and navigate to the recommendations page
document.getElementById("btnRecs").addEventListener("click", () => {
  const date = viewDateEl.value || todayISO();
  const ctx  = getScheduleContext(date);

  if (!ctx.totalItems) {
    showMessage("Add schedule items first!", false);
    return;
  }

  const params = new URLSearchParams({
    date,
    area:     ctx.area,
    category: ctx.suggestedCategory,
    covered:  ctx.coveredTypes.join(",")
  });

  window.location.href = `recommendations.html?${params.toString()}`;
});

// ─── Init ─────────────────────────────────────────────────────────────────────

viewDateEl.value = todayISO();
clearForm();
renderForDate(viewDateEl.value);