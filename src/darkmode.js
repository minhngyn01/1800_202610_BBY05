// src/darkMode.js
// Dark mode with:
// - Auto-detects device preference (system dark/light mode) on first visit
// - Remembers manual override in localStorage
// - Smooth CSS transition when switching

const STORAGE_KEY = "darkMode";

// Check if the user has ever manually set a preference
function hasSavedPreference() {
  return localStorage.getItem(STORAGE_KEY) !== null;
}

// Returns true if dark mode should be active
function isDarkMode() {
  // If user has manually toggled before, use their saved choice
  if (hasSavedPreference()) {
    return localStorage.getItem(STORAGE_KEY) === "true";
  }
  // Otherwise, follow the device/OS preference
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function saveTheme(dark) {
  localStorage.setItem(STORAGE_KEY, dark);
}

// Sets data-bs-theme on <html> so Bootstrap switches all components
function applyTheme(dark) {
  document.documentElement.setAttribute("data-bs-theme", dark ? "dark" : "light");
}

function updateButtonLabel(btn, dark) {
  btn.textContent = dark ? "☀️" : "🌙";
  btn.title       = dark ? "Switch to light mode" : "Switch to dark mode";
}

// Apply theme immediately (before page renders) to avoid any flash
applyTheme(isDarkMode());

// Inject the smooth transition style so switching feels polished
// Done after initial applyTheme so the first load has no transition delay
document.addEventListener("DOMContentLoaded", () => {
  // Add transition CSS to <html> after page load so it only applies on toggle
  const style = document.createElement("style");
  style.textContent = `
    html {
      transition: background-color 0.3s ease, color 0.3s ease;
    }
    body, .card, .navbar, .alert, .form-control, .form-select, .btn {
      transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease;
    }
  `;
  document.head.appendChild(style);

  const btn = document.getElementById("btnDarkMode");
  if (!btn) return;

  // Set correct button label on load
  updateButtonLabel(btn, isDarkMode());

  btn.addEventListener("click", () => {
    const newDark = !isDarkMode();
    saveTheme(newDark);   // Save manual override
    applyTheme(newDark);
    updateButtonLabel(btn, newDark);
  });

  // Listen for OS-level theme changes (e.g. user switches system to dark mode)
  // Only applies if the user hasn't manually overridden
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
    if (!hasSavedPreference()) {
      applyTheme(e.matches);
      updateButtonLabel(btn, e.matches);
    }
  });
});