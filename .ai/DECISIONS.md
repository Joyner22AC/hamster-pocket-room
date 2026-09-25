# Decisions

## 2026-09-17 — 采用磁盘优先的双 Agent 接力机制

- 决策：以代码、Git、`AGENTS.md` 和 `.ai/` 共享文档作为跨 Codex 与 ChatGPT-AgentDock 的事实源；每次接手先核对现场，阶段结束同步状态。
- 背景：两个 Agent 会交替工作，任一方都不能依赖另一方的聊天记录或私有记忆。
- 原因：磁盘上的状态可被双方直接读取，Git diff 能区分有效开发与临时产物，分层文档分别承载长期规则、当前状态、重要决策和历史记录。
- 替代方案：只依赖提交信息或聊天摘要；未采用，因为提交可能滞后，聊天摘要无法保证另一 Agent 可见。
- 重新评估条件：若更换协作平台或仓库结构，应重新检查文档入口、凭据管理和状态同步方式。

## 2026-09-17 — 保持静态网页与既有 Site

- 决策：后续功能继续在 `dist/` 静态入口中实现，复用 `.openai/hosting.json` 的既有 Sites 项目。
- 背景：用户希望朋友通过链接直接游玩；初代已经采用无后端静态架构。
- 原因：部署简单、体量小、无需账号和服务器状态，符合当前小游戏范围。
- 替代方案：引入后端存档或重建新 Site；未采用，因为会扩大范围并破坏现有链接连续性。
- 重新评估条件：需要跨设备同步、多人联机或服务端数据时再评估。

## 2026-09-19 — V2 采用源码 + esbuild 候选 bundle

- 决策：V2 继续维护可读源码 `dist/v2-real-preview.js`，通过 `npm run build:v2` 使用 `esbuild@0.25.10` 生成 `dist/v2-game.bundle.js`，候选 HTML 直接加载 bundle。
- 背景：Three.js 0.186 的模块链 raw 体积较大，候选页未 bundle 时仅 JavaScript 就约 2.3 MB；同时项目需要 Codex 与 AgentDock 在不同电脑上可复现构建。
- 原因：bundle 后 V2 JavaScript 约 664 KB，候选 raw 静态资源约 2.46 MB；`esbuild` 只存在于 devDependencies，不进入网页运行时，仍保持静态站点架构。
- 替代方案：继续直接加载 vendor Three.js 模块链；未采用，因为首屏请求和 raw 体积更大。仅提交手工 bundle 但不提供构建链；未采用，因为跨 Agent/跨电脑不可复现。
- 约束：任何修改 `v2-real-preview.js` 后都必须重新运行 `npm run build:v2`；正式切换 `index` 前必须重新 build/test/check。
- 重新评估条件：若未来引入更完整的前端构建系统或框架，可把该脚本并入统一 build pipeline。

## 2026-09-22 — AgentDock 会话必须先做隔离健康检查

- 决策：所有 ChatGPT-AgentDock 新会话在接触正式项目之前，先调用真实的 server_info 等价只读能力，再检查 `%USERPROFILE%\Documents\AgentDock-Test`；预计写入时还必须在该目录写入并读回 `mcp-smoke.txt` 的 `smoke test`。
- 背景：工具列表可见并不等于当前 connector/MCP binding 可调用，失效绑定不应被误判为项目访问能力。
- 原因：固定隔离目录能验证连接和读写链路，又不会污染业务代码、数据或 Git；有限重试规则能避免在失效会话中反复消耗时间或扩大影响范围。
- 替代方案：直接在仓库内创建测试文件，或仅依据工具 discovery/schema 判定可用；未采用，因为前者污染正式项目，后者无法证明真实调用成功。
- 重新评估条件：AgentDock 提供稳定、可验证且权限边界更清晰的标准 health-check API 时，可把等价只读服务信息能力替换为该 API，但仍需保留隔离目录和写入读回验证。

