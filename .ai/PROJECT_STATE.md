# Project State

## Current Objective

维护一个可通过公开链接游玩的静态仓鼠小游戏，并逐步把动作表现提升到参考“豆芝麻海豹”室内 DS 养育作品的细腻度，同时保持原创素材和轻量网页体量。

## Active Task

V6 `Hamster Reborn` 成品候选已完成，独立入口为 `dist/v6-hamster-reborn.html`，当前 `job.toml` 为 `2026-09-25-v6-hamster-reborn-candidate`。用户明确否定 V5 角色“像仓鼠吗、诡异得要死”，因此 V6 不继续修补 V5 分件 rig，而是先重做静态角色 Art Gate：小圆耳、黑豆眼、短鼻吻、细胡须、小前爪、低重心、连续头身轮廓；再制作 20 个完整角色 authored key poses，通过 cross-fade 与 timing 驱动 walk、pet/pickup-drop、eat、run-wheel、sleep 和四种动态 idle。正式线上入口、V4、V5 均保留为对照，等待用户直接试玩 V6。

## Current Status

现有初代版本仍作为公开 Site 正式入口；V4 与 V5 成品候选继续保留为历史对照。V6 新增 `dist/v6-hamster-reborn.{html,css,js}`、`dist/v6-assets/hamster-v6-frames.webp` 与 `research/V6角色美术基准与关键帧方案.md`。V6 主角色不再由可见 body/head/cheek 等零件拼接，而是 5×4 共 20 个完整角色关键姿态，保证每个关键姿态自身就是完整仓鼠；运行时通过 cross-fade、阶段 timing 和状态机桥接形成动作。V6 继续复用未修改的 `engine.js` 与独立 candidate localStorage。Chrome CDP 端到端验证已通过：桌面/390px 手机均约 60 FPS，运行时错误 0，正式 `dist/index.html` / `dist/app.js` / `dist/engine.js` / `.openai/hosting.json` 零 diff。

## Completed

- 静态网页初代玩法：喂食、抚摸、捧起拖动、放置到小屋/滚轮、睡眠、姿态变化、藏粮寻找与哭泣。
- Canvas 游戏界面、响应式布局、键盘/鼠标/触摸指针输入、本地存档和可选声音。
- `dist/assets/` 中原创笼舍、仓鼠精灵图集和滚轮素材。
- `npm run check`、`npm test` 所覆盖的静态引用和核心状态机测试（以最近一次已记录结果为准，下一次开发前应重新运行）。
- 公开 Sites 项目已登记并部署；既有项目配置保存在 `.openai/hosting.json`，后续更新应复用该项目。

## In Progress

- 跨 Codex 与 ChatGPT-AgentDock 的共享接力机制已初始化完成并通过多轮接管核对。
- 多 Agent 制作体系已升级：`project.toml` 管稳定项目配置和制作管线，`executors/*.toml` 管 Codex / ChatGPT-AgentDock 的执行能力，`agents/*.toml` 管 12 个专业角色，`production-team.toml` 管角色动画/玩法突破的跨工种 stage gate，`job.toml` 管当前任务组合；动态进度仍只写入 `.ai/`。
- AgentDock 隔离健康检查规则已写入 `AGENTS.md`；后续 ChatGPT-AgentDock 新会话必须先验证真实调用，并在需要写入时对专用目录中的 smoke test 做读回确认。
- 第一阶段动作精细化已完成：非持久化 `motion` 已覆盖步态相位、转身缓动、捧起/放下抬升、滚轮缩放混合与轮速控制。
- 第二阶段动作精细化已完成：新增姿态交叉混合、睡眠淡入淡出、进食咀嚼节奏、姿态 settle、搜索嗅闻停顿、藏粮到点埋粮停顿；`motion` 仍未进入存档。
- 视觉系统 V2 原型与真实资产版均已完成技术验证，但最新用户试玩明确认为 3D 风格仍然太丑、与“豆芝麻海豹”视觉效果不一致，并担心网页 3D 体量；因此 V2 仅作为实验/交互参考保留，不再按“直接迁移候选”推进。
- V3 视觉研究完成：官方资料确认豆芝麻海豹系列确实使用过 3D 空间 / 3DS 立体显示，但其可爱感更依赖极简圆润轮廓、固定视角和玩具箱式场景；Octopath 官方访谈确认真正 HD-2D 的背景几乎全是 3D。项目因此选择 `Soft Pixel Diorama`：只借用层次、景深、光影和 2D 角色存在于深度空间的视觉原则，不引入完整运行时 3D 背景。
- 开源资产准备：已把 Kenney Cube Pets 2.0（CC0，24 个 GLB，每个 8 个动画 clip）和 Kenney Furniture Kit 2.0（CC0，140 个 GLB 家具）下载到 `.local/v2-assets/` 并实际检查许可证和文件结构。
- 角色候选：Sketchfab `josephineburns/Hamster` 公开 API 验证为 1276 vertices / 2548 faces / 4 animations / CC BY 4.0 / downloadable；匿名下载接口需要认证，因此未绕过权限。Poly by Google Hamster 仍为轻量底模候选，但 Poly Pizza 下载受到 Cloudflare 保护，未绕过。
- 已新增 `research/视觉V2开源资产选型.md` 记录来源、许可边界、正式 Blender→GLB→Three.js 管线和下一步。

