import { Schema } from 'effect'
import { Case, CaseSemanticEdit } from './case.ts'
import { CorrectionDiagnosis } from './correction-diagnosis.ts'
import { NoSemanticPatchCandidateResult, SemanticPatchCandidateProposalResult } from './correction-gate.ts'
import { ActiveSemanticEnvironment } from './environment.ts'
import { CaseId, CorrectionId, LedgerRecordId, PackageVersionId, PublishedPackageId, RegressionRunId, SemanticIrId } from './ids.ts'
import { Correction, CorrectionEvidenceSource, DocumentEvidenceSource, EvidenceSource, PromptEvidenceSource } from './input.ts'
import { SemanticLintReport } from './lint.ts'
import { PackageVersion, PublishedSemanticPackage, SemanticPackageDraft } from './package.ts'
import { RegressionCase, RegressionRun } from './regression.ts'
import { PackageVersionPublicationSource } from './results.ts'
import { SemanticIr } from './semantic-ir.ts'
import { SemanticPatchCandidate } from './semantic-patch.ts'

export class VocabularySourceImportedRecord extends Schema.Class<VocabularySourceImportedRecord>(
  'harmony.semantic-model/VocabularySourceImportedRecord',
)({
  id: LedgerRecordId,
  recordKind: Schema.Literal('VocabularySourceImported'),
  recordedAt: Schema.NonEmptyString,
  source: EvidenceSource,
}) {}

export class SemanticPackageDraftCompiledRecord extends Schema.Class<SemanticPackageDraftCompiledRecord>(
  'harmony.semantic-model/SemanticPackageDraftCompiledRecord',
)({
  id: LedgerRecordId,
  recordKind: Schema.Literal('SemanticPackageDraftCompiled'),
  recordedAt: Schema.NonEmptyString,
  draft: SemanticPackageDraft,
}) {}

export class PackageVersionPublishedRecord extends Schema.Class<PackageVersionPublishedRecord>(
  'harmony.semantic-model/PackageVersionPublishedRecord',
)({
  id: LedgerRecordId,
  recordKind: Schema.Literal('PackageVersionPublished'),
  recordedAt: Schema.NonEmptyString,
  publishedPackage: PublishedSemanticPackage,
  packageVersion: PackageVersion,
  publicationSource: PackageVersionPublicationSource,
}) {}

export class PromptInputCapturedRecord extends Schema.Class<PromptInputCapturedRecord>(
  'harmony.semantic-model/PromptInputCapturedRecord',
)({
  id: LedgerRecordId,
  recordKind: Schema.Literal('PromptInputCaptured'),
  recordedAt: Schema.NonEmptyString,
  source: PromptEvidenceSource,
}) {}

export class DocumentInputCapturedRecord extends Schema.Class<DocumentInputCapturedRecord>(
  'harmony.semantic-model/DocumentInputCapturedRecord',
)({
  id: LedgerRecordId,
  recordKind: Schema.Literal('DocumentInputCaptured'),
  recordedAt: Schema.NonEmptyString,
  source: DocumentEvidenceSource,
}) {}

export class SemanticIrProducedRecord extends Schema.Class<SemanticIrProducedRecord>(
  'harmony.semantic-model/SemanticIrProducedRecord',
)({
  id: LedgerRecordId,
  recordKind: Schema.Literal('SemanticIrProduced'),
  recordedAt: Schema.NonEmptyString,
  semanticIr: SemanticIr,
}) {}

export class CaseOpenedRecord extends Schema.Class<CaseOpenedRecord>(
  'harmony.semantic-model/CaseOpenedRecord',
)({
  id: LedgerRecordId,
  recordKind: Schema.Literal('CaseOpened'),
  recordedAt: Schema.NonEmptyString,
  case: Case,
}) {}

export class CorrectionCapturedRecord extends Schema.Class<CorrectionCapturedRecord>(
  'harmony.semantic-model/CorrectionCapturedRecord',
)({
  id: LedgerRecordId,
  recordKind: Schema.Literal('CorrectionCaptured'),
  recordedAt: Schema.NonEmptyString,
  source: CorrectionEvidenceSource,
  correction: Correction,
}) {}

export class ActiveSemanticEnvironmentConstructedRecord extends Schema.Class<ActiveSemanticEnvironmentConstructedRecord>(
  'harmony.semantic-model/ActiveSemanticEnvironmentConstructedRecord',
)({
  id: LedgerRecordId,
  recordKind: Schema.Literal('ActiveSemanticEnvironmentConstructed'),
  recordedAt: Schema.NonEmptyString,
  environment: ActiveSemanticEnvironment,
}) {}

