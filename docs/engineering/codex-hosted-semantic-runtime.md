# V1.1 Codex-hosted Semantic Runtime

本文档记录下一阶段方向：暂缓自建完整 Semantic Workbench，先用 Codex app 承担交互壳、线程、审批、diff、artifact、浏览器和自动化；Harmony headless core 继续承担语义真相。

对应 umbrella PRD：GitHub issue `#11`。

## 核心判断

Codex app 适合作为 V1.1 的宿主层，但不能成为语义事实源。

- Codex app 负责对话、澄清、审批、diff、artifact 预览、浏览器和自动化。
- Codex plugin 负责打包 hooks、MCP server 和最小 skill guidance。
- Hook Adapter 与 MCP Adapter 是平级 host adapter。
- Harmony headless core 负责 Package、Environment、Case、Correction、Patch、Regression。
- `SemanticRuntimeFacade` 是唯一语义执行入口。
- Durable Ledger 是唯一 durable source of record。
- 由确定性 replay / reducer 得到的 aggregate 是当前语义状态。
- Codex Memory 只可辅助近期上下文恢复，不能成为 Base Semantic Layer。

V1.1 不做默认外置语义资产层：

- 不使用 `.semantic/`。
- 不使用 `.harmony/memory`。
- 不使用 `.harmony/read-models`。

查询性能先由 Durable Ledger replay / query view 和 Runtime Facade 解决。需要人工审查快照时，后续通过显式 export 生成。

## 官方宿主事实

写入本 PRD 的 Codex 宿主判断只依赖官方 Codex 文档已经声明的能力：

- Plugin 可以打包 skills、MCP servers 和 lifecycle hooks。
- Plugin-bundled hooks 是 non-managed hooks；安装或启用 plugin 不会自动 trust hooks。
- Hook trust 绑定到当前 hook definition hash；hook 变化后会被跳过，直到用户重新 review / trust。
- 多个 matching command hooks 会并发启动；不能依赖同一事件只有一个 writer 或固定执行顺序。
- `UserPromptSubmit` 的 matcher 不生效；配置 matcher 会被忽略。
- `PreToolUse` matcher 支持 Bash、`apply_patch` / `Edit` / `Write` 和 MCP tool names。
- Plugin hook commands 会获得 `PLUGIN_ROOT` 和 `PLUGIN_DATA`。
- Plugin-bundled MCP server 可以由用户配置 enabled / approval policy。

仍需 PRD 1 实测的宿主假设：

- Plugin update / disable / uninstall 后 `PLUGIN_DATA` 是否保留。
- Bundled MCP process 是否能稳定定位同一个 writable data root。
- Hook 与 MCP 是否可能短暂运行不同 plugin version。
- Codex app、CLI、IDE extension 在 payload、cwd、session/turn metadata 上是否完全一致。

## 目标架构

```text
Codex App
├── Threads / clarification UX
├── File, Git diff, artifact preview
├── Browser and automation host
└── Semantic Plugin
    ├── Hooks
    │   ├── UserPromptSubmit semantic guardrail
    │   └── PreToolUse supported-path action guardrail
    ├── MCP Server
    │   └── semantic tools over Runtime Facade
    └── Skills
        └── semantic-runtime guidance only

UserPromptSubmit Hook process ─┐
PreToolUse Hook process ───────┼── RuntimeDataLocator
Codex MCP Server process ──────┘          ↓
                                  SemanticRuntimeFacade
                                           ↓
                                   Durable Ledger
                                           ↓
                                  Headless Runtime Core
```

Hook 和 MCP 不共享同一个内存 Runtime、Effect Layer、Repository 或 Current View。它们可以各自构建临时 runtime/cache，但只能通过同一个 Durable Ledger 观察和改变事实。

Hook 不应通过 MCP 调用 Runtime Facade。MCP 是宿主启动的长生命周期 transport，hook 是一次性 command process；让 hook 反向寻找 MCP 会引入进程发现、启动顺序、超时、重连和潜在死锁问题。

正确链路是：

```text
Hook Adapter ───────┐
                    ├── SemanticRuntimeFacade ─── Durable Ledger
MCP Adapter ────────┘
```

