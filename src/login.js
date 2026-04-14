// src/login.js
// Handles login page auth.
// IMPORTANT: Does NOT auto-redirect logged-in users to schedule.
// This lets users who are already logged in visit the login page to log out.
// Redirect only happens AFTER a successful login action.

import { auth } from "/src/firebaseConfig.js";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const provider = new GoogleAuthProvider();

document.addEventListener("DOMContentLoaded", () => {
  const emailEl    = document.getElementById("email");
  const passwordEl = document.getElementById("password");
  const msgEl      = document.getElementById("authMsg");

  // Buttons — adjust IDs to match your login.html
  const btnLogin    = document.getElementById("btnLogin");
  const btnRegister = document.getElementById("btnRegister");
  const btnGoogle   = document.getElementById("btnGoogle");
  const btnLogout   = document.getElementById("btnLogout");
  const loggedInDiv = document.getElementById("loggedInSection");
  const loggedOutDiv= document.getElementById("loggedOutSection");
  const userEmailEl = document.getElementById("loggedInEmail");

  function showMsg(text, ok = false) {
    if (!msgEl) return;
    msgEl.className = ok ? "mt-2 text-success" : "mt-2 text-danger";
    msgEl.textContent = text;
  }

  // Show correct section based on auth state
  // NOTE: We do NOT redirect here — user can stay on login page while logged in
  onAuthStateChanged(auth, (user) => {
    if (user) {
      if (loggedInDiv)  loggedInDiv.style.display  = "block";
      if (loggedOutDiv) loggedOutDiv.style.display = "none";
      if (userEmailEl)  userEmailEl.textContent = user.email;
    } else {
      if (loggedInDiv)  loggedInDiv.style.display  = "none";
      if (loggedOutDiv) loggedOutDiv.style.display = "block";
    }
  });

  // Email/password login — redirect ONLY after successful login
  if (btnLogin) {
    btnLogin.addEventListener("click", async () => {
      try {
        await signInWithEmailAndPassword(auth, emailEl.value, passwordEl.value);
        window.location.href = "schedule.html"; // Redirect after login
      } catch (e) {
        showMsg("Login failed: " + e.message);
      }
    });
  }

  // Register new account
  if (btnRegister) {
    btnRegister.addEventListener("click", async () => {
      try {
        await createUserWithEmailAndPassword(auth, emailEl.value, passwordEl.value);
        window.location.href = "schedule.html"; // Redirect after register
      } catch (e) {
        showMsg("Registration failed: " + e.message);
      }
    });
  }

  // Google sign-in
  if (btnGoogle) {
    btnGoogle.addEventListener("click", async () => {
      try {
        await signInWithPopup(auth, provider);
        window.location.href = "schedule.html"; // Redirect after Google login
      } catch (e) {
        showMsg("Google sign-in failed: " + e.message);
      }
    });
  }

  // Logout from login page
  if (btnLogout) {
    btnLogout.addEventListener("click", async () => {
      await signOut(auth);
      showMsg("Logged out successfully.", true);
      // Auth state change above will swap sections automatically
    });
  }
});