## Next Actions

1. 让用户直接试玩 `http://127.0.0.1:4176/v6-hamster-reborn.html`，第一优先判断“静态站着是不是一眼就是仓鼠”，第二优先再看走路、进食、跑轮、抚摸、捧起/落地的动作是否自然。
2. 若用户认可 V6 角色美术与动作方向，再讨论正式入口迁移；继续复用同一 `engine.js`，旧正式存档是否迁移单独决定。
3. 若用户仍不认可角色造型，必须退回 V6 Character Art Gate 重画完整角色帧，而不是回到 V5 分件 rig，也不能用粒子/镜头/按钮掩盖角色问题。
4. 用户未明确批准前，不替换正式入口、不发布、不 commit/push/reset/clean、不清理 V2/V3/V4/V5/V6 既有未提交工作。

## Blockers / Questions

- 当前没有技术阻塞；V6 已通过客观浏览器 Motion Gate。剩余未决项是用户对“仓鼠识别度、角色美术、动作自然度”的最终主观验收。
- 本轮 Technical Animator 工程实现实际由 ChatGPT-AgentDock 在当前界面完成，因为当前对话没有可直接调用的 Codex 执行器；已按角色 pass 分离规格、实现与 QA，并记录这一自审限制。最终审美仍由用户试玩确认。
- V6 当前采用完整角色 authored key poses + cross-fade；若用户仍认为画面不够自然，下一步应增加/重画关键帧或做轻量 mesh deformation，不回退 V5 可见分件拼装。
- 正式入口与 V4 成品候选继续作为稳定对照，不是当前修改目标。

## Working Tree

- 分支：`master`，HEAD 已推送到 GitHub private 仓库 `Joyner22AC/hamster-pocket-room`；当前远端 `origin/master` 与本地 HEAD 一致。`r`n- V2/V3/V4/V5/V6 当前有效项目内容已纳入 Git；`.local/` 验证产物仍保持忽略，不纳入仓库。`r`n- 协作配置当前有效：`executors/codex.toml`、`executors/chatgpt-agentdock.toml` 定义执行能力；`agents/` 现有 12 个专业角色；`production-team.toml` 定义角色动画/玩法突破制作组与 stage gate；`project.toml` schema_version=2；当前 `job.toml` 为 `2026-09-25-v6-hamster-reborn-candidate`，active roles 仍为 Art Director / Character Artist / Animation & Interaction / Character Animator / Technical Animator / Game Designer / VFX & Camera / Technical Artist / Gameplay Engineer / QA & Performance。
- V4 研究、资产、preview 与 finished 候选均已纳入 Git，继续作为历史/对照工作保留。`r`n- `scripts/check.mjs` 已纳入 V4 preview 与 V4 finished 的 JS/HTML/CSS/资源存在性和 duplicate id 检查；`.local/v4-finished-cdp-smoke.cjs`、`.local/v4-finished-smoke/` 与 Headless Chrome profile 仅为本地验证产物，不纳入 Git。
- `esbuild@0.25.10` 仅为开发依赖；网页运行时仍是纯静态，不依赖 Node/npm。
- 正式 `dist/index.html`、`dist/app.js`、`dist/engine.js` 当前无本轮 diff；`.openai/hosting.json` 未修改。
- `.local/` 中保留浏览器烟测、截图、下载资产和隔离工具，均不纳入 Git。
- 本轮新增规则涉及 `AGENTS.md`、`.ai/PROJECT_STATE.md`、`.ai/DECISIONS.md`、`.ai/SESSION_LOG.md`；它们是有效协作文档修改，不是临时实验。
- 本轮新增 `production-team.toml` 与 `agents/character-artist.toml`、`agents/character-animator.toml`、`agents/technical-animator.toml`、`agents/vfx-camera-designer.toml`；均属于长期制作配置，不是一次性草稿。
- V5 研究、分层角色 atlas 与 candidate 页面均已纳入 Git；`.local/` 生成与验证产物继续忽略。`r`n- V6 研究、20 帧角色 atlas 与 candidate 页面均已纳入 Git；`.local/` 生成与验证产物继续忽略。`r`n
## Validation

