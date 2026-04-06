/**
 * authentication.js
 *
 * Handles login and signup via Firebase Auth.
 * On success, redirects to schedule.html.
 * Updates navbar auth button based on login state across the app.
 */

import { initializeApp }          from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { firebaseConfig } from "./firebaseConfig.js";

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);

const emailEl = document.getElementById("email");
const passEl  = document.getElementById("password");
const msgEl   = document.getElementById("msg");

function setMsg(text, isError = true) {
  msgEl.textContent = text;
  msgEl.className   = `mt-3 mb-0 small ${isError ? "text-danger" : "text-success"}`;
}

// If already logged in, skip the login page
onAuthStateChanged(auth, (user) => {
  if (user) window.location.href = "schedule.html";
});

document.getElementById("btnLogin").addEventListener("click", async () => {
  const email = emailEl.value.trim();
  const pass  = passEl.value;
  if (!email || !pass) { setMsg("Please enter your email and password."); return; }
  try {
    await signInWithEmailAndPassword(auth, email, pass);
    // onAuthStateChanged will redirect
  } catch (err) {
    setMsg(friendlyError(err.code));
  }
});

document.getElementById("btnSignup").addEventListener("click", async () => {
  const email = emailEl.value.trim();
  const pass  = passEl.value;
  if (!email || !pass) { setMsg("Please enter an email and password."); return; }
  if (pass.length < 6) { setMsg("Password must be at least 6 characters."); return; }
  try {
    await createUserWithEmailAndPassword(auth, email, pass);
    setMsg("Account created! Redirecting…", false);
    // onAuthStateChanged will redirect
  } catch (err) {
    setMsg(friendlyError(err.code));
  }
});

function friendlyError(code) {
  const map = {
    "auth/invalid-email":          "Invalid email address.",
    "auth/user-not-found":         "No account found with that email.",
    "auth/wrong-password":         "Incorrect password.",
    "auth/email-already-in-use":   "An account with that email already exists.",
    "auth/weak-password":          "Password must be at least 6 characters.",
    "auth/too-many-requests":      "Too many attempts. Please try again later.",
    "auth/invalid-credential":     "Invalid email or password.",
  };
  return map[code] || "Something went wrong. Please try again.";
}
