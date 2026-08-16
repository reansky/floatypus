const MASCOT_IMAGE = FLOAT_CONFIG.images.mascot;
const MEME_IMAGES = FLOAT_CONFIG.images.memes;
const FEATURE_IMAGES = FLOAT_CONFIG.images.features;
const HERO_SIDE_IMAGE = FLOAT_CONFIG.images.hero;

document.querySelectorAll("[data-link]").forEach((link) => {
  const href = FLOAT_CONFIG.links[link.dataset.link];
  if (href) link.href = href;
});

const featureImages = [...document.querySelectorAll("[data-feature-index]")];
featureImages.forEach((image) => {
  image.loading = "lazy";
  image.src = FEATURE_IMAGES[Number(image.dataset.featureIndex)];
});
const header = document.getElementById("site-header");
const nav = document.getElementById("nav-links");
const menuButton = document.getElementById("menu-button");
const toast = document.getElementById("toast");
const lightbox = document.getElementById("lightbox");
const lightboxImage = document.getElementById("lightbox-image");
let toastTimer;

const mascotImages = [...document.querySelectorAll("[data-mascot]")];
const loadMascot = (image) => { if (!image.src) { image.loading = "eager"; image.src = MASCOT_IMAGE; } };
const mascotObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => { if (entry.isIntersecting) { loadMascot(entry.target); mascotObserver.unobserve(entry.target); } });
}, { rootMargin: "220px" });
mascotImages.forEach((image, index) => {
  image.loading = "lazy";
  if (index < 4) loadMascot(image); else mascotObserver.observe(image);
});
const updateMascots = () => mascotImages.forEach((image) => {
  if (!image.src && image.getBoundingClientRect().top < window.innerHeight + 420) loadMascot(image);
});
window.addEventListener("scroll", updateMascots, { passive: true });
updateMascots();
document.querySelectorAll("[data-hero]").forEach((image) => { image.loading = "eager"; image.src = HERO_SIDE_IMAGE; });
const memeImages = [...document.querySelectorAll("[data-meme-index]")];
const loadMeme = (image) => {
  if (!image.src) { image.decoding = "async"; image.src = MEME_IMAGES[Number(image.dataset.memeIndex)]; }
};
const memeObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => { if (entry.isIntersecting) { loadMeme(entry.target); memeObserver.unobserve(entry.target); } });
}, { rootMargin: "360px" });
memeImages.forEach((image, index) => {
  image.loading = "lazy";
  image.decoding = "async";
  if (index < 3) loadMeme(image); else memeObserver.observe(image);
});
const updateMemes = () => memeImages.forEach((image) => {
  if (!image.src && image.getBoundingClientRect().top < window.innerHeight + 520) loadMeme(image);
});
window.addEventListener("scroll", updateMemes, { passive: true });
updateMemes();
document.querySelectorAll("[data-config]").forEach((element) => { element.textContent = FLOAT_CONFIG[element.dataset.config] ?? element.textContent; });
document.querySelectorAll("[data-social='x'], [data-social-link='x']").forEach((link) => { link.href = FLOAT_CONFIG.links.x; });

const showToast = (message) => {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
};
const copyText = async (value) => {
  try { await navigator.clipboard.writeText(value); } catch { const input = document.createElement("textarea"); input.value = value; input.style.position = "fixed"; input.style.opacity = "0"; document.body.appendChild(input); input.select(); document.execCommand("copy"); input.remove(); }
  showToast("Copied to clipboard");
};