共享的是：

- `RuntimeDataLocator`
- `LedgerStore`
- `SemanticRuntimeFacade` contract
- durable state

不共享：

- process memory
- open Effect Runtime
- current aggregate cache
- MCP transport session

## PRD 1: Codex Host Contract & Runtime Data Locator Spike

正式拆给实现 agents 前，必须先验证 Codex host contract。PRD 1 不是 happy-path 功能探针，而是宿主兼容与失败语义探针。

必须验证：

- plugin install / enable。
- plugin update。
- plugin disable / enable。
- plugin uninstall / reinstall。
- plugin-bundled hooks loading。
- plugin-bundled MCP server loading。
- hook trust / review lifecycle。
- `PLUGIN_DATA` 是否提供给 hook。
- MCP server 是否能定位同一个 durable data root。
- hook 与 MCP 是否可能短暂处于不同 plugin version。
- hook 与 MCP 是否能并发访问同一个 Durable Ledger。
- hook 和 MCP 在进程重启后是否观察到一致 replay。
- 多项目 / 多 worktree 是否得到同一个 plugin data root。
- hook `cwd` 是 repo root、worktree root，还是启动子目录。
- 两个 thread 同时提交 prompt。
- hook 与 MCP 同时写 ledger。
- 两个 `PreToolUse` 同时发生。

不能再问“hook 和 MCP 是否共享 runtime state”。正确问题是：

```text
hook 与 MCP 是否能定位并并发访问同一个 Durable Ledger？
它们能否在进程重启后观察到一致的 replay 结果？
```

### PRD 1 输出

PRD 1 必须提交可执行 fixtures / reports，而不是只写观察报告：

```text
fixtures/hooks/user-prompt-submit.json
fixtures/hooks/pre-tool-use-bash.json
fixtures/hooks/pre-tool-use-mcp.json
fixtures/hooks/session-start.json

HostContractCapabilities
HostContractConformanceTests
RuntimeDataLocatorDecision
IntegrationHealthReport
```

Decoder 必须忽略未知字段。不得依赖 `transcript_path` 指向的 transcript 内容格式作为稳定接口。

### Integration Health

插件看起来安装成功，不代表 guardrail 已生效。运行状态至少区分：

```ts
type IntegrationHealth =
  | "fully-active"
  | "mcp-active-hooks-untrusted"
  | "hooks-active-mcp-unavailable"
  | "runtime-storage-unavailable"
  | "plugin-disabled"
```

必须覆盖：

- 首次安装。
- 首次 trust。
- 插件升级但 hook 不变。
- 插件升级且 hook 改变。
- hook 未 trust。
- hooks feature 被关闭。
- MCP server 被关闭。
- ledger busy / storage unavailable。

### Hook Failure Strategy

Prompt Gate 和 Action Gate 必须配置短 timeout。不能使用默认长 timeout 作为产品行为。

必须测试：

- malformed JSON。
- non-zero exit。
- timeout。
- runtime crash。
- unsupported output shape。

语义判断失败和基础设施故障要分开：

```text
clarify / reject = 语义结果，按语义 block
degraded = 基础设施不可用，按项目策略 fail-open 或 fail-closed
```

V1.1 默认策略：

- 未启用 Harmony 的项目：no-op / pass。
- 已启用 Harmony 的项目且 ledger append 失败：block，并明确提示 storage unavailable。
- dogfood mode 可以允许 fail-open，但必须显式 degraded warning。
- strict mode fail-closed。

## Project Identity

Codex host id 只作为 provenance、correlation、idempotency 和 diagnostics，不直接成为 Harmony 领域主键。

```ts
type ProjectRef = {
  readonly projectId: string
  readonly canonicalRoot: string
  readonly worktreeId?: string
}
```

`projectId` 来源于 Harmony 自己的稳定规范化过程，例如第一次启用项目时创建的 manifest UUID。不能把 `cwd`、symlink 后路径、启动子目录、session id 或 turn id 当作 durable identity。

`PLUGIN_DATA` 很可能是 plugin 级目录，不是单项目目录。因此 ledger 必须原生支持：

