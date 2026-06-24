# 可迭代语义编译与运行系统
## 理论原则与架构不变量 v0.1

- **状态**：Draft
- **日期**：2026-06-24
- **适用范围**：产品定义、架构设计、数据建模、Semantic IR、LLM 调用、持久化、Semantic Lint 与迭代机制

---

## 0. 文档目的

本文档是系统的设计基线，用于固定在具体技术选型之前必须保持稳定的理论原则与架构不变量。

后续无论采用何种 LLM、数据库、DSL、图结构或服务架构，都不得破坏本文定义的核心行为。

本文使用以下规范词：

- **必须（MUST）**：不可牺牲的架构不变量。
- **应该（SHOULD）**：默认应遵守；偏离时必须说明原因。
- **可以（MAY）**：允许采用，但不是系统成立的前提。

---

## 1. 系统定义

本系统是一个：

> **可迭代、Vocabulary 驱动的语义编译、运行与验证系统。**

系统允许用户导入不完整的 Vocabulary，将其编译为可组合、可版本化的语义包，并使用当前激活的语义环境解析 Prompt、文档及 Vocabulary 本身。

系统生成可追溯的 Semantic IR，并据此执行：

- 请求消歧与澄清；
- 下游 LLM 或 Agent 的语义输入约束；
- 文档与 Vocabulary 的 Semantic Lint；
- 用户纠错后的当前实例修正；
- 语义补丁提议、回归与版本晋升。

系统不以一次性建立完整语义模型为前提，而以真实使用中的错误与纠正作为持续完善的主要信号。

---

## 2. 核心目标

### 2.1 语义执行

在当前已有语义条件下，尽可能准确、可解释地回答：

> 这段输入在当前语境中表示什么？

### 2.2 语义验证

在当前激活的语义契约下，回答：

> 当前解释是否满足已声明的定义、关系和约束？

### 2.3 语义进化

当 AI 在真实 Case 中理解错误时，将用户纠正转化为：

- 当前 Case 的正确解释；
- 可审计的纠错记录；
- 有作用域的语义补丁候选；
- 可重复运行的回归 Case；
- 经验证后可发布的新语义包版本。

### 2.4 尽快形成闭环

系统的第一阶段目标不是语义完备，而是尽快跑通：

```text
导入 → 解析 → 验证 → 纠错 → 回补 → 回归 → 再运行
```

---

## 3. 非目标

以下内容不属于第一阶段 Core：

- 自动构建完整传统用户画像；
- 从长期对话中自动决定哪些个人信息应永久保存；
- 自动激活领域包；
- 完整 OWL 本体与通用形式逻辑推理；
- 通用 Agent 规划与业务工作流执行；
- 对客观世界真假的最终判断；
- 基于单次纠错的自动全局学习；
- 以模型微调替代显式语义资产建设；
- 多 Agent 协作框架；
- 为所有自然语言建立完备语义表示。

这些能力未来可以作为上游生产者、下游消费者或增强模块接入，但不得反向污染 Core 的职责边界。

---

## 4. 系统总体模型

系统是一个产品和运行系统，内部包含两个工作面，并共享同一套语义对象、版本、来源与 Case 记录。

### 4.1 构建面（Build / Control Plane）

负责：

```text
Vocabulary 导入
→ 初步编译
→ 关系与约束候选提炼
→ 人工确认
→ 版本管理
→ 发布 Semantic Package
```

### 4.2 运行面（Runtime Plane）

负责：

```text
激活语义包
→ 组合 Active Semantic Environment
→ 解析 Prompt / Document
→ 生成 Semantic IR
→ 澄清、执行或 Semantic Lint
```

### 4.3 进化闭环（Evolution Loop）

横跨构建面和运行面：

```text
错误解释
→ 用户纠正
→ 当前实例修正
→ 错误归因
→ Patch Candidate
→ Regression
→ 新 Package Version
→ 再次运行
```

---

## 5. 语义层级

### 5.1 Semantic Kernel

系统不可关闭的最小语义机制，负责表达：

- 概念、词项、词义、关系和约束；
- 动作、目标、否定、条件、范围和优先级；
- 来源、作用域、版本、不确定性和生命周期；
- 解析、验证、纠错和版本晋升所需的基本协议。

Kernel 不是用户 Vocabulary，也不是领域知识包。

### 5.2 Base Semantic Layer

