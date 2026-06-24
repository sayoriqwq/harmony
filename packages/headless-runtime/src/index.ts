import type {
  ActiveEnvironmentBuildRequest,
  CaseIdType as CaseId,
  CaseSemanticEditType as CaseSemanticEdit,
  CorrectionDiagnosisType as CorrectionDiagnosis,
  CorrectionDiagnosisGateResultType as CorrectionDiagnosisGateResult,
  CorrectionIdType as CorrectionId,
  DocumentInput,
  LedgerRecordType as LedgerRecord,
  PackageIdType as PackageId,
  PromptInput,
  RequestDecisionType as RequestDecision,
  SemanticInputIdType as SemanticInputId,
  VocabularyInput,
} from '@harmony/semantic-model'
import {
  ActiveEnvironmentBuildResult,
  ActiveEnvironmentPatchTarget,
  ActiveEnvironmentProvenance,
  ActiveSemanticEnvironment,
  ActiveSemanticEnvironmentConstructedRecord,
  BaseSemanticPatchScope,
  BusinessVersionPatchScope,
  Case,
  CaseOpenedRecord,
  CaseOpenResult,
  CaseSemanticEditApplicationResult,
  CaseSemanticEditAppliedRecord,
  CaseSemanticEdit as CaseSemanticEditSchema,
  ClarificationDecision,
  ClarificationOption,
  ClarificationSemanticDifference,
  CompetingInterpretation,
  CompileAndPublishResult,
  Concept,
  Correction,
  CorrectionCapturedRecord,
  CorrectionCaptureResult,
  CorrectionDiagnosedRecord,
  CorrectionDiagnosisEvidence,
  CorrectionDiagnosisRationale,
  CorrectionDiagnosis as CorrectionDiagnosisSchema,
  CorrectionDiagnosisWorkflowResult,
  CorrectionEvidenceSource,
  Definition,
  DocumentEvidenceSource,
  DocumentInputCapturedRecord,
  DocumentParseResult,
  DocumentSemanticLintWorkflowResult,
  DomainPackageMissingOrWrongDiagnosis,
  DomainSemanticPatchScope,
  EnvironmentSemanticBinding,
  EvidenceRef,
  EvidenceSource,
  LedgerRecord as LedgerRecordSchema,
  LexicalSense,
  LocalCorrectionOnlyDiagnosis,
  NoSemanticPatchCandidateRecord,
  NoSemanticPatchCandidateResult,
  PackageActivation,
  PackageCurrentView,
  PackageDefinitionContainsAssertion,
  PackageDefinitionExpectedImpact,
  PackageId as PackageIdSchema,
  PackagePublishResult,
  PackageSelectionPatchScope,
  PackageVersion,
  PackageVersionPublishedRecord,
  ParserPatchScope,
  PatchPublicationExpectedOutcome,
  ProhibitedAction,
  PromptClarificationWorkflowResult,
  PromptEvidenceSource,
  PromptInputCapturedRecord,
  PromptParseResult,
  PublishedSemanticPackage,
  RegressionAssertionResult,
  RegressionCase,
  RegressionCaseCreatedRecord,
  RegressionCaseCreationResult,
  RegressionRun,
  RegressionRunCompletedRecord,
  RegressionRunResult,
  RelationAssertion,
  RequestDecision as RequestDecisionSchema,
  RequestFrame,
  RequestTarget,
  RulePatchScope,
  RuleScopePatchScope,
  RuntimeBindingIdentity,
  RuntimePolicyExpectedImpact,
  SemanticIr,
  SemanticIrProducedRecord,
  SemanticKernelIdentity,
  SemanticLintFinding,
  SemanticLintReport,
  SemanticLintReportProducedRecord,
  SemanticPackageDraft,
  SemanticPackageDraftCompiledRecord,
  SemanticPackagePatchTarget,
  SemanticPackageRef,
  SemanticPatchCandidate,
  SemanticPatchCandidateProposalResult,
  SemanticPatchCandidateProposedRecord,
  SemanticPatchCandidatePublicationSource,
  SemanticPatchCandidatePublishedRecord,
  SemanticPatchPublicationResult,
  SemanticRulePatchTarget,
  SemanticRuleRef,
  SourceSpan,
  Term,
  UnresolvedSpan,
  VocabularyCompileResult,
  VocabularyDraftPublicationSource,
  VocabularySourceImportedRecord,
} from '@harmony/semantic-model'
import { Context, Effect, Layer, Ref, Schema } from 'effect'

const deterministicInstant = '2026-06-24T00:00:00.000Z'
const compilerVersion = 'deterministic-glossary-compiler@0.1.0'
const publisherVersion = 'deterministic-package-publisher@0.1.0'
const effectVersion = 'effect@4.0.0-beta.83'
const activeEnvironmentBuilderVersion = 'deterministic-active-environment-builder@0.1.0'
const promptParserVersion = 'deterministic-prompt-parser@0.1.0'
const promptDecisionVersion = 'deterministic-request-decision@0.1.0'
const documentParserVersion = 'deterministic-document-parser@0.1.0'
const semanticLintVersion = 'deterministic-semantic-lint@0.1.0'
const correctionWorkflowVersion = 'deterministic-correction-workflow@0.1.0'
const semanticPatchPublisherVersion = 'deterministic-semantic-patch-publisher@0.1.0'

export const defaultSemanticKernelIdentity = new SemanticKernelIdentity({
  id: Schema.decodeUnknownSync(SemanticKernelIdentity.fields.id)('semantic-kernel:harmony-v1'),
  protocolVersion: 'semantic-kernel.v1',
  version: 'harmony-semantic-kernel@0.1.0',
})

export class VocabularyCompileError extends Schema.TaggedErrorClass<VocabularyCompileError>()(
  'VocabularyCompileError',
  {
    inputId: Schema.String,
    message: Schema.String,
  },
) {}

export class LedgerViewNotFound extends Schema.TaggedErrorClass<LedgerViewNotFound>()(
  'LedgerViewNotFound',
  {
    packageId: Schema.String,
  },
) {}

export class PromptParseError extends Schema.TaggedErrorClass<PromptParseError>()(
  'PromptParseError',
  {
    inputId: Schema.String,
    message: Schema.String,
  },
) {}

export class DocumentParseError extends Schema.TaggedErrorClass<DocumentParseError>()(
  'DocumentParseError',
  {
    inputId: Schema.String,
    message: Schema.String,
  },
) {}

export class RequestDecisionUnsupported extends Schema.TaggedErrorClass<RequestDecisionUnsupported>()(
  'RequestDecisionUnsupported',
  {
    irId: Schema.String,
    message: Schema.String,
  },
) {}

export class SemanticLintUnsupported extends Schema.TaggedErrorClass<SemanticLintUnsupported>()(
  'SemanticLintUnsupported',
  {
    irId: Schema.String,
    message: Schema.String,
  },
) {}

export class CaseSemanticEditApplicationError extends Schema.TaggedErrorClass<CaseSemanticEditApplicationError>()(
  'CaseSemanticEditApplicationError',
  {
    caseId: Schema.String,
    editKind: Schema.String,
    message: Schema.String,
  },
) {}

export class CorrectionDiagnosisError extends Schema.TaggedErrorClass<CorrectionDiagnosisError>()(
  'CorrectionDiagnosisError',
  {
    caseId: Schema.String,
    message: Schema.String,
  },
) {}

export class PatchPublicationBlocked extends Schema.TaggedErrorClass<PatchPublicationBlocked>()(
  'PatchPublicationBlocked',
  {
    candidateId: Schema.String,
    expectedOutcome: PatchPublicationExpectedOutcome,
    message: Schema.String,
  },
) {}

const parseSingleGlossaryEntry = Effect.fn('parseSingleGlossaryEntry')(
  function* (input: VocabularyInput): Effect.fn.Return<
    { readonly term: string, readonly definition: string },
    VocabularyCompileError
  > {
    const separatorIndex = input.content.search(/[：:]/)
    if (separatorIndex <= 0) {
      return yield* new VocabularyCompileError({
        inputId: input.id,
        message: 'Expected one glossary entry in the form "term: definition".',
      })
    }
    const term = input.content.slice(0, separatorIndex).trim()
    const definition = input.content.slice(separatorIndex + 1).trim()
    if (term.length === 0 || definition.length === 0) {
      return yield* new VocabularyCompileError({
        inputId: input.id,
        message: 'Glossary entry term and definition must both be non-empty.',
      })
    }
    return { term, definition }
  },
)

const findSpan = Effect.fn('findSpan')(
  function* (input: VocabularyInput, text: string): Effect.fn.Return<SourceSpan, VocabularyCompileError> {
    const exact = input.spans.find(span => span.text === text)
    if (exact !== undefined) {
      return exact
    }
    const first = input.spans[0]
    if (first === undefined) {
      return yield* new VocabularyCompileError({
        inputId: input.id,
        message: 'VocabularyInput must carry at least one source span.',
      })
    }
    return first
  },
)

const findPromptSpan = Effect.fn('findPromptSpan')(
  function* (input: PromptInput, text: string, label: string): Effect.fn.Return<SourceSpan, PromptParseError> {
    const exact = input.spans.find(span => span.text === text)
    if (exact !== undefined) {
      return exact
    }
    return yield* new PromptParseError({
      inputId: input.id,
      message: `Deterministic prompt fixture is missing ${label} span "${text}".`,
    })
  },
)

const firstPromptTargetRef = Effect.fn('firstPromptTargetRef')(
  function* (input: PromptInput): Effect.fn.Return<SemanticInputId, PromptParseError> {
    const targetRef = input.targetRefs[0]
    if (targetRef === undefined) {
      return yield* new PromptParseError({
        inputId: input.id,
        message: 'PromptInput must include a target document reference.',
      })
    }
    return targetRef
  },
)

function evidenceRef(source: PromptEvidenceSource | DocumentEvidenceSource | CorrectionEvidenceSource, span: SourceSpan) {
  return new EvidenceRef({
    sourceId: source.id,
    spanId: span.id,
  })
}

const firstSectionSpan = Effect.fn('firstSectionSpan')(
  function* (
    input: DocumentInput,
    section: DocumentInput['sections'][number],
  ): Effect.fn.Return<SourceSpan, DocumentParseError> {
    const span = section.spans[0]
    if (span === undefined) {
      return yield* new DocumentParseError({
        inputId: input.id,
        message: `Document section ${section.id} must carry at least one source span.`,
      })
    }
    return span
  },
)

const findSectionSpan = Effect.fn('findSectionSpan')(
  function* (
    input: DocumentInput,
    section: DocumentInput['sections'][number],
    text: string,
    label: string,
  ): Effect.fn.Return<SourceSpan, DocumentParseError> {
    const exact = section.spans.find(span => span.text === text)
    if (exact !== undefined) {
      return exact
    }
    return yield* new DocumentParseError({
      inputId: input.id,
      message: `Deterministic document fixture is missing ${label} span "${text}".`,
    })
  },
)

