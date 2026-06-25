# V1 Effect 实现对齐

- **状态**：Working Draft
- **日期**：2026-06-24
- **用途**：记录第一版 Effect 实现前的对齐结论，作为后续 PRD 与 issue 派发的原始材料。
- **权威关系**：服从 `semantic-system-principles-v0.1.md`；本文只记录落地选择、已确认问题和实现验收切片。

## 读取基线

已读取并采用以下文档作为当前输入：

- `CONTEXT.md`
- `docs/README.md`
- `docs/concept.md`
- `docs/theory/research-map.md`
- `docs/first-phase/mvp-loop-principles.md`
- `docs/first-phase/semantic-system-principles-v0.1.md`
- `docs/engineering/effect.md`

## 已确认的不变量

V1 目标是跑通最小语义闭环：

```text
导入 -> 解析 -> 验证 -> 纠错 -> 回补 -> 回归 -> 再运行
```

实现可以保持简单，但不能省略以下对象或行为：

- 原始输入必须保留。
- Package 与版本必须绑定到运行结果。
- Semantic IR 必须保留原文依据、未解析内容和当前解释状态。
- 解析与验证必须分离。
- 未知、冲突、违反和支持必须分别表达。
- Correction 必须先修正当前 Case，不能直接等同于正式 Patch。
- Semantic Patch Candidate 必须有来源、作用域、生命周期和回归结果。
- Regression Case 必须能证明修复没有静默破坏历史正确行为。

## 通用建模原则

V1 采用以下跨对象原则：

> Evidence source as audit; structured artifact as consumption model.

含义：

- Evidence source 是审计和重建的来源，必须保留原始形态、来源、时间和作用域。
- Structured artifact 是系统消费模型，用于运行、验证、纠错、补丁、回归和下游调用。
- Structured artifact 必须回指 evidence source；不能替代或覆盖 evidence source。
- 运行时可以消费 structured artifact，但高影响决策必须能解释其 evidence source。

该原则适用于：

```text
Vocabulary Source -> Semantic Package Draft / Published Package
SemanticInput -> Semantic IR
Correction userText -> CaseSemanticEdit
CaseSemanticEdit + Diagnose -> Semantic Patch Candidate
Regression source Case -> Expected Semantic Assertion
Semantic IR + Rules -> Lint Finding
Package source assertions -> Active Semantic Environment
```

反例：

```text
保存用户纠正文本，然后直接当作新规则消费
保存编译后的 Package，却丢掉 Vocabulary Source
保存 Lint Finding，却无法回指原文 span、IR 和规则版本
保存 Regression Case，却只存自然语言期望
```

Effect-first 落地要求：Evidence source 和 Structured artifact 都应有 Schema；跨边界消费时 decode structured artifact，审计、解释和重建时回到 evidence source。

## 理论到 Effect 的翻译层

后续推进和追问必须把理论对象翻译成 Effect 可执行契约，而不是只停留在概念命名。

翻译规则：

```text
理论对象 / 证据源
  -> Schema.Class / Schema.Struct
  -> append-only ledger record

理论状态 / 生命周期 / 归因分类
  -> Schema.Literals / Schema.Union / discriminated union
  -> exhaustive handling in runtime workflow

语义引用 / identity / package version
  -> Schema.brand(...)
  -> 编译期禁止裸 string 混用
  -> 需要运行时约束时补 format / refinement / constructor checks

系统能力 / 边界服务
  -> Context.Service contract
  -> Layer 提供 deterministic / in-memory / future provider 实现

运行流程
  -> Effect.fn("Service.method")(function* (...) { ... }, transforms...)
  -> typed error channel + structured logging / tracing
  -> transforms 作为 Effect.fn 额外参数传入，不 pipe 到 Effect.fn declaration

预期错误 / 不可恢复失败
  -> Schema.TaggedErrorClass
  -> expected typed errors 进入 service error union
  -> unexpected defect 保留为 defect / cause，或在边界显式包装
  -> 不用 throw string / plain object，不把 defect 静默转成业务失败

验收
  -> tsgo --noEmit
  -> @effect/vitest 的 it.effect
  -> Schema decode fixture / parser output / stored artifact
  -> malformed input decode failure
  -> fresh in-memory ledger per test or explicit reset
  -> Layer 替换测试
  -> regression runner 复跑 expected structured assertions
```

这层翻译的目标是：理论不变量必须在类型、Schema decode、Effect service boundary、Layer 替换和测试验收中都有落点。

## Effect 落地约束

当前仓库使用 Effect `4.0.0-beta.83` 与 `@effect/tsgo`。V1 实现应遵守：

