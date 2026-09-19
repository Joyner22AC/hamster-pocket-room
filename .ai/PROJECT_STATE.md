# Project State

## Current Objective

维护一个可通过公开链接游玩的静态仓鼠小游戏，并逐步把动作表现提升到参考“豆芝麻海豹”室内 DS 养育作品的细腻度，同时保持原创素材和轻量网页体量。

## Active Task

已完成一次正式 Agent checkpoint。第一、二阶段动作精细化均处于稳定未提交状态，当前本地最新版验证通过；下一项明确工作是由具备 ChatGPT Sites 登录态的环境复用既有 Site 发布当前 `dist/`，随后再做真实浏览器试玩和视觉参数微调。

## Current Status

现有初代版本已完成并曾成功部署为公开 Site。当前仓库位于 `master` 分支；`dist/engine.js`、`dist/app.js`、`tests/engine.test.mjs` 包含第一、二阶段累计未提交业务修改，`AGENTS.md` 与 `.ai/` 仍是未跟踪共享文档。当前累计动作精细化已通过 `npm test`（13/13）、`npm run check` 与 `git diff --check`，部署配置、素材与 research 均未改动。

## Completed

- 静态网页初代玩法：喂食、抚摸、捧起拖动、放置到小屋/滚轮、睡眠、姿态变化、藏粮寻找与哭泣。
- Canvas 游戏界面、响应式布局、键盘/鼠标/触摸指针输入、本地存档和可选声音。
- `dist/assets/` 中原创笼舍、仓鼠精灵图集和滚轮素材。
- `npm run check`、`npm test` 所覆盖的静态引用和核心状态机测试（以最近一次已记录结果为准，下一次开发前应重新运行）。
- 公开 Sites 项目已登记并部署；既有项目配置保存在 `.openai/hosting.json`，后续更新应复用该项目。

## In Progress

- 跨 Codex 与 ChatGPT-AgentDock 的共享接力机制已初始化完成并通过多轮接管核对。
- 第一阶段动作精细化已完成：非持久化 `motion` 已覆盖步态相位、转身缓动、捧起/放下抬升、滚轮缩放混合与轮速控制。
- 第二阶段动作精细化已完成：新增姿态交叉混合、睡眠淡入淡出、进食咀嚼节奏、姿态 settle、搜索嗅闻停顿、藏粮到点埋粮停顿；`motion` 仍未进入存档。
- 尚未做真实浏览器视觉验收；自动化逻辑与静态检查已通过，后续参数微调最好结合实际试玩观感。

## Next Actions

1. 接手 Agent 先重新阅读本文件、`AGENTS.md`、最近相关的 `DECISIONS.md`，并核对 Git 现场与累计未提交 diff。
2. 若继续开发，优先做真实浏览器试玩/视觉验收，再根据观感调动作参数；也可继续增加伸懒腰、洗脸、挠痒、短暂停顿等原创小动作。
3. 保持 `motion` 为运行时状态，不加入 `saveSnapshot`；新增行为继续补状态边界测试。
4. 每轮修改后运行 `npm run check`、`npm test` 与 `git diff --check`。
5. 业务改动达到可运行阶段后，再按用户要求复用现有公开 Site 发布；未经用户明确要求不 push。

## Blockers / Questions

- 当前业务代码没有阻塞；本地最新版已通过自动验证。
- 线上重新发布仍待执行：ChatGPT Sites 官方目前没有独立 CLI 管理/部署入口，当前 AgentDock 环境也没有已登录的 Sites 管理工具，因此最后的 Save/Deploy/Publish 必须在 ChatGPT 网页或桌面端的 Sites/Work/Codex 界面完成，并复用 `.openai/hosting.json` 中现有 `project_id`。
- 原版“豆芝麻海豹”的具体逐帧时序资料仍有限；可采用公开官方画面确认造型与交互方向，动作时间参数需明确标记为项目设计值。

## Working Tree

- 分支：`master`。
- 本轮业务修改：`dist/engine.js`、`dist/app.js`、`tests/engine.test.mjs`，均未提交。
- 未跟踪共享文档：`AGENTS.md`、`.ai/`。
- `.local/`：本地部署/打包产物，属于自动生成结果，默认可删除或重建，不纳入 Git。
- `.openai/hosting.json`、`dist/assets/`、`research/` 本轮未修改。

## Validation

- 已执行：`git status --short --branch`，结果为 `master` 上 3 个业务文件修改 + `AGENTS.md`、`.ai/` 未跟踪。
- 已审查：累计 `git diff` 仅涉及动作状态机、渲染和测试；`.openai/hosting.json`、`dist/assets/`、`research/` 无业务 diff。
- 已执行：`npm run check`（JavaScript 语法与 7 个静态文件通过，初始载荷 1.22 MB）。
- 已执行：`npm test`（13 项测试全部通过）。
- 已执行：`git diff --check`，无空白错误；仅有 Git 对 Windows CRLF 转换的常规提示。
- 第一阶段测试覆盖：滚轮先靠近→加速→减速→走出；行走转身缓动；捧起/放下抬升缓动。
- 第二阶段测试覆盖：姿态短混合且 `motion` 不持久化；睡眠淡入/醒来淡出；藏粮到点埋粮停顿；搜索到记忆点嗅闻暂停再继续。
- `motion` 未进入 `saveSnapshot`，旧存档恢复后会重新初始化运行时动画状态。

## Important Paths

- 游戏入口与界面：`dist/index.html`、`dist/app.js`、`dist/style.css`。
- 状态机：`dist/engine.js`。
- 测试：`tests/engine.test.mjs`、`scripts/check.mjs`。
- 美术与调研：`dist/assets/`、`research/`。
- 部署配置：`.openai/hosting.json`。
- 接力文档：`AGENTS.md`、`.ai/PROJECT_STATE.md`、`.ai/DECISIONS.md`、`.ai/SESSION_LOG.md`。

## Do Not Touch

- 不删除或覆盖 `research/references/` 和用户提供的原始素材。
- 不修改 `.openai/hosting.json` 的既有 `project_id`，除非用户明确要求迁移 Site。
- 不把凭据、Token 或自动生成部署档案写进共享文档或 Git。
- 不为交接强行提交、push、reset 或清理未完成业务改动。

## Resume From Here

下一位 Agent 从仓库根目录开始：读取 `AGENTS.md` 和本文件，检查 `git status` 与累计未提交 diff；保留 `dist/engine.js`、`dist/app.js`、`tests/engine.test.mjs` 中第一、二阶段动作精细化修改。当前自动验证为 `npm test` 13/13、`npm run check` 通过、`git diff --check` 通过。若继续开发，优先实际浏览器试玩并按观感调参，或增加新的原创小动作；继续保持 `motion` 非持久化。完成后重新运行验证并回写本文件和 SESSION_LOG。
