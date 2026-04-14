# FIFA Itinerary Planner

## Overview

FIFA Itinerary Planner is a client-side JavaScript web application designed to help FIFA World Cup 2026 visitors plan their time in Vancouver. Users can build a day-by-day schedule, discover local attractions and restaurants, save favorites, and get smart recommendations based on their planned activities. The app also shows live weather forecasts to help users plan outdoor activities.

Developed for the COMP 1800 course, this project applies User-Centred Design practices and agile project management, and demonstrates integration with Firebase backend services for storing user schedules and favorites.

---

## Features

- Build and manage a personal day-by-day schedule with time slots
- Overlap detection to prevent double-booking
- Edit and delete individual schedule items
- View schedule in single-day or multi-day date range mode
- Browse curated Vancouver recommendations (places to explore and restaurants)
- Filter recommendations by category, area, search query, and vegetarian option
- Save favorite recommendations and view them on a dedicated favorites page
- Add recommendations directly to your schedule from the recommendations or favorites page
- Smart "Get Recommendations" button that suggests what's missing from your day based on your schedule
- Live Vancouver weather widget showing current conditions, forecast for your selected date, and a 5-day strip
- Dark mode toggle that auto-detects your device preference and persists across pages
- Responsive design for desktop and mobile

---

## Technologies Used

- **Frontend**: HTML, CSS, JavaScript (ES Modules)
- **Styling**: Bootstrap 5.3
- **Backend**: Firebase Authentication and Firestore
- **Weather API**: Open-Meteo (free, no API key required)
- **Hosting**: Firebase Hosting

---

## Usage

To run the application locally:

1. **Clone** the repository.
2. **Install dependencies** by running `npm install` in the project root directory.
3. **Start the development server** by running `npm run dev`.
4. Open your browser and visit the local address shown in your terminal (usually `http://localhost:5173` or similar).

Once the application is running:

1. Go to the **Schedule** page and pick a date to start planning your day.
2. Add activities with a title, time slot, area, and type (Explore, Eat, Match, Travel).
3. Click **Get Recommendations for this Day** to see suggestions tailored to your schedule and area.
4. On the **Recommendations** page, save places to favorites or add them directly to your schedule.
5. View all your saved places on the **Favorites** page.
6. Toggle **dark mode** using the 🌙 button in the navbar — your preference is saved automatically.

---

## Project Structure

```
fifa-itinerary/
├── src/
│   ├── firebaseConfig.js       # Firebase app init, exports db and auth
│   ├── schedulePlanner.js      # Schedule page logic (add, edit, delete, render)
│   ├── recommendations.js      # Recommendations page logic (filter, favorites, add to schedule)
│   ├── favorites.js            # Favorites page logic
│   ├── weather.js              # Weather widget (Open-Meteo API)
│   └── darkMode.js             # Dark mode toggle with device detection
├── styles/
│   └── style.css
├── images/
├── schedule.html
├── recommendations.html
├── favorites.html
├── index.html
├── login.html
├── package.json
└── README.md
```

---

## Firebase Structure

User data is stored in Firestore under each authenticated user's UID. Guests fall back to localStorage.

```
users/
  {uid}/
    scheduleItems/
      {itemId} → { id, date, start, end, area, type, title, createdAt }
    favorites/
      {recId}  → { id, savedAt }
```

---

## Contributors

- **Harshpal Singh** - BCIT CST Student with a passion for outdoor adventures and user-friendly applications. Fun fact: Loves playing PC games that are more story oriented.
- **Amit Kahlon** - BCIT CST Student who is new to programming. Fun fact: I enjoy playing video games.

---

## Acknowledgments

- Vancouver attraction and restaurant data are for demonstration purposes only.
- Weather data provided by [Open-Meteo](https://open-meteo.com/) — free and open-source.
- Code snippets were adapted from resources such as [Stack Overflow](https://stackoverflow.com/) and [MDN Web Docs](https://developer.mozilla.org/).
- Icons sourced from [Google Material Icons](https://fonts.google.com/icons) and images from [Unsplash](https://unsplash.com/).
- UI components built with [Bootstrap 5.3](https://getbootstrap.com/).

---

## Limitations and Future Work

### Limitations

- Recommendations are hardcoded — no live data from an external places API.
- No push notifications or reminders for scheduled activities.
- Accessibility features can be further improved.

### Future Work

- Pull live recommendations from Google Places API.
- Add an interactive map view showing schedule stops and nearby recommendations.
- Implement push notifications to remind users of upcoming schedule items.
- Add social sharing — generate a shareable link or printable PDF of a day's itinerary.
- Expand to cover other FIFA 2026 host cities beyond Vancouver.

---

## License

This project is licensed under the BCIT License. See the LICENSE file for details.