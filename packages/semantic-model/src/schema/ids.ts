import { Schema } from 'effect'

function idPattern(prefix: string) {
  return Schema.NonEmptyString.check(
    Schema.isPattern(new RegExp(`^${prefix}:[A-Za-z0-9._:@-]+$`)),
  )
}

export const VocabularyInputId = idPattern('vocabulary-input').pipe(Schema.brand('VocabularyInputId'))

export const SemanticInputId = idPattern('semantic-input').pipe(Schema.brand('SemanticInputId'))
export type SemanticInputIdType = typeof SemanticInputId.Type

export const CaseId = idPattern('case').pipe(Schema.brand('CaseId'))
export type CaseIdType = typeof CaseId.Type

export const CorrectionId = idPattern('correction').pipe(Schema.brand('CorrectionId'))
export type CorrectionIdType = typeof CorrectionId.Type

export const CaseSemanticEditId = idPattern('case-semantic-edit').pipe(Schema.brand('CaseSemanticEditId'))

export const CorrectionDiagnosisId = idPattern('correction-diagnosis').pipe(Schema.brand('CorrectionDiagnosisId'))

export const CorrectionDiagnosisResultId = idPattern('correction-diagnosis-result').pipe(
  Schema.brand('CorrectionDiagnosisResultId'),
)

export const SemanticPatchCandidateId = idPattern('semantic-patch-candidate').pipe(
  Schema.brand('SemanticPatchCandidateId'),
)

export const RegressionCaseId = idPattern('regression-case').pipe(Schema.brand('RegressionCaseId'))

export const RegressionRunId = idPattern('regression-run').pipe(Schema.brand('RegressionRunId'))

export const SourceSpanId = idPattern('source-span').pipe(Schema.brand('SourceSpanId'))

export const DocumentSectionId = idPattern('document-section').pipe(Schema.brand('DocumentSectionId'))

export const EvidenceSourceId = idPattern('evidence-source').pipe(Schema.brand('EvidenceSourceId'))

export const SemanticIrId = idPattern('semantic-ir').pipe(Schema.brand('SemanticIrId'))

export const RelationAssertionId = idPattern('relation-assertion').pipe(Schema.brand('RelationAssertionId'))

export const RequestFrameId = idPattern('request-frame').pipe(Schema.brand('RequestFrameId'))

export const CompetingInterpretationId = idPattern('competing-interpretation').pipe(
  Schema.brand('CompetingInterpretationId'),
)

export const ClarificationDecisionId = idPattern('clarification-decision').pipe(
  Schema.brand('ClarificationDecisionId'),
)

export const PackageId = idPattern('package').pipe(Schema.brand('PackageId'))
export type PackageIdType = typeof PackageId.Type

export const PackageDraftId = idPattern('package-draft').pipe(Schema.brand('PackageDraftId'))

export const PublishedPackageId = idPattern('published-package').pipe(Schema.brand('PublishedPackageId'))

export const PackageVersionId = idPattern('package-version').pipe(Schema.brand('PackageVersionId'))

export const ActiveEnvironmentId = idPattern('active-environment').pipe(Schema.brand('ActiveEnvironmentId'))

export const SemanticRuleId = idPattern('semantic-rule').pipe(Schema.brand('SemanticRuleId'))

export const LintFindingId = idPattern('lint-finding').pipe(Schema.brand('LintFindingId'))

export const LintReportId = idPattern('lint-report').pipe(Schema.brand('LintReportId'))

export const LocalSemanticContextId = idPattern('local-context').pipe(Schema.brand('LocalSemanticContextId'))

export const SemanticKernelId = idPattern('semantic-kernel').pipe(Schema.brand('SemanticKernelId'))

export const TermId = idPattern('term').pipe(Schema.brand('TermId'))

export const LexicalSenseId = idPattern('lexical-sense').pipe(Schema.brand('LexicalSenseId'))

export const ConceptId = idPattern('concept').pipe(Schema.brand('ConceptId'))

export const DefinitionId = idPattern('definition').pipe(Schema.brand('DefinitionId'))

export const LedgerRecordId = idPattern('ledger-record').pipe(Schema.brand('LedgerRecordId'))

export const Namespace = Schema.NonEmptyString.check(
  Schema.isPattern(/^\w[\w.-]*$/),
).pipe(Schema.brand('Namespace'))
