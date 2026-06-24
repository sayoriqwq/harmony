import type {
  LedgerRecordType as LedgerRecord,
  PackageVersionPublishedRecord,
  RegressionCaseCreatedRecord,
  RegressionRunCompletedRecord,
  RegressionRunResult,
  SemanticPatchCandidateProposedRecord,

  SemanticPatchCandidatePublishedRecord,
} from '@harmony/semantic-model'
import { assert, describe, it } from '@effect/vitest'
import {
  ActiveEnvironmentBuilder,
  CorrectionDiagnosisWorkflow,
  CorrectionWorkflow,
  GlossaryPackageWorkflow,
  layerInMemoryWithPatchPublication,
  PromptClarificationWorkflow,
  SemanticLedger,
  SemanticPatchPublicationWorkflow,
} from '@harmony/headless-runtime'
import {
  ActiveEnvironmentBuildRequest,
  Case,
  Correction,
  EvidenceRef,
  LedgerRecord as LedgerRecordSchema,
  LocalSemanticContext,
  PackageDefinitionContainsAssertion,
  PackageId,
  PromptInput,
  RegressionCase,
  RegressionRun,
  SelectRequestInterpretationEdit,
  SemanticPatchCandidate,
  SemanticPatchPublicationResult,
  VocabularyInput,
} from '@harmony/semantic-model'
import { Effect, Schema } from 'effect'

const basePackageId = Schema.decodeUnknownSync(PackageId)('package:base.patch-publication')
const domainPackageId = Schema.decodeUnknownSync(PackageId)('package:domain.patch-publication')
const promptText = 'check this document; do not edit it'
const targetDocumentRef = 'semantic-input:patch-publication-target-document'
const originalDomainDefinition = 'Domain package controls refund review semantics'

const baseGlossaryFixture = {
  id: 'vocabulary-input:base-patch-publication',
  inputKind: 'vocabulary',
  content: 'document：content supplied as the patch publication target',
  vocabularyKind: 'base',
  namespace: 'base.patch-publication',
  spans: [
    {
      id: 'source-span:base-patch-publication:entry',
      startOffset: 0,
      endOffset: 56,
      text: 'document：content supplied as the patch publication target',
    },
    {
      id: 'source-span:base-patch-publication:term',
      startOffset: 0,
      endOffset: 8,
      text: 'document',
    },
    {
      id: 'source-span:base-patch-publication:definition',
      startOffset: 9,
      endOffset: 56,
      text: 'content supplied as the patch publication target',
    },
  ],
}

const domainGlossaryFixture = {
  id: 'vocabulary-input:domain-patch-publication',
  inputKind: 'vocabulary',
  content: `RefundReviewRule：${originalDomainDefinition}`,
  vocabularyKind: 'domain',
  namespace: 'domain.patch-publication',
  spans: [
    {
      id: 'source-span:domain-patch-publication:entry',
      startOffset: 0,
      endOffset: 62,
      text: `RefundReviewRule：${originalDomainDefinition}`,
    },
    {
      id: 'source-span:domain-patch-publication:term',
      startOffset: 0,
      endOffset: 16,
      text: 'RefundReviewRule',
    },
    {
      id: 'source-span:domain-patch-publication:definition',
      startOffset: 17,
      endOffset: 62,
      text: originalDomainDefinition,
    },
  ],
}

const localContextFixture = {
  id: 'local-context:patch-publication',
  contextKind: 'case-local',
  description: 'Patch publication fixture that promotes a domain candidate after regression.',
  evidenceRefs: [],
}

const promptFixture = {
  id: 'semantic-input:prompt-patch-publication',
  inputKind: 'prompt',
  content: promptText,
  promptRole: 'user_request',
  targetRefs: [targetDocumentRef],
  spans: [
    {
      id: 'source-span:prompt-patch-publication:full',
      startOffset: 0,
      endOffset: 35,
      text: promptText,
    },
    {
      id: 'source-span:prompt-patch-publication:action',
      startOffset: 0,
      endOffset: 5,
      text: 'check',
    },
    {
      id: 'source-span:prompt-patch-publication:target',
      startOffset: 6,
      endOffset: 19,
      text: 'this document',
    },
    {
      id: 'source-span:prompt-patch-publication:prohibited-action',
      startOffset: 21,
      endOffset: 35,
      text: 'do not edit it',
    },
  ],
}

function firstOf<A>(items: ReadonlyArray<A>, label: string): A {
  const value = items[0]
  if (value === undefined) {
    assert.fail(`Missing ${label}`)
  }
  return value
}

