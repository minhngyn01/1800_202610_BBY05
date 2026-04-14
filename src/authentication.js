// src/authentication.js
// Handles login, signup, and logout on the login page.
// Does NOT auto-redirect logged-in users — lets them log out instead.

import { auth } from "/src/firebaseConfig.js";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const emailEl          = document.getElementById("email");
const passwordEl       = document.getElementById("password");
const msgEl            = document.getElementById("msg");
const btnLoginSubmit   = document.getElementById("btnLoginSubmit");
const btnSignup        = document.getElementById("btnSignup");
const btnLogoutPage    = document.getElementById("btnLogoutPage");
const loggedInSection  = document.getElementById("loggedInSection");
const loggedOutSection = document.getElementById("loggedOutSection");
const loggedInEmail    = document.getElementById("loggedInEmail");

// Navbar elements (updated by navbar.js but also handled here for the login page)
const navUserLabel = document.getElementById("navUserLabel");
const btnLogoutNav = document.getElementById("btnLogout");
const btnLoginNav  = document.getElementById("btnLogin");

function showMsg(text, ok = false) {
  if (!msgEl) return;
  msgEl.className = ok ? "mt-3 text-success small" : "mt-3 text-danger small";
  msgEl.textContent = text;
}

// Show the right section based on auth state
// NOTE: No auto-redirect — user stays on login page so they can log out
onAuthStateChanged(auth, (user) => {
  if (user) {
    // Show logged-in card
    loggedInSection.style.display  = "block";
    loggedOutSection.style.display = "none";
    if (loggedInEmail) loggedInEmail.textContent = user.email;

    // Update navbar
    if (navUserLabel) { navUserLabel.textContent = user.email; navUserLabel.style.display = "inline"; }
    if (btnLogoutNav) btnLogoutNav.style.display = "inline-block";
    if (btnLoginNav)  btnLoginNav.style.display  = "none";
  } else {
    // Show login form
    loggedInSection.style.display  = "none";
    loggedOutSection.style.display = "block";

    // Update navbar
    if (navUserLabel) navUserLabel.style.display = "none";
    if (btnLogoutNav) btnLogoutNav.style.display = "none";
    if (btnLoginNav)  btnLoginNav.style.display  = "inline-block";
  }
});

// Log In
btnLoginSubmit?.addEventListener("click", async () => {
  const email    = emailEl.value.trim();
  const password = passwordEl.value;
  if (!email || !password) { showMsg("Please enter email and password."); return; }
  try {
    await signInWithEmailAndPassword(auth, email, password);
    window.location.href = "schedule.html"; // Redirect only after successful login
  } catch (e) {
    showMsg("Login failed: " + e.message);
  }
});

// Sign Up
btnSignup?.addEventListener("click", async () => {
  const email    = emailEl.value.trim();
  const password = passwordEl.value;
  if (!email || !password) { showMsg("Please enter email and password."); return; }
  try {
    await createUserWithEmailAndPassword(auth, email, password);
    window.location.href = "schedule.html"; // Redirect after registration
  } catch (e) {
    showMsg("Sign up failed: " + e.message);
  }
});

// Log Out (button on the logged-in card)
btnLogoutPage?.addEventListener("click", async () => {
  await signOut(auth);
  // onAuthStateChanged above will automatically swap sections back to logged-out
});

// Log Out (navbar button — also wired here since navbar.js may not be loaded on login page)
btnLogoutNav?.addEventListener("click", async () => {
  await signOut(auth);
});