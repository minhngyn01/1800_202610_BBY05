/**
 * favorites.js
 *
 * Loads the current user's favorite recommendations from Firestore
 * and renders them as cards with "Add to Schedule" and "Remove" actions.
 * Falls back to localStorage for guests.
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, collection, doc, deleteDoc,
  getDocs, setDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { firebaseConfig } from "./firebaseConfig.js";

const app  = initializeApp(firebaseConfig);
const db   = getFirestore(app);
const auth = getAuth(app);

const BADGE_COLORS = {
  Explore: "bg-primary",
  Eat:     "bg-success",
  Match:   "bg-danger",
  Travel:  "bg-warning text-dark",
};

// ── Load favorites ─────────────────────────────────────────────────────────

async function loadFavorites(user) {
  if (user) {
    const snap = await getDocs(collection(db, "users", user.uid, "favorites"));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }
  return JSON.parse(localStorage.getItem("favorites") || "[]");
}

async function removeFavorite(user, id) {
  if (user) {
    await deleteDoc(doc(db, "users", user.uid, "favorites", id));
  } else {
    const favs = JSON.parse(localStorage.getItem("favorites") || "[]")
      .filter(f => f.id !== id);
    localStorage.setItem("favorites", JSON.stringify(favs));
  }
}

async function addToSchedule(user, item) {
  const schedItem = {
    id:        crypto.randomUUID(),
    date:      item.date,
    startTime: item.startTime,
    endTime:   item.endTime,
    area:      item.area,
    type:      item.type,
    title:     item.name,
  };
  if (user) {
    await setDoc(doc(db, "users", user.uid, "scheduleItems", schedItem.id), schedItem);
  } else {
    const items = JSON.parse(localStorage.getItem("scheduleItems") || "[]");
    items.push(schedItem);
    localStorage.setItem("scheduleItems", JSON.stringify(items));
  }
}

// ── Render ─────────────────────────────────────────────────────────────────

async function render(user) {
  const list   = document.getElementById("favsList");
  const msgEl  = document.getElementById("favMsg");
  list.innerHTML = "";
  msgEl.innerHTML = "";

  const favs = await loadFavorites(user);

  if (favs.length === 0) {
    const tmpl  = document.getElementById("tmpl-empty");
    list.appendChild(tmpl.content.cloneNode(true));
    return;
  }

  favs.forEach(fav => {
    const tmpl  = document.getElementById("tmpl-fav");
    const clone = tmpl.content.cloneNode(true);

    clone.querySelector(".t-img").src = fav.image || "";
    clone.querySelector(".t-img").alt = fav.name || "";
    clone.querySelector(".t-name").textContent = fav.name || "";
    clone.querySelector(".t-badge").className =
      `t-badge badge ms-2 flex-shrink-0 ${BADGE_COLORS[fav.type] || "bg-secondary"}`;
    clone.querySelector(".t-badge").textContent = fav.type || "";
    clone.querySelector(".t-area").textContent  = fav.area || "";
    clone.querySelector(".t-desc").textContent  = fav.description || "";

    const mapsUrl = fav.mapsUrl || `https://www.google.com/maps/search/${encodeURIComponent(fav.name + " Vancouver")}`;
    clone.querySelector(".t-maps").href = mapsUrl;

    const atsToggle  = clone.querySelector(".t-ats-toggle");
    const atsForm    = clone.querySelector(".t-ats-form");
    const atsConfirm = clone.querySelector(".t-ats-confirm");
    const atsCancel  = clone.querySelector(".t-ats-cancel");
    const atsErr     = clone.querySelector(".t-ats-err");

    atsToggle.addEventListener("click", () => {
      atsForm.style.display = atsForm.style.display === "none" ? "" : "none";
    });
    atsCancel.addEventListener("click", () => { atsForm.style.display = "none"; });
    atsConfirm.addEventListener("click", async () => {
      const date  = atsForm.querySelector(".t-ats-date").value;
      const start = atsForm.querySelector(".t-ats-start").value;
      const end   = atsForm.querySelector(".t-ats-end").value;
      const type  = atsForm.querySelector(".t-ats-type").value;
      if (!date) { atsErr.textContent = "Please pick a date."; return; }
      await addToSchedule(user, { ...fav, date, startTime: start, endTime: end, type });
      atsForm.style.display = "none";
      atsErr.textContent = "";
      showToast(`"${fav.name}" added to schedule!`);
    });

    clone.querySelector(".t-unfav").addEventListener("click", async () => {
      await removeFavorite(user, fav.id);
      await render(user);
    });

    list.appendChild(clone);
  });
}

function showToast(msg) {
  // Simple fallback toast since this page doesn't have a toast element by default
  alert(msg);
}

// ── Init ───────────────────────────────────────────────────────────────────

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    // Guests can still see localStorage favorites
  }
  await render(user);
});

// Back to top
window.addEventListener("scroll", () => {
  document.getElementById("backToTop").style.display =
    window.scrollY > 300 ? "flex" : "none";
});
document.getElementById("backToTop").addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});