function publishArtifacts(artifacts: SemanticPackageDraft['artifacts']): SemanticPackageDraft['artifacts'] {
  return {
    terms: artifacts.terms.map(term =>
      new Term({
        ...term,
        lifecycle: 'published',
      })),
    lexicalSenses: artifacts.lexicalSenses.map(sense =>
      new LexicalSense({
        ...sense,
        lifecycle: 'published',
      })),
    concepts: artifacts.concepts.map(concept =>
      new Concept({
        ...concept,
        lifecycle: 'published',
      })),
    definitions: artifacts.definitions.map(definition =>
      new Definition({
        ...definition,
        lifecycle: 'published',
      })),
  }
}

function countPublishedVersions(records: ReadonlyArray<LedgerRecord>, packageId: PackageId): number {
  return records
    .filter(isPackageVersionPublishedRecord)
    .filter(record => record.packageVersion.packageId === packageId)
    .length
}

const rebuildCurrentPackageView = Effect.fn('rebuildCurrentPackageView')(
  function* (
    records: ReadonlyArray<LedgerRecord>,
    packageId: PackageId,
  ): Effect.fn.Return<PackageCurrentView, LedgerViewNotFound> {
    const publishedRecords = records
      .filter(isPackageVersionPublishedRecord)
      .filter(record => record.packageVersion.packageId === packageId)
    const latest = publishedRecords[publishedRecords.length - 1]
    if (latest === undefined) {
      return yield* new LedgerViewNotFound({ packageId })
    }
    const sourceIds = records.flatMap(record => isVocabularySourceImportedRecord(record) ? [record.source.id] : [])
    return new PackageCurrentView({
      packageId,
      currentVersionId: latest.packageVersion.id,
      publishedPackageId: latest.publishedPackage.id,
      packageVersion: latest.packageVersion,
      publishedPackage: latest.publishedPackage,
      sourceIds,
      ledgerRecordIds: records.map(record => record.id),
    })
  },
)

function isPackageVersionPublishedRecord(record: LedgerRecord): record is PackageVersionPublishedRecord {
  return record.recordKind === 'PackageVersionPublished'
}

function isVocabularySourceImportedRecord(record: LedgerRecord): record is VocabularySourceImportedRecord {
  return record.recordKind === 'VocabularySourceImported'
}

function isSemanticPackageDraftCompiledRecord(record: LedgerRecord): record is SemanticPackageDraftCompiledRecord {
  return record.recordKind === 'SemanticPackageDraftCompiled'
}

function isActiveEnvironmentConstructedRecord(
  record: LedgerRecord,
): record is ActiveSemanticEnvironmentConstructedRecord {
  return record.recordKind === 'ActiveSemanticEnvironmentConstructed'
}

function unique<A>(items: ReadonlyArray<A>): Array<A> {
  return Array.from(new Set(items))
}

function uniqueEvidenceRefs(items: ReadonlyArray<EvidenceRef>): Array<EvidenceRef> {
  const seen = new Set<string>()
  return items.filter((item) => {
    const key = `${item.sourceId}:${item.spanId}`
    if (seen.has(key)) {
      return false
    }
    seen.add(key)
    return true
  })
}

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

const applyCaseSemanticEditToIr = Effect.fn('applyCaseSemanticEditToIr')(
  function* (
    caseState: Case,
    edit: CaseSemanticEdit,
  ): Effect.fn.Return<SemanticIr, CaseSemanticEditApplicationError> {
    if (caseState.id !== edit.caseId) {
      return yield* new CaseSemanticEditApplicationError({
        caseId: caseState.id,
        editKind: edit.editKind,
        message: 'CaseSemanticEdit caseId must match the current Case.',
      })
    }
    if (caseState.currentIrRef !== edit.targetIrRef) {
      return yield* new CaseSemanticEditApplicationError({
        caseId: caseState.id,
        editKind: edit.editKind,
        message: 'CaseSemanticEdit targetIrRef must match the current Case Semantic IR.',
      })
    }

    switch (edit.editKind) {
      case 'SelectRequestInterpretation': {
        const currentIr = caseState.currentSemanticIr
        const selectedFrame = currentIr.frameInstances.find(frame => frame.id === edit.selectedFrameId)
        if (selectedFrame === undefined) {
          return yield* new CaseSemanticEditApplicationError({
            caseId: caseState.id,
            editKind: edit.editKind,
            message: 'Selected request frame is not present in the current Case Semantic IR.',
          })
        }
        if (selectedFrame.action !== edit.action) {
          return yield* new CaseSemanticEditApplicationError({
            caseId: caseState.id,
            editKind: edit.editKind,
            message: 'Selected request frame action does not match the CaseSemanticEdit action.',
          })
        }

        const selectedInterpretation = currentIr.competingInterpretations.find(interpretation =>
          interpretation.id === edit.selectedInterpretationId,
        )
        if (selectedInterpretation === undefined || selectedInterpretation.frameId !== selectedFrame.id) {
          return yield* new CaseSemanticEditApplicationError({
            caseId: caseState.id,
            editKind: edit.editKind,
            message: 'Selected interpretation must exist and point at the selected request frame.',
          })
        }

        const missingRejectedInterpretation = edit.rejectedInterpretationIds.find(id =>
          currentIr.competingInterpretations.every(interpretation => interpretation.id !== id),
        )
        if (missingRejectedInterpretation !== undefined) {
          return yield* new CaseSemanticEditApplicationError({
            caseId: caseState.id,
            editKind: edit.editKind,
            message: `Rejected interpretation ${missingRejectedInterpretation} is not present in the current Case Semantic IR.`,
          })
        }

        const prohibitedActions = unique(edit.prohibitedActions).map((action) => {
          const previousEvidence = selectedFrame.prohibitedActions
            .filter(candidate => candidate.action === action)
            .flatMap(candidate => candidate.evidenceRefs)
          return new ProhibitedAction({
            action,
            evidenceRefs: uniqueEvidenceRefs([...previousEvidence, ...edit.evidenceRefs]),
          })
        })
        const prohibitedActionEvidenceRefs = uniqueEvidenceRefs([
          ...selectedFrame.prohibitedActionEvidenceRefs,
          ...prohibitedActions.flatMap(action => action.evidenceRefs),
          ...edit.evidenceRefs,
        ])
        const updatedFrame = new RequestFrame({
          ...selectedFrame,
          action: edit.action,
          prohibitedActions,
          actionEvidenceRefs: uniqueEvidenceRefs([...selectedFrame.actionEvidenceRefs, ...edit.evidenceRefs]),
          prohibitedActionEvidenceRefs,
        })

        return new SemanticIr({
          ...currentIr,
          id: Schema.decodeUnknownSync(SemanticIr.fields.id)(`semantic-ir:${caseState.id}:${edit.id}:after`),
          frameInstances: [updatedFrame],
          competingInterpretations: [],
          evidenceRefs: uniqueEvidenceRefs([...currentIr.evidenceRefs, ...edit.evidenceRefs]),
          decisionState: 'parsed',
        })
      }
    }
  },
)

function evidenceRefsForSection(semanticIr: SemanticIr, section: DocumentInput['sections'][number]) {
  const spanIds = new Set(section.spans.map(span => span.id))
  return semanticIr.evidenceRefs.filter(ref => spanIds.has(ref.spanId))
}

function effectiveCompleteness(input: DocumentInput, section: DocumentInput['sections'][number]) {
  return section.declaredCompleteness === 'unspecified'
    ? input.declaredCompleteness
    : section.declaredCompleteness
}

function activeDomainLintRules(environment: ActiveSemanticEnvironment) {
  return environment.semanticBindings
    .filter(binding => binding.packageRole === 'domain')
    .filter(binding => binding.definitionText.toLowerCase().includes('prior payment'))
    .map((binding) => {
      const ruleRef = new SemanticRuleRef({
        ruleId: Schema.decodeUnknownSync(SemanticRuleRef.fields.ruleId)(
          `semantic-rule:${binding.namespace}:requires-prior-payment`,
        ),
        ruleKind: 'required_relation',
        packageId: binding.packageId,
        packageVersionId: binding.packageVersionId,
        namespace: binding.namespace,
        description: 'Complete refund document sections must include prior payment evidence.',
      })
      const packageRef = new SemanticPackageRef({
        packageId: binding.packageId,
        packageVersionId: binding.packageVersionId,
        namespace: binding.namespace,
        role: binding.packageRole,
      })
      return {
        packageRef,
        requiredObject: 'prior_payment',
        ruleRef,
      }
    })
}

function packageSourceIds(records: ReadonlyArray<LedgerRecord>, packageId: PackageId) {
  return unique(records.flatMap(record =>
    isSemanticPackageDraftCompiledRecord(record) && record.draft.packageId === packageId
      ? [record.draft.sourceId]
      : [],
  ))
}

function packageLedgerRecordIds(records: ReadonlyArray<LedgerRecord>, packageId: PackageId) {
  const sourceIds = packageSourceIds(records, packageId)
  return unique(records.flatMap((record) => {
    if (isVocabularySourceImportedRecord(record) && sourceIds.includes(record.source.id)) {
      return [record.id]
    }
    if (isSemanticPackageDraftCompiledRecord(record) && record.draft.packageId === packageId) {
      return [record.id]
    }
    if (isPackageVersionPublishedRecord(record) && record.packageVersion.packageId === packageId) {
      return [record.id]
    }
    return []
  }))
}

function packageActivationFromView(
  records: ReadonlyArray<LedgerRecord>,
  view: PackageCurrentView,
  role: 'base' | 'domain',
  activationReason: 'default_base_layer' | 'explicit_domain_toggle',
) {
  return new PackageActivation({
    packageId: view.packageId,
    packageVersionId: view.packageVersion.id,
    version: view.packageVersion.version,
    publishedPackageId: view.publishedPackage.id,
    namespace: view.publishedPackage.namespace,
    role,
    activationReason,
    sourceIds: packageSourceIds(records, view.packageId),
    ledgerRecordIds: packageLedgerRecordIds(records, view.packageId),
  })
}

function semanticBindingsFromPackage(view: PackageCurrentView, activation: PackageActivation) {
  return view.publishedPackage.artifacts.lexicalSenses.flatMap((sense) => {
    const term = view.publishedPackage.artifacts.terms.find(candidate => candidate.id === sense.termId)
    const definition = view.publishedPackage.artifacts.definitions.find(candidate => candidate.id === sense.definitionId)
    if (term === undefined || definition === undefined) {
      return []
    }
    return [
      new EnvironmentSemanticBinding({
        termId: term.id,
        lexicalSenseId: sense.id,
        conceptId: sense.conceptId,
        definitionId: definition.id,
        termLabel: term.label,
        definitionText: definition.text,
        packageId: activation.packageId,
        packageVersionId: activation.packageVersionId,
        namespace: activation.namespace,
        packageRole: activation.role,
        evidenceRefs: sense.evidenceRefs,
      }),
    ]
  })
}

