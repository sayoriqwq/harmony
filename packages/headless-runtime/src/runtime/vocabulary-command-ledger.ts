import type { EvidenceSource } from '@harmony/semantic-model/schema/input'
import type {
  LedgerRecordType,
  PackageVersionPublishedRecord as PackageVersionPublishedRecordType,
} from '@harmony/semantic-model/schema/ledger-record'
import type {
  SemanticPackageDraft,
} from '@harmony/semantic-model/schema/package'
import type {
  SemanticRuntimeCompileAndPublishVocabularyCommand,
  SemanticRuntimeCompileVocabularyDraftCommand,
} from '@harmony/semantic-model/schema/runtime-facade'
import type { PackageCurrentView } from '@harmony/semantic-model/schema/workflow-result'
import type { VocabularyCompileError } from './errors.ts'
import type { LedgerViewNotFound } from './ledger.ts'
import type { RuntimeDataAccessError } from './runtime-data-locator.ts'
import * as Fs from 'node:fs/promises'
import * as Path from 'node:path'
import {
  LedgerRecord as LedgerRecordSchema,
  PackageVersionPublishedRecord,
  SemanticPackageDraftCompiledRecord,
  VocabularySourceImportedRecord,
} from '@harmony/semantic-model/schema/ledger-record'
import {
  Concept,
  Definition,
  LexicalSense,
  PackageRelationAssertion,
  PackageVersion,
  PublishedSemanticPackage,
  RuntimeBindingIdentity,
  Term,
} from '@harmony/semantic-model/schema/package'
import { VocabularyDraftPublicationSource } from '@harmony/semantic-model/schema/results'
import { RuntimeDataLocatorRequest } from '@harmony/semantic-model/schema/runtime-data'
import {
  SemanticRuntimeCompileAndPublishVocabularyCommand as CompileAndPublishVocabularyCommandSchema,
  SemanticRuntimeCompileVocabularyDraftCommand as CompileVocabularyDraftCommandSchema,
} from '@harmony/semantic-model/schema/runtime-facade'
import { Context, Effect, Layer, Schema } from 'effect'
import { compilerVersion, deterministicInstant, effectVersion, publisherVersion } from './constants.ts'
import { VocabularyCompiler } from './glossary-package-workflow.ts'
import { countPublishedVersions, rebuildCurrentPackageView } from './ledger.ts'
import { RuntimeDataLocator } from './runtime-data-locator.ts'

export class VocabularyCommandLedgerError extends Schema.TaggedErrorClass<VocabularyCommandLedgerError>()(
  'VocabularyCommandLedgerError',
  {
    operation: Schema.Literals([
      'append-vocabulary-records',
      'read-vocabulary-records',
      'decode-vocabulary-record',
    ]),
    path: Schema.String,
    message: Schema.String,
  },
) {}

export interface VocabularyDraftCommit {
  readonly evidenceSource: EvidenceSource
  readonly draft: SemanticPackageDraft
  readonly records: ReadonlyArray<LedgerRecordType>
  readonly allRecords: ReadonlyArray<LedgerRecordType>
}

export interface VocabularyPublishCommit extends VocabularyDraftCommit {
  readonly publishedPackage: PublishedSemanticPackage
  readonly packageVersion: PackageVersion
  readonly currentView: PackageCurrentView
}

function causeMessage(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause)
}

function vocabularyLedgerPath(projectDataRoot: string) {
  return Path.join(projectDataRoot, 'vocabulary-ledger.jsonl')
}

function isNotFound(cause: unknown): boolean {
  return cause instanceof Error && 'code' in cause && cause.code === 'ENOENT'
}

function recordIds(records: ReadonlyArray<LedgerRecordType>) {
  return records.map(record => record.id)
}

function ledgerRecordId(namespace: string, sequence: number, suffix: string) {
  return `ledger-record:${namespace}:${sequence}-${suffix}`
}

function vocabularyRecordLines(records: ReadonlyArray<LedgerRecordType>) {
  return `${records.map(record => JSON.stringify(record)).join('\n')}\n`
}

function publishedArtifacts(draft: SemanticPackageDraft): PublishedSemanticPackage['artifacts'] {
  return {
    terms: draft.artifacts.terms.map(term =>
      new Term({
        ...term,
        lifecycle: 'published',
      })),
    lexicalSenses: draft.artifacts.lexicalSenses.map(sense =>
      new LexicalSense({
        ...sense,
        lifecycle: 'published',
      })),
    concepts: draft.artifacts.concepts.map(concept =>
      new Concept({
        ...concept,
        lifecycle: 'published',
      })),
    definitions: draft.artifacts.definitions.map(definition =>
      new Definition({
        ...definition,
        lifecycle: 'published',
      })),
  }
}

function publishedRelations(draft: SemanticPackageDraft): Array<PackageRelationAssertion> {
  return (draft.authoredRelations ?? []).map(relation =>
    new PackageRelationAssertion({
      ...relation,
      lifecycle: 'published',
    }))
}

