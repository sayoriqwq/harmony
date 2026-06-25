import type { LedgerRecordType as LedgerRecord, PromptInputCapturedRecord, SemanticIrProducedRecord } from '@harmony/semantic-model/schema/ledger-record'
import { assert, describe, it } from '@effect/vitest'
import { SemanticLedger } from '@harmony/headless-runtime/ledger'
import { ActiveEnvironmentBuilder } from '@harmony/headless-runtime/runtime/active-environment-builder'
import { GlossaryPackageWorkflow } from '@harmony/headless-runtime/runtime/glossary-package-workflow'
import { layerInMemoryWithPromptClarification } from '@harmony/headless-runtime/runtime/layers'
import { PromptClarificationWorkflow } from '@harmony/headless-runtime/runtime/prompt-clarification-workflow'
import { ActiveEnvironmentBuildRequest, LocalSemanticContext } from '@harmony/semantic-model/schema/environment'
import { PackageId } from '@harmony/semantic-model/schema/ids'
import {
  PromptEvidenceSource,
  PromptInput,
  SemanticInput,
  VocabularyInput,
} from '@harmony/semantic-model/schema/input'
import { LedgerRecord as LedgerRecordSchema } from '@harmony/semantic-model/schema/ledger-record'
import { ClarificationDecision, RequestDecision as RequestDecisionSchema } from '@harmony/semantic-model/schema/request-decision'
import { SemanticIr } from '@harmony/semantic-model/schema/semantic-ir'
import { PromptClarificationWorkflowResult } from '@harmony/semantic-model/schema/workflow-result'
import { Effect, Schema } from 'effect'

const basePackageId = Schema.decodeUnknownSync(PackageId)('package:base.review')
const promptText = 'check this document; do not edit it'
const targetDocumentRef = 'semantic-input:document-under-review'

const baseGlossaryFixture = {
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
}

const localContextFixture = {
  id: 'local-context:prompt-clarification',
  contextKind: 'case-local',
  description: 'Prompt action ambiguity fixture.',
  evidenceRefs: [],
}