默认激活的基础语义层。

它承载用户与 AI 之间通用的沟通语义，例如：

- 用户如何使用某些高频表达；
- 什么动作需要明确授权；
- 某些词在默认情况下如何理解；
- 哪些歧义必须先澄清；
- 用户确认过的通用语义规则。

Base Layer 可以具有个人化结果，但 Core 不负责自动从长期对话中构建它。任何上游能力只要输出合法 Vocabulary，即可更新该层。

### 5.3 Domain Semantic Package

由用户显式开启的领域语义包。

领域包在其作用域内提供：

- 领域术语与定义；
- 词义与概念边界；
- 类型和业务关系；
- 业务约束；
- 正例、反例与消歧线索。

### 5.4 Active Semantic Environment

某次运行实际生效的语义环境：

```text
Semantic Kernel
+ Base Semantic Layer
+ 显式激活的 Domain Packages
+ 当前文档或会话的局部上下文
```

默认情况下，仅 Base Layer 生效；Domain Package 是显式开关。

---

## 6. 核心对象定义

### 6.1 Vocabulary Source

用户直接导入或编辑的人类友好源内容。

它可以只有：

```text
术语：定义
```

也可以逐步包含：

```text
A 是 B 的一种
A 依赖 B
每个 A 必须关联至少一个 B
A 与 B 不能同时成立
```

### 6.2 Semantic Package Draft

Vocabulary 初步编译后的草稿，包含：

- 可直接接受的显式内容；
- 从原文等价提取的结构；
- AI 推断的关系或约束候选；
- 冲突、歧义和缺失项；
- 待确认问题。

Draft 不是正式语义权威。

### 6.3 Published Semantic Package

经过确认并发布的、可被运行时激活的语义包版本。

### 6.4 Semantic IR

某段 Prompt、文档或 Vocabulary 在特定 Active Semantic Environment 下的结构化语义解释。

Semantic IR 至少应表达：

- 原始输入引用；
- 识别到的词项、词义和概念绑定；
- 动作、目标、关系、条件、否定与范围；
- 显式内容、推断内容和未解析内容；
- 竞争解释；
- 使用的 Package 与版本；
- 字段级原文依据；
- 解析不确定性；
- 当前决策状态。

### 6.5 Case

一次真实运行的完整上下文，包括：

- 原始输入；
- 激活的语义环境；
- 初始 Semantic IR；
- 系统输出；
- 用户反馈；
- 最终确认的解释。

### 6.6 Correction

用户对系统当前解释、绑定、规则适用或输出判断的显式修正。

### 6.7 Semantic Patch Candidate

由一次或多次 Correction 产生的长期语义修改建议。

Patch Candidate 必须声明：

- 修改目标；
- 作用域；
- 修改类型；
- 来源 Case；
- 推广理由；
- 可能影响；
- 回归结果；
- 当前生命周期状态。

### 6.8 Regression Case

可重复执行、具有预期语义结果的 Case，用于验证新版本是否：

- 修复目标错误；
- 保持历史正确行为；
- 正确暴露未知和歧义。

---

## 7. Vocabulary 成熟度

系统必须接受不同成熟度的 Vocabulary，并根据成熟度提供有限但真实的能力。

### Level 0：Glossary

包含术语和定义。

可支持：

- 术语识别；
- 定义注入；
- 别名归一；
- 基础词义消歧；
- 未定义术语提示；
- 简单定义漂移检查。

### Level 1：Relational Vocabulary

增加类型和业务关系。

可支持：

- 上下位与组成关系；
- 依赖、产生、包含等关系；
- 关系方向与概念类型检查；
- 更准确的 Prompt 和文档绑定。

### Level 2：Constrained Semantic Package

增加明确约束。

可支持：

- 必需关系检查；
- 数量、范围与互斥规则；
- 业务完整性 lint；
- 条件和例外验证。

### Level 3：Interpretation Examples

增加正例、反例、常见表达和消歧规则。

可支持：

- 更稳定的自然语言绑定；
- 更准确的澄清触发；
- 更强的 Case 相似性判断。

Vocabulary 成熟度不是单一总分。系统应该分别声明其当前支持的能力。

---

## 8. 核心理论原则

### P-01：不完整语义是一等状态

系统必须允许不完整 Vocabulary 进入运行。

缺少关系或约束时，系统应降低能力或返回未知，不得伪造完整语义模型。

