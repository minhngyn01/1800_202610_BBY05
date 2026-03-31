// src/recommendations.js
import { renderWeather } from "/src/weather.js";

// ─── Data ─────────────────────────────────────────────────────────────────────

const recs = [
  {
    id: "stanley-park", type: "Explore", name: "Stanley Park", area: "Downtown",
    desc: "Seawall, beaches, forest trails, scenic views.",
    tags: ["park", "seawall", "views", "nature"], img: "images/stanleypark.jpg"
  },
  {
    id: "granville-island", type: "Explore", name: "Granville Island Public Market", area: "Kitsilano",
    desc: "Public market, shops, and food stalls.",
    tags: ["market", "food", "shops"], img: "images/gran.jpg"
  },
  {
    id: "science-world", type: "Explore", name: "Science World", area: "Downtown",
    desc: "Interactive science exhibits and shows.",
    tags: ["museum", "family", "indoor"], img: "images/scienceworld.jpg"
  },
  {
    id: "vandusen", type: "Explore", name: "VanDusen Botanical Garden", area: "Kitsilano",
    desc: "Large botanical garden with seasonal displays.",
    tags: ["garden", "nature", "photos"], img: "images/vangarden.jpg"
  },
  {
    id: "moa", type: "Explore", name: "Museum of Anthropology (MOA)", area: "UBC",
    desc: "Iconic museum focused on world arts and cultures.",
    tags: ["museum", "culture", "ubc"], img: "images/museum.jpg"
  },
  {
    id: "grouse-mountain", type: "Explore", name: "Grouse Mountain", area: "North Vancouver",
    desc: "Mountain views and outdoor activities.",
    tags: ["mountain", "views", "hike"], img: "images/grouse.jpg"
  },
  {
    id: "capilano", type: "Explore", name: "Capilano Suspension Bridge", area: "North Vancouver",
    desc: "Suspension bridge and treetop walk.",
    tags: ["bridge", "views", "forest"], img: "images/capilano.jpg"
  },
  {
    id: "steveston", type: "Explore", name: "Steveston Village (Richmond)", area: "Richmond",
    desc: "Fishing village vibes and waterfront stroll.",
    tags: ["village", "seafood", "waterfront"], img: "images/steveston.jpg"
  },
  {
    id: "miku", type: "Eat", name: "Miku Restaurant", area: "Downtown",
    desc: "Popular for sushi/oshi style and waterfront dining.",
    tags: ["sushi", "japanese", "seafood"], vegetarian: true, img: "images/miku.jpg"
  },
  {
    id: "blue-water", type: "Eat", name: "Blue Water Cafe", area: "Downtown",
    desc: "Well-known seafood spot in Yaletown.",
    tags: ["seafood", "yaletown"], vegetarian: false, img: "images/bluecafe.jpg"
  },
  {
    id: "elisa", type: "Eat", name: "Elisa Steakhouse", area: "Downtown",
    desc: "Modern steakhouse in Yaletown.",
    tags: ["steak", "yaletown"], vegetarian: false, img: "images/elisasteak.jpg"
  },
  {
    id: "raminami", type: "Eat", name: "Minami Restaurant", area: "Downtown",
    desc: "Japanese dining in Yaletown.",
    tags: ["japanese", "sushi", "yaletown"], vegetarian: true, img: "images/minami.jpg"
  },
  {
    id: "ramen-danbo", type: "Eat", name: "Ramen Danbo (Robson)", area: "Downtown",
    desc: "Top rated ramen place.",
    tags: ["ramen", "japanese"], vegetarian: true, img: "images/ramen.jpg"
  },
];

// ─── DOM Elements ─────────────────────────────────────────────────────────────

const recsList         = document.getElementById("recsList");
const categoryFilter   = document.getElementById("categoryFilter");
const areaFilter       = document.getElementById("areaFilter");
const searchBox        = document.getElementById("searchBox");
const vegFilter        = document.getElementById("vegFilter");
const btnClear         = document.getElementById("btnClear");
const btnFavoritesOnly = document.getElementById("btnFavoritesOnly");
const msg              = document.getElementById("msg");
const tmplRec          = document.getElementById("tmpl-rec");
const tmplNoResults    = document.getElementById("tmpl-no-results");
const weatherWidget    = document.getElementById("weatherWidget");