## 2026-09-22 — 采用三层 TOML 协作配置

- 决策：在既有 `AGENTS.md` + `.ai/` 状态机制上增加三层 TOML：`project.toml` 保存稳定项目配置与安全默认值，`agents/*.toml` 保存明确的 Agent 角色边界，`job.toml` 保存当前单次任务目标与临时约束。
- 初始化顺序：`AGENTS.md` → `project.toml` → `.ai` 状态文件 → Git 现场 → 真实项目结构；执行具体任务前再读取 `job.toml` 与当前 Agent 对应的角色配置。
- 角色边界：Codex 为大范围代码实现/重构的主要 owner；ChatGPT-AgentDock 为 AgentDock 健康检查、项目接管、磁盘/Git 核对、研究/验证、共享状态维护与范围明确的小步集成 owner。两者共享验证和交接职责，但不定义万能 Agent。
- 安全默认：`auto_commit=false`、`auto_push=false`、`auto_reset=false`、`auto_clean=false`；未经授权不得删除文件、覆盖其他 Agent 未提交修改、修改 Git 历史或发布/外发项目内容。
- 动态状态边界：`project.toml` 不保存进度；完成度、当前状态和历史继续记录在 `.ai/PROJECT_STATE.md` / `.ai/SESSION_LOG.md`。`job.toml` 可在下一次单次任务开始时替换。
- 原因：把“长期稳定配置”“角色职责”“当前任务”拆开，避免共享状态和角色规则互相污染，并让完全看不到聊天记录的下一位 Agent 能从磁盘恢复工作边界。
- 重新评估条件：若未来 Codex/AgentDock 原生支持可执行的项目级多 Agent 配置 schema，可在保持三层职责分离的前提下迁移字段格式。

## 2026-09-22 — 将“执行器”与“游戏制作专业角色”分离

- 决策：`executors/*.toml` 只描述 Codex 与 ChatGPT-AgentDock 的实际执行能力；`agents/*.toml` 改为游戏制作专业角色，包括 Art Director、Visual Researcher、Game Designer、Technical Artist、Gameplay Engineer、Animation & Interaction、UI/UX、QA & Performance。`job.toml` 每次同时选择 executor 与 active professional roles。
- 背景：第一版 TOML 虽解决了 Codex/AgentDock 不互相踩修改的问题，但仍把“哪个模型来操作”误当成“项目需要什么专业能力”，无法约束美术驱动游戏的研究、美术、技术美术、交互与独立验收流程。
- 制作门禁：稳定管线按 research → art-direction → visual-prototype → gameplay-spec → implementation → animation-and-ui → qa-and-performance → release-review 推进；视觉方向和小型原型未通过前不得直接进行大规模视觉迁移。
- 职责原则：Art Director 拥有视觉方向和视觉验收；Visual Researcher 提供事实/推断分层证据；Game Designer 拥有玩法规格；Technical Artist 桥接画面与网页性能；Gameplay Engineer 承担稳定实现；Animation/Interaction 与 UI/UX 分别拥有动作手感和产品界面；QA 独立验证，不得通过降低验收标准使实现自证通过。
- 执行原则：同一 executor 可承担多个专业角色，但角色边界不能因此合并；实现者同时承担 QA/验收时应优先交叉复核，无法复核必须在 SESSION_LOG 记录自审限制。
- 原因：上一轮 V2 证明“技术可行”不等于“视觉可接受”；新的角色体系要求先定义美术目标和小原型，再投入工程实现，降低技术路线先行造成的返工。
- 重新评估条件：角色过多导致小任务成本明显高于收益时，由 `job.toml` 只激活必要角色，不删除长期角色定义。

## 2026-09-22 — V3 采用 Soft Pixel Diorama 轻量 2.5D 路线