### P-02：未知必须显式表达

系统必须区分：

- 已知且满足；
- 已知且违反；
- 证据冲突；
- 信息不足，无法判断。

“没有发现”不得自动等价为“不存在”。

### P-03：词项、词义和概念相互分离

相同词项可以在不同层或领域中绑定不同词义和概念。

系统不得因为名称相同而自动合并概念。

### P-04：原文、解释和验证相互分离

系统必须分别保存：

1. 用户或文档原文；
2. 系统对原文的语义解释；
3. 当前规则对该解释的验证结果。

任何一层的错误不得被伪装成另一层的问题。

### P-05：AI 是语义提议者，不是默认权威

AI 可以：

- 提取显式结构；
- 生成关系、约束和例外候选；
- 发现冲突；
- 生成澄清问题；
- 提出 Patch Candidate。

AI 不得未经授权将推断内容升级为正式语义。

### P-06：不得静默增强语义强度

系统不得将：

```text
可能 → 必须
常见 → 永远
相关 → 因果
单个 Case → 全局规则
定义暗示 → 强制约束
AI 推测 → 用户承诺
```

### P-07：语义始终具有作用域

任何长期语义断言、规则和例外都必须具有明确作用域。

可能作用域包括：

```text
Base
Domain
Project
Document
Session
Local Case
```

### P-08：领域语义在其作用域内优先

开启 Domain Package 后，领域定义在相应作用域内优先于 Base Layer。

这是一种上下文绑定与局部覆盖，不是对 Base Layer 的删除或改写。

### P-09：影响行为的歧义必须显式处理

当多个合理解释会导致不同动作、权限、成本或验证结论时，系统必须进入澄清流程，不得静默选择。

### P-10：当前 Case 优先修正

用户纠错后，系统必须优先修正当前 Case，使当前任务可以继续。

长期 Package 更新不得成为当前任务继续执行的前置条件。

### P-11：一次纠错不等于一条全局规则

Correction 首先是局部事实证据。

任何长期推广都必须经过作用域判断、补丁生成和回归验证。

### P-12：真实 Case 是核心语义资产

每次有效纠错都应尽可能形成：

- 当前实例修正；
- Correction 记录；
- Patch Candidate；
- Regression Case。

### P-13：最小变化与可回滚

语义更新应尽量只修改必要范围，并保留旧版本和变更原因。

系统必须能够撤销错误补丁并重建受影响的派生结果。

### P-14：语义资产优先于模型参数

第一阶段的主要学习对象是显式、可审计的资产：

```text
Vocabulary
定义
关系
约束
示例与反例
Case
Correction
Patch
Regression
```

模型替换或微调不得成为系统持续学习的唯一载体。

### P-15：薄内核，富记录

运行机制应保持尽可能简单；语义来源、解析过程、纠错历史和版本依赖必须充分记录。

> 逻辑可以先简单，历史不能丢失。

### P-16：能力由真实 Case 证明

一个 Package 是否成熟，不应只由概念和规则数量决定，而应由以下能力证明：

- 能正确处理哪些真实 Case；
- 能发现哪些歧义；
- 能正确拒绝哪些无依据判断；
- 能否在更新后保持历史正确结果。

---

## 9. 架构不变量

### 9.1 输入与表示不变量

#### I-01 原始输入不可丢失

任何 Semantic IR、Lint Report 或 Patch 都必须能够回指原始输入及具体片段。

#### I-02 Semantic IR 不是原文替代品

下游 LLM 或 Agent 应同时获得必要的原文、Semantic IR 和来源信息；不得只传递可能有损的结构化结果。

#### I-03 未映射内容必须保留

任何无法可靠结构化的内容必须进入 `unresolved` 或 `residual`，不得被静默丢弃。

#### I-04 语义状态必须显式

每条断言必须区分其状态，例如：

```text
explicit
extracted
inferred
confirmed
derived
```

#### I-05 解析不确定性与语义权威分离

模型解析置信度不等于语义断言的权威等级。

用户确认的低频规则可以高权威；AI 高置信推断仍可能只是 Draft。

---

### 9.2 Package 与上下文不变量

#### I-06 Base Layer 默认激活

没有显式开启 Domain Package 时，系统只使用 Kernel、Base Layer 和当前局部上下文。

#### I-07 Domain Package 必须显式激活

