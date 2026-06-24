import type {
  LedgerRecordType as LedgerRecord,
  PackageIdType as PackageId,
  SourceSpan,
  VocabularyInput,
} from '@harmony/semantic-model'
import {
  CompileAndPublishResult,
  Concept,
  Definition,
  EvidenceRef,
  EvidenceSource,
  LedgerRecord as LedgerRecordSchema,
  LexicalSense,
  PackageCurrentView,
  PackageId as PackageIdSchema,
  PackagePublishResult,
  PackageVersion,
  PackageVersionPublishedRecord,
  PublishedSemanticPackage,
  RuntimeBindingIdentity,
  SemanticPackageDraft,
  SemanticPackageDraftCompiledRecord,
  Term,
  VocabularyCompileResult,
  VocabularySourceImportedRecord,
} from '@harmony/semantic-model'
import { Context, Effect, Layer, Ref, Schema } from 'effect'

const deterministicInstant = '2026-06-24T00:00:00.000Z'
const compilerVersion = 'deterministic-glossary-compiler@0.1.0'
const publisherVersion = 'deterministic-package-publisher@0.1.0'
const effectVersion = 'effect@4.0.0-beta.83'

export class VocabularyCompileError extends Schema.TaggedErrorClass<VocabularyCompileError>()(
  'VocabularyCompileError',
  {
    inputId: Schema.String,
    message: Schema.String,
  },
) {}

export class LedgerViewNotFound extends Schema.TaggedErrorClass<LedgerViewNotFound>()(
  'LedgerViewNotFound',
  {
    packageId: Schema.String,
  },
) {}

const parseSingleGlossaryEntry = Effect.fn('parseSingleGlossaryEntry')(
  function* (input: VocabularyInput): Effect.fn.Return<
    { readonly term: string, readonly definition: string },
    VocabularyCompileError
  > {
    const separatorIndex = input.content.search(/[：:]/)
    if (separatorIndex <= 0) {
      return yield* new VocabularyCompileError({
        inputId: input.id,
        message: 'Expected one glossary entry in the form "term: definition".',
      })
    }
    const term = input.content.slice(0, separatorIndex).trim()
    const definition = input.content.slice(separatorIndex + 1).trim()
    if (term.length === 0 || definition.length === 0) {
      return yield* new VocabularyCompileError({
        inputId: input.id,
        message: 'Glossary entry term and definition must both be non-empty.',
      })
    }
    return { term, definition }
  },
)

const findSpan = Effect.fn('findSpan')(
  function* (input: VocabularyInput, text: string): Effect.fn.Return<SourceSpan, VocabularyCompileError> {
    const exact = input.spans.find(span => span.text === text)
    if (exact !== undefined) {
      return exact
    }
    const first = input.spans[0]
    if (first === undefined) {
      return yield* new VocabularyCompileError({
        inputId: input.id,
        message: 'VocabularyInput must carry at least one source span.',
      })
    }
    return first
  },
)

function publishArtifacts(artifacts: SemanticPackageDraft['artifacts']): SemanticPackageDraft['artifacts'] {
  return {
    terms: artifacts.terms.map(term =>
      new Term({
        ...term,
        lifecycle: 'published',
      })),
    lexicalSenses: artifacts.lexicalSenses.map(sense =>
      new LexicalSense({
        ...sense,
        lifecycle: 'published',
      })),
    concepts: artifacts.concepts.map(concept =>
      new Concept({
        ...concept,
        lifecycle: 'published',
      })),
    definitions: artifacts.definitions.map(definition =>
      new Definition({
        ...definition,
        lifecycle: 'published',
      })),
  }
}

function countPublishedVersions(records: ReadonlyArray<LedgerRecord>, packageId: PackageId): number {
  return records
    .filter(isPackageVersionPublishedRecord)
    .filter(record => record.packageVersion.packageId === packageId)
    .length
}

const rebuildCurrentPackageView = Effect.fn('rebuildCurrentPackageView')(
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
    const sourceIds = records.flatMap(record => isVocabularySourceImportedRecord(record) ? [record.source.id] : [])
    return new PackageCurrentView({
      packageId,
      currentVersionId: latest.packageVersion.id,
      publishedPackageId: latest.publishedPackage.id,
      packageVersion: latest.packageVersion,
      publishedPackage: latest.publishedPackage,
      sourceIds,
      ledgerRecordIds: records.map(record => record.id),
    })
  },
)

function isPackageVersionPublishedRecord(record: LedgerRecord): record is PackageVersionPublishedRecord {
  return record.recordKind === 'PackageVersionPublished'
}