- Harmony 是 Effect-first 系统，业务运行代码应尽可能采用 Effect-native 结构，而不是在普通 TypeScript 代码外层包一层 Effect。
- 领域对象优先用 `Schema.Class`、`Schema.Struct`、branded id 和 literal union 表达。
- effectful workflow 使用 `Effect.gen`。
- 返回 `Effect` 的函数使用 `Effect.fn("name")`。
- 服务边界使用 `Context.Service`，通过 `Layer` 组合依赖。
- 测试使用 `@effect/vitest` 的 `it.effect` / `it.live` / `layer(...)` 与 `assert`。
- branded id 主要提供编译期防混用；跨边界运行时格式约束必须通过 Schema refinement、constructor 或 decode fixture 明确验证。
- expected typed errors 使用 `Schema.TaggedErrorClass`；unexpected defect 不得被静默压成业务失败。
- `tsgo --noEmit` 是主类型检查路径，不能用 assertion 压掉诊断。

## 当前实现事实

V1 deterministic headless semantic core 已经完成第一轮实现。`packages/semantic-model`
提供 Schema-first durable semantic objects；`packages/headless-runtime` 提供 Effect service、
Layer、deterministic parser、workflow 和 in-memory append-only ledger 语义。

GitHub PRD `#1` 已拆出并关闭 `#2` 到 `#9` 的 8 条 capability implementation issue。
当前不是“只有 smoke test”，而是已经有 glossary、active environment、prompt clarification、
document lint、correction、diagnosis、patch publication 和 historical regression blocking 的
headless workflow acceptance tests。

剩余缺口记录在 `docs/first-phase/v1-implementation-status.md`。当前实现仍不包含 HTTP、CLI、
UI、真实 LLM Provider 或 file-backed durable ledger Layer。

## 已对齐决策

### Q1：V1 的第一条实现切片应先落在哪里？

推荐答案：先做 **headless semantic core**，不先做 HTTP、CLI、UI 或真实 LLM Provider。

结论：已确认。V1 第一条实现切片先落在 headless semantic core。

补充判断：monorepo 是为了让语义模型、运行时、交互面、Provider 和持久化适配器可以独立演进，而不是把所有能力压进一个应用包。

理由：

- 当前权威文档把 V1 验收放在语义闭环，而不是交互形态。
- headless core 能最直接锁定 Vocabulary Source、Semantic Package、Active Semantic Environment、Semantic IR、Case、Correction、Semantic Patch Candidate 和 Regression Case 的类型边界。
- HTTP、CLI、UI、真实模型调用都可以作为后续边界层接入；过早加入会稀释最关键的语义状态机和回归验证。
- Effect 的服务与 Layer 能先用于纯内存 repo、候选解析器、验证器和回归 runner，之后再替换为持久化与真实 LLM provider。

若接受该推荐，第一条实现切片定义为：

```text
In-memory Vocabulary Source
-> compile minimal Semantic Package Draft / Published Package
-> build Active Semantic Environment
-> parse one Prompt or Document into minimal Semantic IR
-> validate into pass / pass_with_assumptions / clarify / reject / lint finding / undetermined
-> apply one Correction as CaseSemanticEdit
-> create Semantic Patch Candidate and Regression Case
-> rerun Regression Case against the updated environment
```

已确认：接受 headless semantic core 作为 V1 第一条实现切片。

### Q2：monorepo 的第一层 package 边界应该怎么切？

推荐答案：先切成 **semantic model** 与 **headless runtime** 两层，不按 UI、HTTP、CLI 或数据库提前扩展。

结论：已确认。V1 第一层 package 边界采用 `packages/semantic-model` 与 `packages/headless-runtime`。

建议的第一版 workspace 边界：

```text
packages/semantic-model
  领域 Schema、branded id、状态枚举、Semantic IR、Case、Correction、Patch、Regression 的类型定义
  纯函数级 state transition 与不可变规则

packages/headless-runtime
  Effect services、in-memory repositories、compiler、parser、validator、correction applier、regression runner
  依赖 semantic-model

apps/*
  暂不创建，等 CLI、HTTP API 或 UI 成为明确验收入口时再建

libs/*
  暂不创建，等出现跨 package 的真实复用代码时再建
```

理由：

- `semantic-model` 应该成为最稳定的契约层，后续 PRD、issue、测试和外部 API 都围绕它对齐。
- `headless-runtime` 可以用 Effect service / Layer 表达运行流程与依赖，后续把 in-memory repo 替换成数据库或 LLM Provider 时不污染 model。
- 暂不创建 `apps/*` 能避免把交互形态误当成 V1 验收标准。
- 暂不创建 `libs/*` 能避免为了 monorepo 结构提前抽象通用工具。

已确认：接受 `packages/semantic-model` + `packages/headless-runtime` 作为 V1 第一层 package 边界。

### Q3：`semantic-model` 的源真相应该是 Effect Schema 还是 TypeScript 类型？

