const root = document.documentElement;
root.classList.add("effects-ready");
const cursorGlow = document.querySelector(".cursor-glow");
const orbit = document.querySelector(".texture-orbit");
const flowerVideo = document.querySelector(".flower-video");
const particlesCanvas = document.querySelector("#particles-canvas");
const detailLightbox = document.querySelector(".detail-lightbox");
const detailLightboxImage = document.querySelector(".detail-lightbox img");
const detailLightboxFrame = document.querySelector(".detail-lightbox-frame");
const detailLightboxClose = document.querySelector(".detail-lightbox-close");
const detailLightboxZoom = document.querySelector(".detail-lightbox-zoom");
let artworkTrigger = null;
let artworkPreviousOverflow = "";
const workLibrary = document.querySelector(".work-library");
const workLibraryClose = document.querySelector(".work-library-close");
const revealTargets = document.querySelectorAll(
  ".profile-panel, .section-heading, .category-card, .poster-card, .case-intro, .case-card, .process-board, .campaign-work-card, .video-section > *, .contact"
);
const tiltTargets = document.querySelectorAll(
  ".stats-grid article, .category-card, .poster-card, .case-card, .campaign-work-card, .video-frame"
);

revealTargets.forEach((item) => item.classList.add("reveal"));

// Keep large artwork downloads outside the browser's eager lazy-load distance.
const artworkObserver = new IntersectionObserver((entries) => {
  entries.forEach(({ target, isIntersecting }) => {
    if (!isIntersecting) return;
    if (!target.getAttribute("src")) target.src = target.dataset.src;
    target.removeAttribute("data-src");
    artworkObserver.unobserve(target);
  });
}, { rootMargin: "300px" });
document.querySelectorAll("img[data-src]").forEach(image => artworkObserver.observe(image));

if (flowerVideo) {
  let heroInView = true;
  const tryPlayFlowerVideo = () => {
    if (document.hidden || !heroInView) {
      flowerVideo.pause();
      return;
    }
    const playPromise = flowerVideo.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(() => {});
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", tryPlayFlowerVideo, { once: true });
  } else {
    tryPlayFlowerVideo();
  }

  document.addEventListener("visibilitychange", tryPlayFlowerVideo);
  const heroVideoObserver = new IntersectionObserver(([entry]) => {
    heroInView = entry.isIntersecting;
    tryPlayFlowerVideo();
  });
  heroVideoObserver.observe(flowerVideo.closest(".hero"));
}

