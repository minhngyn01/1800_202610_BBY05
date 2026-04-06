/**
 * recommendations.js
 *
 * Changes from original:
 * - Recommendation data is now loaded from Firestore "recommendations" collection
 *   instead of being hardcoded in the JS file.
 * - Favorites are saved to / read from Firestore per user (localStorage fallback for guests).
 * - Weather widget loads based on ?date= query param (passed from schedule page).
 * - All filter/search logic preserved from original.
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection, doc, setDoc, deleteDoc, getDoc, getDocs,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getAuth, onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { firebaseConfig } from "./firebaseConfig.js";

const app  = initializeApp(firebaseConfig);
const db   = getFirestore(app);
const auth = getAuth(app);

// ── State ──────────────────────────────────────────────────────────────────

let allRecs    = [];
let favorites  = new Set();
let currentUser = null;

// ── Load recommendations from Firestore ────────────────────────────────────

async function loadRecommendations() {
  try {
    const snap = await getDocs(collection(db, "recommendations"));
    if (!snap.empty) {
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }
  } catch (e) {
    // Firestore read failed (rules, offline, etc.) — fall through to defaults
    console.warn("Could not load recommendations from Firestore, using defaults.", e);
  }
  // Always return defaults if Firestore is empty or unavailable.
  // An admin can seed Firestore manually; guests always see this data.
  return getDefaultRecommendations();
}

// ── Load / save favorites ──────────────────────────────────────────────────

async function loadFavorites(user) {
  if (user) {
    const snap = await getDocs(collection(db, "users", user.uid, "favorites"));
    return new Set(snap.docs.map(d => d.id));
  }
  return new Set(JSON.parse(localStorage.getItem("favoriteIds") || "[]"));
}

async function toggleFavorite(user, rec) {
  const isFav = favorites.has(rec.id);
  if (user) {
    const ref = doc(db, "users", user.uid, "favorites", rec.id);
    if (isFav) {
      await deleteDoc(ref);
    } else {
      await setDoc(ref, rec);
    }
  } else {
    const ids = JSON.parse(localStorage.getItem("favoriteIds") || "[]");
    const updated = isFav ? ids.filter(i => i !== rec.id) : [...ids, rec.id];
    localStorage.setItem("favoriteIds", JSON.stringify(updated));
    // Also store full rec data for guest favorites page
    const stored = JSON.parse(localStorage.getItem("favorites") || "[]");
    const updatedFull = isFav
      ? stored.filter(r => r.id !== rec.id)
      : [...stored, rec];
    localStorage.setItem("favorites", JSON.stringify(updatedFull));
  }
  if (isFav) favorites.delete(rec.id); else favorites.add(rec.id);
}

// ── Add to schedule ────────────────────────────────────────────────────────

async function addToSchedule(user, rec, date, startTime, endTime, type) {
  const item = {
    id:        crypto.randomUUID(),
    date,
    startTime,
    endTime,
    area:      rec.area,
    type,
    title:     rec.name,
  };
  if (user) {
    await setDoc(doc(db, "users", user.uid, "scheduleItems", item.id), item);
  } else {
    const items = JSON.parse(localStorage.getItem("scheduleItems") || "[]");
    items.push(item);
    localStorage.setItem("scheduleItems", JSON.stringify(items));
  }
}

// ── Render ─────────────────────────────────────────────────────────────────

const BADGE_COLORS = {
  Explore: "bg-primary",
  Eat:     "bg-success",
  Match:   "bg-danger",
  Travel:  "bg-warning text-dark",
};

function renderRecs(recs) {
  const list = document.getElementById("recsList");
  list.innerHTML = "";

  if (recs.length === 0) {
    const tmpl  = document.getElementById("tmpl-no-results");
    list.appendChild(tmpl.content.cloneNode(true));
    return;
  }

  recs.forEach(rec => {
    const tmpl  = document.getElementById("tmpl-rec");
    const clone = tmpl.content.cloneNode(true);

    clone.querySelector(".t-img").src  = rec.image || "";
    clone.querySelector(".t-img").alt  = rec.name  || "";
    clone.querySelector(".t-name").textContent = rec.name || "";
    clone.querySelector(".t-badge").className =
      `t-badge badge ms-2 flex-shrink-0 ${BADGE_COLORS[rec.type] || "bg-secondary"}`;
    clone.querySelector(".t-badge").textContent = rec.type || "";
    clone.querySelector(".t-area").textContent  = rec.area || "";
    clone.querySelector(".t-desc").textContent  = rec.description || "";

    const mapsUrl = rec.mapsUrl ||
      `https://www.google.com/maps/search/${encodeURIComponent(rec.name + " Vancouver")}`;
    clone.querySelector(".t-maps").href = mapsUrl;

    // Favorite button
    const favBtn = clone.querySelector(".t-fav");
    const isFav  = favorites.has(rec.id);
    favBtn.textContent = isFav ? "★ Saved" : "☆ Save";
    favBtn.className   = `t-fav btn btn-sm ms-auto ${isFav ? "btn-warning" : "btn-outline-warning"}`;
    favBtn.addEventListener("click", async () => {
      await toggleFavorite(currentUser, rec);
      const nowFav = favorites.has(rec.id);
      favBtn.textContent = nowFav ? "★ Saved" : "☆ Save";
      favBtn.className   = `t-fav btn btn-sm ms-auto ${nowFav ? "btn-warning" : "btn-outline-warning"}`;
    });

    // Add to schedule toggle
    const atsToggle  = clone.querySelector(".t-ats-toggle");
    const atsForm    = clone.querySelector(".t-ats-form");
    const atsConfirm = clone.querySelector(".t-ats-confirm");
    const atsCancel  = clone.querySelector(".t-ats-cancel");
    const atsErr     = clone.querySelector(".t-ats-err");

    // Pre-fill date if coming from schedule page
    const urlDate = new URLSearchParams(window.location.search).get("date");
    if (urlDate) atsForm.querySelector(".t-ats-date").value = urlDate;

    atsToggle.addEventListener("click", () => {
      atsForm.style.display = atsForm.style.display === "none" ? "" : "none";
    });
    atsCancel.addEventListener("click",  () => { atsForm.style.display = "none"; });
    atsConfirm.addEventListener("click", async () => {
      const date  = atsForm.querySelector(".t-ats-date").value;
      const start = atsForm.querySelector(".t-ats-start").value;
      const end   = atsForm.querySelector(".t-ats-end").value;
      const type  = atsForm.querySelector(".t-ats-type").value;
      if (!date) { atsErr.textContent = "Please pick a date."; return; }
      await addToSchedule(currentUser, rec, date, start, end, type);
      atsForm.style.display = "none";
      atsErr.textContent    = "";
      showToast(`"${rec.name}" added to schedule!`);
    });

    list.appendChild(clone);
  });
}

function applyFilters() {
  const category  = document.getElementById("categoryFilter").value;
  const area      = document.getElementById("areaFilter").value;
  const search    = document.getElementById("searchBox").value.toLowerCase();
  const vegOnly   = document.getElementById("vegFilter").checked;
  const favOnly   = document.getElementById("btnFavoritesOnly").classList.contains("active");

  const filtered = allRecs.filter(r => {
    if (category !== "All" && r.type !== category) return false;
    if (area     !== "All" && r.area !== area)     return false;
    if (vegOnly  && !r.vegetarian)                 return false;
    if (favOnly  && !favorites.has(r.id))          return false;
    if (search   && !r.name.toLowerCase().includes(search) &&
                    !r.description?.toLowerCase().includes(search)) return false;
    return true;
  });

  document.getElementById("msg").textContent =
    filtered.length === allRecs.length ? "" : `Showing ${filtered.length} of ${allRecs.length} places`;

  renderRecs(filtered);
}

// ── Weather widget ─────────────────────────────────────────────────────────

async function loadWeather(dateStr) {
  const widget = document.getElementById("weatherWidget");
  if (!dateStr) { widget.innerHTML = ""; return; }
  const today = new Date().toISOString().split("T")[0];
  if (dateStr < today) { widget.innerHTML = ""; return; }

  try {
    const res  = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=49.2827&longitude=-123.1207` +
      `&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum` +
      `&timezone=America%2FVancouver&start_date=${dateStr}&end_date=${dateStr}`
    );
    const data = await res.json();
    if (!data.daily?.weathercode?.length) { widget.innerHTML = ""; return; }

    const code = data.daily.weathercode[0];
    const tMax = Math.round(data.daily.temperature_2m_max[0]);
    const tMin = Math.round(data.daily.temperature_2m_min[0]);
    const rain = data.daily.precipitation_sum[0];

    const icons = {
      0:"☀️",1:"🌤️",2:"⛅",3:"☁️",45:"🌫️",48:"🌫️",
      51:"🌦️",53:"🌦️",55:"🌧️",61:"🌧️",63:"🌧️",65:"🌧️",
      71:"🌨️",73:"🌨️",75:"🌨️",80:"🌦️",81:"🌧️",82:"⛈️",95:"⛈️",
    };
    const icon = icons[code] ?? "🌡️";
    const d    = new Date(dateStr + "T00:00:00");
    const label = d.toLocaleDateString("en-CA",
      { weekday:"long", year:"numeric", month:"long", day:"numeric" });

    widget.innerHTML = `
      <div class="card shadow-sm">
        <div class="card-body d-flex align-items-center gap-3 flex-wrap">
          <span style="font-size:2rem;">${icon}</span>
          <div>
            <strong>Vancouver Weather — ${label}</strong>
            <div class="text-muted small">
              High ${tMax}°C / Low ${tMin}°C · 
              ${rain > 0 ? `${rain} mm precipitation` : "No precipitation expected"}
            </div>
          </div>
        </div>
      </div>`;
  } catch { widget.innerHTML = ""; }
}

// ── Toast ──────────────────────────────────────────────────────────────────

function showToast(msg) {
  // Lightweight toast without a dedicated element — create on demand
  const el = document.createElement("div");
  el.className = "position-fixed bottom-0 end-0 m-3 alert alert-success shadow";
  el.style.zIndex = "9999";
  el.textContent  = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2500);
}

// ── Init ───────────────────────────────────────────────────────────────────

// Load recommendations immediately — they are public and don't need auth.
// Auth state resolves separately and refreshes favorite button states.
(async () => {
  allRecs = await loadRecommendations();
  applyFilters();
})();

onAuthStateChanged(auth, async (user) => {
  currentUser = user || null;
  favorites = await loadFavorites(user);
  // Re-render so favorite buttons reflect login state
  if (allRecs.length > 0) applyFilters();
});

// Weather from ?date= param
const urlDate = new URLSearchParams(window.location.search).get("date");
if (urlDate) loadWeather(urlDate);

// Filter listeners
document.getElementById("categoryFilter").addEventListener("change", applyFilters);
document.getElementById("areaFilter").addEventListener("change",    applyFilters);
document.getElementById("searchBox").addEventListener("input",      applyFilters);
document.getElementById("vegFilter").addEventListener("change",     applyFilters);

document.getElementById("btnFavoritesOnly").addEventListener("click", (e) => {
  e.currentTarget.classList.toggle("active");
  applyFilters();
});

document.getElementById("btnClear").addEventListener("click", () => {
  document.getElementById("categoryFilter").value = "All";
  document.getElementById("areaFilter").value     = "All";
  document.getElementById("searchBox").value      = "";
  document.getElementById("vegFilter").checked    = false;
  document.getElementById("btnFavoritesOnly").classList.remove("active");
  applyFilters();
});

// Back to top
window.addEventListener("scroll", () => {
  document.getElementById("backToTop").style.display =
    window.scrollY > 300 ? "flex" : "none";
});
document.getElementById("backToTop").addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});

// ── Default recommendations data (seeds Firestore on first load) ───────────

function getDefaultRecommendations() {
  return [
    {
      id: "stanley-park",
      name: "Stanley Park",
      type: "Explore",
      area: "Downtown",
      description: "A massive urban park with sea walls, forests, and stunning views of the harbour.",
      vegetarian: true,
      image: "https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=600&q=80",
      mapsUrl: "https://www.google.com/maps/place/Stanley+Park,+Vancouver,+BC",
    },
    {
      id: "granville-island",
      name: "Granville Island Public Market",
      type: "Explore",
      area: "Kitsilano",
      description: "A vibrant market with fresh produce, artisan goods, street food, and local vendors.",
      vegetarian: true,
      image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&q=80",
      mapsUrl: "https://www.google.com/maps/place/Granville+Island+Public+Market",
    },
    {
      id: "capilano-bridge",
      name: "Capilano Suspension Bridge",
      type: "Explore",
      area: "North Vancouver",
      description: "Walk across a 137-metre suspension bridge over a breathtaking canyon and old-growth forest.",
      vegetarian: true,
      image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=600&q=80",
      mapsUrl: "https://www.google.com/maps/place/Capilano+Suspension+Bridge+Park",
    },
    {
      id: "ubc-museum",
      name: "UBC Museum of Anthropology",
      type: "Explore",
      area: "UBC",
      description: "World-class collection of Northwest Coast First Nations art and culture.",
      vegetarian: true,
      image: "https://images.unsplash.com/photo-1554907984-15263bfd63bd?w=600&q=80",
      mapsUrl: "https://www.google.com/maps/place/Museum+of+Anthropology+at+UBC",
    },
    {
      id: "richmond-night-market",
      name: "Richmond Night Market",
      type: "Eat",
      area: "Richmond",
      description: "North America's largest night market — hundreds of Asian street food stalls and entertainment.",
      vegetarian: true,
      image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80",
      mapsUrl: "https://www.google.com/maps/place/Richmond+Night+Market",
    },
    {
      id: "miku-restaurant",
      name: "Miku Restaurant",
      type: "Eat",
      area: "Downtown",
      description: "Upscale Japanese restaurant renowned for aburi (flame-seared) sushi on the waterfront.",
      vegetarian: false,
      image: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=600&q=80",
      mapsUrl: "https://www.google.com/maps/place/Miku+Restaurant+Vancouver",
    },
    {
      id: "naam-restaurant",
      name: "The Naam",
      type: "Eat",
      area: "Kitsilano",
      description: "Vancouver's oldest natural food restaurant — fully vegetarian, open 24 hours.",
      vegetarian: true,
      image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&q=80",
      mapsUrl: "https://www.google.com/maps/place/The+Naam+Restaurant",
    },
    {
      id: "canada-place",
      name: "Canada Place",
      type: "Explore",
      area: "Downtown",
      description: "Iconic sail-shaped convention and cruise ship terminal with panoramic harbour views.",
      vegetarian: true,
      image: "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=600&q=80",
      mapsUrl: "https://www.google.com/maps/place/Canada+Place",
    },
    {
      id: "lonsdale-quay",
      name: "Lonsdale Quay Market",
      type: "Explore",
      area: "North Vancouver",
      description: "Waterfront public market with fresh food, boutique shops, and a SeaBus terminal.",
      vegetarian: true,
      image: "https://images.unsplash.com/photo-1519677100203-a0e668c92439?w=600&q=80",
      mapsUrl: "https://www.google.com/maps/place/Lonsdale+Quay+Market",
    },
    {
      id: "vij-restaurant",
      name: "Vij's Restaurant",
      type: "Eat",
      area: "Downtown",
      description: "Award-winning modern Indian cuisine — one of Vancouver's most celebrated restaurants.",
      vegetarian: true,
      image: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=600&q=80",
      mapsUrl: "https://www.google.com/maps/place/Vij%27s+Restaurant",
    },
    {
      id: "ubc-botanical",
      name: "UBC Botanical Garden",
      type: "Explore",
      area: "UBC",
      description: "75 acres of themed gardens including Asian, Alpine, and the famous Nitobe Memorial Garden.",
      vegetarian: true,
      image: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=600&q=80",
      mapsUrl: "https://www.google.com/maps/place/UBC+Botanical+Garden",
    },
    {
      id: "steveston-village",
      name: "Steveston Village",
      type: "Explore",
      area: "Richmond",
      description: "Charming historic fishing village with fresh-off-the-boat seafood and heritage sites.",
      vegetarian: false,
      image: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=600&q=80",
      mapsUrl: "https://www.google.com/maps/place/Steveston,+Richmond,+BC",
    },
  ];
}