export class VocabularyCompiler extends Context.Service<VocabularyCompiler, {
  compile: (input: VocabularyInput) => Effect.Effect<VocabularyCompileResult, VocabularyCompileError>
}>()('harmony/headless-runtime/VocabularyCompiler') {
  static readonly layerDeterministic = Layer.succeed(
    VocabularyCompiler,
    VocabularyCompiler.of({
      compile: Effect.fn('VocabularyCompiler.compile')(function* (input) {
        const parsed = yield* parseSingleGlossaryEntry(input)
        const namespace = input.namespace
        const packageId = Schema.decodeUnknownSync(PackageIdSchema)(`package:${namespace}`)
        const evidenceSource = new EvidenceSource({
          id: Schema.decodeUnknownSync(EvidenceSource.fields.id)(`evidence-source:${namespace}:vocabulary`),
          evidenceKind: 'vocabulary-source',
          inputRef: input.id,
          originalText: input.content,
          spans: input.spans,
          capturedAt: deterministicInstant,
        })
        const termSpan = yield* findSpan(input, parsed.term)
        const definitionSpan = yield* findSpan(input, parsed.definition)
        const termEvidence = new EvidenceRef({
          sourceId: evidenceSource.id,
          spanId: termSpan.id,
        })
        const definitionEvidence = new EvidenceRef({
          sourceId: evidenceSource.id,
          spanId: definitionSpan.id,
        })
        const entrySuffix = 'entry-1'
        const term = new Term({
          id: Schema.decodeUnknownSync(Term.fields.id)(`term:${namespace}:${entrySuffix}`),
          artifactKind: 'term',
          packageId,
          namespace,
          label: parsed.term,
          status: 'extracted',
          lifecycle: 'draft',
          authority: 'imported_source',
          evidenceRefs: [termEvidence],
        })
        const concept = new Concept({
          id: Schema.decodeUnknownSync(Concept.fields.id)(`concept:${namespace}:${entrySuffix}`),
          artifactKind: 'concept',
          packageId,
          namespace,
          canonicalLabel: parsed.term,
          status: 'extracted',
          lifecycle: 'draft',
          authority: 'imported_source',
          evidenceRefs: [termEvidence, definitionEvidence],
        })
        const definition = new Definition({
          id: Schema.decodeUnknownSync(Definition.fields.id)(`definition:${namespace}:${entrySuffix}`),
          artifactKind: 'definition',
          packageId,
          namespace,
          conceptId: concept.id,
          text: parsed.definition,
          status: 'extracted',
          lifecycle: 'draft',
          authority: 'imported_source',
          evidenceRefs: [definitionEvidence],
        })
        const lexicalSense = new LexicalSense({
          id: Schema.decodeUnknownSync(LexicalSense.fields.id)(`lexical-sense:${namespace}:${entrySuffix}`),
          artifactKind: 'lexical-sense',
          packageId,
          namespace,
          termId: term.id,
          conceptId: concept.id,
          definitionId: definition.id,
          status: 'extracted',
          lifecycle: 'draft',
          authority: 'imported_source',
          evidenceRefs: [termEvidence, definitionEvidence],
        })
        const draft = new SemanticPackageDraft({
          id: Schema.decodeUnknownSync(SemanticPackageDraft.fields.id)(`package-draft:${namespace}:vocabulary`),
          packageId,
          sourceId: evidenceSource.id,
          namespace,
          lifecycle: 'draft',
          artifacts: {
            terms: [term],
            lexicalSenses: [lexicalSense],
            concepts: [concept],
            definitions: [definition],
          },
          relationCandidates: [],
          constraintCandidates: [],
          createdAt: deterministicInstant,
        })

        return new VocabularyCompileResult({
          evidenceSource,
          draft,
        })
      }),
    }),
  )
}

export class SemanticLedger extends Context.Service<SemanticLedger, {
  append: (record: LedgerRecord) => Effect.Effect<LedgerRecord, Schema.SchemaError>
  readonly records: Effect.Effect<ReadonlyArray<LedgerRecord>>
  currentPackageView: (packageId: PackageId) => Effect.Effect<PackageCurrentView, LedgerViewNotFound>
}>()('harmony/headless-runtime/SemanticLedger') {
  static readonly layerInMemory = Layer.effect(
    SemanticLedger,
    Effect.gen(function* () {
      const store = yield* Ref.make<ReadonlyArray<LedgerRecord>>([])

      const append = Effect.fn('SemanticLedger.append')(function* (record: LedgerRecord) {
        const decoded = yield* Schema.decodeUnknownEffect(LedgerRecordSchema)(record)
        yield* Ref.update(store, records => [...records, decoded])
        return decoded
      })

      const records = Ref.get(store)
      const currentPackageView = Effect.fn('SemanticLedger.currentPackageView')(function* (packageId: PackageId) {
        return yield* rebuildCurrentPackageView(yield* records, packageId)
      })

      return SemanticLedger.of({
        append,
        records,
        currentPackageView,
      })
    }),
  )
}

export class PackagePublisher extends Context.Service<PackagePublisher, {
  publish: (draft: SemanticPackageDraft) => Effect.Effect<PackagePublishResult>
}>()('harmony/headless-runtime/PackagePublisher') {
  static readonly layerDeterministic = Layer.effect(
    PackagePublisher,
    Effect.gen(function* () {
      const ledger = yield* SemanticLedger
      const publish = Effect.fn('PackagePublisher.publish')(function* (draft: SemanticPackageDraft) {
        const existingRecords = yield* ledger.records
        const nextVersion = countPublishedVersions(existingRecords, draft.packageId) + 1
        const version = `v${nextVersion}`
        const publishedPackage = new PublishedSemanticPackage({
          id: Schema.decodeUnknownSync(PublishedSemanticPackage.fields.id)(
            `published-package:${draft.namespace}:${version}`,
          ),
          packageId: draft.packageId,
          namespace: draft.namespace,
          lifecycle: 'published',
          artifacts: publishArtifacts(draft.artifacts),
          authoritativeRelations: [],
          authoritativeConstraints: [],
          publishedAt: deterministicInstant,
        })
        const packageVersion = new PackageVersion({
          id: Schema.decodeUnknownSync(PackageVersion.fields.id)(`package-version:${draft.namespace}:${version}`),
          packageId: draft.packageId,
          version,
          state: 'published',
          publishedPackageId: publishedPackage.id,
          sourceDraftId: draft.id,
          runtimeBinding: new RuntimeBindingIdentity({
            schemaVersion: 'semantic-package.v1',
            compilerVersion,
            publisherVersion,
            effectVersion,
          }),
          publishedAt: deterministicInstant,
        })
        return new PackagePublishResult({
          publishedPackage,
          packageVersion,
        })
      })

      return PackagePublisher.of({ publish })
    }),
  )
}

export class GlossaryPackageWorkflow extends Context.Service<GlossaryPackageWorkflow, {
  compileAndPublish: (input: VocabularyInput) => Effect.Effect<
    CompileAndPublishResult,
    VocabularyCompileError | LedgerViewNotFound | Schema.SchemaError
  >
}>()('harmony/headless-runtime/GlossaryPackageWorkflow') {
  static readonly layer = Layer.effect(
    GlossaryPackageWorkflow,
    Effect.gen(function* () {
      const compiler = yield* VocabularyCompiler
      const publisher = yield* PackagePublisher
      const ledger = yield* SemanticLedger

      const compileAndPublish = Effect.fn('GlossaryPackageWorkflow.compileAndPublish')(
        function* (input: VocabularyInput) {
          const compileResult = yield* compiler.compile(input)
          const beforeImport = yield* ledger.records
          const importRecord = new VocabularySourceImportedRecord({
            id: Schema.decodeUnknownSync(VocabularySourceImportedRecord.fields.id)(
              `ledger-record:${input.namespace}:${beforeImport.length + 1}-source-imported`,
            ),
            recordKind: 'VocabularySourceImported',
            recordedAt: deterministicInstant,
            source: compileResult.evidenceSource,
          })
          const beforeDraft = beforeImport.length + 1
          const draftRecord = new SemanticPackageDraftCompiledRecord({
            id: Schema.decodeUnknownSync(SemanticPackageDraftCompiledRecord.fields.id)(
              `ledger-record:${input.namespace}:${beforeDraft + 1}-draft-compiled`,
            ),
            recordKind: 'SemanticPackageDraftCompiled',
            recordedAt: deterministicInstant,
            draft: compileResult.draft,
          })

          yield* ledger.append(importRecord)
          yield* ledger.append(draftRecord)

          const publishResult = yield* publisher.publish(compileResult.draft)
          const beforePublish = yield* ledger.records
          const publishRecord = new PackageVersionPublishedRecord({
            id: Schema.decodeUnknownSync(PackageVersionPublishedRecord.fields.id)(
              `ledger-record:${input.namespace}:${beforePublish.length + 1}-published-${publishResult.packageVersion.version}`,
            ),
            recordKind: 'PackageVersionPublished',
            recordedAt: deterministicInstant,
            publishedPackage: publishResult.publishedPackage,
            packageVersion: publishResult.packageVersion,
            publicationSource: new VocabularyDraftPublicationSource({
              sourceKind: 'vocabulary_draft',
              sourceDraftId: compileResult.draft.id,
              sourceIds: [compileResult.evidenceSource.id],
            }),
          })
          yield* ledger.append(publishRecord)

          const currentView = yield* ledger.currentPackageView(compileResult.draft.packageId)
          const ledgerRecords = yield* ledger.records

          return new CompileAndPublishResult({
            evidenceSource: compileResult.evidenceSource,
            draft: compileResult.draft,
            publishedPackage: publishResult.publishedPackage,
            packageVersion: publishResult.packageVersion,
            currentView,
            ledgerRecords,
          })
        },
      )

      return GlossaryPackageWorkflow.of({ compileAndPublish })
    }),
  ).pipe(
    Layer.provide(PackagePublisher.layerDeterministic),
    Layer.provide(VocabularyCompiler.layerDeterministic),
  )
}

export const layerInMemory = GlossaryPackageWorkflow.layer.pipe(
  Layer.provideMerge(SemanticLedger.layerInMemory),
)

export class SemanticKernel extends Context.Service<SemanticKernel, {
  readonly identity: SemanticKernelIdentity
}>()('harmony/headless-runtime/SemanticKernel') {
  static layerFromIdentity(identity: SemanticKernelIdentity) {
    return Layer.succeed(
      SemanticKernel,
      SemanticKernel.of({ identity }),
    )
  }

  static readonly layerDefault = this.layerFromIdentity(defaultSemanticKernelIdentity)
}

export class BaseSemanticLayer extends Context.Service<BaseSemanticLayer, {
  readonly packageId: PackageId
}>()('harmony/headless-runtime/BaseSemanticLayer') {
  static layerFromPackageId(packageId: PackageId) {
    return Layer.succeed(
      BaseSemanticLayer,
      BaseSemanticLayer.of({ packageId }),
    )
  }
}

