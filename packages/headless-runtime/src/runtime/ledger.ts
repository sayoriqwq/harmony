import type {
  SemanticPackageRef,
} from '@harmony/semantic-model/schema/correction-diagnosis'
import type {
  PackageIdType as PackageId,
} from '@harmony/semantic-model/schema/ids'
import type {
  ActiveSemanticEnvironmentConstructedRecord,
  LedgerRecordType as LedgerRecord,
  PackageVersionPublishedRecord,
  RegressionCaseCreatedRecord,
  RegressionRunCompletedRecord,
  SemanticPackageDraftCompiledRecord,
  SemanticPatchCandidatePublishedRecord,
  VocabularySourceImportedRecord,
} from '@harmony/semantic-model/schema/ledger-record'
import type {
  RegressionCase,
} from '@harmony/semantic-model/schema/regression'
import type {
  SemanticPatchCandidate,
} from '@harmony/semantic-model/schema/semantic-patch'
import { LedgerRecord as LedgerRecordSchema } from '@harmony/semantic-model/schema/ledger-record'
import { PackageCurrentView } from '@harmony/semantic-model/schema/workflow-result'
import { Context, Effect, Layer, Ref, Schema } from 'effect'

export class LedgerViewNotFound extends Schema.TaggedErrorClass<LedgerViewNotFound>()(
  'LedgerViewNotFound',
  {
    packageId: Schema.String,
  },
) {}

function unique<A>(items: ReadonlyArray<A>): Array<A> {
  return Array.from(new Set(items))
}

export function isPackageVersionPublishedRecord(record: LedgerRecord): record is PackageVersionPublishedRecord {
  return record.recordKind === 'PackageVersionPublished'
}

export function isVocabularySourceImportedRecord(record: LedgerRecord): record is VocabularySourceImportedRecord {
  return record.recordKind === 'VocabularySourceImported'
}

export function isSemanticPackageDraftCompiledRecord(record: LedgerRecord): record is SemanticPackageDraftCompiledRecord {
  return record.recordKind === 'SemanticPackageDraftCompiled'
}

export function isActiveEnvironmentConstructedRecord(
  record: LedgerRecord,
): record is ActiveSemanticEnvironmentConstructedRecord {
  return record.recordKind === 'ActiveSemanticEnvironmentConstructed'
}

export function isRegressionRunCompletedRecord(record: LedgerRecord): record is RegressionRunCompletedRecord {
  return record.recordKind === 'RegressionRunCompleted'
}

export function isRegressionCaseCreatedRecord(record: LedgerRecord): record is RegressionCaseCreatedRecord {
  return record.recordKind === 'RegressionCaseCreated'
}

export function isSemanticPatchCandidatePublishedRecord(
  record: LedgerRecord,
): record is SemanticPatchCandidatePublishedRecord {
  return record.recordKind === 'SemanticPatchCandidatePublished'
}

export function packageSourceIds(records: ReadonlyArray<LedgerRecord>, packageId: PackageId) {
  return unique(records.flatMap(record =>
    isSemanticPackageDraftCompiledRecord(record) && record.draft.packageId === packageId
      ? [record.draft.sourceId]
      : [],
  ))
}

export function packageLedgerRecordIds(records: ReadonlyArray<LedgerRecord>, packageId: PackageId) {
  const sourceIds = packageSourceIds(records, packageId)
  const packageVersionIds = records.flatMap(record =>
    isPackageVersionPublishedRecord(record) && record.packageVersion.packageId === packageId
      ? [record.packageVersion.id]
      : [],
  )

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
    if (isSemanticPatchCandidatePublishedRecord(record) && packageVersionIds.includes(record.packageVersionId)) {
      return [record.id]
    }
    return []
  }))
}

export function countPublishedVersions(records: ReadonlyArray<LedgerRecord>, packageId: PackageId): number {
  return records
    .filter(isPackageVersionPublishedRecord)
    .filter(record => record.packageVersion.packageId === packageId)
    .length
}

