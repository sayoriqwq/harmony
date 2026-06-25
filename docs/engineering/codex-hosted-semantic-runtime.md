# V1.1 Codex-hosted Semantic Runtime

本文档记录下一阶段方向：暂缓自建完整 Semantic Workbench，先用 Codex app 承担交互壳、线程、审批、diff、artifact、浏览器和自动化；Harmony headless core 继续承担语义真相。

对应 PRD：GitHub issue `#11`。

## 核心判断

Codex app 适合成为 V1.1 的宿主层：

- 对话与澄清界面由 Codex Thread 承担。
- 文件、Git diff、artifact 和报告预览由 Codex app 承担。
- 并行线程和自动化由 Codex app 承担。
- Semantic Plugin 打包 hooks、skills 和 MCP server。
- Headless core 继续负责 Package、Environment、Case、Correction、Patch、Regression 和 append-only ledger。

目标不是把 Harmony 变成 Codex Memory 或普通 skill prompt，而是把 Codex app 用作可 dogfood 的交互外壳。

## 目标架构

```text
Codex App
├── Threads / clarification UI
├── File, Git diff, artifact preview
├── Browser and automation host
└── Semantic Plugin
    ├── Hooks
    │   ├── UserPromptSubmit semantic gate
    │   └── PreToolUse action gate
    ├── Skills
    │   ├── semantic-session
    │   ├── vocabulary-authoring
    │   ├── semantic-lint
    │   └── semantic-patch-review
    └── MCP Server
        └── headless-runtime
            ├── semantic-model
            ├── Package / Environment
            ├── Case / Correction / Patch
            ├── Regression
            └── SQLite append-only ledger
```

## Prompt Gate

`UserPromptSubmit` hook 是语义入口。它位于 Prompt 被发送给模型前，适合执行严格或半严格的语义预检。

目标流程：

```text
user prompt
-> UserPromptSubmit hook
-> headless-runtime.analyzePrompt
-> pass / clarify / reject
-> Codex model receives prompt only after gate passes
```

通过时，hook 注入精简语义上下文，而不是替换原文：

```text
semantic_case: case-184
environment:
  base: personal-base@0.3.0
  domains:
    - refund@1.2.0
request:
  action: validate
  target: document
  prohibited_actions:
    - rewrite
unresolved: []
```

下游模型看到的是原始 Prompt、结构化语义、Package 版本和 Case ID 的组合。原始 Prompt 仍作为 Evidence Source 保留。

## Action Gate

`PreToolUse` hook 是执行前门禁。它检查模型准备执行的工具调用是否仍符合当前 Semantic Case。

必须检查：

- 当前 turn 是否有有效 Semantic Case。
- 是否仍有未解决 clarification。
- 写操作是否违反 `prohibited_actions`。

例子：语义结果是 `validate` 且 `do not rewrite`，但模型准备调用 `apply_patch`，则 action gate 应拒绝工具调用并返回可解释原因。

这形成两道防线：

- Prompt Gate：含义不清时不继续。
- Action Gate：含义已确认后不偏离。

## MCP Facade

MCP 工具数量先保持克制，暴露最高可用语义 seam。

查询与分析：

- `semantic_status`
- `semantic_analyze`
- `semantic_lint_document`
- `semantic_get_case`
- `semantic_get_patch`

状态变更：

- `semantic_toggle_domain`
- `semantic_import_vocabulary`
- `semantic_apply_correction`
- `semantic_run_regression`
- `semantic_publish_patch`

审批策略：

- 自动允许：`status`、`analyze`、`get_case`、`get_patch`、`lint`。
- 需要明确审批：`toggle_domain`、`apply_correction`、`import_vocabulary`、`run_regression`。
- 必须二次确认：`publish_patch`。

## Domain Activation

Domain Package 不能是全局布尔值。Codex 支持并行项目和线程，因此 activation scope 应分层：

- Base Layer：用户级，始终启用。
- Domain Activation：默认 thread/session 级。
- Project Default Domain：用户明确设置后才持久化为项目默认。

运行键：

```text
user/base
cwd/project
session_id/thread
```

用户可以通过对话触发：

- 打开 refund 领域包。
- 关闭当前领域包。
- 把 product-review 设置为这个项目的默认领域。

Codex 负责对话，MCP 工具负责状态变更，headless core 负责合法性和持久记录。

## Correction Flow

Correction 交互先用对话代替自建 Drawer。

流程：

