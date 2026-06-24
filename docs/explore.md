可以。这一轮查下来，一个很明确的结论是：

没有某一套现成理论可以完整覆盖你的系统。
你的方案位于术语工程、知识表示、语义解析、约束验证、交互式知识获取和知识演化的交叉处。

作为内部理论名称，我建议暂时叫：

可迭代语义工程
Iterative Semantic Engineering

它研究的不是“怎样一次性建立正确本体”，而是：

如何让一个不完整的语义模型先运行，在真实交互中暴露错误，再由用户纠错驱动它逐渐成熟，同时保持可解释、可回滚和不破坏已有正确案例。

其中，刚刚找到的 Ripple-Down Rules 和你的 self-loop 几乎是正面命中。

⸻

一、最重要的理论地图

现在与你需求最吻合的理论可以分成四组：

理论组	对应你的系统
术语学、SKOS、OntoLex、Frame Semantics	Vocabulary 如何转化为可运行语义
渐进形式化、Gradual Typing、SHACL、契约	不完整 Vocabulary 如何运行和 lint
Context、Defeasible Reasoning	基础层和领域包如何组合与覆盖
Interactive Semantic Parsing、RDR、Machine Teaching、CBR	用户纠错如何形成 self-loop
Belief Revision、TMS、PROV、Competency Questions	补丁如何晋升、回归、追踪与演化

它们不是要全部照搬，而是分别给你提供架构原则。

⸻

二、术语、概念和词义必须分开

这是 Vocabulary Compiler 最基础的理论。

ISO 704 区分对象、概念、定义和名称；SKOS 也明确区分概念与概念的文字标签；OntoLex-Lemon 进一步建模词条、词形、词义以及它们对概念或本体对象的指向。换句话说，一个词并不等于一个概念。 

你的内部结构不应该只是：

账户
  definition: ...

而应该接近：

Surface Form
“账户”
    ↓
Lexical Entry
账户
    ↓
Lexical Sense
├── 登录身份意义
└── 财务科目意义
    ↓
Concept
├── base:UserAccount
└── finance:LedgerAccount

这直接解决了基础层与领域包的问题。

默认只开启基础层时：

“账户” → base:UserAccount

开启财务领域包时：

“账户” → finance:LedgerAccount

这不是财务包把基础定义删除了，而是当前上下文选择了另一个 sense → concept 绑定。

因此，你的 Vocabulary Package 至少需要区分：

Term       用户实际说出的词
Sense      这个词在某个上下文中的含义
Concept    稳定的语义对象
Definition 对概念的自然语言描述

这是领域开关能够可靠工作的前提。

⸻

三、Semantic IR 不应该只有“节点和边”

你之前最早想到的是给平级概念建立关系。这当然需要，但仅有知识图谱还不够处理 Prompt 和文档。

Frame Semantics 的核心观点是：词语经常唤起某种情景框架，而框架中存在参与角色。例如运输框架可能包含移动者、工具、路径、起点和终点；FrameNet 正是围绕 frame、lexical unit 和 frame element 建立语义资源。 

例如初级定义：

退款：将已支付金额返还给用户。

系统不应只提炼：

Refund related_to PaidAmount
Refund related_to User

而可以生成一个候选 Frame：

frame: Refund
roles:
  prior_payment:
    concept: Payment
    status: inferred
  amount:
    concept: MoneyAmount
    status: extracted
  recipient:
    concept: User
    status: extracted
  action:
    concept: ReturnFunds
    status: extracted

这种表示有两个优势：

1. 它知道各个概念在事件中扮演什么角色，而不是只知道它们“相关”。
2. 它可以做缺位检查，例如某份退款方案有没有说明退款对象、金额或原支付记录。

你的 Semantic IR 最终很可能需要同时包含两种结构：

Concept Graph
用于表示概念之间的长期关系
Frame Instance
用于表示当前 Prompt 或文档具体说了什么

例如：

request_frame:
  action: validate
  target: RefundPolicy
  prohibited_action:
    - rewrite
domain_frames:
  - type: Refund
    roles:
      prior_payment: unresolved
      amount: PartialAmount
      recipient: Customer