- 决策：下一代视觉不继续以运行时真实 3D 为主，也不照搬《歧路旅人》式“2D 角色 + 大量运行时 3D 背景”的完整 HD-2D 技术栈；采用内部名为 `Soft Pixel Diorama` 的轻量网页路线：预渲染/手绘 2D 资产 + 固定斜俯视 + 分层深度 + Y-sort 遮挡 + 接触阴影 + 低成本动态光 + 低帧数 sprite 动画。
- 事实依据：任天堂官方对 2009 年 DS《クプ～！！まめゴマ！》明确描述过“3D 空间”互动，2012 年 3DS 作品支持立体 3D；公开画面显示其核心魅力主要来自圆润极简角色、固定视角、玩具箱式场景和明亮低细节配色。Octopath Traveler II 官方开发访谈则说明其背景几乎全部为 3D，并使用动态光照和 3D 摄像机，因此真正 HD-2D 的完整技术栈对当前轻量网页并不经济。
- 技术边界：正式 V3 原型不加载 Three.js / GLB，优先复用现有 `engine.js` 和 Canvas 结构；新增运行时框架必须证明不可替代收益，默认目标是 0 KB 新框架。
- 体量门禁：首屏传输目标 `≤1.5 MB`，硬上限 `≤2.0 MB`；V3 核心视觉资源目标 `≤3.0 MB`；单个 sprite atlas 目标 `≤400 KB`；额外衣服、家具、季节主题和音频懒加载。
- 视觉门禁：第一原型只做一个 480×270 房间切片和一只原创仓鼠，先验证角色可爱度、前中后层次、遮挡、接触阴影、暖光与移动端表现；Art Director 未通过前不得迁移正式入口或扩大资产生产。
- 研究记录：`research/视觉V3轻量网页路线研究.md`。
- 重新评估条件：若小型原型无法在 2 MB 首屏硬上限内达到目标视觉，或 Canvas 2D 无法稳定实现必要的遮挡/光影/移动端帧率，再评估更轻 WebGL 方案；不得直接回退到当前 V2 真实 3D。

## 2026-09-25 — V4 以暖阳木质玩具屋替代 V3 旧笼舍构图

- 决策：继续保留 V3 的 Canvas 2D、分层、遮挡、接触阴影、轻量动态光与 0 KB 新框架技术路线，但 V4 不再复用“蓝色宠物笼 + 暖色 overlay”作为主场景；场景主美术改为暖阳木质室内玩具屋，并加入更高生活化陈设密度、独立前景景深层、木质滚轮与成品化养成 HUD。
- 背景：V3 技术门禁与体量通过，但视觉层仍然明显继承旧笼舍构图；当前 `job.toml` 与 `research/视觉V4暖阳像素玩具屋风格拆解.md` 已把用户认可方向明确为“家”的室内小世界，而不是“笼子”。
- 技术边界：V4 继续使用 480×270 Canvas 逻辑画布、原创 raster 资产、现有原创 hamster atlas；不引入 Three.js、GLB 或新运行时框架，不修改正式入口，也不接正式存档。
- 交互边界：第一轮 V4 preview 只验证视觉与基础生命感，包含点地面移动、喂食、互动、清理、拍照、跑轮、睡觉；动作使用 prepare → perform → settle 的轻量节奏，但不改变正式 `engine.js` 玩法规则。
- 体量结果：第一轮 V4 首屏 7 个静态文件实测约 `0.621 MB`，低于 `1.5 MB` 目标和 `2.0 MB` 硬上限，因此无需为了体量退回 V3 构图或引入更复杂渲染技术。
- 验收边界：技术通过不等于视觉通过。V4 只有在用户实际试玩并认可暖阳木质玩具屋方向后，才进入第二轮 sprite/景深/光影精修；第二轮视觉通过后才允许 Gameplay Engineer / Codex 接正式状态机。
- 重新评估条件：若用户仍不认可 V4 的整体视觉气质，应优先调整美术方向与素材，不以继续增加功能、框架或真实 3D 复杂度代替视觉问题。

