/* ===== 展示页逻辑：加载内容 + 渲染目录树卡片 ===== */
const STORAGE_KEY = "naruto-wiki-content";

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
  if (node.type === "image" && node.image) {
    media = `<img class="card-img" src="${esc(node.image)}" alt="${esc(node.title)}" />`;
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

/* 渲染整棵树：顶层节点 = 章，子节点 = 卡片 */
function render(data) {
  const site = data.site || {};
  document.getElementById("site-title").textContent = site.title || "火影忍者入坑教学";
  document.getElementById("site-subtitle").textContent = site.subtitle || "";
  if (site.title) document.title = site.title;

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
  const local = localStorage.getItem(STORAGE_KEY);
  if (local) {
    try { render(JSON.parse(local)); return; } catch (e) { /* 坏数据则回退 */ }
  }
  try {
    const res = await fetch("content.json", { cache: "no-store" });
    const data = await res.json();
    render(data);
  } catch (e) {
    render({ nodes: [] });
  }
}

// 仅在展示页（存在内容容器时）自动加载渲染；编辑页不触发
if (document.getElementById("content")) {
  load();
}
