# Effect 编码入口

本文档是 Harmony 内部编写 Effect 代码的入口。权威来源仍然是本仓库已接入的
`effect-harness` manifest、runtime skill 和 pinned official Effect source；这里保存 target-local
的阅读顺序、默认写法和验证命令，避免每次都从 harness 文件里重新找入口。

文件组织和 package export 规则见 `docs/engineering/file-organization.md`。Effect 官方源码中的
barrel 生成策略不是本仓库的本地约束；Harmony 使用显式子路径模块。

## 权威来源

本仓库的 Effect harness root 记录在根目录 `.effect-harness.json`。

写非平凡 Effect 代码前，按顺序读：

1. `.effect-harness.json`
2. `.codex/skills/effect-code/SKILL.md`
3. `/Users/sayori/Desktop/yume-infra/effect-harness/repos/effect/LLMS.md`
4. `/Users/sayori/Desktop/yume-infra/effect-harness/repos/effect/ai-docs/src/`
5. `/Users/sayori/Desktop/yume-infra/effect-harness/harness/index.md`

API、pattern、testing 和 migration 以 pinned official source 为准，不用记忆里的旧 Effect v3 写法。

## 默认写法

- 用 `Effect.gen` 写 effectful workflow。
- 返回 `Effect` 的函数优先用 `Effect.fn("name")`，不要返回裸 `Effect.gen(...)`。
- Service 定义用 `Context.Service`，不要用旧式 `Context.Tag`。
- Effect service 依赖用 Layer 组合，业务语义留在 target repo。
- Node 边界使用已安装 package，例如 `effect`、`@effect/platform-node`，不要从 harness 的
  `repos/effect` 引用源码。

## 测试规则

- Effect 测试从 `@effect/vitest` import。
- Effect-native 测试使用 `it.effect`、`it.live` 或 `layer(...)`。
- 用 `assert`，不要用 plain `vitest` 的 `expect`。
- 不从 `node:test` 或 `vitest` import 测试 API。

## tsgo 诊断处理

`tsgo --noEmit` 是主类型检查路径。遇到 `@effect/tsgo` suggestion 时，按类型边界处理，不用
assertion 把诊断压掉。

优先使用：

- 明确 return type
- 命名 discriminated union/helper
- `satisfies`
- `Effect.satisfiesSuccessType`
- `Function.satisfies`
- 必要时用 `Schema.Finite` 表达数值边界

避免这些 harness guardrail 会拒绝的形状：

- `Effect.orElseSucceed(() => [] as ...)`
- `Effect.succeed(null as ...)`
- 临时 `{ ok: true/false as const }` result wrapper

## 禁止项

- 不 import `/Users/sayori/Desktop/yume-infra/effect-harness/repos/effect/**`。
- 不复制 effect-harness maintainer `.codex/skills` 到本仓库。
- 不添加 target-local effect-harness dispatcher script。
- 不依赖 `@effect/cli`；Effect v4 beta CLI 写法使用 `effect/unstable/cli`。

## 验证命令

常规完成前运行：

```bash
pnpm verify
```

需要单独看 Effect source/package drift 时运行：

```bash
pnpm effect:status
```

需要只验证 harness contract 时运行：

```bash
pnpm effect:verify
```

如果遇到 reusable、business-neutral 的 Effect practice gap，先查 pinned official source；确认没有覆盖后，
按 `.codex/skills/effect-feedback/SKILL.md` 写入 `.codex/effect-feedback/`。
