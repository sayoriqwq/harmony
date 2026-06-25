import type { CorrectionDiagnosisType as CorrectionDiagnosis } from '@harmony/semantic-model/schema/correction-diagnosis'
import type { CorrectionDiagnosisGateResultType as CorrectionDiagnosisGateResult } from '@harmony/semantic-model/schema/correction-gate'
import type { ActiveSemanticEnvironment, PackageActivation } from '@harmony/semantic-model/schema/environment'
import type { LedgerRecordType as LedgerRecord } from '@harmony/semantic-model/schema/ledger-record'
import type { SemanticIr } from '@harmony/semantic-model/schema/semantic-ir'
import { CorrectionDiagnosisEvidence, CorrectionDiagnosisRationale, CorrectionDiagnosis as CorrectionDiagnosisSchema, DomainPackageMissingOrWrongDiagnosis, LocalCorrectionOnlyDiagnosis, SemanticPackageRef } from '@harmony/semantic-model/schema/correction-diagnosis'
import { NoSemanticPatchCandidateResult, SemanticPatchCandidateProposalResult } from '@harmony/semantic-model/schema/correction-gate'
import { CorrectionDiagnosedRecord, NoSemanticPatchCandidateRecord, SemanticPatchCandidateProposedRecord } from '@harmony/semantic-model/schema/ledger-record'
import { ActiveEnvironmentPatchTarget, BaseSemanticPatchScope, BusinessVersionPatchScope, DomainSemanticPatchScope, PackageDefinitionExpectedImpact, PackageSelectionPatchScope, ParserPatchScope, RulePatchScope, RuleScopePatchScope, RuntimePolicyExpectedImpact, SemanticPackagePatchTarget, SemanticPatchCandidate, SemanticRulePatchTarget } from '@harmony/semantic-model/schema/semantic-patch'
import { CaseSemanticEditApplicationResult, CorrectionDiagnosisWorkflowResult } from '@harmony/semantic-model/schema/workflow-result'
import { Context, Effect, Layer, Schema } from 'effect'
import { deterministicInstant } from './constants.ts'
import { CorrectionDiagnosisError } from './errors.ts'
import { isActiveEnvironmentConstructedRecord, SemanticLedger } from './ledger.ts'
import { uniqueEvidenceRefs } from './shared/collections.ts'

function semanticPackageRefFromActivation(activation: PackageActivation) {
  return new SemanticPackageRef({
    packageId: activation.packageId,
    packageVersionId: activation.packageVersionId,
    namespace: activation.namespace,
    role: activation.role,
  })
}

const activeEnvironmentForIr = Effect.fn('activeEnvironmentForIr')(
  function* (
    records: ReadonlyArray<LedgerRecord>,
    semanticIr: SemanticIr,
  ): Effect.fn.Return<ActiveSemanticEnvironment, CorrectionDiagnosisError> {
    const environment = records
      .filter(isActiveEnvironmentConstructedRecord)
      .map(record => record.environment)
      .find(candidate => candidate.id === semanticIr.environmentRef)
    if (environment === undefined) {
      return yield* new CorrectionDiagnosisError({
        caseId: semanticIr.id,
        message: 'Correction diagnosis requires the Active Semantic Environment used by the corrected Semantic IR.',
      })
    }
    return environment
  },
)

function diagnosisEvidenceForApplication(application: CaseSemanticEditApplicationResult) {
  const evidenceRefs = uniqueEvidenceRefs([
    ...application.edit.evidenceRefs,
    ...application.afterSemanticIr.evidenceRefs,
  ])
  return new CorrectionDiagnosisEvidence({
    caseId: application.case.id,
    correctionId: application.correction.id,
    caseSemanticEditId: application.edit.id,
    beforeIrRef: application.beforeSemanticIr.id,
    afterIrRef: application.afterSemanticIr.id,
    evidenceRefs,
  })
}

function noPatchResultForDiagnosis(diagnosis: LocalCorrectionOnlyDiagnosis) {
  return new NoSemanticPatchCandidateResult({
    id: Schema.decodeUnknownSync(NoSemanticPatchCandidateResult.fields.id)(
      `correction-diagnosis-result:${diagnosis.id}:no-patch`,
    ),
    artifactKind: 'correction-diagnosis-result',
    resultKind: 'NoSemanticPatchCandidate',
    diagnosisId: diagnosis.id,
    caseId: diagnosis.evidence.caseId,
    correctionId: diagnosis.evidence.correctionId,
    caseSemanticEditId: diagnosis.evidence.caseSemanticEditId,
    reason: 'local_correction_only',
    rationale: diagnosis.rationale,
    evidenceRefs: diagnosis.evidenceRefs,
    createdAt: deterministicInstant,
  })
}