function isPackageVersionPublishedRecord(record: LedgerRecord): record is PackageVersionPublishedRecord {
  return record.recordKind === 'PackageVersionPublished'
}

function isPatchCandidateRecord(record: LedgerRecord): record is SemanticPatchCandidateProposedRecord {
  return record.recordKind === 'SemanticPatchCandidateProposed'
}

function isRegressionCaseRecord(record: LedgerRecord): record is RegressionCaseCreatedRecord {
  return record.recordKind === 'RegressionCaseCreated'
}

function isRegressionRunRecord(record: LedgerRecord): record is RegressionRunCompletedRecord {
  return record.recordKind === 'RegressionRunCompleted'
}

function isPatchCandidatePublishedRecord(record: LedgerRecord): record is SemanticPatchCandidatePublishedRecord {
  return record.recordKind === 'SemanticPatchCandidatePublished'
}

const domainCandidateFixture = Effect.fn('domainCandidateFixture')(
  function* () {
    const promptInput = yield* Schema.decodeUnknownEffect(PromptInput)(
      promptFixture,
      { onExcessProperty: 'error' },
    )
    const baseInput = yield* Schema.decodeUnknownEffect(VocabularyInput)(baseGlossaryFixture)
    const domainInput = yield* Schema.decodeUnknownEffect(VocabularyInput)(domainGlossaryFixture)
    const localContext = yield* Schema.decodeUnknownEffect(LocalSemanticContext)(localContextFixture)

    const packageWorkflow = yield* GlossaryPackageWorkflow
    const environmentBuilder = yield* ActiveEnvironmentBuilder
    const promptWorkflow = yield* PromptClarificationWorkflow
    const correctionWorkflow = yield* CorrectionWorkflow
    const diagnosisWorkflow = yield* CorrectionDiagnosisWorkflow

    yield* packageWorkflow.compileAndPublish(baseInput)
    const domainPackage = yield* packageWorkflow.compileAndPublish(domainInput)
    assert.strictEqual(domainPackage.packageVersion.packageId, domainPackageId)

    const environment = yield* environmentBuilder.build(new ActiveEnvironmentBuildRequest({
      environmentId: Schema.decodeUnknownSync(ActiveEnvironmentBuildRequest.fields.environmentId)(
        'active-environment:patch-publication-domain-enabled',
      ),
      localContext,
      enabledDomainPackageIds: [domainPackage.packageVersion.packageId],
    }))
    const promptResult = yield* promptWorkflow.clarifyPrompt(promptInput, environment.environment)
    const caseOpen = yield* correctionWorkflow.openCaseFromPromptClarification(
      Schema.decodeUnknownSync(Case.fields.id)('case:patch-publication-domain'),
      promptResult,
    )
    const correctionCapture = yield* correctionWorkflow.captureCorrection(
      caseOpen.case,
      Schema.decodeUnknownSync(Correction.fields.id)('correction:patch-publication-domain'),
      'The active domain package is missing or wrong here; propose a domain package rule correction.',
    )

    const validateFrame = firstOf(
      caseOpen.case.currentSemanticIr.frameInstances.filter(frame => frame.action === 'validate'),
      'validate frame',
    )
    const validateInterpretation = firstOf(
      caseOpen.case.currentSemanticIr.competingInterpretations.filter(interpretation =>
        interpretation.action === 'validate',
      ),
      'validate interpretation',
    )
    const rewriteInterpretation = firstOf(
      caseOpen.case.currentSemanticIr.competingInterpretations.filter(interpretation =>
        interpretation.action === 'rewrite',
      ),
      'rewrite interpretation',
    )
    const correctionSpan = firstOf(correctionCapture.source.spans, 'correction source span')
    const edit = new SelectRequestInterpretationEdit({
      id: Schema.decodeUnknownSync(SelectRequestInterpretationEdit.fields.id)(
        'case-semantic-edit:patch-publication-domain',
      ),
      editKind: 'SelectRequestInterpretation',
      caseId: caseOpen.case.id,
      correctionId: correctionCapture.correction.id,
      targetIrRef: caseOpen.case.currentIrRef,
      selectedInterpretationId: validateInterpretation.id,
      selectedFrameId: validateFrame.id,
      action: 'validate',
      prohibitedActions: ['rewrite'],
      rejectedInterpretationIds: [rewriteInterpretation.id],
      evidenceRefs: [
        new EvidenceRef({
          sourceId: correctionCapture.source.id,
          spanId: correctionSpan.id,
        }),
      ],
    })
    const application = yield* correctionWorkflow.applyCaseSemanticEdit(
      caseOpen.case,
      correctionCapture.correction,
      edit,
    )
    const diagnosisResult = yield* diagnosisWorkflow.diagnoseAndPropose(application)

    if (diagnosisResult.gateResult.resultKind !== 'SemanticPatchCandidateProposed') {
      assert.fail('Expected SemanticPatchCandidateProposed gate result')
    }

    return {
      application,
      diagnosisResult,
      domainPackage,
      patchCandidate: diagnosisResult.gateResult.patchCandidate,
    }
  },
)

