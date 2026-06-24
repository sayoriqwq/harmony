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

export const VocabularyKind = Schema.Literals(['base', 'domain'])

export const ArtifactStatus = Schema.Literals(['extracted', 'candidate'])

export const AssertionLifecycle = Schema.Literals(['draft', 'published'])

export const EnvironmentPackageRole = Schema.Literals(['base', 'domain'])

export const PackageActivationReason = Schema.Literals(['default_base_layer', 'explicit_domain_toggle'])

export const PromptRole = Schema.Literals(['user_request'])

export const RequestAction = Schema.Literals(['validate', 'rewrite'])

export const RequestBehavior = Schema.Literals(['review_without_modifying', 'modify_target_content'])

export const DeclaredCompleteness = Schema.Literals(['complete', 'partial', 'unspecified'])

export const RelationPredicate = Schema.Literals(['mentions_required_evidence', 'negates_required_evidence'])

export const AssertionStatus = Schema.Literals(['extracted', 'conflicted', 'unresolved'])

export const ParseDecisionState = Schema.Literals(['parsed', 'parse_uncertain', 'requires_clarification'])

export const ClarificationReason = Schema.Literals(['behavior_changing_action_ambiguity'])

export const LintRuleKind = Schema.Literals(['required_relation'])

export const SemanticLintClassification = Schema.Literals([
  'parse_uncertainty',
  'supported',
  'conflicted',
  'violated',
  'unknown',
])

export const CaseStatus = Schema.Literals(['opened', 'locally_corrected'])

export const PackageVersionState = Schema.Literals(['published'])

export const SemanticPatchCandidateLifecycle = Schema.Literals(['proposed', 'published'])

export const SemanticPatchCandidateState = Schema.Literals([
  'awaiting_regression',
  'regression_passed',
  'regression_failed',
  'published',
])

export const SemanticPatchCandidateKind = Schema.Literals([
  'case_binding_example_patch',
  'base_layer_patch',
  'domain_package_patch',
  'package_selection_patch',
  'parser_policy_patch',
  'lint_rule_patch',
  'rule_scope_patch',
  'business_version_patch',
])

export const SemanticPatchExpectedImpactKind = Schema.Literals([
  'package_definition_update',
  'runtime_policy_update',
])

export const SemanticPatchTargetKind = Schema.Literals([
  'semantic_package',
  'active_environment',
  'semantic_rule',
])

export const RegressionAssertionOutcome = Schema.Literals(['passed', 'failed'])

export const RegressionAssertionKind = Schema.Literals(['package_definition_contains'])

export const PatchPublicationExpectedOutcome = Schema.Literals([
  'domain_patch_candidate',
  'regression_run_passed',
])

export const LintFindingReason = Schema.Literals([
  'parse_uncertain_alias',
  'required_relation_present',
  'conflicting_evidence',
  'missing_required_relation_in_complete_scope',
  'insufficient_evidence_in_open_scope',
])

export class SourceSpan extends Schema.Class<SourceSpan>('harmony.semantic-model/SourceSpan')({
  id: SourceSpanId,
  startOffset: Schema.Number,
  endOffset: Schema.Number,
  text: Schema.NonEmptyString,
}) {}

export class DocumentSection extends Schema.Class<DocumentSection>('harmony.semantic-model/DocumentSection')({
  id: DocumentSectionId,
  title: Schema.NonEmptyString,
  content: Schema.NonEmptyString,
  declaredCompleteness: DeclaredCompleteness,
  spans: Schema.Array(SourceSpan),
}) {}

export class VocabularyInput extends Schema.Class<VocabularyInput>('harmony.semantic-model/VocabularyInput')({
  id: VocabularyInputId,
  inputKind: Schema.Literal('vocabulary'),
  content: Schema.NonEmptyString,
  vocabularyKind: VocabularyKind,
  namespace: Namespace,
  spans: Schema.Array(SourceSpan),
}) {}

export class PromptInput extends Schema.Class<PromptInput>('harmony.semantic-model/PromptInput')({
  id: SemanticInputId,
  inputKind: Schema.Literal('prompt'),
  content: Schema.NonEmptyString,
  promptRole: PromptRole,
  targetRefs: Schema.Array(SemanticInputId),
  spans: Schema.Array(SourceSpan),
}) {}

