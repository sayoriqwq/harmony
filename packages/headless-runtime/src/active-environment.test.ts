import type { LedgerRecordType as LedgerRecord } from '@harmony/semantic-model/schema/ledger-record'
import { assert, describe, it } from '@effect/vitest'
import { SemanticLedger } from '@harmony/headless-runtime/ledger'
import { ActiveEnvironmentBuilder } from '@harmony/headless-runtime/runtime/active-environment-builder'
import { GlossaryPackageWorkflow } from '@harmony/headless-runtime/runtime/glossary-package-workflow'
import { layerInMemoryWithActiveEnvironment } from '@harmony/headless-runtime/runtime/layers'
import { ActiveEnvironmentBuildRequest, ActiveSemanticEnvironment, LocalSemanticContext } from '@harmony/semantic-model/schema/environment'
import { PackageId } from '@harmony/semantic-model/schema/ids'
import { VocabularyInput } from '@harmony/semantic-model/schema/input'
import { ActiveSemanticEnvironmentConstructedRecord, LedgerRecord as LedgerRecordSchema } from '@harmony/semantic-model/schema/ledger-record'
import { SemanticKernelIdentity } from '@harmony/semantic-model/schema/package'
import { ActiveEnvironmentBuildResult } from '@harmony/semantic-model/schema/workflow-result'
import { Effect, Schema } from 'effect'

const baseDefinition = '将已支付金额返还给用户'
const domainDefinition = '退款域内指向支付订单的原路返还流程'
const basePackageId = Schema.decodeUnknownSync(PackageId)('package:base.refund')
const domainPackageId = Schema.decodeUnknownSync(PackageId)('package:domain.refund-ops')

const replacementKernel = new SemanticKernelIdentity({
  id: Schema.decodeUnknownSync(SemanticKernelIdentity.fields.id)('semantic-kernel:test-v1'),
  protocolVersion: 'semantic-kernel.v1',
  version: 'harmony-semantic-kernel@test',
})

function glossaryFixture(
  inputIdSuffix: string,
  vocabularyKind: 'base' | 'domain',
  namespace: string,
  term: string,
  definition: string,
) {
  const content = `${term}：${definition}`
  return {
    id: `vocabulary-input:${inputIdSuffix}`,
    inputKind: 'vocabulary',
    content,
    vocabularyKind,
    namespace,
    spans: [
      {
        id: `source-span:${inputIdSuffix}:entry`,
        startOffset: 0,
        endOffset: content.length,
        text: content,
      },
      {
        id: `source-span:${inputIdSuffix}:term`,
        startOffset: 0,
        endOffset: term.length,
        text: term,
      },
      {
        id: `source-span:${inputIdSuffix}:definition`,
        startOffset: term.length + 1,
        endOffset: content.length,
        text: definition,
      },
    ],
  }
}

const baseGlossaryFixture = glossaryFixture(
  'base-refund',
  'base',
  'base.refund',
  '退款',
  baseDefinition,
)

const domainGlossaryFixture = glossaryFixture(
  'domain-refund-ops',
  'domain',
  'domain.refund-ops',
  '退款',
  domainDefinition,
)

const localContextFixture = {
  id: 'local-context:refund-case',
  contextKind: 'case-local',
  description: 'Same refund case fixture used to compare disabled and enabled domain semantics.',
  evidenceRefs: [],
}

function firstOf<A>(items: ReadonlyArray<A>, label: string): A {
  const value = items[0]
  if (value === undefined) {
    assert.fail(`Missing ${label}`)
  }
  return value
}

function isEnvironmentRecord(record: LedgerRecord): record is ActiveSemanticEnvironmentConstructedRecord {
  return record.recordKind === 'ActiveSemanticEnvironmentConstructed'
}

const roundTripEnvironmentOutput = Effect.fn('roundTripEnvironmentOutput')(
  function* (result: ActiveEnvironmentBuildResult) {
    const encodedEnvironment = yield* Schema.encodeUnknownEffect(ActiveSemanticEnvironment)(result.environment)
    yield* Schema.decodeUnknownEffect(ActiveSemanticEnvironment)(encodedEnvironment)

    const encodedRecord = yield* Schema.encodeUnknownEffect(ActiveSemanticEnvironmentConstructedRecord)(
      result.ledgerRecord,
    )
    yield* Schema.decodeUnknownEffect(ActiveSemanticEnvironmentConstructedRecord)(encodedRecord)
    yield* Schema.decodeUnknownEffect(LedgerRecordSchema)(encodedRecord)

    const encodedResult = yield* Schema.encodeUnknownEffect(ActiveEnvironmentBuildResult)(result)
    yield* Schema.decodeUnknownEffect(ActiveEnvironmentBuildResult)(encodedResult)

    const malformedRecord = {
      ...result.ledgerRecord,
      environment: {
        ...result.environment,
        id: 'active-environment',
      },
    }
    const malformedFailed = yield* Schema.decodeUnknownEffect(ActiveSemanticEnvironmentConstructedRecord)(
      malformedRecord,
    ).pipe(
      Effect.map(() => false),
      Effect.catch(() => Effect.succeed(true)),
    )
    assert.strictEqual(malformedFailed, true)
  },
)

