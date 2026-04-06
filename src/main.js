/**
 * main.js
 *
 * Runs on index.html (landing page).
 * Watches auth state and updates the navbar Login/Logout button accordingly.
 * If the user is already logged in, the Login button becomes "Go to Schedule".
 */

import { initializeApp }     from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { firebaseConfig } from "./firebaseConfig.js";

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);

onAuthStateChanged(auth, (user) => {
  const btn = document.getElementById("navAuthBtn");
  if (!btn) return;
  if (user) {
    btn.textContent = "Logout";
    btn.href = "#";
    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      await signOut(auth);
      window.location.reload();
    });
  } else {
    btn.textContent = "Login";
    btn.href = "login.html";
  }
});
