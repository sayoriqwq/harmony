import { Schema } from 'effect'
import { ConceptId, DefinitionId, EvidenceSourceId, LexicalSenseId, Namespace, PackageDraftId, PackageId, PackageVersionId, PublishedPackageId, RelationAssertionId, SemanticKernelId, TermId } from './ids.ts'
import { EvidenceRef } from './input.ts'
import { ArtifactStatus, AssertionLifecycle, PackageVersionState } from './literals.ts'

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

export class PackageRelationAssertion extends Schema.Class<PackageRelationAssertion>(
  'harmony.semantic-model/PackageRelationAssertion',
)({
  id: RelationAssertionId,
  artifactKind: Schema.Literal('package-relation-assertion'),
  packageId: PackageId,
  namespace: Namespace,
  subjectConceptId: ConceptId,
  predicate: Schema.NonEmptyString,
  objectConceptId: ConceptId,
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
  authoredRelations: Schema.optionalKey(Schema.Array(PackageRelationAssertion)),
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
  authoritativeRelations: Schema.Array(PackageRelationAssertion),
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