export class DocumentInput extends Schema.Class<DocumentInput>('harmony.semantic-model/DocumentInput')({
  id: SemanticInputId,
  inputKind: Schema.Literal('document'),
  content: Schema.NonEmptyString,
  declaredCompleteness: DeclaredCompleteness,
  sections: Schema.Array(DocumentSection),
  spans: Schema.Array(SourceSpan),
}) {}

export const SemanticInput = Schema.Union([PromptInput, DocumentInput, VocabularyInput])
export type SemanticInputType = typeof SemanticInput.Type

export class EvidenceRef extends Schema.Class<EvidenceRef>('harmony.semantic-model/EvidenceRef')({
  sourceId: EvidenceSourceId,
  spanId: SourceSpanId,
}) {}

export class EvidenceSource extends Schema.Class<EvidenceSource>('harmony.semantic-model/EvidenceSource')({
  id: EvidenceSourceId,
  evidenceKind: Schema.Literal('vocabulary-source'),
  inputRef: VocabularyInputId,
  originalText: Schema.NonEmptyString,
  spans: Schema.Array(SourceSpan),
  capturedAt: Schema.NonEmptyString,
}) {}

export class PromptEvidenceSource extends Schema.Class<PromptEvidenceSource>(
  'harmony.semantic-model/PromptEvidenceSource',
)({
  id: EvidenceSourceId,
  evidenceKind: Schema.Literal('prompt-source'),
  inputRef: SemanticInputId,
  originalText: Schema.NonEmptyString,
  spans: Schema.Array(SourceSpan),
  capturedAt: Schema.NonEmptyString,
}) {}

export class DocumentEvidenceSource extends Schema.Class<DocumentEvidenceSource>(
  'harmony.semantic-model/DocumentEvidenceSource',
)({
  id: EvidenceSourceId,
  evidenceKind: Schema.Literal('document-source'),
  inputRef: SemanticInputId,
  originalText: Schema.NonEmptyString,
  sections: Schema.Array(DocumentSection),
  spans: Schema.Array(SourceSpan),
  capturedAt: Schema.NonEmptyString,
}) {}

export class CorrectionEvidenceSource extends Schema.Class<CorrectionEvidenceSource>(
  'harmony.semantic-model/CorrectionEvidenceSource',
)({
  id: EvidenceSourceId,
  evidenceKind: Schema.Literal('correction-source'),
  caseRef: CaseId,
  correctionRef: CorrectionId,
  originalText: Schema.NonEmptyString,
  spans: Schema.Array(SourceSpan),
  capturedAt: Schema.NonEmptyString,
}) {}

export class Correction extends Schema.Class<Correction>('harmony.semantic-model/Correction')({
  id: CorrectionId,
  artifactKind: Schema.Literal('correction'),
  caseId: CaseId,
  targetIrRef: SemanticIrId,
  evidenceSourceId: EvidenceSourceId,
  userText: Schema.NonEmptyString,
  capturedAt: Schema.NonEmptyString,
}) {}

export class Term extends Schema.Class<Term>('harmony.semantic-model/Term')({
  id: TermId,
  artifactKind: Schema.Literal('term'),
  packageId: PackageId,
  namespace: Namespace,
  label: Schema.NonEmptyString,
  status: ArtifactStatus,
  lifecycle: AssertionLifecycle,
  authority: Schema.Literal('imported_source'),
  evidenceRefs: Schema.Array(EvidenceRef),
}) {}

export class LexicalSense extends Schema.Class<LexicalSense>('harmony.semantic-model/LexicalSense')({
  id: LexicalSenseId,
  artifactKind: Schema.Literal('lexical-sense'),
  packageId: PackageId,
  namespace: Namespace,
  termId: TermId,
  conceptId: ConceptId,
  definitionId: DefinitionId,
  status: ArtifactStatus,
  lifecycle: AssertionLifecycle,
  authority: Schema.Literal('imported_source'),
  evidenceRefs: Schema.Array(EvidenceRef),
}) {}

export class Concept extends Schema.Class<Concept>('harmony.semantic-model/Concept')({
  id: ConceptId,
  artifactKind: Schema.Literal('concept'),
  packageId: PackageId,
  namespace: Namespace,
  canonicalLabel: Schema.NonEmptyString,
  status: ArtifactStatus,
  lifecycle: AssertionLifecycle,
  authority: Schema.Literal('imported_source'),
  evidenceRefs: Schema.Array(EvidenceRef),
}) {}

