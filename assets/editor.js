/* ===== 编辑页逻辑 ===== */
/* 依赖 app.js 中的全局函数：toEmbedUrl(), esc(), STORAGE_KEY */

/* —— 编辑密码（想改就改这里的引号内文字）—— */
const EDIT_PASSWORD = "114514";

const AUTH_KEY = "naruto-wiki-auth";

let data = { site: { title: "火影忍者入坑教学", subtitle: "" }, nodes: [] };
let editingId = null;      // 正在编辑的节点 id
let addingParentId = null; // null=新增根章节；否则为父节点 id
let collapsed = false;
let editingImages = [];    // 当前编辑节点的图片列表（多图）

/* ---------- 数据存取（IndexedDB，容量大，可存大量图片） ---------- */
async function save() {
  try {
    await idbSet(STORAGE_KEY, data);
    flash("已自动保存到本浏览器");
    return true;
  } catch (err) {
    const el = document.getElementById("status");
    el.style.color = "var(--red)";
    el.textContent = "⚠ 保存失败（可能磁盘空间不足或浏览器限制）。改动可能未保存，建议先「导出」备份。";
    setTimeout(() => { el.style.color = ""; el.textContent = ""; }, 6000);
    return false;
  }
}
function flash(msg) {
  const el = document.getElementById("status");
  el.textContent = msg;
  clearTimeout(flash._t);
  flash._t = setTimeout(() => (el.textContent = ""), 2200);
}
function uid() {
  return "n" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

async function loadData() {
  try {
    const local = await loadLocalContent();
    if (local) { data = local; normalize(); return; }
  } catch (e) {}
  try {
    const res = await fetch("content.json", { cache: "no-store" });
    data = await res.json();
  } catch (e) {
    data = { site: { title: "火影忍者入坑教学", subtitle: "" }, nodes: [] };
  }
  normalize();
}
function normalize() {
  if (!data.site) data.site = { title: "火影忍者入坑教学", subtitle: "" };
  if (!Array.isArray(data.nodes)) data.nodes = [];
  const walk = (arr) => arr.forEach((n) => {
    if (!n.id) n.id = uid();
    if (!Array.isArray(n.children)) n.children = [];
    walk(n.children);
  });
  walk(data.nodes);
}

/* ---------- 树查找 ---------- */
function findNode(id, arr = data.nodes, parent = null) {
  for (const n of arr) {
    if (n.id === id) return { node: n, list: arr, parent };
    const r = findNode(id, n.children, n);
    if (r) return r;
  }
  return null;
}

/* ---------- 渲染目录树 ---------- */
function renderTree() {
  const tree = document.getElementById("tree");
  tree.innerHTML = "";
  if (!data.nodes.length) {
    tree.innerHTML = `<div class="empty-state"><strong>还没有内容</strong>点上方「＋ 新增章节」开始。</div>`;
    return;
  }
  data.nodes.forEach((n) => tree.appendChild(renderNode(n, true)));
}

function renderNode(node, isRoot) {
  const li = document.createElement("li");
  li.className = "tree-node";

  const typeLabel = { text: "文字", image: "图片", video: "视频" }[node.type] || "文字";
  const row = document.createElement("div");
  row.className = "node-row";
  row.innerHTML = `
    <span class="node-type-badge ${node.type || "text"}">${typeLabel}</span>
    <div class="node-info">
      <div class="n-title">${esc(node.title || "未命名")}</div>
      ${node.eyebrow ? `<div class="n-eyebrow">${esc(node.eyebrow)}</div>` : ""}
    </div>
    <div class="node-actions">
      <button class="icon-btn" data-act="up" title="上移">↑</button>
      <button class="icon-btn" data-act="down" title="下移">↓</button>
      <button class="icon-btn" data-act="add" title="添加子项">＋</button>
      <button class="icon-btn" data-act="edit" title="编辑">✎</button>
      <button class="icon-btn del" data-act="del" title="删除">🗑</button>
    </div>`;
  row.querySelectorAll("[data-act]").forEach((btn) => {
    btn.addEventListener("click", () => handleAction(btn.dataset.act, node.id));
  });
  li.appendChild(row);

  if (node.children && node.children.length && !collapsed) {
    const ul = document.createElement("ul");
    ul.className = "tree-children";
    node.children.forEach((c) => ul.appendChild(renderNode(c, false)));
    li.appendChild(ul);
  }
  return li;
}

function handleAction(act, id) {
  const found = findNode(id);
  if (!found) return;
  const { node, list } = found;
  const idx = list.indexOf(node);
  if (act === "up" && idx > 0) { [list[idx - 1], list[idx]] = [list[idx], list[idx - 1]]; save(); renderTree(); }
  else if (act === "down" && idx < list.length - 1) { [list[idx + 1], list[idx]] = [list[idx], list[idx + 1]]; save(); renderTree(); }
  else if (act === "add") { openNodeModal(null, id); }
  else if (act === "edit") { openNodeModal(id, null); }
  else if (act === "del") {
    if (confirm(`确定删除「${node.title || "未命名"}」${node.children.length ? "及其下所有子项" : ""}？`)) {
      list.splice(idx, 1); save(); renderTree();
    }
  }
}

/* ---------- 节点弹窗 ---------- */
const nodeModal = document.getElementById("node-modal");
const nodeForm = document.getElementById("node-form");

function updateTypeFields() {
  const type = nodeForm.type.value;
  nodeForm.querySelectorAll("[data-when]").forEach((el) => {
    el.style.display = el.dataset.when === type ? "" : "none";
  });
}

function openNodeModal(id, parentId) {
  editingId = id;
  addingParentId = parentId;
  document.getElementById("modal-title").textContent = id ? "编辑节点" : "新增节点";

  let node = { type: "text", eyebrow: "", title: "", body: "", image: "", video: "" };
  if (id) { const f = findNode(id); if (f) node = f.node; }

  nodeForm.type.value = node.type || "text";
  nodeForm.eyebrow.value = node.eyebrow || "";
  nodeForm.title.value = node.title || "";
  nodeForm.body.value = node.body || "";
  nodeForm.video.value = node.video || "";

  // 兼容：旧数据是单个 image 字段，新数据是 images 数组
  editingImages = Array.isArray(node.images)
    ? node.images.slice()
    : (node.image ? [node.image] : []);

  renderImgPreview();
  renderVideoPreview(node.video || "");
  updateTypeFields();
  nodeModal.classList.add("open");
}

function renderImgPreview() {
  const box = document.getElementById("img-preview");
  box.innerHTML = "";
  if (!editingImages.length) {
    box.innerHTML = `<div class="hint">还没有图片，点上方「选择文件」添加。</div>`;
    return;
  }
  const totalKB = Math.round(editingImages.reduce((s, u) => s + dataUrlBytes(u), 0) / 1024);
  const info = document.createElement("div");
  info.className = "hint";
  info.style.width = "100%";
  info.textContent = `共 ${editingImages.length} 张，合计约 ${totalKB} KB`;
  box.appendChild(info);
  editingImages.forEach((src, i) => {
    const thumb = document.createElement("div");
    thumb.className = "img-thumb";
    thumb.innerHTML =
      `<img src="${esc(src)}" alt="图 ${i + 1}" />` +
      `<button type="button" class="img-thumb-del" data-i="${i}" title="删除这张">✕</button>`;
    thumb.querySelector(".img-thumb-del").addEventListener("click", () => {
      editingImages.splice(i, 1);
      renderImgPreview();
    });
    box.appendChild(thumb);
  });
}
function renderVideoPreview(raw) {
  const box = document.getElementById("video-preview");
  const frame = document.getElementById("video-frame");
  const src = toEmbedUrl(raw);
  if (src) { frame.src = src; box.classList.add("show"); }
  else { frame.src = "about:blank"; box.classList.remove("show"); }
}

nodeForm.type.forEach && nodeForm.querySelectorAll('input[name="type"]').forEach((r) =>
  r.addEventListener("change", updateTypeFields)
);

/* 压缩图片：限制最长边，输出 JPEG，大幅减小体积以适配本地存储 */
/* 把图片文件解码成 <img>。浏览器解不了码（如 iPhone 的 HEIC）会走 reject。 */
function decodeImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve({ img, dataUrl: reader.result });
      img.onerror = () => reject(new Error("decode-failed"));
      img.src = reader.result;
    };
    reader.onerror = () => reject(new Error("read-failed"));
    reader.readAsDataURL(file);
  });
}

