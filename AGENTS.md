# AGENTS.md

## 项目目标与边界

本项目是可直接通过链接访问的静态网页仓鼠养成小游戏。玩法围绕室内笼舍、照顾、捧起拖动、滚轮、睡眠、姿态变化和藏粮展开。美术方向参考“豆芝麻海豹”室内 DS 养育作品的圆润角色、简洁立体场景和明亮配色，但所有项目素材必须保持原创。

## 目录职责

- `dist/`：可部署的静态站点源码与资源；当前 Site 的静态入口。
- `dist/assets/`：游戏使用的图片资源。
- `tests/`：Node 原生模拟测试。
- `scripts/`：本地开发服务器和静态检查脚本。
- `research/`：原版调研、来源和美术方向记录。
- `.openai/hosting.json`：Sites 静态部署配置及既有项目 ID。
- `.ai/`：跨 Agent 的状态、决策和会话记录，不承载业务运行时数据。
- `.local/`：本地部署、打包和实验产物；除非明确需要，不纳入 Git。

## 环境与编码规范

- Windows PowerShell 环境；Node.js 为默认运行环境，项目无第三方运行依赖。
- 使用 UTF-8 保存文本，界面文案为简体中文。
- 保持静态站点结构；不要引入后端、账号系统或不必要的依赖。
- 图片优先使用原创栅格素材；不要用 HTML/CSS 形状或手写 SVG 代替主要角色、场景和道具美术。
- 状态机逻辑放在 `dist/engine.js`，绘制和输入逻辑放在 `dist/app.js`，避免把持久化状态耦合到 DOM。

## 重要约束

- 不修改、删除或覆盖用户提供的原始资料；研究引用和原始截图保留在 `research/references/`。
- 不把 API Key、Token、密码或本地凭据写入仓库、共享文档或 Git remote。
- 不执行 `git reset --hard`、大范围 clean、覆盖性 checkout 或删除性操作，除非用户明确授权。
- 不擅自回滚其他 Agent 的未提交修改；来源不明的改动先查看 diff、PROJECT_STATE 和 SESSION_LOG。
- 未经用户明确要求不 push；发布 Site 时只复用 `.openai/hosting.json` 中的既有项目。
- 重要架构决策写入 `.ai/DECISIONS.md`，实质性阶段结束时同步 `.ai/PROJECT_STATE.md` 与 `.ai/SESSION_LOG.md`。

## 必须执行的验证

在可运行阶段执行 `npm run check` 和 `npm test`。涉及静态资源时检查入口、引用路径和文件存在性；涉及动作状态机时补充针对状态转换和数值边界的测试。发布前还要确认打包内容与 `dist/` 一致。

## 多 Agent 接力规则

磁盘代码、Git 状态和 `.ai/` 文档是事实源，聊天记忆只能作为线索。每次开始实质开发前先读取本文件、`.ai/PROJECT_STATE.md`，必要时读取最近相关决策，然后检查 `git status`、分支、最近提交和未提交 diff。发现文档与实际不一致时，以磁盘和 Git 为准并先修正状态文档。准备暂停或交接时，先做合理验证，再更新状态、决策和会话记录；不要为了交接强行提交半成品。

### 标准口令：接管当前项目

当用户说 `接管当前项目`、`继续当前项目`，或明确要求从另一个 Agent 接手时，当前 Agent 在进行任何实质修改前必须：

1. 确认项目根目录并阅读 `AGENTS.md`。
2. 阅读 `.ai/PROJECT_STATE.md`；必要时读取 `.ai/DECISIONS.md` 中与当前任务相关的内容，以及 `.ai/SESSION_LOG.md` 最近的相关记录。
3. 检查当前 Git branch、`git status`、最近提交和相关未提交 diff。
4. 对照真实代码、数据、运行结果和 Git 状态验证 `PROJECT_STATE.md` 是否准确。
5. 如果共享状态已经落后，以真实磁盘和 Git 状态为准，先修正共享状态，再继续开发。
6. 不得擅自回滚、清理、覆盖另一个 Agent 留下的未提交修改；来源不明的修改先结合 diff、PROJECT_STATE、DECISIONS 和 SESSION_LOG 判断用途。
7. 明确当前 Active Task、Next Actions 与 `Resume From Here` 后，再开始工作。

### 标准口令：做一下 Agent checkpoint

当用户说 `做一下 Agent checkpoint`、`Agent checkpoint`、`做个 checkpoint`、`准备交接` 或 `准备切换 Agent` 时，当前 Agent 必须停止扩展新的功能或任务，进入状态同步与交接模式。除必要验证或修复本轮刚产生的明显错误外，不再扩大任务范围。

Checkpoint 必须完成：

1. 确认当前 Git branch，并检查 `git status`。
2. 检查本轮实际 diff 和未跟踪文件。
3. 将未提交内容尽可能区分为：有效开发修改、未完成的有效修改、临时实验、自动生成产物、可安全删除的临时内容、尚不能确定用途的内容。
4. 执行当前阶段合理且成本适中的测试、检查或实验；本项目在可运行阶段至少执行 `npm run check` 和 `npm test`，除非当前状态明确不适合运行，并在状态文件中说明原因。
5. 根据真实磁盘状态更新 `.ai/PROJECT_STATE.md`，至少确保 Current Objective、Active Task、Current Status、Completed、In Progress、Next Actions、Blockers / Questions、Working Tree、Validation、Important Paths、Do Not Touch、Resume From Here 与实际一致。
6. 若本轮产生新的重要技术决策，更新 `.ai/DECISIONS.md`。
7. 在 `.ai/SESSION_LOG.md` 追加本次工作记录，并明确当前 Agent 身份为 `Codex` 或 `ChatGPT-AgentDock`。
8. 再次核对共享文档是否与当前代码、Git 和实际输出一致。

`Agent checkpoint` 不等于 Git commit。除非用户明确要求，否则 checkpoint 阶段不得擅自执行 `git commit`、`git push`、`git reset --hard`、`git clean`、丢弃未提交修改、删除未知来源文件或回滚另一个 Agent 的工作。若当前状态适合提交，可以向用户说明，但不得为了交接强行提交半成品。

只有当一个完全不了解当前聊天记录的 Agent，可以仅依靠当前代码、Git 状态、`AGENTS.md`、`.ai/PROJECT_STATE.md`、`.ai/DECISIONS.md` 与 `.ai/SESSION_LOG.md` 准确判断“当前做到哪里、下一步做什么、哪些内容不能碰”时，才算完成 checkpoint。
