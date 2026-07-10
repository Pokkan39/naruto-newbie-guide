/* ===== 展示页逻辑：加载内容 + 渲染目录树卡片 ===== */
const STORAGE_KEY = "naruto-wiki-content";

/* ===== 本地存储：IndexedDB（容量大，可存大量图片；localStorage 仅约5MB会爆） ===== */
const IDB_NAME = "naruto-wiki-db";
const IDB_STORE = "kv";

function idbOpen() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function idbSet(key, value) {
  const db = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    tx.objectStore(IDB_STORE).put(value, key);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error("aborted"));
  });
}
async function idbGet(key) {
  const db = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readonly");
    const r = tx.objectStore(IDB_STORE).get(key);
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

/* 读取本地内容：优先 IndexedDB；没有则尝试把旧 localStorage 数据迁移过来 */
async function loadLocalContent() {
  try {
    const v = await idbGet(STORAGE_KEY);
    if (v) return typeof v === "string" ? JSON.parse(v) : v;
  } catch (e) { /* 忽略，走回退 */ }
  // 旧版本数据迁移
  try {
    const legacy = localStorage.getItem(STORAGE_KEY);
    if (legacy) {
      const obj = JSON.parse(legacy);
      try { await idbSet(STORAGE_KEY, obj); localStorage.removeItem(STORAGE_KEY); } catch (e) {}
      return obj;
    }
  } catch (e) {}
  return null;
}

/* 把用户输入的视频（BV号 / B站链接 / YouTube / 通用iframe链接）转成可嵌入的 iframe src */
function toEmbedUrl(raw) {
  if (!raw) return "";
  const v = raw.trim();

  // 已经是 iframe 代码，抽出 src
  const iframeMatch = v.match(/<iframe[^>]*\ssrc=["']([^"']+)["']/i);
  if (iframeMatch) return iframeMatch[1];

  // B站 BV 号（纯 BV 或链接里含 BV）
  const bv = v.match(/BV[0-9A-Za-z]+/);
  if (bv) {
    return `https://player.bilibili.com/player.html?bvid=${bv[0]}&autoplay=0&high_quality=1`;
  }
  // B站 av 号
  const av = v.match(/av(\d+)/i);
  if (av && /bilibili/i.test(v)) {
    return `https://player.bilibili.com/player.html?aid=${av[1]}&autoplay=0`;
  }

  // YouTube
  const yt = v.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;

  // 其它 http(s) 链接，直接当作可嵌入地址
  if (/^https?:\/\//i.test(v)) return v;

  return "";
}

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/* 渲染单张卡片 */
function renderCard(node) {
  const card = document.createElement("div");
  card.className = "card";
  let media = "";
  // 兼容旧的单图字段 image，新的是 images 数组
  const imgs = Array.isArray(node.images) ? node.images : (node.image ? [node.image] : []);
  if (node.type === "image" && imgs.length) {
    const cls = imgs.length > 1 ? "card-imgs multi" : "card-imgs";
    media = `<div class="${cls}">` +
      imgs.map((src) => `<img class="card-img zoomable" src="${esc(src)}" alt="${esc(node.title)}" loading="lazy" />`).join("") +
      `</div>`;
  } else if (node.type === "video" && node.video) {
    const src = toEmbedUrl(node.video);
    if (src) {
      media = `<div class="card-video"><iframe src="${esc(src)}" allowfullscreen scrolling="no" frameborder="0"></iframe></div>`;
    }
  }
  const eyebrow = node.eyebrow ? `<div class="card-eyebrow">${esc(node.eyebrow)}</div>` : "";
  const title = node.title ? `<div class="card-title">${esc(node.title)}</div>` : "";
  const body = node.body ? `<div class="card-body">${esc(node.body)}</div>` : "";
  card.innerHTML = media + eyebrow + title + body;
  return card;
}

/* 应用背景设置：默认 / 纯色 / 背景图 */
function applyBackground(site) {
  const bg = (site && site.background) || {};
  const b = document.body;
  b.style.backgroundImage = "";
  b.style.backgroundColor = "";
  b.style.backgroundSize = "";
  b.style.backgroundPosition = "";
  b.classList.remove("bg-image");
  if (bg.type === "color" && bg.color) {
    b.style.backgroundImage = "none";
    b.style.backgroundColor = bg.color;
  } else if (bg.type === "image" && bg.image) {
    b.classList.add("bg-image");
    const dim = bg.dim != null ? bg.dim : 0.55;
    b.style.backgroundImage =
      `linear-gradient(rgba(13,15,20,${dim}), rgba(13,15,20,${dim})), url("${bg.image}")`;
    // 填充方式与位置
    b.style.backgroundSize = (bg.size === "contain" ? "contain" : "cover");
    const px = bg.posX != null ? bg.posX : 50;
    const py = bg.posY != null ? bg.posY : 50;
    b.style.backgroundPosition = `${px}% ${py}%`;
  }
  // type 为空或 "default" 时，保持样式表里的默认渐变背景
}

/* 渲染整棵树：顶层节点 = 章，子节点 = 卡片 */
function render(data) {
  const site = data.site || {};
  document.getElementById("site-title").textContent = site.title || "火影忍者入坑教学";
  document.getElementById("site-subtitle").textContent = site.subtitle || "";
  if (site.title) document.title = site.title;
  applyBackground(site);

  const toc = document.getElementById("toc");
  const content = document.getElementById("content");
  toc.innerHTML = "";
  content.innerHTML = "";

  const nodes = data.nodes || [];
  if (!nodes.length) {
    content.innerHTML = `<div class="empty-state"><strong>还没有内容</strong>点右上角「编辑」开始添加吧。</div>`;
    return;
  }

  nodes.forEach((chapter) => {
    // 侧边目录
    const li = document.createElement("li");
    li.innerHTML = `<a class="toc-link" href="#${chapter.id}">${esc(chapter.title || "未命名")}</a>`;
    if (chapter.children && chapter.children.length) {
      const sub = document.createElement("ul");
      sub.className = "toc-sub";
      chapter.children.forEach((ch) => {
        sub.innerHTML += `<li><a class="toc-link" href="#${ch.id}">${esc(ch.title || "未命名")}</a></li>`;
      });
      li.appendChild(sub);
    }
    toc.appendChild(li);

    // 章节区块
    const section = document.createElement("section");
    section.className = "chapter";
    section.id = chapter.id;
    const head = document.createElement("div");
    head.className = "chapter-head";
    head.innerHTML =
      (chapter.eyebrow ? `<span class="eyebrow">${esc(chapter.eyebrow)}</span>` : "") +
      `<h2 class="chapter-title">${esc(chapter.title || "未命名")}</h2>` +
      (chapter.body ? `<p class="chapter-desc">${esc(chapter.body)}</p>` : "");
    section.appendChild(head);

    const cards = document.createElement("div");
    cards.className = "cards";
    (chapter.children || []).forEach((child) => {
      child.id = child.id || "";
      const cardWrap = renderCard(child);
      cardWrap.id = child.id;
      cardWrap.style.scrollMarginTop = "92px";
      cards.appendChild(cardWrap);
    });
    if (cards.children.length) section.appendChild(cards);
    content.appendChild(section);
  });

  setupScrollSpy();
}

/* 目录高亮跟随滚动 */
function setupScrollSpy() {
  const links = [...document.querySelectorAll(".toc-link")];
  const targets = links
    .map((l) => document.getElementById(l.getAttribute("href").slice(1)))
    .filter(Boolean);
  if (!targets.length) return;
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          links.forEach((l) => l.classList.remove("active"));
          const active = links.find((l) => l.getAttribute("href") === "#" + e.target.id);
          if (active) active.classList.add("active");
        }
      });
    },
    { rootMargin: "-30% 0px -60% 0px" }
  );
  targets.forEach((t) => io.observe(t));
}

