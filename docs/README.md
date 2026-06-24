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

## 权威关系

`semantic-system-principles-v0.1.md` 是当前权威规范。

当其他文档与它冲突时，以 `semantic-system-principles-v0.1.md` 为准；如果冲突说明理论或产品判断已经变化，应先更新权威规范，再同步其他文档。

## 单一职责

- `concept.md` 只回答“系统是什么”和“产品边界是什么”。
- `research-map.md` 只保存理论依据和设计启发，不直接规定实现。
- `mvp-loop-principles.md` 只回答第一阶段如何尽快跑通最小语义闭环。
- `semantic-system-principles-v0.1.md` 只固定原则、不变量、验收基线和重大变更规则。

具体 DSL、Semantic IR Schema、数据库、服务边界、模型调用方式和界面流程，属于下一阶段架构设计文档，不放入当前理论文档。