/* base64 dataURL 的实际字节大小 */
function dataUrlBytes(dataUrl) {
  const i = dataUrl.indexOf(",");
  const b64 = i >= 0 ? dataUrl.slice(i + 1) : dataUrl;
  return Math.floor(b64.length * 3 / 4);
}

/* 自适应压缩：不断降尺寸/降质量，直到体积 <= 目标（默认 300KB）。
   十几张普通照片这样也能轻松存下。返回 null 表示格式无法解码。 */
async function compressImage(file, targetBytes = 300 * 1024) {
  // GIF 动图不压缩，直接读取（压了会丢动画）
  if (file.type === "image/gif") {
    return await new Promise((res) => {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.readAsDataURL(file);
    });
  }
  let decoded;
  try {
    decoded = await decodeImage(file);
  } catch (e) {
    return null; // 无法解码（HEIC 等）
  }
  const { img } = decoded;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  // 逐档尝试：最长边从 1600 一路降，质量从 0.85 降到 0.5
  const maxSizes = [1600, 1280, 1024, 800, 640];
  const qualities = [0.85, 0.75, 0.65, 0.55];
  let best = null;
  for (const maxSize of maxSizes) {
    let { width, height } = img;
    if (width > maxSize || height > maxSize) {
      if (width >= height) { height = Math.round(height * maxSize / width); width = maxSize; }
      else { width = Math.round(width * maxSize / height); height = maxSize; }
    }
    canvas.width = width; canvas.height = height;
    ctx.fillStyle = "#fff"; // 透明PNG铺白底
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    for (const q of qualities) {
      const url = canvas.toDataURL("image/jpeg", q);
      const bytes = dataUrlBytes(url);
      if (!best || bytes < best.bytes) best = { url, bytes };
      if (bytes <= targetBytes) return url; // 达标即用
    }
  }
  return best ? best.url : null; // 都没达标就用最小的那版
}

