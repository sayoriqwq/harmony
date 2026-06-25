# V1.1 Codex-hosted Semantic Runtime

本文档记录下一阶段方向：暂缓自建完整 Semantic Workbench，先用 Codex app 承担交互壳、线程、审批、diff、artifact、浏览器和自动化；Harmony headless core 继续承担语义真相。

对应 umbrella PRD：GitHub issue `#11`。

## 核心判断

Codex app 适合作为 V1.1 的宿主层，但不能成为语义事实源。

- Codex app 负责对话、澄清、审批、diff、artifact 预览、浏览器和自动化。
- Codex plugin 负责打包 hooks、skills 和 MCP server。
- Harmony headless core 负责 Package、Environment、Case、Correction、Patch、Regression。
- Durable Ledger 是运行时唯一事实源。
- Codex Memory 只可辅助近期上下文恢复，不能成为 Base Semantic Layer。

V1.1 不做默认外置语义资产层：

- 不使用 `.semantic/`。
- 不使用 `.harmony/memory`。
- 不使用 `.harmony/read-models`。

查询性能先由 Durable Ledger replay / query view 和 Runtime Facade 解决。需要人工审查快照时，后续通过显式 export 生成。

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
    ├── Skills
    │   ├── semantic-session
    │   ├── vocabulary-authoring
    │   ├── semantic-lint
    │   └── semantic-patch-review
    └── MCP Server
        └── semantic tools over Runtime Facade

UserPromptSubmit Hook process
        ↓
SemanticRuntimeFacade
        ↓
Durable Ledger

MCP Server process
        ↓
SemanticRuntimeFacade
        ↓
同一个 Durable Ledger
```

Hook 和 MCP 不共享同一个内存 Runtime、Effect Layer、Repository 或 Current View。它们可以各自构建临时 runtime/cache，但只能通过同一个 Durable Ledger 观察和改变事实。

Hook 也不应通过 MCP 调用 Runtime Facade。MCP 是可被用户关闭的 transport；Prompt Gate 不能依赖 MCP 可用性。

```text
Hook Adapter ───────┐
                    ├── SemanticRuntimeFacade
MCP Adapter ────────┘
```

## Host Contract Spike

正式拆给实现 agents 前，必须先验证 Codex host contract。

必须验证：

- plugin install / enable。
- plugin-bundled hooks loading。
- plugin-bundled MCP server loading。
- hook trust / review lifecycle。
- `PLUGIN_DATA` 是否提供给 hook。
- MCP server 是否能定位同一个 durable data root。
- hook 与 MCP 是否能并发访问同一个 Durable Ledger。
- hook 和 MCP 在进程重启后是否观察到一致 replay。

不能再问“hook 和 MCP 是否共享 runtime state”。正确问题是：

```text
hook 与 MCP 是否能定位并并发访问同一个 Durable Ledger？
它们能否在进程重启后观察到一致的 replay 结果？
```

### Host Operating Mode

插件看起来安装成功，不代表 guardrail 已生效。Host spike 必须产出运行模式：

```ts
type HostOperatingMode =
  | "fullyGuarded"
  | "mcpOnly"
  | "hooksOnly"
  | "degraded"
  | "unavailable"
