import type { CaseSemanticEditType as CaseSemanticEdit } from '@harmony/semantic-model/schema/case'
import type { CaseIdType as CaseId, CorrectionIdType as CorrectionId } from '@harmony/semantic-model/schema/ids'
import type { PromptClarificationWorkflowResult } from '@harmony/semantic-model/schema/workflow-result'
import { Case, CaseSemanticEdit as CaseSemanticEditSchema } from '@harmony/semantic-model/schema/case'
import { Correction, CorrectionEvidenceSource, SourceSpan } from '@harmony/semantic-model/schema/input'
import { CaseOpenedRecord, CaseSemanticEditAppliedRecord, CorrectionCapturedRecord, SemanticIrProducedRecord } from '@harmony/semantic-model/schema/ledger-record'
import { ProhibitedAction, RequestFrame, SemanticIr } from '@harmony/semantic-model/schema/semantic-ir'
import { CaseOpenResult, CaseSemanticEditApplicationResult, CorrectionCaptureResult } from '@harmony/semantic-model/schema/workflow-result'
import { Context, Effect, Layer, Schema } from 'effect'
import { correctionWorkflowVersion, deterministicInstant } from './constants.ts'
import { CaseSemanticEditApplicationError } from './errors.ts'
import { SemanticLedger } from './ledger.ts'
import { unique, uniqueEvidenceRefs } from './shared/collections.ts'

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
