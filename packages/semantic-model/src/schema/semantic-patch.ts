import { Schema } from 'effect'
import { CorrectionDiagnosisRationale, SemanticPackageRef, SemanticRuleRef } from './correction-diagnosis.ts'
import { ActiveEnvironmentId, CaseId, CaseSemanticEditId, CorrectionDiagnosisId, CorrectionId, SemanticPatchCandidateId } from './ids.ts'
import { EvidenceRef } from './input.ts'
import { SemanticPatchCandidateKind, SemanticPatchCandidateLifecycle, SemanticPatchCandidateState } from './literals.ts'

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