推荐答案：以 **Effect Schema 作为 durable semantic objects 的源真相**，TypeScript 类型从 Schema 派生；不要先写 type/interface 再手写运行时校验。

结论：已确认。`semantic-model` 以 Effect Schema 作为 durable semantic objects 的源真相。

补充判断：V1 明确采用 Effect-first / Effect-native 工程风格；Effect 不是边界胶水，而是业务运行代码的主要结构方式。

建议规则：

```text
Schema.Class
  用于长期持久化、跨 package 传递、会进入 Case / Patch / Regression 的领域对象

Schema.Struct
  用于局部嵌套结构、输入载荷和组合片段

Schema.Literals / Schema.Union
  用于状态机枚举、结果 union、错误归因类型和验证结果

Schema.brand(...)
  用于 VocabularySourceId、PackageId、PackageVersion、SemanticIrId、CaseId、CorrectionId、PatchCandidateId、RegressionCaseId

普通 TypeScript 函数
  用于已解码对象上的纯 state transition，不重新表达运行时结构
```

理由：

- V1 的核心对象会跨越导入、解析、纠错、补丁、回归和未来持久化边界，只靠静态类型无法验证外部输入、LLM structured output 或历史数据。
- Effect Schema 能同时给出运行时 decode/encode、静态类型、测试输入和未来 HTTP/AI 边界复用。
- `semantic-model` 本身允许依赖 `effect`，因为本仓库的工程基线就是 Effect-first；避免引入第二套 schema 库。
- 手写 interface + 手写校验容易让字段状态、union tag 和版本兼容性漂移，正好违背“类型严格”的目的。

已确认：接受 Effect Schema 作为 `semantic-model` 的源真相。

### Q4：Effect-native 是否意味着所有业务函数都返回 `Effect`？

推荐答案：不是。V1 应该采用 **Effect at boundaries, total functions in the model**。

结论：已确认。V1 采用 `Effect at boundaries, total functions in the model` 作为 Effect-native 边界规则。

具体规则：

```text
返回 Effect
  decode/encode 外部输入
  访问 repository / clock / id generator / LLM / filesystem / network
  需要 typed error channel 的业务步骤
  需要 logging / tracing / metrics / interruption / retry 的 workflow
  orchestration service 中的端到端流程

保持纯函数
  已解码 semantic object 上的 total state transition
  简单 projection、索引、排序、归一化
  不需要环境依赖、不失败、不产生日志或 span 的领域计算
```

理由：

- Effect-native 的关键是让依赖、失败、并发、资源、观测性和边界副作用显式进入 Effect，而不是把所有表达式都 Effect 化。
- `semantic-model` 的核心价值是稳定、可测试、可复用的语义对象与纯状态变换；把无失败的 total function 强行包成 `Effect` 会增加噪音。
- `headless-runtime` 才是主要的 Effect service orchestration 层，负责把 parser、validator、Correction、Patch、Regression 串成可追踪 workflow。
- 这仍然是 Effect-first：Schema、TaggedError、Context.Service、Layer、Effect.fn、it.effect、tsgo guardrails 都是默认结构。

已确认：接受 “Effect at boundaries, total functions in the model” 作为 Effect-native 的边界规则。

### Q5：V1 parser 应先接真实 LLM，还是先做确定性 parser contract？

推荐答案：先做 **deterministic parser contract with fixtures**，暂不接真实 LLM Provider。

结论：已确认。V1 先做 deterministic parser contract with fixtures，真实 LLM Provider 延后到 parser contract 稳定后接入。

具体规则：

```text
semantic-model
  定义 ParseInput、ParseCandidate、SemanticIr、UnresolvedSpan、EvidenceSpan、ParseDecisionState 等 Schema

headless-runtime
  定义 SemanticParser service contract
  提供 deterministic / fixture parser layer
  parser 输出必须通过 Schema decode
  后续真实 LLM Provider 只能实现同一个 service contract
```

理由：

- Q1 已确认第一条切片是 headless semantic core，不以真实模型调用作为验收前置。
- V1 的关键风险是语义对象、状态机和纠错回归是否严密；真实 LLM 会引入不稳定性，降低测试可重复性。
- 文档不变量要求“AI 是语义提议者，不是默认权威”，因此真实 LLM 最早也应被包在 parser proposal service 后面，而不是直接污染领域模型。
- Deterministic fixture parser 可以先覆盖 MVP Case A-H 的固定输入，保证回归 runner 能证明闭环。
- 以后接 LLM 时，Effect Layer 只替换 parser implementation，不改变 `semantic-model` 和闭环测试。

已确认：接受先做 deterministic parser contract with fixtures，真实 LLM Provider 延后到 contract 稳定后接入。

### Q6：V1 输入对象应拆成 Prompt / Document 两套，还是用统一输入模型？