## 2026-09-25 — V4 成品候选直接复用正式状态机并隔离候选存档

- 决策：`dist/v4-finished.html` / `.css` / `.js` 作为 V4 成品候选；表现层直接导入现有 `dist/engine.js` 的 `HamsterGame`、`restoreState`、`saveSnapshot`、`POSES`、`ZONES`，不复制或分叉正式核心玩法逻辑。
- 背景：用户明确要求直接推进到 V4 成品再验收。第一轮 V4 preview 已证明视觉路线和轻量体量可行，但自身只是一套展示型交互，不能继续作为“成品玩法”基础。
- 玩法边界：V4 成品候选暴露既有喂食、抚摸、跑轮、睡眠、姿态、藏粮/寻找、捧起拖放等正式玩法；清理、拍照和 V4 清洁度属于表现层附加状态，不改变 `engine.js` 的既有核心数值规则。
- 存档边界：候选使用独立 key `hamster-pocket-room-v4-candidate-v1`，内部保存 `saveSnapshot(state)` 与 V4 meta；在用户最终批准迁移前不读写正式版 `SAVE_KEY`，避免试玩候选污染线上/正式进度。
- 迁移边界：用户最终视觉/产品验收通过后，正式迁移应优先替换表现层与入口，并继续复用同一 `engine.js`；届时再明确决定是否一次性导入正式旧存档，而不是在候选阶段自动合并存档。
- 重新评估条件：只有核心玩法规则本身需要变更时，才由 Gameplay Engineer/Codex 修改 `engine.js` 并补对应状态机测试；纯 V4 视觉/UI 迭代不得借机分叉玩法实现。

## 2026-09-25 — 角色动作突破采用职业制作组 + 独立 Motion Gate

- 决策：新增根目录 `production-team.toml`，并新增 Character Artist、Character Animator、Technical Animator、VFX & Camera Designer 四个专业角色；角色动作/交互任务不再只由一个宽泛的 Animation & Interaction 角色覆盖。
- 背景：用户明确指出 V4 成品候选动作仍然“纯纸片人、很生硬”。现有方案即使有 pose blend、bob、粒子和状态切换，角色本体仍主要是整张 sprite 的刚性变换，问题属于角色资产、动画表演和技术动画管线层级，不是继续加按钮或轻微缓动能解决。
- 制作原则：Art Director 定义动作气质和验收；Character Artist 负责可形变角色资产；Character Animator 负责关键姿态、重心、弧线和次级运动；Technical Animator 负责 rig/deformation/blend；Game Designer 把动作与直接互动绑定；VFX & Camera 只在本体动作成立后做 polish；QA 独立把关。
- 技术假设：第一原型优先 `hybrid-2d-rig`，但必须和 layered sprite rig / mesh warp / frame animation 做小型对照。技术复杂度不是目标；若 Canvas 2D 能达到动作质量，继续保留 Canvas 2D。只有可测量的动作质量收益才允许引入 WebGL 或新依赖。
- 反纸片门禁：主要动作禁止 whole-body bob 作为主动画，禁止无过渡 pose swap；每个主要动作至少要求 anticipation、clear key pose、arc/weight shift、secondary motion、settle。第一阶段至少做 walk、pet-react/pickup-drop、eat、run-wheel 四个独立高质量原型。
- 集成门禁：动作实验室必须由 Art Director + Character Animator + QA 通过，并在 390px 移动端达到最低 30 FPS 后，Gameplay Engineer 才能把新动画系统接回 V4 成品候选；此前 `v4-finished.*` 和正式入口保持稳定对照。
- 重新评估条件：如果 hybrid 2D rig 的角色体积感或表演上限仍不足，则优先切到更高质量 frame animation / mesh warp，而不是继续给旧 atlas 添加整体变换；若体量或移动端性能无法达标，再缩减动画资产范围而不是降低动作原则。

