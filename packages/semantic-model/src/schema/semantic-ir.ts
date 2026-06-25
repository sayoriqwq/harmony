import { Schema } from 'effect'
import { ActiveEnvironmentId, CompetingInterpretationId, DocumentSectionId, RelationAssertionId, RequestFrameId, SemanticInputId, SemanticIrId, SourceSpanId } from './ids.ts'
import { EvidenceRef } from './input.ts'
import { AssertionStatus, ParseDecisionState, RelationPredicate, RequestAction, RequestBehavior } from './literals.ts'

export class RequestTarget extends Schema.Class<RequestTarget>('harmony.semantic-model/RequestTarget')({
  targetKind: Schema.Literal('referenced_document'),
  targetRef: SemanticInputId,
  evidenceRefs: Schema.Array(EvidenceRef),
}) {}

export class ProhibitedAction extends Schema.Class<ProhibitedAction>(
  'harmony.semantic-model/ProhibitedAction',
)({
  action: RequestAction,
  evidenceRefs: Schema.Array(EvidenceRef),
}) {}

export class RequestFrame extends Schema.Class<RequestFrame>('harmony.semantic-model/RequestFrame')({
  id: RequestFrameId,
  frameKind: Schema.Literal('request'),
  action: RequestAction,
  target: RequestTarget,
  prohibitedActions: Schema.Array(ProhibitedAction),
  actionEvidenceRefs: Schema.Array(EvidenceRef),
  targetEvidenceRefs: Schema.Array(EvidenceRef),
  prohibitedActionEvidenceRefs: Schema.Array(EvidenceRef),
}) {}

export const SemanticFrame = Schema.Union([RequestFrame])
export type SemanticFrameType = typeof SemanticFrame.Type

export class RelationAssertion extends Schema.Class<RelationAssertion>('harmony.semantic-model/RelationAssertion')({
  id: RelationAssertionId,
  sectionId: DocumentSectionId,
  subject: Schema.NonEmptyString,
  predicate: RelationPredicate,
  object: Schema.NonEmptyString,
  assertionStatus: AssertionStatus,
  evidenceRefs: Schema.Array(EvidenceRef),
}) {}

export class UnresolvedSpan extends Schema.Class<UnresolvedSpan>('harmony.semantic-model/UnresolvedSpan')({
  spanId: SourceSpanId,
  reason: Schema.NonEmptyString,
  evidenceRefs: Schema.Array(EvidenceRef),
}) {}

export class CompetingInterpretation extends Schema.Class<CompetingInterpretation>(
  'harmony.semantic-model/CompetingInterpretation',
)({
  id: CompetingInterpretationId,
  interpretationKind: Schema.Literal('request-frame'),
  frameId: RequestFrameId,
  action: RequestAction,
  behavior: RequestBehavior,
  summary: Schema.NonEmptyString,
  evidenceRefs: Schema.Array(EvidenceRef),
}) {}

export class SemanticIr extends Schema.Class<SemanticIr>('harmony.semantic-model/SemanticIr')({
  id: SemanticIrId,
  artifactKind: Schema.Literal('semantic-ir'),
  inputKind: Schema.Literals(['prompt', 'document']),
  inputRef: SemanticInputId,
  environmentRef: ActiveEnvironmentId,
  frameInstances: Schema.Array(SemanticFrame),
  relationAssertions: Schema.Array(RelationAssertion),
  competingInterpretations: Schema.Array(CompetingInterpretation),
  unresolvedSpans: Schema.Array(UnresolvedSpan),
  evidenceRefs: Schema.Array(EvidenceRef),
  decisionState: ParseDecisionState,
}) {}
