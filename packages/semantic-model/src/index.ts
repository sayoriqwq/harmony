import { Schema } from 'effect'

function idPattern(prefix: string) {
  return Schema.NonEmptyString.check(
    Schema.isPattern(new RegExp(`^${prefix}:[A-Za-z0-9._:@-]+$`)),
  )
}

export const VocabularyInputId = idPattern('vocabulary-input').pipe(Schema.brand('VocabularyInputId'))

export const SourceSpanId = idPattern('source-span').pipe(Schema.brand('SourceSpanId'))

export const EvidenceSourceId = idPattern('evidence-source').pipe(Schema.brand('EvidenceSourceId'))

export const PackageId = idPattern('package').pipe(Schema.brand('PackageId'))
export type PackageIdType = typeof PackageId.Type

export const PackageDraftId = idPattern('package-draft').pipe(Schema.brand('PackageDraftId'))

export const PublishedPackageId = idPattern('published-package').pipe(Schema.brand('PublishedPackageId'))

export const PackageVersionId = idPattern('package-version').pipe(Schema.brand('PackageVersionId'))

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

export const LedgerRecord = Schema.Union([
  VocabularySourceImportedRecord,
  SemanticPackageDraftCompiledRecord,
  PackageVersionPublishedRecord,
])
export type LedgerRecordType = typeof LedgerRecord.Type

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
