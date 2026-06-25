import type { ActiveEnvironmentBuildRequest } from '@harmony/semantic-model/schema/environment'
import type { PackageCurrentView } from '@harmony/semantic-model/schema/workflow-result'
import type { LedgerViewNotFound } from './ledger.ts'
import { ActiveEnvironmentProvenance, ActiveSemanticEnvironment, EnvironmentSemanticBinding, PackageActivation } from '@harmony/semantic-model/schema/environment'
import { ActiveSemanticEnvironmentConstructedRecord } from '@harmony/semantic-model/schema/ledger-record'
import { ActiveEnvironmentBuildResult } from '@harmony/semantic-model/schema/workflow-result'
import { Context, Effect, Layer, Schema } from 'effect'
import { activeEnvironmentBuilderVersion, deterministicInstant } from './constants.ts'
import { SemanticLedger } from './ledger.ts'
import { BaseSemanticLayer, SemanticKernel } from './semantic-kernel.ts'
import { unique } from './shared/collections.ts'

function packageActivationFromView(
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
    sourceIds: view.sourceIds,
    ledgerRecordIds: view.ledgerRecordIds,
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
          const baseView = yield* ledger.currentPackageView(baseLayer.packageId)
          const requestedDomainPackageIds = unique(request.enabledDomainPackageIds)
          const domainViews = yield* Effect.forEach(
            requestedDomainPackageIds,
            packageId => ledger.currentPackageView(packageId),
          )

          const baseActivation = packageActivationFromView(
            baseView,
            'base',
            'default_base_layer',
          )
          const domainActivations = domainViews.map(view =>
            packageActivationFromView(
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
