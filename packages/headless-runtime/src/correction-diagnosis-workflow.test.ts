import type {
  CorrectionDiagnosedRecord,
  LedgerRecordType as LedgerRecord,
  NoSemanticPatchCandidateRecord,
  PackageVersionPublishedRecord,
  SemanticPatchCandidateProposedRecord,
} from '@harmony/semantic-model/schema/ledger-record'
import { assert, describe, it } from '@effect/vitest'
import { SemanticLedger } from '@harmony/headless-runtime/ledger'
import { ActiveEnvironmentBuilder } from '@harmony/headless-runtime/runtime/active-environment-builder'
import { CorrectionDiagnosisWorkflow } from '@harmony/headless-runtime/runtime/correction-diagnosis-workflow'
import { CorrectionWorkflow } from '@harmony/headless-runtime/runtime/correction-workflow'
import { GlossaryPackageWorkflow } from '@harmony/headless-runtime/runtime/glossary-package-workflow'
import { layerInMemoryWithCorrectionDiagnosis } from '@harmony/headless-runtime/runtime/layers'
import { PromptClarificationWorkflow } from '@harmony/headless-runtime/runtime/prompt-clarification-workflow'
import { Case, SelectRequestInterpretationEdit } from '@harmony/semantic-model/schema/case'
import { CorrectionDiagnosis } from '@harmony/semantic-model/schema/correction-diagnosis'
import { CorrectionDiagnosisGateResult, SemanticPatchCandidateProposalResult } from '@harmony/semantic-model/schema/correction-gate'
import { ActiveEnvironmentBuildRequest, LocalSemanticContext } from '@harmony/semantic-model/schema/environment'
import { PackageId } from '@harmony/semantic-model/schema/ids'
import {
  CorrectionEvidenceSource,
  EvidenceRef,
  PromptInput,
  VocabularyInput,
} from '@harmony/semantic-model/schema/input'
import { LedgerRecord as LedgerRecordSchema } from '@harmony/semantic-model/schema/ledger-record'
import { SemanticPatchCandidate } from '@harmony/semantic-model/schema/semantic-patch'
import { CorrectionDiagnosisWorkflowResult } from '@harmony/semantic-model/schema/workflow-result'
import { Effect, Schema } from 'effect'

const basePackageId = Schema.decodeUnknownSync(PackageId)('package:base.correction-diagnosis')
const domainPackageId = Schema.decodeUnknownSync(PackageId)('package:domain.correction-diagnosis')
const promptText = 'check this document; do not edit it'
const targetDocumentRef = 'semantic-input:diagnosis-target-document'

const baseGlossaryFixture = {
  id: 'vocabulary-input:base-correction-diagnosis',
  inputKind: 'vocabulary',
  content: 'document：content supplied as the correction diagnosis target',
  vocabularyKind: 'base',
  namespace: 'base.correction-diagnosis',
  spans: [
    {
      id: 'source-span:base-correction-diagnosis:entry',
      startOffset: 0,
      endOffset: 58,
      text: 'document：content supplied as the correction diagnosis target',
    },
    {
      id: 'source-span:base-correction-diagnosis:term',
      startOffset: 0,
      endOffset: 8,
      text: 'document',
    },
    {
      id: 'source-span:base-correction-diagnosis:definition',
      startOffset: 9,
      endOffset: 58,
      text: 'content supplied as the correction diagnosis target',
    },
  ],
}

const domainGlossaryFixture = {
  id: 'vocabulary-input:domain-correction-diagnosis',
  inputKind: 'vocabulary',
  content: 'RefundReviewRule：Domain package controls refund review semantics',
  vocabularyKind: 'domain',
  namespace: 'domain.correction-diagnosis',
  spans: [
    {
      id: 'source-span:domain-correction-diagnosis:entry',
      startOffset: 0,
      endOffset: 62,
      text: 'RefundReviewRule：Domain package controls refund review semantics',
    },
    {
      id: 'source-span:domain-correction-diagnosis:term',
      startOffset: 0,
      endOffset: 16,
      text: 'RefundReviewRule',
    },
    {
      id: 'source-span:domain-correction-diagnosis:definition',
      startOffset: 17,
      endOffset: 62,
      text: 'Domain package controls refund review semantics',
    },
  ],
}