export class Definition extends Schema.Class<Definition>('harmony.semantic-model/Definition')({
  id: DefinitionId,
  artifactKind: Schema.Literal('definition'),
  packageId: PackageId,
  namespace: Namespace,
  conceptId: ConceptId,
  text: Schema.NonEmptyString,
  status: ArtifactStatus,
  lifecycle: AssertionLifecycle,
  authority: Schema.Literal('imported_source'),
  evidenceRefs: Schema.Array(EvidenceRef),
}) {}

export const StructuredArtifacts = Schema.Struct({
  terms: Schema.Array(Term),
  lexicalSenses: Schema.Array(LexicalSense),
  concepts: Schema.Array(Concept),
  definitions: Schema.Array(Definition),
})

export class DraftRelationCandidate extends Schema.Class<DraftRelationCandidate>(
  'harmony.semantic-model/DraftRelationCandidate',
)({
  status: Schema.Literal('candidate'),
  rationale: Schema.NonEmptyString,
  evidenceRefs: Schema.Array(EvidenceRef),
}) {}

export class DraftConstraintCandidate extends Schema.Class<DraftConstraintCandidate>(
  'harmony.semantic-model/DraftConstraintCandidate',
)({
  status: Schema.Literal('candidate'),
  rationale: Schema.NonEmptyString,
  evidenceRefs: Schema.Array(EvidenceRef),
}) {}

export class RuntimeBindingIdentity extends Schema.Class<RuntimeBindingIdentity>(
  'harmony.semantic-model/RuntimeBindingIdentity',
)({
  schemaVersion: Schema.Literal('semantic-package.v1'),
  compilerVersion: Schema.NonEmptyString,
  publisherVersion: Schema.NonEmptyString,
  effectVersion: Schema.NonEmptyString,
}) {}

export class SemanticPackageDraft extends Schema.Class<SemanticPackageDraft>(
  'harmony.semantic-model/SemanticPackageDraft',
)({
  id: PackageDraftId,
  packageId: PackageId,
  sourceId: EvidenceSourceId,
  namespace: Namespace,
  lifecycle: Schema.Literal('draft'),
  artifacts: StructuredArtifacts,
  relationCandidates: Schema.Array(DraftRelationCandidate),
  constraintCandidates: Schema.Array(DraftConstraintCandidate),
  createdAt: Schema.NonEmptyString,
}) {}

export class PublishedSemanticPackage extends Schema.Class<PublishedSemanticPackage>(
  'harmony.semantic-model/PublishedSemanticPackage',
)({
  id: PublishedPackageId,
  packageId: PackageId,
  namespace: Namespace,
  lifecycle: Schema.Literal('published'),
  artifacts: StructuredArtifacts,
  authoritativeRelations: Schema.Array(Schema.Never),
  authoritativeConstraints: Schema.Array(Schema.Never),
  publishedAt: Schema.NonEmptyString,
}) {}

export class PackageVersion extends Schema.Class<PackageVersion>('harmony.semantic-model/PackageVersion')({
  id: PackageVersionId,
  packageId: PackageId,
  version: Schema.NonEmptyString,
  state: PackageVersionState,
  publishedPackageId: PublishedPackageId,
  sourceDraftId: PackageDraftId,
  runtimeBinding: RuntimeBindingIdentity,
  publishedAt: Schema.NonEmptyString,
}) {}

export class SemanticKernelIdentity extends Schema.Class<SemanticKernelIdentity>(
  'harmony.semantic-model/SemanticKernelIdentity',
)({
  id: SemanticKernelId,
  protocolVersion: Schema.Literal('semantic-kernel.v1'),
  version: Schema.NonEmptyString,
}) {}

export class LocalSemanticContext extends Schema.Class<LocalSemanticContext>(
  'harmony.semantic-model/LocalSemanticContext',
)({
  id: LocalSemanticContextId,
  contextKind: Schema.Literal('case-local'),
  description: Schema.NonEmptyString,
  evidenceRefs: Schema.Array(EvidenceRef),
}) {}

