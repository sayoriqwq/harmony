import { Schema } from 'effect'

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

export const RegressionCaseRole = Schema.Literals(['target_fix', 'historical_behavior'])

export const RegressionExpectationKind = Schema.Literals([
  'confirmed_success',
  'clarification_expected',
  'unknown_expected',
])

export const RegressionAssertionKind = Schema.Literals([
  'package_definition_contains',
  'package_definition_equals',
  'request_clarification_expected',
  'semantic_unknown_expected',
])

export const PatchPublicationExpectedOutcome = Schema.Literals([
  'domain_patch_candidate',
  'regression_run_passed',
  'historical_behavior_preserved',
])

export const LintFindingReason = Schema.Literals([
  'parse_uncertain_alias',
  'required_relation_present',
  'conflicting_evidence',
  'missing_required_relation_in_complete_scope',
  'insufficient_evidence_in_open_scope',
])
