const PORTFOLIO_TEXT_KEY = "anjunPortfolioText";
const PORTFOLIO_DB_NAME = "anjunPortfolioAssets";
const PORTFOLIO_DB_STORE = "images";

const portfolioTextFields = {
  badge: ".badge",
  heroTitle: ".hero-content h1",
  heroCopy: ".hero-copy",
  profileTitle: ".profile-panel h2",
  profileCopy: ".profile-copy p",
  contactTitle: "#contact h2",
  contactCopy: "#contact > p:not(.section-kicker)",
  contactButton: "#contact .button",
  contactPageKicker: ".contact-main > .section-kicker",
  contactPageTitle: ".contact-main h1",
  contactPageIntro: ".contact-lead",
  contactName: ".contact-identity strong",
  contactServices: ".contact-identity p",
  contactPhoneLabel: "#phone-title",
  contactPhone: ".phone-number",
  contactCallButton: ".contact-actions a",
  contactCopyButton: "#copy-phone",
  contactFooter: ".contact-footer",
  featuredTitle: "#featured h2",
  featuredIntro: "#featured .section-description",
  featuredOneTitle: "#featured .selected-work:first-child h3",
  featuredOneCopy: "#featured .selected-work:first-child .selected-copy",
  featuredTwoTitle: "#featured .selected-work:nth-child(2) h3",
  featuredTwoCopy: "#featured .selected-work:nth-child(2) .selected-copy",
  processTitle: "#process h2",
  processIntro: "#process .section-description",
  processGoal: "#process [data-process='goal']",
  processStructure: "#process [data-process='structure']",
  processVisual: "#process [data-process='visual']",
  processDelivery: "#process [data-process='delivery']",
  aboutTitle: "#about h2",
  aboutCopy: "#about .about-copy",
  aboutYears: "#about [data-fact='years']",
  aboutCompanies: "#about [data-fact='companies']",
  aboutResults: "#about [data-fact='results']",
};

const portfolioImageFields = {
  logo: [".logo img", ".hero-brand-strip .brand-logo-lockup img"],
  avatar: [".profile-photo img", ".contact-identity img"],
  featured01: ["#featured .selected-work:first-child img"],
  featured02: ["#featured .selected-work:nth-child(2) img"],
  poster01: [".poster-wall article:nth-child(1) img"],
  poster02: [".poster-wall article:nth-child(2) img"],
  poster03: [".poster-wall article:nth-child(3) img"],
  poster04: [".poster-wall article:nth-child(4) img"],
  poster05: [".poster-wall article:nth-child(5) img"],
  poster06: [".poster-wall article:nth-child(6) img"],
  poster07: [".poster-wall article:nth-child(7) img"],
  poster08: [".poster-wall article:nth-child(8) img"],
  poster09: [".poster-wall article:nth-child(9) img"],
  poster10: [".poster-wall article:nth-child(10) img"],
  detail01: [".detail-scroll-card:nth-of-type(1) .detail-scroll-window img"],
  detail02: [".detail-scroll-card:nth-of-type(2) .detail-scroll-window img"],
  detail03: [".detail-scroll-card:nth-of-type(3) .detail-scroll-window img"],
  detail04: [".detail-scroll-card:nth-of-type(4) .detail-scroll-window img"],
  detail05: [".detail-scroll-card:nth-of-type(5) .detail-scroll-window img"],
  detail06: [".detail-scroll-card:nth-of-type(6) .detail-scroll-window img"],
  campaign01: [".campaign-work-card:nth-child(1) .campaign-image"],
  campaign02: [".campaign-work-card:nth-child(2) .campaign-image"],
  campaign03: [".campaign-work-card:nth-child(3) .campaign-image"],
  campaign04: [".campaign-work-card:nth-child(4) .campaign-image"],
};

function openPortfolioDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(PORTFOLIO_DB_NAME, 1);

    request.onupgradeneeded = () => {
      request.result.createObjectStore(PORTFOLIO_DB_STORE);
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getPortfolioImage(id) {
  const db = await openPortfolioDb();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(PORTFOLIO_DB_STORE, "readonly");
    const store = transaction.objectStore(PORTFOLIO_DB_STORE);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result || "");
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => db.close();
  });
}

function applyPortfolioText(data) {
  Object.entries(portfolioTextFields).forEach(([key, selector]) => {
    const target = document.querySelector(selector);
    const value = data[key];
    if (target && typeof value === "string" && value.length <= 8000) {
      if (key === "badge" && /^NEW\b/.test(value)) {
        const tag = document.createElement("span");
        tag.textContent = "NEW";
        target.replaceChildren(tag, document.createTextNode(" " + value.slice(3).trim()));
      } else target.textContent = value;
      if (target.closest("[data-optional]")) target.closest("[data-optional]").hidden = !value.trim();
    }
  });
  if (typeof data.contactPhone === "string") {
    const phone = data.contactPhone.replace(/[\s()-]/g, "");
    if (/^\+?\d{5,15}$/.test(phone)) {
      document.querySelectorAll(".contact-phone a[href^='tel:']").forEach(link => {
        link.href = `tel:${phone}`;
      });
    }
  }
}

function applyPortfolioImages(images) {
  Object.entries(portfolioImageFields).forEach(([id, selectors]) => {
    const source = images[id];
    if (typeof source !== "string" || !/^assets\/[\w./-]+\.(png|jpe?g|webp|gif)$/i.test(source) || source.includes("..")) return;
    selectors.forEach(selector => document.querySelectorAll(selector).forEach(image => {
      if (image.hasAttribute("data-src")) image.dataset.src = source;
      else image.src = source;
    }));
  });
}

const librarySlots = {
  posters: ["poster01", "poster02", "poster03", "poster04", "poster05", "poster08"],
  detail: ["detail01", "detail02", "detail03", "detail04"],
  campaign: ["campaign01", "campaign02", "campaign03", "campaign04"],
};
Object.entries(librarySlots).forEach(([panel, slots]) => slots.forEach((id, index) => {
  portfolioImageFields[id].push(`[data-library-panel="${panel}"] article:nth-child(${index + 1}) img`);
}));

window.PortfolioAdminSchema = {
  textFields: portfolioTextFields,
  imageFields: portfolioImageFields,
  textKey: PORTFOLIO_TEXT_KEY,
  dbName: PORTFOLIO_DB_NAME,
  dbStore: PORTFOLIO_DB_STORE,
};

if (!document.body.classList.contains("admin-page")) {
  window.PortfolioContentReady = (async () => {
    try {
      const response = await fetch("content.json", { cache: "no-cache", signal: AbortSignal.timeout(8000) });
      if (!response.ok) return;
      const content = await response.json();
      if (content.version !== 1 || !content.text || !content.images) return;
      applyPortfolioText(content.text);
      applyPortfolioImages(content.images);
      const links = document.querySelector("#store-links");
      if (links && Array.isArray(content.stores)) {
        links.replaceChildren();
        content.stores.slice(0, 100).forEach(store => {
          if (!store || !["天猫", "淘宝", "拼多多", "抖音"].includes(store.platform)) return;
          try {
            const url = new URL(store.url);
            if (url.protocol !== "https:") return;
            const link = document.createElement("a");
            link.href = url.href;
            link.target = "_blank";
            link.rel = "noopener noreferrer";
            link.textContent = `${store.platform} · ${String(store.title || "店铺案例").slice(0, 120)} ↗`;
            links.append(link);
          } catch { /* Empty slots stay in the admin only. */ }
        });
      }
      document.dispatchEvent(new CustomEvent("portfolio:content-ready"));
    } catch {
      // Embedded page content remains usable when the published JSON is unavailable.
    }
  })();
}