这比纯三元组更适合作为 LLM 的思考输入。

⸻

四、不完整 Vocabulary 的理论基础：渐进形式化

你接受只有“术语：定义”的初级输入，这在理论上可以对应两条路线。

1. Ontology Maturing

Ontology Maturing 把本体建设看成一种逐步成熟的过程：从非正式标签和概念想法开始，逐渐形成更正式的结构，而不是要求用户一开始就完成严密本体。相关研究强调将形式化过程融入日常工作，而不是单独开展一次巨大的知识工程项目。 

这与你的路径高度一致：

词语
→ 定义
→ 概念区分
→ 关系
→ 约束
→ 例外
→ 可验证语义

2. Gradual Typing

Gradual Typing 原本用于编程语言，它允许静态类型和动态类型共存，并让程序逐步从较少类型信息演化到更严格的类型信息。 

把它迁移到你的系统里，可以形成：

Gradual Semantics／渐进语义类型

例如：

concept: Refund
definition:
  status: known
relations:
  status: partial
constraints:
  status: unknown
examples:
  status: sparse

因此，一个 package 不是简单地：

完整 / 不完整

而是分别声明它当前具备什么能力：

capabilities:
  lexical_normalization: supported
  concept_disambiguation: partial
  relation_validation: partial
  completeness_lint: unsupported
  constraint_validation: unsupported

这是一个极其重要的原则：

缺少约束，不等于违反约束；它只代表当前模型无法判断。

Vocabulary 越成熟，系统能够做的检查越严格，但早期 Vocabulary 依然可以立即用于术语归一、定义提示和基础消歧。

⸻

五、Semantic Lint 的理论基础：契约与 Shapes

SHACL 把待验证的数据图和用于验证的 Shapes Graph 分开：一个表达当前数据是什么，另一个表达数据必须满足哪些条件，然后生成验证报告。 

这很适合你的系统：

Document
   ↓ Semantic Parser
Document Semantic IR
   ↓
Compiled Package Constraints
   ↓
Semantic Lint Report

例如 Vocabulary 中有：

每个项目目标必须由至少一个指标衡量。

编译为：

shape: GoalShape
target: Goal
required_relation:
  predicate: measured_by
  object_type: Metric
  min_count: 1

文档解析结果：

instance:
  type: Goal
  text: 提升新用户体验
  measured_by: []

然后才产生：

conformance: violation
rule: goal-requires-metric

这里要保持三个对象严格分离：

文档原文
系统对原文的解释
语义规则对解释结果的判断

否则系统会把“AI 没识别出来”错误地报告成“文档没有”。

⸻

六、Semantic Lint 不应该只有通过和失败

知识系统常常要面对两种现实：

信息不足
信息彼此冲突

Belnap-Dunn 一类四值逻辑正是为了处理不完整和不一致信息，而不是强迫所有内容只能是真或假。 

你的 lint 可以借鉴四种状态：

状态	含义
supported	当前证据支持满足规则
violated	当前证据明确违反规则
conflicted	同时存在支持和反对证据
undetermined	信息不足，暂时无法判断

例如：

领域要求：退款必须关联已支付订单。

文档没有提到订单，并不一定直接等于 violation。

它可能是：

conformance: undetermined
reason: 文档可能不是完整业务规格

只有当当前文档或章节声明自己是完整规格时，缺失才可以升级为：

conformance: violated
reason: 当前文档承诺描述完整退款流程

这就是：

全局开放世界，局部闭合验证。

OWL、SKOS 一类知识表示通常采用开放世界思维；SHACL 则提供了针对实际数据图的约束验证机制。你的系统不宜全局假定“没有写就是不存在”，而应由具体规则声明在哪个范围内可以做闭合检查。 

此外，下面两个维度不能混为一个：

parse_confidence: 0.61
conformance: violated

它表示：

按照当前解析，规则确实被违反；但当前解析本身不够确定。

而不是简单输出一个：

confidence: 0.61

一个总分会把“没理解清楚”和“理解后发现不符合”混在一起。