推荐答案：采用 **unified identity/provenance envelope + discriminated payload**。

结论：已确认。V1 不使用可选字段泛滥的单一 `SemanticInput` class；使用严格 discriminated union，在共享 envelope 的同时保留 Prompt、Document、Vocabulary 的类型边界。

建议模型：

```text
SemanticInputEnvelope
  id
  sourceRef
  metadata

SemanticInput =
  | PromptInput
  | DocumentInput
  | VocabularyInput

PromptInput
  inputKind: prompt
  content
  promptRole / turnRef / targetRefs
  spans

DocumentInput
  inputKind: document
  content
  sections
  declaredCompleteness: complete | partial | unspecified

VocabularyInput
  inputKind: vocabulary
  content
  vocabularyKind: base | domain
  namespace
```

配套规则：

```text
Prompt
  主要进入 request decision：pass / pass_with_assumptions / clarify / reject

Document
  主要进入 Semantic Lint：supported / violated / conflicted / undetermined

Vocabulary
  主要进入 compile / lifting / draft package

Semantic IR
  引用同一个 SemanticInput union，并保留 inputKind 与 source spans
```

理由：

- 当前权威规范定义 Semantic IR 可来自 Prompt、文档或 Vocabulary，本质上都需要原文引用、span、环境版本和解析状态。
- `declaredCompleteness` 必须只放在 Document 或 Document Section 上，否则容易把 Prompt 的语境和被检查 Document 的闭合范围混掉。
- 统一 envelope 能减少 Case、Correction、Patch、Regression 的 input 引用复杂度。
- discriminated payload 能保证 Prompt、Document、Vocabulary 的业务契约不靠可选字段约定维持。
- Effect Schema 的 `Schema.Union` 和 literal tag 能让这种边界同时具备静态类型与运行时 decode 能力。
- Effect 在这里的优势是同一份定义同时约束静态类型、运行时 decode、未来 LLM structured output、持久化读写和 service boundary；例如 `declaredCompleteness` 根本不会出现在 `PromptInput` 类型或解码结果上。

Effect Schema 定义草图：

```ts
const InputKind = Schema.Literals(["prompt", "document", "vocabulary"])

class SemanticInputEnvelope extends Schema.Class<SemanticInputEnvelope>("SemanticInputEnvelope")({
  id: SemanticInputId,
  sourceRef: SourceRef,
  metadata: InputMetadata
}) {}

class PromptInput extends Schema.Class<PromptInput>("PromptInput")({
  ...SemanticInputEnvelope.fields,
  inputKind: Schema.Literal("prompt"),
  content: Schema.String,
  spans: Schema.Array(SourceSpan),
  targetRefs: Schema.Array(SemanticInputId)
}) {}

class DocumentInput extends Schema.Class<DocumentInput>("DocumentInput")({
  ...SemanticInputEnvelope.fields,
  inputKind: Schema.Literal("document"),
  content: Schema.String,
  sections: Schema.Array(DocumentSection),
  declaredCompleteness: DeclaredCompleteness
}) {}

class VocabularyInput extends Schema.Class<VocabularyInput>("VocabularyInput")({
  ...SemanticInputEnvelope.fields,
  inputKind: Schema.Literal("vocabulary"),
  content: Schema.String,
  vocabularyKind: Schema.Literals(["base", "domain"]),
  namespace: Namespace
}) {}

const SemanticInput = Schema.Union([PromptInput, DocumentInput, VocabularyInput])
type SemanticInput = typeof SemanticInput.Type
```

已确认：接受 unified identity/provenance envelope + discriminated payload 作为 V1 输入根模型。

## 理论导出的实现约束

### D7：V1 Semantic IR 必须是 minimal frame-based IR

结论：已确认。这不是开放产品选择，而是由 L1 frame semantics 与 L3 Semantic IR 表达要求共同约束出的 V1 实现选择；精确 Schema 仍属实现设计。V1 Semantic IR 必须采用 **minimal frame-based Semantic IR**；不能只做扁平概念列表，也不在 V1 上完整实现知识图谱或形式逻辑。

建议结构：

```text
SemanticIr
  id
  inputRef
  environmentRef
  conceptBindings
  frameInstances
  relationAssertions
  unresolvedSpans
  competingInterpretations
  evidence
  decisionState

ConceptBinding
  termSpan
  lexicalSenseRef
  conceptRef
  bindingStatus: explicit | extracted | inferred | confirmed | derived
  confidence
  evidenceRefs

FrameInstance
  frameType
  roles
  polarity / condition / scope
  evidenceRefs

RelationAssertion
  subject
  predicate
  object
  assertionStatus
  evidenceRefs
```

V1 约束：

