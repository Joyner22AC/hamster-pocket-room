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

磁盘代码、Git 状态和 `.ai/` 文档是事实源，聊天记忆只能作为线索。协作配置分为“执行器 + 专业角色 + 制作组 + 单次工单”：根目录 `project.toml` 保存稳定项目配置和制作管线；`executors/*.toml` 定义 Codex、ChatGPT-AgentDock 等实际执行能力；`agents/*.toml` 定义 Art Director、Character Artist、Character Animator、Technical Animator、Gameplay Engineer 等游戏制作专业职责；`production-team.toml` 在角色动画/交互等复杂制作任务中定义跨专业工序、stage gate 与审批边界；根目录 `job.toml` 选择本次启用的执行器、专业角色、分工和临时约束。动态进度只进入 `.ai/PROJECT_STATE.md` 与 `.ai/SESSION_LOG.md`，不得写入 `project.toml`。

执行器不等于专业角色。同一个执行器可在一个 job 中承担多个专业角色，但必须分别遵守对应角色的责任边界，不能因为“同一个模型在做”就合并审批标准；若实现者同时承担 QA 或验收角色，应优先让另一个可用执行器进行交叉复核，无法交叉复核时必须在 SESSION_LOG 记录自审限制。

每次开始实质开发前，固定按以下顺序初始化：先读取本文件，再读取 `project.toml`，随后读取 `.ai/PROJECT_STATE.md`、相关 `.ai/DECISIONS.md` 和最近 `.ai/SESSION_LOG.md`，再检查 Git branch/status/log/diff，最后根据真实磁盘结构核对状态。随后读取 `job.toml`、本次选中的 `executors/*.toml` 和所有 active `agents/*.toml`；若 `job.toml` 指向 `production-team.toml`，或任务涉及角色动作、交互手感、技术动画、角色美工突破，则还必须读取 `production-team.toml` 并遵守其中 stage gate。发现文档与实际不一致时，以磁盘和 Git 为准并先修正状态文档。准备暂停或交接时，先做合理验证，再更新状态、决策和会话记录；不要为了交接强行提交半成品。

### 标准口令：接管当前项目

当用户说 `接管当前项目`、`继续当前项目`，或明确要求从另一个 Agent 接手时，当前 Agent 在进行任何实质修改前必须：

1. 确认项目根目录并阅读 `AGENTS.md`。
2. 阅读根目录 `project.toml`，确认模块索引、稳定路径、Agent 列表与安全默认值。
3. 阅读 `.ai/PROJECT_STATE.md`；必要时读取 `.ai/DECISIONS.md` 中与当前任务相关的内容，以及 `.ai/SESSION_LOG.md` 最近的相关记录。
4. 检查当前 Git branch、`git status`、最近提交和相关未提交 diff。
5. 对照真实代码、数据、运行结果和 Git 状态验证 `PROJECT_STATE.md` 与 `project.toml` 中声明的稳定路径是否准确。
6. 读取当前 `job.toml`、本次选中的 `executors/*.toml` 与所有 active `agents/*.toml`；若当前 job 引用 `production-team.toml` 或属于角色动作/交互/技术动画突破任务，再读取 `production-team.toml`，明确实际执行者、专业职责、跨角色 stage gate、审批边界、允许动作和禁止动作。
7. 如果共享状态已经落后，以真实磁盘和 Git 状态为准，先修正共享状态，再继续开发。
8. 不得擅自回滚、清理、覆盖另一个 Agent 留下的未提交修改；来源不明的修改先结合 diff、PROJECT_STATE、DECISIONS 和 SESSION_LOG 判断用途。
9. 明确当前 Active Task、Next Actions 与 `Resume From Here` 后，再开始工作。

### 标准口令：做一下 Agent checkpoint

当用户说 `做一下 Agent checkpoint`、`Agent checkpoint`、`做个 checkpoint`、`准备交接` 或 `准备切换 Agent` 时，当前 Agent 必须停止扩展新的功能或任务，进入状态同步与交接模式。除必要验证或修复本轮刚产生的明显错误外，不再扩大任务范围。

Checkpoint 必须完成：

