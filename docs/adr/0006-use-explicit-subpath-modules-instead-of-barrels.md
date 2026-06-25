# ADR 0006: 用显式子路径模块替代 barrel 入口

## 状态

Accepted

## 背景

Harmony V1 会以 monorepo 方式纵向拆分能力。每个 package 都会承载一组具体语义能力，例如
Semantic Model、Headless Runtime、Ledger、Harness fixtures 和后续 issue 派发的 capability slice。

Effect 官方仓库提供了两个对本仓库有价值的参考：

- `packages/effect/package.json` 使用显式 package subpath export 管理公开模块。
- `ai-docs/src/51_http-server/fixtures` 通过目录组织表达 domain、api、server 等职责边界。

但 Effect 官方仓库也有自动生成的 `src/index.ts` namespace barrel。Harmony 不采用这个做法。

## 决策

本仓库不使用 `index.ts`、`public.ts` 或等价的 catch-all barrel 作为 package 或目录入口。

公开 API 使用 package `exports` 的显式子路径，例如：

```json
{
  "exports": {
    "./runtime": "./src/runtime/headless-runtime.ts",
    "./ledger": "./src/runtime/ledger.ts",
    "./schema/identity": "./src/schema/identity.ts"
  }
}
```

调用方必须从具体能力模块导入，而不是从 package root 聚合导入。

## 原因

- V1 需要按 capability slice 派发 issue；具体子路径能让 issue owner 只认领相关文件夹和模块。
- Effect Schema 是类型和运行时解析的 source of truth；小模块更容易把 schema 归属边界讲清楚。
- 无 barrel 能暴露真实依赖方向，避免根入口把跨域耦合藏起来。
- 具体 import path 更适合代码审核：审查者能直接看到调用方依赖的是 runtime、ledger 还是某组 schema。

## 影响

- package root 不再是默认导入面。
- 新增模块时必须先选择清晰的目录和子路径 export。
- 测试也遵守同样规则，不为了方便从 package root 导入。
- 文件可以拆得更碎；优先按领域概念和 capability 组织文件夹，而不是按技术层堆成大文件。

## 非目标

- 不追求一次拆出最终稳定目录。
- 不引入纯转发文件来模拟 barrel。
- 不因为减少 import 行数而牺牲依赖可见性。