if (particlesCanvas) {
  const ctx = particlesCanvas.getContext("2d");
  let particles = [];

  const createParticles = () => {
    particles = [];
    const count = Math.max(42, Math.floor((particlesCanvas.width * particlesCanvas.height) / 18000));

    for (let i = 0; i < count; i += 1) {
      particles.push({
        x: Math.random() * particlesCanvas.width,
        y: Math.random() * particlesCanvas.height,
        vx: (Math.random() - 0.5) * 0.28,
        vy: (Math.random() - 0.5) * 0.28,
        size: Math.random() * 1.4 + 0.45,
        opacity: Math.random() * 0.42 + 0.16,
      });
    }
  };

  const resizeParticles = () => {
    const rect = particlesCanvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    particlesCanvas.width = Math.max(1, Math.round(rect.width * dpr));
    particlesCanvas.height = Math.max(1, Math.round(rect.height * dpr));
    createParticles();
  };

  const animateParticles = () => {
    ctx.clearRect(0, 0, particlesCanvas.width, particlesCanvas.height);

    particles.forEach((particle) => {
      particle.x += particle.vx;
      particle.y += particle.vy;

      if (particle.x < 0) particle.x = particlesCanvas.width;
      if (particle.x > particlesCanvas.width) particle.x = 0;
      if (particle.y < 0) particle.y = particlesCanvas.height;
      if (particle.y > particlesCanvas.height) particle.y = 0;

      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${particle.opacity})`;
      ctx.fill();
    });

    requestAnimationFrame(animateParticles);
  };

  resizeParticles();
  window.addEventListener("resize", resizeParticles);
  animateParticles();
}

function scrollToTarget(target) {
  const section = document.querySelector(target);
  if (!section) return;

  section.scrollIntoView({ behavior: "smooth", block: "start" });
}

document.querySelectorAll("[data-scroll-target]").forEach((item) => {
  item.addEventListener("click", () => scrollToTarget(item.dataset.scrollTarget));
  item.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      scrollToTarget(item.dataset.scrollTarget);
    }
  });
});

document.querySelectorAll(".category-card").forEach((link) => {
  link.addEventListener("click", (event) => {
    const target = link.getAttribute("href");
    if (target && target.startsWith("#")) {
      event.preventDefault();
      scrollToTarget(target);
    }
  });
});

function openArtwork(image, trigger) {
  const source = image.currentSrc || image.getAttribute("src") || image.dataset.src;
  if (!source || !detailLightbox || !detailLightboxImage) return;

  artworkTrigger = trigger;
  artworkPreviousOverflow = document.body.style.overflow;
  detailLightboxImage.src = source;
  detailLightboxImage.alt = image.alt || "作品完整预览";
  detailLightbox.classList.add("is-open");
  detailLightbox.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  detailLightboxFrame.classList.remove("is-zoomed");
  detailLightboxFrame.scrollTop = 0;
  detailLightboxFrame.scrollLeft = 0;
  detailLightboxZoom.setAttribute("aria-pressed", "false");
  detailLightboxZoom.textContent = "+";
  detailLightboxClose.focus({ preventScroll: true });
}

document.querySelectorAll(".poster-wall .poster-card, .selected-image").forEach((card) => {
  const image = card.querySelector("img");
  if (!image) return;
  card.setAttribute("role", "button");
  card.tabIndex = 0;
  card.setAttribute("aria-label", `放大查看 ${image.alt}`);
  card.addEventListener("click", () => openArtwork(image, card));
  card.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openArtwork(image, card);
    }
  });
});

document.querySelectorAll(".detail-scroll-card, .campaign-work-card").forEach((card) => {
  const button = card.querySelector(".detail-expand");
  const image = card.querySelector(".detail-scroll-window img, .campaign-scroll-window img");

  if (!button || !image || !detailLightbox || !detailLightboxImage) return;

  button.addEventListener("click", () => openArtwork(image, button));
});

if (detailLightboxZoom) {
  detailLightboxZoom.addEventListener("click", () => {
    const zoomed = detailLightboxFrame.classList.toggle("is-zoomed");
    detailLightboxFrame.style.setProperty("--artwork-width", `${detailLightboxImage.naturalWidth}px`);
    detailLightboxZoom.setAttribute("aria-pressed", String(zoomed));
    detailLightboxZoom.textContent = zoomed ? "−" : "+";
  });
  detailLightboxImage.addEventListener("load", () => {
    detailLightboxFrame.style.setProperty("--artwork-width", `${detailLightboxImage.naturalWidth}px`);
  });
}

function showLibrary(name = "posters") {
  if (!workLibrary) return;

  workLibrary.classList.add("is-open");
  workLibrary.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";

  document.querySelectorAll("[data-library-tab]").forEach((tab) => {
    tab.classList.toggle("is-active", tab.dataset.libraryTab === name);
  });
  document.querySelectorAll("[data-library-panel]").forEach((panel) => {
    panel.classList.toggle("is-active", panel.dataset.libraryPanel === name);
  });
}

function closeLibrary() {
  if (!workLibrary) return;

  workLibrary.classList.remove("is-open");
  workLibrary.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

document.querySelectorAll("[data-library]").forEach((button) => {
  button.addEventListener("click", () => showLibrary(button.dataset.library));
});

document.querySelectorAll("[data-library-tab]").forEach((tab) => {
  tab.addEventListener("click", () => showLibrary(tab.dataset.libraryTab));
});

if (workLibraryClose) {
  workLibraryClose.addEventListener("click", closeLibrary);
}

if (workLibrary) {
  workLibrary.addEventListener("click", (event) => {
    if (event.target === workLibrary) {
      closeLibrary();
    }
  });
}

function closeDetailLightbox() {
  if (!detailLightbox || !detailLightbox.classList.contains("is-open")) return;

  detailLightbox.classList.remove("is-open");
  detailLightbox.setAttribute("aria-hidden", "true");
  document.body.style.overflow = artworkPreviousOverflow;
  artworkTrigger?.focus({ preventScroll: true });
}

if (detailLightboxClose) {
  detailLightboxClose.addEventListener("click", closeDetailLightbox);
}

if (detailLightbox) {
  detailLightbox.addEventListener("click", (event) => {
    if (event.target === detailLightbox) {
      closeDetailLightbox();
    }
  });
}

window.addEventListener("keydown", (event) => {
  if (detailLightbox?.classList.contains("is-open")) {
    if (event.key === "Escape") closeDetailLightbox();
    if (event.key === "Tab") {
      const stops = [detailLightboxClose, detailLightboxZoom, detailLightboxFrame];
      const step = event.shiftKey ? -1 : 1;
      const index = stops.indexOf(document.activeElement);
      event.preventDefault();
      stops[(index + step + stops.length) % stops.length].focus();
    }
    return;
  }
  if (event.key === "Escape") {
    closeLibrary();
  }
});

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.16 }
);

revealTargets.forEach((item) => revealObserver.observe(item));

window.addEventListener(
  "pointermove",
  (event) => {
    const x = event.clientX;
    const y = event.clientY;
    root.style.setProperty("--mouse-x", `${x}px`);
    root.style.setProperty("--mouse-y", `${y}px`);

    if (cursorGlow) {
      cursorGlow.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    }

    if (orbit) {
      const rx = (x / window.innerWidth - 0.5) * 14;
      const ry = (y / window.innerHeight - 0.5) * 14;
      orbit.style.setProperty("--orbit-rx", `${ry}deg`);
      orbit.style.setProperty("--orbit-ry", `${rx}deg`);
    }
  },
  { passive: true }
);

tiltTargets.forEach((card) => {
  card.addEventListener("pointermove", (event) => {
    const rect = card.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const rotateY = (x / rect.width - 0.5) * 9;
    const rotateX = (0.5 - y / rect.height) * 9;

    card.style.setProperty("--card-x", `${x}px`);
    card.style.setProperty("--card-y", `${y}px`);
    card.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
  });

  card.addEventListener("pointerleave", () => {
    card.style.transform = "";
  });
});