- 2026-09-25 V6 Art/Motion Gate：V5 失败点已明确记录为“可见分件、脸颊贴片、耳朵/面部比例与高度对称造成人偶/熊感”。V6 改为完整角色关键帧；`hamster-v6-frames.webp` 为 5×4 / 20 pose atlas，完整帧包含 idle/sniff/groom/look、walk A/passing/B/settle、eat 四阶段、pickup/drop、run 三阶段、sleep、pet nuzzle。
- Chrome Headless + CDP V6 端到端验证：水平 stroke 得到 `lastGesture=nuzzle`；长按 380ms + drag 进入 `mode=carried`，release 后退出；远离角色点地面进入 walking；feed 进入 eating；wheel approach 后进入 running 并增加 run count；sleep/wake 双向切换；`idle/sniff/groom/look` 四种 idle 全部可实际选择。桌面与 390px 手机模拟均约 60 FPS，浏览器 `errors=[]`。
- V6 响应式/持久化：1280×900 桌面 `scrollWidth=clientWidth=1280`；390×844 手机 `documentElement.scrollWidth=body.scrollWidth=390`，Canvas 约 360×203，底部 6 个动作按钮完整落在视口；独立 V6 localStorage 刷新后 feed/pet/run 计数恢复。
- V6 最终回归：17 个 TOML 全部可解析，当前 job 为 `2026-09-25-v6-hamster-reborn-candidate`；`npm run check` 覆盖 50 个静态文件并通过（Repository payload 约 6.67 MB）；`npm test` 13/13；`git diff --check` 通过；V6 首屏相关文件合计 `441,327 bytes`（约 `0.421 MB`）；`http://127.0.0.1:4176/v6-hamster-reborn.html` HTTP 200；正式 `dist/index.html` / `dist/app.js` / `dist/engine.js` / `.openai/hosting.json` 零 diff。
- 2026-09-25 V5 Motion Gate：原创 `hamster-rig-parts.webp` 为 1024×512 RGBA / 81,252 bytes；V5 首屏相关文件合计约 `225,317 bytes`（`0.215 MB`）。角色由 8 组 raster parts 独立变换，不再依赖 whole-sprite bob/pose swap 作为主要动画。
- Chrome Headless + CDP 端到端验证：横向手势抚摸实际得到 `lastGesture=nuzzle` 并增加 pet count；长按 380ms 后拖动进入 `mode=carried`，放下退出 carried；点地面进入 walking；feed 进入分阶段 eating；wheel 成功 approach 后进入 running 并增加 run count；sleep/wake 双向切换；四种 idle `breath/sniff/groom/look` 全部可实际选择和渲染。桌面最低观测约 58 FPS，390px 手机模拟约 59–60 FPS，浏览器 `errors=[]`。
- V5 响应式验证：1280×900 桌面无横向溢出；390×844 手机 `documentElement.scrollWidth=body.scrollWidth=390`，Canvas 约 360×203，底部 6 个核心按钮均完整位于视口。独立 V5 localStorage 刷新后 feed/pet/run 计数可恢复。
- V5 回归：`npm run check` 已扩展到 46 个静态文件并通过；`npm test` 13/13；`git diff --check` 通过；正式 `dist/index.html` / `dist/app.js` / `dist/engine.js` / `.openai/hosting.json` 零 diff。
- 2026-09-25 角色动作制作组配置验证：`project.toml`、`job.toml`、`production-team.toml`、12 个 `agents/*.toml`、2 个 `executors/*.toml` 共 17 个 TOML 全部通过 Python `tomllib`；`project.toml` enabled roles 与 configs 12/12 完全一致；job 的 10 个 active roles 均被 ChatGPT-AgentDock/Codex 分工完整覆盖；production team 的 8 个 stage owner/consult 引用均存在；48 个 `owns` 责任域无重复。`npm run check` 42 个静态文件通过、`npm test` 13/13、`git diff --check` 通过；正式 `dist/index.html` / `dist/app.js` / `dist/engine.js` / `.openai/hosting.json` 零 diff。
- 2026-09-25 V4 成品候选最终验证：`node --check dist/v4-finished.js` 通过；`npm run check` 覆盖 42 个静态文件并通过（Repository payload 约 6.23 MB，V2 candidate 约 2.46 MB）；`npm test` 13/13；`git diff --check` 通过；正式 `dist/index.html` / `dist/app.js` / `dist/engine.js` / `.openai/hosting.json` 零 diff。
- V4 成品首屏体量：`v4-finished.html` + CSS + JS + `engine.js` + 三张 V4 raster + `hamster-atlas.webp` 合计约 `0.648 MB`，低于 `1.5 MB` 目标和 `2.0 MB` 硬上限；运行时新增框架 0 KB。
- Chrome Headless + CDP 成品流程验证：1280×900 桌面 `scrollWidth=clientWidth=1280`；390×844 手机 `documentElement.scrollWidth=body.scrollWidth=390`，Canvas 约 360×203，6 个核心动作按钮均完全位于 390px 视口内；浏览器运行时异常为 0。
- 真实浏览器玩法验证覆盖：喂食计数、抚摸计数、姿态切换、藏瓜子/发现记录、跑轮真实进入 `running` 并增加 run count、睡眠/叫醒标签切换、点地面移动反馈、捧起拖放、移动隐藏瓜子、清理、拍照、设置名字/睡眠时间；刷新后名字、feed/pet/run/photo 计数和睡眠时间均从独立 candidate localStorage 恢复，`saveStatus=已存档`。桌面/移动截图保存在 `.local/v4-finished-smoke/`。
- 浏览器验收过程中曾发现 `v4-finished.js` 把 CSS selector 误传给 `getElementById`，导致设置区初始化抛异常；已改为 `document.querySelector('[data-close]')`，后续完整 CDP 回归通过且 errors=[]。这是本轮唯一实际运行时缺陷，已修复。
- 2026-09-25 ChatGPT-AgentDock 接管并续作 V4：AgentDock 0.8.3 / Windows amd64 健康检查通过；专用 `AgentDock-Test` 目录可读，`mcp-smoke.txt` 内容读回为 `smoke test`。接管时发现 `job.toml` 已切到 V4，且 V4 研究和三张资产存在，但 PROJECT_STATE 仍停在 V3；已先按真实磁盘/Git 修正共享状态，再继续开发。
- V4 静态首屏：`v4-warm-cozy-preview.html` + CSS + JS + `v4-room-bg.webp` + `v4-room-fg.webp` + `v4-wheel-wood.webp` + `hamster-atlas.webp` 合计 `650,736 bytes`（约 `0.621 MB`）。
- Chrome Headless + CDP 真实烟测：1280×900 桌面 `scrollWidth=clientWidth=1280`；390×844 手机 `documentElement.scrollWidth=body.scrollWidth=390`，Canvas 约 360×203，底部 6 个动作按钮均约 55px 宽并完整落在 390px 视口内。`feed/play/clean/photo/wheel/sleep` 六个按钮点击后 `#mode` 状态均发生预期变化。桌面/移动截图保存在 `.local/v4-smoke/`。
- 当前 loopback 试玩服务通过 `.local/v3-preview-server.cjs` 继续只绑定 `127.0.0.1:4176`；独立后续检查 `v4-warm-cozy-preview.html` 返回 HTTP 200 / 2756 bytes。用于烟测的 Headless Chrome 已停止，不保留额外调试浏览器进程。
- 最终回归：`node --check dist/v4-warm-cozy-preview.js` 通过；`npm run check` 覆盖 39 个静态文件并通过（Repository 约 6.20 MB / V2 candidate 约 2.46 MB）；`npm test` 13/13；`git diff --check` 通过；正式 `dist/index.html`、`dist/app.js`、`dist/engine.js`、`.openai/hosting.json` 零 diff。
- 2026-09-24 ChatGPT-AgentDock 接管复核：AgentDock 0.8.3 / Windows amd64 真实调用、专用 `AgentDock-Test` 目录只读检查以及 `mcp-smoke.txt` 写入读回均成功；Git 仍为 `master` / `50e717e77df61c7ed12e99d6416533bf5cde46d6`，正式 `dist/index.html`、`dist/app.js`、`dist/engine.js` 与 `.openai/hosting.json` 零 diff。V3 六个首屏文件实测合计仍为 `1,235,669 bytes`；当前相关 8 个 TOML 均通过 `tomllib`。本轮重新执行 `node --check dist/v3-soft-pixel-preview.js`、`npm test`（13/13）、`npm run check`（33 个静态文件，Repository 约 6.10 MB / V2 candidate 约 2.46 MB）与 `git diff --check`，全部通过。旧 Python / AgentDock 子进程式预览会在命令会话结束后失效；现已用 Windows `Win32_Process.Create` 从系统侧启动 `.local/v3-preview-server.cjs`，稳定监听 `127.0.0.1:4176`，不依赖单次 AgentDock 命令 session。已在独立后续调用中隔时复核，页面持续返回 HTTP 200 / 1606 bytes，监听进程为同一 `node.exe` PID。当前仍停在用户视觉方向验收，不扩功能、不迁移正式入口。
- 2026-09-22 ChatGPT-AgentDock 接管复核：当前分支为 `master`，HEAD 为 `50e717e77df61c7ed12e99d6416533bf5cde46d6`；正式 `dist/index.html`、`dist/app.js`、`dist/engine.js` 零 diff，V2 候选、资产、构建脚本与共享状态仍按 Working Tree 所列保持未提交。
- 已审查：累计 `git diff` 仅涉及动作状态机、渲染和测试；`.openai/hosting.json`、`dist/assets/`、`research/` 无业务 diff。
- 已执行：`npm run check`（JavaScript 语法与 7 个静态文件通过，初始载荷 1.22 MB）。
- 已执行：`npm test`（13 项测试全部通过）。
- 已执行：`git diff --check`，无空白错误；仅有 Git 对 Windows CRLF 转换的常规提示。
- Codex 会话记录显示：Sites 已保存版本 3，来源 commit 为 `50e717e77df61c7ed12e99d6416533bf5cde46d6`，并报告公开部署成功，线上 URL 为 `https://tuan-tuan-hamster-room.joynerjoseph174.chatgpt.site`。
- 接管复核发现 `.local/deployment.json` 仍是旧部署记录（commit `8aa3769...`），未同步版本 3；当前 AgentDock 也没有 Sites 后台读取能力，因此不要把该本地 JSON 当作新版部署证明，后续有 Sites 登录态时应补写/核实。
- 旧版发布后的 checkpoint 曾短暂只有共享状态文件未提交；该描述已不再代表当前工作树。当前真实未提交范围以本文件 `Working Tree` 和本轮 `git status` 为准。
- 第一阶段测试覆盖：滚轮先靠近→加速→减速→走出；行走转身缓动；捧起/放下抬升缓动。
- 第二阶段测试覆盖：姿态短混合且 `motion` 不持久化；睡眠淡入/醒来淡出；藏粮到点埋粮停顿；搜索到记忆点嗅闻暂停再继续。
- `motion` 未进入 `saveSnapshot`，旧存档恢复后会重新初始化运行时动画状态。
- 本轮协作规则变更未创建 AgentDock-Test 文件，未修改 V2 或正式入口业务代码；项目业务验证沿用状态文档中最近一次真实结果。
- V2 原型验证：`node --check dist/v2-prototype.js` 通过；`npm test` 13/13 通过；扩展后的 `npm run check` 覆盖 10 个静态文件并通过，初始载荷 1.24 MB；`git diff --check` 通过；本地 HTTP `v2-prototype.html` 返回 200。
- 浏览器烟测：Chrome Headless + SwiftShader 已分别渲染 Idle / Walk / Eat 截图到 `.local/v2-smoke/`，三种模式均成功出图，确认 WebGL 着色器、网格、正交相机和低分辨率像素化链路可运行。
- 开源资产验证：Kenney Cube Pets `License.txt` 明确为 CC0；24 个 GLB 实测均含 8 个动画 clip（`static/idle/walk/run/eat/dance/gesture-positive/gesture-negative`）。Kenney Furniture Kit `License.txt` 明确为 CC0，实测含 140 个 GLB 家具并同时提供 FBX/OBJ/DAE/STL。
- 角色候选验证：Sketchfab 公开 API 对 `364b9958d9fa463f80b9ba99eb533d5a` 返回 1276 vertices、2548 faces、4 animations、CC BY 4.0、`isDownloadable=true`；匿名下载端返回 401，未绕过认证。
- BOOTH 主角色实测：用户正常下载 `Ham.zip`，SHA-256 为 `B5111AE22DF0D34FB457C9C6C2499EC465B43FF667CA77137A5FB79195B3A488`；Unitypackage 内含 `Ham.fbx`、Prefab、材质和纹理。FBX→GLB 后保留 1 skin / 41 joints / 43 nodes，原包无动画 clip。
- 角色轻量化：2048×2048 贴图版 GLB 约 5.62 MB；512×512 版约 1.82 MB，同构图游戏画面平均绝对像素差约 `0.147/255`，当前实验使用 512 版。
- 仓鼠骨骼动画实测：`v2-animation-lab` 已在仓鼠本体上生成 `idle / walk / run / eat`，由 `AnimationMixer` cross-fade；修正 GLTFLoader 节点名清洗问题后，固定动作中段截图差异覆盖角色区域，`Eat` 可见前爪抬向嘴部。
- 第二轮动作实测：Walk/Run/Eat 新增 `Hips.position` 重心轨并扩大腿部/躯干协同；新增 `sleep / pickup / wheel`。Chrome Headless 固定动作中段截图均成功，Sleep 呈侧躺低姿态，PickUp 悬空并收拢四肢，Wheel 前倾快跑。相对 Idle 的平均像素差分别为 Walk `0.8496`、Eat `1.3821`、Sleep `2.2535`、PickUp `2.0670`、Wheel `1.3159`，差异边界覆盖角色区域而非只覆盖按钮。
- 真实房间流程实测：`v2-real-preview` 已新增食盆、睡垫、放大后的 3D 滚轮和养成动作按钮；Eat/Sleep/Wheel 采用 `walk-action → acting → walk-home → idle`，PickUp 采用 `pickup-rise → pickup-hold → pickup-drop → idle`。本地隔离 Puppeteer 真实点击验证：Eat 进入 `acting/eat` 后成功回到 `idle`；Sleep 进入 `acting/sleep`；Wheel 进入 `acting/wheel`；PickUp 进入 `pickup-hold/pickup`。截图保存在 `.local/v2-flow-real/`。
- 2026-09-22 ChatGPT-AgentDock 最新回归：AgentDock 隔离健康检查通过；`npm run build:v2` 前后 `dist/v2-game.bundle.js` SHA-256 均为 `8151E10ADE673DACE1E130024F9EA9A1A3E69E3C2A660582D6C067987406EB8C`，确认 bundle 与源码一致；`npm test` 13/13；`npm run check` 33 个静态文件通过，V2 candidate 约 2.46 MB；`git diff --check` 通过。正式 `index.html`、`app.js`、`engine.js` 未修改。
- 2026-09-22 初版三层 TOML 曾以 `agents/codex.toml` / `agents/chatgpt-agentdock.toml` 直接表示执行者；该阶段验证当时通过，但其角色模型已被下面的“executors + professional agents”架构取代，旧路径不再是当前配置入口。
- 本轮最终项目回归：`npm test` 13/13、`npm run check` 33 个静态文件通过（Repository 约 6.10 MB，V2 实验候选约 2.46 MB）、`git diff --check` 通过。未 commit、未 push、未 reset、未 clean。
- 2026-09-22 专业角色架构验证：`project.toml`、`job.toml`、2 个 `executors/*.toml` 与 8 个 `agents/*.toml` 共 12 个 TOML 全部通过 Python `tomllib`；执行器和专业角色必填字段完整；八个角色 ID/consults/role_routing/job 引用均有效；32 个 `owns` 责任域无重复；稳定路径存在；安全默认与视觉方向→小原型→Art Director 验收→QA 等制作门禁全部通过。最终语义复核进一步确认：`job.toml` 的 `active_roles` 与本次 active executor 实际承担角色完全一致，`role_assignments` 只包含 active roles，长期八角色由 `configuration_scope` 完整索引，旧 `agents/codex.toml` / `agents/chatgpt-agentdock.toml` 路径已不存在。正式 `dist/index.html`、`dist/app.js`、`dist/engine.js` 零 diff。
- 2026-09-22 V3 路线研究验证：新 `job.toml` 通过 `tomllib`，active roles 为 Visual Researcher / Art Director / Technical Artist / QA；`research/视觉V3轻量网页路线研究.md` 已落盘。本机测得正式版 `dist/assets/` 为 1,224,852 bytes，核心 HTML/CSS/JS 约 55.7 KB；V3 因此设置首屏 `≤1.5 MB` 目标、`≤2.0 MB` 硬上限。`npm test` 13/13、`npm run check` 33 个静态文件通过、`git diff --check` 通过，正式 `dist/index.html` / `dist/app.js` / `dist/engine.js` 零 diff。

