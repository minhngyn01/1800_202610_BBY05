// src/navbar.js
// Handles the logout button and shows the user's email in the navbar.
// Import this on every page that has a navbar.

import { auth } from "/src/firebaseConfig.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

document.addEventListener("DOMContentLoaded", () => {
  const btnLogout  = document.getElementById("btnLogout");
  const userLabel  = document.getElementById("navUserLabel");
  const btnLogin   = document.getElementById("btnLogin");

  onAuthStateChanged(auth, (user) => {
    if (user) {
      // Logged in — show email + logout, hide login button
      if (userLabel) {
        userLabel.textContent = user.email;
        userLabel.style.display = "inline";
      }
      if (btnLogout) btnLogout.style.display = "inline-block";
      if (btnLogin)  btnLogin.style.display  = "none";
    } else {
      // Logged out — show login, hide logout + emails
      if (userLabel) userLabel.style.display = "none";
      if (btnLogout) btnLogout.style.display = "none";
      if (btnLogin)  btnLogin.style.display  = "inline-block";
    }
  });

  // Logout button click
  if (btnLogout) {
    btnLogout.addEventListener("click", async () => {
      await signOut(auth);
      // Stay on current page — auth state change above will update the navbar
      // Redirect to login only if on a page that requires auth
      window.location.href = "login.html";
    });
  }
});