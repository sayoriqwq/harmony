import type {
  DocumentInputCapturedRecord,
  LedgerRecordType as LedgerRecord,
  SemanticIrProducedRecord,
  SemanticLintReportProducedRecord,
} from '@harmony/semantic-model/schema/ledger-record'
import { assert, describe, it } from '@effect/vitest'
import { SemanticLedger } from '@harmony/headless-runtime/ledger'
import { ActiveEnvironmentBuilder } from '@harmony/headless-runtime/runtime/active-environment-builder'
import { DocumentSemanticLintWorkflow } from '@harmony/headless-runtime/runtime/document-semantic-lint-workflow'
import { GlossaryPackageWorkflow } from '@harmony/headless-runtime/runtime/glossary-package-workflow'
import { layerInMemoryWithDocumentSemanticLint } from '@harmony/headless-runtime/runtime/layers'
import { ActiveEnvironmentBuildRequest, LocalSemanticContext } from '@harmony/semantic-model/schema/environment'
import { PackageId } from '@harmony/semantic-model/schema/ids'
import {
  DocumentEvidenceSource,
  DocumentInput,
  SemanticInput,
  VocabularyInput,
} from '@harmony/semantic-model/schema/input'
import { LedgerRecord as LedgerRecordSchema } from '@harmony/semantic-model/schema/ledger-record'
import { SemanticLintReport } from '@harmony/semantic-model/schema/lint'
import { SemanticIr } from '@harmony/semantic-model/schema/semantic-ir'
import { DocumentSemanticLintWorkflowResult } from '@harmony/semantic-model/schema/workflow-result'
import { Effect, Schema } from 'effect'
import {
  baseGlossaryFixture,
  documentFixture,
  domainGlossaryFixture,
  localContextFixture,
  malformedDocumentFixture,
} from './fixtures/document-semantic-lint.js'

const basePackageId = Schema.decodeUnknownSync(PackageId)('package:base.document-lint')
const domainPackageId = Schema.decodeUnknownSync(PackageId)('package:domain.refund-lint')

function firstOf<A>(items: ReadonlyArray<A>, label: string): A {
  const value = items[0]
  if (value === undefined) {
    assert.fail(`Missing ${label}`)
  }
  return value
}

function isDocumentRecord(record: LedgerRecord): record is DocumentInputCapturedRecord {
  return record.recordKind === 'DocumentInputCaptured'
}

function isSemanticIrRecord(record: LedgerRecord): record is SemanticIrProducedRecord {
  return record.recordKind === 'SemanticIrProduced'
}

function isLintReportRecord(record: LedgerRecord): record is SemanticLintReportProducedRecord {
  return record.recordKind === 'SemanticLintReportProduced'
}

function findingFor(result: DocumentSemanticLintWorkflowResult, sectionSuffix: string) {
  const finding = result.report.findings.find(candidate =>
    String(candidate.documentSectionId).endsWith(sectionSuffix),
  )
  if (finding === undefined) {
    assert.fail(`Missing finding for section ${sectionSuffix}`)
  }
  return finding
}

const roundTripLintOutput = Effect.fn('roundTripLintOutput')(
  function* (result: DocumentSemanticLintWorkflowResult) {
    const encodedEvidence = yield* Schema.encodeUnknownEffect(DocumentEvidenceSource)(result.evidenceSource)
    yield* Schema.decodeUnknownEffect(DocumentEvidenceSource)(encodedEvidence)

    const encodedIr = yield* Schema.encodeUnknownEffect(SemanticIr)(result.semanticIr)
    yield* Schema.decodeUnknownEffect(SemanticIr)(encodedIr)

    const encodedReport = yield* Schema.encodeUnknownEffect(SemanticLintReport)(result.report)
    yield* Schema.decodeUnknownEffect(SemanticLintReport)(encodedReport)

    const malformedReport = {
      ...result.report,
      id: 'lint-report',
    }
    const malformedReportFailed = yield* Schema.decodeUnknownEffect(SemanticLintReport)(malformedReport).pipe(
      Effect.map(() => false),
      Effect.catch(() => Effect.succeed(true)),
    )
    assert.strictEqual(malformedReportFailed, true)

    const encodedResult = yield* Schema.encodeUnknownEffect(DocumentSemanticLintWorkflowResult)(result)
    yield* Schema.decodeUnknownEffect(DocumentSemanticLintWorkflowResult)(encodedResult)

    for (const record of result.ledgerRecords) {
      const encodedRecord = yield* Schema.encodeUnknownEffect(LedgerRecordSchema)(record)
      yield* Schema.decodeUnknownEffect(LedgerRecordSchema)(encodedRecord)
    }
  },
)