```

必须覆盖：

- 首次安装。
- 首次 trust。
- 插件升级但 hook 不变。
- 插件升级且 hook 改变。
- hook 未 trust。
- hooks feature 被关闭。
- MCP server 被关闭。

### Hook Failure Strategy

Prompt Gate 和 Action Gate 必须配置短 timeout。不能使用默认长 timeout 作为产品行为。

必须测试：

- malformed JSON。
- non-zero exit。
- timeout。
- runtime crash。

语义判断失败和基础设施故障要分开：

```text
clarify / reject = 语义结果，按语义 block
degraded = 基础设施不可用，按模式 fail-open 或 fail-closed
```

V1.1 默认建议：

- dogfood mode：fail-open + degraded warning。
- strict mode：fail-closed。

### Host Invocation Ref

Codex host id 只作为 provenance，不直接成为 Harmony 领域主键。

```ts
type HostInvocationRef = {
  readonly host: "codex"
  readonly hostSessionId: string
  readonly hostTurnId?: string
  readonly cwd: string
  readonly pluginVersion: string
  readonly permissionMode?: string
}
```

系统自己的 `CaseId`、`SemanticSessionId` 和 Package identity 由 core 生成。

必须验证：

- 新线程。
- 线程 resume。
- clear。
- compact。
- 多个并行线程。
- Codex worktree。
- subagent。

不要把 transcript 文件格式作为协议依赖。

## Durable Ledger Runtime Contract

在 V1.1 架构下，Durable Ledger 是第一运行时依赖。由于 hook、MCP server、多个线程和可能的并发 append 都会访问同一个事实源，默认倾向 SQLite，而不是让 NDJSON 自行实现锁、事务、seq 分配和崩溃恢复。

SQLite 是当前推荐目标，但仍要通过 PRD 2 spike 固定驱动、WAL/locking、migration、plugin data lifecycle 和跨平台行为。

### Ledger Envelope

Ledger entry 至少需要 envelope：

```ts
type LedgerEnvelope = {
  readonly eventId: string
  readonly ledgerSeq: number
  readonly streamId: string
  readonly streamVersion: number
  readonly eventType: string
  readonly schemaVersion: number
  readonly commandId: string
  readonly correlationId?: string
  readonly causationId?: string
  readonly occurredAt: string
  readonly payload: unknown
}
```

必须提供：

```ts
append(record, idempotencyKey)
appendMany(records, expectedStreamVersion)
replay(fromSeq?)
```

### Ledger Invariants

- Idempotency：hook 或 MCP command 重试不能创建重复 Case 或重复发布 PackageVersion。
- Optimistic concurrency：两个进程同时基于旧版本发布时，后者 typed fail，不能覆盖。
- Environment Snapshot：Case 创建时冻结 Base PackageVersion、Domain PackageVersions、parser version 和 rule version。
- Replay order：current views 必须由 `ledgerSeq` 顺序重建。
- Corruption policy：损坏 payload typed fail，不静默跳过。
- Migration policy：schema version / codec version 必须可检测。
- Privacy policy：append-only 是逻辑历史原则，不代表物理文件永不可删除。

### Data Privacy

Ledger 会保存 Prompt、文档证据和用户纠错。PRD 2 必须定义：

- 默认保存哪些原文。
- 文档是否保存全文，还是保存 hash + span。
- 本地数据目录。
- 清空整个 ledger 的管理操作。
- 敏感信息误写后的 purge 策略。

## Runtime Facade

Headless runtime 当前暴露 workflow seam，不是 MCP request API。V1.1 需要 `SemanticRuntimeFacade`，作为 Hook Adapter 和 MCP Adapter 的共同依赖。

采用 Command / Query 分离：

```ts
interface SemanticRuntimeFacade {
  status(query: StatusQuery): Effect<StatusResponse, RuntimeError>
  getCase(query: GetCaseQuery): Effect<GetCaseResponse, RuntimeError>
  analyzePrompt(command: AnalyzePromptCommand): Effect<AnalyzePromptResponse, RuntimeError>
  lintDocument(command: LintDocumentCommand): Effect<LintDocumentResponse, RuntimeError>
  compileVocabulary(command: CompileVocabularyCommand): Effect<CompileVocabularyResponse, RuntimeError>
}
```

统一 response envelope：

```ts
type FacadeResponse<A> = {
  readonly requestId: string
  readonly contractVersion: number
  readonly result: A
  readonly caseId?: string
  readonly environmentRef?: string
  readonly ledger: {
    readonly fromSeq?: number
    readonly toSeq?: number
    readonly recordIds: ReadonlyArray<string>
  }
}
```

Facade 不变量：

- Effect Cause 不穿透 Facade。
- Repository 类型不穿透 Facade。
- 内部 workflow 名称不穿透 Facade。
- ambiguity / unknown 是领域结果，不是异常。
- storage unavailable / codec failure 才是 typed runtime error。

第一批 facade 能力只包含：

- `status`
- `getCase`
- `analyzePrompt`
- `lintDocument`
- `compileVocabulary`

Correction、Domain Activation、Patch publication 后续单独补。

## MCP Facade

MCP server 只负责 transport、tool schema、result serialization、approval metadata 和调用 Runtime Facade。它不能重新实现领域规则。

工具分类不使用简单 read/write，而使用：

| Category | 示例 | 是否追加 Ledger | 是否改变正式语义 |
| --- | --- | --- | --- |
| `query` | `semantic_status`, `semantic_get_case` | 否 | 否 |
| `evidence_command` | `semantic_analyze_prompt`, `semantic_lint_document`, `semantic_compile_vocabulary_draft` | 是 | 否 |
| `authority_command` | `semantic_compile_and_publish_vocabulary`, `semantic_apply_case_edit`, `semantic_publish_domain_package_patch_candidate` | 是 | 是 |

`semantic_import_vocabulary` 不作为默认工具名。它隐藏了 publish 行为，应拆成：

- `semantic_compile_vocabulary_draft`
- `semantic_compile_and_publish_vocabulary`

工具 metadata 应表达：

```text
semantic_status:
  effect: query
  approval: auto

semantic_analyze_prompt:
  effect: evidence_command
  approval: auto

semantic_compile_and_publish_vocabulary:
  effect: authority_command
  approval: prompt
