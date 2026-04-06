/**
 * darkMode.js
 *
 * Toggles Bootstrap's dark color scheme on <html>.
 * Persists the preference to localStorage so it survives page navigation.
 */

const KEY  = "darkMode";
const root = document.documentElement;
const btn  = document.getElementById("btnDarkMode");

// Apply saved preference immediately (before paint)
if (localStorage.getItem(KEY) === "true") {
  root.setAttribute("data-bs-theme", "dark");
}

function updateBtn() {
  if (!btn) return;
  const isDark = root.getAttribute("data-bs-theme") === "dark";
  btn.textContent = isDark ? "☀️" : "🌙";
  btn.setAttribute("title", isDark ? "Switch to light mode" : "Switch to dark mode");
}

updateBtn();

if (btn) {
  btn.addEventListener("click", () => {
    const isDark = root.getAttribute("data-bs-theme") === "dark";
    root.setAttribute("data-bs-theme", isDark ? "light" : "dark");
    localStorage.setItem(KEY, String(!isDark));
    updateBtn();
  });
}
