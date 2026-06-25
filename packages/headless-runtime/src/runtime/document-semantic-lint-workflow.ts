import type { ActiveSemanticEnvironment } from '@harmony/semantic-model/schema/environment'
import type { DocumentInput } from '@harmony/semantic-model/schema/input'
import type { SemanticIr } from '@harmony/semantic-model/schema/semantic-ir'
import type { DocumentParseError } from './errors.ts'
import { SemanticPackageRef, SemanticRuleRef } from '@harmony/semantic-model/schema/correction-diagnosis'
import { DocumentInputCapturedRecord, SemanticIrProducedRecord, SemanticLintReportProducedRecord } from '@harmony/semantic-model/schema/ledger-record'
import { SemanticLintFinding, SemanticLintReport } from '@harmony/semantic-model/schema/lint'
import { DocumentSemanticLintWorkflowResult } from '@harmony/semantic-model/schema/workflow-result'
import { Context, Effect, Layer, Schema } from 'effect'
import { deterministicInstant, semanticLintVersion } from './constants.ts'
import { SemanticLintUnsupported } from './errors.ts'
import { SemanticLedger } from './ledger.ts'
import { SemanticParser } from './semantic-parser.ts'
import { uniqueEvidenceRefs } from './shared/collections.ts'

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