document.getElementById("img-file").addEventListener("change", async (e) => {
  const files = [...e.target.files];
  if (!files.length) return;
  const failed = [];
  let done = 0;
  for (const file of files) {
    flash(`正在处理图片… ${done + 1}/${files.length}`);
    const dataUrl = await compressImage(file);
    if (dataUrl) { editingImages.push(dataUrl); done++; }
    else failed.push(file.name);
  }
  renderImgPreview();
  if (failed.length) {
    const el = document.getElementById("status");
    el.style.color = "var(--red)";
    el.textContent = `⚠ 有 ${failed.length} 张无法读取（多为 iPhone 的 HEIC 格式）：${failed.join("、")}。` +
      `请在手机设置→相机→格式，改为「兼容性(JPEG)」后重拍/重发，或先转成 JPG/PNG 再上传。`;
    setTimeout(() => { el.style.color = ""; el.textContent = ""; }, 9000);
  } else {
    flash(`已添加 ${done} 张（自动压缩）`);
  }
  e.target.value = ""; // 允许再次选同一批文件
});

nodeForm.video.addEventListener("input", () => renderVideoPreview(nodeForm.video.value));

nodeForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const payload = {
    type: nodeForm.type.value,
    eyebrow: nodeForm.eyebrow.value.trim(),
    title: nodeForm.title.value.trim(),
    body: nodeForm.body.value,
    images: editingImages.slice(),
    video: nodeForm.video.value.trim(),
  };
  if (editingId) {
    const f = findNode(editingId);
    if (f) {
      delete f.node.image; // 清掉旧的单图字段
      Object.assign(f.node, payload);
    }
  } else {
    const newNode = { id: uid(), ...payload, children: [] };
    if (addingParentId) {
      const f = findNode(addingParentId);
      if (f) f.node.children.push(newNode);
    } else {
      data.nodes.push(newNode);
    }
  }
  const ok = await save();
  renderTree();
  if (ok) closeModals();
});

/* ---------- 站点标题 + 背景弹窗 ---------- */
const siteForm = document.getElementById("site-form");

function updateBgFields() {
  const type = siteForm.bgType.value;
  siteForm.querySelectorAll("[data-bg]").forEach((el) => {
    el.style.display = el.dataset.bg === type ? "" : "none";
  });
}
function renderBgPreview(src) {
  const box = document.getElementById("bg-preview");
  box.innerHTML = src ? `<img src="${esc(src)}" alt="背景预览" />` : "";
}

