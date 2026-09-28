# Project State

## Current Objective

维护一个可通过公开链接游玩的静态仓鼠养成小游戏。当前首要目标不是继续堆玩法，而是把角色本体和动作质量做到可信、可爱、像仓鼠；任何新功能都必须让位于 Character Art / Motion Gate。

## Active Task

V8 `Natural Hamster` 本地候选已完成，当前 `job.toml` 为 `2026-09-28-v8-natural-hamster`。本轮不扩玩法，只继续精修 V7 真实 3D 仓鼠底模：进一步降低重心、加宽躯干、改为更侧向 3/4 视角，降低眼睛/毛发塑料高光，并把 idle / walk / run 的前爪运动改为贴近胸前的小幅动物化动作，减少直立人偶感。

## Current Status

- V8 独立入口：`dist/v8-hamster-natural.html`；代码/样式：`dist/v8-hamster-natural.js`、`dist/v8-hamster-natural.css`。
- V8 继续使用同一 CC0 41-joint skinned hamster，但角色比例由 V7 的 `1.12×0.88×1.06` 进一步调整为约 `1.16×0.82×1.08`，并把朝向从约 `-0.92 rad` 改为 `-1.02 rad`，降低直立感。
- V8 眼睛改为深棕哑光，眼材质 roughness 提高；毛发表面 roughness 提高并略降曝光，减少塑料玩偶感。
- V8 `breath/sniff/walk/run` 重做前爪轨迹：idle 前爪收在胸前，walk/run 仅小幅错相，不再使用人类式大摆臂；髋部/胸背增加轻微前倾和更低重心。
- V8 独立存档 key：`hamster-pocket-room-v8-candidate-v1`；V7 与正式入口均保持零 diff。
- V7 独立入口：`dist/v7-hamster-alive.html`。
- V7 代码/样式：`dist/v7-hamster-alive.js`、`dist/v7-hamster-alive.css`。
- 主角色：`dist/v2-assets-real/hamchan-cc0.glb`，来源和 CC0 许可见 `dist/v2-assets-real/CREDITS.txt`。
- 角色渲染改为平滑纹理过滤、各向异性过滤、ACES tone mapping、暖主光 + 冷补光；不再使用 V2 的 NearestFilter 像素化呈现。
- 角色比例做了横向加宽/纵向压低，并采用更侧向的 3/4 视角，减少直立人偶感；毛色改为暖金棕/奶油色。
- V7 继续复用 V4 暖阳木质房间 raster 背景和木质滚轮；正式 `dist/index.html` / `dist/app.js` / `dist/engine.js` 不改。
- V7 独立存档 key：`hamster-pocket-room-v7-candidate-v1`。
- 已实现骨骼动作：`breath / sniff / look / groom / walk / eat / pet / pickup / drop / run / sleep`。
- 已实现直接交互：角色上横向滑动触发 nuzzle；长按约 0.34 秒再拖动进入 pickup，松手 drop；点地面行走；按钮保留 feed / pet / wheel / sleep / shape / stash。
- 四种 idle：`breath / sniff / look / groom`。
- 参考拆解与 V7 Motion Bible：`research/V7角色模型与动画参考拆解.md`。

## Validation

2026-09-28 当前 ChatGPT-AgentDock 会话接管复核：

- AgentDock 0.8.3 / Windows amd64 真实调用成功；专用 `AgentDock-Test` 目录只读检查、`mcp-smoke.txt` 写入与读回均成功。
- Git 现场：`master`，HEAD / `origin/master` 均为 `a129ac0`；未提交内容只包含既有 V8 候选、相关 QA 配置与共享状态修改，没有发现额外来源不明改动。
- 重新核对 V8→V7 diff、V8 研究说明、当前 job / production team / active roles；正式 `index/app/engine/hosting` 与 V7 三文件相对 HEAD 均为零 diff。
- 本会话重新运行 `npm run check`：63 个静态文件通过，Repository payload 约 6.85 MB；`npm test`：13/13；`git diff --check`：通过；17 个 TOML 全部可解析。
- 复核 `.local/v8-smoke/art-gate.png`，截图文件与桌面/手机 QA 产物均存在；本会话未重新执行浏览器交互烟测，因此下方原 V8 浏览器验收记录仍作为最近一次真实交互验证。
- 本会话未修改 V8 运行时代码，未 commit / push / publish / reset / clean / delete。

2026-09-28 V8 本地真实浏览器验收：

- Chrome Headless + CDP，桌面 1280×900：`modelReady=true`、`bones=41`、`errors=[]`。
- direct pet：水平 stroke 后 `lastGesture=nuzzle` 且 pet count 增加；长按约 390ms + drag 进入 `mode=carried`，release 后退出 carried。
- feed 进入 `eating`；wheel approach 后进入 `running` 并增加 run count；四 idle `breath/sniff/look/groom` 均可实际选择。
- 桌面和 390×844 手机均观测约 60 FPS，最低观测 60 FPS；390px 下 `scrollWidth=bodyScrollWidth=390`，scene 约 358×201，6 个按钮均完整位于视口。
- V8 静态 Art Gate 截图：`.local/v8-smoke/art-gate.png`；桌面/手机交互截图：`.local/v8-smoke/desktop.png` / `mobile.png`，均不入 Git。
- `npm run check`：JavaScript syntax + 63 个静态文件通过，Repository payload 约 6.85 MB。
- `npm test`：13/13 通过；`git diff --check` 通过；17 个 TOML 均可解析。
- 正式 `dist/index.html` / `dist/app.js` / `dist/engine.js` / `.openai/hosting.json` 与 V7 `dist/v7-hamster-alive.*` 均零 diff。

