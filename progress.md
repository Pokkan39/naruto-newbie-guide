## 2025-07-10 - Task: 仿参考站搭建「火影忍者入坑教学」可编辑静态站点

### What was done
- 参照参考站 hooxi.metishon.co/wiki 的形态，从零实现了一个纯静态站点（未复制其代码/素材）：目录树 + 卡片结构，卡片支持文字/图片/视频三种类型。
- 展示页（index.html）：火影橙黑主题、侧边目录导航、滚动高亮，视频支持 B站BV号/B站链接/YouTube/通用iframe 自动嵌入。
- 编辑页（edit.html）：密码门进入，可视化目录树增删改、上移下移、加子项；节点弹窗按类型填写并实时预览；本地图片上传转 base64；工具栏含新增章节、站点标题、导出/导入 JSON、折叠、清空（二次确认）；改动自动存 localStorage。
- 用用户提供的入坑教学文案预填 content.json（3 章：开局与创新号、新手流程、充值推荐；共 11 张卡片）。
- 自绘忍者头带 logo.svg（无版权素材）。
- 编写 README.txt（傻瓜版）与 docs/使用与发布说明.md。

### Testing
- 本地起 python http.server，curl 验证 7 个文件均返回 200。
- node 校验 content.json 结构合法（章=3 卡片=11，children 齐全）。
- 单元测试 toEmbedUrl：BV号、含BV链接、YouTube短链、iframe代码、空值 均解析正确。
- vm.compileFunction 语法检查 app.js、editor.js 均通过。
- 未做真实浏览器渲染验证：本机无 Chrome、无 jsdom，未额外安装依赖。这是当前验证缺口，DOM 交互（弹窗、上传预览的视觉效果）建议用户在浏览器手动确认一次。

### Notes
改动文件清单（全部为新建，未改动仓库外任何文件）：
- index.html：展示页骨架。
- edit.html：编辑页骨架（密码门 + 工具栏 + 三个弹窗）。
- content.json：初始内容数据（火影入坑教学文案）。
- assets/style.css：全站火影主题样式 + 响应式。
- assets/app.js：展示页渲染逻辑、视频解析、公共函数（esc/toEmbedUrl），编辑页也复用。
- assets/editor.js：编辑页全部交互逻辑，顶部 EDIT_PASSWORD 为可改密码（默认 naruto）。
- assets/logo.svg：自绘站点图标。
- README.txt：小白使用/发布/改密码说明。
- docs/使用与发布说明.md：完整文档。

回滚方式：直接删除整个 `C:\Users\Rage\Desktop\naruto-wiki` 文件夹即可，无任何外部副作用（未装依赖、未改系统配置、未初始化 git）。

## 2025-07-10 - Task: 设置编辑密码为114514并发布到GitHub Pages

### What was done
- 将编辑密码改为 114514（assets/editor.js 顶部 EDIT_PASSWORD），并同步更新 README.txt、docs 文档中的密码说明。
- 初始化本地 git 仓库并首次提交全部站点文件。
- 用系统已存的 GitHub 凭据（账户 Pokkan39）通过 API 创建公开仓库 naruto-newbie-guide，推送 main 分支。
- 开启 GitHub Pages，站点公开上线。

### Testing
- 线上站点 https://pokkan39.github.io/naruto-newbie-guide/ 及 edit.html、content.json、三个 assets 脚本样式均返回 HTTP 200。
- 线上 editor.js 确认 EDIT_PASSWORD = "114514" 已生效。
- 首页 HTTP 200 上线确认（Pages 构建完成）。

### Notes
改动/新增文件：
- assets/editor.js：密码改为 114514。
- README.txt、docs/使用与发布说明.md：同步密码说明。
- 新增 .git 仓库并推送至 github.com/Pokkan39/naruto-newbie-guide。

发布信息：
- 仓库：https://github.com/Pokkan39/naruto-newbie-guide （公开）
- 网址：https://pokkan39.github.io/naruto-newbie-guide/
- 编辑页：https://pokkan39.github.io/naruto-newbie-guide/edit.html （密码 114514）

回滚方式：
- 撤下线上站点：删除 GitHub 仓库，或在仓库 Settings→Pages 关闭 Pages。
- 本地回滚：删除 Desktop\naruto-wiki 文件夹（含 .git）。
- 改密码：编辑 assets/editor.js 第一行后重新 git push。

## 2025-07-10 - Task: 修复多图保存失灵、完善点击放大、新增背景编辑，并整理远程仓库

### What was done
- 修复"图片到第三张点保存无反应"：根因是图片 base64 存入 localStorage（约5MB上限）超限且未捕获异常。改为上传时用 canvas 自动压缩（限最长边 1280、转 JPEG），并给 save() 加超限兜底提示，保存失败时弹窗不关闭以便用户导出。
- 完善"点击图片放大"：重写灯箱，支持同一卡片多图左右切换、张数计数、键盘方向键与 Esc。
- 新增"背景编辑"：站点设置弹窗新增背景选项——默认/纯色/背景图，背景图可上传（自动压缩到1920）并可调变暗遮罩程度，保证文字可读。
- 整理远程仓库：用户通过网页上传时误建了嵌套 naruto-wiki/ 重复文件夹、且把根目录退回旧版。核对确认无独有数据丢失后，以本地最新版为准合并（-X ours），删除嵌套文件夹并推送。

