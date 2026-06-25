# V1 实现状态

状态日期：2026-06-25。

## 当前结论

V1 deterministic headless semantic core 已经实现到 PRD 的 8 条 must-have capability。

GitHub PRD：`sayoriqwq/harmony#1`。

已关闭的实现 issue：

- `#2` Glossary Vocabulary Source -> Published Semantic Package。
- `#3` Active Semantic Environment Domain Package toggle。
- `#4` Prompt action ambiguity clarification。
- `#5` Document Semantic Lint result classification。
- `#6` Correction CaseSemanticEdit application。
- `#7` Correction Diagnosis gate。
- `#8` Domain Semantic Patch Candidate publication。
- `#9` Regression rerun blocking historical behavior changes。

## 已落地的能力边界

当前实现是 headless core，不是应用入口。

已落地：

- Effect Schema 定义 durable semantic objects。
- `packages/semantic-model` 保存 schema、branded id 和 durable artifact 类型。
- `packages/headless-runtime` 保存 Effect service、Layer、deterministic parser、workflow 和 in-memory ledger。
- Capability acceptance 以 `@effect/vitest` 的 `it.effect` 覆盖。
- 测试 fixture 已从测试主体外置到 `packages/headless-runtime/src/fixtures/`。
- package root 不导出业务 API；调用方使用显式 subpath。

未落地，但不阻塞当前 V1 headless core：

- HTTP、CLI、UI。
- 真实 LLM Provider。
- 生产数据库、队列或事件日志。
- file-backed durable ledger Layer。

## 当前剩余工程缺口

file-backed durable ledger 是下一阶段缺口，已记录为 GitHub issue `#10`。
当前 `SemanticLedger.layerInMemory` 证明的是 append-only ledger 语义和 derived current view，
而不是跨进程持久审计。

这不改变当前 V1 的验收结论，但后续要把“历史不能丢失”从测试语义推进到运行边界时，需要新增持久 ledger Layer，并用 Schema encode/decode、append-only replay、corrupted record failure 和 current view rebuild 测试验证。

## 验收命令

当前修改后必须运行：

```bash
pnpm verify
```

Effect 相关改动也应能通过：

```bash
pnpm effect:verify
```
