# 文档地图

本文档说明当前理论文档的层级、单一职责和推荐阅读顺序。

## 层级

```text
L0 产品定义
└── docs/concept.md

L1 理论依据
└── docs/theory/research-map.md

L2 第一阶段落地原则
└── docs/first-phase/mvp-loop-principles.md

L3 架构不变量与验收基线
└── docs/first-phase/semantic-system-principles-v0.1.md

V1 实现对齐材料
├── docs/first-phase/v1-effect-implementation-alignment.md
├── docs/first-phase/v1-implementation-status.md
└── docs/first-phase/v1-capability-fixtures.md

架构决策记录
└── docs/adr/*.md

工程实践
├── docs/engineering/effect.md
├── docs/engineering/file-organization.md
├── docs/engineering/package-exports.md
└── docs/engineering/v1-usage.md
```

## 阅读顺序

1. `docs/concept.md`
   先确认系统是什么、解决什么问题、核心闭环和非目标。
2. `docs/theory/research-map.md`
   再查看外部理论依据，以及这些理论如何映射到系统设计。
3. `docs/first-phase/mvp-loop-principles.md`
   然后确认第一阶段如何克制落地，哪些能力必须先做，哪些能力主动延后。
4. `docs/first-phase/semantic-system-principles-v0.1.md`
   最后读取当前权威规范。后续架构、Schema、实现和验收都应服从这里的不变量。
5. `docs/first-phase/v1-effect-implementation-alignment.md`
   进入 V1 PRD 或 issue 拆分前读取，确认已经收束的 Effect 实现取舍和 capability scope。
6. `docs/first-phase/v1-implementation-status.md`
   查看当前 V1 headless core 已实现能力、未落地边界和剩余工程缺口。
7. `docs/first-phase/v1-capability-fixtures.md`
   派发或复审 capability issue 前读取，定位 fixture、acceptance test 和核心输出。
8. `docs/adr/*.md`
   实现前读取相关 ADR，确认已经接受的架构取舍。
9. `docs/engineering/effect.md`
   编写 Effect 代码时读取，确认 harness 入口、默认写法、测试规则和验证命令。
10. `docs/engineering/file-organization.md`
   新增或拆分 package/module 前读取，确认无 barrel、显式子路径和碎文件组织规则。
11. `docs/engineering/package-exports.md`
   新增 package export 或调整 import surface 前读取，确认 public subpath policy。
12. `docs/engineering/v1-usage.md`
   调用 V1 headless core 前读取，确认 Effect Layer 组合和 schema decode 方式。

## 权威关系

`semantic-system-principles-v0.1.md` 是当前权威规范。

当其他文档与它冲突时，以 `semantic-system-principles-v0.1.md` 为准；如果冲突说明理论或产品判断已经变化，应先更新权威规范，再同步其他文档。

## 单一职责

- `concept.md` 只回答“系统是什么”和“产品边界是什么”。
- `research-map.md` 只保存理论依据和设计启发，不直接规定实现。
- `mvp-loop-principles.md` 只回答第一阶段如何尽快跑通最小语义闭环。
- `semantic-system-principles-v0.1.md` 只固定原则、不变量、验收基线和重大变更规则。
- `v1-effect-implementation-alignment.md` 只保存 V1 PRD 和 issue 派发前的对齐结论，不替代权威规范。
- `v1-implementation-status.md` 只记录当前 V1 实现状态、已完成 issue 和剩余工程缺口。
- `v1-capability-fixtures.md` 只记录 capability fixture 到测试验收的映射。
- `docs/adr/` 只记录已经接受且会约束后续实现的架构取舍。
- `engineering/effect.md` 只保存本仓库编写 Effect 代码的工程入口，不替代
  `effect-harness` 或 pinned official Effect source。
- `engineering/file-organization.md` 只保存本仓库 package 入口和文件组织规则，不替代领域规范。
- `engineering/package-exports.md` 只保存 package subpath export policy，不替代领域规范。
- `engineering/v1-usage.md` 只说明当前 headless core 的调用方式，不定义新产品范围。

具体 DSL、Semantic IR Schema、数据库、服务边界、模型调用方式和界面流程，属于下一阶段架构设计文档，不放入当前理论文档。
