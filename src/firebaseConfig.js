// src/firebaseConfig.js
// Shared Firebase app instance used across all pages.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

export const firebaseConfig = {
  apiKey: "AIzaSyDES1T6ePb5E0nzmocTic2xUyNLP0INJdI",
  authDomain: "fifa-itinerary.firebaseapp.com",
  projectId: "fifa-itinerary",
  storageBucket: "fifa-itinerary.firebasestorage.app",
  messagingSenderId: "925526956776",
  appId: "1:925526956776:web:049b9a5885feda249d075d"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);