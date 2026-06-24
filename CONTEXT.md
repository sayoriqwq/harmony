# 项目上下文

## 项目

Harmony 是一个早期设计仓库，目标是定义一个可迭代、Vocabulary 驱动的语义编译、运行、验证与演化系统。

系统接受不完整的 Vocabulary Source，将其编译为可组合、可版本化的 Semantic Package；再用当前 Active Semantic Environment 解析 Prompt 和文档，生成可追溯的 Semantic IR；最后把真实使用中的用户 Correction 转化为当前 Case 的 CaseSemanticEdit，并在诊断允许时生成有作用域的 Semantic Patch Candidate 和 Regression Case。

## 领域语言

使用当前文档已经确立的术语：

- Vocabulary Source：用户直接导入或编辑的人类友好源内容，可以只有术语和定义。
- Evidence Source：用于审计和追溯的原始语义证据，包括用户输入、Vocabulary Source、文档原文和 Correction；它保留人类表达及上下文，不等同于系统消费的结构化解释。
- Structured Semantic Artifact：由 Evidence Source 派生出来的结构化语义对象，用于解析、验证、纠错、回归和演化；它必须能追溯回对应的 Evidence Source。
- Semantic Package Draft：Vocabulary 初步编译后的草稿，可能包含显式内容、提取结构、AI 候选、冲突和待确认问题。
- Published Semantic Package：经过确认并发布的、可被运行时激活的语义包版本。
- Active Semantic Environment：Semantic Kernel、Base Semantic Layer、显式激活的 Domain Package 和局部上下文的组合。
- Semantic IR：某段 Prompt、文档或 Vocabulary 在特定 Active Semantic Environment 下的结构化语义解释。
- Semantic Lint：检查内容是否符合当前激活语义包及其约束，不判断客观世界真假。
- Case：一次真实运行的完整上下文，包括输入、语义环境、初始 IR、系统输出、用户反馈和最终解释。
- Correction：用户对系统解释、绑定、规则适用或输出判断的显式修正。
- CaseSemanticEdit：Correction 在单个 Case 内落成的结构化局部修正，用来修正当前 Case 的解释、绑定或判断；它不是长期语义资产。
- Correction Diagnosis：对 Correction 成因的结构化归因，说明问题应停留在当前 Case，还是应提出有作用域的长期语义修改。
- Semantic Patch Candidate：由一个或多个 Correction 产生的、有作用域的长期语义修改建议。
- Regression Case：可重复执行的 Case，用来验证新版本是否修复目标错误，并保持历史正确行为。

## 当前产品立场

第一阶段目标是跑通最小语义闭环：

```text
导入 -> 解析 -> 验证 -> 纠错 -> 回补 -> 回归 -> 再运行
```

核心约束：

- 不完整语义是合法输入。
- 未知、冲突、违反和支持必须分别表达。
- 词项、词义和概念必须分离。
- 原文、系统解释和验证结果必须分离。
- Evidence Source 保留审计，系统消费 Structured Semantic Artifact。
- AI 是语义提议者，不能静默把推断晋升为权威规则。
- Base Semantic Layer 默认激活。
- Domain Semantic Package 必须显式开启。
- 当前 Case 立即修正；长期晋升需要单独限定作用域、测试、版本化和确认。
- 显式语义资产和真实 Case 优先于不可审计的模型参数学习。
- 内核要薄，记录要丰富。

## 文档层级

- `docs/README.md`：文档地图、阅读顺序、权威关系和单一职责边界。
- `docs/concept.md`：L0 产品定义，说明系统是什么、核心闭环、产品立场和非目标。
- `docs/theory/research-map.md`：L1 理论依据，整理外部理论与系统设计之间的映射。
- `docs/first-phase/mvp-loop-principles.md`：L2 第一阶段落地原则，说明如何用最小机制跑通闭环。
- `docs/first-phase/semantic-system-principles-v0.1.md`：L3 当前权威规范，固定原则、不变量、MVP 验收和重大变更规则。
- `docs/first-phase/v1-effect-implementation-alignment.md`：V1 PRD 和 issue 派发前的实现对齐材料。
- `docs/adr/`：已经接受且会约束后续实现的架构取舍。
- `docs/engineering/effect.md`：本仓库编写 Effect 代码的工程入口和 harness 阅读顺序。

## ADR

架构决策放在 `docs/adr/`。当前已记录：

- `0001-build-v1-as-headless-effect-semantic-core.md`
- `0002-use-effect-schema-as-semantic-model-source-of-truth.md`
- `0003-separate-evidence-sources-from-structured-semantic-artifacts.md`
- `0004-model-correction-evolution-through-diagnosis.md`
- `0005-split-v1-work-into-vertical-capability-slices.md`
