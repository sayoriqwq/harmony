import { Schema } from 'effect'
import { CaseId, CaseSemanticEditId, CorrectionDiagnosisId, CorrectionId, EvidenceSourceId, PackageDraftId, PackageVersionId, RegressionCaseId, RegressionRunId, SemanticPatchCandidateId } from './ids.ts'
import { DocumentEvidenceSource, EvidenceSource, PromptEvidenceSource } from './input.ts'
import { PackageVersion, PublishedSemanticPackage, SemanticPackageDraft } from './package.ts'
import { SemanticIr } from './semantic-ir.ts'

export class VocabularyCompileResult extends Schema.Class<VocabularyCompileResult>(
  'harmony.semantic-model/VocabularyCompileResult',
)({
  evidenceSource: EvidenceSource,
  draft: SemanticPackageDraft,
}) {}

export class PackagePublishResult extends Schema.Class<PackagePublishResult>(
  'harmony.semantic-model/PackagePublishResult',
)({
  publishedPackage: PublishedSemanticPackage,
  packageVersion: PackageVersion,
}) {}

export class VocabularyDraftPublicationSource extends Schema.Class<VocabularyDraftPublicationSource>(
  'harmony.semantic-model/VocabularyDraftPublicationSource',
)({
  sourceKind: Schema.Literal('vocabulary_draft'),
  sourceDraftId: PackageDraftId,
  sourceIds: Schema.Array(EvidenceSourceId),
}) {}

export class SemanticPatchCandidatePublicationSource extends Schema.Class<SemanticPatchCandidatePublicationSource>(
  'harmony.semantic-model/SemanticPatchCandidatePublicationSource',
)({
  sourceKind: Schema.Literal('semantic_patch_candidate'),
  patchCandidateId: SemanticPatchCandidateId,
  sourceCaseId: CaseId,
  sourceCorrectionId: CorrectionId,
  sourceCaseSemanticEditId: CaseSemanticEditId,
  sourceDiagnosisId: CorrectionDiagnosisId,
  regressionCaseId: RegressionCaseId,
  regressionRunId: RegressionRunId,
  previousPackageVersionId: PackageVersionId,
}) {}

export const PackageVersionPublicationSource = Schema.Union([
  VocabularyDraftPublicationSource,
  SemanticPatchCandidatePublicationSource,
])
export type PackageVersionPublicationSourceType = typeof PackageVersionPublicationSource.Type

export class PromptParseResult extends Schema.Class<PromptParseResult>(
  'harmony.semantic-model/PromptParseResult',
)({
  evidenceSource: PromptEvidenceSource,
  semanticIr: SemanticIr,
}) {}

export class DocumentParseResult extends Schema.Class<DocumentParseResult>(
  'harmony.semantic-model/DocumentParseResult',
)({
  evidenceSource: DocumentEvidenceSource,
  semanticIr: SemanticIr,
}) {}