describe('Document Semantic Lint workflow', () => {
  it.effect('classifies document lint findings without applying inactive domain rules', () =>
    Effect.gen(function* () {
      const documentInput = yield* Schema.decodeUnknownEffect(DocumentInput)(
        documentFixture,
        { onExcessProperty: 'error' },
      )
      const decodedAsSemanticInput = yield* Schema.decodeUnknownEffect(SemanticInput)(
        documentFixture,
        { onExcessProperty: 'error' },
      )
      assert.strictEqual(decodedAsSemanticInput.inputKind, 'document')

      const malformedDocumentFailed = yield* Schema.decodeUnknownEffect(DocumentInput)(malformedDocumentFixture).pipe(
        Effect.map(() => false),
        Effect.catch(() => Effect.succeed(true)),
      )
      assert.strictEqual(malformedDocumentFailed, true)

      const packageWorkflow = yield* GlossaryPackageWorkflow
      const environmentBuilder = yield* ActiveEnvironmentBuilder
      const lintWorkflow = yield* DocumentSemanticLintWorkflow
      const ledger = yield* SemanticLedger

      const baseInput = yield* Schema.decodeUnknownEffect(VocabularyInput)(baseGlossaryFixture)
      const domainInput = yield* Schema.decodeUnknownEffect(VocabularyInput)(domainGlossaryFixture)
      const localContext = yield* Schema.decodeUnknownEffect(LocalSemanticContext)(localContextFixture)

      const basePackage = yield* packageWorkflow.compileAndPublish(baseInput)
      const domainPackage = yield* packageWorkflow.compileAndPublish(domainInput)
      assert.strictEqual(basePackage.packageVersion.packageId, basePackageId)
      assert.strictEqual(domainPackage.packageVersion.packageId, domainPackageId)

      const disabledEnvironment = yield* environmentBuilder.build(new ActiveEnvironmentBuildRequest({
        environmentId: Schema.decodeUnknownSync(ActiveEnvironmentBuildRequest.fields.environmentId)(
          'active-environment:document-lint-domain-disabled',
        ),
        localContext,
        enabledDomainPackageIds: [],
      }))
      const enabledEnvironment = yield* environmentBuilder.build(new ActiveEnvironmentBuildRequest({
        environmentId: Schema.decodeUnknownSync(ActiveEnvironmentBuildRequest.fields.environmentId)(
          'active-environment:document-lint-domain-enabled',
        ),
        localContext,
        enabledDomainPackageIds: [domainPackage.packageVersion.packageId],
      }))

      const disabledResult = yield* lintWorkflow.lintDocument(documentInput, disabledEnvironment.environment)
      assert.strictEqual(disabledResult.report.findings.length, 0)

      const enabledResult = yield* lintWorkflow.lintDocument(documentInput, enabledEnvironment.environment)
      yield* roundTripLintOutput(enabledResult)

      assert.strictEqual(enabledResult.evidenceSource.originalText, documentInput.content)
      assert.strictEqual(enabledResult.semanticIr.inputKind, 'document')
      assert.strictEqual(enabledResult.semanticIr.inputRef, documentInput.id)
      assert.strictEqual(enabledResult.semanticIr.environmentRef, enabledEnvironment.environment.id)
      assert.strictEqual(enabledResult.semanticIr.decisionState, 'parse_uncertain')
      assert.strictEqual(enabledResult.semanticIr.relationAssertions.length, 3)
      assert.strictEqual(enabledResult.semanticIr.unresolvedSpans.length, 1)

      assert.deepStrictEqual(
        enabledResult.report.findings.map(finding => finding.classification).sort(),
        ['conflicted', 'parse_uncertainty', 'supported', 'unknown', 'violated'],
      )

      const supported = findingFor(enabledResult, 'supported')
      const violated = findingFor(enabledResult, 'violated')
      const unknown = findingFor(enabledResult, 'unknown')
      const conflicted = findingFor(enabledResult, 'conflicted')
      const parseUncertain = findingFor(enabledResult, 'parse-uncertain')

      assert.strictEqual(supported.classification, 'supported')
      assert.strictEqual(supported.reason, 'required_relation_present')
      assert.strictEqual(supported.declaredCompleteness, 'complete')
      assert.strictEqual(supported.relationAssertionIds.length, 1)

      assert.strictEqual(violated.classification, 'violated')
      assert.strictEqual(violated.reason, 'missing_required_relation_in_complete_scope')
      assert.strictEqual(violated.declaredCompleteness, 'complete')
      assert.strictEqual(violated.relationAssertionIds.length, 0)

      assert.strictEqual(unknown.classification, 'unknown')
      assert.strictEqual(unknown.reason, 'insufficient_evidence_in_open_scope')
      assert.strictEqual(unknown.declaredCompleteness, 'partial')
      assert.strictEqual(unknown.relationAssertionIds.length, 0)

      assert.strictEqual(conflicted.classification, 'conflicted')
      assert.strictEqual(conflicted.reason, 'conflicting_evidence')
      assert.strictEqual(conflicted.relationAssertionIds.length, 2)

      assert.strictEqual(parseUncertain.classification, 'parse_uncertainty')
      assert.strictEqual(parseUncertain.reason, 'parse_uncertain_alias')
      assert.strictEqual(parseUncertain.relationAssertionIds.length, 0)
      assert.strictEqual(firstOf(parseUncertain.sourceRefs, 'parse uncertainty source').spanId, documentInput.spans[8]?.id)

      for (const finding of enabledResult.report.findings) {
        assert.strictEqual(finding.semanticIrId, enabledResult.semanticIr.id)
        assert.strictEqual(finding.environmentRef, enabledEnvironment.environment.id)
        assert.strictEqual(finding.ruleRef.packageId, domainPackage.packageVersion.packageId)
        assert.strictEqual(finding.ruleRef.packageVersionId, domainPackage.packageVersion.id)
        assert.strictEqual(finding.packageRef.packageId, domainPackage.packageVersion.packageId)
        assert.strictEqual(finding.packageRef.packageVersionId, domainPackage.packageVersion.id)
        assert.strictEqual(finding.packageRef.role, 'domain')
        assert.isTrue(finding.sourceRefs.length > 0)
      }

      const allRecords = yield* ledger.records
      assert.strictEqual(allRecords.filter(isDocumentRecord).length, 2)
      assert.strictEqual(allRecords.filter(isSemanticIrRecord).length, 2)
      assert.strictEqual(allRecords.filter(isLintReportRecord).length, 2)
      assert.strictEqual(firstOf(allRecords.filter(isLintReportRecord), 'first lint report').report.findings.length, 0)
      assert.strictEqual(allRecords.filter(isLintReportRecord)[1]?.report.id, enabledResult.report.id)
    }).pipe(Effect.provide(layerInMemoryWithDocumentSemanticLint(basePackageId))))
})