let favoritesOnly = false;

// ─── Storage Helpers ──────────────────────────────────────────────────────────
// scheduleItems is shared with schedulePlanner.js via localStorage

function getScheduleItems() {
  try { return JSON.parse(localStorage.getItem("scheduleItems") || "[]"); }
  catch { return []; }
}
function setScheduleItems(items) { localStorage.setItem("scheduleItems", JSON.stringify(items)); }

function getFavorites() {
  try { return JSON.parse(localStorage.getItem("favorites") || "[]"); }
  catch { return []; }
}
function setFavorites(ids) { localStorage.setItem("favorites", JSON.stringify(ids)); }

// ─── Utility Helpers ──────────────────────────────────────────────────────────

function todayISO() { return new Date().toISOString().split("T")[0]; }

// Converts "HH:MM" to total minutes for overlap comparison
function toMinutes(timeStr) {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
}

function buildMapsLink(name) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name + ", Vancouver BC")}`;
}

// ─── Favorites ────────────────────────────────────────────────────────────────

function toggleFavorite(id) {
  const favs = new Set(getFavorites());
  favs.has(id) ? favs.delete(id) : favs.add(id);
  setFavorites([...favs]);
}

// ─── Schedule Helpers ─────────────────────────────────────────────────────────

// Returns true if the given time slot conflicts with an existing schedule item
function scheduleHasOverlap(date, start, end) {
  const newStart = toMinutes(start);
  const newEnd   = toMinutes(end);
  return getScheduleItems().some(item =>
    item.date === date &&
    newStart < toMinutes(item.end) &&
    newEnd   > toMinutes(item.start)
  );
}

// Validates the mini-form, then saves the rec as a schedule item
function addToSchedule(placeName, placeArea, formEl) {
  const date    = formEl.querySelector(".t-ats-date").value;
  const start   = formEl.querySelector(".t-ats-start").value;
  const end     = formEl.querySelector(".t-ats-end").value;
  const type    = formEl.querySelector(".t-ats-type").value;
  const errorEl = formEl.querySelector(".t-ats-err");

  if (!date)                              { errorEl.textContent = "Pick a date."; return; }
  if (!start || !end)                     { errorEl.textContent = "Set a start and end time."; return; }
  if (end <= start)                       { errorEl.textContent = "End time must be after start."; return; }
  if (scheduleHasOverlap(date, start, end)) { errorEl.textContent = "Overlaps an existing schedule item."; return; }

  const items = getScheduleItems();
  items.push({ id: crypto.randomUUID(), date, start, end, area: placeArea, type, title: placeName, createdAt: Date.now() });
  setScheduleItems(items);

  // Replace the form with a success confirmation
  formEl.innerHTML = `<div class="alert alert-success py-2 mb-0 small">✓ Added for ${date}! <a href="schedule.html" class="alert-link ms-1">View schedule →</a></div>`;
}

// ─── Filtering ────────────────────────────────────────────────────────────────

// Checks if a single rec passes all active filters
function matchesFilters(rec) {
  const query        = (searchBox.value || "").trim().toLowerCase();
  const searchTarget = `${rec.name} ${rec.desc} ${rec.area} ${rec.tags.join(" ")}`.toLowerCase();

  return (categoryFilter.value === "All" || rec.type === categoryFilter.value) &&
         (areaFilter.value === "All"     || rec.area === areaFilter.value) &&
         (!query                         || searchTarget.includes(query)) &&
         (!favoritesOnly                 || new Set(getFavorites()).has(rec.id)) &&
         (!vegFilter.checked             || rec.vegetarian === true);
}

// ─── Rendering ────────────────────────────────────────────────────────────────

function render() {
  const savedFavs    = new Set(getFavorites());
  const filteredRecs = recs.filter(matchesFilters);
  recsList.innerHTML = "";

  if (!filteredRecs.length) {
    recsList.appendChild(tmplNoResults.content.cloneNode(true));
    return;
  }

  const today = todayISO();

  for (const rec of filteredRecs) {
    const card  = tmplRec.content.cloneNode(true);
    const isFav = savedFavs.has(rec.id);

    // Fill in card content from the rec data
    card.querySelector(".t-img").src          = rec.img;
    card.querySelector(".t-img").alt          = rec.name;
    card.querySelector(".t-name").textContent = rec.name;
    card.querySelector(".t-area").textContent = `Area: ${rec.area}`;
    card.querySelector(".t-desc").textContent = rec.desc;
    card.querySelector(".t-maps").href        = buildMapsLink(rec.name);
    card.querySelector(".t-fav").textContent  = isFav ? "Saved ✓" : "Save";

    // Badge color: blue for Explore, green for Eat
    const badge = card.querySelector(".t-badge");
    badge.textContent = rec.type;
    badge.classList.add(rec.type === "Explore" ? "text-bg-info" : "text-bg-success");

    // Default the mini-form date to today
    const dateInput = card.querySelector(".t-ats-date");
    dateInput.value = today;
    dateInput.min   = today;

    // Mini-form toggle and button wiring
    const atsForm   = card.querySelector(".t-ats-form");
    const atsToggle = card.querySelector(".t-ats-toggle");

    atsToggle.addEventListener("click", () => {
      const isOpen = atsForm.style.display === "block";
      atsForm.style.display = isOpen ? "none" : "block";
      atsToggle.textContent = isOpen ? "+ Schedule" : "✕ Cancel";
    });

    card.querySelector(".t-ats-cancel").addEventListener("click", () => {
      atsForm.style.display = "none";
      atsToggle.textContent = "+ Schedule";
    });

    card.querySelector(".t-ats-confirm").addEventListener("click", () => {
      addToSchedule(rec.name, rec.area, atsForm);
    });

    card.querySelector(".t-fav").addEventListener("click", () => {
      toggleFavorite(rec.id);
      msg.className   = "mt-3 text-success";
      msg.textContent = "Updated favorites!";
      render();
    });

    recsList.appendChild(card);
  }
}

// ─── Clear Filters ────────────────────────────────────────────────────────────

function clearFilters() {
  categoryFilter.value = "All";
  areaFilter.value     = "All";
  searchBox.value      = "";
  vegFilter.checked    = false;
  favoritesOnly        = false;
  btnFavoritesOnly.classList.replace("btn-secondary", "btn-outline-secondary");
  msg.textContent = "";
  render();
}

// ─── URL Params (passed from Schedule page) ───────────────────────────────────
// Pre-sets filters based on what the user already has in their schedule

function applyURLParams() {
  const params   = new URLSearchParams(window.location.search);
  const area     = params.get("area");
  const date     = params.get("date");
  const category = params.get("category");
  const covered  = params.get("covered"); // types already in the schedule (comma-separated)

  if (area && area !== "All" && [...areaFilter.options].find(o => o.value === area))
    areaFilter.value = area;

  if (category && category !== "All" && [...categoryFilter.options].find(o => o.value === category))
    categoryFilter.value = category;

  if (date) {
    const coveredList = covered ? covered.split(",").filter(Boolean) : [];
    let banner = `Recommendations for your schedule on ${date}`;
    if (area && area !== "All") banner += ` · Area: ${area}`;
    if (coveredList.length)     banner += ` · Already planned: ${coveredList.join(", ")}`;
    if (category && category !== "All")
      banner += ` · Showing: ${category === "Eat" ? "Restaurants" : "Places to Explore"} you haven't planned yet`;
    msg.className   = "mt-3 text-info fw-semibold";
    msg.textContent = banner;
    renderWeather(weatherWidget, date); // Show forecast for the schedule date
  }
}

// ─── Event Listeners ──────────────────────────────────────────────────────────

categoryFilter.addEventListener("change", render);
areaFilter.addEventListener("change", render);
searchBox.addEventListener("input", render);
vegFilter.addEventListener("change", render);
btnClear.addEventListener("click", clearFilters);

btnFavoritesOnly.addEventListener("click", () => {
  favoritesOnly = !favoritesOnly;
  btnFavoritesOnly.classList.toggle("btn-secondary", favoritesOnly);
  btnFavoritesOnly.classList.toggle("btn-outline-secondary", !favoritesOnly);
  msg.className   = "mt-3";
  msg.textContent = favoritesOnly ? "Showing favorites only." : "";
  render();
});

// ─── Init ─────────────────────────────────────────────────────────────────────

applyURLParams();
render();