export class ActiveEnvironmentBuilder extends Context.Service<ActiveEnvironmentBuilder, {
  build: (request: ActiveEnvironmentBuildRequest) => Effect.Effect<
    ActiveEnvironmentBuildResult,
    LedgerViewNotFound | Schema.SchemaError
  >
}>()('harmony/headless-runtime/ActiveEnvironmentBuilder') {
  static readonly layer = Layer.effect(
    ActiveEnvironmentBuilder,
    Effect.gen(function* () {
      const kernel = yield* SemanticKernel
      const baseLayer = yield* BaseSemanticLayer
      const ledger = yield* SemanticLedger

      const build = Effect.fn('ActiveEnvironmentBuilder.build')(
        function* (request: ActiveEnvironmentBuildRequest) {
          const recordsBeforeBuild = yield* ledger.records
          const baseView = yield* ledger.currentPackageView(baseLayer.packageId)
          const requestedDomainPackageIds = unique(request.enabledDomainPackageIds)
          const domainViews = yield* Effect.forEach(
            requestedDomainPackageIds,
            packageId => ledger.currentPackageView(packageId),
          )

          const baseActivation = packageActivationFromView(
            recordsBeforeBuild,
            baseView,
            'base',
            'default_base_layer',
          )
          const domainActivations = domainViews.map(view =>
            packageActivationFromView(
              recordsBeforeBuild,
              view,
              'domain',
              'explicit_domain_toggle',
            ))
          const packageActivations = [baseActivation, ...domainActivations]
          const semanticBindings = [
            ...semanticBindingsFromPackage(baseView, baseActivation),
            ...domainViews.flatMap((view, index) => {
              const activation = domainActivations[index]
              return activation === undefined ? [] : semanticBindingsFromPackage(view, activation)
            }),
          ]
          const packageVersionIds = packageActivations.map(activation => activation.packageVersionId)
          const sourceIds = unique(packageActivations.flatMap(activation => activation.sourceIds))
          const dependencyLedgerRecordIds = unique(packageActivations.flatMap(activation => activation.ledgerRecordIds))
          const recordsBeforeAppend = yield* ledger.records
          const environmentRecordId = Schema.decodeUnknownSync(ActiveSemanticEnvironmentConstructedRecord.fields.id)(
            `ledger-record:${request.environmentId}:${recordsBeforeAppend.length + 1}-${activeEnvironmentBuilderVersion}`,
          )
          const environmentLedgerRecordIds = unique([...dependencyLedgerRecordIds, environmentRecordId])
          const environment = new ActiveSemanticEnvironment({
            id: request.environmentId,
            artifactKind: 'active-semantic-environment',
            semanticKernel: kernel.identity,
            baseLayer: baseActivation,
            enabledDomainPackages: domainActivations,
            localContext: request.localContext,
            semanticBindings,
            provenance: new ActiveEnvironmentProvenance({
              basePackageId: baseActivation.packageId,
              requestedDomainPackageIds,
              enabledDomainPackageIds: domainActivations.map(activation => activation.packageId),
              packageVersionIds,
              sourceIds,
              ledgerRecordIds: environmentLedgerRecordIds,
              createdAt: deterministicInstant,
            }),
            createdAt: deterministicInstant,
          })
          const record = new ActiveSemanticEnvironmentConstructedRecord({
            id: environmentRecordId,
            recordKind: 'ActiveSemanticEnvironmentConstructed',
            recordedAt: deterministicInstant,
            environment,
          })

          yield* ledger.append(record)
          const ledgerRecords = yield* ledger.records

          return new ActiveEnvironmentBuildResult({
            environment,
            ledgerRecord: record,
            ledgerRecords,
          })
        },
      )

      return ActiveEnvironmentBuilder.of({ build })
    }),
  )
}

export class SemanticParser extends Context.Service<SemanticParser, {
  parsePrompt: (
    input: PromptInput,
    environment: ActiveSemanticEnvironment,
  ) => Effect.Effect<PromptParseResult, PromptParseError | Schema.SchemaError>
  parseDocument: (
    input: DocumentInput,
    environment: ActiveSemanticEnvironment,
  ) => Effect.Effect<DocumentParseResult, DocumentParseError | Schema.SchemaError>
}>()('harmony/headless-runtime/SemanticParser') {
  static readonly layerDeterministic = Layer.succeed(
    SemanticParser,
    SemanticParser.of({
      parsePrompt: Effect.fn('SemanticParser.parsePrompt')(function* (input, environment) {
        const actionSpan = yield* findPromptSpan(input, 'check', 'action cue')
        const targetSpan = yield* findPromptSpan(input, 'this document', 'target cue')
        const prohibitedSpan = yield* findPromptSpan(input, 'do not edit it', 'prohibited action cue')
        const targetRef = yield* firstPromptTargetRef(input)
        const evidenceSource = new PromptEvidenceSource({
          id: Schema.decodeUnknownSync(PromptEvidenceSource.fields.id)(
            `evidence-source:${input.id}:${promptParserVersion}`,
          ),
          evidenceKind: 'prompt-source',
          inputRef: input.id,
          originalText: input.content,
          spans: input.spans,
          capturedAt: deterministicInstant,
        })
        const actionEvidence = evidenceRef(evidenceSource, actionSpan)
        const targetEvidence = evidenceRef(evidenceSource, targetSpan)
        const prohibitedEvidence = evidenceRef(evidenceSource, prohibitedSpan)
        const target = new RequestTarget({
          targetKind: 'referenced_document',
          targetRef,
          evidenceRefs: [targetEvidence],
        })
        const prohibitedRewrite = new ProhibitedAction({
          action: 'rewrite',
          evidenceRefs: [prohibitedEvidence],
        })
        const validateFrame = new RequestFrame({
          id: Schema.decodeUnknownSync(RequestFrame.fields.id)(`request-frame:${input.id}:validate`),
          frameKind: 'request',
          action: 'validate',
          target,
          prohibitedActions: [prohibitedRewrite],
          actionEvidenceRefs: [actionEvidence],
          targetEvidenceRefs: [targetEvidence],
          prohibitedActionEvidenceRefs: [prohibitedEvidence],
        })
        const rewriteFrame = new RequestFrame({
          id: Schema.decodeUnknownSync(RequestFrame.fields.id)(`request-frame:${input.id}:rewrite`),
          frameKind: 'request',
          action: 'rewrite',
          target,
          prohibitedActions: [prohibitedRewrite],
          actionEvidenceRefs: [actionEvidence],
          targetEvidenceRefs: [targetEvidence],
          prohibitedActionEvidenceRefs: [prohibitedEvidence],
        })
        const validateInterpretation = new CompetingInterpretation({
          id: Schema.decodeUnknownSync(CompetingInterpretation.fields.id)(
            `competing-interpretation:${input.id}:validate`,
          ),
          interpretationKind: 'request-frame',
          frameId: validateFrame.id,
          action: 'validate',
          behavior: 'review_without_modifying',
          summary: 'Interpret "check" as validate/review the referenced document without modifying it.',
          evidenceRefs: [actionEvidence, targetEvidence, prohibitedEvidence],
        })
        const rewriteInterpretation = new CompetingInterpretation({
          id: Schema.decodeUnknownSync(CompetingInterpretation.fields.id)(
            `competing-interpretation:${input.id}:rewrite`,
          ),
          interpretationKind: 'request-frame',
          frameId: rewriteFrame.id,
          action: 'rewrite',
          behavior: 'modify_target_content',
          summary: 'Interpret "check" as rewrite/modify the referenced document, which conflicts with the prohibition.',
          evidenceRefs: [actionEvidence, targetEvidence, prohibitedEvidence],
        })
        const semanticIr = new SemanticIr({
          id: Schema.decodeUnknownSync(SemanticIr.fields.id)(`semantic-ir:${input.id}:${environment.id}`),
          artifactKind: 'semantic-ir',
          inputKind: 'prompt',
          inputRef: input.id,
          environmentRef: environment.id,
          frameInstances: [validateFrame, rewriteFrame],
          relationAssertions: [],
          competingInterpretations: [validateInterpretation, rewriteInterpretation],
          unresolvedSpans: [],
          evidenceRefs: [actionEvidence, targetEvidence, prohibitedEvidence],
          decisionState: 'requires_clarification',
        })
        const result = new PromptParseResult({
          evidenceSource,
          semanticIr,
        })

        return yield* Schema.decodeUnknownEffect(PromptParseResult)(result)
      }),
      parseDocument: Effect.fn('SemanticParser.parseDocument')(function* (input, environment) {
        const evidenceSource = new DocumentEvidenceSource({
          id: Schema.decodeUnknownSync(DocumentEvidenceSource.fields.id)(
            `evidence-source:${input.id}:${documentParserVersion}`,
          ),
          evidenceKind: 'document-source',
          inputRef: input.id,
          originalText: input.content,
          sections: input.sections,
          spans: input.spans,
          capturedAt: deterministicInstant,
        })
        const relationAssertions: Array<RelationAssertion> = []
        const unresolvedSpans: Array<UnresolvedSpan> = []
        const evidenceRefs: Array<EvidenceRef> = []

        for (const section of input.sections) {
          const sectionSpan = yield* firstSectionSpan(input, section)
          const sectionEvidence = evidenceRef(evidenceSource, sectionSpan)
          evidenceRefs.push(sectionEvidence)

          const hasPositivePriorPayment = section.content.includes('prior payment record')
          const hasNegativePriorPayment = section.content.includes('no prior payment')

          if (hasPositivePriorPayment) {
            const span = yield* findSectionSpan(input, section, 'prior payment record', 'prior payment evidence')
            const assertionEvidence = evidenceRef(evidenceSource, span)
            evidenceRefs.push(assertionEvidence)
            relationAssertions.push(new RelationAssertion({
              id: Schema.decodeUnknownSync(RelationAssertion.fields.id)(
                `relation-assertion:${input.id}:${section.id}:prior-payment-present`,
              ),
              sectionId: section.id,
              subject: 'refund_section',
              predicate: 'mentions_required_evidence',
              object: 'prior_payment',
              assertionStatus: hasNegativePriorPayment ? 'conflicted' : 'extracted',
              evidenceRefs: [assertionEvidence],
            }))
          }

          if (hasNegativePriorPayment) {
            const span = yield* findSectionSpan(input, section, 'no prior payment', 'prior payment negation')
            const assertionEvidence = evidenceRef(evidenceSource, span)
            evidenceRefs.push(assertionEvidence)
            relationAssertions.push(new RelationAssertion({
              id: Schema.decodeUnknownSync(RelationAssertion.fields.id)(
                `relation-assertion:${input.id}:${section.id}:prior-payment-negated`,
              ),
              sectionId: section.id,
              subject: 'refund_section',
              predicate: 'negates_required_evidence',
              object: 'prior_payment',
              assertionStatus: hasPositivePriorPayment ? 'conflicted' : 'extracted',
              evidenceRefs: [assertionEvidence],
            }))
          }

          if (section.content.includes('receipt may prove payment')) {
            const span = yield* findSectionSpan(input, section, 'receipt may prove payment', 'uncertain payment alias')
            const uncertainEvidence = evidenceRef(evidenceSource, span)
            evidenceRefs.push(uncertainEvidence)
            unresolvedSpans.push(new UnresolvedSpan({
              spanId: span.id,
              reason: 'Potential alias for prior payment evidence needs clarification before conformance is judged.',
              evidenceRefs: [uncertainEvidence],
            }))
          }
        }

        const semanticIr = new SemanticIr({
          id: Schema.decodeUnknownSync(SemanticIr.fields.id)(`semantic-ir:${input.id}:${environment.id}`),
          artifactKind: 'semantic-ir',
          inputKind: 'document',
          inputRef: input.id,
          environmentRef: environment.id,
          frameInstances: [],
          relationAssertions,
          competingInterpretations: [],
          unresolvedSpans,
          evidenceRefs: uniqueEvidenceRefs(evidenceRefs),
          decisionState: unresolvedSpans.length === 0 ? 'parsed' : 'parse_uncertain',
        })
        const result = new DocumentParseResult({
          evidenceSource,
          semanticIr,
        })

        return yield* Schema.decodeUnknownEffect(DocumentParseResult)(result)
      }),
    }),
  )
}