export class PackageActivation extends Schema.Class<PackageActivation>(
  'harmony.semantic-model/PackageActivation',
)({
  packageId: PackageId,
  packageVersionId: PackageVersionId,
  version: Schema.NonEmptyString,
  publishedPackageId: PublishedPackageId,
  namespace: Namespace,
  role: EnvironmentPackageRole,
  activationReason: PackageActivationReason,
  sourceIds: Schema.Array(EvidenceSourceId),
  ledgerRecordIds: Schema.Array(LedgerRecordId),
}) {}

export class EnvironmentSemanticBinding extends Schema.Class<EnvironmentSemanticBinding>(
  'harmony.semantic-model/EnvironmentSemanticBinding',
)({
  termId: TermId,
  lexicalSenseId: LexicalSenseId,
  conceptId: ConceptId,
  definitionId: DefinitionId,
  termLabel: Schema.NonEmptyString,
  definitionText: Schema.NonEmptyString,
  packageId: PackageId,
  packageVersionId: PackageVersionId,
  namespace: Namespace,
  packageRole: EnvironmentPackageRole,
  evidenceRefs: Schema.Array(EvidenceRef),
}) {}

export class ActiveEnvironmentProvenance extends Schema.Class<ActiveEnvironmentProvenance>(
  'harmony.semantic-model/ActiveEnvironmentProvenance',
)({
  basePackageId: PackageId,
  requestedDomainPackageIds: Schema.Array(PackageId),
  enabledDomainPackageIds: Schema.Array(PackageId),
  packageVersionIds: Schema.Array(PackageVersionId),
  sourceIds: Schema.Array(EvidenceSourceId),
  ledgerRecordIds: Schema.Array(LedgerRecordId),
  createdAt: Schema.NonEmptyString,
}) {}

export class ActiveSemanticEnvironment extends Schema.Class<ActiveSemanticEnvironment>(
  'harmony.semantic-model/ActiveSemanticEnvironment',
)({
  id: ActiveEnvironmentId,
  artifactKind: Schema.Literal('active-semantic-environment'),
  semanticKernel: SemanticKernelIdentity,
  baseLayer: PackageActivation,
  enabledDomainPackages: Schema.Array(PackageActivation),
  localContext: LocalSemanticContext,
  semanticBindings: Schema.Array(EnvironmentSemanticBinding),
  provenance: ActiveEnvironmentProvenance,
  createdAt: Schema.NonEmptyString,
}) {}

export class ActiveEnvironmentBuildRequest extends Schema.Class<ActiveEnvironmentBuildRequest>(
  'harmony.semantic-model/ActiveEnvironmentBuildRequest',
)({
  environmentId: ActiveEnvironmentId,
  localContext: LocalSemanticContext,
  enabledDomainPackageIds: Schema.Array(PackageId),
}) {}

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

export class SemanticRuleRef extends Schema.Class<SemanticRuleRef>('harmony.semantic-model/SemanticRuleRef')({
  ruleId: SemanticRuleId,
  ruleKind: LintRuleKind,
  packageId: PackageId,
  packageVersionId: PackageVersionId,
  namespace: Namespace,
  description: Schema.NonEmptyString,
}) {}

export class SemanticPackageRef extends Schema.Class<SemanticPackageRef>('harmony.semantic-model/SemanticPackageRef')({
  packageId: PackageId,
  packageVersionId: PackageVersionId,
  namespace: Namespace,
  role: EnvironmentPackageRole,
}) {}

export class CorrectionDiagnosisEvidence extends Schema.Class<CorrectionDiagnosisEvidence>(
  'harmony.semantic-model/CorrectionDiagnosisEvidence',
)({
  caseId: CaseId,
  correctionId: CorrectionId,
  caseSemanticEditId: CaseSemanticEditId,
  beforeIrRef: SemanticIrId,
  afterIrRef: SemanticIrId,
  evidenceRefs: Schema.Array(EvidenceRef),
}) {}

export class CorrectionDiagnosisRationale extends Schema.Class<CorrectionDiagnosisRationale>(
  'harmony.semantic-model/CorrectionDiagnosisRationale',
)({
  summary: Schema.NonEmptyString,
  promotionDecision: Schema.NonEmptyString,
}) {}

const CorrectionDiagnosisCommonFields = {
  id: CorrectionDiagnosisId,
  artifactKind: Schema.Literal('correction-diagnosis'),
  evidence: CorrectionDiagnosisEvidence,
  evidenceRefs: Schema.Array(EvidenceRef),
  rationale: CorrectionDiagnosisRationale,
}

