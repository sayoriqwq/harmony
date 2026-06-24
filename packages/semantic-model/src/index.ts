import { Schema } from 'effect'

function idPattern(prefix: string) {
  return Schema.NonEmptyString.check(
    Schema.isPattern(new RegExp(`^${prefix}:[A-Za-z0-9._:@-]+$`)),
  )
}

export const VocabularyInputId = idPattern('vocabulary-input').pipe(Schema.brand('VocabularyInputId'))

export const SemanticInputId = idPattern('semantic-input').pipe(Schema.brand('SemanticInputId'))
export type SemanticInputIdType = typeof SemanticInputId.Type

export const SourceSpanId = idPattern('source-span').pipe(Schema.brand('SourceSpanId'))

export const EvidenceSourceId = idPattern('evidence-source').pipe(Schema.brand('EvidenceSourceId'))

export const SemanticIrId = idPattern('semantic-ir').pipe(Schema.brand('SemanticIrId'))

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

export const ParseDecisionState = Schema.Literals(['requires_clarification'])

export const ClarificationReason = Schema.Literals(['behavior_changing_action_ambiguity'])

export class SourceSpan extends Schema.Class<SourceSpan>('harmony.semantic-model/SourceSpan')({
  id: SourceSpanId,
  startOffset: Schema.Number,
  endOffset: Schema.Number,
  text: Schema.NonEmptyString,
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

export const SemanticInput = Schema.Union([PromptInput, VocabularyInput])
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

export class UnresolvedSpan extends Schema.Class<UnresolvedSpan>('harmony.semantic-model/UnresolvedSpan')({
  spanId: SourceSpanId,
  reason: Schema.NonEmptyString,
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
  inputKind: Schema.Literal('prompt'),
  inputRef: SemanticInputId,
  environmentRef: ActiveEnvironmentId,
  frameInstances: Schema.Array(SemanticFrame),
  competingInterpretations: Schema.Array(CompetingInterpretation),
  unresolvedSpans: Schema.Array(UnresolvedSpan),
  evidenceRefs: Schema.Array(EvidenceRef),
  decisionState: ParseDecisionState,
}) {}

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

export class PromptParseResult extends Schema.Class<PromptParseResult>(
  'harmony.semantic-model/PromptParseResult',
)({
  evidenceSource: PromptEvidenceSource,
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
}) {}

export class PromptInputCapturedRecord extends Schema.Class<PromptInputCapturedRecord>(
  'harmony.semantic-model/PromptInputCapturedRecord',
)({
  id: LedgerRecordId,
  recordKind: Schema.Literal('PromptInputCaptured'),
  recordedAt: Schema.NonEmptyString,
  source: PromptEvidenceSource,
}) {}

export class SemanticIrProducedRecord extends Schema.Class<SemanticIrProducedRecord>(
  'harmony.semantic-model/SemanticIrProducedRecord',
)({
  id: LedgerRecordId,
  recordKind: Schema.Literal('SemanticIrProduced'),
  recordedAt: Schema.NonEmptyString,
  semanticIr: SemanticIr,
}) {}

export class ActiveSemanticEnvironmentConstructedRecord extends Schema.Class<ActiveSemanticEnvironmentConstructedRecord>(
  'harmony.semantic-model/ActiveSemanticEnvironmentConstructedRecord',
)({
  id: LedgerRecordId,
  recordKind: Schema.Literal('ActiveSemanticEnvironmentConstructed'),
  recordedAt: Schema.NonEmptyString,
  environment: ActiveSemanticEnvironment,
}) {}

export const LedgerRecord = Schema.Union([
  VocabularySourceImportedRecord,
  SemanticPackageDraftCompiledRecord,
  PackageVersionPublishedRecord,
  PromptInputCapturedRecord,
  SemanticIrProducedRecord,
  ActiveSemanticEnvironmentConstructedRecord,
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
