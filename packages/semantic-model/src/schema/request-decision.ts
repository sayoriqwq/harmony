import { Schema } from 'effect'
import { ClarificationDecisionId, CompetingInterpretationId, RequestFrameId, SemanticInputId, SemanticIrId } from './ids.ts'
import { EvidenceRef } from './input.ts'
import { ClarificationReason, RequestAction, RequestBehavior } from './literals.ts'

export class ClarificationOption extends Schema.Class<ClarificationOption>(
  'harmony.semantic-model/ClarificationOption',
)({
  interpretationId: CompetingInterpretationId,
  frameId: RequestFrameId,
  action: RequestAction,
  behavior: RequestBehavior,
  outcome: Schema.NonEmptyString,
}) {}

export class ClarificationSemanticDifference extends Schema.Class<ClarificationSemanticDifference>(
  'harmony.semantic-model/ClarificationSemanticDifference',
)({
  differenceKind: Schema.Literal('request_action'),
  options: Schema.Array(ClarificationOption),
  prohibitedActionEvidenceRefs: Schema.Array(EvidenceRef),
}) {}

export class ClarificationDecision extends Schema.Class<ClarificationDecision>(
  'harmony.semantic-model/ClarificationDecision',
)({
  id: ClarificationDecisionId,
  decisionKind: Schema.Literal('clarify'),
  reason: ClarificationReason,
  irId: SemanticIrId,
  promptInputRef: SemanticInputId,
  competingInterpretationIds: Schema.Array(CompetingInterpretationId),
  semanticDifference: ClarificationSemanticDifference,
  requiredUserResolution: Schema.NonEmptyString,
  evidenceRefs: Schema.Array(EvidenceRef),
}) {}

export const RequestDecision = Schema.Union([ClarificationDecision])
export type RequestDecisionType = typeof RequestDecision.Type
