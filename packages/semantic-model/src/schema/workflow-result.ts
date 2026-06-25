import { Schema } from 'effect'
import { Case, CaseSemanticEdit } from './case.ts'
import { CorrectionDiagnosis } from './correction-diagnosis.ts'
import { CorrectionDiagnosisGateResult } from './correction-gate.ts'
import { ActiveSemanticEnvironment } from './environment.ts'
import { EvidenceSourceId, LedgerRecordId, PackageId, PackageVersionId, PublishedPackageId } from './ids.ts'
import { Correction, CorrectionEvidenceSource, DocumentEvidenceSource, EvidenceSource, PromptEvidenceSource } from './input.ts'
import { ActiveSemanticEnvironmentConstructedRecord, CaseOpenedRecord, CaseSemanticEditAppliedRecord, CorrectionCapturedRecord, CorrectionDiagnosedRecord, LedgerRecord, NoSemanticPatchCandidateRecord, PackageVersionPublishedRecord, RegressionCaseCreatedRecord, RegressionRunCompletedRecord, SemanticPatchCandidateProposedRecord, SemanticPatchCandidatePublishedRecord } from './ledger-record.ts'
import { SemanticLintReport } from './lint.ts'
import { PackageVersion, PublishedSemanticPackage, SemanticPackageDraft } from './package.ts'
import { RegressionCase, RegressionRun } from './regression.ts'
import { RequestDecision } from './request-decision.ts'
import { SemanticIr } from './semantic-ir.ts'
import { SemanticPatchCandidate } from './semantic-patch.ts'

export class PromptClarificationWorkflowResult extends Schema.Class<PromptClarificationWorkflowResult>(
  'harmony.semantic-model/PromptClarificationWorkflowResult',
)({
  evidenceSource: PromptEvidenceSource,
  semanticIr: SemanticIr,
  decision: RequestDecision,
  ledgerRecords: Schema.Array(LedgerRecord),
}) {}

export class DocumentSemanticLintWorkflowResult extends Schema.Class<DocumentSemanticLintWorkflowResult>(
  'harmony.semantic-model/DocumentSemanticLintWorkflowResult',
)({
  evidenceSource: DocumentEvidenceSource,
  semanticIr: SemanticIr,
  report: SemanticLintReport,
  ledgerRecords: Schema.Array(LedgerRecord),
}) {}

export class PackageCurrentView extends Schema.Class<PackageCurrentView>(
  'harmony.semantic-model/PackageCurrentView',
)({
  packageId: PackageId,
  currentVersionId: PackageVersionId,
  publishedPackageId: PublishedPackageId,
  packageVersion: PackageVersion,
  publishedPackage: PublishedSemanticPackage,
  sourceIds: Schema.Array(EvidenceSourceId),
  ledgerRecordIds: Schema.Array(LedgerRecordId),
}) {}

export class CompileAndPublishResult extends Schema.Class<CompileAndPublishResult>(
  'harmony.semantic-model/CompileAndPublishResult',
)({
  evidenceSource: EvidenceSource,
  draft: SemanticPackageDraft,
  publishedPackage: PublishedSemanticPackage,
  packageVersion: PackageVersion,
  currentView: PackageCurrentView,
  ledgerRecords: Schema.Array(LedgerRecord),
}) {}

export class ActiveEnvironmentBuildResult extends Schema.Class<ActiveEnvironmentBuildResult>(
  'harmony.semantic-model/ActiveEnvironmentBuildResult',
)({
  environment: ActiveSemanticEnvironment,
  ledgerRecord: ActiveSemanticEnvironmentConstructedRecord,
  ledgerRecords: Schema.Array(LedgerRecord),
}) {}

export class CaseOpenResult extends Schema.Class<CaseOpenResult>(
  'harmony.semantic-model/CaseOpenResult',
)({
  case: Case,
  ledgerRecord: CaseOpenedRecord,
  ledgerRecords: Schema.Array(LedgerRecord),
}) {}

export class CorrectionCaptureResult extends Schema.Class<CorrectionCaptureResult>(
  'harmony.semantic-model/CorrectionCaptureResult',
)({
  source: CorrectionEvidenceSource,
  correction: Correction,
  ledgerRecord: CorrectionCapturedRecord,
  ledgerRecords: Schema.Array(LedgerRecord),
}) {}

export class CaseSemanticEditApplicationResult extends Schema.Class<CaseSemanticEditApplicationResult>(
  'harmony.semantic-model/CaseSemanticEditApplicationResult',
)({
  case: Case,
  correction: Correction,
  edit: CaseSemanticEdit,
  beforeSemanticIr: SemanticIr,
  afterSemanticIr: SemanticIr,
  appliedRecord: CaseSemanticEditAppliedRecord,
  ledgerRecords: Schema.Array(LedgerRecord),
}) {}

export class CorrectionDiagnosisWorkflowResult extends Schema.Class<CorrectionDiagnosisWorkflowResult>(
  'harmony.semantic-model/CorrectionDiagnosisWorkflowResult',
)({
  diagnosis: CorrectionDiagnosis,
  gateResult: CorrectionDiagnosisGateResult,
  diagnosedRecord: CorrectionDiagnosedRecord,
  gateRecord: Schema.Union([NoSemanticPatchCandidateRecord, SemanticPatchCandidateProposedRecord]),
  ledgerRecords: Schema.Array(LedgerRecord),
}) {}

export class RegressionCaseCreationResult extends Schema.Class<RegressionCaseCreationResult>(
  'harmony.semantic-model/RegressionCaseCreationResult',
)({
  regressionCase: RegressionCase,
  ledgerRecord: RegressionCaseCreatedRecord,
  ledgerRecords: Schema.Array(LedgerRecord),
}) {}

export class RegressionRunResult extends Schema.Class<RegressionRunResult>('harmony.semantic-model/RegressionRunResult')({
  regressionCase: RegressionCase,
  regressionRun: RegressionRun,
  patchCandidate: SemanticPatchCandidate,
  ledgerRecord: RegressionRunCompletedRecord,
  ledgerRecords: Schema.Array(LedgerRecord),
}) {}

export class SemanticPatchPublicationResult extends Schema.Class<SemanticPatchPublicationResult>(
  'harmony.semantic-model/SemanticPatchPublicationResult',
)({
  patchCandidate: SemanticPatchCandidate,
  regressionRun: RegressionRun,
  publishedPackage: PublishedSemanticPackage,
  packageVersion: PackageVersion,
  previousPackageVersion: PackageVersion,
  packageVersionRecord: PackageVersionPublishedRecord,
  patchCandidatePublishedRecord: SemanticPatchCandidatePublishedRecord,
  currentView: PackageCurrentView,
  ledgerRecords: Schema.Array(LedgerRecord),
}) {}