## Important Paths

- 游戏入口与界面：`dist/index.html`、`dist/app.js`、`dist/style.css`。
- V4 成品候选：`dist/v4-finished.html`、`dist/v4-finished.css`、`dist/v4-finished.js`；V4 美术层位于 `dist/v4-assets/`。
- V5 成品候选：`dist/v5-living-hamster.html`、`dist/v5-living-hamster.css`、`dist/v5-living-hamster.js`；V5 分层角色 atlas 位于 `dist/v5-assets/hamster-rig-parts.webp`；动作规格位于 `research/V5角色动作与玩法规格.md`。
- V6 成品候选：`dist/v6-hamster-reborn.html`、`dist/v6-hamster-reborn.css`、`dist/v6-hamster-reborn.js`；V6 完整角色关键帧 atlas 位于 `dist/v6-assets/hamster-v6-frames.webp`；美术/关键帧方案位于 `research/V6角色美术基准与关键帧方案.md`。
- 状态机：`dist/engine.js`。
- 测试：`tests/engine.test.mjs`、`scripts/check.mjs`。
- 美术与调研：`dist/assets/`、`research/`。
- 部署配置：`.openai/hosting.json`。
- 协作配置：`project.toml`、`production-team.toml`、`executors/codex.toml`、`executors/chatgpt-agentdock.toml`、`agents/*.toml`、`job.toml`。
- 接力文档：`AGENTS.md`、`.ai/PROJECT_STATE.md`、`.ai/DECISIONS.md`、`.ai/SESSION_LOG.md`。