export class RequestDecisionEngine extends Context.Service<RequestDecisionEngine, {
  decideRequest: (
    semanticIr: SemanticIr,
  ) => Effect.Effect<RequestDecision, RequestDecisionUnsupported | Schema.SchemaError>
}>()('harmony/headless-runtime/RequestDecisionEngine') {
  static readonly layer = Layer.succeed(
    RequestDecisionEngine,
    RequestDecisionEngine.of({
      decideRequest: Effect.fn('RequestDecisionEngine.decideRequest')(function* (semanticIr) {
        const requestFrames = semanticIr.frameInstances.filter(frame => frame.frameKind === 'request')
        const hasValidate = requestFrames.some(frame => frame.action === 'validate')
        const hasRewrite = requestFrames.some(frame => frame.action === 'rewrite')
        const rewriteProhibited = requestFrames.some(frame =>
          frame.prohibitedActions.some(action => action.action === 'rewrite'),
        )

        if (!hasValidate || !hasRewrite || !rewriteProhibited) {
          return yield* new RequestDecisionUnsupported({
            irId: semanticIr.id,
            message: 'Expected competing validate and rewrite request frames with rewrite prohibited.',
          })
        }

        const interpretations = semanticIr.competingInterpretations.filter(interpretation =>
          requestFrames.some(frame => frame.id === interpretation.frameId),
        )
        if (interpretations.length < 2) {
          return yield* new RequestDecisionUnsupported({
            irId: semanticIr.id,
            message: 'Expected at least two competing request interpretations.',
          })
        }

        const prohibitedActionEvidenceRefs = uniqueEvidenceRefs(
          requestFrames.flatMap(frame => frame.prohibitedActionEvidenceRefs),
        )
        const evidenceRefs = uniqueEvidenceRefs([
          ...semanticIr.evidenceRefs,
          ...interpretations.flatMap(interpretation => interpretation.evidenceRefs),
        ])
        const decision = new ClarificationDecision({
          id: Schema.decodeUnknownSync(ClarificationDecision.fields.id)(
            `clarification-decision:${semanticIr.id}:${promptDecisionVersion}`,
          ),
          decisionKind: 'clarify',
          reason: 'behavior_changing_action_ambiguity',
          irId: semanticIr.id,
          promptInputRef: semanticIr.inputRef,
          competingInterpretationIds: interpretations.map(interpretation => interpretation.id),
          semanticDifference: new ClarificationSemanticDifference({
            differenceKind: 'request_action',
            options: interpretations.map(interpretation =>
              new ClarificationOption({
                interpretationId: interpretation.id,
                frameId: interpretation.frameId,
                action: interpretation.action,
                behavior: interpretation.behavior,
                outcome: interpretation.action === 'validate'
                  ? 'Review or validate the target document without changing its content.'
                  : 'Rewrite or modify the target document content.',
              })),
            prohibitedActionEvidenceRefs,
          }),
          requiredUserResolution:
            'Choose whether "check" means validate/review only, or whether rewrite/modify is authorized despite the prohibition.',
          evidenceRefs,
        })

        return yield* Schema.decodeUnknownEffect(RequestDecisionSchema)(decision)
      }),
    }),
  )
}

export class PromptClarificationWorkflow extends Context.Service<PromptClarificationWorkflow, {
  clarifyPrompt: (
    input: PromptInput,
    environment: ActiveSemanticEnvironment,
  ) => Effect.Effect<
    PromptClarificationWorkflowResult,
    PromptParseError | RequestDecisionUnsupported | Schema.SchemaError
  >
}>()('harmony/headless-runtime/PromptClarificationWorkflow') {
  static readonly layer = Layer.effect(
    PromptClarificationWorkflow,
    Effect.gen(function* () {
      const parser = yield* SemanticParser
      const decisionEngine = yield* RequestDecisionEngine
      const ledger = yield* SemanticLedger

      const clarifyPrompt = Effect.fn('PromptClarificationWorkflow.clarifyPrompt')(
        function* (input: PromptInput, environment: ActiveSemanticEnvironment) {
          const parseResult = yield* parser.parsePrompt(input, environment)
          const decision = yield* decisionEngine.decideRequest(parseResult.semanticIr)
          const recordsBeforeCapture = yield* ledger.records
          const promptRecord = new PromptInputCapturedRecord({
            id: Schema.decodeUnknownSync(PromptInputCapturedRecord.fields.id)(
              `ledger-record:${input.id}:${recordsBeforeCapture.length + 1}-prompt-captured`,
            ),
            recordKind: 'PromptInputCaptured',
            recordedAt: deterministicInstant,
            source: parseResult.evidenceSource,
          })

          yield* ledger.append(promptRecord)

          const recordsBeforeIr = yield* ledger.records
          const irRecord = new SemanticIrProducedRecord({
            id: Schema.decodeUnknownSync(SemanticIrProducedRecord.fields.id)(
              `ledger-record:${input.id}:${recordsBeforeIr.length + 1}-semantic-ir-produced`,
            ),
            recordKind: 'SemanticIrProduced',
            recordedAt: deterministicInstant,
            semanticIr: parseResult.semanticIr,
          })

          yield* ledger.append(irRecord)

          const result = new PromptClarificationWorkflowResult({
            evidenceSource: parseResult.evidenceSource,
            semanticIr: parseResult.semanticIr,
            decision,
            ledgerRecords: yield* ledger.records,
          })

          return yield* Schema.decodeUnknownEffect(PromptClarificationWorkflowResult)(result)
        },
      )

      return PromptClarificationWorkflow.of({ clarifyPrompt })
    }),
  )
}

