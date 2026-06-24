import type {
  CaseOpenedRecord,
  CaseSemanticEditAppliedRecord,
  CorrectionCapturedRecord,
  LedgerRecordType as LedgerRecord,
  PromptInputCapturedRecord,
  SemanticIrProducedRecord,
} from '@harmony/semantic-model'
import { assert, describe, it } from '@effect/vitest'
import {
  ActiveEnvironmentBuilder,
  CorrectionWorkflow,
  GlossaryPackageWorkflow,
  layerInMemoryWithCorrection,
  PromptClarificationWorkflow,
  SemanticLedger,
} from '@harmony/headless-runtime'
import {
  ActiveEnvironmentBuildRequest,
  Case,
  CaseOpenResult,
  CaseSemanticEditApplicationResult,
  CaseSemanticEdit as CaseSemanticEditSchema,
  Correction,
  CorrectionCaptureResult,
  CorrectionEvidenceSource,
  EvidenceRef,
  LedgerRecord as LedgerRecordSchema,
  LocalSemanticContext,
  PackageId,
  PromptInput,
  SelectRequestInterpretationEdit,
  SemanticIr,
  VocabularyInput,
} from '@harmony/semantic-model'
import { Effect, Schema } from 'effect'

const basePackageId = Schema.decodeUnknownSync(PackageId)('package:base.correction')
const promptText = 'check this document; do not edit it'
const correctionText = 'I meant validate/check, not rewrite; do not edit the document.'
const targetDocumentRef = 'semantic-input:document-under-correction'

const baseGlossaryFixture = {
  id: 'vocabulary-input:base-correction',
  inputKind: 'vocabulary',
  content: 'document：content supplied as the correction target',
  vocabularyKind: 'base',
  namespace: 'base.correction',
  spans: [
    {
      id: 'source-span:base-correction:entry',
      startOffset: 0,
      endOffset: 48,
      text: 'document：content supplied as the correction target',
    },
    {
      id: 'source-span:base-correction:term',
      startOffset: 0,
      endOffset: 8,
      text: 'document',
    },
    {
      id: 'source-span:base-correction:definition',
      startOffset: 9,
      endOffset: 48,
      text: 'content supplied as the correction target',
    },
  ],
}

const localContextFixture = {
  id: 'local-context:case-correction',
  contextKind: 'case-local',
  description: 'Correction fixture that resolves prompt action ambiguity locally.',
  evidenceRefs: [],
}

