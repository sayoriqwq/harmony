# V1 Capability Fixtures

本文档记录 V1 headless semantic core 的 fixture 入口。fixture 是 issue 派发和回归验收材料，不是 package public API。

## Fixture 规则

- fixture 数据放在 `packages/headless-runtime/src/fixtures/`。
- 每个文件对应一个 capability 或一条相邻 capability 链。
- 测试从具体 fixture 文件导入，不使用 `index.ts`、`public.ts` 或聚合入口。
- Durable output 仍必须在测试内通过 Effect Schema encode/decode 验证。

## Capability Map

| Capability | Fixture file | Acceptance test | 核心输出 |
| --- | --- | --- | --- |
| 1. Glossary Vocabulary Source compiles into a Published Semantic Package | `packages/headless-runtime/src/fixtures/glossary-vocabulary.ts` | `packages/headless-runtime/src/glossary-workflow.test.ts` | Evidence Source, Semantic Package Draft, Published Semantic Package, Package Version, current view |
| 2. Active Semantic Environment applies explicit Domain Package toggles | `packages/headless-runtime/src/fixtures/active-environment.ts` | `packages/headless-runtime/src/active-environment.test.ts` | Active Semantic Environment, base layer activation, explicit domain activation |
| 3. Prompt action ambiguity produces clarification | `packages/headless-runtime/src/fixtures/prompt-clarification.ts` | `packages/headless-runtime/src/prompt-clarification.test.ts` | Prompt Evidence Source, Semantic IR, ClarificationDecision |
| 4. Document Semantic Lint separates semantic states | `packages/headless-runtime/src/fixtures/document-semantic-lint.ts` | `packages/headless-runtime/src/document-semantic-lint.test.ts` | Document Evidence Source, Semantic IR, SemanticLintReport |
| 5. Correction applies CaseSemanticEdit | `packages/headless-runtime/src/fixtures/correction.ts` | `packages/headless-runtime/src/correction-workflow.test.ts` | Case, Correction Evidence Source, Correction, CaseSemanticEdit application |
| 6. Correction Diagnosis gates patch proposal | `packages/headless-runtime/src/fixtures/correction-diagnosis.ts` | `packages/headless-runtime/src/correction-diagnosis-workflow.test.ts` | CorrectionDiagnosis, NoSemanticPatchCandidate, SemanticPatchCandidate proposal |
| 7. Domain Semantic Patch Candidate publishes after regression | `packages/headless-runtime/src/fixtures/semantic-patch-publication.ts` | `packages/headless-runtime/src/semantic-patch-publication.test.ts` | RegressionCase, RegressionRun, new PackageVersion, published patch candidate |
| 8. Regression rerun blocks historical breakage | `packages/headless-runtime/src/fixtures/semantic-patch-publication.ts` | `packages/headless-runtime/src/semantic-patch-publication.test.ts` | historical RegressionCase, failed historical run, blocked publication |

## 非目标

这些 fixture 不表达真实 LLM 行为。V1 只要求 deterministic parser contract 稳定，后续真实 Provider 必须实现同一 service contract。