```text
一个 data root
  -> 多个 ProjectRef
  -> 多个 session
  -> 多个 worktree
```

Host provenance 只能进入 record metadata：

```ts
type HostRef = {
  readonly sessionId?: string
  readonly turnId?: string
  readonly toolUseId?: string
}
```

当前官方 MCP 文档没有保证 hook 的 `session_id` 或 `turn_id` 会自动传给 MCP tool。因此在 PRD 1 证明前，所有 state-changing MCP tools 必须要求显式 `caseId`，不能依赖模型传递隐式“当前 Case”。

## PRD 2: Durable Ledger, Project Identity & Idempotency Contract

在 V1.1 架构下，Durable Ledger 是第一运行时依赖。由于 hook、MCP server、多个线程和可能的并发 append 都会访问同一个事实源，默认实现选择 SQLite。

NDJSON 不再保持五五开。只有当 PRD 1 证明存在可靠 single-writer broker 时，才重新考虑 NDJSON；否则 NDJSON 需要自行实现跨进程锁、seq allocation、事务 journal、crash recovery、partial line recovery、幂等索引和 schema metadata，本质上是在手写小数据库。

### Ledger Record

Ledger record 必须冻结统一 envelope：

```ts
type LedgerRecord<T> = {
  readonly recordId: string
  readonly ledgerSeq: bigint
  readonly recordType: string
  readonly schemaVersion: number
  readonly codecVersion: number
  readonly projectRef: ProjectRef
  readonly operationId: string
  readonly correlationId: string
  readonly causationId?: string
  readonly origin:
    | "user-prompt-hook"
    | "pre-tool-hook"
    | "mcp"
    | "cli"
    | "migration"
  readonly hostRef?: HostRef
  readonly occurredAt: string
  readonly payload: T
}
```

`operationId` 是幂等 contract 的核心：

```text
同一个 operationId 重试
  -> 返回原有 commit result
  -> 不重复 append
```

hook 的候选 `operationId` 可以先定义为：

```text
hash(projectRef, sessionId, turnId, hookEventName, payloadHash)
```

但 session / turn / tool ids 的稳定性必须由 PRD 1 验证。

### Ledger APIs

必须提供：

```ts
append(record, operationId)
appendMany(records, operationId, expectedStreamVersion?)
replay(query)
```

`appendMany` 必须是原子事务。Prompt Gate 使用一次 `appendMany` 提交：

```text
PromptObserved
CaseOpened / CaseLinked
PromptGateDecisionRecorded
```

### Ledger Invariants

- Idempotency：hook 或 MCP command 重试不能创建重复 Case 或重复发布 PackageVersion。
- Unique sequence：`ledgerSeq` 全局单调，replay order 只看 `ledgerSeq`。
- Optimistic concurrency：两个进程同时基于旧版本发布时，后者 typed fail，不能覆盖。
- Environment Snapshot：Case 创建时冻结 Base PackageVersion、Domain PackageVersions、parser version 和 rule version。
- Corruption policy：损坏 payload typed fail，不静默跳过。
- Migration policy：schema version / codec version 必须可检测。
- Privacy policy：append-only 是逻辑历史原则，不代表物理文件永不可删除。

### Current State

不做 durable secondary read store，与 current view 并不冲突。

准确定义：

```text
Ledger 是唯一 durable source of record；
由确定性 reducer / fold 重建出的 aggregate 是当前语义状态。
```

V1.1 可以保留进程内或请求内 ephemeral current state，但不得把它当作 durable truth。

### Data Privacy

Ledger 会保存 Prompt、文档证据和用户纠错。PRD 2 必须定义：

- 默认保存哪些原文。
- 文档是否保存全文，还是保存 hash + span。
- 本地数据目录。
- 清空整个 ledger 的管理操作。
- 敏感信息误写后的 purge 策略。

## PRD 3: Headless Runtime Facade

Headless runtime 当前暴露 workflow seam，不是 MCP request API。V1.1 需要 `SemanticRuntimeFacade`，作为 Hook Adapter 和 MCP Adapter 的共同依赖。