function isVocabularySourceImportedRecord(record: LedgerRecord): record is VocabularySourceImportedRecord {
  return record.recordKind === 'VocabularySourceImported'
}

export class VocabularyCompiler extends Context.Service<VocabularyCompiler, {
  compile: (input: VocabularyInput) => Effect.Effect<VocabularyCompileResult, VocabularyCompileError>
}>()('harmony/headless-runtime/VocabularyCompiler') {
  static readonly layerDeterministic = Layer.succeed(
    VocabularyCompiler,
    VocabularyCompiler.of({
      compile: Effect.fn('VocabularyCompiler.compile')(function* (input) {
        const parsed = yield* parseSingleGlossaryEntry(input)
        const namespace = input.namespace
        const packageId = Schema.decodeUnknownSync(PackageIdSchema)(`package:${namespace}`)
        const evidenceSource = new EvidenceSource({
          id: Schema.decodeUnknownSync(EvidenceSource.fields.id)(`evidence-source:${namespace}:vocabulary`),
          evidenceKind: 'vocabulary-source',
          inputRef: input.id,
          originalText: input.content,
          spans: input.spans,
          capturedAt: deterministicInstant,
        })
        const termSpan = yield* findSpan(input, parsed.term)
        const definitionSpan = yield* findSpan(input, parsed.definition)
        const termEvidence = new EvidenceRef({
          sourceId: evidenceSource.id,
          spanId: termSpan.id,
        })
        const definitionEvidence = new EvidenceRef({
          sourceId: evidenceSource.id,
          spanId: definitionSpan.id,
        })
        const entrySuffix = 'entry-1'
        const term = new Term({
          id: Schema.decodeUnknownSync(Term.fields.id)(`term:${namespace}:${entrySuffix}`),
          artifactKind: 'term',
          packageId,
          namespace,
          label: parsed.term,
          status: 'extracted',
          lifecycle: 'draft',
          authority: 'imported_source',
          evidenceRefs: [termEvidence],
        })
        const concept = new Concept({
          id: Schema.decodeUnknownSync(Concept.fields.id)(`concept:${namespace}:${entrySuffix}`),
          artifactKind: 'concept',
          packageId,
          namespace,
          canonicalLabel: parsed.term,
          status: 'extracted',
          lifecycle: 'draft',
          authority: 'imported_source',
          evidenceRefs: [termEvidence, definitionEvidence],
        })
        const definition = new Definition({
          id: Schema.decodeUnknownSync(Definition.fields.id)(`definition:${namespace}:${entrySuffix}`),
          artifactKind: 'definition',
          packageId,
          namespace,
          conceptId: concept.id,
          text: parsed.definition,
          status: 'extracted',
          lifecycle: 'draft',
          authority: 'imported_source',
          evidenceRefs: [definitionEvidence],
        })
        const lexicalSense = new LexicalSense({
          id: Schema.decodeUnknownSync(LexicalSense.fields.id)(`lexical-sense:${namespace}:${entrySuffix}`),
          artifactKind: 'lexical-sense',
          packageId,
          namespace,
          termId: term.id,
          conceptId: concept.id,
          definitionId: definition.id,
          status: 'extracted',
          lifecycle: 'draft',
          authority: 'imported_source',
          evidenceRefs: [termEvidence, definitionEvidence],
        })
        const draft = new SemanticPackageDraft({
          id: Schema.decodeUnknownSync(SemanticPackageDraft.fields.id)(`package-draft:${namespace}:vocabulary`),
          packageId,
          sourceId: evidenceSource.id,
          namespace,
          lifecycle: 'draft',
          artifacts: {
            terms: [term],
            lexicalSenses: [lexicalSense],
            concepts: [concept],
            definitions: [definition],
          },
          relationCandidates: [],
          constraintCandidates: [],
          createdAt: deterministicInstant,
        })

        return new VocabularyCompileResult({
          evidenceSource,
          draft,
        })
      }),
    }),
  )
}

export class SemanticLedger extends Context.Service<SemanticLedger, {
  append: (record: LedgerRecord) => Effect.Effect<LedgerRecord, Schema.SchemaError>
  readonly records: Effect.Effect<ReadonlyArray<LedgerRecord>>
  currentPackageView: (packageId: PackageId) => Effect.Effect<PackageCurrentView, LedgerViewNotFound>
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

      return SemanticLedger.of({
        append,
        records,
        currentPackageView,
      })
    }),
  )
}