```text
必须支持
  action / target / prohibited_action
  concept binding
  simple relation assertion
  unresolved span
  competing interpretation
  evidence span
  decision state

主动延后
  通用 graph query
  自动形式逻辑推理
  完整 frame ontology
  任意深度嵌套事件结构
```

理由：

- 权威规范要求 Semantic IR 表达动作、目标、关系、条件、否定、范围、未解析内容、竞争解释和字段级原文依据；扁平概念列表满足不了这些 MUST 级约束。
- MVP Case C “审查 vs 直接修改” 不是概念识别问题，而是 action frame 与 prohibited action 的竞争解释问题。
- Semantic Lint 需要 relation assertions 与 evidence，不能只知道文档出现了哪些词。
- Correction 需要对当前 Case 语义状态应用 CaseSemanticEdit；如果 IR 没有 frame / role / relation 结构，纠错只能退化成重新解析。
- minimal frame-based IR 保留理论正确性，同时避免 V1 过早实现完整图数据库或形式逻辑。

已确认：minimal frame-based Semantic IR 是 V1 IR 形态的实现约束。

## 已对齐决策

### Q7：V1 Frame Schema 应完全泛化，还是区分 Kernel frame 与 Domain frame？

推荐答案：采用 **closed Kernel frames + open typed Domain frames**。

结论：已确认。V1 Frame Schema 采用 closed Kernel frames + open typed Domain frames。

不要用这种过松结构：

```text
FrameInstance
  frameType: string
  roles: Record<string, unknown>
```

建议结构：

```text
SemanticFrame =
  | RequestFrame
  | DomainFrame

RequestFrame
  frameKind: request
  action
  target
  prohibitedActions
  conditions
  scope
  evidenceRefs

DomainFrame
  frameKind: domain
  frameTypeRef
  roleBindings
  polarity
  condition
  scope
  evidenceRefs

RoleBinding
  roleRef
  value
  bindingStatus
  evidenceRefs
```

边界规则：

```text
Kernel-owned frames
  闭合 union，V1 先支持 request frame。
  因为 action / target / prohibited_action / clarify / reject 属于系统运行协议。

Domain-owned frames
  开放扩展，但必须通过 frameTypeRef / roleRef 指向 Semantic Package 中已声明或候选的 frame / role。
  不允许用裸 string role name 或 unknown object 绕过类型边界。
```

理由：

- 全泛化 `frameType: string` 会把类型严格退化成运行时约定，Correction 和 Regression 很难保证编辑目标存在。
- 全闭合 frame union 又会把所有领域语义都硬编码进 Kernel，违背 Domain Package 显式开启和可演进原则。
- Kernel frame 闭合能保护系统协议；Domain frame 用 typed refs 开放，能支持不完整 Vocabulary 和未来语义包成熟。
- Effect Schema 可以用 `Schema.Union([RequestFrame, DomainFrame])` 表达 frameKind 判别，同时让 role binding 通过 branded ref 保持可校验。

示例：用户输入。

```text
帮我检查这份退款方案是否完整，不要直接改。
```

Kernel-owned `RequestFrame`：

```text
RequestFrame
  frameKind: request
  action: validate
  target: doc-refund-plan
  prohibitedActions: [rewrite]
  evidenceRefs:
    - "检查" -> action=validate
    - "不要直接改" -> prohibitedActions includes rewrite
```

Domain-owned `DomainFrame`，来自被检查的退款方案：

```text
DomainFrame
  frameKind: domain
  frameTypeRef: refund:Refund
  roleBindings:
    - roleRef: refund:Refund.amount
      value: "100 元"
      bindingStatus: extracted
    - roleRef: refund:Refund.recipient
      value: refund:OriginalPurchaser
      bindingStatus: extracted
    - roleRef: refund:Refund.priorPayment
      value: unresolved
      bindingStatus: unresolved
```

这里 `RequestFrame` 影响系统能否执行、是否澄清、是否允许修改，所以由 Kernel 闭合定义。`DomainFrame` 描述领域内容，必须可由 Domain Package 扩展，但 role 必须引用 package 中声明或候选的 typed role。

已确认：接受 closed Kernel frames + open typed Domain frames 作为 V1 Frame Schema 规则。

## 已对齐决策

### Q8：V1 in-memory 存储应是 current-state store，还是 append-only ledger + derived views？

推荐答案：采用 **append-only ledger + derived current views**。

结论：已确认。V1 in-memory 存储语义采用 append-only ledger + derived current views。

建议结构：

```text
Evidence Ledger
  VocabularySourceImported
  SemanticInputCaptured
  SemanticIrProduced
  CaseOpened
  CorrectionCaptured
  CaseSemanticEditApplied
  PatchCandidateProposed
  RegressionCaseCreated
  PackageVersionPublished
  RegressionRunCompleted

Derived Views
  current package view
  active environment view
  latest case view
  patch candidate view
  regression suite view
```