⸻

七、基础层和领域包：Context 与 Defeasible Reasoning

Contextualized Knowledge Repository 研究一种两层知识结构：全局上下文保存通用知识，局部上下文保存特定知识；全局知识可以传播到局部，但局部可以在具有明确理由时覆盖通用规则。 

这与你的设计非常接近：

Global Context
= Base Semantic Layer
Local Context
= Activated Domain Package

但它提示了一个重要修正：

领域包优先不应被实现为简单的数字优先级覆盖。

更合理的是：

base_assertion:
  term: 账户
  sense: UserIdentity
domain_assertion:
  package: finance
  term: 账户
  sense: LedgerAccount
  scope: finance
  overrides:
    - base_assertion
  justification:
    - active_domain_is_finance

领域包开启后：

使用领域绑定
保留基础绑定
记录为什么发生覆盖

关闭领域包后，基础绑定自然恢复。

多个领域包同时开启并发生冲突时：

finance:Account
identity:Account

系统不能靠一个全局 priority=100 随便选，而应：

1. 根据当前对象和文本上下文判断；
2. 保留竞争解释；
3. 影响结果较大时请求用户澄清。

所以，你的领域开关理论上不是“加载更多提示词”，而是：

激活一个新的语义上下文和局部默认规则集合。

⸻

八、Prompt 打回：Interactive Semantic Parsing

Model-based Interactive Semantic Parsing 把语义解析建模为一个有状态过程：系统维护当前语义解析，检测哪里可能有错误，决定是否需要用户介入，再通过提问更新当前状态。它明确拆出了 world model、error detector 和 actuator。 

这可以直接映射为：

Semantic State
当前解析到哪里
Uncertainty Detector
哪里存在竞争解释或缺失
Clarification Policy
哪个问题最值得问
State Transition
用户回答后怎样修改 IR

例如：

帮我看看这份方案并优化一下。

当前状态：

candidates:
  - action: review
  - action: rewrite
impact_difference: high

系统应该追问，而不是继续猜。

NL-EDIT 进一步研究了：将用户的自然语言纠正转换为对原始语义解析的一系列编辑，而不是完全抛弃原解析重新生成。 

因此用户说：

我不是让你重写，只是检查。

系统内部最好生成：

semantic_edit:
  remove:
    - action: rewrite
  retain:
    - action: review
  add:
    - prohibited_action: rewrite

这会让纠错变得：

可比较
可存储
可回放
可推广

而不是仅仅把用户纠错重新塞给 LLM 再问一遍。

另外，语义解析模型的置信度并不天然可靠，不同任务上的校准表现也可能明显不同，因此打回阈值应根据历史真实案例校准，而不能依赖 LLM 自己说“我有 90% 把握”。 

⸻

九、你的 self-loop 最接近 Ripple-Down Rules

这是这轮理论探索里最关键的发现。

Ripple-Down Rules 是一种增量知识获取方法。它不是先要求专家建立完整知识库，而是在系统投入日常使用后：

系统对某个 Case 给出错误结论
→ 专家纠正
→ 增加一条只针对该上下文的例外规则
→ 保存促成这次纠正的 Case
→ 检查新规则不得破坏已有正确 Case

其中保存下来的旧案例被称为 cornerstone cases。新规则必须能够区分当前错误案例和此前已经正确处理的案例，从而在增量建设过程中尽量保持已有性能。 

这几乎就是你描述的：

接受不完整 Vocabulary
→ AI 在真实 Case 中犯错
→ 用户纠正
→ 回补语义
→ 防止未来再犯

你可以直接吸收 RDR 的四条原则：

1. 不要求完整前置建模

系统可以尽快上线，通过错误逐步补齐。

2. 知识必须保留其获得时的上下文

用户在退款领域纠正的规则，不能自动推广到所有领域。

3. 每个长期补丁必须绑定真实 Case

不能出现来源不明的“系统觉得应该这样”。

4. 新补丁必须经过 Cornerstone Case 回归

修复当前错误时，不能破坏历史上已经确认正确的理解。

