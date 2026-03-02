// src/recommendations.js

const recs = [
  // ===== Places to Explore =====
  {
    id: "stanley-park",
    type: "Explore",
    name: "Stanley Park",
    area: "Downtown",
    desc: "Seawall, beaches, forest trails, scenic views.",
    tags: ["park", "seawall", "views", "nature"],
  },
  {
    id: "granville-island",
    type: "Explore",
    name: "Granville Island Public Market",
    area: "Kitsilano",
    desc: "Public market + shops + food stalls (great daytime stop).",
    tags: ["market", "food", "shops"],
  },
  {
    id: "science-world",
    type: "Explore",
    name: "Science World",
    area: "Downtown",
    desc: "Interactive science exhibits and shows (great indoor option).",
    tags: ["museum", "family", "indoor"],
  },
  {
    id: "vandusen",
    type: "Explore",
    name: "VanDusen Botanical Garden",
    area: "Kitsilano",
    desc: "Large botanical garden with seasonal displays.",
    tags: ["garden", "nature", "photos"],
  },
  {
    id: "moa",
    type: "Explore",
    name: "Museum of Anthropology (MOA)",
    area: "UBC",
    desc: "Iconic museum at UBC focused on world arts & cultures.",
    tags: ["museum", "culture", "ubc"],
  },
  {
    id: "grouse-mountain",
    type: "Explore",
    name: "Grouse Mountain",
    area: "North Vancouver",
    desc: "Mountain views, outdoor activities, seasonal attractions.",
    tags: ["mountain", "views", "hike"],
  },
  {
    id: "capilano",
    type: "Explore",
    name: "Capilano Suspension Bridge",
    area: "North Vancouver",
    desc: "Suspension bridge + treetop walk (popular tourist spot).",
    tags: ["bridge", "views", "forest"],
  },
  {
    id: "steveston",
    type: "Explore",
    name: "Steveston Village (Richmond)",
    area: "Richmond",
    desc: "Fishing village vibes + waterfront stroll + great seafood nearby.",
    tags: ["village", "seafood", "waterfront"],
  },

  // ===== Restaurants =====
  {
    id: "miku",
    type: "Eat",
    name: "Miku Restaurant",
    area: "Downtown",
    desc: "Popular for sushi/oshi style and waterfront dining.",
    tags: ["sushi", "japanese", "seafood"],
  },
  {
    id: "blue-water",
    type: "Eat",
    name: "Blue Water Cafe",
    area: "Downtown",
    desc: "Well-known seafood spot in Yaletown.",
    tags: ["seafood", "yaletown"],
  },
  {
    id: "elisa",
    type: "Eat",
    name: "Elisa Steakhouse",
    area: "Downtown",
    desc: "Modern steakhouse option in Yaletown.",
    tags: ["steak", "yaletown"],
  },
  {
    id: "raminami",
    type: "Eat",
    name: "Minami Restaurant",
    area: "Downtown",
    desc: "Japanese dining (often recommended in Yaletown).",
    tags: ["japanese", "sushi", "yaletown"],
  },
  {
    id: "ramen-danbo",
    type: "Eat",
    name: "Ramen Danbo (Robson)",
    area: "Downtown",
    desc: "Ramen place that’s frequently top-rated by visitors.",
    tags: ["ramen", "japanese"],
  },
];

const recsList = document.getElementById("recsList");
const categoryFilter = document.getElementById("categoryFilter");
const areaFilter = document.getElementById("areaFilter");
const searchBox = document.getElementById("searchBox");
const btnClear = document.getElementById("btnClear");
const btnFavoritesOnly = document.getElementById("btnFavoritesOnly");
const msg = document.getElementById("msg");

let favoritesOnly = false;

function getFavorites() {
  return JSON.parse(localStorage.getItem("favorites") || "[]");
}
function setFavorites(ids) {
  localStorage.setItem("favorites", JSON.stringify(ids));
}
function toggleFavorite(id) {
  const favs = new Set(getFavorites());
  if (favs.has(id)) favs.delete(id);
  else favs.add(id);
  setFavorites([...favs]);
}

function mapsLink(name) {
  // Opens a Google Maps search for the place
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name + ", Vancouver BC")}`;
}

function matchesFilters(item) {
  const cat = categoryFilter.value;
  const area = areaFilter.value;
  const q = (searchBox.value || "").trim().toLowerCase();

  const catOk = (cat === "All") || (item.type === cat);
  const areaOk = (area === "All") || (item.area === area);

  const text = `${item.name} ${item.desc} ${item.area} ${item.tags.join(" ")}`.toLowerCase();
  const qOk = !q || text.includes(q);

  const favs = new Set(getFavorites());
  const favOk = !favoritesOnly || favs.has(item.id);

  return catOk && areaOk && qOk && favOk;
}

function render() {
  const favs = new Set(getFavorites());
  const filtered = recs.filter(matchesFilters);

  recsList.innerHTML = "";

  if (filtered.length === 0) {
    recsList.innerHTML = `
      <div class="col-12">
        <div class="alert alert-warning mb-0">No recommendations match your filters.</div>
      </div>
    `;
    return;
  }

  for (const r of filtered) {
    const col = document.createElement("div");
    col.className = "col-md-6 col-lg-4";

    const isFav = favs.has(r.id);

    col.innerHTML = `
      <div class="card h-100 shadow-sm">
        <div class="card-body d-flex flex-column">
          <div class="d-flex justify-content-between align-items-start">
            <h5 class="card-title mb-1">${r.name}</h5>
            <span class="badge ${r.type === "Explore" ? "text-bg-info" : "text-bg-success"}">${r.type}</span>
          </div>

          <p class="card-text mb-1"><strong>Area:</strong> ${r.area}</p>
          <p class="card-text">${r.desc}</p>

          <div class="mt-auto d-flex gap-2 flex-wrap">
            <a class="btn btn-outline-primary btn-sm" target="_blank" rel="noopener"
               href="${mapsLink(r.name)}">
              Open in Maps
            </a>

            <button class="btn btn-primary btn-sm fav-btn" data-id="${r.id}">
              ${isFav ? "Saved ✓" : "Save"}
            </button>
          </div>
        </div>
      </div>
    `;

    recsList.appendChild(col);
  }

  document.querySelectorAll(".fav-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      toggleFavorite(btn.dataset.id);
      msg.className = "mt-3 text-success";
      msg.textContent = "Updated favorites!";
      render();
    });
  });
}

function clearFilters() {
  categoryFilter.value = "All";
  areaFilter.value = "All";
  searchBox.value = "";
  favoritesOnly = false;
  btnFavoritesOnly.classList.remove("btn-secondary");
  btnFavoritesOnly.classList.add("btn-outline-secondary");
  msg.className = "mt-3";
  msg.textContent = "";
  render();
}

categoryFilter.addEventListener("change", render);
areaFilter.addEventListener("change", render);
searchBox.addEventListener("input", render);

btnClear.addEventListener("click", clearFilters);

btnFavoritesOnly.addEventListener("click", () => {
  favoritesOnly = !favoritesOnly;
  if (favoritesOnly) {
    btnFavoritesOnly.classList.remove("btn-outline-secondary");
    btnFavoritesOnly.classList.add("btn-secondary");
    msg.className = "mt-3";
    msg.textContent = "Showing favorites only.";
  } else {
    btnFavoritesOnly.classList.remove("btn-secondary");
    btnFavoritesOnly.classList.add("btn-outline-secondary");
    msg.className = "mt-3";
    msg.textContent = "";
  }
  render();
});

render();