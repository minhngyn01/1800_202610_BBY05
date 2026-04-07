// src/weather.js
// Fetches Vancouver weather from Open-Meteo (free, no API key needed)
// and renders a widget into a given container element.
//
// Usage:
//   import { renderWeather } from "/src/weather.js";
//   renderWeather(document.getElementById("weatherWidget"), "2026-06-15");

// Vancouver coordinates
const LAT = 49.2827;
const LNG = -123.1207;

// WMO weather code → human readable label + emoji
// https://open-meteo.com/en/docs#weathervariables
function describeWeatherCode(code) {
  if (code === 0)              return { label: "Clear sky",           emoji: "☀️" };
  if (code <= 2)               return { label: "Partly cloudy",       emoji: "⛅" };
  if (code === 3)              return { label: "Overcast",            emoji: "☁️" };
  if (code <= 49)              return { label: "Foggy",               emoji: "🌫️" };
  if (code <= 57)              return { label: "Drizzle",             emoji: "🌦️" };
  if (code <= 67)              return { label: "Rain",                emoji: "🌧️" };
  if (code <= 77)              return { label: "Snow",                emoji: "❄️" };
  if (code <= 82)              return { label: "Rain showers",        emoji: "🌧️" };
  if (code <= 86)              return { label: "Snow showers",        emoji: "🌨️" };
  if (code <= 99)              return { label: "Thunderstorm",        emoji: "⛈️" };
  return { label: "Unknown", emoji: "🌡️" };
}

// Formats "YYYY-MM-DD" to a readable label like "Today", "Tomorrow", or "Mon Jun 15"
function formatDateLabel(isoDate) {
  const today    = new Date().toISOString().split("T")[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];
  if (isoDate === today)    return "Today";
  if (isoDate === tomorrow) return "Tomorrow";
  return new Date(isoDate + "T12:00:00").toLocaleDateString("en-CA", { weekday: "short", month: "short", day: "numeric" });
}

// Fetches a 16-day forecast for Vancouver from Open-Meteo
async function fetchForecast() {
  const url = "https://api.open-meteo.com/v1/forecast"
    + "?latitude=" + LAT
    + "&longitude=" + LNG
    + "&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode"
    + "&current_weather=true"
    + "&timezone=America%2FVancouver"
    + "&forecast_days=16";

  const response = await fetch(url);
  if (!response.ok) throw new Error("Weather fetch failed");
  return response.json();
}

// Renders the weather widget into the given container element.
// - container: DOM element to render into
// - targetDate: optional "YYYY-MM-DD" string — highlights that day's forecast
export async function renderWeather(container, targetDate = null) {
  // Show a loading state while fetching
  container.innerHTML = `
    <div class="weather-widget card shadow-sm border-0 bg-body-tertiary p-3">
      <div class="text-muted small">Loading weather for Vancouver...</div>
    </div>`;

  try {
    const data    = await fetchForecast();
    const current = data.current_weather;
    const daily   = data.daily;

    // Find the index of the target date in the forecast array
    const targetIndex = targetDate ? daily.time.indexOf(targetDate) : -1;

    // Build current conditions HTML
    const currentWeather = describeWeatherCode(current.weathercode);
    const currentHTML = `
      <div class="d-flex align-items-center gap-3 mb-3">
        <div style="font-size:2.2rem;">${currentWeather.emoji}</div>
        <div>
          <div class="fw-bold fs-5">${Math.round(current.temperature)}°C</div>
          <div class="text-muted small">${currentWeather.label} · Vancouver</div>
        </div>
      </div>`;

    // Build target date forecast HTML (if a valid date was passed)
    let targetHTML = "";
    if (targetIndex !== -1) {
      const maxTemp  = Math.round(daily.temperature_2m_max[targetIndex]);
      const minTemp  = Math.round(daily.temperature_2m_min[targetIndex]);
      const rainPct  = daily.precipitation_probability_max[targetIndex];
      const weather  = describeWeatherCode(daily.weathercode[targetIndex]);
      const label    = formatDateLabel(targetDate);

      targetHTML = `
        <div class="border rounded p-2 mb-3 bg-body-secondary">
          <div class="small fw-semibold text-muted mb-1">${label}'s Forecast</div>
          <div class="d-flex align-items-center gap-2">
            <span style="font-size:1.5rem;">${weather.emoji}</span>
            <div>
              <div class="fw-bold">${weather.label}</div>
              <div class="small text-muted">
                High ${maxTemp}°C · Low ${minTemp}°C · 🌧 ${rainPct}% rain
              </div>
            </div>
          </div>
        </div>`;
    }

    // Build 5-day forecast strip (skip today since it's shown above)
    const todayISO  = new Date().toISOString().split("T")[0];
    const forecastDays = daily.time
      .map((date, i) => ({ date, i }))
      .filter(({ date }) => date !== todayISO)  // skip today
      .slice(0, 5);                              // show next 5 days

    const stripHTML = forecastDays.map(({ date, i }) => {
      const weather  = describeWeatherCode(daily.weathercode[i]);
      const maxTemp  = Math.round(daily.temperature_2m_max[i]);
      const rainPct  = daily.precipitation_probability_max[i];
      const isTarget = date === targetDate;

      return `
        <div class="text-center px-2 py-1 rounded ${isTarget ? "bg-primary text-white" : ""}" style="min-width:56px;">
          <div class="small fw-semibold">${formatDateLabel(date)}</div>
          <div style="font-size:1.2rem;">${weather.emoji}</div>
          <div class="small">${maxTemp}°C</div>
          <div class="small opacity-75">🌧 ${rainPct}%</div>
        </div>`;
    }).join("");

    // Render everything into the container
    container.innerHTML = `
      <div class="weather-widget card shadow-sm border-0 bg-body-tertiary p-3">
        <div class="fw-bold mb-2">🌤 Vancouver Weather</div>
        ${currentHTML}
        ${targetHTML}
        <div class="d-flex gap-1 flex-wrap">${stripHTML}</div>
      </div>`;

  } catch (error) {
    // Show a graceful error if the API call fails
    container.innerHTML = `
      <div class="weather-widget card shadow-sm border-0 bg-body-tertiary p-3">
        <div class="text-muted small">⚠️ Could not load weather. Check your connection.</div>
      </div>`;
  }
}