### Testing
- node vm.compileFunction 校验 app.js、editor.js 语法均通过。
- 模拟 applyBackground 三种模式（默认/纯色/背景图）输出正确。
- 起本地 http.server，curl 确认 index/edit 返回200，且新功能关键词（applyBackground/lightbox-nav/compressImage/bgType 等）均已部署。
- 推送后线上验证：https://pokkan39.github.io/naruto-newbie-guide/assets/app.js 含 applyBackground（最新版已生效）；嵌套 /naruto-wiki/ 路径返回404（已清除）。
- 未做真实浏览器点击验证：本机无 Chrome，未安装依赖；灯箱切换、上传压缩、背景实时效果建议用户实机确认。

### Notes
改动文件：
- assets/editor.js：save() 兜底、compressImage() 压缩、多图上传改用压缩、站点弹窗新增背景逻辑。
- assets/app.js：applyBackground() 应用背景、重写多图灯箱。
- assets/style.css：灯箱导航/计数样式、body.bg-image 背景样式。
- edit.html：站点设置弹窗新增背景表单（类型/颜色/图片/变暗）。
- 删除远程 naruto-wiki/ 嵌套重复文件夹。

回滚方式：git revert 4d7dd6d（及之前 33d9be1）可回退本轮改动；本地删 Desktop\naruto-wiki 文件夹。

## 2025-07-10 - Task: 隔离线上内容与本地草稿并升级展示页视觉

### What was done
- 普通访问统一读取线上 content.json，只有编辑页使用带 `?draft=1` 的预览入口时才读取当前浏览器的 IndexedDB 草稿，避免访客看到各自旧草稿。
- 展示页升级为原创橙黑忍者主题，加入首屏引导、章节与卡片统计、章节编号、修行路线、玻璃卡片、查克拉光效和手机端横向目录。
- 加入滚入动画、阅读进度、返回顶部、图片灯箱过渡，并为减少动态效果的系统偏好提供兼容。

### Testing
- Node 语法检查通过：assets/app.js 与 assets/editor.js 均可编译。
- content.json 解析通过，确认标题正确，内容为 8 章、30 张卡片、25 张图片，文件约 11.0MB。
- 本地 HTTP 服务验证 index.html、edit.html、content.json、style.css、app.js、editor.js 均返回 HTTP 200。
- 检查确认普通模式 fetch 线上 content.json，`?draft=1` 模式才调用 IndexedDB 草稿；错误文件名 `content .json` 已清除。
- git diff --check 通过；仅有仓库现有行尾转换提示，无补丁空白错误。
- 尚未完成线上 GitHub Pages 的真实浏览器渲染确认；需推送并等待 Pages 部署后复核。

### Notes
改动文件：
- index.html：新增展示页首屏、统计、阅读进度、草稿标识和返回顶部结构。
- edit.html：预览入口改为 `index.html?draft=1`，确保编辑预览读取本地草稿。
- assets/app.js：隔离公开/草稿数据源，并加入统计、章节编号、滚入动画、阅读进度和返回顶部交互。
- assets/style.css：新增展示页原创忍者主题、互动动画、响应式布局及减少动态效果兼容。
- progress.md：追加本轮实施和验证记录。

回滚方式：推送前可用 `git restore index.html edit.html assets/app.js assets/style.css progress.md` 撤销本轮未提交改动；提交后使用 `git revert <本轮提交哈希>` 创建回滚提交。

## 2025-07-10 - Task: 发布并验收 GitHub Pages

### What was done
- 将展示页升级、数据源隔离和完整内容发布到 GitHub main 分支，首个发布提交为 `26ea3a5`。
- GitHub Pages 已完成更新，公开首页和编辑页均已加载新版结构。

### Testing
- `git push origin main` 成功，远程 `origin/main` 与本地 HEAD 均指向 `26ea3a54cc4006d6f4cf31123bcb68104b31ce90`。
- 线上首页、编辑页和 content.json 均返回 HTTP 200。
- 线上 app.js 已包含 `setupPageInteractions` 和 `draftMode`，证明新版交互和公开/草稿数据源隔离已部署。
- 线上首页已确认包含 Hero、阅读进度条和返回顶部结构；线上编辑页已确认预览链接为 `index.html?draft=1`。
- 完整 content.json 已在提交 `0700745` 纳入 main，发布前本地解析确认 8 章、30 卡片、25 图片、约 11MB；线上 content.json HTTP 200。

### Notes
改动文件：
- progress.md：追加 GitHub Pages 发布和线上验收证据。

回滚方式：使用 `git revert 26ea3a5` 回滚展示页与数据源隔离；如需连同完整内容一起回退，再对 `0700745` 创建 revert 提交并推送。
