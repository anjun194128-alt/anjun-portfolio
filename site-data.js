const PORTFOLIO_TEXT_KEY = "anjunPortfolioText";
const PORTFOLIO_DB_NAME = "anjunPortfolioAssets";
const PORTFOLIO_DB_STORE = "images";

const portfolioTextFields = {
  badge: ".badge",
  heroTitle: ".hero-content h1",
  heroCopy: ".hero-copy",
  profileTitle: ".profile-panel h2",
  profileCopy: ".profile-copy p",
};

const portfolioImageFields = {
  logo: [".logo-mark img", ".hero-brand-strip img:first-child"],
  avatar: [".profile-photo img"],
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

function applyPortfolioText() {
  const saved = localStorage.getItem(PORTFOLIO_TEXT_KEY);
  if (!saved) return;

  const data = JSON.parse(saved);
  Object.entries(portfolioTextFields).forEach(([key, selector]) => {
    const target = document.querySelector(selector);
    const value = data[key];
    if (target && value) {
      target.textContent = value;
    }
  });
}

async function applyPortfolioImages() {
  const entries = Object.entries(portfolioImageFields);

  await Promise.all(
    entries.map(async ([id, selectors]) => {
      const source = await getPortfolioImage(id);
      if (!source) return;

      selectors.forEach((selector) => {
        document.querySelectorAll(selector).forEach((image) => {
          image.src = source;
        });
      });
    })
  );
}

window.PortfolioAdminSchema = {
  textFields: portfolioTextFields,
  imageFields: portfolioImageFields,
  textKey: PORTFOLIO_TEXT_KEY,
  dbName: PORTFOLIO_DB_NAME,
  dbStore: PORTFOLIO_DB_STORE,
};

document.addEventListener("DOMContentLoaded", () => {
  applyPortfolioText();
  applyPortfolioImages().catch(() => {});
});
