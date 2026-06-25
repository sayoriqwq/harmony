import { Schema } from 'effect'
import { ActiveEnvironmentId, CaseId, CaseSemanticEditId, CorrectionDiagnosisId, CorrectionId, Namespace, PackageId, PackageVersionId, SemanticIrId, SemanticRuleId } from './ids.ts'
import { EvidenceRef } from './input.ts'
import { EnvironmentPackageRole, LintRuleKind } from './literals.ts'

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