## 2026-09-25 — V5 采用原创分层栅格 Hybrid 2D Rig

- 决策：V5 `Living Hamster` 使用原创 `dist/v5-assets/hamster-rig-parts.webp` 作为角色主资产，运行时将 body / head / ear / paw / foot / cheek / eye / muzzle 八组栅格部件通过 Canvas 2D 分层组合；旧 `hamster-atlas.webp` 不再作为 V5 角色主动画资产。
- 动作原则：步行通过左右重心、对侧前后爪、头部反相和耳朵滞后形成步态；捧起使用压缩→离地→四肢收拢，放下使用脚先接触→body squash→头部滞后→回弹；进食使用看/伸爪/送入口/脸颊交替鼓起/满足 settle；跑轮使用蹲身/上轮/平衡/加速/稳定跑的阶段性动作。
- 直接互动：V5 在角色本体上识别指针手势。快速横向滑动驱动 `nuzzle`，向上手势可驱动 `lift`，慢速向下/轻触驱动 `melt`；长按后再拖才进入 pickup，使“抚摸”和“捧起”不再是同一套点击按钮反馈。
- Idle：正式要求至少四种动态 idle：`breath` / `sniff` / `groom` / `look`，并根据 energy / hunger / mood 调整候选权重；idle 不是单一循环。
- 性能结果：V5 首屏相关文件约 `0.215 MB`；Chrome Headless/CDP 观测桌面最低约 58 FPS、390px 手机模拟约 59–60 FPS，因此当前无需为了动画质量引入 WebGL 或重型运行时框架。
- 门禁结果：walk、pet/pickup-drop、eat、run-wheel 的 Motion Gate 与直接手势、四 idle、持久化、390px 布局均已通过客观浏览器验证。正式入口仍不迁移，等待用户对动作观感和角色美术做最终验收。
- 重新评估条件：若用户仍认为 V5 体积感或动作细腻度不足，应优先提高关键动作的 frame/mesh deformation 质量或改进角色部件美术，不回退 V4 whole-sprite bob/pose-swap；只有在 Canvas 2D 明确成为画质瓶颈时才重新评估 WebGL。

## 2026-09-25 — V6 先过静态仓鼠 Art Gate，再用完整角色关键帧动画

- 触发：用户直接指出 V5 角色“像仓鼠吗，诡异得要死”。复核后确认 V5 的问题不是状态机，而是 Character Art：可见分件拼装、两个脸颊像独立圆片、耳朵偏大偏高、正面过度对称，导致熊/人偶面具感。
- 决策：V6 停止把 V5 的 body/head/cheek/paw 等实时分件 rig 作为主角色方案。静态角色必须先通过 Art Gate，要求小圆耳、黑豆眼、短鼻吻、细胡须、短前爪、低重心、连续头身轮廓；静态站着不像仓鼠则禁止进入动画。
- 动画路线：使用原创 `dist/v6-assets/hamster-v6-frames.webp`，5×4 共 20 个完整角色 authored key poses；walk/eat/run/pickup/drop/pet/idle 都通过完整角色帧之间 cross-fade 和 timing 构成。每个关键帧自身必须保持同一只仓鼠的完整轮廓，避免暴露分件接缝。
- 玩法保留：继续保留直接手势抚摸、长按捧起/落地、动态 idle、分阶段进食/跑轮和既有 `engine.js` 状态机；V6 使用独立 candidate localStorage。
- 技术结果：Canvas 2D 足以保持约 60 FPS，390px 手机模拟无横向溢出，当前没有理由为了角色质量切换 WebGL。若用户仍不认可，优先重画/增加完整关键帧或加入轻量 mesh deformation，而不是回到 V5 可见分件拼装。
- 迁移边界：正式入口继续不动，直到用户先认可 V6 静态角色“像仓鼠”，再认可动作自然度。
