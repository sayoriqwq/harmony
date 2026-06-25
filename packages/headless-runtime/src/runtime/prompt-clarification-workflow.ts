import type { ActiveSemanticEnvironment } from '@harmony/semantic-model/schema/environment'
import type { PromptInput } from '@harmony/semantic-model/schema/input'
import type { PromptParseError, RequestDecisionUnsupported } from './errors.ts'
import { PromptInputCapturedRecord, SemanticIrProducedRecord } from '@harmony/semantic-model/schema/ledger-record'
import { PromptClarificationWorkflowResult } from '@harmony/semantic-model/schema/workflow-result'
import { Context, Effect, Layer, Schema } from 'effect'
import { deterministicInstant } from './constants.ts'
import { SemanticLedger } from './ledger.ts'
import { RequestDecisionEngine } from './request-decision-engine.ts'
import { SemanticParser } from './semantic-parser.ts'

export class PromptClarificationWorkflow extends Context.Service<PromptClarificationWorkflow, {
  clarifyPrompt: (
    input: PromptInput,
    environment: ActiveSemanticEnvironment,
  ) => Effect.Effect<
    PromptClarificationWorkflowResult,
    PromptParseError | RequestDecisionUnsupported | Schema.SchemaError
  >
}>()('harmony/headless-runtime/PromptClarificationWorkflow') {
  static readonly layer = Layer.effect(
    PromptClarificationWorkflow,
    Effect.gen(function* () {
      const parser = yield* SemanticParser
      const decisionEngine = yield* RequestDecisionEngine
      const ledger = yield* SemanticLedger

      const clarifyPrompt = Effect.fn('PromptClarificationWorkflow.clarifyPrompt')(
        function* (input: PromptInput, environment: ActiveSemanticEnvironment) {
          const parseResult = yield* parser.parsePrompt(input, environment)
          const decision = yield* decisionEngine.decideRequest(parseResult.semanticIr)
          const recordsBeforeCapture = yield* ledger.records
          const promptRecord = new PromptInputCapturedRecord({
            id: Schema.decodeUnknownSync(PromptInputCapturedRecord.fields.id)(
              `ledger-record:${input.id}:${recordsBeforeCapture.length + 1}-prompt-captured`,
            ),
            recordKind: 'PromptInputCaptured',
            recordedAt: deterministicInstant,
            source: parseResult.evidenceSource,
          })

          yield* ledger.append(promptRecord)

          const recordsBeforeIr = yield* ledger.records
          const irRecord = new SemanticIrProducedRecord({
            id: Schema.decodeUnknownSync(SemanticIrProducedRecord.fields.id)(
              `ledger-record:${input.id}:${recordsBeforeIr.length + 1}-semantic-ir-produced`,
            ),
            recordKind: 'SemanticIrProduced',
            recordedAt: deterministicInstant,
            semanticIr: parseResult.semanticIr,
          })

          yield* ledger.append(irRecord)

          const result = new PromptClarificationWorkflowResult({
            evidenceSource: parseResult.evidenceSource,
            semanticIr: parseResult.semanticIr,
            decision,
            ledgerRecords: yield* ledger.records,
          })

          return yield* Schema.decodeUnknownEffect(PromptClarificationWorkflowResult)(result)
        },
      )

      return PromptClarificationWorkflow.of({ clarifyPrompt })
    }),
  )
}
