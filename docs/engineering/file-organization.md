# 文件组织约束

本文档记录 Harmony target-local 的文件组织规则。它覆盖 package 入口、目录粒度和 import
口径，和 `docs/adr/0006-use-explicit-subpath-modules-instead-of-barrels.md` 保持一致。

## 核心规则

- 不使用 `index.ts`、`public.ts` 或等价的 catch-all barrel。
- 不从 package root 导入业务 API。
- package `exports` 必须暴露具体能力子路径。
- 文件按领域概念和 capability 拆小，允许 import 行变长。
- 目录用于表达语义边界，不用于隐藏一个巨型入口文件。

## 推荐形态

```text
packages/example/src/
├── runtime/
│   ├── headless-runtime.ts
│   └── ledger.ts
└── schema/
    ├── identity.ts
    ├── input.ts
    ├── package.ts
    └── workflow-result.ts
```

对应 `package.json`：

```json
{
  "exports": {
    "./runtime": "./src/runtime/headless-runtime.ts",
    "./ledger": "./src/runtime/ledger.ts",
    "./schema/identity": "./src/schema/identity.ts",
    "./schema/input": "./src/schema/input.ts"
  }
}
```

## Effect 参考与本地取舍

参考来源：

- `/Users/sayori/Desktop/yume-infra/effect-harness/repos/effect/LLMS.md`
- `/Users/sayori/Desktop/yume-infra/effect-harness/repos/effect/packages/effect/package.json`
- `/Users/sayori/Desktop/yume-infra/effect-harness/repos/effect/packages/effect/SCHEMA.md`
- `/Users/sayori/Desktop/yume-infra/effect-harness/repos/effect/ai-docs/README.md`
- `/Users/sayori/Desktop/yume-infra/effect-harness/repos/effect/ai-docs/src/51_http-server/fixtures`

采用：

- 用 pinned official source 作为 Effect 写法依据。
- 用 package subpath export 管理公开模块。
- 用 Effect Schema 作为类型与 runtime codec 的共同事实源。
- 用目录和 fixtures 表达可审核的能力边界。

不采用：

- 不采用 Effect 官方 `src/index.ts` 自动生成 barrel。
- 不采用为了减少 import 数量而做的命名空间聚合入口。

## 审核口径

看到以下形态，应要求修改：

- 新增 `src/index.ts`。
- 新增只做 `export * from ...` 或聚合 re-export 的入口文件。
- 测试从 `@harmony/<package>` 根入口导入。
- package export `"."` 指向一个聚合入口。

允许以下形态：

- 一个具体模块导出自己实现的多个类型、service 或 helper。
- package export 指向一个真实实现文件，例如 `./runtime` 或 `./ledger`。
- 测试直接从具体子路径导入被测 capability。