V1 可以全部 in-memory，但写入语义仍然应按 append-only 事件或记录追加；current view 只作为可重建派生结果。

理由：

- 权威规范要求原始输入、Correction、Case、Patch、Regression 和 Package Version 可追溯、可回滚、可重建；普通 mutable store 很容易只保留最新状态。
- append-only ledger 能自然区分 evidence source 与 derived result，符合“事实证据不得被派生结果覆盖”。
- Regression 和 Patch 晋升需要知道“这次变化由哪些 Case / Correction 触发”，ledger 比 current-state map 更适合保留来源链。
- in-memory ledger 不等于上事件溯源基础设施；V1 只需要数组或 Map-backed repo，但行为模型必须是追加记录、派生视图。
- 以后替换成文件、SQLite、Postgres 或 event log 时，业务 contract 不需要重写。

已确认：接受 append-only ledger + derived current views 作为 V1 in-memory 存储语义。

## 已对齐决策

### Q9：V1 Correction 应保存自由文本，还是必须生成 typed CaseSemanticEdit？

推荐答案：Correction 必须保留用户原文，但当前 Case 修正必须通过 **typed CaseSemanticEdit** 落到当前 Case 的语义状态。

结论：已确认。Correction 保留原文作为 evidence source；当前 Case 修正通过 typed CaseSemanticEdit 消费模型落到当前 Case 的语义状态。

建议结构：

```text
Correction
  id
  caseId
  userText
  targetIrId
  capturedAt

CaseSemanticEdit =
  | ReplaceConceptBinding
  | ReplaceRequestAction
  | AddProhibitedAction
  | RemoveProhibitedAction
  | SetRoleBinding
  | MarkRoleUnresolved
  | SetDeclaredCompleteness
  | MarkFindingRejected
  | MarkLocalException
  | MarkInterpretationRejected

CaseSemanticEditApplied
  correctionId
  targetIrId
  edit
  beforeIrRef
  afterIrRef
```

V1 最小 edit 集合：

```text
ReplaceConceptBinding
  修正词项/词义/概念绑定错误

ReplaceRequestAction
  例如 rewrite -> validate

AddProhibitedAction / RemoveProhibitedAction
  例如 “不要直接改” -> prohibitedActions includes rewrite

SetRoleBinding / MarkRoleUnresolved
  修正 DomainFrame 的 role 绑定，或明确当前证据不足

SetDeclaredCompleteness
  例如 “这份文档就是完整规范” -> document section declaredCompleteness=complete

MarkFindingRejected
  用户否定当前 Lint Finding 的适用性

MarkLocalException
  表达只修正当前 Case，不晋升长期规则

MarkInterpretationRejected
  标记某个 competing interpretation 被用户否定
```

理由：

- 用户原文是证据，必须保留；但仅保存自由文本无法稳定修正当前 IR，也无法生成可比较 Regression Case。
- 权威规范要求当前 Case 立即修正，且 Correction 不得直接等于正式 Patch；typed CaseSemanticEdit 正好位于二者之间。
- Semantic Patch Candidate 可以从 CaseSemanticEdit + Diagnose 产生，而不是直接从用户自然语言猜一条长期规则。
- Regression 需要断言“旧错是否被修复”，这要求预期结果能定位到 frame、role、binding 或 interpretation，而不是一段自由文本。
- Effect Schema 可以把 edit operation 做成闭合 union，保证 headless-runtime 只能应用已定义、可测试、可审计的编辑。

已确认：接受 “Correction 保留原文 + typed CaseSemanticEdit 修正当前 Case 语义状态” 作为 V1 纠错模型。

## 已对齐决策

### Q10：Correction Diagnose 应用自由文本原因，还是闭合 Diagnosis union？

推荐答案：使用 **closed Diagnosis union with evidence**。允许附加说明文本，但 `diagnosisKind` 必须是闭合枚举。

结论：已确认。V1 使用 closed Diagnosis union with evidence；Correction、CaseSemanticEdit、CorrectionDiagnosis、SemanticPatchCandidate、RegressionCase 构成纠错到长期演化的五层模型。

建议结构：

```text
CorrectionDiagnosis =
  | LocalCaseBindingError
  | BaseLayerMissingOrWrong
  | DomainPackageMissingOrWrong
  | PackageSelectionError
  | ParserNegationScopeConditionError
  | LintRuleWrong
  | RuleScopeWrong
  | BusinessVersionChanged
  | LocalCorrectionOnly

CorrectionDiagnosed
  correctionId
  caseSemanticEditId
  diagnosis
  evidenceRefs
  rationale
```

Patch 生成规则：