export const rebuildCurrentPackageView = Effect.fn('rebuildCurrentPackageView')(
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
    return new PackageCurrentView({
      packageId,
      currentVersionId: latest.packageVersion.id,
      publishedPackageId: latest.publishedPackage.id,
      packageVersion: latest.packageVersion,
      publishedPackage: latest.publishedPackage,
      sourceIds: packageSourceIds(records, packageId),
      ledgerRecordIds: packageLedgerRecordIds(records, packageId),
    })
  },
)

export function relevantRegressionCaseRecords(
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

export function latestRegressionRunRecordForCase(
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

export function publishedRecordForPatchCandidate(
  records: ReadonlyArray<LedgerRecord>,
  candidate: SemanticPatchCandidate,
) {
  return records
    .filter(isSemanticPatchCandidatePublishedRecord)
    .find(record => record.patchCandidate.id === candidate.id)
}

export function countRegressionRunsForCase(
  records: ReadonlyArray<LedgerRecord>,
  candidate: SemanticPatchCandidate,
  regressionCase: RegressionCase,
) {
  return records
    .filter(isRegressionRunCompletedRecord)
    .filter(record => record.regressionRun.patchCandidateId === candidate.id)
    .filter(record => record.regressionRun.regressionCaseId === regressionCase.id)
    .length
}

export class SemanticLedger extends Context.Service<SemanticLedger, {
  append: (record: LedgerRecord) => Effect.Effect<LedgerRecord, Schema.SchemaError>
  readonly records: Effect.Effect<ReadonlyArray<LedgerRecord>>
  currentPackageView: (packageId: PackageId) => Effect.Effect<PackageCurrentView, LedgerViewNotFound>
  countPublishedVersions: (packageId: PackageId) => Effect.Effect<number>
  relevantRegressionCaseRecords: (
    candidate: SemanticPatchCandidate,
    targetPackage: SemanticPackageRef,
  ) => Effect.Effect<ReadonlyArray<RegressionCaseCreatedRecord>>
  latestRegressionRunRecordForCase: (
    candidate: SemanticPatchCandidate,
    regressionCase: RegressionCase,
  ) => Effect.Effect<RegressionRunCompletedRecord | undefined>
  publishedRecordForPatchCandidate: (
    candidate: SemanticPatchCandidate,
  ) => Effect.Effect<SemanticPatchCandidatePublishedRecord | undefined>
  countRegressionRunsForCase: (
    candidate: SemanticPatchCandidate,
    regressionCase: RegressionCase,
  ) => Effect.Effect<number>
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

      const countPublishedVersionsForPackage = Effect.fn('SemanticLedger.countPublishedVersions')(
        function* (packageId: PackageId) {
          return countPublishedVersions(yield* records, packageId)
        },
      )

      const relevantRegressionCases = Effect.fn('SemanticLedger.relevantRegressionCaseRecords')(
        function* (candidate: SemanticPatchCandidate, targetPackage: SemanticPackageRef) {
          return relevantRegressionCaseRecords(yield* records, candidate, targetPackage)
        },
      )

      const latestRegressionRun = Effect.fn('SemanticLedger.latestRegressionRunRecordForCase')(
        function* (candidate: SemanticPatchCandidate, regressionCase: RegressionCase) {
          return latestRegressionRunRecordForCase(yield* records, candidate, regressionCase)
        },
      )

      const publishedRecord = Effect.fn('SemanticLedger.publishedRecordForPatchCandidate')(
        function* (candidate: SemanticPatchCandidate) {
          return publishedRecordForPatchCandidate(yield* records, candidate)
        },
      )

      const countRegressionRuns = Effect.fn('SemanticLedger.countRegressionRunsForCase')(
        function* (candidate: SemanticPatchCandidate, regressionCase: RegressionCase) {
          return countRegressionRunsForCase(yield* records, candidate, regressionCase)
        },
      )

      return SemanticLedger.of({
        append,
        records,
        currentPackageView,
        countPublishedVersions: countPublishedVersionsForPackage,
        relevantRegressionCaseRecords: relevantRegressionCases,
        latestRegressionRunRecordForCase: latestRegressionRun,
        publishedRecordForPatchCandidate: publishedRecord,
        countRegressionRunsForCase: countRegressionRuns,
      })
    }),
  )
}
