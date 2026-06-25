import { Schema } from 'effect'
import { SemanticPackageRef } from './correction-diagnosis.ts'
import { CaseId, CorrectionId, PackageId, PackageVersionId, RegressionCaseId, RegressionRunId, SemanticPatchCandidateId } from './ids.ts'
import { EvidenceRef } from './input.ts'
import { ClarificationReason, RegressionAssertionKind, RegressionAssertionOutcome, RegressionCaseRole, RegressionExpectationKind } from './literals.ts'

export class PackageDefinitionContainsAssertion extends Schema.Class<PackageDefinitionContainsAssertion>(
  'harmony.semantic-model/PackageDefinitionContainsAssertion',
)({
  assertionKind: Schema.Literal('package_definition_contains'),
  expectationKind: Schema.Literal('confirmed_success'),
  packageId: PackageId,
  requiredText: Schema.NonEmptyString,
  evidenceRefs: Schema.Array(EvidenceRef),
}) {}

export class PackageDefinitionEqualsAssertion extends Schema.Class<PackageDefinitionEqualsAssertion>(
  'harmony.semantic-model/PackageDefinitionEqualsAssertion',
)({
  assertionKind: Schema.Literal('package_definition_equals'),
  expectationKind: Schema.Literal('confirmed_success'),
  packageId: PackageId,
  expectedText: Schema.NonEmptyString,
  evidenceRefs: Schema.Array(EvidenceRef),
}) {}

export class RequestClarificationExpectedAssertion extends Schema.Class<RequestClarificationExpectedAssertion>(
  'harmony.semantic-model/RequestClarificationExpectedAssertion',
)({
  assertionKind: Schema.Literal('request_clarification_expected'),
  expectationKind: Schema.Literal('clarification_expected'),
  reason: ClarificationReason,
  summary: Schema.NonEmptyString,
  evidenceRefs: Schema.Array(EvidenceRef),
}) {}

export class SemanticUnknownExpectedAssertion extends Schema.Class<SemanticUnknownExpectedAssertion>(
  'harmony.semantic-model/SemanticUnknownExpectedAssertion',
)({
  assertionKind: Schema.Literal('semantic_unknown_expected'),
  expectationKind: Schema.Literal('unknown_expected'),
  summary: Schema.NonEmptyString,
  evidenceRefs: Schema.Array(EvidenceRef),
}) {}

export const RegressionAssertion = Schema.Union([
  PackageDefinitionContainsAssertion,
  PackageDefinitionEqualsAssertion,
  RequestClarificationExpectedAssertion,
  SemanticUnknownExpectedAssertion,
])
export type RegressionAssertionType = typeof RegressionAssertion.Type

export class RegressionCase extends Schema.Class<RegressionCase>('harmony.semantic-model/RegressionCase')({
  id: RegressionCaseId,
  artifactKind: Schema.Literal('regression-case'),
  caseRole: RegressionCaseRole,
  patchCandidateId: SemanticPatchCandidateId,
  sourceCaseId: CaseId,
  sourceCorrectionId: CorrectionId,
  targetPackage: SemanticPackageRef,
  expectedAssertions: Schema.Array(RegressionAssertion),
  rationale: Schema.NonEmptyString,
  createdAt: Schema.NonEmptyString,
}) {}

export class RegressionAssertionResult extends Schema.Class<RegressionAssertionResult>(
  'harmony.semantic-model/RegressionAssertionResult',
)({
  assertionKind: RegressionAssertionKind,
  expectationKind: RegressionExpectationKind,
  outcome: RegressionAssertionOutcome,
  expected: Schema.NonEmptyString,
  actual: Schema.NonEmptyString,
  expectedAssertion: RegressionAssertion,
  evidenceRefs: Schema.Array(EvidenceRef),
}) {}

export class RegressionRun extends Schema.Class<RegressionRun>('harmony.semantic-model/RegressionRun')({
  id: RegressionRunId,
  artifactKind: Schema.Literal('regression-run'),
  regressionCaseId: RegressionCaseId,
  patchCandidateId: SemanticPatchCandidateId,
  sourceCaseId: CaseId,
  sourceCorrectionId: CorrectionId,
  targetPackageId: PackageId,
  targetPackageVersionId: PackageVersionId,
  oldPackageVersionId: PackageVersionId,
  candidatePackageVersionId: PackageVersionId,
  outcome: RegressionAssertionOutcome,
  assertionResults: Schema.Array(RegressionAssertionResult),
  startedAt: Schema.NonEmptyString,
  completedAt: Schema.NonEmptyString,
}) {}