Facade 必须显式区分 Query 与 Command：

```ts
type OperationEffect =
  | "pure"
  | "ledger-write"
  | "project-write"
  | "external-side-effect"

type RuntimeResponse<T> = {
  readonly apiVersion: "1"
  readonly requestId: string
  readonly effect: OperationEffect
  readonly result: T
  readonly ledger: {
    readonly asOfSeq: string
    readonly sourceRecordIds: ReadonlyArray<string>
    readonly committedRecordIds: ReadonlyArray<string>
  }
}
```

Query：

- 不创建新 record。
- 返回 `asOfSeq`。
- 返回 `sourceRecordIds`。

Command：

- append ledger records。
- 返回 `committedRecordIds`。
- 返回 resulting `asOfSeq`。

第一批 facade 能力：

```ts
interface SemanticRuntimeFacade {
  status(query: StatusQuery): Effect<RuntimeResponse<StatusResult>, RuntimeError>
  getCase(query: GetCaseQuery): Effect<RuntimeResponse<GetCaseResult>, RuntimeError>
  analyzePrompt(query: AnalyzePromptQuery): Effect<RuntimeResponse<AnalyzePromptResult>, RuntimeError>
  evaluateAndRecordPrompt(
    command: EvaluateAndRecordPromptCommand
  ): Effect<RuntimeResponse<PromptGateResult>, RuntimeError>
  lintDocumentPreview(query: LintDocumentPreviewQuery): Effect<RuntimeResponse<LintResult>, RuntimeError>
  recordDocumentLint(command: RecordDocumentLintCommand): Effect<RuntimeResponse<LintRecordResult>, RuntimeError>
  compileVocabularyDraft(command: CompileVocabularyDraftCommand): Effect<RuntimeResponse<DraftResult>, RuntimeError>
  compileAndPublishVocabulary(
    command: CompileAndPublishVocabularyCommand
  ): Effect<RuntimeResponse<PublishResult>, RuntimeError>
}
```

`semantic_lint_document` 不应混成一个模糊工具。如果只是 dry-run，它是 pure query；如果记录 lint evidence 或生成 Case transition，它是 command。PRD 3 / PRD 4 应拆为 preview 与 record 两条能力。

Facade 不变量：

- Effect Cause 不穿透 Facade。
- Repository 类型不穿透 Facade。
- 内部 workflow 名称不穿透 Facade。
- ambiguity / unknown 是领域结果，不是异常。
- storage unavailable / codec failure 才是 typed runtime error。

## PRD 4: Codex Plugin Package & MCP Adapter

MCP server 只负责 transport、tool schema、facade schema mapping、result serialization、error serialization、approval configuration 和调用 Runtime Facade。它不能重新实现领域规则。

MCP schema 不必与 Facade schema 完全一致。验收标准是：

```text
MCP schema 与 Facade schema 之间存在
版本化、无损、经过 contract test 的映射。
```

例如 MCP tool 可以接收：

```text
case_id
document_path
```

内部 Facade 仍可使用：

```text
caseRef
resolvedDocumentRef
runtimeCaller
```

工具分类：

| Category | 示例 | 是否追加 Ledger | 是否改变正式语义 |
| --- | --- | --- | --- |
| `query` | `semantic_status`, `semantic_get_case`, `semantic_lint_document_preview` | 否 | 否 |
| `evidence_command` | `semantic_record_document_lint`, `semantic_evaluate_and_record_prompt`, `semantic_compile_vocabulary_draft` | 是 | 否 |
| `authority_command` | `semantic_compile_and_publish_vocabulary`, `semantic_apply_case_edit`, `semantic_publish_domain_package_patch_candidate` | 是 | 是 |

`semantic_import_vocabulary` 不作为默认工具名。它隐藏了 publish 行为，应拆成：

- `semantic_compile_vocabulary_draft`
- `semantic_compile_and_publish_vocabulary`

工具 approval 默认：

