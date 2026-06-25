import type { RequestDecisionType as RequestDecision } from '@harmony/semantic-model/schema/request-decision'
import type { SemanticIr } from '@harmony/semantic-model/schema/semantic-ir'
import { ClarificationDecision, ClarificationOption, ClarificationSemanticDifference, RequestDecision as RequestDecisionSchema } from '@harmony/semantic-model/schema/request-decision'
import { Context, Effect, Layer, Schema } from 'effect'
import { promptDecisionVersion } from './constants.ts'
import { RequestDecisionUnsupported } from './errors.ts'
import { uniqueEvidenceRefs } from './shared/collections.ts'

export class RequestDecisionEngine extends Context.Service<RequestDecisionEngine, {
  decideRequest: (
    semanticIr: SemanticIr,
  ) => Effect.Effect<RequestDecision, RequestDecisionUnsupported | Schema.SchemaError>
}>()('harmony/headless-runtime/RequestDecisionEngine') {
  static readonly layer = Layer.succeed(
    RequestDecisionEngine,
    RequestDecisionEngine.of({
      decideRequest: Effect.fn('RequestDecisionEngine.decideRequest')(function* (semanticIr) {
        const requestFrames = semanticIr.frameInstances.filter(frame => frame.frameKind === 'request')
        const hasValidate = requestFrames.some(frame => frame.action === 'validate')
        const hasRewrite = requestFrames.some(frame => frame.action === 'rewrite')
        const rewriteProhibited = requestFrames.some(frame =>
          frame.prohibitedActions.some(action => action.action === 'rewrite'),
        )

        if (!hasValidate || !hasRewrite || !rewriteProhibited) {
          return yield* new RequestDecisionUnsupported({
            irId: semanticIr.id,
            message: 'Expected competing validate and rewrite request frames with rewrite prohibited.',
          })
        }

        const interpretations = semanticIr.competingInterpretations.filter(interpretation =>
          requestFrames.some(frame => frame.id === interpretation.frameId),
        )
        if (interpretations.length < 2) {
          return yield* new RequestDecisionUnsupported({
            irId: semanticIr.id,
            message: 'Expected at least two competing request interpretations.',
          })
        }

        const prohibitedActionEvidenceRefs = uniqueEvidenceRefs(
          requestFrames.flatMap(frame => frame.prohibitedActionEvidenceRefs),
        )
        const evidenceRefs = uniqueEvidenceRefs([
          ...semanticIr.evidenceRefs,
          ...interpretations.flatMap(interpretation => interpretation.evidenceRefs),
        ])
        const decision = new ClarificationDecision({
          id: Schema.decodeUnknownSync(ClarificationDecision.fields.id)(
            `clarification-decision:${semanticIr.id}:${promptDecisionVersion}`,
          ),
          decisionKind: 'clarify',
          reason: 'behavior_changing_action_ambiguity',
          irId: semanticIr.id,
          promptInputRef: semanticIr.inputRef,
          competingInterpretationIds: interpretations.map(interpretation => interpretation.id),
          semanticDifference: new ClarificationSemanticDifference({
            differenceKind: 'request_action',
            options: interpretations.map(interpretation =>
              new ClarificationOption({
                interpretationId: interpretation.id,
                frameId: interpretation.frameId,
                action: interpretation.action,
                behavior: interpretation.behavior,
                outcome: interpretation.action === 'validate'
                  ? 'Review or validate the target document without changing its content.'
                  : 'Rewrite or modify the target document content.',
              })),
            prohibitedActionEvidenceRefs,
          }),
          requiredUserResolution:
            'Choose whether "check" means validate/review only, or whether rewrite/modify is authorized despite the prohibition.',
          evidenceRefs,
        })

        return yield* Schema.decodeUnknownEffect(RequestDecisionSchema)(decision)
      }),
    }),
  )
}
