const root = document.documentElement;
const themeBtn = document.querySelector(".theme-toggle");

function currentTheme() {
  return root.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

function setTheme(theme) {
  root.setAttribute("data-theme", theme);
  localStorage.setItem("theme", theme);
  if (themeBtn) {
    themeBtn.setAttribute(
      "aria-label",
      theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
    );
  }
}

if (themeBtn) {
  setTheme(currentTheme());
  themeBtn.addEventListener("click", () => {
    setTheme(currentTheme() === "dark" ? "light" : "dark");
  });
}

const bar = document.querySelector(".nav-bar");
let scrolled = false;

function onScroll() {
  if (!bar) return;
  const y = window.scrollY;
  scrolled = scrolled ? y > 90 : y > 104;
  bar.classList.toggle("is-scrolled", scrolled);
}

onScroll();
window.addEventListener("scroll", onScroll, { passive: true });

const toggle = document.querySelector(".nav-toggle");

function setMenu(open) {
  if (!bar || !toggle) return;
  bar.classList.toggle("is-open", open);
  toggle.setAttribute("aria-expanded", String(open));
  toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
}

if (toggle && bar) {
  toggle.addEventListener("click", (event) => {
    event.stopPropagation();
    setMenu(!bar.classList.contains("is-open"));
  });
  bar.querySelectorAll(".nav-cluster a").forEach((link) => {
    link.addEventListener("click", () => setMenu(false));
  });
  document.addEventListener("click", (event) => {
    if (!bar.contains(event.target)) setMenu(false);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setMenu(false);
  });
  window.addEventListener("resize", () => {
    if (window.innerWidth > 759) setMenu(false);
  });
}

const reel = document.querySelector(".reel");
const slides = reel ? [...reel.children] : [];

const stage = document.querySelector(".lcd-stage");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let targetX = 0;
let currentX = 0;
let glide = 0;
let dragging = false;

function slideWidth() {
  return reel ? reel.clientWidth : 0;
}

function maxX() {
  return Math.max(0, (slides.length - 1) * slideWidth());
}

function markLive() {
  if (!reel || !slides.length) return;
  const width = slideWidth() || 1;
  const index = Math.min(slides.length - 1, Math.max(0, Math.round(currentX / width)));
  slides.forEach((slide, i) => slide.classList.toggle("is-live", i === index));
}

function paint() {
  if (!reel) return;
  reel.style.transform = `translate3d(${-currentX}px, 0, 0)`;
  markLive();
}

function tick() {
  const delta = targetX - currentX;
  if (reduceMotion || Math.abs(delta) < 0.4) {
    currentX = targetX;
    glide = 0;
    paint();
    return;
  }
  currentX += delta * 0.12;
  paint();
  glide = requestAnimationFrame(tick);
}

function glideTo(next) {
  targetX = Math.min(maxX(), Math.max(0, next));
  if (!glide) glide = requestAnimationFrame(tick);
}

function syncFromPage() {
  if (!stage || dragging) return;
  const travel = stage.offsetHeight - window.innerHeight;
  if (travel <= 0) return;
  const scrolled = Math.min(travel, Math.max(0, -stage.getBoundingClientRect().top));
  const index = Math.round((scrolled / travel) * (slides.length - 1));
  glideTo(index * slideWidth());
}

function scrollPageToIndex(index) {
  if (!stage || slides.length < 2) return;
  const travel = stage.offsetHeight - window.innerHeight;
  const stageTop = stage.getBoundingClientRect().top + window.scrollY;
  const dest = stageTop + (index / (slides.length - 1)) * travel;
  window.scrollTo({ top: dest, behavior: reduceMotion ? "auto" : "smooth" });
}

if (reel) {
  paint();
  syncFromPage();
  window.addEventListener("scroll", syncFromPage, { passive: true });
  window.addEventListener("resize", () => {
    syncFromPage();
    currentX = targetX;
    paint();
  });

  let startPointer = 0;
  let startOffset = 0;
  reel.addEventListener("pointerdown", (event) => {
    dragging = true;
    startPointer = event.clientX;
    startOffset = targetX;
    reel.setPointerCapture(event.pointerId);
  });
  reel.addEventListener("pointermove", (event) => {
    if (!dragging) return;
    glideTo(startOffset - (event.clientX - startPointer));
  });
  reel.addEventListener("pointerup", () => {
    if (!dragging) return;
    dragging = false;
    const width = slideWidth() || 1;
    const index = Math.min(slides.length - 1, Math.max(0, Math.round(targetX / width)));
    glideTo(index * width);
    scrollPageToIndex(index);
  });
  reel.addEventListener("pointercancel", () => {
    dragging = false;
  });

  document.querySelectorAll(".lcd-arrow").forEach((button) => {
    button.addEventListener("click", () => {
      const width = slideWidth() || 1;
      const dir = Number(button.dataset.dir);
      const index = Math.min(
        slides.length - 1,
        Math.max(0, Math.round(targetX / width) + dir)
      );
      glideTo(index * width);
      scrollPageToIndex(index);
    });
  });
}
