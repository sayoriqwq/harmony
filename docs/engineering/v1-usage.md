# V1 使用方式

V1 当前是 Effect-first headless semantic core。调用方直接组合 Effect service、Layer 和 schema subpath，不从 package root 导入。

## 最小 Prompt Clarification 流程

```ts
import { ActiveEnvironmentBuilder } from '@harmony/headless-runtime/runtime/active-environment-builder'
import { GlossaryPackageWorkflow } from '@harmony/headless-runtime/runtime/glossary-package-workflow'
import { layerInMemoryWithPromptClarification } from '@harmony/headless-runtime/runtime/layers'
import { PromptClarificationWorkflow } from '@harmony/headless-runtime/runtime/prompt-clarification-workflow'
import { ActiveEnvironmentBuildRequest, LocalSemanticContext } from '@harmony/semantic-model/schema/environment'
import { PackageId } from '@harmony/semantic-model/schema/ids'
import { PromptInput, VocabularyInput } from '@harmony/semantic-model/schema/input'
import { Effect, Schema } from 'effect'

const basePackageId = Schema.decodeUnknownSync(PackageId)('package:base.review')

const program = Effect.gen(function* () {
  const vocabulary = yield* Schema.decodeUnknownEffect(VocabularyInput)({
    id: 'vocabulary-input:base-review',
    inputKind: 'vocabulary',
    content: 'document：content supplied as the request target',
    vocabularyKind: 'base',
    namespace: 'base.review',
    spans: [
      {
        id: 'source-span:base-review:entry',
        startOffset: 0,
        endOffset: 47,
        text: 'document：content supplied as the request target',
      },
      {
        id: 'source-span:base-review:term',
        startOffset: 0,
        endOffset: 8,
        text: 'document',
      },
      {
        id: 'source-span:base-review:definition',
        startOffset: 9,
        endOffset: 47,
        text: 'content supplied as the request target',
      },
    ],
  })

  const prompt = yield* Schema.decodeUnknownEffect(PromptInput)({
    id: 'semantic-input:prompt-check-document',
    inputKind: 'prompt',
    content: 'check this document; do not edit it',
    promptRole: 'user_request',
    targetRefs: ['semantic-input:document-under-review'],
    spans: [
      {
        id: 'source-span:prompt-check-document:full',
        startOffset: 0,
        endOffset: 35,
        text: 'check this document; do not edit it',
      },
      {
        id: 'source-span:prompt-check-document:action',
        startOffset: 0,
        endOffset: 5,
        text: 'check',
      },
      {
        id: 'source-span:prompt-check-document:target',
        startOffset: 6,
        endOffset: 19,
        text: 'this document',
      },
      {
        id: 'source-span:prompt-check-document:prohibited-action',
        startOffset: 21,
        endOffset: 35,
        text: 'do not edit it',
      },
    ],
  })

  const localContext = yield* Schema.decodeUnknownEffect(LocalSemanticContext)({
    id: 'local-context:prompt-clarification',
    contextKind: 'case-local',
    description: 'Prompt action ambiguity fixture.',
    evidenceRefs: [],
  })

  const packageWorkflow = yield* GlossaryPackageWorkflow
  const environmentBuilder = yield* ActiveEnvironmentBuilder
  const promptWorkflow = yield* PromptClarificationWorkflow

  yield* packageWorkflow.compileAndPublish(vocabulary)

  const environment = yield* environmentBuilder.build(new ActiveEnvironmentBuildRequest({
    environmentId: Schema.decodeUnknownSync(ActiveEnvironmentBuildRequest.fields.environmentId)(
      'active-environment:prompt-clarification',
    ),
    localContext,
    enabledDomainPackageIds: [],
  }))

  return yield* promptWorkflow.clarifyPrompt(prompt, environment.environment)
})

const result = await Effect.runPromise(
  program.pipe(Effect.provide(layerInMemoryWithPromptClarification(basePackageId))),
)
```

## 常用 Layer

- `layerInMemoryWithActiveEnvironment(basePackageId)`：compile package + build Active Semantic Environment。
- `layerInMemoryWithPromptClarification(basePackageId)`：prompt parse + request decision。
- `layerInMemoryWithDocumentSemanticLint(basePackageId)`：document parse + Semantic Lint。
- `layerInMemoryWithCorrection(basePackageId)`：case open + correction capture + CaseSemanticEdit。
- `layerInMemoryWithCorrectionDiagnosis(basePackageId)`：local correction vs Semantic Patch Candidate gate。
- `layerInMemoryWithPatchPublication(basePackageId)`：regression + package publication gate。

## 使用约束

- durable input 先用 Effect Schema decode。
- expected semantic failure 走 typed error channel。
- current view 从 ledger records 派生，不直接覆盖历史记录。
- test fixture 文件不是 public API；它们只服务仓库内验收。
