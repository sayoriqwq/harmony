# Package Export Policy

Harmony 使用显式 package subpath 作为 public module surface。不使用 root export，不使用 barrel。

## 当前规则

- 不从 `@harmony/semantic-model` 或 `@harmony/headless-runtime` 根入口导入。
- `package.json` 的 `exports` 必须指向具体 schema、workflow、service 或 ledger module。
- `src/index.ts`、`src/public.ts` 和纯聚合 re-export 文件不允许新增。
- fixture、test helper 和 `runtime/shared/*` 默认是仓库内部实现，不进入 package exports。

## Semantic Model

`@harmony/semantic-model/schema/*` 是 durable semantic object 的主要 public surface。

这些 subpath 服务于：

- runtime decode / encode。
- fixture acceptance。
- future API / CLI / storage boundary。
- typed correction、patch、regression 和 ledger record 交换。

新增 schema export 前必须满足：

- 对象跨越 import、parse、correction、patch、regression、package version、storage、provider 或 future API 边界。
- Schema 是源真相，TypeScript 类型从 Schema 派生。
- 有 decode fixture 或 workflow acceptance 覆盖。

## Headless Runtime

`@harmony/headless-runtime/runtime/*` 暴露可执行 capability seam。

优先使用 workflow 和 Layer subpath：

- `runtime/glossary-package-workflow`
- `runtime/active-environment-builder`
- `runtime/prompt-clarification-workflow`
- `runtime/document-semantic-lint-workflow`
- `runtime/correction-workflow`
- `runtime/correction-diagnosis-workflow`
- `runtime/semantic-patch-publication-workflow`
- `runtime/layers`

`@harmony/headless-runtime/ledger` 当前暴露 V1 ledger service 和 derived view helpers。它仍是 in-memory V1 语义实现，不代表 durable persistence 已完成。

## 新增 Export Checklist

新增 export 前确认：

- 调用方会独立使用这个模块，而不是为了缩短 import。
- 模块表达一个真实能力边界。
- 文件本身包含实现或稳定类型，不是纯转发。
- docs 或测试能说明这个 subpath 的使用场景。
- 不破坏 `docs/engineering/file-organization.md` 和 ADR 0006。