export class SemanticLintReportProducedRecord extends Schema.Class<SemanticLintReportProducedRecord>(
  'harmony.semantic-model/SemanticLintReportProducedRecord',
)({
  id: LedgerRecordId,
  recordKind: Schema.Literal('SemanticLintReportProduced'),
  recordedAt: Schema.NonEmptyString,
  report: SemanticLintReport,
}) {}

export class CaseSemanticEditAppliedRecord extends Schema.Class<CaseSemanticEditAppliedRecord>(
  'harmony.semantic-model/CaseSemanticEditAppliedRecord',
)({
  id: LedgerRecordId,
  recordKind: Schema.Literal('CaseSemanticEditApplied'),
  recordedAt: Schema.NonEmptyString,
  caseId: CaseId,
  correctionId: CorrectionId,
  edit: CaseSemanticEdit,
  beforeIrRef: SemanticIrId,
  afterIrRef: SemanticIrId,
  case: Case,
}) {}

export class CorrectionDiagnosedRecord extends Schema.Class<CorrectionDiagnosedRecord>(
  'harmony.semantic-model/CorrectionDiagnosedRecord',
)({
  id: LedgerRecordId,
  recordKind: Schema.Literal('CorrectionDiagnosed'),
  recordedAt: Schema.NonEmptyString,
  diagnosis: CorrectionDiagnosis,
}) {}

export class NoSemanticPatchCandidateRecord extends Schema.Class<NoSemanticPatchCandidateRecord>(
  'harmony.semantic-model/NoSemanticPatchCandidateRecord',
)({
  id: LedgerRecordId,
  recordKind: Schema.Literal('NoSemanticPatchCandidate'),
  recordedAt: Schema.NonEmptyString,
  result: NoSemanticPatchCandidateResult,
}) {}

export class SemanticPatchCandidateProposedRecord extends Schema.Class<SemanticPatchCandidateProposedRecord>(
  'harmony.semantic-model/SemanticPatchCandidateProposedRecord',
)({
  id: LedgerRecordId,
  recordKind: Schema.Literal('SemanticPatchCandidateProposed'),
  recordedAt: Schema.NonEmptyString,
  result: SemanticPatchCandidateProposalResult,
  patchCandidate: SemanticPatchCandidate,
}) {}

export class RegressionCaseCreatedRecord extends Schema.Class<RegressionCaseCreatedRecord>(
  'harmony.semantic-model/RegressionCaseCreatedRecord',
)({
  id: LedgerRecordId,
  recordKind: Schema.Literal('RegressionCaseCreated'),
  recordedAt: Schema.NonEmptyString,
  regressionCase: RegressionCase,
}) {}

export class RegressionRunCompletedRecord extends Schema.Class<RegressionRunCompletedRecord>(
  'harmony.semantic-model/RegressionRunCompletedRecord',
)({
  id: LedgerRecordId,
  recordKind: Schema.Literal('RegressionRunCompleted'),
  recordedAt: Schema.NonEmptyString,
  regressionRun: RegressionRun,
  patchCandidate: SemanticPatchCandidate,
}) {}

export class SemanticPatchCandidatePublishedRecord extends Schema.Class<SemanticPatchCandidatePublishedRecord>(
  'harmony.semantic-model/SemanticPatchCandidatePublishedRecord',
)({
  id: LedgerRecordId,
  recordKind: Schema.Literal('SemanticPatchCandidatePublished'),
  recordedAt: Schema.NonEmptyString,
  patchCandidate: SemanticPatchCandidate,
  packageVersionId: PackageVersionId,
  publishedPackageId: PublishedPackageId,
  regressionRunId: RegressionRunId,
}) {}

export const LedgerRecord = Schema.Union([
  VocabularySourceImportedRecord,
  SemanticPackageDraftCompiledRecord,
  PackageVersionPublishedRecord,
  PromptInputCapturedRecord,
  DocumentInputCapturedRecord,
  SemanticIrProducedRecord,
  CaseOpenedRecord,
  CorrectionCapturedRecord,
  ActiveSemanticEnvironmentConstructedRecord,
  SemanticLintReportProducedRecord,
  CaseSemanticEditAppliedRecord,
  CorrectionDiagnosedRecord,
  NoSemanticPatchCandidateRecord,
  SemanticPatchCandidateProposedRecord,
  RegressionCaseCreatedRecord,
  RegressionRunCompletedRecord,
  SemanticPatchCandidatePublishedRecord,
])
export type LedgerRecordType = typeof LedgerRecord.Type