export class LocalCaseBindingErrorDiagnosis extends Schema.Class<LocalCaseBindingErrorDiagnosis>(
  'harmony.semantic-model/LocalCaseBindingErrorDiagnosis',
)({
  ...CorrectionDiagnosisCommonFields,
  diagnosisKind: Schema.Literal('LocalCaseBindingError'),
  targetEnvironmentRef: ActiveEnvironmentId,
}) {}

export class BaseLayerMissingOrWrongDiagnosis extends Schema.Class<BaseLayerMissingOrWrongDiagnosis>(
  'harmony.semantic-model/BaseLayerMissingOrWrongDiagnosis',
)({
  ...CorrectionDiagnosisCommonFields,
  diagnosisKind: Schema.Literal('BaseLayerMissingOrWrong'),
  targetPackage: SemanticPackageRef,
}) {}

export class DomainPackageMissingOrWrongDiagnosis extends Schema.Class<DomainPackageMissingOrWrongDiagnosis>(
  'harmony.semantic-model/DomainPackageMissingOrWrongDiagnosis',
)({
  ...CorrectionDiagnosisCommonFields,
  diagnosisKind: Schema.Literal('DomainPackageMissingOrWrong'),
  targetPackage: SemanticPackageRef,
}) {}

export class PackageSelectionErrorDiagnosis extends Schema.Class<PackageSelectionErrorDiagnosis>(
  'harmony.semantic-model/PackageSelectionErrorDiagnosis',
)({
  ...CorrectionDiagnosisCommonFields,
  diagnosisKind: Schema.Literal('PackageSelectionError'),
  targetEnvironmentRef: ActiveEnvironmentId,
}) {}

export class ParserNegationScopeConditionErrorDiagnosis extends Schema.Class<ParserNegationScopeConditionErrorDiagnosis>(
  'harmony.semantic-model/ParserNegationScopeConditionErrorDiagnosis',
)({
  ...CorrectionDiagnosisCommonFields,
  diagnosisKind: Schema.Literal('ParserNegationScopeConditionError'),
  targetEnvironmentRef: ActiveEnvironmentId,
}) {}

export class LintRuleWrongDiagnosis extends Schema.Class<LintRuleWrongDiagnosis>(
  'harmony.semantic-model/LintRuleWrongDiagnosis',
)({
  ...CorrectionDiagnosisCommonFields,
  diagnosisKind: Schema.Literal('LintRuleWrong'),
  targetRule: SemanticRuleRef,
}) {}

export class RuleScopeWrongDiagnosis extends Schema.Class<RuleScopeWrongDiagnosis>(
  'harmony.semantic-model/RuleScopeWrongDiagnosis',
)({
  ...CorrectionDiagnosisCommonFields,
  diagnosisKind: Schema.Literal('RuleScopeWrong'),
  targetRule: SemanticRuleRef,
}) {}

export class BusinessVersionChangedDiagnosis extends Schema.Class<BusinessVersionChangedDiagnosis>(
  'harmony.semantic-model/BusinessVersionChangedDiagnosis',
)({
  ...CorrectionDiagnosisCommonFields,
  diagnosisKind: Schema.Literal('BusinessVersionChanged'),
  targetPackage: SemanticPackageRef,
}) {}

export class LocalCorrectionOnlyDiagnosis extends Schema.Class<LocalCorrectionOnlyDiagnosis>(
  'harmony.semantic-model/LocalCorrectionOnlyDiagnosis',
)({
  ...CorrectionDiagnosisCommonFields,
  diagnosisKind: Schema.Literal('LocalCorrectionOnly'),
}) {}

export const CorrectionDiagnosis = Schema.Union([
  LocalCaseBindingErrorDiagnosis,
  BaseLayerMissingOrWrongDiagnosis,
  DomainPackageMissingOrWrongDiagnosis,
  PackageSelectionErrorDiagnosis,
  ParserNegationScopeConditionErrorDiagnosis,
  LintRuleWrongDiagnosis,
  RuleScopeWrongDiagnosis,
  BusinessVersionChangedDiagnosis,
  LocalCorrectionOnlyDiagnosis,
])
export type CorrectionDiagnosisType = typeof CorrectionDiagnosis.Type