```text
semantic_status:
  effect: query
  approval: auto

semantic_get_case:
  effect: query
  approval: auto

semantic_lint_document_preview:
  effect: query
  approval: auto

semantic_compile_vocabulary_draft:
  effect: evidence_command
  approval: auto

semantic_compile_and_publish_vocabulary:
  effect: authority_command
  approval: prompt
```

Approval 不能只通过 metadata 序列化验收。PRD 4 必须实际验证 Codex 是否按预期弹出或绕过审批。即使用户把 host approval 改成 auto，core 仍必须继续检查 domain invariants。

MCP server 必须保持 STDIO 清洁：

- stdout 只输出 MCP 协议消息。
- logs 写 stderr。
- Effect 日志不得写 stdout。

### Minimal Skill

V1.1 plugin 附带一个很薄的 `semantic-runtime` skill，只负责指导 Codex：

- 何时调用 `semantic_status`。
- 何时调用 `semantic_get_case`。
- state-changing tool 必须携带 `caseId`。
- 不要直接修改 ledger。
- 不要把 export 当 truth。
- 不得把 Draft 说成 Published。
- 遇到 typed error 时不得猜测。

Skill 是 guidance，不承载状态，不执行语义逻辑，不成为另一层 policy engine。

## Environment Ref

Prompt Gate 不能暗中依赖尚未实现的完整 Domain Activation。

V1.1 定义最小 EnvironmentRef：

```ts
type EnvironmentRef =
  | { readonly kind: "default"; readonly projectRef: ProjectRef }
  | { readonly kind: "activated"; readonly environmentId: string }
```

当前派发波次只产生 `default`。完整 Domain Activation scoped store 后置。

## PRD 5: Prompt Gate

`UserPromptSubmit` hook 是 Prompt guardrail。它可以注入 additional developer context，也可以 block 并返回原因；它没有原生的 clarification object 状态。

因此：

```text
clarify = block with clarification reason
```

内部 decision 比 Codex hook 输出更丰富：

```ts
type PromptGateDecision =
  | { readonly kind: "pass"; readonly caseId: string; readonly additionalContext: string }
  | { readonly kind: "clarify"; readonly caseId: string; readonly question: string }
  | { readonly kind: "reject"; readonly caseId: string; readonly reason: string }
  | { readonly kind: "degraded"; readonly reason: string; readonly fallback: "allow" | "block" }
```

Codex Adapter 再映射成实际 Hook JSON。

### Clarification State Machine

Prompt Gate 必须显式建模澄清回复状态：

```text
OPEN
  -> AWAITING_CLARIFICATION
  -> RESOLVED
  -> REJECTED
```

约束：

- 同一个 `projectRef + sessionId` 最多一个 `AWAITING_CLARIFICATION` Case。
- 下一次 prompt 先判断是否为该 Case 的 clarification answer。
- 用户可以取消 pending request。
- 达到最大澄清次数后 reject 或要求显式取消。

block 后必须保存 pending clarification：

```ts
type PendingClarification = {
  readonly caseId: string
  readonly projectRef: ProjectRef
  readonly hostSessionId: string
  readonly blockedTurnId: string
  readonly questionId: string
  readonly candidates: ReadonlyArray<string>
  readonly attempts: number
}
```

否则澄清回答会被误建成新 Case，或者陷入无限 block 循环。

### Project Activation Check

`UserPromptSubmit` matcher 不生效，所以 plugin hook 会在所有相关 prompt 上运行。Hook 内部必须先快速判断当前项目是否启用 Harmony：

- 未启用项目：立即 no-op / pass。
- 已启用项目：进入 Runtime Facade。
- 已启用项目但 ledger 不可用：block storage unavailable。

### Golden Cases

`check this document; do not edit it` 不应是 clarification。它应当 pass：

```text
decision: pass
action:
  - validate
prohibited_actions:
  - rewrite
  - edit
```

更合适的 clarification fixture：

```text
check and improve this document
```

因为 `improve` 可能表示只提出建议，也可能表示直接修改原文。

Prompt Gate 至少保留四组黄金案例：

- `pass`：明确且约束完整。
- `blockClarify`：存在会改变行为结果的竞争解释。
- `blockReject`：存在不可同时满足的硬冲突。
- `degraded`：core / ledger 不可用，无法完成语义判断。