不过，不建议直接采用传统 RDR 的二叉规则树作为你的总体存储结构。你的对象包括词义、Frame、关系、约束、Package 和解析规则，比传统分类规则复杂得多。

更合适的是：

采用 RDR 的知识获取协议，而不是照搬它的规则树结构。

你的版本可以叫：

Semantic Ripple-Down Maintenance

⸻

十、Interactive Machine Teaching：用户不是标注员，而是教师

Interactive Machine Teaching 把人看作主动教师，而不只是提供正确／错误标签的人。教师可以分解概念、给出语义特征、规则和解释，并通过可理解的语义模型调试系统。相关研究也强调需要一种足够有表达力、同时又便于领域用户使用的 teaching language。 

这解释了为什么你的“个人层”不是普通用户画像。

用户不是在告诉 AI：

我喜欢简洁回答

而是在教它：

在我这里，“看看”默认不包含重写。
“优化”必须先区分建议修改和直接修改。
没有明确授权时，不改变原文。

这是一套：

个人化的语义教学结果。

因此，基础层可以理解为：

默认激活的、由长期互动教学形成的 Semantic Package

但“怎样从对话中发现值得教学的内容”仍然可以放在上层；Core 只需要支持接受纠正、形成补丁和管理其晋升。

⸻

十一、Case-Based Reasoning：Case Ledger 不是日志

Case-Based Reasoning 的经典循环是：

Retrieve  检索相似历史案例
Reuse     复用历史案例中的方案
Revise    根据当前情况修正
Retain    保存新的有效经验

它把已经解决的具体案例作为未来推理和学习的资源。 

这意味着你的 Case Ledger 不应只是审计日志。

运行时可以先做：

当前 Prompt
    ↓
检索相似的历史纠错 Case
    ↓
判断过去是否发生过相同的误解
    ↓
将历史语义编辑作为解析先验

例如，用户已经三次纠正：

“看一下”不代表直接修改

下一次出现类似表达时，即使这条规则尚未晋升为全局硬规则，相关 Case 也可以帮助解析器降低 rewrite 候选的权重。

但 CBR 只会积累案例，不一定自动形成通用规则。因此它应当与 RDR 配合：

CBR 负责利用案例
RDR 负责从错误形成有作用域的规则补丁

⸻

十二、Belief Revision：纠错到底是“改错了”，还是“情况变了”

用户纠错后，系统不能一律执行：

删除旧规则
添加新规则

Belief Revision 研究的是：收到与当前知识冲突的新信息时，怎样以尽可能小的改动修订已有信念。AGM 路线中的核心思想之一就是在接纳新信息时追求合理的最小变化。 

在你的系统里，Correction Diagnoser 至少应区分：

类型	含义	处理方式
revision	原有语义本来就错了	修改原 Package
update	业务或用户约定发生变化	发布新版本，保留旧版本
exception	只在当前条件下不同	添加局部例外
binding_error	规则没错，词义绑定错了	修改解析或领域选择
parse_error	AI 漏掉否定、范围等	修复 Parser 或解析示例
local_correction	只修正当前 Case	不晋升长期规则

例如：

“退款以前必须回原支付渠道，现在允许退到余额。”

这更像业务规则的 update。

而：

“这个特殊客户允许线下退款。”

更像 exception。

两者不能以同一种覆盖方式保存。

⸻

十三、Truth Maintenance：规则变化后，哪些结论应失效

Truth Maintenance System 会记录一个结论成立的理由和依赖关系；新增或撤回信息时，系统可以沿依赖关系更新相关信念。 

这对你的持久化层非常重要。

假设：

Rule R1:
每个退款必须绑定原支付订单
Document D1:
没有显式写订单
Lint L1:
D1 违反 R1

以后 R1 被修订为：

线下补偿退款可以没有原支付订单

系统应知道：

哪些 Lint Report 依赖旧版 R1
哪些文档需要重新解析或重新 lint
哪些补丁是基于旧规则提出的

因此每个派生结论都应有依赖图：

lint_finding:
  derived_from:
    - document_parse:D1@v3
    - rule:R1@v1
    - package:refund@1.2
  invalidated_by:
    - rule:R1@v2