function patchTargetForScope(scope: SemanticPatchCandidate['scope']): SemanticPatchCandidate['target'] {
  switch (scope.scopeKind) {
    case 'base':
    case 'domain':
    case 'version':
      return new SemanticPackagePatchTarget({
        targetKind: 'semantic_package',
        packageRef: scope.packageRef,
      })
    case 'package_selection':
    case 'parser':
      return new ActiveEnvironmentPatchTarget({
        targetKind: 'active_environment',
        environmentRef: scope.environmentRef,
      })
    case 'rule':
    case 'rule_scope':
      return new SemanticRulePatchTarget({
        targetKind: 'semantic_rule',
        ruleRef: scope.ruleRef,
      })
  }

  const _exhaustive: never = scope
  return _exhaustive
}

function packageDefinitionImpact(
  summary: string,
  expectedDefinitionText: string,
  expectedBehavior: string,
): SemanticPatchCandidate['expectedImpact'] {
  return new PackageDefinitionExpectedImpact({
    impactKind: 'package_definition_update',
    summary,
    expectedDefinitionText,
    expectedBehavior,
  })
}

function runtimePolicyImpact(summary: string, expectedBehavior: string): SemanticPatchCandidate['expectedImpact'] {
  return new RuntimePolicyExpectedImpact({
    impactKind: 'runtime_policy_update',
    summary,
    expectedBehavior,
  })
}

function candidateProposalForDiagnosis(
  diagnosis: Exclude<CorrectionDiagnosis, LocalCorrectionOnlyDiagnosis>,
  candidateKind: SemanticPatchCandidate['candidateKind'],
  scope: SemanticPatchCandidate['scope'],
  proposedChangeSummary: string,
  expectedImpact: SemanticPatchCandidate['expectedImpact'],
) {
  const patchCandidate = new SemanticPatchCandidate({
    id: Schema.decodeUnknownSync(SemanticPatchCandidate.fields.id)(
      `semantic-patch-candidate:${diagnosis.id}`,
    ),
    artifactKind: 'semantic-patch-candidate',
    candidateKind,
    lifecycle: 'proposed',
    state: 'awaiting_regression',
    target: patchTargetForScope(scope),
    sourceCaseId: diagnosis.evidence.caseId,
    sourceCorrectionId: diagnosis.evidence.correctionId,
    sourceCaseSemanticEditId: diagnosis.evidence.caseSemanticEditId,
    sourceDiagnosisId: diagnosis.id,
    scope,
    proposedChangeSummary,
    rationale: diagnosis.rationale,
    expectedImpact,
    evidenceRefs: diagnosis.evidenceRefs,
    createdAt: deterministicInstant,
  })
  return new SemanticPatchCandidateProposalResult({
    id: Schema.decodeUnknownSync(SemanticPatchCandidateProposalResult.fields.id)(
      `correction-diagnosis-result:${diagnosis.id}:candidate`,
    ),
    artifactKind: 'correction-diagnosis-result',
    resultKind: 'SemanticPatchCandidateProposed',
    diagnosisId: diagnosis.id,
    caseId: diagnosis.evidence.caseId,
    correctionId: diagnosis.evidence.correctionId,
    caseSemanticEditId: diagnosis.evidence.caseSemanticEditId,
    patchCandidate,
    rationale: diagnosis.rationale,
    evidenceRefs: diagnosis.evidenceRefs,
    createdAt: deterministicInstant,
  })
}