function publishedRecordForDraft(
  draft: SemanticPackageDraft,
  sequence: number,
  versionNumber: number,
): PackageVersionPublishedRecordType {
  const version = `v${versionNumber}`
  const publishedPackage = new PublishedSemanticPackage({
    id: Schema.decodeUnknownSync(PublishedSemanticPackage.fields.id)(
      `published-package:${draft.namespace}:${version}`,
    ),
    packageId: draft.packageId,
    namespace: draft.namespace,
    lifecycle: 'published',
    artifacts: publishedArtifacts(draft),
    authoritativeRelations: publishedRelations(draft),
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

  return new PackageVersionPublishedRecord({
    id: Schema.decodeUnknownSync(PackageVersionPublishedRecord.fields.id)(
      ledgerRecordId(draft.namespace, sequence, `published-${version}`),
    ),
    recordKind: 'PackageVersionPublished',
    recordedAt: deterministicInstant,
    publishedPackage,
    packageVersion,
    publicationSource: new VocabularyDraftPublicationSource({
      sourceKind: 'vocabulary_draft',
      sourceDraftId: draft.id,
      sourceIds: [draft.sourceId],
    }),
  })
}

function draftRecords(
  command: SemanticRuntimeCompileVocabularyDraftCommand | SemanticRuntimeCompileAndPublishVocabularyCommand,
  draft: SemanticPackageDraft,
  evidenceSource: EvidenceSource,
  startSequence: number,
) {
  return [
    new VocabularySourceImportedRecord({
      id: Schema.decodeUnknownSync(VocabularySourceImportedRecord.fields.id)(
        ledgerRecordId(command.input.namespace, startSequence, 'source-imported'),
      ),
      recordKind: 'VocabularySourceImported',
      recordedAt: deterministicInstant,
      source: evidenceSource,
    }),
    new SemanticPackageDraftCompiledRecord({
      id: Schema.decodeUnknownSync(SemanticPackageDraftCompiledRecord.fields.id)(
        ledgerRecordId(command.input.namespace, startSequence + 1, 'draft-compiled'),
      ),
      recordKind: 'SemanticPackageDraftCompiled',
      recordedAt: deterministicInstant,
      draft,
    }),
  ] satisfies ReadonlyArray<LedgerRecordType>
}

export class VocabularyCommandLedger extends Context.Service<VocabularyCommandLedger, {
  compileDraft: (
    command: SemanticRuntimeCompileVocabularyDraftCommand,
  ) => Effect.Effect<
    VocabularyDraftCommit,
    VocabularyCommandLedgerError | RuntimeDataAccessError | VocabularyCompileError | Schema.SchemaError
  >
  compileAndPublish: (
    command: SemanticRuntimeCompileAndPublishVocabularyCommand,
  ) => Effect.Effect<
    VocabularyPublishCommit,
    | VocabularyCommandLedgerError
    | RuntimeDataAccessError
    | VocabularyCompileError
    | LedgerViewNotFound
    | Schema.SchemaError
  >
  records: (
    dataRoot: string,
    projectRef: SemanticRuntimeCompileVocabularyDraftCommand['projectRef'],
  ) => Effect.Effect<
    ReadonlyArray<LedgerRecordType>,
    VocabularyCommandLedgerError | RuntimeDataAccessError | Schema.SchemaError
  >
}>()('harmony/headless-runtime/VocabularyCommandLedger') {
  static readonly layerNoDeps = Layer.effect(
    VocabularyCommandLedger,
    Effect.gen(function* () {
      const locator = yield* RuntimeDataLocator
      const compiler = yield* VocabularyCompiler

      const records = Effect.fn('VocabularyCommandLedger.records')(
        function* (
          dataRoot: string,
          projectRef: SemanticRuntimeCompileVocabularyDraftCommand['projectRef'],
        ): Effect.fn.Return<
          ReadonlyArray<LedgerRecordType>,
          VocabularyCommandLedgerError | RuntimeDataAccessError | Schema.SchemaError
        > {
          const location = yield* locator.locate(new RuntimeDataLocatorRequest({ dataRoot, projectRef }))
          const ledgerPath = vocabularyLedgerPath(location.projectDataRoot)
          const text = yield* Effect.tryPromise({
            async try() {
              try {
                return await Fs.readFile(ledgerPath, 'utf8')
              }
              catch (cause) {
                if (isNotFound(cause)) {
                  return ''
                }
                throw cause
              }
            },
            catch: cause =>
              new VocabularyCommandLedgerError({
                operation: 'read-vocabulary-records',
                path: ledgerPath,
                message: causeMessage(cause),
              }),
          })
          const lines = text.split(/\r?\n/).filter(line => line.length > 0)
          const decodedRecords: Array<LedgerRecordType> = []

          for (const [lineIndex, line] of lines.entries()) {
            const parsed = yield* Effect.try({
              try: () => JSON.parse(line) as unknown,
              catch: cause =>
                new VocabularyCommandLedgerError({
                  operation: 'decode-vocabulary-record',
                  path: ledgerPath,
                  message: `Invalid JSON on line ${lineIndex + 1}: ${causeMessage(cause)}`,
                }),
            })
            decodedRecords.push(yield* Schema.decodeUnknownEffect(LedgerRecordSchema)(parsed))
          }

          return decodedRecords
        },
      )

      const appendRecords = Effect.fn('VocabularyCommandLedger.appendRecords')(
        function* (
          command: SemanticRuntimeCompileVocabularyDraftCommand | SemanticRuntimeCompileAndPublishVocabularyCommand,
          newRecords: ReadonlyArray<LedgerRecordType>,
        ): Effect.fn.Return<
          ReadonlyArray<LedgerRecordType>,
          VocabularyCommandLedgerError | RuntimeDataAccessError | Schema.SchemaError
        > {
          const encodedRecords: Array<LedgerRecordType> = []
          for (const record of newRecords) {
            encodedRecords.push(yield* Schema.decodeUnknownEffect(LedgerRecordSchema)(record))
          }
          const location = yield* locator.locate(new RuntimeDataLocatorRequest({
            dataRoot: command.dataRoot,
            projectRef: command.projectRef,
          }))
          const ledgerPath = vocabularyLedgerPath(location.projectDataRoot)
          yield* Effect.tryPromise({
            try: () => Fs.appendFile(ledgerPath, vocabularyRecordLines(encodedRecords), 'utf8'),
            catch: cause =>
              new VocabularyCommandLedgerError({
                operation: 'append-vocabulary-records',
                path: ledgerPath,
                message: causeMessage(cause),
              }),
          })

          return encodedRecords
        },
      )

      const compileDraft = Effect.fn('VocabularyCommandLedger.compileDraft')(
        function* (
          command: SemanticRuntimeCompileVocabularyDraftCommand,
        ): Effect.fn.Return<
          VocabularyDraftCommit,
          VocabularyCommandLedgerError | RuntimeDataAccessError | VocabularyCompileError | Schema.SchemaError
        > {
          const decoded = yield* Schema.decodeUnknownEffect(CompileVocabularyDraftCommandSchema)(command)
          const existingRecords = yield* records(decoded.dataRoot, decoded.projectRef)
          const compileResult = yield* compiler.compile(decoded.input)
          const newRecords = draftRecords(decoded, compileResult.draft, compileResult.evidenceSource, existingRecords.length + 1)
          const committedRecords = yield* appendRecords(decoded, newRecords)

          return {
            evidenceSource: compileResult.evidenceSource,
            draft: compileResult.draft,
            records: committedRecords,
            allRecords: [...existingRecords, ...committedRecords],
          }
        },
      )

      const compileAndPublish = Effect.fn('VocabularyCommandLedger.compileAndPublish')(
        function* (
          command: SemanticRuntimeCompileAndPublishVocabularyCommand,
        ): Effect.fn.Return<
          VocabularyPublishCommit,
          | VocabularyCommandLedgerError
          | RuntimeDataAccessError
          | VocabularyCompileError
          | LedgerViewNotFound
          | Schema.SchemaError
        > {
          const decoded = yield* Schema.decodeUnknownEffect(CompileAndPublishVocabularyCommandSchema)(command)
          const existingRecords = yield* records(decoded.dataRoot, decoded.projectRef)
          const compileResult = yield* compiler.compile(decoded.input)
          const versionNumber = countPublishedVersions(existingRecords, compileResult.draft.packageId) + 1
          const sourceAndDraftRecords = draftRecords(
            decoded,
            compileResult.draft,
            compileResult.evidenceSource,
            existingRecords.length + 1,
          )
          const publishRecord = publishedRecordForDraft(
            compileResult.draft,
            existingRecords.length + sourceAndDraftRecords.length + 1,
            versionNumber,
          )
          const committedRecords = yield* appendRecords(decoded, [...sourceAndDraftRecords, publishRecord])
          const allRecords = [...existingRecords, ...committedRecords]
          const currentView = yield* rebuildCurrentPackageView(allRecords, compileResult.draft.packageId)

          return {
            evidenceSource: compileResult.evidenceSource,
            draft: compileResult.draft,
            publishedPackage: publishRecord.publishedPackage,
            packageVersion: publishRecord.packageVersion,
            currentView,
            records: committedRecords,
            allRecords,
          }
        },
      )

      return VocabularyCommandLedger.of({
        compileDraft,
        compileAndPublish,
        records,
      })
    }),
  )

  static readonly layerLive = VocabularyCommandLedger.layerNoDeps.pipe(
    Layer.provide(VocabularyCompiler.layerDeterministic),
    Layer.provide(RuntimeDataLocator.layerLive),
  )
}

export const vocabularyRecordIds = recordIds
