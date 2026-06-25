import { Schema } from 'effect'
import { CorrectionDiagnosisRationale } from './correction-diagnosis.ts'
import { CaseId, CaseSemanticEditId, CorrectionDiagnosisId, CorrectionDiagnosisResultId, CorrectionId } from './ids.ts'
import { EvidenceRef } from './input.ts'
import { SemanticPatchCandidate } from './semantic-patch.ts'

export class NoSemanticPatchCandidateResult extends Schema.Class<NoSemanticPatchCandidateResult>(
  'harmony.semantic-model/NoSemanticPatchCandidateResult',
)({
  id: CorrectionDiagnosisResultId,
  artifactKind: Schema.Literal('correction-diagnosis-result'),
  resultKind: Schema.Literal('NoSemanticPatchCandidate'),
  diagnosisId: CorrectionDiagnosisId,
  caseId: CaseId,
  correctionId: CorrectionId,
  caseSemanticEditId: CaseSemanticEditId,
  reason: Schema.Literal('local_correction_only'),
  rationale: CorrectionDiagnosisRationale,
  evidenceRefs: Schema.Array(EvidenceRef),
  createdAt: Schema.NonEmptyString,
}) {}

export class SemanticPatchCandidateProposalResult extends Schema.Class<SemanticPatchCandidateProposalResult>(
  'harmony.semantic-model/SemanticPatchCandidateProposalResult',
)({
  id: CorrectionDiagnosisResultId,
  artifactKind: Schema.Literal('correction-diagnosis-result'),
  resultKind: Schema.Literal('SemanticPatchCandidateProposed'),
  diagnosisId: CorrectionDiagnosisId,
  caseId: CaseId,
  correctionId: CorrectionId,
  caseSemanticEditId: CaseSemanticEditId,
  patchCandidate: SemanticPatchCandidate,
  rationale: CorrectionDiagnosisRationale,
  evidenceRefs: Schema.Array(EvidenceRef),
  createdAt: Schema.NonEmptyString,
}) {}

export const CorrectionDiagnosisGateResult = Schema.Union([
  NoSemanticPatchCandidateResult,
  SemanticPatchCandidateProposalResult,
])
export type CorrectionDiagnosisGateResultType = typeof CorrectionDiagnosisGateResult.Type
