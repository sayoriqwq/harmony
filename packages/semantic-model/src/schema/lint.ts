import { Schema } from 'effect'
import { SemanticPackageRef, SemanticRuleRef } from './correction-diagnosis.ts'
import { ActiveEnvironmentId, DocumentSectionId, LintFindingId, LintReportId, RelationAssertionId, SemanticInputId, SemanticIrId } from './ids.ts'
import { EvidenceRef } from './input.ts'
import { DeclaredCompleteness, LintFindingReason, SemanticLintClassification } from './literals.ts'

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