这会让你的系统从“存一堆版本”升级为真正可维护的语义运行环境。

⸻

十四、PROV：所有语义都要知道自己从哪里来

W3C PROV 提供了一套表示实体、活动、参与者及其派生关系的通用模型，目的就是交换和追踪 provenance 信息。 

你的每条语义断言都至少需要：

assertion:
  content: Refund requires PaidOrder
  origin:
    type: user_correction
    case_id: case-183
  generated_by:
    activity: semantic_patch_proposal
  agent:
    proposer: AI
    confirmer: user
  status:
    epistemic: confirmed
  scope:
    package: commerce.refund
  version:
    introduced_in: 1.4.0

Provenance 不只是为了审计，它还决定：

冲突时相信谁
能否自动晋升
被撤销时影响什么
是否可以跨领域复用

⸻

十五、Competency Questions：不要问“模型完整了吗”

本体工程中的 Competency Questions 是一组模型应该能够回答的问题，用于确定范围和评价模型是否满足目标。研究中，它们主要被用于定义本体范围和评价概念模型。 

对你的系统，可以把它改造成：

Executable Semantic Cases

例如退款包不需要声称“完整表达退款领域”，而是声明：

它应该能回答：
1. 这段描述中的“退款”是否被误用成撤销支付？
2. 一个退款方案是否说明了原交易？
3. 用户是在要求检查，还是要求修改？
4. 文档是否遗漏了该规则要求的关键关系？

每次用户纠错，都自动生成新的能力问题：

competency_case:
  environment:
    - base
    - commerce.refund
  input:
    "不要替我改，只检查这个退款方案是否完整。"
  expected:
    action: validate
    prohibited_action: rewrite
    target: RefundPlan

因此，一个 Package 的“完成度”不应通过概念数量衡量，而应通过：

它能正确处理哪些真实问题
它覆盖哪些 Case
它在哪些条件下知道自己不能判断

来衡量。

⸻

十六、Semantic Lifting：AI 怎样从定义提出更丰富的模型

Ontology Learning from Text 研究从文本中逐渐提取术语、概念、分类关系、其他关系以及公理。早期工作中常见的“ontology learning cake”也是从词项一路走向概念、关系和规则。 

这正是你的上级能力：

术语：定义
    ↓
概念候选
    ↓
Frame 和角色候选
    ↓
关系候选
    ↓
约束候选
    ↓
用户确认

但要遵守一个不可破坏的原则：

模型提取 ≠ 用户承诺
统计常见 ≠ 领域规则
定义暗示 ≠ 强制约束

例如：

退款：将已支付金额返还给用户。

系统可以提出：

candidate:
  Refund references Payment

但不能静默提升为：

confirmed_constraint:
  Every Refund must reference exactly one PaidOrder

后者增加了：

每个
必须
恰好一个
已支付订单

这些语义强度均不是原定义明确提供的。

Controlled Natural Language 可以成为未来的“严格编辑模式”。Attempto Controlled English 一类受控语言通过限制语法和解释规则，将较自然的表达转换为明确形式表示。 

产品上可以形成两种写法：

宽松模式：
退款通常关联原订单。
严格模式：
每个退款必须关联至少一个已支付订单。

宽松模式允许候选解释；严格模式能够直接编译为约束。

⸻

十七、统一后，你的理论对象应该有五层

综合这些理论，我建议你的内部模型不要只有“Vocabulary + Graph”，而是五层：

1. Lexical Layer
   term / form / alias / sense / language cue
2. Conceptual Layer
   concept / frame / role / typed relation
3. Normative Layer
   constraint / shape / default / exception
4. Context Layer
   base / domain / document / session
   import / activation / override / fallback
5. Learning & Evidence Layer
   case / correction / semantic edit
   patch / regression / provenance / version

对应运行流程：

Vocabulary Source
        ↓
Lexical + Conceptual Compilation
        ↓
Draft Semantic Package
        ↓
AI Semantic Lifting
        ↓
User Confirmation
        ↓
Published Package
        ↓