export class PackagePublisher extends Context.Service<PackagePublisher, {
  publish: (draft: SemanticPackageDraft) => Effect.Effect<PackagePublishResult>
}>()('harmony/headless-runtime/PackagePublisher') {
  static readonly layerDeterministic = Layer.effect(
    PackagePublisher,
    Effect.gen(function* () {
      const ledger = yield* SemanticLedger
      const publish = Effect.fn('PackagePublisher.publish')(function* (draft: SemanticPackageDraft) {
        const existingRecords = yield* ledger.records
        const nextVersion = countPublishedVersions(existingRecords, draft.packageId) + 1
        const version = `v${nextVersion}`
        const publishedPackage = new PublishedSemanticPackage({
          id: Schema.decodeUnknownSync(PublishedSemanticPackage.fields.id)(
            `published-package:${draft.namespace}:${version}`,
          ),
          packageId: draft.packageId,
          namespace: draft.namespace,
          lifecycle: 'published',
          artifacts: publishArtifacts(draft.artifacts),
          authoritativeRelations: [],
          authoritativeConstraints: [],
          publishedAt: deterministicInstant,
        })
        const packageVersion = new PackageVersion({
          id: Schema.decodeUnknownSync(PackageVersion.fields.id)(`package-version:${draft.namespace}:${version}`),
          packageId: draft.packageId,
          version,
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
        return new PackagePublishResult({
          publishedPackage,
          packageVersion,
        })
      })

      return PackagePublisher.of({ publish })
    }),
  )
}

export class GlossaryPackageWorkflow extends Context.Service<GlossaryPackageWorkflow, {
  compileAndPublish: (input: VocabularyInput) => Effect.Effect<
    CompileAndPublishResult,
    VocabularyCompileError | LedgerViewNotFound | Schema.SchemaError
  >
}>()('harmony/headless-runtime/GlossaryPackageWorkflow') {
  static readonly layer = Layer.effect(
    GlossaryPackageWorkflow,
    Effect.gen(function* () {
      const compiler = yield* VocabularyCompiler
      const publisher = yield* PackagePublisher
      const ledger = yield* SemanticLedger

      const compileAndPublish = Effect.fn('GlossaryPackageWorkflow.compileAndPublish')(
        function* (input: VocabularyInput) {
          const compileResult = yield* compiler.compile(input)
          const beforeImport = yield* ledger.records
          const importRecord = new VocabularySourceImportedRecord({
            id: Schema.decodeUnknownSync(VocabularySourceImportedRecord.fields.id)(
              `ledger-record:${input.namespace}:${beforeImport.length + 1}-source-imported`,
            ),
            recordKind: 'VocabularySourceImported',
            recordedAt: deterministicInstant,
            source: compileResult.evidenceSource,
          })
          const beforeDraft = beforeImport.length + 1
          const draftRecord = new SemanticPackageDraftCompiledRecord({
            id: Schema.decodeUnknownSync(SemanticPackageDraftCompiledRecord.fields.id)(
              `ledger-record:${input.namespace}:${beforeDraft + 1}-draft-compiled`,
            ),
            recordKind: 'SemanticPackageDraftCompiled',
            recordedAt: deterministicInstant,
            draft: compileResult.draft,
          })

          yield* ledger.append(importRecord)
          yield* ledger.append(draftRecord)

          const publishResult = yield* publisher.publish(compileResult.draft)
          const beforePublish = yield* ledger.records
          const publishRecord = new PackageVersionPublishedRecord({
            id: Schema.decodeUnknownSync(PackageVersionPublishedRecord.fields.id)(
              `ledger-record:${input.namespace}:${beforePublish.length + 1}-published-${publishResult.packageVersion.version}`,
            ),
            recordKind: 'PackageVersionPublished',
            recordedAt: deterministicInstant,
            publishedPackage: publishResult.publishedPackage,
            packageVersion: publishResult.packageVersion,
          })
          yield* ledger.append(publishRecord)

          const currentView = yield* ledger.currentPackageView(compileResult.draft.packageId)
          const ledgerRecords = yield* ledger.records

          return new CompileAndPublishResult({
            evidenceSource: compileResult.evidenceSource,
            draft: compileResult.draft,
            publishedPackage: publishResult.publishedPackage,
            packageVersion: publishResult.packageVersion,
            currentView,
            ledgerRecords,
          })
        },
      )

      return GlossaryPackageWorkflow.of({ compileAndPublish })
    }),
  ).pipe(
    Layer.provide(PackagePublisher.layerDeterministic),
    Layer.provide(VocabularyCompiler.layerDeterministic),
  )
}

export const layerInMemory = GlossaryPackageWorkflow.layer.pipe(
  Layer.provideMerge(SemanticLedger.layerInMemory),
)