```text
LocalCaseBindingError
  可生成 parser / binding 示例型 Semantic Patch Candidate，默认不改 Package 规则。

BaseLayerMissingOrWrong
  生成 Base scope Semantic Patch Candidate。

DomainPackageMissingOrWrong
  生成 Domain scope Semantic Patch Candidate。

PackageSelectionError
  生成 environment / activation / clarification policy 方向的 Semantic Patch Candidate。

ParserNegationScopeConditionError
  生成 parser example / regression，不直接改语义包断言。

LintRuleWrong
  生成 Rule Semantic Patch Candidate。

RuleScopeWrong
  生成 Scope Semantic Patch Candidate。

BusinessVersionChanged
  生成新 Package Version 候选，保留旧版本。

LocalCorrectionOnly
  不生成长期 Semantic Patch Candidate，只生成 Regression Case 或 local expected assertion。
```

理由：

- 权威规范要求长期补丁前必须先区分绑定、Package、Parser、Rule、Scope 或版本变化；自由文本分类无法驱动稳定的 Patch policy。
- 同一个 CaseSemanticEdit 可能对应不同长期动作：`SetRoleBinding` 可能是局部例外，也可能是 Domain Package 缺失，还可能是业务版本变化。
- Diagnosis 是 Correction 与 Semantic Patch Candidate 之间的必要中间层；没有它，系统会倾向于把一次纠错直接升级成规则。
- Effect Schema 的 closed union 能强制 headless-runtime 对每个 diagnosisKind 写出处理分支，遗漏时由类型和测试暴露。

已确认：接受 closed Diagnosis union with evidence 作为 V1 归因模型。

## 已对齐决策

### Q11：理论切片应如何转成 V1 Effect 验收单元？

推荐答案：每个 V1 能力都写成 **Executable Semantic Capability Spec**，由 Schema、Service contract、Layer fixture 和 `it.effect` 验收组成。

结论：已确认。Executable Semantic Capability Spec 是理论到 Effect 实现的 V1 验收单元。

建议模板：

```text
Capability Spec
  theoryInvariantRefs
  inputEvidence
  activeEnvironment
  expectedStructuredArtifacts
  requiredServices
  fixtureLayers
  effectTestCases
  regressionAssertions
```

每个能力切片必须同时落到：

```text
semantic-model
  Schema.Class / Schema.Union / branded ids
  expected structured artifact schemas

headless-runtime
  Context.Service contract
  deterministic Layer
  Effect.fn workflow
  typed errors

tests
  Schema decode fixtures
  it.effect end-to-end workflow
  regression rerun assertion
  tsgo --noEmit
```

示例：Prompt 动作歧义澄清能力。

```text
Theory
  I-16 影响动作的歧义必须打回
  I-17 澄清必须指向具体语义差异

Schema
  PromptInput
  RequestFrame
  CompetingInterpretation
  ClarificationDecision

Service
  SemanticParser
  RequestDecisionEngine

Layer
  DeterministicParser.layer
  InMemoryLedger.layer

Test
  it.effect("asks clarification when review and rewrite compete")
```

理由：

- 如果只写理论文档，后续 issue 派发容易丢失不变量。
- 如果只写代码任务，agent 容易实现局部功能但绕过理论约束。
- Capability Spec 把理论引用、Effect 类型、服务边界、fixture 和验收测试绑在一起，适合作为后续 PRD / issue 的原始材料。
- Effect 的优势在这里是让验收不止是“跑通流程”，还包括 Schema decode、typed error、Layer 替换、workflow 可追踪和 regression 可复跑。

已确认：接受 Executable Semantic Capability Spec 作为理论到 Effect 实现的 V1 验收单元。

## 已对齐决策

### Q12：后续 issue 派发应按 package 横向拆，还是按 capability 纵向拆？

推荐答案：按 **vertical capability slice** 拆 issue，不按 `semantic-model`、`headless-runtime`、`tests` 横向拆。

结论：已确认。后续 PRD / issue 按 vertical capability slice 拆分。

每个 issue 应包含：

```text
Capability Spec
  theoryInvariantRefs
  model schemas touched
  runtime services touched
  deterministic fixture layer
  it.effect acceptance tests
  regression assertions
  verify commands
```

反例：

```text
Issue 1: create all semantic-model schemas
Issue 2: create runtime services
Issue 3: add tests
```

这种拆法会让自动执行时产生大量未被闭环验证的类型和空 service，直到最后才发现理论对象边界不对。

V1 must-have capability scope：