const promptFixture = {
  id: 'semantic-input:prompt-check-correction',
  inputKind: 'prompt',
  content: promptText,
  promptRole: 'user_request',
  targetRefs: [targetDocumentRef],
  spans: [
    {
      id: 'source-span:prompt-check-correction:full',
      startOffset: 0,
      endOffset: 35,
      text: promptText,
    },
    {
      id: 'source-span:prompt-check-correction:action',
      startOffset: 0,
      endOffset: 5,
      text: 'check',
    },
    {
      id: 'source-span:prompt-check-correction:target',
      startOffset: 6,
      endOffset: 19,
      text: 'this document',
    },
    {
      id: 'source-span:prompt-check-correction:prohibited-action',
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

function isPromptRecord(record: LedgerRecord): record is PromptInputCapturedRecord {
  return record.recordKind === 'PromptInputCaptured'
}

function isSemanticIrRecord(record: LedgerRecord): record is SemanticIrProducedRecord {
  return record.recordKind === 'SemanticIrProduced'
}

function isCaseOpenedRecord(record: LedgerRecord): record is CaseOpenedRecord {
  return record.recordKind === 'CaseOpened'
}

function isCorrectionRecord(record: LedgerRecord): record is CorrectionCapturedRecord {
  return record.recordKind === 'CorrectionCaptured'
}

function isEditAppliedRecord(record: LedgerRecord): record is CaseSemanticEditAppliedRecord {
  return record.recordKind === 'CaseSemanticEditApplied'
}

const roundTripCorrectionOutput = Effect.fn('roundTripCorrectionOutput')(
  function* (
    caseOpen: CaseOpenResult,
    correctionCapture: CorrectionCaptureResult,
    application: CaseSemanticEditApplicationResult,
  ) {
    const encodedCase = yield* Schema.encodeUnknownEffect(Case)(application.case)
    yield* Schema.decodeUnknownEffect(Case)(encodedCase)

    const encodedCaseOpen = yield* Schema.encodeUnknownEffect(CaseOpenResult)(caseOpen)
    yield* Schema.decodeUnknownEffect(CaseOpenResult)(encodedCaseOpen)

    const encodedCorrectionSource = yield* Schema.encodeUnknownEffect(CorrectionEvidenceSource)(
      correctionCapture.source,
    )
    yield* Schema.decodeUnknownEffect(CorrectionEvidenceSource)(encodedCorrectionSource)

    const encodedCorrection = yield* Schema.encodeUnknownEffect(Correction)(correctionCapture.correction)
    yield* Schema.decodeUnknownEffect(Correction)(encodedCorrection)

    const encodedCapture = yield* Schema.encodeUnknownEffect(CorrectionCaptureResult)(correctionCapture)
    yield* Schema.decodeUnknownEffect(CorrectionCaptureResult)(encodedCapture)

    const encodedEdit = yield* Schema.encodeUnknownEffect(CaseSemanticEditSchema)(application.edit)
    yield* Schema.decodeUnknownEffect(CaseSemanticEditSchema)(encodedEdit)
    yield* Schema.decodeUnknownEffect(SelectRequestInterpretationEdit)(encodedEdit)

    const encodedBeforeIr = yield* Schema.encodeUnknownEffect(SemanticIr)(application.beforeSemanticIr)
    yield* Schema.decodeUnknownEffect(SemanticIr)(encodedBeforeIr)

    const encodedAfterIr = yield* Schema.encodeUnknownEffect(SemanticIr)(application.afterSemanticIr)
    yield* Schema.decodeUnknownEffect(SemanticIr)(encodedAfterIr)

    const encodedApplication = yield* Schema.encodeUnknownEffect(CaseSemanticEditApplicationResult)(application)
    yield* Schema.decodeUnknownEffect(CaseSemanticEditApplicationResult)(encodedApplication)

    for (const record of application.ledgerRecords) {
      const encodedRecord = yield* Schema.encodeUnknownEffect(LedgerRecordSchema)(record)
      yield* Schema.decodeUnknownEffect(LedgerRecordSchema)(encodedRecord)
    }
  },
)

describe('Correction CaseSemanticEdit workflow', () => {
  it.effect('applies a typed request interpretation edit while preserving correction evidence and IR refs', () =>
    Effect.gen(function* () {
      const promptInput = yield* Schema.decodeUnknownEffect(PromptInput)(
        promptFixture,
        { onExcessProperty: 'error' },
      )
      const baseInput = yield* Schema.decodeUnknownEffect(VocabularyInput)(baseGlossaryFixture)
      const localContext = yield* Schema.decodeUnknownEffect(LocalSemanticContext)(localContextFixture)

      const packageWorkflow = yield* GlossaryPackageWorkflow
      const environmentBuilder = yield* ActiveEnvironmentBuilder
      const promptWorkflow = yield* PromptClarificationWorkflow
      const correctionWorkflow = yield* CorrectionWorkflow
      const ledger = yield* SemanticLedger

      yield* packageWorkflow.compileAndPublish(baseInput)
      const environment = yield* environmentBuilder.build(new ActiveEnvironmentBuildRequest({
        environmentId: Schema.decodeUnknownSync(ActiveEnvironmentBuildRequest.fields.environmentId)(
          'active-environment:case-correction',
        ),
        localContext,
        enabledDomainPackageIds: [],
      }))
      const promptResult = yield* promptWorkflow.clarifyPrompt(promptInput, environment.environment)

      const caseOpen = yield* correctionWorkflow.openCaseFromPromptClarification(
        Schema.decodeUnknownSync(Case.fields.id)('case:prompt-correction'),
        promptResult,
      )
      const correctionCapture = yield* correctionWorkflow.captureCorrection(
        caseOpen.case,
        Schema.decodeUnknownSync(Correction.fields.id)('correction:prompt-correction-1'),
        correctionText,
      )

      const validateFrame = firstOf(
        caseOpen.case.currentSemanticIr.frameInstances.filter(frame => frame.action === 'validate'),
        'validate frame',
      )
      const rewriteFrame = firstOf(
        caseOpen.case.currentSemanticIr.frameInstances.filter(frame => frame.action === 'rewrite'),
        'rewrite frame',
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
      const correctionEvidenceRef = new EvidenceRef({
        sourceId: correctionCapture.source.id,
        spanId: correctionSpan.id,
      })
      const edit = new SelectRequestInterpretationEdit({
        id: Schema.decodeUnknownSync(SelectRequestInterpretationEdit.fields.id)(
          'case-semantic-edit:prompt-correction-select-validate',
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
        evidenceRefs: [correctionEvidenceRef],
      })

      const unknownEditFailed = yield* Schema.decodeUnknownEffect(CaseSemanticEditSchema)({
        ...edit,
        editKind: 'RawProseCorrection',
      }).pipe(
        Effect.map(() => false),
        Effect.catch(() => Effect.succeed(true)),
      )
      assert.strictEqual(unknownEditFailed, true)

      const malformedEditFailed = yield* Schema.decodeUnknownEffect(CaseSemanticEditSchema)({
        ...edit,
        prohibitedActions: ['delete'],
      }).pipe(
        Effect.map(() => false),
        Effect.catch(() => Effect.succeed(true)),
      )
      assert.strictEqual(malformedEditFailed, true)

      const badFrameEdit = new SelectRequestInterpretationEdit({
        ...edit,
        id: Schema.decodeUnknownSync(SelectRequestInterpretationEdit.fields.id)(
          'case-semantic-edit:prompt-correction-missing-frame',
        ),
        selectedFrameId: Schema.decodeUnknownSync(SelectRequestInterpretationEdit.fields.selectedFrameId)(
          'request-frame:missing',
        ),
      })
      const typedHandlingFailed = yield* correctionWorkflow.applyCaseSemanticEdit(
        caseOpen.case,
        correctionCapture.correction,
        badFrameEdit,
      ).pipe(
        Effect.map(() => false),
        Effect.catchTag('CaseSemanticEditApplicationError', () => Effect.succeed(true)),
      )
      assert.strictEqual(typedHandlingFailed, true)

      const application = yield* correctionWorkflow.applyCaseSemanticEdit(
        caseOpen.case,
        correctionCapture.correction,
        edit,
      )
      yield* roundTripCorrectionOutput(caseOpen, correctionCapture, application)

      assert.strictEqual(promptResult.evidenceSource.originalText, promptText)
      assert.strictEqual(correctionCapture.source.originalText, correctionText)
      assert.strictEqual(correctionCapture.correction.userText, correctionText)
      assert.notStrictEqual(correctionCapture.source.originalText, promptResult.evidenceSource.originalText)

      assert.strictEqual(caseOpen.case.originalPromptInputRef, promptInput.id)
      assert.strictEqual(caseOpen.case.originalPromptEvidenceSourceId, promptResult.evidenceSource.id)
      assert.strictEqual(caseOpen.case.originalIrRef, promptResult.semanticIr.id)
      assert.strictEqual(caseOpen.case.currentIrRef, promptResult.semanticIr.id)
      assert.strictEqual(application.case.originalIrRef, promptResult.semanticIr.id)
      assert.strictEqual(application.appliedRecord.beforeIrRef, promptResult.semanticIr.id)
      assert.strictEqual(application.appliedRecord.afterIrRef, application.afterSemanticIr.id)
      assert.notStrictEqual(application.appliedRecord.beforeIrRef, application.appliedRecord.afterIrRef)

      assert.strictEqual(application.beforeSemanticIr.id, promptResult.semanticIr.id)
      assert.strictEqual(application.beforeSemanticIr.decisionState, 'requires_clarification')
      assert.strictEqual(application.beforeSemanticIr.frameInstances.length, 2)
      assert.strictEqual(application.beforeSemanticIr.competingInterpretations.length, 2)
      assert.isTrue(application.beforeSemanticIr.frameInstances.some(frame => frame.id === rewriteFrame.id))

      const afterFrame = firstOf(application.afterSemanticIr.frameInstances, 'after request frame')
      const afterProhibitedAction = firstOf(afterFrame.prohibitedActions, 'after prohibited action')
      assert.strictEqual(application.afterSemanticIr.decisionState, 'parsed')
      assert.strictEqual(application.afterSemanticIr.frameInstances.length, 1)
      assert.strictEqual(application.afterSemanticIr.competingInterpretations.length, 0)
      assert.strictEqual(afterFrame.id, validateFrame.id)
      assert.strictEqual(afterFrame.action, 'validate')
      assert.strictEqual(afterProhibitedAction.action, 'rewrite')
      assert.isTrue(afterFrame.actionEvidenceRefs.some(ref => ref.sourceId === correctionCapture.source.id))
      assert.isTrue(afterFrame.prohibitedActionEvidenceRefs.some(ref => ref.sourceId === correctionCapture.source.id))
      assert.isTrue(application.afterSemanticIr.evidenceRefs.some(ref => ref.sourceId === correctionCapture.source.id))

      assert.strictEqual(application.edit.editKind, 'SelectRequestInterpretation')
      assert.strictEqual(application.edit.action, 'validate')
      assert.deepStrictEqual(application.edit.prohibitedActions, ['rewrite'])
      assert.deepStrictEqual(application.edit.rejectedInterpretationIds, [rewriteInterpretation.id])

      const allRecords = yield* ledger.records
      const promptRecords = allRecords.filter(isPromptRecord)
      const semanticIrRecords = allRecords.filter(isSemanticIrRecord)
      const caseRecords = allRecords.filter(isCaseOpenedRecord)
      const correctionRecords = allRecords.filter(isCorrectionRecord)
      const appliedRecords = allRecords.filter(isEditAppliedRecord)

      assert.strictEqual(promptRecords.length, 1)
      assert.strictEqual(firstOf(promptRecords, 'prompt record').source.originalText, promptText)
      assert.strictEqual(semanticIrRecords.length, 2)
      assert.strictEqual(semanticIrRecords[0]?.semanticIr.id, promptResult.semanticIr.id)
      assert.strictEqual(semanticIrRecords[0]?.semanticIr.frameInstances.length, 2)
      assert.strictEqual(semanticIrRecords[1]?.semanticIr.id, application.afterSemanticIr.id)
      assert.strictEqual(caseRecords.length, 1)
      assert.strictEqual(firstOf(caseRecords, 'case record').case.originalIrRef, promptResult.semanticIr.id)
      assert.strictEqual(correctionRecords.length, 1)
      assert.strictEqual(firstOf(correctionRecords, 'correction record').source.originalText, correctionText)
      assert.strictEqual(appliedRecords.length, 1)
      assert.strictEqual(firstOf(appliedRecords, 'applied record').beforeIrRef, promptResult.semanticIr.id)
      assert.strictEqual(firstOf(appliedRecords, 'applied record').afterIrRef, application.afterSemanticIr.id)
      assert.strictEqual(
        allRecords.findIndex(isCorrectionRecord) < allRecords.findIndex(isEditAppliedRecord),
        true,
      )
    }).pipe(Effect.provide(layerInMemoryWithCorrection(basePackageId))))
})