### Turn Binding

Prompt Gate 必须保存：

```text
HostTurnBoundToCase(turnId, caseId)
```

后续 PreToolUse 只能可靠使用 `turn_id -> case_id`，不能使用“session 当前最后一个 Case”。

### Additional Context 安全边界

不要把整份 Vocabulary、原始文档或 LLM 原始解释直接注入 developer context。

只注入 core 生成的紧凑 contract：

```text
semantic_case: case-123
action: validate
prohibited_actions:
  - edit
environment_ref: default/project-123
```

Prompt / Document / Vocabulary 内容默认都是数据，不能静默提升成 developer instruction。

## PRD 6: Action Gate

`PreToolUse` hook 是 supported-path guardrail，不是完整 enforcement boundary。

第一版保证等级：

| Surface | 保证等级 |
| --- | --- |
| `apply_patch` | 强保证，只要 Hook 正常运行即可判断 |
| 本插件 MCP authority commands | 强保证，Hook + Core 双重检查 |
| Bash/simple shell write attempts | best effort，只识别明确写操作 |
| 其他工具 | non-guarantee |

不要声称能可靠静态分析任意 Shell 写操作，例如：

- `python -c ...`
- `node -e ...`
- `sed -i ...`
- `cat > ...`
- `npm script` 间接写文件。
- 自定义二进制。

### Failure Matrix

| 情况 | 行为 |
| --- | --- |
| 策略判断为 deny | deny |
| ledger unavailable + 写操作 | deny |
| ledger unavailable + 只读操作 | 按明确策略 pass 或 deny |
| hook timeout | 记录 host-level non-guarantee；宿主可能继续工具调用 |
| hook crash | 记录 host-level non-guarantee；宿主可能继续工具调用 |
| malformed stdout | 记录 host-level non-guarantee；宿主可能继续工具调用 |
| unsupported output shape | 记录 host-level non-guarantee；宿主可能继续工具调用 |

Threat model：

```text
防止模型的偶发和非恶意违规；
不是对恶意用户、恶意工具或所有文件系统路径的安全隔离。
```

### Coverage Reports

验收必须加入绕过测试：

- `echo > file`
- `sed -i`
- `python -c` 写文件
- `node -e` 写文件
- `npm script` 间接写文件
- unified exec
- `apply_patch`
- MCP state-change tool

输出不是要求全部拦住，而是生成：

```text
SupportedPathCoverageReport
KnownBypassReport
CoreEnforcementCoverageReport
```

PreToolUse 只做 `allow` / `deny`。不要在 PreToolUse 里制造 approval UI。Approval 由 Codex MCP approval config 和 core command policy 处理。

正确分工：

```text
PreToolUse:
  allow / deny

Codex MCP approval config:
  prompt user

Core:
  再次校验 regression、package lifecycle、expected version
```

Action Gate 查找 Case 时使用：

```text
turn_id -> case_id
```

不能使用：

```text
session 当前最后一个 Case
```

## PRD 7: End-to-End Conformance, Upgrade & Recovery

PRD 7 不再是 Export PRD。Export 已明确不属于当前派发波次的必做能力。

PRD 7 验收完整路径：

```text
UserPromptSubmit
  -> Runtime Facade
  -> atomic ledger append
  -> blockClarify / pass
  -> caseId

semantic_get_case(caseId)
  -> 返回同一 Case
  -> source records 对得上

PreToolUse
  -> 读取同一 Case
  -> 对 prohibited action deny

进程重启
  -> 行为保持一致
```

必须覆盖：

- hook untrusted。
- MCP unavailable。
- ledger corruption。
- ledger busy。
- plugin update。
- 两个并发 session。
- 同一 operation retry。
- 不同 worktree。
- 项目未启用 Harmony。

## Explicit Export

Explicit Export 后置为独立 epic：Explicit Review Projection。

ADR：

```text
Export 是 ledger 在指定 asOfSeq 上的纯 projection；
导出文件不参与任何 runtime decision。
```

导出 metadata：