const setMenuState = (open) => {
  header.classList.toggle("menu-open", open);
  nav.classList.toggle("open", open);
  menuButton.classList.toggle("open", open);
  menuButton.setAttribute("aria-expanded", String(open));
  menuButton.setAttribute("aria-label", open ? "Close menu" : "Open menu");
};
const closeMenu = () => setMenuState(false);
menuButton.addEventListener("click", (event) => {
  event.preventDefault();
  event.stopPropagation();
  setMenuState(!header.classList.contains("menu-open"));
});
document.querySelectorAll('a[href^="#"]').forEach((link) => link.addEventListener("click", (event) => {
  const href = link.getAttribute("href");
  if (href?.startsWith("#")) {
    const target = document.querySelector(href);
    if (target) {
      event.preventDefault();
      closeMenu();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      history.replaceState(null, "", href);
      return;
    }
  }
  closeMenu();
}));
document.addEventListener("click", (event) => {
  if (header.classList.contains("menu-open") && !header.contains(event.target)) closeMenu();
});
window.addEventListener("resize", () => { if (window.innerWidth > 850) closeMenu(); }, { passive: true });

window.addEventListener("scroll", () => header.classList.toggle("scrolled", window.scrollY > 24), { passive: true });
document.querySelector("[data-copy-address]").addEventListener("click", () => copyText(FLOAT_CONFIG.address));
document.querySelectorAll("[data-copy-quote]").forEach((button) => button.addEventListener("click", () => copyText(button.closest(".quote-card").querySelector("p").textContent.trim())));
document.querySelectorAll("[data-post-quote]").forEach((link) => {
  const quote = link.closest(".quote-card").querySelector("p").textContent.trim();
  link.href = `${FLOAT_CONFIG.links.x}/intent/post?text=${encodeURIComponent(`${quote}\n\n${FLOAT_CONFIG.ticker} · FLOAT. EARN. CHILL.`)}`;
});

    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => { if (entry.isIntersecting) { entry.target.classList.add("visible"); revealObserver.unobserve(entry.target); } });
    }, { threshold: .12 });
    document.querySelectorAll(".reveal").forEach((element) => revealObserver.observe(element));
    requestAnimationFrame(() => document.querySelectorAll(".reveal").forEach((element) => {
      if (element.getBoundingClientRect().top < window.innerHeight * 1.12) element.classList.add("visible");
    }));

    document.querySelectorAll(".tilt-card").forEach((card) => {
      card.addEventListener("pointermove", (event) => {
        if (window.matchMedia("(max-width: 850px)").matches) return;
        const box = card.getBoundingClientRect();
        const rotateX = ((event.clientY - box.top) / box.height - .5) * -4;
        const rotateY = ((event.clientX - box.left) / box.width - .5) * 4;
        card.style.transform = `perspective(700px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-6px)`;
      });
      card.addEventListener("pointerleave", () => { card.style.transform = ""; });
    });

    document.querySelectorAll("[data-lightbox]").forEach((tile) => tile.addEventListener("click", () => {
      const image = tile.querySelector("img");
      const source = image.dataset.memeIndex !== undefined ? MEME_IMAGES[Number(image.dataset.memeIndex)] : MASCOT_IMAGE;
      lightboxImage.alt = image.alt;
      lightbox.classList.add("open");
      document.body.classList.add("no-scroll");
      requestAnimationFrame(() => {
        lightboxImage.src = source;
        if (image.dataset.memeIndex !== undefined) loadMeme(image); else loadMascot(image);
      });
    }));
    const closeLightbox = () => { lightbox.classList.remove("open"); document.body.classList.remove("no-scroll"); };
    document.getElementById("lightbox-close").addEventListener("click", closeLightbox);
    lightbox.addEventListener("click", (event) => { if (event.target === lightbox) closeLightbox(); });
    window.addEventListener("keydown", (event) => { if (event.key === "Escape") { closeLightbox(); closeMenu(); } });

    window.addEventListener("pointermove", (event) => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const sun = document.querySelector(".sun-orb");
      if (!sun) return;
      const x = (event.clientX / window.innerWidth - .5) * 14;
      const y = (event.clientY / window.innerHeight - .5) * 8;
      sun.style.transform = `translate(${x}px, ${y}px)`;
    }, { passive: true });