const localContextFixture = {
  id: 'local-context:correction-diagnosis',
  contextKind: 'case-local',
  description: 'Correction Diagnosis fixture that gates patch candidate proposal.',
  evidenceRefs: [],
}

const promptFixture = {
  id: 'semantic-input:prompt-correction-diagnosis',
  inputKind: 'prompt',
  content: promptText,
  promptRole: 'user_request',
  targetRefs: [targetDocumentRef],
  spans: [
    {
      id: 'source-span:prompt-correction-diagnosis:full',
      startOffset: 0,
      endOffset: 35,
      text: promptText,
    },
    {
      id: 'source-span:prompt-correction-diagnosis:action',
      startOffset: 0,
      endOffset: 5,
      text: 'check',
    },
    {
      id: 'source-span:prompt-correction-diagnosis:target',
      startOffset: 6,
      endOffset: 19,
      text: 'this document',
    },
    {
      id: 'source-span:prompt-correction-diagnosis:prohibited-action',
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

function isCorrectionDiagnosedRecord(record: LedgerRecord): record is CorrectionDiagnosedRecord {
  return record.recordKind === 'CorrectionDiagnosed'
}

function isNoPatchRecord(record: LedgerRecord): record is NoSemanticPatchCandidateRecord {
  return record.recordKind === 'NoSemanticPatchCandidate'
}

function isPatchCandidateRecord(record: LedgerRecord): record is SemanticPatchCandidateProposedRecord {
  return record.recordKind === 'SemanticPatchCandidateProposed'
}

function isPackageVersionPublishedRecord(record: LedgerRecord): record is PackageVersionPublishedRecord {
  return record.recordKind === 'PackageVersionPublished'
}

const applyCorrectionFixture = Effect.fn('applyCorrectionFixture')(
  function* (correctionText: string, enableDomainPackage: boolean) {
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

    yield* packageWorkflow.compileAndPublish(baseInput)
    const domainPackage = yield* packageWorkflow.compileAndPublish(domainInput)
    assert.strictEqual(domainPackage.packageVersion.packageId, domainPackageId)
    const environment = yield* environmentBuilder.build(new ActiveEnvironmentBuildRequest({
      environmentId: Schema.decodeUnknownSync(ActiveEnvironmentBuildRequest.fields.environmentId)(
        enableDomainPackage
          ? 'active-environment:correction-diagnosis-domain-enabled'
          : 'active-environment:correction-diagnosis-local-only',
      ),
      localContext,
      enabledDomainPackageIds: enableDomainPackage ? [domainPackage.packageVersion.packageId] : [],
    }))
    const promptResult = yield* promptWorkflow.clarifyPrompt(promptInput, environment.environment)

    const caseOpen = yield* correctionWorkflow.openCaseFromPromptClarification(
      Schema.decodeUnknownSync(Case.fields.id)(
        enableDomainPackage ? 'case:correction-diagnosis-domain' : 'case:correction-diagnosis-local',
      ),
      promptResult,
    )
    const correctionCapture = yield* correctionWorkflow.captureCorrection(
      caseOpen.case,
      Schema.decodeUnknownSync(CorrectionEvidenceSource.fields.correctionRef)(
        enableDomainPackage
          ? 'correction:correction-diagnosis-domain'
          : 'correction:correction-diagnosis-local',
      ),
      correctionText,
    )

    const validateFrame = firstOf(
      caseOpen.case.currentSemanticIr.frameInstances.filter(frame => frame.action === 'validate'),
      'validate frame',
    )
    const rewriteInterpretation = firstOf(
      caseOpen.case.currentSemanticIr.competingInterpretations.filter(interpretation =>
        interpretation.action === 'rewrite',
      ),
      'rewrite interpretation',
    )
    const validateInterpretation = firstOf(
      caseOpen.case.currentSemanticIr.competingInterpretations.filter(interpretation =>
        interpretation.action === 'validate',
      ),
      'validate interpretation',
    )
    const correctionSpan = firstOf(correctionCapture.source.spans, 'correction source span')
    const edit = new SelectRequestInterpretationEdit({
      id: Schema.decodeUnknownSync(SelectRequestInterpretationEdit.fields.id)(
        enableDomainPackage
          ? 'case-semantic-edit:correction-diagnosis-domain'
          : 'case-semantic-edit:correction-diagnosis-local',
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

    return {
      application,
      caseOpen,
      domainPackage,
    }
  },
)

const roundTripDiagnosisOutput = Effect.fn('roundTripDiagnosisOutput')(
  function* (result: CorrectionDiagnosisWorkflowResult) {
    const encodedDiagnosis = yield* Schema.encodeUnknownEffect(CorrectionDiagnosis)(result.diagnosis)
    yield* Schema.decodeUnknownEffect(CorrectionDiagnosis)(encodedDiagnosis)

    const encodedGateResult = yield* Schema.encodeUnknownEffect(CorrectionDiagnosisGateResult)(result.gateResult)
    yield* Schema.decodeUnknownEffect(CorrectionDiagnosisGateResult)(encodedGateResult)

    if (result.gateResult.resultKind === 'SemanticPatchCandidateProposed') {
      const encodedCandidate = yield* Schema.encodeUnknownEffect(SemanticPatchCandidate)(
        result.gateResult.patchCandidate,
      )
      yield* Schema.decodeUnknownEffect(SemanticPatchCandidate)(encodedCandidate)

      const encodedProposal = yield* Schema.encodeUnknownEffect(SemanticPatchCandidateProposalResult)(
        result.gateResult,
      )
      yield* Schema.decodeUnknownEffect(SemanticPatchCandidateProposalResult)(encodedProposal)
    }

    const encodedWorkflowResult = yield* Schema.encodeUnknownEffect(CorrectionDiagnosisWorkflowResult)(result)
    yield* Schema.decodeUnknownEffect(CorrectionDiagnosisWorkflowResult)(encodedWorkflowResult)

    for (const record of result.ledgerRecords) {
      const encodedRecord = yield* Schema.encodeUnknownEffect(LedgerRecordSchema)(record)
      yield* Schema.decodeUnknownEffect(LedgerRecordSchema)(encodedRecord)
    }
  },
)

describe('Correction Diagnosis patch proposal gate', () => {
  it.effect('keeps LocalCorrectionOnly as a local no-patch result', () =>
    Effect.gen(function* () {
      const { application } = yield* applyCorrectionFixture(
        'This is local-only for the current case only; keep the correction local.',
        false,
      )
      const diagnosisWorkflow = yield* CorrectionDiagnosisWorkflow
      const ledger = yield* SemanticLedger

      const result = yield* diagnosisWorkflow.diagnoseAndPropose(application)
      yield* roundTripDiagnosisOutput(result)

      assert.strictEqual(result.diagnosis.diagnosisKind, 'LocalCorrectionOnly')
      assert.strictEqual(result.gateResult.resultKind, 'NoSemanticPatchCandidate')
      assert.strictEqual(result.gateResult.caseId, application.case.id)
      assert.strictEqual(result.gateResult.correctionId, application.correction.id)
      assert.strictEqual(result.gateResult.caseSemanticEditId, application.edit.id)
      assert.strictEqual(result.diagnosis.evidence.caseId, application.case.id)
      assert.strictEqual(result.diagnosis.evidence.correctionId, application.correction.id)
      assert.strictEqual(result.diagnosis.evidence.caseSemanticEditId, application.edit.id)
      assert.strictEqual(result.diagnosis.evidence.beforeIrRef, application.beforeSemanticIr.id)
      assert.strictEqual(result.diagnosis.evidence.afterIrRef, application.afterSemanticIr.id)
      assert.isTrue(result.diagnosis.evidenceRefs.some(ref => ref.sourceId === application.correction.evidenceSourceId))

      const malformedDiagnosisFailed = yield* Schema.decodeUnknownEffect(CorrectionDiagnosis)({
        ...result.diagnosis,
        diagnosisKind: 'UnexpectedDefect',
      }).pipe(
        Effect.map(() => false),
        Effect.catch(() => Effect.succeed(true)),
      )
      assert.strictEqual(malformedDiagnosisFailed, true)

      const allRecords = yield* ledger.records
      assert.strictEqual(allRecords.filter(isCorrectionDiagnosedRecord).length, 1)
      assert.strictEqual(allRecords.filter(isNoPatchRecord).length, 1)
      assert.strictEqual(allRecords.filter(isPatchCandidateRecord).length, 0)
      assert.strictEqual(firstOf(allRecords.filter(isNoPatchRecord), 'no patch record').result.id, result.gateResult.id)
    }).pipe(Effect.provide(layerInMemoryWithCorrectionDiagnosis(basePackageId))))

  it.effect('proposes a scoped Semantic Patch Candidate for DomainPackageMissingOrWrong', () =>
    Effect.gen(function* () {
      const { application, domainPackage } = yield* applyCorrectionFixture(
        'The active domain package is missing or wrong here; propose a domain package rule correction.',
        true,
      )
      const diagnosisWorkflow = yield* CorrectionDiagnosisWorkflow
      const ledger = yield* SemanticLedger

      const result = yield* diagnosisWorkflow.diagnoseAndPropose(application)
      yield* roundTripDiagnosisOutput(result)

      assert.strictEqual(result.diagnosis.diagnosisKind, 'DomainPackageMissingOrWrong')
      if (result.diagnosis.diagnosisKind !== 'DomainPackageMissingOrWrong') {
        assert.fail('Expected DomainPackageMissingOrWrong diagnosis')
      }
      const diagnosis = result.diagnosis
      assert.strictEqual(diagnosis.targetPackage.packageId, domainPackage.packageVersion.packageId)
      assert.strictEqual(diagnosis.targetPackage.packageVersionId, domainPackage.packageVersion.id)
      assert.strictEqual(diagnosis.targetPackage.role, 'domain')
      assert.strictEqual(result.gateResult.resultKind, 'SemanticPatchCandidateProposed')
      if (result.gateResult.resultKind !== 'SemanticPatchCandidateProposed') {
        assert.fail('Expected SemanticPatchCandidateProposed gate result')
      }
      const gateResult = result.gateResult

      const patchCandidate = gateResult.patchCandidate
      assert.strictEqual(patchCandidate.candidateKind, 'domain_package_patch')
      assert.strictEqual(patchCandidate.lifecycle, 'proposed')
      assert.strictEqual(patchCandidate.state, 'awaiting_regression')
      assert.strictEqual(patchCandidate.sourceCaseId, application.case.id)
      assert.strictEqual(patchCandidate.sourceCorrectionId, application.correction.id)
      assert.strictEqual(patchCandidate.sourceCaseSemanticEditId, application.edit.id)
      assert.strictEqual(patchCandidate.sourceDiagnosisId, result.diagnosis.id)
      assert.isTrue(patchCandidate.evidenceRefs.some(ref => ref.sourceId === application.correction.evidenceSourceId))

      assert.strictEqual(patchCandidate.scope.scopeKind, 'domain')
      if (patchCandidate.scope.scopeKind === 'domain') {
        assert.strictEqual(patchCandidate.scope.packageRef.packageId, domainPackage.packageVersion.packageId)
        assert.strictEqual(patchCandidate.scope.packageRef.packageVersionId, domainPackage.packageVersion.id)
        assert.strictEqual(patchCandidate.scope.packageRef.namespace, domainPackage.publishedPackage.namespace)
      }

      const { targetPackage: _targetPackage, ...missingTargetPackage } = diagnosis
      const missingTargetPackageFailed = yield* Schema.decodeUnknownEffect(CorrectionDiagnosis)(
        missingTargetPackage,
      ).pipe(
        Effect.map(() => false),
        Effect.catch(() => Effect.succeed(true)),
      )
      assert.strictEqual(missingTargetPackageFailed, true)

      const allRecords = yield* ledger.records
      assert.strictEqual(allRecords.filter(isCorrectionDiagnosedRecord).length, 1)
      assert.strictEqual(allRecords.filter(isNoPatchRecord).length, 0)
      assert.strictEqual(allRecords.filter(isPatchCandidateRecord).length, 1)
      assert.strictEqual(allRecords.filter(isPackageVersionPublishedRecord).length, 2)
      assert.strictEqual(
        firstOf(allRecords.filter(isPatchCandidateRecord), 'patch candidate record').patchCandidate.id,
        patchCandidate.id,
      )
    }).pipe(Effect.provide(layerInMemoryWithCorrectionDiagnosis(basePackageId))))
})