export class CorrectionWorkflow extends Context.Service<CorrectionWorkflow, {
  openCaseFromPromptClarification: (
    caseId: CaseId,
    result: PromptClarificationWorkflowResult,
  ) => Effect.Effect<CaseOpenResult, Schema.SchemaError>
  captureCorrection: (
    caseState: Case,
    correctionId: CorrectionId,
    userText: string,
  ) => Effect.Effect<CorrectionCaptureResult, Schema.SchemaError>
  applyCaseSemanticEdit: (
    caseState: Case,
    correction: Correction,
    edit: CaseSemanticEdit,
  ) => Effect.Effect<CaseSemanticEditApplicationResult, CaseSemanticEditApplicationError | Schema.SchemaError>
}>()('harmony/headless-runtime/CorrectionWorkflow') {
  static readonly layer = Layer.effect(
    CorrectionWorkflow,
    Effect.gen(function* () {
      const ledger = yield* SemanticLedger

      const openCaseFromPromptClarification = Effect.fn('CorrectionWorkflow.openCaseFromPromptClarification')(
        function* (caseId: CaseId, result: PromptClarificationWorkflowResult) {
          const caseState = new Case({
            id: caseId,
            artifactKind: 'case',
            originalPromptInputRef: result.semanticIr.inputRef,
            originalPromptEvidenceSourceId: result.evidenceSource.id,
            originalIrRef: result.semanticIr.id,
            currentIrRef: result.semanticIr.id,
            currentSemanticIr: result.semanticIr,
            status: 'opened',
            openedAt: deterministicInstant,
            updatedAt: deterministicInstant,
          })
          const recordsBeforeCase = yield* ledger.records
          const record = new CaseOpenedRecord({
            id: Schema.decodeUnknownSync(CaseOpenedRecord.fields.id)(
              `ledger-record:${caseId}:${recordsBeforeCase.length + 1}-case-opened`,
            ),
            recordKind: 'CaseOpened',
            recordedAt: deterministicInstant,
            case: caseState,
          })

          yield* ledger.append(record)

          return yield* Schema.decodeUnknownEffect(CaseOpenResult)(new CaseOpenResult({
            case: caseState,
            ledgerRecord: record,
            ledgerRecords: yield* ledger.records,
          }))
        },
      )

      const captureCorrection = Effect.fn('CorrectionWorkflow.captureCorrection')(
        function* (caseState: Case, correctionId: CorrectionId, userText: string) {
          const correctionSpan = new SourceSpan({
            id: Schema.decodeUnknownSync(SourceSpan.fields.id)(`source-span:${correctionId}:full`),
            startOffset: 0,
            endOffset: userText.length,
            text: userText,
          })
          const source = new CorrectionEvidenceSource({
            id: Schema.decodeUnknownSync(CorrectionEvidenceSource.fields.id)(`evidence-source:${correctionId}`),
            evidenceKind: 'correction-source',
            caseRef: caseState.id,
            correctionRef: correctionId,
            originalText: userText,
            spans: [correctionSpan],
            capturedAt: deterministicInstant,
          })
          const correction = new Correction({
            id: correctionId,
            artifactKind: 'correction',
            caseId: caseState.id,
            targetIrRef: caseState.currentIrRef,
            evidenceSourceId: source.id,
            userText,
            capturedAt: deterministicInstant,
          })
          const recordsBeforeCorrection = yield* ledger.records
          const record = new CorrectionCapturedRecord({
            id: Schema.decodeUnknownSync(CorrectionCapturedRecord.fields.id)(
              `ledger-record:${caseState.id}:${recordsBeforeCorrection.length + 1}-correction-captured`,
            ),
            recordKind: 'CorrectionCaptured',
            recordedAt: deterministicInstant,
            source,
            correction,
          })

          yield* ledger.append(record)

          return yield* Schema.decodeUnknownEffect(CorrectionCaptureResult)(new CorrectionCaptureResult({
            source,
            correction,
            ledgerRecord: record,
            ledgerRecords: yield* ledger.records,
          }))
        },
      )

      const applyCaseSemanticEdit = Effect.fn('CorrectionWorkflow.applyCaseSemanticEdit')(
        function* (caseState: Case, correction: Correction, edit: CaseSemanticEdit) {
          const decodedEdit = yield* Schema.decodeUnknownEffect(CaseSemanticEditSchema)(edit)
          if (decodedEdit.correctionId !== correction.id) {
            return yield* new CaseSemanticEditApplicationError({
              caseId: caseState.id,
              editKind: decodedEdit.editKind,
              message: 'CaseSemanticEdit correctionId must match the captured Correction.',
            })
          }
          if (correction.caseId !== caseState.id) {
            return yield* new CaseSemanticEditApplicationError({
              caseId: caseState.id,
              editKind: decodedEdit.editKind,
              message: 'Correction caseId must match the current Case.',
            })
          }
          if (correction.targetIrRef !== decodedEdit.targetIrRef) {
            return yield* new CaseSemanticEditApplicationError({
              caseId: caseState.id,
              editKind: decodedEdit.editKind,
              message: 'CaseSemanticEdit targetIrRef must match the captured Correction target.',
            })
          }

          const beforeSemanticIr = caseState.currentSemanticIr
          const afterSemanticIr = yield* applyCaseSemanticEditToIr(caseState, decodedEdit)
          const updatedCase = new Case({
            ...caseState,
            currentIrRef: afterSemanticIr.id,
            currentSemanticIr: afterSemanticIr,
            status: 'locally_corrected',
            updatedAt: deterministicInstant,
          })

          const recordsBeforeIr = yield* ledger.records
          const afterIrRecord = new SemanticIrProducedRecord({
            id: Schema.decodeUnknownSync(SemanticIrProducedRecord.fields.id)(
              `ledger-record:${caseState.id}:${recordsBeforeIr.length + 1}-semantic-ir-after-${correctionWorkflowVersion}`,
            ),
            recordKind: 'SemanticIrProduced',
            recordedAt: deterministicInstant,
            semanticIr: afterSemanticIr,
          })
          yield* ledger.append(afterIrRecord)

          const recordsBeforeApplied = yield* ledger.records
          const appliedRecord = new CaseSemanticEditAppliedRecord({
            id: Schema.decodeUnknownSync(CaseSemanticEditAppliedRecord.fields.id)(
              `ledger-record:${caseState.id}:${recordsBeforeApplied.length + 1}-case-semantic-edit-applied`,
            ),
            recordKind: 'CaseSemanticEditApplied',
            recordedAt: deterministicInstant,
            caseId: caseState.id,
            correctionId: correction.id,
            edit: decodedEdit,
            beforeIrRef: beforeSemanticIr.id,
            afterIrRef: afterSemanticIr.id,
            case: updatedCase,
          })
          yield* ledger.append(appliedRecord)

          return yield* Schema.decodeUnknownEffect(CaseSemanticEditApplicationResult)(
            new CaseSemanticEditApplicationResult({
              case: updatedCase,
              correction,
              edit: decodedEdit,
              beforeSemanticIr,
              afterSemanticIr,
              appliedRecord,
              ledgerRecords: yield* ledger.records,
            }),
          )
        },
      )

      return CorrectionWorkflow.of({
        openCaseFromPromptClarification,
        captureCorrection,
        applyCaseSemanticEdit,
      })
    }),
  )
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

function isRegressionRunCompletedRecord(record: LedgerRecord): record is RegressionRunCompletedRecord {
  return record.recordKind === 'RegressionRunCompleted'
}

const domainPackageRefForCandidate = Effect.fn('domainPackageRefForCandidate')(
  function* (candidate: SemanticPatchCandidate): Effect.fn.Return<SemanticPackageRef, PatchPublicationBlocked> {
    if (
      candidate.candidateKind !== 'domain_package_patch'
      || candidate.scope.scopeKind !== 'domain'
      || candidate.target.targetKind !== 'semantic_package'
      || candidate.target.packageRef.role !== 'domain'
    ) {
      return yield* new PatchPublicationBlocked({
        candidateId: candidate.id,
        expectedOutcome: 'domain_patch_candidate',
        message: 'Publication in this slice only accepts Domain Semantic Patch Candidates.',
      })
    }
    return candidate.target.packageRef
  },
)

const packageDefinitionImpactForCandidate = Effect.fn('packageDefinitionImpactForCandidate')(
  function* (
    candidate: SemanticPatchCandidate,
  ): Effect.fn.Return<PackageDefinitionExpectedImpact, PatchPublicationBlocked> {
    if (candidate.expectedImpact.impactKind !== 'package_definition_update') {
      return yield* new PatchPublicationBlocked({
        candidateId: candidate.id,
        expectedOutcome: 'domain_patch_candidate',
        message: 'Domain patch publication requires a package definition expected impact.',
      })
    }
    return candidate.expectedImpact
  },
)

function candidateWithState(
  candidate: SemanticPatchCandidate,
  lifecycle: SemanticPatchCandidate['lifecycle'],
  state: SemanticPatchCandidate['state'],
) {
  return new SemanticPatchCandidate({
    ...candidate,
    lifecycle,
    state,
  })
}

function patchedArtifactsFromImpact(
  view: PackageCurrentView,
  impact: PackageDefinitionExpectedImpact,
): PublishedSemanticPackage['artifacts'] {
  return {
    terms: view.publishedPackage.artifacts.terms,
    lexicalSenses: view.publishedPackage.artifacts.lexicalSenses,
    concepts: view.publishedPackage.artifacts.concepts,
    definitions: view.publishedPackage.artifacts.definitions.map(definition =>
      new Definition({
        ...definition,
        text: impact.expectedDefinitionText,
      })),
  }
}

function definitionTextForPatchedPackage(view: PackageCurrentView, impact: PackageDefinitionExpectedImpact) {
  return patchedArtifactsFromImpact(view, impact)
    .definitions
    .map(definition => definition.text)
    .join('\n')
}

function candidatePackageVersionIdForView(records: ReadonlyArray<LedgerRecord>, view: PackageCurrentView) {
  const nextVersion = countPublishedVersions(records, view.packageId) + 1
  return Schema.decodeUnknownSync(PackageVersion.fields.id)(
    `package-version:${view.publishedPackage.namespace}:v${nextVersion}`,
  )
}

function isRegressionCaseCreatedRecord(record: LedgerRecord): record is RegressionCaseCreatedRecord {
  return record.recordKind === 'RegressionCaseCreated'
}

function relevantRegressionCaseRecords(
  records: ReadonlyArray<LedgerRecord>,
  candidate: SemanticPatchCandidate,
  targetPackage: SemanticPackageRef,
) {
  return records
    .filter(isRegressionCaseCreatedRecord)
    .filter(record => record.regressionCase.targetPackage.packageId === targetPackage.packageId)
    .filter(record =>
      record.regressionCase.caseRole === 'historical_behavior'
      || record.regressionCase.patchCandidateId === candidate.id,
    )
}

function latestRegressionRunRecordForCase(
  records: ReadonlyArray<LedgerRecord>,
  candidate: SemanticPatchCandidate,
  regressionCase: RegressionCase,
) {
  return records
    .filter(isRegressionRunCompletedRecord)
    .filter(record => record.regressionRun.patchCandidateId === candidate.id)
    .filter(record => record.regressionRun.regressionCaseId === regressionCase.id)
    .at(-1)
}

function expectedTextForAssertion(assertion: RegressionCase['expectedAssertions'][number]) {
  switch (assertion.assertionKind) {
    case 'package_definition_contains':
      return assertion.requiredText
    case 'package_definition_equals':
      return assertion.expectedText
    case 'request_clarification_expected':
    case 'semantic_unknown_expected':
      return assertion.summary
  }

  const _exhaustive: never = assertion
  return _exhaustive
}

function actualTextForAssertion(assertion: RegressionCase['expectedAssertions'][number], packageDefinitionText: string) {
  switch (assertion.assertionKind) {
    case 'package_definition_contains':
    case 'package_definition_equals':
      return packageDefinitionText
    case 'request_clarification_expected':
    case 'semantic_unknown_expected':
      return `Package definition regression runner did not observe ${assertion.assertionKind}.`
  }

  const _exhaustive: never = assertion
  return _exhaustive
}

function assertionPassed(assertion: RegressionCase['expectedAssertions'][number], packageDefinitionText: string) {
  switch (assertion.assertionKind) {
    case 'package_definition_contains':
      return packageDefinitionText.includes(assertion.requiredText)
    case 'package_definition_equals':
      return packageDefinitionText === assertion.expectedText
    case 'request_clarification_expected':
    case 'semantic_unknown_expected':
      return false
  }

  const _exhaustive: never = assertion
  return _exhaustive
}

function resultForAssertion(
  assertion: RegressionCase['expectedAssertions'][number],
  packageDefinitionText: string,
) {
  const outcome = assertionPassed(assertion, packageDefinitionText) ? 'passed' : 'failed'
  return new RegressionAssertionResult({
    assertionKind: assertion.assertionKind,
    expectationKind: assertion.expectationKind,
    outcome,
    expected: expectedTextForAssertion(assertion),
    actual: actualTextForAssertion(assertion, packageDefinitionText),
    expectedAssertion: assertion,
    evidenceRefs: assertion.evidenceRefs,
  })
}

export class SemanticPatchPublicationWorkflow extends Context.Service<SemanticPatchPublicationWorkflow, {
  createRegressionCase: (
    candidate: SemanticPatchCandidate,
  ) => Effect.Effect<RegressionCaseCreationResult, PatchPublicationBlocked | Schema.SchemaError>
  runRegression: (
    regressionCase: RegressionCase,
    candidate: SemanticPatchCandidate,
  ) => Effect.Effect<RegressionRunResult, PatchPublicationBlocked | LedgerViewNotFound | Schema.SchemaError>
  runRegressionSuite: (
    candidate: SemanticPatchCandidate,
  ) => Effect.Effect<ReadonlyArray<RegressionRunResult>, PatchPublicationBlocked | LedgerViewNotFound | Schema.SchemaError>
  publishCandidate: (
    candidate: SemanticPatchCandidate,
  ) => Effect.Effect<
    SemanticPatchPublicationResult,
    PatchPublicationBlocked | LedgerViewNotFound | Schema.SchemaError
  >
}>()('harmony/headless-runtime/SemanticPatchPublicationWorkflow') {
  static readonly layer = Layer.effect(
    SemanticPatchPublicationWorkflow,
    Effect.gen(function* () {
      const ledger = yield* SemanticLedger

      const createRegressionCase = Effect.fn('SemanticPatchPublicationWorkflow.createRegressionCase')(
        function* (candidate: SemanticPatchCandidate) {
          const targetPackage = yield* domainPackageRefForCandidate(candidate)
          const impact = yield* packageDefinitionImpactForCandidate(candidate)
          const regressionCase = new RegressionCase({
            id: Schema.decodeUnknownSync(RegressionCase.fields.id)(
              `regression-case:${candidate.id}:publication`,
            ),
            artifactKind: 'regression-case',
            patchCandidateId: candidate.id,
            sourceCaseId: candidate.sourceCaseId,
            sourceCorrectionId: candidate.sourceCorrectionId,
            targetPackage,
            caseRole: 'target_fix',
            expectedAssertions: [
              new PackageDefinitionContainsAssertion({
                assertionKind: 'package_definition_contains',
                expectationKind: 'confirmed_success',
                packageId: targetPackage.packageId,
                requiredText: impact.expectedDefinitionText,
                evidenceRefs: candidate.evidenceRefs,
              }),
            ],
            rationale: impact.expectedBehavior,
            createdAt: deterministicInstant,
          })
          const recordsBeforeCase = yield* ledger.records
          const ledgerRecord = new RegressionCaseCreatedRecord({
            id: Schema.decodeUnknownSync(RegressionCaseCreatedRecord.fields.id)(
              `ledger-record:${regressionCase.id}:${recordsBeforeCase.length + 1}-regression-case-created`,
            ),
            recordKind: 'RegressionCaseCreated',
            recordedAt: deterministicInstant,
            regressionCase,
          })
          yield* ledger.append(ledgerRecord)

          return yield* Schema.decodeUnknownEffect(RegressionCaseCreationResult)(
            new RegressionCaseCreationResult({
              regressionCase,
              ledgerRecord,
              ledgerRecords: yield* ledger.records,
            }),
          )
        },
      )

      const runRegression = Effect.fn('SemanticPatchPublicationWorkflow.runRegression')(
        function* (regressionCase: RegressionCase, candidate: SemanticPatchCandidate) {
          const decodedCase = yield* Schema.decodeUnknownEffect(RegressionCase)(regressionCase)
          const targetPackage = yield* domainPackageRefForCandidate(candidate)
          const impact = yield* packageDefinitionImpactForCandidate(candidate)

          if (decodedCase.patchCandidateId !== candidate.id && decodedCase.caseRole !== 'historical_behavior') {
            return yield* new PatchPublicationBlocked({
              candidateId: candidate.id,
              expectedOutcome: 'regression_run_passed',
              message: 'RegressionCase patchCandidateId must match the Semantic Patch Candidate.',
            })
          }
          if (decodedCase.expectedAssertions.length === 0) {
            return yield* new PatchPublicationBlocked({
              candidateId: candidate.id,
              expectedOutcome: 'regression_run_passed',
              message: 'RegressionCase must contain at least one structured expected assertion.',
            })
          }
          if (decodedCase.targetPackage.packageId !== targetPackage.packageId) {
            return yield* new PatchPublicationBlocked({
              candidateId: candidate.id,
              expectedOutcome: 'domain_patch_candidate',
              message: 'RegressionCase target package must match the Domain Semantic Patch Candidate target.',
            })
          }

          const view = yield* ledger.currentPackageView(targetPackage.packageId)
          const actual = definitionTextForPatchedPackage(view, impact)
          const candidatePackageVersionId = candidatePackageVersionIdForView(yield* ledger.records, view)
          const assertionResults = decodedCase.expectedAssertions.map(assertion =>
            resultForAssertion(assertion, actual),
          )
          const passed = assertionResults.every(result => result.outcome === 'passed')
          const outcome = passed ? 'passed' : 'failed'
          const regressionRun = new RegressionRun({
            id: Schema.decodeUnknownSync(RegressionRun.fields.id)(
              `regression-run:${decodedCase.id}:${outcome}`,
            ),
            artifactKind: 'regression-run',
            regressionCaseId: decodedCase.id,
            patchCandidateId: candidate.id,
            sourceCaseId: decodedCase.sourceCaseId,
            sourceCorrectionId: decodedCase.sourceCorrectionId,
            targetPackageId: targetPackage.packageId,
            targetPackageVersionId: view.packageVersion.id,
            oldPackageVersionId: view.packageVersion.id,
            candidatePackageVersionId,
            outcome,
            assertionResults,
            startedAt: deterministicInstant,
            completedAt: deterministicInstant,
          })
          const regressedCandidate = candidateWithState(
            candidate,
            'proposed',
            passed ? 'regression_passed' : 'regression_failed',
          )
          const recordsBeforeRun = yield* ledger.records
          const ledgerRecord = new RegressionRunCompletedRecord({
            id: Schema.decodeUnknownSync(RegressionRunCompletedRecord.fields.id)(
              `ledger-record:${regressionRun.id}:${recordsBeforeRun.length + 1}-regression-run-completed`,
            ),
            recordKind: 'RegressionRunCompleted',
            recordedAt: deterministicInstant,
            regressionRun,
            patchCandidate: regressedCandidate,
          })
          yield* ledger.append(ledgerRecord)

          return yield* Schema.decodeUnknownEffect(RegressionRunResult)(
            new RegressionRunResult({
              regressionCase: decodedCase,
              regressionRun,
              patchCandidate: regressedCandidate,
              ledgerRecord,
              ledgerRecords: yield* ledger.records,
            }),
          )
        },
      )

      const runRegressionSuite = Effect.fn('SemanticPatchPublicationWorkflow.runRegressionSuite')(
        function* (candidate: SemanticPatchCandidate) {
          const targetPackage = yield* domainPackageRefForCandidate(candidate)
          yield* packageDefinitionImpactForCandidate(candidate)
          const records = yield* ledger.records
          const regressionCases = relevantRegressionCaseRecords(records, candidate, targetPackage)
          if (regressionCases.length === 0) {
            return yield* new PatchPublicationBlocked({
              candidateId: candidate.id,
              expectedOutcome: 'regression_run_passed',
              message: 'Publication requires at least one target RegressionCase for this candidate.',
            })
          }
          return yield* Effect.forEach(
            regressionCases,
            record => runRegression(record.regressionCase, candidate),
          )
        },
      )

      const publishCandidate = Effect.fn('SemanticPatchPublicationWorkflow.publishCandidate')(
        function* (candidate: SemanticPatchCandidate) {
          const targetPackage = yield* domainPackageRefForCandidate(candidate)
          const impact = yield* packageDefinitionImpactForCandidate(candidate)
          const recordsBeforePublishAttempt = yield* ledger.records
          const relevantCaseRecords = relevantRegressionCaseRecords(recordsBeforePublishAttempt, candidate, targetPackage)
          if (relevantCaseRecords.length === 0) {
            return yield* new PatchPublicationBlocked({
              candidateId: candidate.id,
              expectedOutcome: 'regression_run_passed',
              message: 'Publication requires at least one RegressionCase for this candidate.',
            })
          }

          const runRecords = relevantCaseRecords.map(record => ({
            caseRecord: record,
            runRecord: latestRegressionRunRecordForCase(recordsBeforePublishAttempt, candidate, record.regressionCase),
          }))
          const missingRun = runRecords.find(record => record.runRecord === undefined)
          if (missingRun !== undefined) {
            const expectedOutcome = missingRun.caseRecord.regressionCase.caseRole === 'historical_behavior'
              ? 'historical_behavior_preserved'
              : 'regression_run_passed'
            return yield* new PatchPublicationBlocked({
              candidateId: candidate.id,
              expectedOutcome,
              message: 'Publication requires each relevant RegressionCase to be rerun against this candidate.',
            })
          }

          const failedHistorical = runRecords.find(record =>
            record.caseRecord.regressionCase.caseRole === 'historical_behavior'
            && record.runRecord?.regressionRun.outcome !== 'passed',
          )
          if (failedHistorical !== undefined) {
            return yield* new PatchPublicationBlocked({
              candidateId: candidate.id,
              expectedOutcome: 'historical_behavior_preserved',
              message: 'Publication is blocked because the candidate changes confirmed historical behavior.',
            })
          }

          const failedTarget = runRecords.find(record =>
            record.caseRecord.regressionCase.caseRole === 'target_fix'
            && record.runRecord?.regressionRun.outcome !== 'passed',
          )
          if (failedTarget !== undefined) {
            return yield* new PatchPublicationBlocked({
              candidateId: candidate.id,
              expectedOutcome: 'regression_run_passed',
              message: 'Publication requires the target RegressionRun for this candidate to pass.',
            })
          }
          const publicationRunRecord = runRecords.find(record =>
            record.caseRecord.regressionCase.caseRole === 'target_fix',
          )?.runRecord
          if (publicationRunRecord === undefined) {
            return yield* new PatchPublicationBlocked({
              candidateId: candidate.id,
              expectedOutcome: 'regression_run_passed',
              message: 'Publication requires a target RegressionCase for this candidate.',
            })
          }

          const previousView = yield* ledger.currentPackageView(targetPackage.packageId)
          const nextVersion = countPublishedVersions(recordsBeforePublishAttempt, targetPackage.packageId) + 1
          const version = `v${nextVersion}`
          const publishedPackage = new PublishedSemanticPackage({
            id: Schema.decodeUnknownSync(PublishedSemanticPackage.fields.id)(
              `published-package:${previousView.publishedPackage.namespace}:${version}`,
            ),
            packageId: previousView.packageId,
            namespace: previousView.publishedPackage.namespace,
            lifecycle: 'published',
            artifacts: patchedArtifactsFromImpact(previousView, impact),
            authoritativeRelations: [],
            authoritativeConstraints: [],
            publishedAt: deterministicInstant,
          })
          const packageVersion = new PackageVersion({
            id: Schema.decodeUnknownSync(PackageVersion.fields.id)(
              `package-version:${previousView.publishedPackage.namespace}:${version}`,
            ),
            packageId: previousView.packageId,
            version,
            state: 'published',
            publishedPackageId: publishedPackage.id,
            sourceDraftId: previousView.packageVersion.sourceDraftId,
            runtimeBinding: new RuntimeBindingIdentity({
              schemaVersion: 'semantic-package.v1',
              compilerVersion,
              publisherVersion: semanticPatchPublisherVersion,
              effectVersion,
            }),
            publishedAt: deterministicInstant,
          })
          const packageVersionRecord = new PackageVersionPublishedRecord({
            id: Schema.decodeUnknownSync(PackageVersionPublishedRecord.fields.id)(
              `ledger-record:${candidate.id}:${recordsBeforePublishAttempt.length + 1}-published-${version}`,
            ),
            recordKind: 'PackageVersionPublished',
            recordedAt: deterministicInstant,
            publishedPackage,
            packageVersion,
            publicationSource: new SemanticPatchCandidatePublicationSource({
              sourceKind: 'semantic_patch_candidate',
              patchCandidateId: candidate.id,
              sourceCaseId: candidate.sourceCaseId,
              sourceCorrectionId: candidate.sourceCorrectionId,
              sourceCaseSemanticEditId: candidate.sourceCaseSemanticEditId,
              sourceDiagnosisId: candidate.sourceDiagnosisId,
              regressionCaseId: publicationRunRecord.regressionRun.regressionCaseId,
              regressionRunId: publicationRunRecord.regressionRun.id,
              previousPackageVersionId: previousView.packageVersion.id,
            }),
          })
          yield* ledger.append(packageVersionRecord)

          const publishedCandidate = candidateWithState(candidate, 'published', 'published')
          const recordsBeforeCandidatePublished = yield* ledger.records
          const patchCandidatePublishedRecord = new SemanticPatchCandidatePublishedRecord({
            id: Schema.decodeUnknownSync(SemanticPatchCandidatePublishedRecord.fields.id)(
              `ledger-record:${candidate.id}:${recordsBeforeCandidatePublished.length + 1}-candidate-published`,
            ),
            recordKind: 'SemanticPatchCandidatePublished',
            recordedAt: deterministicInstant,
            patchCandidate: publishedCandidate,
            packageVersionId: packageVersion.id,
            publishedPackageId: publishedPackage.id,
            regressionRunId: publicationRunRecord.regressionRun.id,
          })
          yield* ledger.append(patchCandidatePublishedRecord)

          const currentView = yield* ledger.currentPackageView(targetPackage.packageId)

          return yield* Schema.decodeUnknownEffect(SemanticPatchPublicationResult)(
            new SemanticPatchPublicationResult({
              patchCandidate: publishedCandidate,
              regressionRun: publicationRunRecord.regressionRun,
              publishedPackage,
              packageVersion,
              previousPackageVersion: previousView.packageVersion,
              packageVersionRecord,
              patchCandidatePublishedRecord,
              currentView,
              ledgerRecords: yield* ledger.records,
            }),
          )
        },
      )

      return SemanticPatchPublicationWorkflow.of({
        createRegressionCase,
        runRegression,
        runRegressionSuite,
        publishCandidate,
      })
    }),
  )
}

export class SemanticLintService extends Context.Service<SemanticLintService, {
  lintDocument: (
    input: DocumentInput,
    semanticIr: SemanticIr,
    environment: ActiveSemanticEnvironment,
  ) => Effect.Effect<SemanticLintReport, SemanticLintUnsupported | Schema.SchemaError>
}>()('harmony/headless-runtime/SemanticLintService') {
  static readonly layerDeterministic = Layer.succeed(
    SemanticLintService,
    SemanticLintService.of({
      lintDocument: Effect.fn('SemanticLintService.lintDocument')(function* (input, semanticIr, environment) {
        if (semanticIr.inputKind !== 'document' || semanticIr.inputRef !== input.id) {
          return yield* new SemanticLintUnsupported({
            irId: semanticIr.id,
            message: 'Semantic lint requires a document Semantic IR produced from the supplied DocumentInput.',
          })
        }

        const findings: Array<SemanticLintFinding> = []
        const rules = activeDomainLintRules(environment)

        for (const rule of rules) {
          for (const section of input.sections) {
            const declaredCompleteness = effectiveCompleteness(input, section)
            const relationAssertions = semanticIr.relationAssertions.filter(assertion =>
              assertion.sectionId === section.id && assertion.object === rule.requiredObject,
            )
            const positiveAssertions = relationAssertions.filter(assertion =>
              assertion.predicate === 'mentions_required_evidence',
            )
            const negativeAssertions = relationAssertions.filter(assertion =>
              assertion.predicate === 'negates_required_evidence',
            )
            const unresolved = semanticIr.unresolvedSpans.filter(span =>
              section.spans.some(sectionSpan => sectionSpan.id === span.spanId),
            )

            const classification = unresolved.length > 0
              ? 'parse_uncertainty'
              : positiveAssertions.length > 0 && negativeAssertions.length > 0
                ? 'conflicted'
                : positiveAssertions.length > 0
                  ? 'supported'
                  : declaredCompleteness === 'complete'
                    ? 'violated'
                    : 'unknown'

            const reason = classification === 'parse_uncertainty'
              ? 'parse_uncertain_alias'
              : classification === 'conflicted'
                ? 'conflicting_evidence'
                : classification === 'supported'
                  ? 'required_relation_present'
                  : classification === 'violated'
                    ? 'missing_required_relation_in_complete_scope'
                    : 'insufficient_evidence_in_open_scope'

            const relationAssertionIds = relationAssertions.map(assertion => assertion.id)
            const sourceRefs = uniqueEvidenceRefs(
              classification === 'parse_uncertainty'
                ? unresolved.flatMap(span => span.evidenceRefs)
                : relationAssertions.length > 0
                  ? relationAssertions.flatMap(assertion => assertion.evidenceRefs)
                  : evidenceRefsForSection(semanticIr, section),
            )

            const message = classification === 'parse_uncertainty'
              ? 'Potential alias evidence must be clarified before this rule can be judged.'
              : classification === 'conflicted'
                ? 'The section both mentions and negates prior payment evidence.'
                : classification === 'supported'
                  ? 'The section includes prior payment evidence required by the active domain rule.'
                  : classification === 'violated'
                    ? 'The section is declared complete but lacks prior payment evidence required by the active domain rule.'
                    : 'The section is not declared complete enough to treat missing prior payment evidence as a violation.'

            findings.push(new SemanticLintFinding({
              id: Schema.decodeUnknownSync(SemanticLintFinding.fields.id)(
                `lint-finding:${input.id}:${section.id}:${rule.ruleRef.ruleId}:${classification}`,
              ),
              artifactKind: 'semantic-lint-finding',
              classification,
              reason,
              semanticIrId: semanticIr.id,
              environmentRef: environment.id,
              inputRef: input.id,
              documentSectionId: section.id,
              declaredCompleteness,
              relationAssertionIds,
              sourceRefs,
              ruleRef: rule.ruleRef,
              packageRef: rule.packageRef,
              message,
            }))
          }
        }

        const report = new SemanticLintReport({
          id: Schema.decodeUnknownSync(SemanticLintReport.fields.id)(
            `lint-report:${input.id}:${environment.id}:${semanticLintVersion}`,
          ),
          artifactKind: 'semantic-lint-report',
          inputRef: input.id,
          semanticIrId: semanticIr.id,
          environmentRef: environment.id,
          findings,
          createdAt: deterministicInstant,
        })

        return yield* Schema.decodeUnknownEffect(SemanticLintReport)(report)
      }),
    }),
  )
}

export class DocumentSemanticLintWorkflow extends Context.Service<DocumentSemanticLintWorkflow, {
  lintDocument: (
    input: DocumentInput,
    environment: ActiveSemanticEnvironment,
  ) => Effect.Effect<
    DocumentSemanticLintWorkflowResult,
    DocumentParseError | SemanticLintUnsupported | Schema.SchemaError
  >
}>()('harmony/headless-runtime/DocumentSemanticLintWorkflow') {
  static readonly layer = Layer.effect(
    DocumentSemanticLintWorkflow,
    Effect.gen(function* () {
      const parser = yield* SemanticParser
      const lintService = yield* SemanticLintService
      const ledger = yield* SemanticLedger

      const lintDocument = Effect.fn('DocumentSemanticLintWorkflow.lintDocument')(
        function* (input: DocumentInput, environment: ActiveSemanticEnvironment) {
          const parseResult = yield* parser.parseDocument(input, environment)
          const report = yield* lintService.lintDocument(input, parseResult.semanticIr, environment)

          const recordsBeforeCapture = yield* ledger.records
          const documentRecord = new DocumentInputCapturedRecord({
            id: Schema.decodeUnknownSync(DocumentInputCapturedRecord.fields.id)(
              `ledger-record:${input.id}:${recordsBeforeCapture.length + 1}-document-captured`,
            ),
            recordKind: 'DocumentInputCaptured',
            recordedAt: deterministicInstant,
            source: parseResult.evidenceSource,
          })

          yield* ledger.append(documentRecord)

          const recordsBeforeIr = yield* ledger.records
          const irRecord = new SemanticIrProducedRecord({
            id: Schema.decodeUnknownSync(SemanticIrProducedRecord.fields.id)(
              `ledger-record:${input.id}:${recordsBeforeIr.length + 1}-semantic-ir-produced`,
            ),
            recordKind: 'SemanticIrProduced',
            recordedAt: deterministicInstant,
            semanticIr: parseResult.semanticIr,
          })

          yield* ledger.append(irRecord)

          const recordsBeforeReport = yield* ledger.records
          const reportRecord = new SemanticLintReportProducedRecord({
            id: Schema.decodeUnknownSync(SemanticLintReportProducedRecord.fields.id)(
              `ledger-record:${input.id}:${recordsBeforeReport.length + 1}-semantic-lint-report-produced`,
            ),
            recordKind: 'SemanticLintReportProduced',
            recordedAt: deterministicInstant,
            report,
          })

          yield* ledger.append(reportRecord)

          const result = new DocumentSemanticLintWorkflowResult({
            evidenceSource: parseResult.evidenceSource,
            semanticIr: parseResult.semanticIr,
            report,
            ledgerRecords: yield* ledger.records,
          })

          return yield* Schema.decodeUnknownEffect(DocumentSemanticLintWorkflowResult)(result)
        },
      )

      return DocumentSemanticLintWorkflow.of({ lintDocument })
    }),
  )
}

export function layerInMemoryWithActiveEnvironment(
  basePackageId: PackageId,
  kernelIdentity: SemanticKernelIdentity = defaultSemanticKernelIdentity,
) {
  return ActiveEnvironmentBuilder.layer.pipe(
    Layer.provide(SemanticKernel.layerFromIdentity(kernelIdentity)),
    Layer.provide(BaseSemanticLayer.layerFromPackageId(basePackageId)),
    Layer.provideMerge(layerInMemory),
  )
}

export function layerInMemoryWithPromptClarification(
  basePackageId: PackageId,
  kernelIdentity: SemanticKernelIdentity = defaultSemanticKernelIdentity,
) {
  return PromptClarificationWorkflow.layer.pipe(
    Layer.provide(RequestDecisionEngine.layer),
    Layer.provide(SemanticParser.layerDeterministic),
    Layer.provideMerge(layerInMemoryWithActiveEnvironment(basePackageId, kernelIdentity)),
  )
}

export function layerInMemoryWithCorrection(
  basePackageId: PackageId,
  kernelIdentity: SemanticKernelIdentity = defaultSemanticKernelIdentity,
) {
  return CorrectionWorkflow.layer.pipe(
    Layer.provideMerge(layerInMemoryWithPromptClarification(basePackageId, kernelIdentity)),
  )
}

export function layerInMemoryWithCorrectionDiagnosis(
  basePackageId: PackageId,
  kernelIdentity: SemanticKernelIdentity = defaultSemanticKernelIdentity,
) {
  return CorrectionDiagnosisWorkflow.layer.pipe(
    Layer.provideMerge(layerInMemoryWithCorrection(basePackageId, kernelIdentity)),
  )
}

export function layerInMemoryWithPatchPublication(
  basePackageId: PackageId,
  kernelIdentity: SemanticKernelIdentity = defaultSemanticKernelIdentity,
) {
  return SemanticPatchPublicationWorkflow.layer.pipe(
    Layer.provideMerge(layerInMemoryWithCorrectionDiagnosis(basePackageId, kernelIdentity)),
  )
}

export function layerInMemoryWithDocumentSemanticLint(
  basePackageId: PackageId,
  kernelIdentity: SemanticKernelIdentity = defaultSemanticKernelIdentity,
) {
  return DocumentSemanticLintWorkflow.layer.pipe(
    Layer.provide(SemanticLintService.layerDeterministic),
    Layer.provide(SemanticParser.layerDeterministic),
    Layer.provideMerge(layerInMemoryWithActiveEnvironment(basePackageId, kernelIdentity)),
  )
}
