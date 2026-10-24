(function (scope) {
  "use strict";
  const REPO = "/repos/anjun194128-alt/anjun-portfolio";
  const decode = value => new TextDecoder().decode(Uint8Array.from(atob(value.replace(/\s/g, "")), c => c.charCodeAt(0)));

  class GitHubCMS {
    #token;
    #abort = new AbortController();
    constructor(token) {
      this.#token = token.trim();
      if (!this.#token) throw new Error("请输入 GitHub 授权密钥");
    }
    logout() {
      this.#token = "";
      this.#abort.abort();
    }
    async request(path, method = "GET", data) {
      if (!this.#token || this.#abort.signal.aborted) throw new Error("请重新登录");
      if (!path.startsWith(REPO + "/") && path !== REPO && path !== "/user") throw new Error("请求路径无效");
      let response;
      try {
        response = await fetch(`https://api.github.com${path}`, {
          method,
          redirect: "error",
          cache: "no-store",
          headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${this.#token}`, "X-GitHub-Api-Version": "2022-11-28", ...(data ? { "Content-Type": "application/json" } : {}) },
          body: data ? JSON.stringify(data) : undefined,
          signal: AbortSignal.any([this.#abort.signal, AbortSignal.timeout(45000)]),
        });
      } catch {
        throw new Error(this.#abort.signal.aborted ? "登录已退出" : "无法连接 GitHub，请检查网络后重试");
      }
      if (!response.ok) {
        const errors = { 401: "授权密钥无效或已过期，请重新登录", 403: "GitHub 拒绝访问，请检查密钥的仓库权限或 API 配额", 404: "无法访问仓库内容，请检查授权范围", 409: "线上版本已变化，请重新载入后再发布", 422: "发布被拒绝：可能存在新版本或分支保护，请重新载入并检查仓库设置", 429: "请求过于频繁，请稍后重试" };
        throw new Error(errors[response.status] || `GitHub 请求失败（${response.status}）`);
      }
      return response.status === 204 ? null : response.json();
    }
    async login() {
      const user = await this.request("/user");
      const repo = await this.request(REPO);
      if (!repo.permissions?.push || repo.archived) throw new Error("此账号没有作品集仓库的编辑权限");
      // A harmless unreferenced blob checks the token's actual Contents write permission.
      await this.request(`${REPO}/git/blobs`, "POST", { content: "", encoding: "utf-8" });
      const snapshot = await this.load();
      return { user: { login: user.login }, ...snapshot };
    }
    async load() {
      const ref = await this.request(`${REPO}/git/ref/heads/main`);
      const head = ref.object.sha;
      const file = await this.request(`${REPO}/contents/content.json?ref=${head}`);
      const content = JSON.parse(decode(file.content));
      if (content.version !== 1 || !content.text || !content.images) throw new Error("线上内容格式无效");
      return { head, content };
    }
    async publish(head, content, uploads, onProgress = () => {}) {
      const ref = await this.request(`${REPO}/git/ref/heads/main`);
      if (ref.object.sha !== head) throw new Error("线上已有新修改，请先重新载入；当前草稿仍保留在本机");
      const parent = await this.request(`${REPO}/git/commits/${head}`);
      const next = structuredClone(content);
      const tree = [];
      const paths = new Map();
      let totalBytes = 0;
      for (const [id, source] of Object.entries(uploads)) {
        if (!Object.hasOwn(next.images, id)) throw new Error("图片版位无效");
        const match = /^data:image\/(png|jpeg|webp|gif);base64,([A-Za-z0-9+/=]+)$/.exec(source);
        if (!match) throw new Error("图片仅支持 PNG、JPG、WebP 或 GIF");
        const bytes = Uint8Array.from(atob(match[2]), c => c.charCodeAt(0));
        totalBytes += bytes.length;
        if (bytes.length > 20 * 1024 * 1024 || totalBytes > 50 * 1024 * 1024) throw new Error("单张图片不能超过 20 MB，单次发布合计不能超过 50 MB");
        const hash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), b => b.toString(16).padStart(2, "0")).join("");
        const path = `assets/uploads/${hash}.${match[1] === "jpeg" ? "jpg" : match[1]}`;
        next.images[id] = path;
        if (paths.has(path)) continue;
        onProgress(`正在上传图片 ${paths.size + 1}`);
        const blob = await this.request(`${REPO}/git/blobs`, "POST", { content: match[2], encoding: "base64" });
        paths.set(path, blob.sha);
        tree.push({ path, mode: "100644", type: "blob", sha: blob.sha });
      }
      next.version = 1;
      next.revision = crypto.randomUUID();
      next.updatedAt = new Date().toISOString();
      const json = await this.request(`${REPO}/git/blobs`, "POST", { content: JSON.stringify(next, null, 2) + "\n", encoding: "utf-8" });
      tree.push({ path: "content.json", mode: "100644", type: "blob", sha: json.sha });
      onProgress("正在提交发布");
      const createdTree = await this.request(`${REPO}/git/trees`, "POST", { base_tree: parent.tree.sha, tree });
      const commit = await this.request(`${REPO}/git/commits`, "POST", { message: "Publish portfolio content from admin", tree: createdTree.sha, parents: [head] });
      await this.request(`${REPO}/git/refs/heads/main`, "PATCH", { sha: commit.sha, force: false });
      return { head: commit.sha, content: next };
    }
  }
  scope.GitHubCMS = GitHubCMS;
  if (typeof module !== "undefined") module.exports = { GitHubCMS };
})(typeof window !== "undefined" ? window : globalThis);