/* 加载：优先本地保存（编辑预览），否则读 content.json */
async function load() {
  try {
    const local = await loadLocalContent();
    if (local) { render(local); return; }
  } catch (e) { /* 坏数据则回退 */ }
  try {
    const res = await fetch("content.json", { cache: "no-store" });
    const data = await res.json();
    render(data);
  } catch (e) {
    render({ nodes: [] });
  }
}

/* ---------- 图片点击放大（灯箱，支持多图切换） ---------- */
let lbGroup = [];   // 当前打开的一组图片
let lbIndex = 0;

function setupLightbox() {
  let box = document.getElementById("lightbox");
  if (!box) {
    box = document.createElement("div");
    box.id = "lightbox";
    box.className = "lightbox";
    box.innerHTML =
      `<span class="lightbox-close" aria-label="关闭">✕</span>` +
      `<button class="lightbox-nav prev" aria-label="上一张">‹</button>` +
      `<img alt="放大查看" />` +
      `<button class="lightbox-nav next" aria-label="下一张">›</button>` +
      `<span class="lightbox-count"></span>`;
    document.body.appendChild(box);

    const close = () => box.classList.remove("open");
    const show = (i) => {
      if (!lbGroup.length) return;
      lbIndex = (i + lbGroup.length) % lbGroup.length;
      box.querySelector("img").src = lbGroup[lbIndex];
      box.querySelector(".lightbox-count").textContent =
        lbGroup.length > 1 ? `${lbIndex + 1} / ${lbGroup.length}` : "";
      box.querySelectorAll(".lightbox-nav").forEach((b) => {
        b.style.display = lbGroup.length > 1 ? "" : "none";
      });
    };
    box._show = show;

    // 点背景关闭；点图片/按钮不关闭
    box.addEventListener("click", close);
    box.querySelector("img").addEventListener("click", (e) => e.stopPropagation());
    box.querySelector(".prev").addEventListener("click", (e) => { e.stopPropagation(); show(lbIndex - 1); });
    box.querySelector(".next").addEventListener("click", (e) => { e.stopPropagation(); show(lbIndex + 1); });
    box.querySelector(".lightbox-close").addEventListener("click", (e) => { e.stopPropagation(); close(); });
    document.addEventListener("keydown", (e) => {
      if (!box.classList.contains("open")) return;
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") show(lbIndex - 1);
      else if (e.key === "ArrowRight") show(lbIndex + 1);
    });
  }

  document.getElementById("content").addEventListener("click", (e) => {
    const img = e.target.closest("img.zoomable");
    if (!img) return;
    const wrap = img.closest(".card-imgs");
    lbGroup = wrap ? [...wrap.querySelectorAll("img")].map((im) => im.src) : [img.src];
    const start = wrap ? [...wrap.querySelectorAll("img")].indexOf(img) : 0;
    box.classList.add("open");
    box._show(start < 0 ? 0 : start);
  });
}

// 仅在展示页（存在内容容器时）自动加载渲染；编辑页不触发
if (document.getElementById("content")) {
  load();
  setupLightbox();
}
