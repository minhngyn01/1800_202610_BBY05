import { auth } from "./firebaseConfig.js";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";

const emailEl = document.getElementById("email");
const passEl = document.getElementById("password");
const msgEl = document.getElementById("msg");

document.getElementById("btnSignup").addEventListener("click", async () => {
  try {
    const userCred = await createUserWithEmailAndPassword(auth, emailEl.value, passEl.value);
    msgEl.textContent = `Signed up: ${userCred.user.email}`;
    // window.location.href = "index.html"; // optional redirect
  } catch (err) {
    msgEl.textContent = err.message;
  }
});

document.getElementById("btnLogin").addEventListener("click", async () => {
  try {
    const userCred = await signInWithEmailAndPassword(auth, emailEl.value, passEl.value);
    msgEl.textContent = `Logged in: ${userCred.user.email}`;
    // window.location.href = "index.html"; // optional redirect
  } catch (err) {
    msgEl.textContent = err.message;
  }
});