```ts
type ExportMetadata = {
  readonly exportedAt: string
  readonly asOfLedgerSeq: number
  readonly sourceRecordIds: ReadonlyArray<string>
  readonly environmentRef?: EnvironmentRef
  readonly contentDigest: string
}
```

未来若要重新导入导出物，必须经过独立显式 command，不能自动反向同步。

## Cross-PRD Invariants

这些不变量属于 umbrella PRD，不属于单个实现 agent：

1. Hook 和 MCP 是平级 host adapter，Hook 不调用 MCP。
2. Hook 和 MCP 不共享内存真相，只共享 Durable Ledger。
3. RuntimeDataLocator 是定位 durable state 的唯一入口。
4. Host ID 只作为 provenance / correlation / idempotency / diagnostics，不直接成为 Semantic Domain ID。
5. `cwd` 不能作为 durable project identity。
6. 每个 Case 固定自己的 Environment Snapshot。
7. 每个 Command 必须幂等。
8. Query 不写 ledger；Command 写 ledger 并返回 committed record refs。
9. ambiguity / unknown 不是 Runtime Error。
10. Evidence append 不等于 Semantic Authority Change。
11. Hook 不依赖 MCP 可用性。
12. MCP 不重新实现领域规则。
13. Prompt / Document / Vocabulary 内容默认都是数据，不能静默提升成 developer instruction。
14. Action Gate 的 host coverage 必须显式列出，不得自称完整安全边界。
15. 所有正式状态变化必须在 Core 中再次验证，不能只依赖 Hook 或 Codex approval。
16. Export 永远不是运行时事实源。

## Workbench 替换关系

| 原计划自建 | Codex-hosted V1.1 |
| --- | --- |
| Prompt Composer | Codex Thread |
| Prompt 语义入口 | UserPromptSubmit Hook |
| 执行权限门禁 | PreToolUse supported-path guardrail |
| Application API | Runtime Facade + MCP Server |
| Domain Toggle UI | 后置 Domain Activation command |
| Semantic Trace Pane | E2E conformance report / 后置 explicit export |
| Correction Drawer | 后置 conversation + typed correction command |
| Patch Review Page | 后置 Codex diff/review + core publication gate |
| Regression Dashboard | 后置 explicit report export |
| 调度系统 | 后置 Codex Automations |
| 自定义线程和历史 | Codex threads + Durable Ledger |
| 完整 React Workbench | 暂缓 |

## 推进顺序

当前派发波次：

1. Codex Host Contract & Runtime Data Locator Spike。
2. Durable Ledger, Project Identity & Idempotency Contract。
3. Headless Runtime Facade。
4. Codex Plugin Package & MCP Adapter。
5. Prompt Gate。
6. Action Gate。
7. End-to-End Conformance, Upgrade & Recovery。

后置 epics：

8. Explicit Export / Review Projection。
9. Domain Activation。
10. Correction Conversation。
11. Patch / Regression / Automation。

## 当前波次完成标准

PRD 1-7 跑通后，只能说明系统具备 Codex-hosted semantic execution、guardrail 和 recovery loop。

它不声称完成完整语义学习闭环。完整 Harmony dogfood 仍需要后置 epics：

1. 用户发现系统理解错误。
2. 用户通过 Codex 对话提交 typed CaseSemanticEdit。
3. 当前 Case 立即修正。
4. 系统提出 scoped Semantic Patch Candidate。
5. Regression 通过或阻断。
6. 用户批准后发布 PackageVersion。
7. 重跑原 Case 不再犯错。

当前波次的目标是让后续 correction / patch / regression 能建立在可信 host contract、durable ledger、typed facade 和可恢复垂直链路之上。

## Strict Gate 与 Dogfood Gate

如果要求 Prompt 必须在 Codex 模型看到之前完成 AI 语义解析，hook 调用的 headless runtime 必须拥有独立 Model Provider，或足够强的确定性解析器。

早期推荐：

- 确定性规则 + hook 严格拦截明显冲突。
- Codex 首先调用 Runtime Facade / MCP 完成其余解析和展示。

稳定后：

- Hook 内部调用独立 Semantic Model Provider。
- 形成严格前置语义编译。