function gateResultForDiagnosis(diagnosis: CorrectionDiagnosis): CorrectionDiagnosisGateResult {
  switch (diagnosis.diagnosisKind) {
    case 'LocalCorrectionOnly':
      return noPatchResultForDiagnosis(diagnosis)
    case 'LocalCaseBindingError':
      return candidateProposalForDiagnosis(
        diagnosis,
        'case_binding_example_patch',
        new ParserPatchScope({
          scopeKind: 'parser',
          environmentRef: diagnosis.targetEnvironmentRef,
        }),
        'Add a scoped parser or binding example so this corrected interpretation is reproducible.',
        runtimePolicyImpact(
          'Parser or binding policy should reproduce the corrected interpretation.',
          'The corrected Case interpretation is selected without relying on package mutation.',
        ),
      )
    case 'BaseLayerMissingOrWrong':
      return candidateProposalForDiagnosis(
        diagnosis,
        'base_layer_patch',
        new BaseSemanticPatchScope({
          scopeKind: 'base',
          packageRef: diagnosis.targetPackage,
        }),
        'Propose a Base Layer semantic package change scoped to the corrected interpretation.',
        packageDefinitionImpact(
          'Base package definition should capture the corrected interpretation.',
          'Base semantics include the corrected request interpretation while preserving rewrite prohibition.',
          'Future base-layer requests preserve the corrected validate-without-rewrite behavior.',
        ),
      )
    case 'DomainPackageMissingOrWrong':
      return candidateProposalForDiagnosis(
        diagnosis,
        'domain_package_patch',
        new DomainSemanticPatchScope({
          scopeKind: 'domain',
          packageRef: diagnosis.targetPackage,
        }),
        'Propose a Domain Package semantic change scoped to the corrected interpretation.',
        packageDefinitionImpact(
          'Domain package definition should capture the corrected interpretation.',
          'Domain package controls refund review semantics; corrected requests must validate without rewriting target content.',
          'Future domain-enabled refund review requests validate the target and keep rewrite prohibited.',
        ),
      )
    case 'PackageSelectionError':
      return candidateProposalForDiagnosis(
        diagnosis,
        'package_selection_patch',
        new PackageSelectionPatchScope({
          scopeKind: 'package_selection',
          environmentRef: diagnosis.targetEnvironmentRef,
        }),
        'Propose an environment or package activation policy change for this corrected interpretation.',
        runtimePolicyImpact(
          'Package activation policy should route this corrected interpretation to the right package.',
          'Future runs select the intended package activation path before parsing the request.',
        ),
      )
    case 'ParserNegationScopeConditionError':
      return candidateProposalForDiagnosis(
        diagnosis,
        'parser_policy_patch',
        new ParserPatchScope({
          scopeKind: 'parser',
          environmentRef: diagnosis.targetEnvironmentRef,
        }),
        'Propose a parser policy example for negation, scope, or condition handling.',
        runtimePolicyImpact(
          'Parser policy should preserve the corrected negation, scope, or condition semantics.',
          'Future parses reproduce the corrected scope without changing semantic package assertions.',
        ),
      )
    case 'LintRuleWrong':
      return candidateProposalForDiagnosis(
        diagnosis,
        'lint_rule_patch',
        new RulePatchScope({
          scopeKind: 'rule',
          ruleRef: diagnosis.targetRule,
        }),
        'Propose a lint rule change scoped to the diagnosed rule.',
        runtimePolicyImpact(
          'Lint rule behavior should follow the corrected rule interpretation.',
          'Future lint runs classify the target rule according to the corrected diagnosis.',
        ),
      )
    case 'RuleScopeWrong':
      return candidateProposalForDiagnosis(
        diagnosis,
        'rule_scope_patch',
        new RuleScopePatchScope({
          scopeKind: 'rule_scope',
          ruleRef: diagnosis.targetRule,
        }),
        'Propose a rule scope change for the diagnosed semantic rule.',
        runtimePolicyImpact(
          'Rule scope should be narrowed or moved according to the correction diagnosis.',
          'Future lint runs apply the diagnosed rule only within its corrected scope.',
        ),
      )
    case 'BusinessVersionChanged':
      return candidateProposalForDiagnosis(
        diagnosis,
        'business_version_patch',
        new BusinessVersionPatchScope({
          scopeKind: 'version',
          packageRef: diagnosis.targetPackage,
        }),
        'Propose a new package version candidate while preserving the prior version.',
        packageDefinitionImpact(
          'Package definition should represent the changed business version.',
          'Business semantics changed and require a new package version while the old version stays available.',
          'Future runs can activate the new business version without mutating historical versions.',
        ),
      )
  }

  const _exhaustive: never = diagnosis
  return _exhaustive
}
const deterministicDiagnosisForApplication = Effect.fn('deterministicDiagnosisForApplication')(
  function* (
    application: CaseSemanticEditApplicationResult,
    records: ReadonlyArray<LedgerRecord>,
  ): Effect.fn.Return<CorrectionDiagnosis, CorrectionDiagnosisError | Schema.SchemaError> {
    const decodedApplication = yield* Schema.decodeUnknownEffect(CaseSemanticEditApplicationResult)(application)
    const diagnosisEvidence = diagnosisEvidenceForApplication(decodedApplication)
    const normalizedCorrection = decodedApplication.correction.userText.toLowerCase()

    if (
      normalizedCorrection.includes('local-only')
      || normalizedCorrection.includes('local only')
      || normalizedCorrection.includes('current case only')
    ) {
      const rationale = new CorrectionDiagnosisRationale({
        summary: 'The correction explicitly limits the semantic change to the current Case.',
        promotionDecision: 'Keep the applied CaseSemanticEdit local and do not propose a long-term Semantic Patch Candidate.',
      })
      const diagnosis = new LocalCorrectionOnlyDiagnosis({
        id: Schema.decodeUnknownSync(LocalCorrectionOnlyDiagnosis.fields.id)(
          `correction-diagnosis:${decodedApplication.correction.id}:local-only`,
        ),
        artifactKind: 'correction-diagnosis',
        diagnosisKind: 'LocalCorrectionOnly',
        evidence: diagnosisEvidence,
        evidenceRefs: diagnosisEvidence.evidenceRefs,
        rationale,
      })
      return yield* Schema.decodeUnknownEffect(CorrectionDiagnosisSchema)(diagnosis)
    }

    if (normalizedCorrection.includes('domain package') || normalizedCorrection.includes('domain rule')) {
      const environment = yield* activeEnvironmentForIr(records, decodedApplication.beforeSemanticIr)
      const domainActivation = environment.enabledDomainPackages[0]
      if (domainActivation === undefined) {
        return yield* new CorrectionDiagnosisError({
          caseId: decodedApplication.case.id,
          message: 'DomainPackageMissingOrWrong diagnosis requires an explicitly enabled Domain Package.',
        })
      }

      const rationale = new CorrectionDiagnosisRationale({
        summary: 'The correction says the active domain semantics are missing or wrong for this interpretation.',
        promotionDecision: 'Propose a scoped Domain Package Semantic Patch Candidate, but do not mutate the package.',
      })
      const diagnosis = new DomainPackageMissingOrWrongDiagnosis({
        id: Schema.decodeUnknownSync(DomainPackageMissingOrWrongDiagnosis.fields.id)(
          `correction-diagnosis:${decodedApplication.correction.id}:domain-package`,
        ),
        artifactKind: 'correction-diagnosis',
        diagnosisKind: 'DomainPackageMissingOrWrong',
        evidence: diagnosisEvidence,
        evidenceRefs: diagnosisEvidence.evidenceRefs,
        rationale,
        targetPackage: semanticPackageRefFromActivation(domainActivation),
      })
      return yield* Schema.decodeUnknownEffect(CorrectionDiagnosisSchema)(diagnosis)
    }

    return yield* new CorrectionDiagnosisError({
      caseId: decodedApplication.case.id,
      message: 'Deterministic diagnosis fixture must declare local-only or domain package cause.',
    })
  },
)

