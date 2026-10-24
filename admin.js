"use strict";
const schema = window.PortfolioAdminSchema;
const $ = selector => document.querySelector(selector);
const editor = $("#editor");
const storeDraftKey = "anjunPortfolioStoreDraft";
let client, baseline, content;
let uploads = {};
let dirty = false, busy = false, generation = 0, toastTimer;
function status(message) { $("#publish-status").textContent = message; }
function toast(message) {
  $("#toast").textContent = message; $("#toast").classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("#toast").classList.remove("show"), 3000);
}
function setBusy(value) {
  busy = value;
  editor.querySelectorAll("input, textarea, button").forEach(el => { el.disabled = value; });
  $("#logout").disabled = value;
}
function requireLogin() { if (!client || !content) throw new Error("请先登录"); }
function markDirty() { dirty = true; status("有未发布修改"); }
function hydrate() {
  Object.keys(schema.textFields).forEach(key => {
    const input = document.getElementById(key);
    if (input) input.value = content.text[key] ?? "";
  });
  document.querySelectorAll("[data-image-field]").forEach(card => {
    const preview = card.querySelector(".preview"); preview.replaceChildren();
    const source = uploads[card.dataset.imageField] || content.images[card.dataset.imageField];
    if (!source) return;
    const image = document.createElement("img");
    image.src = source; image.alt = ""; image.loading = "lazy"; preview.append(image);
  });
  renderStores();
}
function useSnapshot(snapshot) {
  baseline = snapshot; content = structuredClone(snapshot.content);
  uploads = {}; dirty = false; hydrate();
}
function collect(section = editor) {
  const updates = {};
  Object.keys(schema.textFields).forEach(key => {
    const input = section.querySelector("#" + key); if (!input) return;
    const value = input.value.trim();
    if (value.length > 8000) throw new Error("单项文字不能超过 8000 字");
    if (key === "contactPhone" && !/^\+?\d{5,15}$/.test(value.replace(/[\s()-]/g, ""))) {
      input.focus(); throw new Error("请输入有效的电话号码");
    }
    updates[key] = value;
  });
  Object.assign(content.text, updates);
  if (section === editor) content.stores = collectStores();
}
function saveDraft() {
  localStorage.setItem(schema.textKey, JSON.stringify(content.text));
  localStorage.setItem(storeDraftKey, JSON.stringify(content.stores || []));
}
function addStoreRow(container, platform, store = {}) {
  const row = document.createElement("div"); row.className = "store-row"; row.dataset.platform = platform;
  for (const [field, label, type] of [["title", "案例名称", "text"], ["url", "公开链接", "url"]]) {
    const wrapper = document.createElement("label"); wrapper.append(document.createTextNode(label));
    const input = document.createElement("input"); input.type = type; input.dataset.storeField = field;
    input.value = typeof store[field] === "string" ? store[field] : "";
    input.placeholder = field === "url" ? "https://..." : "店铺或项目名称";
    input.maxLength = field === "url" ? 2048 : 120;
    input.addEventListener("input", markDirty); wrapper.append(input); row.append(wrapper);
  }
  const remove = document.createElement("button"); remove.type = "button"; remove.className = "store-remove";
  remove.textContent = "×"; remove.title = "移除这个案例"; remove.setAttribute("aria-label", "移除这个案例");
  remove.addEventListener("click", () => { row.remove(); markDirty(); }); row.append(remove); container.append(row);
}
function renderStores() {
  const root = $("#store-groups"); root.replaceChildren();
  for (const platform of ["天猫", "淘宝", "拼多多", "抖音"]) {
    const group = document.createElement("details"); group.className = "store-group";
    const existing = Array.isArray(content.stores) ? content.stores.filter(item => item.platform === platform) : [];
    const summary = document.createElement("summary"); summary.textContent = platform + "案例"; group.append(summary);
    const rows = document.createElement("div"); group.append(rows);
    for (let i = 0; i < Math.max(4, existing.length); i++) addStoreRow(rows, platform, existing[i]);
    const add = document.createElement("button"); add.type = "button"; add.className = "store-add"; add.textContent = "+ 新增" + platform + "案例";
    add.addEventListener("click", () => {
      if (document.querySelectorAll(".store-row").length >= 100) { toast("最多可保留 100 个案例位置"); return; }
      addStoreRow(rows, platform); markDirty();
    });
    group.append(add); root.append(group);
  }
}
function collectStores() {
  const stores = [];
  document.querySelectorAll(".store-row").forEach(row => {
    const title = row.querySelector("[data-store-field='title']").value.trim();
    const input = row.querySelector("[data-store-field='url']"); const value = input.value.trim();
    if (!title && !value) return;
    let url;
    try { url = new URL(value); if (url.protocol !== "https:") throw new Error(); }
    catch { input.focus(); throw new Error("案例请填写完整的 https:// 公开链接；未填写的位置保持名称和链接都为空"); }
    stores.push({ platform: row.dataset.platform, title: title || row.dataset.platform + "店铺案例", url: url.href });
  });
  return stores;
}
$("#save-stores").addEventListener("click", () => {
  try { requireLogin(); content.stores = collectStores(); saveDraft(); markDirty(); toast("案例草稿已保存"); }
  catch (error) { toast(error.message); }
});
async function imageTransaction(action) {
  const db = await openPortfolioDb();
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction(schema.dbStore, "readwrite"); action(tx.objectStore(schema.dbStore));
      tx.oncomplete = resolve; tx.onerror = tx.onabort = () => reject(new Error("本机图片草稿保存失败"));
    });
  } finally { db.close(); }
}
async function clearDraft() {
  localStorage.removeItem(schema.textKey); localStorage.removeItem(storeDraftKey); await imageTransaction(store => store.clear());
}
$("#login-form").addEventListener("submit", async event => {
  event.preventDefault(); $("#login-button").disabled = true;
  $("#login-error").textContent = "正在校验 GitHub 仓库权限…";
  let candidate;
  try {
    candidate = new GitHubCMS($("#access-token").value); $("#access-token").value = "";
    const result = await candidate.login(); client = candidate; useSnapshot(result);
    $("#account-label").textContent = "已授权：" + result.user.login;
    $("#login-screen").hidden = true; editor.hidden = false; $("#logout").hidden = false;
    $("#login-error").textContent = ""; status("已载入线上内容");
  } catch (error) { candidate?.logout(); $("#login-error").textContent = error.message; }
  finally { $("#login-button").disabled = false; }
});
$("#logout").addEventListener("click", () => {
  if (busy || (dirty && !confirm("还有未发布修改，确定退出吗？"))) return;
  generation++; client?.logout(); client = baseline = content = null; uploads = {}; dirty = false;
  editor.querySelectorAll("input, textarea").forEach(el => { el.value = ""; });
  editor.querySelectorAll(".preview").forEach(el => el.replaceChildren());
  editor.hidden = true; $("#logout").hidden = true; $("#login-screen").hidden = false;
  $("#access-token").focus();
});
editor.querySelectorAll("input:not([type='file']), textarea").forEach(input => input.addEventListener("input", markDirty));
document.querySelectorAll("[data-save-text]").forEach(button => button.addEventListener("click", () => {
  try { requireLogin(); collect(button.closest("section")); saveDraft(); markDirty(); toast("草稿已保存，确认发布后网站才会更新"); }
  catch (error) { toast(error.message); }
}));
document.querySelectorAll("[data-image-field]").forEach(card => {
  const input = card.querySelector("input[type='file']"); input.accept = "image/png,image/jpeg,image/webp,image/gif";
  input.addEventListener("change", async () => {
    const file = input.files[0]; if (!file || busy) return;
    try {
      requireLogin();
      setBusy(true);
      if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type) || file.size > 20 * 1024 * 1024) throw new Error("请选择不超过 20 MB 的 PNG、JPG、WebP 或 GIF 图片");
      const bitmap = await createImageBitmap(file); bitmap.close();
      const source = await new Promise((resolve, reject) => {
        const reader = new FileReader(); reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error("图片读取失败")); reader.readAsDataURL(file);
      });
      collect(); uploads[card.dataset.imageField] = source;
      await imageTransaction(store => store.put(source, card.dataset.imageField));
      saveDraft(); hydrate(); markDirty(); toast("图片已加入草稿");
    } catch (error) { toast(error.message); }
    finally { input.value = ""; setBusy(false); }
  });
});
$("#import-draft").addEventListener("click", async () => {
  try {
    requireLogin(); if (dirty && !confirm("用本机草稿替换当前未发布修改吗？")) return;
    const text = JSON.parse(localStorage.getItem(schema.textKey) || "{}");
    const stores = JSON.parse(localStorage.getItem(storeDraftKey) || "[]");
    if (Array.isArray(stores)) content.stores = stores.slice(0, 100);
    Object.keys(schema.textFields).forEach(key => {
      if (typeof text[key] === "string" && text[key].length <= 8000) content.text[key] = text[key];
    });
    for (const id of Object.keys(schema.imageFields)) {
      const source = await getPortfolioImage(id); if (source) uploads[id] = source;
    }
    hydrate(); markDirty(); toast("本机草稿已恢复，请检查后再发布");
  } catch (error) { toast(error.message); }
});
$("#resetAll").addEventListener("click", async () => {
  if (!confirm("放弃当前修改并重新载入线上版本吗？")) return;
  setBusy(true);
  try { requireLogin(); useSnapshot(await client.load()); generation++; await clearDraft(); status("已重新载入线上内容"); }
  catch (error) { toast(error.message); }
  finally { setBusy(false); }
});
$("#publish").addEventListener("click", () => {
  try {
    requireLogin(); collect(); saveDraft();
    const summary = $("#change-summary"); summary.replaceChildren(); let count = 0;
    Object.keys(schema.textFields).forEach(key => {
      if (content.text[key] === baseline.content.text[key]) return;
      const item = document.createElement("p");
      const label = document.getElementById(key)?.closest("label")?.childNodes[0]?.textContent.trim() || key;
      item.textContent = label + "：" + (content.text[key].slice(0, 180) || "（清空）");
      summary.append(item); count++;
    });
    const images = Object.keys(uploads).length;
    if (JSON.stringify(content.stores || []) !== JSON.stringify(baseline.content.stores || [])) {
      const item = document.createElement("p"); item.textContent = "更新店铺与商品链接，共 " + content.stores.length + " 项";
      summary.append(item); count++;
    }
    if (images) { const item = document.createElement("p"); item.textContent = "更新 " + images + " 张图片"; summary.append(item); }
    if (!count && !images) { toast("没有需要发布的修改"); return; }
    $("#publish-confirm").showModal();
  } catch (error) { toast(error.message); }
});
$("#cancel-publish").addEventListener("click", () => $("#publish-confirm").close());
async function waitForDeployment(revision, stamp) {
  for (let i = 0; i < 18; i++) {
    await new Promise(resolve => setTimeout(resolve, 5000));
    if (stamp !== generation || !client) return;
    try {
      const r = await fetch("content.json?release=" + encodeURIComponent(revision) + "&check=" + i, { cache: "no-store", signal: AbortSignal.timeout(8000) });
      if (r.ok && (await r.json()).revision === revision) {
        if (stamp === generation) status(dirty ? "上一版已上线；当前还有未发布修改" : "已上线，所有访客现在都能看到更新");
        return;
      }
    } catch { /* Retry visibility, not the commit. */ }
  }
  if (stamp === generation) status("已提交发布，部署仍在进行。可通过“发布记录”查看结果。");
}
$("#confirm-publish").addEventListener("click", async () => {
  $("#publish-confirm").close(); setBusy(true);
  try {
    requireLogin();
    const result = await client.publish(baseline.head, content, uploads, status); useSnapshot(result);
    try { await clearDraft(); } catch { /* Already committed. */ }
    status("已提交发布，正在等待网站更新…");
    void waitForDeployment(result.content.revision, ++generation);
  } catch (error) { status("发布未完成或尚未确认：" + error.message + "。可查看发布记录后重新载入。"); }
  finally { setBusy(false); }
});
window.addEventListener("beforeunload", event => {
  if (!dirty && !busy) return; event.preventDefault(); event.returnValue = "";
});