Active Context
        ↓
Prompt / Document Parsing
        ↓
Frame-based Semantic IR
        ↓
Contract Validation
        ↓
Execute / Clarify / Reject / Lint
        ↓
User Correction
        ↓
Semantic Edit
        ↓
RDR-style Scoped Patch
        ↓
Cornerstone Regression
        ↓
New Package Version
        ↺

⸻

十八、不要把不同状态压缩成一个 Confidence

每条断言最好拥有多个互相独立的维度：

assertion:
  epistemic_status:
    explicit | extracted | inferred | confirmed | derived
  scope:
    base | domain | project | document | session
  evidence_status:
    supported | contradicted | conflicted | unknown
  lifecycle:
    draft | published | deprecated | superseded
  parse_confidence:
    0.0 - 1.0
  authority:
    imported_source | AI | user | domain_owner
  provenance:
    source_case
    source_span
    package_version

例如：

statement:
  Refund requires PaidOrder
epistemic_status: inferred
scope: commerce.refund
evidence_status: supported
parse_confidence: 0.82
lifecycle: draft
authority: AI

这表示：

AI 有一定把握从材料中推测了这条关系，并且现有案例支持它，但它仍然不是已发布的领域规则。

这比一个模糊的：

confidence: 0.82

安全得多。

⸻

十九、哪些理论现在不宜过早采用

完整 OWL／描述逻辑

OWL 适合需要正式蕴含和自动推理的领域，但它并不是文档结构验证语言；W3C 的 OWL Primer 也明确提醒，OWL 不适合用来要求某条信息必须显式出现在文档中。 

第一版可以借鉴其概念，但不必直接把全部 Package 编译成 OWL。

把 SKOS 当正式业务逻辑

SKOS 很适合词表、概念、别名和宽窄关系，但其规范明确指出，知识组织系统中的概念结构不能自动可靠地解释为世界事实或形式公理。 

所以：

SKOS-like lexical/concept layer
+
SHACL-like constraint layer

比“所有东西都塞进 SKOS”更合适。

每次纠错直接微调模型

你的核心学习对象应该首先是：

显式 Semantic Edit
Package Patch
Case
Regression
Context Rule

而不是模型参数。

模型微调以后可以作为优化层，但不能替代可审计语义资产，否则你将无法解释：

系统为什么改变
哪次纠错导致改变
怎样撤销这次改变
哪些领域受到了影响

⸻

二十、理论研究的优先顺序

第一优先级：直接决定架构

术语 / Sense / Concept 分离
Frame Semantics
Gradual Semantics
SHACL 式验证
Interactive Semantic Parsing
Ripple-Down Rules

第二优先级：决定迭代可靠性

Contextual Knowledge
Defeasible Override
Interactive Machine Teaching
Case-Based Reasoning
Belief Revision
Truth Maintenance
PROV
Competency Questions

第三优先级：需要时再引入

OWL / Description Logic
Controlled Natural Language
Formal Concept Analysis
自动 Ontology Learning
模型微调
复杂非单调逻辑执行器

⸻

最终理论判断

你的系统最合理的理论身份不是“个人知识图谱”，也不是“本体编辑器”。

它更接近：

一个以 Vocabulary 为源代码、以 Semantic IR 为中间表示、以 Context 和 Contract 为运行规则、以真实纠错 Case 为学习信号的可教语义运行环境。

最核心的理论组合是：

Progressive Formalization
让不完整 Vocabulary 可以开始运行
Frame-based Semantic Parsing
把自然语言变成有角色和范围的语义实例
Contextual / Defeasible Semantics
实现基础层和领域开关
SHACL-like Contract Validation
实现 Semantic Lint
Ripple-Down Rules
让真实错误形成有作用域的增量修补
Case-Based Reasoning
复用历史纠错案例
Belief Revision + TMS + Provenance
保证更新可解释、可回滚、不破坏旧结果

下一步最适合把这些理论收敛成一份**《系统理论原则与架构不变量》**：明确哪些原则无论采用什么数据库、LLM 或 DSL 都不能被实现细节破坏。
