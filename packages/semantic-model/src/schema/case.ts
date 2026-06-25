import { Schema } from 'effect'
import { CaseId, CaseSemanticEditId, CompetingInterpretationId, CorrectionId, EvidenceSourceId, RequestFrameId, SemanticInputId, SemanticIrId } from './ids.ts'
import { EvidenceRef } from './input.ts'
import { CaseStatus, RequestAction } from './literals.ts'
import { SemanticIr } from './semantic-ir.ts'

export class Case extends Schema.Class<Case>('harmony.semantic-model/Case')({
  id: CaseId,
  artifactKind: Schema.Literal('case'),
  originalPromptInputRef: SemanticInputId,
  originalPromptEvidenceSourceId: EvidenceSourceId,
  originalIrRef: SemanticIrId,
  currentIrRef: SemanticIrId,
  currentSemanticIr: SemanticIr,
  status: CaseStatus,
  openedAt: Schema.NonEmptyString,
  updatedAt: Schema.NonEmptyString,
}) {}

export class SelectRequestInterpretationEdit extends Schema.Class<SelectRequestInterpretationEdit>(
  'harmony.semantic-model/SelectRequestInterpretationEdit',
)({
  id: CaseSemanticEditId,
  editKind: Schema.Literal('SelectRequestInterpretation'),
  caseId: CaseId,
  correctionId: CorrectionId,
  targetIrRef: SemanticIrId,
  selectedInterpretationId: CompetingInterpretationId,
  selectedFrameId: RequestFrameId,
  action: RequestAction,
  prohibitedActions: Schema.Array(RequestAction),
  rejectedInterpretationIds: Schema.Array(CompetingInterpretationId),
  evidenceRefs: Schema.Array(EvidenceRef),
}) {}

export const CaseSemanticEdit = Schema.Union([SelectRequestInterpretationEdit])
export type CaseSemanticEditType = typeof CaseSemanticEdit.Type