1. 定位被纠正的 Semantic Case。
2. 把自然语言纠正转成 typed CaseSemanticEdit。
3. 调用 `semantic_apply_correction`。
4. 展示修正前后的 semantic diff。
5. 询问修正范围：仅当前 Case、基础层补丁候选、当前领域包补丁候选。

Codex 只负责与用户对话并协助生成 edit。真正应用什么 edit、是否合法、能否晋升，仍由 headless core 决定。

## Trace Artifacts

Codex app 可以直接预览 Markdown、JSON、diff 和报告 artifact。

建议投影：

```text
.semantic/
├── vocabularies/
├── cases/
├── patches/
└── reports/
```

示例 artifact：

- `case-184.semantic.md`
- `case-184.semantic.json`
- `regression-27.report.md`

边界必须保持清楚：

- Git 文件是人类可审查的 authoring / projection。
- Append-only Ledger 是运行时权威记录。

不能因为 Codex 改了 YAML、Markdown 或 JSON 文件，就绕过 core 直接视为已发布 PackageVersion。

## 可查看能力阶段

第一阶段：Codex 对话视图。

每次分析返回稳定格式：

```text
Semantic Case: case-184
Environment
- Base: personal-base@0.3.0
- Domain: refund@1.2.0
Interpretation
- Action: validate
- Target: refund policy
- Prohibited: rewrite
Decision
- clarify
Reason
- "优化"可能表示提出建议，也可能表示直接修改
Evidence
- "不要修改原文"
```

第二阶段：Semantic Trace artifact。

为每个 Case 生成 Markdown、JSON 和 regression report，交给 Codex app 预览和审查。

第三阶段：只读 HTML Trace Viewer。

当 Markdown 不够直观时，再补一个只读本地页面展示原文 span 高亮、概念绑定、竞争解释、Package 来源、Correction diff 和 Patch impact。

网页只负责查看；修改仍通过对话和 MCP 完成。

## Persistence

Codex app 不能替代 Case Ledger。

V1.1 实际运行需要：

- `InMemoryLedgerStore`：测试。
- `SqliteLedgerStore`：Codex plugin 运行。

插件 Hook 应使用插件提供的可写数据目录，例如 `PLUGIN_DATA`，不能把可变数据库写入插件安装目录。

必须保存：

- Package Source / Version。
- Session Environment。
- 原始 Prompt。
- Semantic IR。
- Clarification。
- Correction。
- Patch Candidate。
- Regression Result。
- Publish Event。

## Codex Memory 边界

Codex Memory 可以帮助恢复近期工作上下文，但不能成为 Base Semantic Layer。

Base Semantic Layer 必须由 Harmony 自己版本化、持久化和回归验证。否则核心语义会退化成不可预测的生成摘要。

## Workbench 替换关系

| 原计划自建 | Codex-hosted V1.1 |
| --- | --- |
| Prompt Composer | Codex Thread |
| Prompt 语义入口 | UserPromptSubmit Hook |
| 执行权限门禁 | PreToolUse Hook |
| Application API | MCP Server |
| Domain Toggle UI | 对话 + MCP Tool |
| Semantic Trace Pane | Markdown / artifact |
| Correction Drawer | 对话 + typed correction tool |
| Patch Review Page | Codex diff/review |
| Regression Dashboard | report artifact |
| 调度系统 | Codex Automations |
| 自定义线程和历史 | Codex threads + Case Ledger |
| 完整 React Workbench | 暂缓 |

## 推进顺序

1. 加入 SQLite append-only ledger。
2. 为 headless-runtime 增加稳定 MCP facade。
3. 制作 Codex plugin：MCP + skills + hooks。
4. 实现 UserPromptSubmit semantic gate。
5. 实现 PreToolUse action gate。
6. 实现 session 级 Domain Activation。
7. 输出 Markdown Semantic Trace。
8. 跑真实 Case，积累 correction ledger。
9. 只有对话和 Markdown 明显不够用时，再添加只读 HTML Trace Viewer。

## Strict Gate 与 Dogfood Gate

如果要求 Prompt 必须在 Codex 模型看到之前完成 AI 语义解析，hook 调用的 headless runtime 必须拥有独立 Model Provider，或足够强的确定性解析器。

早期推荐：

- 确定性规则 + hook 严格拦截明显冲突。
- Codex 首先调用 MCP 完成其余解析。

稳定后：

- Hook 内部调用独立 Semantic Model Provider。
- 形成严格前置语义编译。