2026-09-26 V7 本地真实浏览器验收：

- Chrome Headless + CDP，桌面 1280×900：模型加载成功，`bones=41`，运行时错误 `[]`。
- 直接横向抚摸：`lastGesture=nuzzle`，pet count 增加，进入 `pet` clip。
- 长按 + drag：进入 `mode=carried` / `pickup` clip；release 后退出 carried / `drop` clip。
- feed：进入 `eating`，feed count 增加，`eat` clip。
- wheel：先由 engine 靠近滚轮，再进入 `running`，run count 增加，`run` clip。
- 四种 idle `breath/sniff/look/groom` 均可实际选择。
- 桌面观测 FPS 约 57–61，最低观测约 55 FPS。
- 390×844 移动端：`documentElement.scrollWidth=body.scrollWidth=390`，scene 约 358×201，6 个按钮全部在视口内；模型成功加载，41 bones，约 60–61 FPS，无运行时错误。
- 静态 Art Gate 截图：`.local/v7-smoke/art-gate.png`；桌面/手机交互截图：`.local/v7-smoke/desktop.png` / `mobile.png`。`.local/` 不进入 Git。
- `node --check dist/v7-hamster-alive.js` 通过。
- `npm run check`：JavaScript syntax + 58 个静态文件通过，Repository payload 约 6.80 MB。
- `npm test`：13/13 通过。
- `git diff --check` 通过。

## Git / Deployment

- 仓库：`https://github.com/Joyner22AC/hamster-pocket-room`，当前为 Public。
- 分支：`master`。
- GitHub Pages 由 `.github/workflows/pages.yml` 自动部署 `dist/`。
- 总入口：`https://joyner22ac.github.io/hamster-pocket-room/`。
- V7 已发布，固定试玩地址：`https://joyner22ac.github.io/hamster-pocket-room/v7-hamster-alive.html`，实测 HTTP 200。
- V7 发布提交：`3ed9ebe190505604f58c4219a907e9fadf1b3ca2`；对应 GitHub Pages workflow `36233159323` 已 `completed/success`。
- OpenAI Sites 配置 `.openai/hosting.json` 继续保留，不作为本轮 V7 发布路径。

## Important Paths

- 正式入口：`dist/index.html`、`dist/app.js`、`dist/style.css`、`dist/engine.js`。
- V4 对照：`dist/v4-finished.*`、`dist/v4-assets/`。
- V5 对照：`dist/v5-living-hamster.*`、`dist/v5-assets/`。
- V6 对照：`dist/v6-hamster-reborn.*`、`dist/v6-assets/`。
- V7 当前：`dist/v7-hamster-alive.html`、`.css`、`.js`。
- V8 当前：`dist/v8-hamster-natural.html`、`.css`、`.js`。
- V7 角色模型：`dist/v2-assets-real/hamchan-cc0.glb`。
- V7 研究：`research/V7角色模型与动画参考拆解.md`。
- V8 研究：`research/V8角色自然化精修.md`。
- QA：`scripts/check.mjs`、`tests/engine.test.mjs`。
- 协作配置：`project.toml`、`production-team.toml`、`job.toml`、`executors/*.toml`、`agents/*.toml`。

## Known Boundaries

- 同一 ChatGPT-AgentDock 执行器承担了 V8 实现与 QA，因此客观自动化、浏览器验证和截图检查均已完成，但最终审美判断仍应由用户直接试玩决定。
- V7 使用现有 CC0 模型，不宣称是最终商业级角色资产；如果用户仍觉得模型造型不够可爱，下一轮应替换/重制底模本身，而不是再回到 V5/V6 的贴片或整图动画路线。
- 不删除 V2–V6；它们保留为技术和视觉历史对照。
- V8 本轮没有 commit / push / publish 授权；当前修改只保留在本地工作树，不改变已发布 GitHub Pages。

## Next Actions

1. V8 已完成本地候选与 QA；等待用户是否明确授权 commit/push/publish，以便手机端通过 GitHub Pages 试玩。
2. 若 V8 仍未达到角色审美目标，下一步直接替换/重制底模，而不是继续只调材质或整体比例。
3. 在用户明确批准前继续保留 V7 已发布页面和旧正式首页不变。

## Resume From Here

下一位执行器必须按 `AGENTS.md` 完成 AgentDock 健康检查后，读取 `project.toml`、本文件、相关 `DECISIONS.md` / 最近 `SESSION_LOG.md`、Git branch/status/log/diff，再读取 `production-team.toml`、当前 `job.toml` 和 active agents。当前主线是 V8 Natural Hamster；本地 V8 已通过客观 QA，但尚未 commit/push/publish。不要覆盖 V8 未提交工作，也不要回退到 V5 visible-parts rig 或 V6 whole-frame hamster art。