export class BaseSemanticPatchScope extends Schema.Class<BaseSemanticPatchScope>(
  'harmony.semantic-model/BaseSemanticPatchScope',
)({
  scopeKind: Schema.Literal('base'),
  packageRef: SemanticPackageRef,
}) {}

export class DomainSemanticPatchScope extends Schema.Class<DomainSemanticPatchScope>(
  'harmony.semantic-model/DomainSemanticPatchScope',
)({
  scopeKind: Schema.Literal('domain'),
  packageRef: SemanticPackageRef,
}) {}

export class PackageSelectionPatchScope extends Schema.Class<PackageSelectionPatchScope>(
  'harmony.semantic-model/PackageSelectionPatchScope',
)({
  scopeKind: Schema.Literal('package_selection'),
  environmentRef: ActiveEnvironmentId,
}) {}

export class ParserPatchScope extends Schema.Class<ParserPatchScope>('harmony.semantic-model/ParserPatchScope')({
  scopeKind: Schema.Literal('parser'),
  environmentRef: ActiveEnvironmentId,
}) {}

export class RulePatchScope extends Schema.Class<RulePatchScope>('harmony.semantic-model/RulePatchScope')({
  scopeKind: Schema.Literal('rule'),
  ruleRef: SemanticRuleRef,
}) {}

export class RuleScopePatchScope extends Schema.Class<RuleScopePatchScope>(
  'harmony.semantic-model/RuleScopePatchScope',
)({
  scopeKind: Schema.Literal('rule_scope'),
  ruleRef: SemanticRuleRef,
}) {}

export class BusinessVersionPatchScope extends Schema.Class<BusinessVersionPatchScope>(
  'harmony.semantic-model/BusinessVersionPatchScope',
)({
  scopeKind: Schema.Literal('version'),
  packageRef: SemanticPackageRef,
}) {}

export const SemanticPatchScope = Schema.Union([
  BaseSemanticPatchScope,
  DomainSemanticPatchScope,
  PackageSelectionPatchScope,
  ParserPatchScope,
  RulePatchScope,
  RuleScopePatchScope,
  BusinessVersionPatchScope,
])
export type SemanticPatchScopeType = typeof SemanticPatchScope.Type

export class SemanticPackagePatchTarget extends Schema.Class<SemanticPackagePatchTarget>(
  'harmony.semantic-model/SemanticPackagePatchTarget',
)({
  targetKind: Schema.Literal('semantic_package'),
  packageRef: SemanticPackageRef,
}) {}

export class ActiveEnvironmentPatchTarget extends Schema.Class<ActiveEnvironmentPatchTarget>(
  'harmony.semantic-model/ActiveEnvironmentPatchTarget',
)({
  targetKind: Schema.Literal('active_environment'),
  environmentRef: ActiveEnvironmentId,
}) {}

export class SemanticRulePatchTarget extends Schema.Class<SemanticRulePatchTarget>(
  'harmony.semantic-model/SemanticRulePatchTarget',
)({
  targetKind: Schema.Literal('semantic_rule'),
  ruleRef: SemanticRuleRef,
}) {}

export const SemanticPatchTarget = Schema.Union([
  SemanticPackagePatchTarget,
  ActiveEnvironmentPatchTarget,
  SemanticRulePatchTarget,
])
export type SemanticPatchTargetType = typeof SemanticPatchTarget.Type

export class PackageDefinitionExpectedImpact extends Schema.Class<PackageDefinitionExpectedImpact>(
  'harmony.semantic-model/PackageDefinitionExpectedImpact',
)({
  impactKind: Schema.Literal('package_definition_update'),
  summary: Schema.NonEmptyString,
  expectedDefinitionText: Schema.NonEmptyString,
  expectedBehavior: Schema.NonEmptyString,
}) {}

export class RuntimePolicyExpectedImpact extends Schema.Class<RuntimePolicyExpectedImpact>(
  'harmony.semantic-model/RuntimePolicyExpectedImpact',
)({
  impactKind: Schema.Literal('runtime_policy_update'),
  summary: Schema.NonEmptyString,
  expectedBehavior: Schema.NonEmptyString,
}) {}

export const SemanticPatchExpectedImpact = Schema.Union([
  PackageDefinitionExpectedImpact,
  RuntimePolicyExpectedImpact,
])
export type SemanticPatchExpectedImpactType = typeof SemanticPatchExpectedImpact.Type

