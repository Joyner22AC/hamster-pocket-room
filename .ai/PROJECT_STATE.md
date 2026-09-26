# Project State

## Current Objective

维护一个可通过公开链接游玩的静态仓鼠养成小游戏。当前首要目标不是继续堆玩法，而是把角色本体和动作质量做到可信、可爱、像仓鼠；任何新功能都必须让位于 Character Art / Motion Gate。

## Active Task

V7 `Character Reboot` 已进入成品发布阶段。当前 `job.toml` 为 `2026-09-26-v7-character-reboot`。

用户明确反馈 V6 美术仍然“很惊悚”，并要求先解决角色模型。因此 V7 不继续修补 V5 的可见分件 rig，也不继续依赖 V6 的 20 帧整图角色，而是启用项目已有 CC0 `hamchan-cc0.glb`：真实 skinned 3D hamster mesh，1 skin / 41 joints；运行时使用 Three.js `AnimationMixer` 和程序化骨骼 clips。

## Current Status

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
- V7 发布后固定试玩地址：`https://joyner22ac.github.io/hamster-pocket-room/v7-hamster-alive.html`。
- OpenAI Sites 配置 `.openai/hosting.json` 继续保留，不作为本轮 V7 发布路径。

## Important Paths

- 正式入口：`dist/index.html`、`dist/app.js`、`dist/style.css`、`dist/engine.js`。
- V4 对照：`dist/v4-finished.*`、`dist/v4-assets/`。
- V5 对照：`dist/v5-living-hamster.*`、`dist/v5-assets/`。
- V6 对照：`dist/v6-hamster-reborn.*`、`dist/v6-assets/`。
- V7 当前：`dist/v7-hamster-alive.html`、`.css`、`.js`。
- V7 角色模型：`dist/v2-assets-real/hamchan-cc0.glb`。
- V7 研究：`research/V7角色模型与动画参考拆解.md`。
- QA：`scripts/check.mjs`、`tests/engine.test.mjs`。
- 协作配置：`project.toml`、`production-team.toml`、`job.toml`、`executors/*.toml`、`agents/*.toml`。

## Known Boundaries

- 同一 ChatGPT-AgentDock 执行器承担了本轮实现与 QA，因此客观自动化、浏览器验证和截图检查均已完成，但最终审美判断仍应由用户直接试玩决定。
- V7 使用现有 CC0 模型，不宣称是最终商业级角色资产；如果用户仍觉得模型造型不够可爱，下一轮应替换/重制底模本身，而不是再回到 V5/V6 的贴片或整图动画路线。
- 不删除 V2–V6；它们保留为技术和视觉历史对照。

## Next Actions

1. 完成本轮 V7 commit / push，并等待 GitHub Pages workflow 成功。
2. 实测线上 `v7-hamster-alive.html` 返回 200。
3. 让用户直接在手机上试玩 V7，优先验收角色静态模型和 idle，再看 walk/eat/pet/pickup/run。
4. 若 V7 方向得到认可，再讨论是否把 V7 迁为正式首页；在用户明确批准前继续保留旧正式入口。

## Resume From Here

下一位执行器必须按 `AGENTS.md` 完成 AgentDock 健康检查后，读取 `project.toml`、本文件、相关 `DECISIONS.md` / 最近 `SESSION_LOG.md`、Git branch/status/log/diff，再读取 `production-team.toml`、当前 `job.toml` 和 active agents。当前主线是 V7 Character Reboot；不要回退到 V5 visible-parts rig 或 V6 whole-frame hamster art。若继续角色美术，优先从真实底模、比例、姿态、材质和骨骼动画入手。
