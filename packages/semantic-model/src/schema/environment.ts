import { Schema } from 'effect'
import { ActiveEnvironmentId, ConceptId, DefinitionId, EvidenceSourceId, LedgerRecordId, LexicalSenseId, LocalSemanticContextId, Namespace, PackageId, PackageVersionId, PublishedPackageId, TermId } from './ids.ts'
import { EvidenceRef } from './input.ts'
import { EnvironmentPackageRole, PackageActivationReason } from './literals.ts'
import { SemanticKernelIdentity } from './package.ts'

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