1. 确认当前 Git branch，并检查 `git status`。
2. 检查本轮实际 diff 和未跟踪文件。
3. 将未提交内容尽可能区分为：有效开发修改、未完成的有效修改、临时实验、自动生成产物、可安全删除的临时内容、尚不能确定用途的内容。
4. 执行当前阶段合理且成本适中的测试、检查或实验；本项目在可运行阶段至少执行 `npm run check` 和 `npm test`，除非当前状态明确不适合运行，并在状态文件中说明原因。
5. 根据真实磁盘状态更新 `.ai/PROJECT_STATE.md`，至少确保 Current Objective、Active Task、Current Status、Completed、In Progress、Next Actions、Blockers / Questions、Working Tree、Validation、Important Paths、Do Not Touch、Resume From Here 与实际一致。
6. 若本轮产生新的重要技术决策，更新 `.ai/DECISIONS.md`。
7. 在 `.ai/SESSION_LOG.md` 追加本次工作记录，明确实际执行器身份为 `Codex` 或 `ChatGPT-AgentDock`，并列出本轮 active professional roles。
8. 若同一执行器同时承担实现与 QA/验收角色，记录是否完成交叉复核；未完成时写明自审限制。
9. 再次核对共享文档是否与当前代码、Git 和实际输出一致。

`Agent checkpoint` 不等于 Git commit。除非用户明确要求，否则 checkpoint 阶段不得擅自执行 `git commit`、`git push`、`git reset --hard`、`git clean`、丢弃未提交修改、删除未知来源文件或回滚另一个 Agent 的工作。若当前状态适合提交，可以向用户说明，但不得为了交接强行提交半成品。

只有当一个完全不了解当前聊天记录的 Agent，可以仅依靠当前代码、Git 状态、`AGENTS.md`、`.ai/PROJECT_STATE.md`、`.ai/DECISIONS.md` 与 `.ai/SESSION_LOG.md` 准确判断“当前做到哪里、下一步做什么、哪些内容不能碰”时，才算完成 checkpoint。

## AgentDock 连接与健康检查

AgentDock 是项目工作链路的一部分，但能看到工具名称、schema 或工具列表不代表连接实际可用。所有 ChatGPT-AgentDock 会话在读取或修改正式项目之前，必须先完成以下检查。

### 固定健康检查目录

统一使用 `%USERPROFILE%\Documents\AgentDock-Test` 作为 AgentDock 专用健康检查目录。目录不存在时可首次创建。该目录只用于连接、读写和 smoke test，不保存正式项目文件，也不得把测试文件放到真实项目、源码、数据或其他无关目录。

默认测试文件为 `%USERPROFILE%\Documents\AgentDock-Test\mcp-smoke.txt`。

### 每个新会话的检查顺序

1. 先调用 AgentDock 的 `server_info` 或等价只读服务信息能力，确认后端真正响应；工具发现、tools/list 或 schema 加载不算成功调用。
2. 对健康检查目录执行一次只读检查，只检查 `%USERPROFILE%\Documents\AgentDock-Test`，不借此扫描其他用户目录或项目。
3. 如果本轮预计需要修改文件，在 `mcp-smoke.txt` 写入一行 `smoke test`，随后立即通过 AgentDock 读回并确认内容完全一致。只有读回成功才认为写入链路可用；明确只读任务可以省略这一步。

以下能力分别判断并记录：工具是否能发现、工具是否能真实调用、只读访问是否成功，以及需要写入时写入后是否能真实读回。

### 异常与重配置处理

遇到 `Resource not found`、`Connector not found`、工具发现后实际调用失败、MCP session/connector binding 异常或类似失效错误时，最多允许重新发现或刷新 AgentDock 工具一次，并对同一个最小健康检查操作重试一次。第二次仍失败时必须停止使用 AgentDock，不得继续修改真实项目、反复写文件或因为工具名称仍存在而假设连接正常；应向用户报告当前会话的 AgentDock connector/MCP tool binding 不可用，并建议新建 ChatGPT 会话、重新启用 AgentDock、重新执行健康检查后再接管项目。

如果 AgentDock 服务或 MCP 服务重启、公网地址或 Cloudflare Tunnel 重建、插件重新安装/配置，或 tool schema/服务版本明显变化，不得默认当前绑定仍有效，必须重新执行健康检查；发现资源绑定异常时优先开启新 ChatGPT 会话。

### 安全边界

健康检查优先使用只读能力，smoke test 只允许发生在专用目录。不因健康检查修改业务代码、Git 或部署状态，不 commit、push、reset、clean，也不删除项目文件或扫描无关个人目录。