第一阶段不得由系统静默自动开启领域包。

系统可以推荐，但激活行为必须可见、可确认、可记录。

#### I-08 领域覆盖不得修改基础定义

领域包只能在自身作用域内覆盖默认绑定，不得破坏或重写 Base Layer 的原始断言。

#### I-09 冲突不得静默合并

多个 Package 对同一词项或规则给出竞争解释时，系统必须：

- 保留各自命名空间；
- 记录冲突；
- 给出最终选择理由；
- 必要时请求澄清。

#### I-10 已发布版本不可原地改写

Published Semantic Package 一经发布即不可静默修改。

所有正式变化必须形成新版本。

#### I-11 运行结果必须绑定环境版本

每个 Semantic IR、Lint Report 和 Case 必须记录当时激活的 Package 与版本。

---

### 9.3 运行时不变量

#### I-12 解析与验证必须分离

系统必须先回答“文本被解析成什么”，再回答“该解释是否符合规则”。

#### I-13 请求验证至少支持四态

Prompt 处理至少支持：

```text
pass
pass_with_assumptions
clarify
reject
```

#### I-14 Semantic Lint 至少支持四态

Lint 判断至少支持：

```text
supported
violated
conflicted
undetermined
```

#### I-15 未知不得伪装成违反

当模型缺少规则、文档范围未闭合或解析不足时，应返回 `undetermined`，而不是自动返回 `violated`。

#### I-16 影响动作的歧义必须打回

如果竞争解释会导致不同的修改、执行、权限或验证行为，系统必须请求最小必要澄清。

#### I-17 澄清必须指向具体语义差异

系统不得只返回“描述不清”。

澄清请求必须说明：

- 哪些解释存在竞争；
- 它们会导致什么不同结果；
- 用户需要提供哪一项最小信息。

#### I-18 所有结论必须可解释

任何执行决策或 Lint Finding 必须能说明：

- 采用了什么解释；
- 使用了什么规则；
- 规则来自哪个 Package 和版本；
- 对应原文是什么；
- 当前不确定性在哪里。

---

### 9.4 纠错与进化不变量

#### I-19 当前实例必须立即可修正

用户纠错后，系统必须能够对当前 Semantic IR 应用局部 Semantic Edit，而不是只能重新运行全流程并希望得到不同答案。

#### I-20 Correction 不得直接等于正式 Patch

Correction 是证据；Patch 是对证据的作用域化推广。

二者必须作为不同对象保存。

#### I-21 错误必须先归因再回补

系统在生成长期补丁前，必须区分至少以下来源：

```text
局部 Case 绑定错误
Base Layer 缺失或错误
Domain Package 缺失或错误
Package 选择错误
Parser 对否定、范围或条件的解析错误
Lint Rule 本身错误
Rule Scope 错误
业务事实发生版本变化
```

#### I-22 Patch 必须绑定真实 Case

任何长期 Patch Candidate 必须至少关联一个触发其产生的真实 Case。

不得发布来源不明的语义修改。

#### I-23 Patch 必须明确作用域

Patch 在晋升前必须明确属于：

```text
Base
某个 Domain
某个 Project
某类 Document
仅当前 Session
仅当前 Case
```

#### I-24 当前 Case 与长期晋升分离

当前 Case 修正可以立即生效；长期语义晋升必须独立审核。

#### I-25 正式晋升必须满足门槛

Patch 进入 Published Package 前，至少满足以下之一：

1. 用户明确确认；
2. 同类纠错重复出现，并经过作用域判断和回归验证。

涉及硬约束、权限或高影响行为时，应该要求明确确认。

#### I-26 发布前必须运行回归

任何 Package 新版本发布前，必须运行相关 Regression Cases。

#### I-27 修复不得无声破坏历史正确 Case

如果新 Patch 导致历史 Case 行为变化，系统必须明确展示影响并阻止静默发布。

#### I-28 所有长期变化必须可回滚

系统必须保留旧 Package 版本、Patch 来源和依赖关系，以支持撤销和重建。

---

### 9.5 Semantic Lint 不变量

#### I-29 Lint 判断的是契约符合度

Semantic Lint 只判断内容是否符合当前激活的语义包及其约束，不声称判断客观世界真相。

#### I-30 文档完整性必须有闭合范围

“没有写出某项内容”只有在当前文档、章节或对象被声明为完整规格时，才可直接构成缺失违规。

