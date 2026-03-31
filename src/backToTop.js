// src/backToTop.js

const btn = document.getElementById("backToTop");

window.addEventListener("scroll", () => {
  btn.style.display = window.scrollY > 300 ? "flex" : "none";
});

btn.style.alignItems = "center";
btn.style.justifyContent = "center";

btn.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});