## Do Not Touch

- 不删除或覆盖 `research/references/` 和用户提供的原始素材。
- 不修改 `.openai/hosting.json` 的既有 `project_id`，除非用户明确要求迁移 Site。
- 不把凭据、Token 或自动生成部署档案写进共享文档或 Git。
- 不为交接强行提交、push、reset 或清理未完成业务改动。

## Resume From Here

下一位执行器从仓库根目录开始，严格按 `AGENTS.md` → `project.toml` → `.ai/PROJECT_STATE.md` / 相关 `DECISIONS.md` / 最近 `SESSION_LOG.md` → Git branch/status/log/diff → 真实磁盘结构初始化，然后读取 `production-team.toml`、当前 `job.toml`、被选中的 `executors/*.toml` 与全部 active `agents/*.toml`。保留全部现有 V2/V3/V4/V5/V6 已提交历史与当前 V6 工作，不要清理或迁移。当前 `job.toml` 为 `2026-09-25-v6-hamster-reborn-candidate`；V6 `dist/v6-hamster-reborn.html` 已通过完整角色 Art/Motion Gate、持久化、桌面/390px 布局、FPS 与完整 CDP 交互验证。当前断点是让用户实际试玩 `http://127.0.0.1:4176/v6-hamster-reborn.html`，先验收“静态角色是否一眼像仓鼠”，再验收动作。用户认可后再讨论正式入口迁移；用户不认可则退回 V6 完整角色关键帧美术，不回到 V5 可见分件拼装。未获明确授权前不要发布、commit、push、reset 或 clean。