否则应优先报告 `undetermined` 或 warning。

#### I-31 解析不确定性与验证结果必须分别报告

示例：

```yaml
interpretation_confidence: 0.58
conformance: violated
```

其含义是：按当前解释违反规则，但当前解释本身不够确定。

#### I-32 Finding 必须可定位、可复现

每条 Lint Finding 必须包含：

- 原文位置；
- 解析后的概念或关系；
- 使用的规则；
- Package 及版本；
- 不确定性；
- 建议的澄清或修复方向。

---

### 9.6 持久化与依赖不变量

#### I-33 事实证据不得被派生结果覆盖

原始 Vocabulary、输入、用户 Correction 和确认记录是证据源，不得被编译结果或摘要替换。

#### I-34 派生对象必须可重建

Compiled Package、Semantic IR、Lint Report 等派生对象应该能够根据来源和版本重新生成。

#### I-35 纠错历史不得破坏性覆盖

Correction Ledger 应保留初始解释、用户纠正和最终解释，不得只保留最新结果。

#### I-36 派生结论必须记录依赖

Lint Finding、补丁和其他派生结论必须记录其依赖的：

- 原文或 Case；
- Semantic IR 版本；
- Package 及版本；
- 规则版本。

#### I-37 依赖变化必须触发失效或重算

当 Package、规则或 Semantic IR 发生变化时，系统必须能够识别哪些派生结果已过期。

---

## 10. 语义断言的最小状态模型

每条长期语义断言至少应具有以下独立维度：

```yaml
assertion:
  content: "Refund requires PaidOrder"

  epistemic_status:
    # explicit | extracted | inferred | confirmed | derived

  scope:
    # base | domain | project | document | session | local_case

  lifecycle:
    # draft | published | deprecated | superseded

  authority:
    # imported_source | ai | user | domain_owner

  evidence_status:
    # supported | contradicted | conflicted | unknown

  provenance:
    source_id: ...
    source_span: ...
    case_ids: [...]

  version:
    introduced_in: ...
    superseded_in: ...
```

这些维度不得被压缩为一个总 `confidence`。

---

## 11. 纠错晋升协议

一次用户纠错应按以下流程处理：

```text
1. Capture
   保存原始输入、初始解释和用户纠正

2. Local Fix
   立即修正当前 Case

3. Diagnose
   判断错误来自绑定、Package、Parser、Rule、Scope 或版本变化

4. Propose
   生成 Patch Candidate 或仅标记为 Local Correction

5. Scope
   明确 Base / Domain / Project / Document / Session / Local Case

6. Test
   将当前 Case 转换为 Regression Case，并运行相关历史 Cases

7. Promote
   用户确认，或满足重复证据与回归要求后发布新版本

8. Rebuild
   使新 Package Version 进入后续 Active Semantic Environment
```

系统应该允许 Patch 保持 Draft 状态，并在更多真实 Case 到来后再决定是否推广。

---

## 12. 最小可运行闭环（MVP Loop）

第一版必须完整跑通以下流程：

1. 导入一个只有“术语：定义”的 Base Vocabulary；
2. 可选导入并显式打开一个 Domain Vocabulary；
3. 输入一段 Prompt 或文档；
4. 生成最小 Semantic IR：
   - 概念绑定；
   - 动作与目标；
   - 关键约束；
   - 使用的 Package；
   - 原文依据；
   - 未解析项；
5. 给出以下结果之一：
   - 通过；
   - 带假设通过；
   - 请求澄清；
   - 无法判断；
   - Semantic Lint Finding；
6. 用户纠正一个错误解释；
7. 当前 Case 立即修正；
8. 保存初始解释、纠正和最终解释；
9. 生成 Patch Candidate；
10. 生成 Regression Case；
11. 新版本重新运行历史 Cases；
12. 展示修复效果与潜在回归。

只要该闭环成立，系统即可开始通过真实使用积累语义资产。

---

## 13. MVP 验收原则

第一版不以“支持多少理论”作为验收，而以真实闭环能力验收。

至少应通过以下场景：

### Case A：初级 Vocabulary 可立即使用

输入：只有“术语：定义”的 Vocabulary。

期望：系统能识别术语、使用定义辅助理解，并明确说明尚不能执行哪些关系或约束检查。

### Case B：领域开关改变词义绑定

Base Layer 与 Domain Package 对同一词项定义不同。