export class SemanticPatchCandidate extends Schema.Class<SemanticPatchCandidate>(
  'harmony.semantic-model/SemanticPatchCandidate',
)({
  id: SemanticPatchCandidateId,
  artifactKind: Schema.Literal('semantic-patch-candidate'),
  candidateKind: SemanticPatchCandidateKind,
  lifecycle: SemanticPatchCandidateLifecycle,
  state: SemanticPatchCandidateState,
  target: SemanticPatchTarget,
  sourceCaseId: CaseId,
  sourceCorrectionId: CorrectionId,
  sourceCaseSemanticEditId: CaseSemanticEditId,
  sourceDiagnosisId: CorrectionDiagnosisId,
  scope: SemanticPatchScope,
  proposedChangeSummary: Schema.NonEmptyString,
  rationale: CorrectionDiagnosisRationale,
  expectedImpact: SemanticPatchExpectedImpact,
  evidenceRefs: Schema.Array(EvidenceRef),
  createdAt: Schema.NonEmptyString,
}) {}

export class PackageDefinitionContainsAssertion extends Schema.Class<PackageDefinitionContainsAssertion>(
  'harmony.semantic-model/PackageDefinitionContainsAssertion',
)({
  assertionKind: Schema.Literal('package_definition_contains'),
  packageId: PackageId,
  requiredText: Schema.NonEmptyString,
}) {}

export const RegressionAssertion = Schema.Union([PackageDefinitionContainsAssertion])
export type RegressionAssertionType = typeof RegressionAssertion.Type

export class RegressionCase extends Schema.Class<RegressionCase>('harmony.semantic-model/RegressionCase')({
  id: RegressionCaseId,
  artifactKind: Schema.Literal('regression-case'),
  patchCandidateId: SemanticPatchCandidateId,
  sourceCaseId: CaseId,
  sourceCorrectionId: CorrectionId,
  targetPackage: SemanticPackageRef,
  assertion: RegressionAssertion,
  rationale: Schema.NonEmptyString,
  createdAt: Schema.NonEmptyString,
}) {}

export class RegressionAssertionResult extends Schema.Class<RegressionAssertionResult>(
  'harmony.semantic-model/RegressionAssertionResult',
)({
  assertionKind: RegressionAssertionKind,
  outcome: RegressionAssertionOutcome,
  expected: Schema.NonEmptyString,
  actual: Schema.NonEmptyString,
}) {}

export class RegressionRun extends Schema.Class<RegressionRun>('harmony.semantic-model/RegressionRun')({
  id: RegressionRunId,
  artifactKind: Schema.Literal('regression-run'),
  regressionCaseId: RegressionCaseId,
  patchCandidateId: SemanticPatchCandidateId,
  targetPackageId: PackageId,
  targetPackageVersionId: PackageVersionId,
  outcome: RegressionAssertionOutcome,
  assertionResults: Schema.Array(RegressionAssertionResult),
  startedAt: Schema.NonEmptyString,
  completedAt: Schema.NonEmptyString,
}) {}

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

export class SemanticLintFinding extends Schema.Class<SemanticLintFinding>(
  'harmony.semantic-model/SemanticLintFinding',
)({
  id: LintFindingId,
  artifactKind: Schema.Literal('semantic-lint-finding'),
  classification: SemanticLintClassification,
  reason: LintFindingReason,
  semanticIrId: SemanticIrId,
  environmentRef: ActiveEnvironmentId,
  inputRef: SemanticInputId,
  documentSectionId: DocumentSectionId,
  declaredCompleteness: DeclaredCompleteness,
  relationAssertionIds: Schema.Array(RelationAssertionId),
  sourceRefs: Schema.Array(EvidenceRef),
  ruleRef: SemanticRuleRef,
  packageRef: SemanticPackageRef,
  message: Schema.NonEmptyString,
}) {}

export class SemanticLintReport extends Schema.Class<SemanticLintReport>(
  'harmony.semantic-model/SemanticLintReport',
)({
  id: LintReportId,
  artifactKind: Schema.Literal('semantic-lint-report'),
  inputRef: SemanticInputId,
  semanticIrId: SemanticIrId,
  environmentRef: ActiveEnvironmentId,
  findings: Schema.Array(SemanticLintFinding),
  createdAt: Schema.NonEmptyString,
}) {}

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