document.getElementById("btn-site").addEventListener("click", () => {
  siteForm.title.value = data.site.title || "";
  siteForm.subtitle.value = data.site.subtitle || "";
  const bg = data.site.background || {};
  siteForm.bgType.value = bg.type || "default";
  siteForm.bgColor.value = bg.color || "#0d0f14";
  siteForm.bgImage.value = bg.image || "";
  siteForm.bgDim.value = bg.dim != null ? bg.dim : 0.55;
  siteForm.bgSize.value = bg.size || "cover";
  siteForm.bgPosX.value = bg.posX != null ? bg.posX : 50;
  siteForm.bgPosY.value = bg.posY != null ? bg.posY : 50;
  renderBgPreview(bg.image || "");
  updateBgFields();
  document.getElementById("site-modal").classList.add("open");
});

siteForm.querySelectorAll('input[name="bgType"]').forEach((r) =>
  r.addEventListener("change", updateBgFields)
);

document.getElementById("bg-file").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  flash("正在处理背景图…");
  // 背景图目标体积放宽到 600KB，保证清晰度
  const dataUrl = await compressImage(file, 600 * 1024);
  if (!dataUrl) {
    const el = document.getElementById("status");
    el.style.color = "var(--red)";
    el.textContent = "⚠ 这张图无法读取（多为 iPhone HEIC 格式），请先转成 JPG/PNG 再上传。";
    setTimeout(() => { el.style.color = ""; el.textContent = ""; }, 8000);
    e.target.value = "";
    return;
  }
  siteForm.bgImage.value = dataUrl;
  renderBgPreview(dataUrl);
  flash("背景图已添加");
  e.target.value = "";
});

siteForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  data.site.title = siteForm.title.value.trim();
  data.site.subtitle = siteForm.subtitle.value.trim();
  data.site.background = {
    type: siteForm.bgType.value,
    color: siteForm.bgColor.value,
    image: siteForm.bgImage.value,
    dim: parseFloat(siteForm.bgDim.value),
    size: siteForm.bgSize.value,
    posX: parseInt(siteForm.bgPosX.value, 10),
    posY: parseInt(siteForm.bgPosY.value, 10),
  };
  if (await save()) closeModals();
});

/* ---------- 工具栏 ---------- */
document.getElementById("btn-add-root").addEventListener("click", () => openNodeModal(null, null));
document.getElementById("btn-collapse").addEventListener("click", () => { collapsed = !collapsed; renderTree(); });

document.getElementById("btn-export").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "content.json";
  a.click();
  URL.revokeObjectURL(a.href);
  flash("已导出 content.json，替换站点里的同名文件即可发布");
});

document.getElementById("btn-import").addEventListener("click", () => document.getElementById("import-file").click());
document.getElementById("import-file").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      data = JSON.parse(reader.result);
      normalize();
      save();
      renderTree();
      flash("已导入");
    } catch (err) { alert("导入失败：文件不是有效的 JSON"); }
  };
  reader.readAsText(file);
  e.target.value = "";
});

document.getElementById("btn-clear").addEventListener("click", () => document.getElementById("clear-modal").classList.add("open"));
document.getElementById("btn-clear-confirm").addEventListener("click", () => {
  data = { site: data.site, nodes: [] };
  save();
  renderTree();
  closeModals();
});

/* ---------- 弹窗关闭 ---------- */
function closeModals() {
  document.querySelectorAll(".modal").forEach((m) => m.classList.remove("open"));
}
document.querySelectorAll("[data-close]").forEach((el) => el.addEventListener("click", closeModals));
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModals(); });

/* ---------- 密码门 ---------- */
const auth = document.getElementById("auth");
const editor = document.getElementById("editor");

function unlock() {
  auth.classList.add("hidden");
  auth.style.display = "none";
  editor.style.display = "";
  loadData().then(renderTree);
}

if (sessionStorage.getItem(AUTH_KEY) === "ok") {
  unlock();
}
document.getElementById("auth-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const val = document.getElementById("auth-input").value;
  if (val === EDIT_PASSWORD) {
    sessionStorage.setItem(AUTH_KEY, "ok");
    unlock();
  } else {
    document.getElementById("auth-error").textContent = "密码不对，再试一次";
  }
});