```text
Capability 1: glossary vocabulary compiles into a published package
  Covers MVP Case A
  Blocked by: workspace package scaffold

Capability 2: active environment applies explicit domain package toggle
  Covers MVP Case B
  Blocked by: Capability 1

Capability 3: prompt action ambiguity produces clarification decision
  Covers MVP Case C
  Blocked by: Capability 1

Capability 4: document lint separates parse uncertainty, conformance, and unknown
  Covers MVP Case D and H
  Blocked by: Capability 1, Capability 2

Capability 5: correction applies CaseSemanticEdit and preserves evidence
  Covers MVP Case E
  Blocked by: Capability 3 or Capability 4

Capability 6: diagnosis controls local correction vs Semantic Patch Candidate proposal
  Covers MVP Case E and F
  Blocked by: Capability 5

Capability 7: domain Semantic Patch Candidate can publish a new PackageVersion after regression
  Covers MVP Case F
  Blocked by: Capability 6

Capability 8: regression rerun blocks patch that changes historical confirmed behavior
  Covers MVP Case G
  Blocked by: Capability 7
```

每个 capability 都可以横跨 `packages/semantic-model` 与 `packages/headless-runtime`，但必须保持单一验收闭环。

每个 issue 必须补齐：

```text
What to build
Blocked by
Theory invariant refs
Fixture inputs
Expected structured artifacts
Acceptance criteria
Regression assertions
Effect-specific acceptance
Verify commands
Labels, including ready-for-agent when executable
```

理由：

- V1 的风险不是文件结构，而是理论不变量能否穿透 Schema、Effect workflow 和 regression test。
- vertical slice 让每个 issue 都能独立被 `it.effect` 和 `pnpm verify` 验收。
- 自动 agent 更适合执行小闭环 issue；横向 issue 会鼓励“先铺结构，后补行为”，容易偏离最小闭环。

已确认：接受按 vertical capability slice 拆分后续 PRD / issue。

## 推荐实施顺序

### R13：第一条 vertical capability 从 Glossary Vocabulary Compile 开始

结论：由前置依赖推出，第一条 vertical capability 应先做 **Glossary Vocabulary Compile to Published Package**。

Capability Spec 草案：

```text
Capability
  glossary vocabulary can compile into a published package

Theory
  P-01 不完整语义是一等状态
  P-03 词项、词义和概念相互分离
  I-10 已发布版本不可原地改写
  I-11 运行结果必须绑定环境版本

Input Evidence
  VocabularyInput(kind=base, content="退款：将已支付金额返还给用户")

Expected Structured Artifacts
  VocabularySourceImported
  SemanticPackageDraft
  PublishedSemanticPackage
  PackageVersion
  Term / LexicalSense / Concept / Definition

Services
  VocabularyCompiler
  PackagePublisher
  SemanticLedger

Fixture Layer
  DeterministicVocabularyCompiler.layer
  InMemorySemanticLedger.layer

Acceptance Test
  it.effect("compiles glossary vocabulary into a published package")
```

验收要点：

```text
只从 “术语：定义” 生成 glossary-level package
保留 VocabularyInput 原文和 span
生成 Term / Sense / Concept / Definition 的分离结构
AI inferred relation / constraint 不得静默成为 published assertion
发布产生不可原地改写的 PackageVersion
写入 append-only ledger
所有输出通过 Effect Schema decode
```

理由：

- Vocabulary Source 是整个闭环的源代码；没有 Package Version，Active Environment、Semantic IR、Case、Regression 都缺少版本根。
- 这条 capability 能最小化落地 “不完整 Vocabulary 可运行” 和 “词项/词义/概念分离” 两个核心理论。
- 先做 Prompt parser 会缺少可绑定的 package；先做 Correction/Patch 会缺少 Case 和 Package 根。

## PRD 和 issue 状态

PRD 已发布到 GitHub issue `#1`。8 条 V1 must-have capability 已拆为 `#2` 到 `#9`，
并已完成第一轮 headless implementation。

当前本地文档补齐了实现后的状态材料：

- `docs/first-phase/v1-implementation-status.md`
- `docs/first-phase/v1-capability-fixtures.md`
- `docs/engineering/v1-usage.md`
- `docs/engineering/package-exports.md`

后续不是继续 to-prd，而是围绕剩余缺口开 follow-up issue。最明确的下一阶段缺口是
file-backed durable ledger Layer，已记录为 GitHub issue `#10`：当前 in-memory ledger 已证明
append-only 语义和 derived current view，但还没有跨进程持久审计能力。

## 不再需要继续追问的内容

```text
是否 headless
是否 monorepo
是否 Effect-first
是否 Schema-first
是否先 deterministic parser
是否 frame-based IR
是否 append-only ledger
是否 typed Correction / Diagnosis
是否 vertical issue slicing
```

结论：理论到实现的核心问题已经完成第一轮闭环。当前状态不是 to-prd blocked，
而是进入 post-V1-headless follow-up：补 durable ledger、真实 Provider、CLI/API/UI 等后续边界时，
继续服从本文和 ADR 的 Effect-first、Schema-first、vertical slice 约束。