期望：领域开启时使用领域绑定；关闭后恢复 Base；两种概念均被保留，不发生静默合并。

### Case C：Prompt 动作歧义需要澄清

输入同时可能表示“审查”和“直接修改”。

期望：系统展示竞争解释，并提出最小澄清问题。

### Case D：解析不确定与规则违反分离

文档可能缺少必要关系，但某个表达也可能是该关系的别名。

期望：系统同时报告解析不确定性和当前验证结果。

### Case E：用户纠正只适用于当前 Case

用户明确说明当前语境是特殊例外。

期望：当前实例修正，但不自动修改 Base 或 Domain Package。

### Case F：用户纠正形成 Domain Patch

同一领域中的真实错误被用户确认是通用业务规则。

期望：生成有作用域、有来源的 Patch Candidate，并通过回归后形成新版本。

### Case G：补丁破坏历史正确行为

新补丁修复当前 Case，但改变一个历史确认正确的 Case。

期望：系统阻止静默发布并展示冲突。

### Case H：未知不被当作违规

Vocabulary 尚无相关约束，或文档未声明完整范围。

期望：系统返回 `undetermined`，而不是伪造 `violated`。

---

## 14. 简洁落地原则

后续架构设计应遵守：

> **不变量严格，具体机制简单。**

因此：

- 第一版可以不使用图数据库；
- 第一版可以不实现完整形式逻辑；
- 第一版可以主要依赖 LLM 生成候选解释；
- 第一版可以人工确认 Patch；
- 第一版可以只支持少量关系和约束句式；
- 第一版可以采用简单版本存储；

但不得省略：

- 原始输入；
- Package 与版本；
- Semantic IR；
- 来源与作用域；
- Correction Ledger；
- Patch Candidate；
- Regression Case；
- 解析与验证分离；
- 未知状态；
- 可回滚历史。

任何新增组件都应该回答：

> 它是否直接改善导入、解析、验证、纠错、回补或回归闭环？

不能直接贡献于闭环的能力原则上延后。

---

## 15. 下一阶段需要设计，但本文暂不固定的内容

以下内容进入架构设计阶段决定：

- Vocabulary 的人类友好格式与严格模式；
- Compiled Semantic Package Schema；
- Semantic IR Schema；
- 关系与约束的第一版最小集合；
- Package import、namespace 和 version 规则；
- LLM 与确定性解析器的职责划分；
- 澄清策略；
- Patch Candidate 的审核界面；
- Case 与 Regression 的存储模型；
- 派生结果失效和重算机制；
- MVP 的服务边界与交互流程。

这些技术与产品选择可以调整，但必须服从本文的不变量。

---

## 16. 当前已确认的产品立场

1. 这是一个系统，而不仅是一份知识图谱或一个 Prompt 模板。
2. 系统接受不完整 Vocabulary。
3. “术语：定义”是合法且有价值的起点。
4. 从初级词表提炼关系和约束是系统的上层增强能力。
5. AI 全程参与，但推断不能静默晋升为正式语义。
6. 默认只激活 Base Semantic Layer。
7. Domain Package 是用户显式控制的开关。
8. 领域语义在其作用域内优先于基础语义。
9. Semantic Lint 检查的是对当前语义契约的符合度。
10. 用户纠错是系统迭代的核心真实信号。
11. 当前 Case 立即修正，长期规则独立晋升。
12. 正式 Patch 必须有来源、作用域、版本和回归结果。
13. 系统应尽快上线，通过错误驱动完善。
14. 第一版以最小可运行语义闭环为目标，避免过度设计。

---

## 17. 一句话架构约束

> 系统必须允许不完整语义先运行，在保留原文、解释依据、作用域和版本的前提下生成可验证的 Semantic IR；当 AI 在真实 Case 中犯错时，用户纠正必须能够立即修正当前实例，并经过归因、补丁、回归和版本晋升，成为未来可复用且可回滚的语义资产。

---

## 18. 文档变更规则

本文档本身也应采用版本化管理。

对以下内容的修改应视为重大版本变化：

- 系统定义；
- 核心目标；
- Base 与 Domain 的关系；
- 用户纠错的晋升方式；
- Semantic Lint 的判断边界；
- 任何 MUST 级架构不变量。

具体 Schema、API、数据库和模型选型的变化，不必修改本文，除非它们改变了上述原则。