export class CorrectionDiagnosisWorkflow extends Context.Service<CorrectionDiagnosisWorkflow, {
  diagnoseAndPropose: (
    application: CaseSemanticEditApplicationResult,
  ) => Effect.Effect<CorrectionDiagnosisWorkflowResult, CorrectionDiagnosisError | Schema.SchemaError>
}>()('harmony/headless-runtime/CorrectionDiagnosisWorkflow') {
  static readonly layer = Layer.effect(
    CorrectionDiagnosisWorkflow,
    Effect.gen(function* () {
      const ledger = yield* SemanticLedger

      const diagnoseAndPropose = Effect.fn('CorrectionDiagnosisWorkflow.diagnoseAndPropose')(
        function* (application: CaseSemanticEditApplicationResult) {
          const recordsBeforeDiagnosis = yield* ledger.records
          const diagnosis = yield* deterministicDiagnosisForApplication(application, recordsBeforeDiagnosis)
          const diagnosedRecord = new CorrectionDiagnosedRecord({
            id: Schema.decodeUnknownSync(CorrectionDiagnosedRecord.fields.id)(
              `ledger-record:${diagnosis.id}:${recordsBeforeDiagnosis.length + 1}-correction-diagnosed`,
            ),
            recordKind: 'CorrectionDiagnosed',
            recordedAt: deterministicInstant,
            diagnosis,
          })
          yield* ledger.append(diagnosedRecord)

          const gateResult = gateResultForDiagnosis(diagnosis)
          const recordsBeforeGate = yield* ledger.records
          const gateRecord = gateResult.resultKind === 'NoSemanticPatchCandidate'
            ? new NoSemanticPatchCandidateRecord({
                id: Schema.decodeUnknownSync(NoSemanticPatchCandidateRecord.fields.id)(
                  `ledger-record:${diagnosis.id}:${recordsBeforeGate.length + 1}-no-semantic-patch-candidate`,
                ),
                recordKind: 'NoSemanticPatchCandidate',
                recordedAt: deterministicInstant,
                result: gateResult,
              })
            : new SemanticPatchCandidateProposedRecord({
                id: Schema.decodeUnknownSync(SemanticPatchCandidateProposedRecord.fields.id)(
                  `ledger-record:${diagnosis.id}:${recordsBeforeGate.length + 1}-semantic-patch-candidate-proposed`,
                ),
                recordKind: 'SemanticPatchCandidateProposed',
                recordedAt: deterministicInstant,
                result: gateResult,
                patchCandidate: gateResult.patchCandidate,
              })
          yield* ledger.append(gateRecord)

          return yield* Schema.decodeUnknownEffect(CorrectionDiagnosisWorkflowResult)(
            new CorrectionDiagnosisWorkflowResult({
              diagnosis,
              gateResult,
              diagnosedRecord,
              gateRecord,
              ledgerRecords: yield* ledger.records,
            }),
          )
        },
      )

      return CorrectionDiagnosisWorkflow.of({ diagnoseAndPropose })
    }),
  )
}