describe('Active Semantic Environment workflow', () => {
  it.effect('keeps base semantics active by default and toggles domain semantics explicitly', () =>
    Effect.gen(function* () {
      const workflow = yield* GlossaryPackageWorkflow
      const builder = yield* ActiveEnvironmentBuilder
      const ledger = yield* SemanticLedger

      const baseInput = yield* Schema.decodeUnknownEffect(VocabularyInput)(baseGlossaryFixture)
      const domainInput = yield* Schema.decodeUnknownEffect(VocabularyInput)(domainGlossaryFixture)
      const localContext = yield* Schema.decodeUnknownEffect(LocalSemanticContext)(localContextFixture)

      const basePackage = yield* workflow.compileAndPublish(baseInput)
      const domainPackage = yield* workflow.compileAndPublish(domainInput)

      assert.strictEqual(basePackage.packageVersion.packageId, basePackageId)
      assert.strictEqual(domainPackage.packageVersion.packageId, domainPackageId)

      const disabled = yield* builder.build(new ActiveEnvironmentBuildRequest({
        environmentId: Schema.decodeUnknownSync(ActiveEnvironmentBuildRequest.fields.environmentId)(
          'active-environment:refund-domain-disabled',
        ),
        localContext,
        enabledDomainPackageIds: [],
      }))
      const enabled = yield* builder.build(new ActiveEnvironmentBuildRequest({
        environmentId: Schema.decodeUnknownSync(ActiveEnvironmentBuildRequest.fields.environmentId)(
          'active-environment:refund-domain-enabled',
        ),
        localContext,
        enabledDomainPackageIds: [domainPackage.packageVersion.packageId],
      }))

      yield* roundTripEnvironmentOutput(disabled)
      yield* roundTripEnvironmentOutput(enabled)

      assert.notStrictEqual(disabled.environment.id, enabled.environment.id)
      assert.strictEqual(disabled.environment.localContext.id, enabled.environment.localContext.id)
      assert.strictEqual(disabled.environment.semanticKernel.version, replacementKernel.version)

      assert.strictEqual(disabled.environment.baseLayer.packageId, basePackage.packageVersion.packageId)
      assert.strictEqual(disabled.environment.baseLayer.version, basePackage.packageVersion.version)
      assert.strictEqual(disabled.environment.baseLayer.activationReason, 'default_base_layer')
      assert.strictEqual(disabled.environment.enabledDomainPackages.length, 0)
      assert.strictEqual(disabled.environment.provenance.enabledDomainPackageIds.length, 0)
      assert.strictEqual(disabled.environment.provenance.sourceIds.includes(domainPackage.evidenceSource.id), false)
      assert.strictEqual(disabled.environment.semanticBindings.some(binding => binding.packageRole === 'domain'), false)
      assert.strictEqual(disabled.environment.semanticBindings.some(binding => binding.definitionText === domainDefinition), false)

      const disabledBaseBinding = firstOf(
        disabled.environment.semanticBindings.filter(binding => binding.packageRole === 'base'),
        'disabled base binding',
      )
      assert.strictEqual(disabledBaseBinding.termLabel, '退款')
      assert.strictEqual(disabledBaseBinding.definitionText, baseDefinition)

      const enabledDomainActivation = firstOf(enabled.environment.enabledDomainPackages, 'enabled domain activation')
      assert.strictEqual(enabledDomainActivation.packageId, domainPackage.packageVersion.packageId)
      assert.strictEqual(enabledDomainActivation.packageVersionId, domainPackage.packageVersion.id)
      assert.strictEqual(enabledDomainActivation.version, domainPackage.packageVersion.version)
      assert.strictEqual(enabledDomainActivation.activationReason, 'explicit_domain_toggle')
      assert.strictEqual(firstOf(enabledDomainActivation.sourceIds, 'domain source'), domainPackage.evidenceSource.id)

      assert.strictEqual(
        enabled.environment.provenance.requestedDomainPackageIds[0],
        domainPackage.packageVersion.packageId,
      )
      assert.strictEqual(
        enabled.environment.provenance.enabledDomainPackageIds[0],
        domainPackage.packageVersion.packageId,
      )
      assert.strictEqual(enabled.environment.provenance.sourceIds.includes(basePackage.evidenceSource.id), true)
      assert.strictEqual(enabled.environment.provenance.sourceIds.includes(domainPackage.evidenceSource.id), true)
      assert.strictEqual(
        enabled.environment.provenance.packageVersionIds.includes(domainPackage.packageVersion.id),
        true,
      )

      const enabledDomainBinding = firstOf(
        enabled.environment.semanticBindings.filter(binding => binding.packageRole === 'domain'),
        'enabled domain binding',
      )
      assert.strictEqual(enabledDomainBinding.termLabel, '退款')
      assert.strictEqual(enabledDomainBinding.definitionText, domainDefinition)
      assert.notStrictEqual(enabledDomainBinding.conceptId, disabledBaseBinding.conceptId)

      const environmentRecords = (yield* ledger.records).filter(isEnvironmentRecord)
      assert.strictEqual(environmentRecords.length, 2)
      assert.strictEqual(firstOf(environmentRecords, 'disabled environment record').environment.id, disabled.environment.id)
      assert.strictEqual(
        enabled.environment.provenance.ledgerRecordIds.includes(enabled.ledgerRecord.id),
        true,
      )
    }).pipe(Effect.provide(layerInMemoryWithActiveEnvironment(basePackageId, replacementKernel))))
})