```

MCP server 必须保持 STDIO 清洁：

- stdout 只输出 MCP 协议消息。
- logs 写 stderr。
- Effect 日志不得写 stdout。

### Minimal Skill

V1.1 plugin 可附带一个很薄的 skill，用于交互协议：

- 如何调用 `semantic_status`。
- 如何展示 `semantic_analyze_prompt`。
- 遇到 typed error 时不得猜测。
- 不得把 Draft 说成 Published。
- 纠正时必须引用 CaseId。

Skill 是 guidance，不是 enforcement。

## Prompt Gate

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

### Clarification Continuation

block 后必须保存 pending clarification：

```ts
type PendingClarification = {
  readonly caseId: string
  readonly hostSessionId: string
  readonly blockedTurnId: string
  readonly questionId: string
  readonly candidates: ReadonlyArray<string>
}
```

用户下一次输入时，需要判断：

- 这是对 pending question 的回答。
- 这是全新请求。
- 用户取消了之前请求。

否则澄清回答会被误建成新 Case，或者陷入循环。

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
environment_ref: env-41
```

Prompt / Document / Vocabulary 内容默认都是数据，不能静默提升成 developer instruction。

## Action Gate

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
- 自定义二进制。

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

## Explicit Export

V1.1 默认不生成稳定外置资产层。显式导出是后置能力，用于人工审查快照。

导出物不是运行时事实源。编辑导出物不会改变 Ledger、Case、PackageVersion 或 Patch state。

导出 metadata：

```ts
type ExportMetadata = {
  readonly exportedAt: string
  readonly asOfLedgerSeq: number
  readonly sourceRecordIds: ReadonlyArray<string>
  readonly environmentRef?: string
  readonly contentDigest: string
}
```

未来若要重新导入导出物，必须经过独立显式 command，不能自动反向同步。

## Cross-PRD Invariants

这些不变量属于 umbrella PRD，不属于单个实现 agent：

1. Hook 和 MCP 不共享内存真相，只共享 Durable Ledger。
2. Host ID 只作为 provenance，不直接成为 Semantic Domain ID。
3. 每个 Case 固定自己的 Environment Snapshot。
4. 每个 Command 必须幂等。
5. ambiguity / unknown 不是 Runtime Error。
6. Evidence append 不等于 Semantic Authority Change。
7. Hook 不依赖 MCP 可用性。
8. MCP 不重新实现领域规则。
9. Prompt / Document / Vocabulary 内容默认都是数据，不能静默提升成 developer instruction。
10. Action Gate 的 host coverage 必须显式列出，不得自称完整安全边界。
11. 所有正式状态变化必须在 Core 中再次验证，不能只依赖 Hook 或 Codex approval。
12. 导出物永远不是运行时事实源。

## Workbench 替换关系

| 原计划自建 | Codex-hosted V1.1 |
| --- | --- |
| Prompt Composer | Codex Thread |
| Prompt 语义入口 | UserPromptSubmit Hook |
| 执行权限门禁 | PreToolUse supported-path guardrail |
| Application API | Runtime Facade + MCP Server |
| Domain Toggle UI | 对话 + MCP authority command |
| Semantic Trace Pane | Explicit export / Codex artifact preview |
| Correction Drawer | 对话 + typed correction command |
| Patch Review Page | Codex diff/review + core publication gate |
| Regression Dashboard | explicit report export |
| 调度系统 | Codex Automations |
| 自定义线程和历史 | Codex threads + Durable Ledger |
| 完整 React Workbench | 暂缓 |

## 推进顺序

第一批 feasibility：

1. Codex Host Contract Spike。
2. Durable Ledger Runtime Contract。
3. Headless Runtime Facade。

第二批连接 Codex：

4. MCP Server Facade。
5. Prompt Gate。
6. Action Gate。

第三批闭合学习循环：

7. Domain Activation scoped store。
8. Correction Conversation Flow。
9. Patch / Regression / Publication。

后置体验增强：

10. Explicit Export / Review Snapshot。
11. Read-only HTML Trace Viewer。

## V1.1 Completion Standard

PRD 1-6 跑通后，只能说明系统具备 Codex-hosted semantic execution and guardrail loop。

Harmony 的完整 V1.1 dogfood 目标还应包含 correction loop：

1. 用户提交 Prompt。
2. Prompt Gate 形成 Case。
3. 用户发现系统理解错误。
4. 用户通过 Codex 对话提交 typed CaseSemanticEdit。
5. 当前 Case 立即修正。
6. 系统提出 scoped Semantic Patch Candidate。
7. Regression 通过或阻断。
8. 用户批准后发布 PackageVersion。
9. 重跑原 Case 不再犯错。

Explicit Export 可以后置，但 Correction Conversation Flow 不应无限后置。

## Strict Gate 与 Dogfood Gate

如果要求 Prompt 必须在 Codex 模型看到之前完成 AI 语义解析，hook 调用的 headless runtime 必须拥有独立 Model Provider，或足够强的确定性解析器。

早期推荐：

- 确定性规则 + hook 严格拦截明显冲突。
- Codex 首先调用 Runtime Facade / MCP 完成其余解析和展示。

稳定后：

- Hook 内部调用独立 Semantic Model Provider。
- 形成严格前置语义编译。