const promptFixture = {
  id: 'semantic-input:prompt-check-document',
  inputKind: 'prompt',
  content: promptText,
  promptRole: 'user_request',
  targetRefs: [targetDocumentRef],
  spans: [
    {
      id: 'source-span:prompt-check-document:full',
      startOffset: 0,
      endOffset: 35,
      text: promptText,
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
}

const promptWithDocumentOnlyField = {
  ...promptFixture,
  declaredCompleteness: 'complete',
}

function firstOf<A>(items: ReadonlyArray<A>, label: string): A {
  const value = items[0]
  if (value === undefined) {
    assert.fail(`Missing ${label}`)
  }
  return value
}

function isPromptRecord(record: LedgerRecord): record is PromptInputCapturedRecord {
  return record.recordKind === 'PromptInputCaptured'
}

function isSemanticIrRecord(record: LedgerRecord): record is SemanticIrProducedRecord {
  return record.recordKind === 'SemanticIrProduced'
}

function frameFor(result: PromptClarificationWorkflowResult, action: 'validate' | 'rewrite') {
  const frame = result.semanticIr.frameInstances.find(candidate => candidate.action === action)
  if (frame === undefined) {
    assert.fail(`Missing ${action} request frame`)
  }
  return frame
}

const roundTripPromptOutput = Effect.fn('roundTripPromptOutput')(
  function* (result: PromptClarificationWorkflowResult) {
    const encodedEvidence = yield* Schema.encodeUnknownEffect(PromptEvidenceSource)(result.evidenceSource)
    yield* Schema.decodeUnknownEffect(PromptEvidenceSource)(encodedEvidence)

    const encodedIr = yield* Schema.encodeUnknownEffect(SemanticIr)(result.semanticIr)
    yield* Schema.decodeUnknownEffect(SemanticIr)(encodedIr)

    const encodedDecision = yield* Schema.encodeUnknownEffect(RequestDecisionSchema)(result.decision)
    yield* Schema.decodeUnknownEffect(RequestDecisionSchema)(encodedDecision)
    yield* Schema.decodeUnknownEffect(ClarificationDecision)(encodedDecision)

    const encodedResult = yield* Schema.encodeUnknownEffect(PromptClarificationWorkflowResult)(result)
    yield* Schema.decodeUnknownEffect(PromptClarificationWorkflowResult)(encodedResult)

    for (const record of result.ledgerRecords) {
      const encodedRecord = yield* Schema.encodeUnknownEffect(LedgerRecordSchema)(record)
      yield* Schema.decodeUnknownEffect(LedgerRecordSchema)(encodedRecord)
    }
  },
)

describe('Prompt action ambiguity clarification workflow', () => {
  it.effect('asks for clarification when validate/review and rewrite/modify meanings compete', () =>
    Effect.gen(function* () {
      const input = yield* Schema.decodeUnknownEffect(PromptInput)(
        promptFixture,
        { onExcessProperty: 'error' },
      )
      const decodedAsSemanticInput = yield* Schema.decodeUnknownEffect(SemanticInput)(
        promptFixture,
        { onExcessProperty: 'error' },
      )
      assert.strictEqual(decodedAsSemanticInput.inputKind, 'prompt')

      const promptWithDocumentCompletenessFailed = yield* Schema.decodeUnknownEffect(PromptInput)(
        promptWithDocumentOnlyField,
        { onExcessProperty: 'error' },
      ).pipe(
        Effect.map(() => false),
        Effect.catch(() => Effect.succeed(true)),
      )
      assert.strictEqual(promptWithDocumentCompletenessFailed, true)

      const packageWorkflow = yield* GlossaryPackageWorkflow
      const environmentBuilder = yield* ActiveEnvironmentBuilder
      const promptWorkflow = yield* PromptClarificationWorkflow
      const ledger = yield* SemanticLedger

      const baseInput = yield* Schema.decodeUnknownEffect(VocabularyInput)(baseGlossaryFixture)
      const localContext = yield* Schema.decodeUnknownEffect(LocalSemanticContext)(localContextFixture)
      yield* packageWorkflow.compileAndPublish(baseInput)
      const environment = yield* environmentBuilder.build(new ActiveEnvironmentBuildRequest({
        environmentId: Schema.decodeUnknownSync(ActiveEnvironmentBuildRequest.fields.environmentId)(
          'active-environment:prompt-clarification',
        ),
        localContext,
        enabledDomainPackageIds: [],
      }))

      const result = yield* promptWorkflow.clarifyPrompt(input, environment.environment)
      yield* roundTripPromptOutput(result)

      const actionSpan = input.spans[1]
      const targetSpan = input.spans[2]
      const prohibitedActionSpan = input.spans[3]
      assert.ok(actionSpan)
      assert.ok(targetSpan)
      assert.ok(prohibitedActionSpan)

      const validateFrame = frameFor(result, 'validate')
      const rewriteFrame = frameFor(result, 'rewrite')
      const validateInterpretation = firstOf(
        result.semanticIr.competingInterpretations.filter(interpretation => interpretation.action === 'validate'),
        'validate interpretation',
      )
      const rewriteInterpretation = firstOf(
        result.semanticIr.competingInterpretations.filter(interpretation => interpretation.action === 'rewrite'),
        'rewrite interpretation',
      )

      assert.strictEqual(result.evidenceSource.originalText, promptText)
      assert.strictEqual(result.evidenceSource.inputRef, input.id)
      assert.strictEqual(result.semanticIr.inputRef, input.id)
      assert.strictEqual(result.semanticIr.environmentRef, environment.environment.id)
      assert.strictEqual(result.semanticIr.decisionState, 'requires_clarification')
      assert.strictEqual(result.semanticIr.frameInstances.length, 2)
      assert.strictEqual(result.semanticIr.competingInterpretations.length, 2)
      assert.strictEqual(validateInterpretation.frameId, validateFrame.id)
      assert.strictEqual(rewriteInterpretation.frameId, rewriteFrame.id)

      assert.strictEqual(firstOf(validateFrame.actionEvidenceRefs, 'validate action evidence').spanId, actionSpan.id)
      assert.strictEqual(firstOf(validateFrame.targetEvidenceRefs, 'validate target evidence').spanId, targetSpan.id)
      assert.strictEqual(
        firstOf(validateFrame.prohibitedActionEvidenceRefs, 'validate prohibited action evidence').spanId,
        prohibitedActionSpan.id,
      )
      assert.strictEqual(firstOf(rewriteFrame.actionEvidenceRefs, 'rewrite action evidence').spanId, actionSpan.id)
      assert.strictEqual(firstOf(rewriteFrame.targetEvidenceRefs, 'rewrite target evidence').spanId, targetSpan.id)
      assert.strictEqual(
        firstOf(rewriteFrame.prohibitedActionEvidenceRefs, 'rewrite prohibited action evidence').spanId,
        prohibitedActionSpan.id,
      )
      assert.strictEqual(firstOf(validateFrame.prohibitedActions, 'validate prohibited action').action, 'rewrite')
      assert.strictEqual(firstOf(rewriteFrame.prohibitedActions, 'rewrite prohibited action').action, 'rewrite')

      assert.strictEqual(result.decision.decisionKind, 'clarify')
      assert.strictEqual(result.decision.reason, 'behavior_changing_action_ambiguity')
      assert.strictEqual(result.decision.irId, result.semanticIr.id)
      assert.strictEqual(result.decision.promptInputRef, input.id)
      assert.strictEqual(result.decision.semanticDifference.differenceKind, 'request_action')
      assert.strictEqual(result.decision.semanticDifference.options.length, 2)
      assert.deepStrictEqual(
        result.decision.semanticDifference.options.map(option => option.action).sort(),
        ['rewrite', 'validate'],
      )
      assert.isTrue(result.decision.requiredUserResolution.includes('validate/review'))
      assert.isTrue(result.decision.requiredUserResolution.includes('rewrite/modify'))
      assert.strictEqual(
        firstOf(result.decision.semanticDifference.prohibitedActionEvidenceRefs, 'decision prohibited evidence')
          .spanId,
        prohibitedActionSpan.id,
      )

      const allRecords = yield* ledger.records
      const promptRecords = allRecords.filter(isPromptRecord)
      const irRecords = allRecords.filter(isSemanticIrRecord)
      assert.strictEqual(promptRecords.length, 1)
      assert.strictEqual(irRecords.length, 1)
      assert.strictEqual(firstOf(promptRecords, 'prompt record').source.originalText, promptText)
      assert.strictEqual(firstOf(irRecords, 'semantic ir record').semanticIr.id, result.semanticIr.id)
      assert.notStrictEqual(firstOf(promptRecords, 'prompt record').recordKind, firstOf(irRecords, 'ir record').recordKind)
    }).pipe(Effect.provide(layerInMemoryWithPromptClarification(basePackageId))))
})
