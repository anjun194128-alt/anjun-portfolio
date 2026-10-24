const schema = window.PortfolioAdminSchema;
const toast = document.querySelector("#toast");

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 1800);
}

function readTextData() {
  try {
    return JSON.parse(localStorage.getItem(schema.textKey)) || {};
  } catch {
    return {};
  }
}

function saveTextData(data) {
  localStorage.setItem(schema.textKey, JSON.stringify(data));
}

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(schema.dbName, 1);

    request.onupgradeneeded = () => {
      request.result.createObjectStore(schema.dbStore);
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveImage(id, source) {
  const db = await openDb();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(schema.dbStore, "readwrite");
    const store = transaction.objectStore(schema.dbStore);
    store.put(source, id);
    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
    transaction.onerror = () => reject(transaction.error);
  });
}

async function getImage(id) {
  const db = await openDb();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(schema.dbStore, "readonly");
    const store = transaction.objectStore(schema.dbStore);
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result || "");
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => db.close();
  });
}

async function clearImages() {
  const db = await openDb();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(schema.dbStore, "readwrite");
    const store = transaction.objectStore(schema.dbStore);
    store.clear();
    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
    transaction.onerror = () => reject(transaction.error);
  });
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function setPreview(card, source) {
  const preview = card.querySelector(".preview");
  preview.innerHTML = source ? `<img src="${source}" alt="" />` : "";
}

function hydrateTextInputs() {
  const data = readTextData();

  Object.keys(schema.textFields).forEach((key) => {
    const input = document.querySelector(`#${key}`);
    if (input && data[key]) {
      input.value = data[key];
    }
  });
}

async function hydrateImagePreviews() {
  const cards = document.querySelectorAll("[data-image-field]");

  await Promise.all(
    Array.from(cards).map(async (card) => {
      const id = card.dataset.imageField;
      const source = await getImage(id);
      setPreview(card, source);
    })
  );
}

document.querySelectorAll("[data-save-text]").forEach(button => button.addEventListener("click", () => {
  const data = readTextData();
  const section = button.closest("section");
  const phoneInput = section.querySelector("#contactPhone");
  const phone = phoneInput?.value.replace(/[\s()-]/g, "");
  if (phone && !/^\+?\d{5,15}$/.test(phone)) {
    showToast("请输入有效的电话号码");
    phoneInput.focus();
    return;
  }

  Object.keys(schema.textFields).forEach((key) => {
    const input = section.querySelector(`#${key}`);
    if (input) {
      data[key] = input.value.trim();
    }
  });

  try {
    saveTextData(data);
    showToast("文字已保存");
  } catch {
    showToast("保存失败，请检查浏览器存储空间");
  }
}));

document.querySelectorAll("[data-image-field]").forEach((card) => {
  const input = card.querySelector('input[type="file"]');

  input.addEventListener("change", async () => {
    const file = input.files && input.files[0];
    if (!file) return;

    const source = await fileToDataUrl(file);
    await saveImage(card.dataset.imageField, source);
    setPreview(card, source);
    showToast("图片已保存");
  });
});

document.querySelector("#resetAll").addEventListener("click", async () => {
  const confirmed = window.confirm("确定清空后台自定义内容，恢复前台默认素材吗？");
  if (!confirmed) return;

  localStorage.removeItem(schema.textKey);
  await clearImages();
  document.querySelectorAll("input, textarea").forEach((field) => {
    if (field.type !== "file") field.value = field.defaultValue;
  });
  document.querySelectorAll("[data-image-field]").forEach((card) => setPreview(card, ""));
  showToast("已恢复默认");
});

hydrateTextInputs();
hydrateImagePreviews().catch(() => {});