const roundTripPatchPublicationOutput = Effect.fn('roundTripPatchPublicationOutput')(
  function* (failedRun: RegressionRunResult, publication: SemanticPatchPublicationResult) {
    const encodedFailedRun = yield* Schema.encodeUnknownEffect(RegressionRun)(failedRun.regressionRun)
    yield* Schema.decodeUnknownEffect(RegressionRun)(encodedFailedRun)

    const encodedCandidate = yield* Schema.encodeUnknownEffect(SemanticPatchCandidate)(publication.patchCandidate)
    yield* Schema.decodeUnknownEffect(SemanticPatchCandidate)(encodedCandidate)

    const encodedPublication = yield* Schema.encodeUnknownEffect(SemanticPatchPublicationResult)(publication)
    yield* Schema.decodeUnknownEffect(SemanticPatchPublicationResult)(encodedPublication)

    for (const record of publication.ledgerRecords) {
      const encodedRecord = yield* Schema.encodeUnknownEffect(LedgerRecordSchema)(record)
      yield* Schema.decodeUnknownEffect(LedgerRecordSchema)(encodedRecord)
    }
  },
)

describe('Domain Semantic Patch Candidate publication workflow', () => {
  it.effect('blocks missing or failed regression and publishes a new immutable package version after passing regression', () =>
    Effect.gen(function* () {
      const publicationWorkflow = yield* SemanticPatchPublicationWorkflow
      const ledger = yield* SemanticLedger
      const { application, diagnosisResult, domainPackage, patchCandidate } = yield* domainCandidateFixture()

      assert.strictEqual(patchCandidate.candidateKind, 'domain_package_patch')
      assert.strictEqual(patchCandidate.lifecycle, 'proposed')
      assert.strictEqual(patchCandidate.state, 'awaiting_regression')
      assert.strictEqual(patchCandidate.sourceCaseId, application.case.id)
      assert.strictEqual(patchCandidate.sourceCorrectionId, application.correction.id)
      assert.strictEqual(patchCandidate.sourceCaseSemanticEditId, application.edit.id)
      assert.strictEqual(patchCandidate.sourceDiagnosisId, diagnosisResult.diagnosis.id)
      assert.strictEqual(patchCandidate.target.targetKind, 'semantic_package')
      assert.strictEqual(patchCandidate.expectedImpact.impactKind, 'package_definition_update')

      if (patchCandidate.scope.scopeKind !== 'domain' || patchCandidate.target.targetKind !== 'semantic_package') {
        assert.fail('Expected domain semantic package patch candidate')
      }

      const missingRegressionBlocked = yield* publicationWorkflow.publishCandidate(patchCandidate).pipe(
        Effect.map(() => false),
        Effect.catchTag(
          'PatchPublicationBlocked',
          error => Effect.succeed(error.expectedOutcome === 'regression_run_passed'),
        ),
      )
      assert.strictEqual(missingRegressionBlocked, true)

      const failingRegressionCase = new RegressionCase({
        id: Schema.decodeUnknownSync(RegressionCase.fields.id)('regression-case:patch-publication:failing'),
        artifactKind: 'regression-case',
        patchCandidateId: patchCandidate.id,
        sourceCaseId: patchCandidate.sourceCaseId,
        sourceCorrectionId: patchCandidate.sourceCorrectionId,
        targetPackage: patchCandidate.target.packageRef,
        assertion: new PackageDefinitionContainsAssertion({
          assertionKind: 'package_definition_contains',
          packageId: patchCandidate.target.packageRef.packageId,
          requiredText: 'text that the deterministic candidate does not publish',
        }),
        rationale: 'Prove failed regression blocks publication.',
        createdAt: '2026-06-24T00:00:00.000Z',
      })
      const failedRun = yield* publicationWorkflow.runRegression(failingRegressionCase, patchCandidate)
      assert.strictEqual(failedRun.regressionRun.outcome, 'failed')
      assert.strictEqual(failedRun.patchCandidate.lifecycle, 'proposed')
      assert.strictEqual(failedRun.patchCandidate.state, 'regression_failed')

      const failedRegressionBlocked = yield* publicationWorkflow.publishCandidate(patchCandidate).pipe(
        Effect.map(() => false),
        Effect.catchTag(
          'PatchPublicationBlocked',
          error => Effect.succeed(error.expectedOutcome === 'regression_run_passed'),
        ),
      )
      assert.strictEqual(failedRegressionBlocked, true)

      const regressionCase = yield* publicationWorkflow.createRegressionCase(patchCandidate)
      const passingRun = yield* publicationWorkflow.runRegression(regressionCase.regressionCase, patchCandidate)
      assert.strictEqual(passingRun.regressionRun.outcome, 'passed')
      assert.strictEqual(passingRun.patchCandidate.lifecycle, 'proposed')
      assert.strictEqual(passingRun.patchCandidate.state, 'regression_passed')

      const publication = yield* publicationWorkflow.publishCandidate(patchCandidate)
      yield* roundTripPatchPublicationOutput(failedRun, publication)

      assert.strictEqual(publication.previousPackageVersion.id, domainPackage.packageVersion.id)
      assert.strictEqual(publication.previousPackageVersion.version, 'v1')
      assert.strictEqual(publication.packageVersion.version, 'v2')
      assert.strictEqual(publication.packageVersion.state, 'published')
      assert.notStrictEqual(publication.packageVersion.id, publication.previousPackageVersion.id)
      assert.strictEqual(publication.currentView.currentVersionId, publication.packageVersion.id)
      assert.strictEqual(publication.patchCandidate.lifecycle, 'published')
      assert.strictEqual(publication.patchCandidate.state, 'published')
      assert.strictEqual(publication.patchCandidatePublishedRecord.packageVersionId, publication.packageVersion.id)
      assert.strictEqual(publication.patchCandidatePublishedRecord.regressionRunId, passingRun.regressionRun.id)

      const newDefinition = firstOf(publication.publishedPackage.artifacts.definitions, 'new definition')
      assert.isTrue(newDefinition.text.includes('corrected requests must validate without rewriting target content'))
      assert.notStrictEqual(newDefinition.text, originalDomainDefinition)

      assert.strictEqual(publication.packageVersionRecord.publicationSource.sourceKind, 'semantic_patch_candidate')
      if (publication.packageVersionRecord.publicationSource.sourceKind !== 'semantic_patch_candidate') {
        assert.fail('Expected semantic patch publication source')
      }
      const publicationSource = publication.packageVersionRecord.publicationSource
      assert.strictEqual(publicationSource.patchCandidateId, patchCandidate.id)
      assert.strictEqual(publicationSource.sourceCaseId, application.case.id)
      assert.strictEqual(publicationSource.sourceCorrectionId, application.correction.id)
      assert.strictEqual(publicationSource.sourceCaseSemanticEditId, application.edit.id)
      assert.strictEqual(publicationSource.sourceDiagnosisId, diagnosisResult.diagnosis.id)
      assert.strictEqual(publicationSource.regressionCaseId, passingRun.regressionRun.regressionCaseId)
      assert.strictEqual(publicationSource.regressionRunId, passingRun.regressionRun.id)
      assert.strictEqual(publicationSource.previousPackageVersionId, domainPackage.packageVersion.id)

      const allRecords = yield* ledger.records
      const packagePublishRecords = allRecords.filter(isPackageVersionPublishedRecord)
      const oldDomainPublishRecord = packagePublishRecords.find(record =>
        record.packageVersion.id === domainPackage.packageVersion.id,
      )
      const newDomainPublishRecord = packagePublishRecords.find(record =>
        record.packageVersion.id === publication.packageVersion.id,
      )

      assert.strictEqual(packagePublishRecords.length, 3)
      assert.ok(oldDomainPublishRecord)
      assert.ok(newDomainPublishRecord)
      assert.strictEqual(
        oldDomainPublishRecord.publishedPackage.artifacts.definitions[0]?.text,
        originalDomainDefinition,
      )
      assert.strictEqual(newDomainPublishRecord.packageVersion.version, 'v2')
      assert.strictEqual(allRecords.filter(isPatchCandidateRecord).length, 1)
      assert.strictEqual(allRecords.filter(isRegressionCaseRecord).length, 1)
      assert.strictEqual(allRecords.filter(isRegressionRunRecord).length, 2)
      assert.strictEqual(allRecords.filter(isPatchCandidatePublishedRecord).length, 1)
      assert.strictEqual(
        allRecords.findIndex(isRegressionRunRecord) < allRecords.findIndex(isPatchCandidatePublishedRecord),
        true,
      )
    }).pipe(Effect.provide(layerInMemoryWithPatchPublication(basePackageId))))
})
