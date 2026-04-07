// src/recommendations.js
import { db, auth }      from "/src/firebaseConfig.js";
import { renderWeather } from "/src/weather.js";
import {
  collection, doc, setDoc, deleteDoc, getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

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
let currentUser   = null;
let favIds        = new Set(); // Cached favorite IDs for current user

// ─── Favorites (Firestore + localStorage fallback) ────────────────────────────

async function loadFavIds() {
  if (currentUser) {
    const snap = await getDocs(collection(db, "users", currentUser.uid, "favorites"));
    favIds = new Set(snap.docs.map(d => d.id));
  } else {
    try { favIds = new Set(JSON.parse(localStorage.getItem("favorites") || "[]")); }
    catch { favIds = new Set(); }
  }
}

async function toggleFavorite(id) {
  const isFav = favIds.has(id);
  if (currentUser) {
    const ref = doc(db, "users", currentUser.uid, "favorites", id);
    if (isFav) await deleteDoc(ref);
    else await setDoc(ref, { id, savedAt: Date.now() });
  } else {
    isFav ? favIds.delete(id) : favIds.add(id);
    localStorage.setItem("favorites", JSON.stringify([...favIds]));
  }
  isFav ? favIds.delete(id) : favIds.add(id);
}

// ─── Schedule helpers ─────────────────────────────────────────────────────────

async function getScheduleItems() {
  if (currentUser) {
    const snap = await getDocs(collection(db, "users", currentUser.uid, "scheduleItems"));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }
  try { return JSON.parse(localStorage.getItem("scheduleItems") || "[]"); }
  catch { return []; }
}

async function saveScheduleItem(item) {
  if (currentUser) {
    await setDoc(doc(db, "users", currentUser.uid, "scheduleItems", item.id), item);
  } else {
    const items = await getScheduleItems();
    items.push(item);
    localStorage.setItem("scheduleItems", JSON.stringify(items));
  }
}

function todayISO() { return new Date().toISOString().split("T")[0]; }
function toMinutes(t) { const [h, m] = t.split(":").map(Number); return h * 60 + m; }
function buildMapsLink(name) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name + ", Vancouver BC")}`;
}

async function scheduleHasOverlap(date, start, end) {
  const items = await getScheduleItems();
  const ns = toMinutes(start), ne = toMinutes(end);
  return items.some(item =>
    item.date === date && ns < toMinutes(item.end) && ne > toMinutes(item.start)
  );
}

async function addToSchedule(placeName, placeArea, formEl) {
  const date    = formEl.querySelector(".t-ats-date").value;
  const start   = formEl.querySelector(".t-ats-start").value;
  const end     = formEl.querySelector(".t-ats-end").value;
  const type    = formEl.querySelector(".t-ats-type").value;
  const errorEl = formEl.querySelector(".t-ats-err");

  if (!date)          { errorEl.textContent = "Pick a date."; return; }
  if (!start || !end) { errorEl.textContent = "Set a start and end time."; return; }
  if (end <= start)   { errorEl.textContent = "End time must be after start."; return; }
  if (await scheduleHasOverlap(date, start, end)) {
    errorEl.textContent = "Overlaps an existing schedule item."; return;
  }

  await saveScheduleItem({
    id: crypto.randomUUID(), date, start, end,
    area: placeArea, type, title: placeName, createdAt: Date.now()
  });
  formEl.innerHTML = `<div class="alert alert-success py-2 mb-0 small">✓ Added for ${date}! <a href="schedule.html" class="alert-link ms-1">View schedule →</a></div>`;
}

// ─── Filtering ────────────────────────────────────────────────────────────────

function matchesFilters(rec) {
  const query        = (searchBox.value || "").trim().toLowerCase();
  const searchTarget = `${rec.name} ${rec.desc} ${rec.area} ${rec.tags.join(" ")}`.toLowerCase();
  return (categoryFilter.value === "All" || rec.type === categoryFilter.value) &&
         (areaFilter.value === "All"     || rec.area === areaFilter.value) &&
         (!query                         || searchTarget.includes(query)) &&
         (!favoritesOnly                 || favIds.has(rec.id)) &&
         (!vegFilter.checked             || rec.vegetarian === true);
}

// ─── Rendering ────────────────────────────────────────────────────────────────

function render() {
  const filteredRecs = recs.filter(matchesFilters);
  recsList.innerHTML = "";

  if (!filteredRecs.length) {
    recsList.appendChild(tmplNoResults.content.cloneNode(true));
    return;
  }

  const today = todayISO();
  for (const rec of filteredRecs) {
    const card  = tmplRec.content.cloneNode(true);
    const isFav = favIds.has(rec.id);

    card.querySelector(".t-img").src          = rec.img;
    card.querySelector(".t-img").alt          = rec.name;
    card.querySelector(".t-name").textContent = rec.name;
    card.querySelector(".t-area").textContent = `Area: ${rec.area}`;
    card.querySelector(".t-desc").textContent = rec.desc;
    card.querySelector(".t-maps").href        = buildMapsLink(rec.name);
    card.querySelector(".t-fav").textContent  = isFav ? "Saved ✓" : "Save";

    const badge = card.querySelector(".t-badge");
    badge.textContent = rec.type;
    badge.classList.add(rec.type === "Explore" ? "text-bg-info" : "text-bg-success");

    const dateInput = card.querySelector(".t-ats-date");
    dateInput.value = today; dateInput.min = today;

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

    card.querySelector(".t-fav").addEventListener("click", async () => {
      await toggleFavorite(rec.id);
      msg.className   = "mt-3 text-success";
      msg.textContent = favIds.has(rec.id) ? "Added to favorites!" : "Removed from favorites!";
      render();
    });

    recsList.appendChild(card);
  }
}

// ─── Clear Filters ────────────────────────────────────────────────────────────

function clearFilters() {
  categoryFilter.value = "All"; areaFilter.value = "All";
  searchBox.value = ""; vegFilter.checked = false;
  favoritesOnly = false;
  btnFavoritesOnly.classList.replace("btn-secondary", "btn-outline-secondary");
  msg.textContent = "";
  render();
}

// ─── URL Params ───────────────────────────────────────────────────────────────

function applyURLParams() {
  const params   = new URLSearchParams(window.location.search);
  const area     = params.get("area");
  const date     = params.get("date");
  const category = params.get("category");
  const covered  = params.get("covered");

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
    if (weatherWidget) renderWeather(weatherWidget, date);
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
  await loadFavIds();
  render();
});

// ─── Init ─────────────────────────────────────────────────────────────────────

applyURLParams();
loadFavIds().then(render);