const h=-123.1207;function d(e){return e===0?{label:"Clear sky",emoji:"☀️"}:e<=2?{label:"Partly cloudy",emoji:"⛅"}:e===3?{label:"Overcast",emoji:"☁️"}:e<=49?{label:"Foggy",emoji:"🌫️"}:e<=57?{label:"Drizzle",emoji:"🌦️"}:e<=67?{label:"Rain",emoji:"🌧️"}:e<=77?{label:"Snow",emoji:"❄️"}:e<=82?{label:"Rain showers",emoji:"🌧️"}:e<=86?{label:"Snow showers",emoji:"🌨️"}:e<=99?{label:"Thunderstorm",emoji:"⛈️"}:{label:"Unknown",emoji:"🌡️"}}function b(e){const t=new Date().toISOString().split("T")[0],o=new Date(Date.now()+864e5).toISOString().split("T")[0];return e===t?"Today":e===o?"Tomorrow":new Date(e+"T12:00:00").toLocaleDateString("en-CA",{weekday:"short",month:"short",day:"numeric"})}async function y(){const e="https://api.open-meteo.com/v1/forecast?latitude="+49.2827+"&longitude="+h+"&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode&current_weather=true&timezone=America%2FVancouver&forecast_days=16",t=await fetch(e);if(!t.ok)throw new Error("Weather fetch failed");return t.json()}async function T(e,t=null){e.innerHTML=`
    <div class="weather-widget card shadow-sm border-0 bg-body-tertiary p-3">
      <div class="text-muted small">Loading weather for Vancouver...</div>
    </div>`;try{const o=await y(),c=o.current_weather,r=o.daily,n=t?r.time.indexOf(t):-1,m=d(c.weathercode),w=`
      <div class="d-flex align-items-center gap-3 mb-3">
        <div style="font-size:2.2rem;">${m.emoji}</div>
        <div>
          <div class="fw-bold fs-5">${Math.round(c.temperature)}°C</div>
          <div class="text-muted small">${m.label} · Vancouver</div>
        </div>
      </div>`;let u="";if(n!==-1){const a=Math.round(r.temperature_2m_max[n]),i=Math.round(r.temperature_2m_min[n]),l=r.precipitation_probability_max[n],s=d(r.weathercode[n]);u=`
        <div class="border rounded p-2 mb-3 bg-body-secondary">
          <div class="small fw-semibold text-muted mb-1">${b(t)}'s Forecast</div>
          <div class="d-flex align-items-center gap-2">
            <span style="font-size:1.5rem;">${s.emoji}</span>
            <div>
              <div class="fw-bold">${s.label}</div>
              <div class="small text-muted">
                High ${a}°C · Low ${i}°C · 🌧 ${l}% rain
              </div>
            </div>
          </div>
        </div>`}const p=new Date().toISOString().split("T")[0],f=r.time.map((a,i)=>({date:a,i})).filter(({date:a})=>a!==p).slice(0,5).map(({date:a,i})=>{const l=d(r.weathercode[i]),s=Math.round(r.temperature_2m_max[i]),v=r.precipitation_probability_max[i];return`
        <div class="text-center px-2 py-1 rounded ${a===t?"bg-primary text-white":""}" style="min-width:56px;">
          <div class="small fw-semibold">${b(a)}</div>
          <div style="font-size:1.2rem;">${l.emoji}</div>
          <div class="small">${s}°C</div>
          <div class="small opacity-75">🌧 ${v}%</div>
        </div>`}).join("");e.innerHTML=`
      <div class="weather-widget card shadow-sm border-0 bg-body-tertiary p-3">
        <div class="fw-bold mb-2">🌤 Vancouver Weather</div>
        ${w}
        ${u}
        <div class="d-flex gap-1 flex-wrap">${f}</div>
      </div>`}catch{e.innerHTML=`
      <div class="weather-widget card shadow-sm border-0 bg-body-tertiary p-3">
        <div class="text-muted small">⚠️ Could not load weather. Check your connection.</div>
      </div>`}}export{T as r};
