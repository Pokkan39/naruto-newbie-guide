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
