import type { SourceSpan, VocabularyInput } from '@harmony/semantic-model/schema/input'
import type { StructuredVocabularyManifest } from '@harmony/semantic-model/schema/vocabulary-manifest'
import type { LedgerViewNotFound } from './ledger.ts'
import { PackageId as PackageIdSchema } from '@harmony/semantic-model/schema/ids'
import { EvidenceRef, EvidenceSource } from '@harmony/semantic-model/schema/input'
import { PackageVersionPublishedRecord, SemanticPackageDraftCompiledRecord, VocabularySourceImportedRecord } from '@harmony/semantic-model/schema/ledger-record'
import { Concept, Definition, LexicalSense, PackageRelationAssertion, PackageVersion, PublishedSemanticPackage, RuntimeBindingIdentity, SemanticPackageDraft, Term } from '@harmony/semantic-model/schema/package'
import { PackagePublishResult, VocabularyCompileResult, VocabularyDraftPublicationSource } from '@harmony/semantic-model/schema/results'
import { StructuredVocabularyManifest as StructuredVocabularyManifestSchema } from '@harmony/semantic-model/schema/vocabulary-manifest'
import { CompileAndPublishResult } from '@harmony/semantic-model/schema/workflow-result'
import { Context, Effect, Layer, Schema } from 'effect'
import { compilerVersion, deterministicInstant, effectVersion, publisherVersion } from './constants.ts'
import { VocabularyCompileError } from './errors.ts'
import { SemanticLedger } from './ledger.ts'

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

function causeMessage(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause)
}

const parseStructuredManifest = Effect.fn('parseStructuredManifest')(
  function* (
    input: VocabularyInput,
  ): Effect.fn.Return<StructuredVocabularyManifest | undefined, VocabularyCompileError> {
    if (!input.content.trimStart().startsWith('{')) {
      return undefined
    }
    const parsed = yield* Effect.try({
      try: () => JSON.parse(input.content) as unknown,
      catch: cause =>
        new VocabularyCompileError({
          inputId: input.id,
          message: `Invalid structured Vocabulary Source JSON: ${causeMessage(cause)}`,
        }),
    })
    const manifest = yield* Schema.decodeUnknownEffect(StructuredVocabularyManifestSchema)(parsed).pipe(
      Effect.mapError(error =>
        new VocabularyCompileError({
          inputId: input.id,
          message: `Invalid structured Vocabulary Source manifest: ${error.message}`,
        })),
    )
    if (manifest.namespace !== input.namespace) {
      return yield* new VocabularyCompileError({
        inputId: input.id,
        message: `Structured Vocabulary Source namespace ${manifest.namespace} does not match input namespace ${input.namespace}.`,
      })
    }
    if (manifest.vocabularyKind !== input.vocabularyKind) {
      return yield* new VocabularyCompileError({
        inputId: input.id,
        message: `Structured Vocabulary Source kind ${manifest.vocabularyKind} does not match input kind ${input.vocabularyKind}.`,
      })
    }
    return manifest
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

function publishRelations(relations: ReadonlyArray<PackageRelationAssertion>): Array<PackageRelationAssertion> {
  return relations.map(relation =>
    new PackageRelationAssertion({
      ...relation,
      lifecycle: 'published',
    }))
}

const compileStructuredManifest = Effect.fn('compileStructuredManifest')(
  function* (
    input: VocabularyInput,
    manifest: StructuredVocabularyManifest,
  ): Effect.fn.Return<VocabularyCompileResult, VocabularyCompileError> {
    const namespace = input.namespace
    const packageId = Schema.decodeUnknownSync(PackageIdSchema)(`package:${namespace}`)
    const evidenceSpan = input.spans[0]
    if (evidenceSpan === undefined) {
      return yield* new VocabularyCompileError({
        inputId: input.id,
        message: 'Structured VocabularyInput must carry at least one source span.',
      })
    }
    const evidenceSource = new EvidenceSource({
      id: Schema.decodeUnknownSync(EvidenceSource.fields.id)(`evidence-source:${namespace}:vocabulary`),
      evidenceKind: 'vocabulary-source',
      inputRef: input.id,
      originalText: input.content,
      spans: input.spans,
      capturedAt: deterministicInstant,
    })
    const sourceEvidence = new EvidenceRef({
      sourceId: evidenceSource.id,
      spanId: evidenceSpan.id,
    })

    const terms: Array<Term> = []
    const lexicalSenses: Array<LexicalSense> = []
    const concepts: Array<Concept> = []
    const definitions: Array<Definition> = []
    const conceptIds = new Set(manifest.concepts.map(concept => concept.id))

    for (const conceptSource of manifest.concepts) {
      const conceptId = Schema.decodeUnknownSync(Concept.fields.id)(`concept:${conceptSource.id}`)
      const definitionId = Schema.decodeUnknownSync(Definition.fields.id)(`definition:${conceptSource.id}:primary`)
      const concept = new Concept({
        id: conceptId,
        artifactKind: 'concept',
        packageId,
        namespace,
        canonicalLabel: conceptSource.canonicalLabel,
        status: 'extracted',
        lifecycle: 'draft',
        authority: 'imported_source',
        evidenceRefs: [sourceEvidence],
      })
      const definition = new Definition({
        id: definitionId,
        artifactKind: 'definition',
        packageId,
        namespace,
        conceptId,
        text: conceptSource.definition,
        status: 'extracted',
        lifecycle: 'draft',
        authority: 'imported_source',
        evidenceRefs: [sourceEvidence],
      })
      concepts.push(concept)
      definitions.push(definition)

      for (const [senseIndex, lexicalSenseSource] of conceptSource.lexicalSenses.entries()) {
        const suffix = `sense-${senseIndex + 1}`
        const term = new Term({
          id: Schema.decodeUnknownSync(Term.fields.id)(`term:${conceptSource.id}:${suffix}`),
          artifactKind: 'term',
          packageId,
          namespace,
          label: lexicalSenseSource.term,
          status: 'extracted',
          lifecycle: 'draft',
          authority: 'imported_source',
          evidenceRefs: [sourceEvidence],
        })
        terms.push(term)
        lexicalSenses.push(new LexicalSense({
          id: Schema.decodeUnknownSync(LexicalSense.fields.id)(`lexical-sense:${conceptSource.id}:${suffix}`),
          artifactKind: 'lexical-sense',
          packageId,
          namespace,
          termId: term.id,
          conceptId,
          definitionId,
          status: 'extracted',
          lifecycle: 'draft',
          authority: 'imported_source',
          evidenceRefs: [sourceEvidence],
        }))
      }
    }

    const authoredRelations: Array<PackageRelationAssertion> = []
    for (const [relationIndex, relationSource] of manifest.relations.entries()) {
      if (!conceptIds.has(relationSource.subject) || !conceptIds.has(relationSource.object)) {
        return yield* new VocabularyCompileError({
          inputId: input.id,
          message: `Structured Vocabulary Source relation ${relationSource.subject} ${relationSource.predicate} ${relationSource.object} references an unknown concept.`,
        })
      }
      authoredRelations.push(new PackageRelationAssertion({
        id: Schema.decodeUnknownSync(PackageRelationAssertion.fields.id)(
          `relation-assertion:${namespace}:relation-${relationIndex + 1}`,
        ),
        artifactKind: 'package-relation-assertion',
        packageId,
        namespace,
        subjectConceptId: Schema.decodeUnknownSync(Concept.fields.id)(`concept:${relationSource.subject}`),
        predicate: relationSource.predicate,
        objectConceptId: Schema.decodeUnknownSync(Concept.fields.id)(`concept:${relationSource.object}`),
        status: 'extracted',
        lifecycle: 'draft',
        authority: 'imported_source',
        evidenceRefs: [sourceEvidence],
      }))
    }

    const draft = new SemanticPackageDraft({
      id: Schema.decodeUnknownSync(SemanticPackageDraft.fields.id)(`package-draft:${namespace}:vocabulary`),
      packageId,
      sourceId: evidenceSource.id,
      namespace,
      lifecycle: 'draft',
      artifacts: {
        terms,
        lexicalSenses,
        concepts,
        definitions,
      },
      authoredRelations,
      relationCandidates: [],
      constraintCandidates: [],
      createdAt: deterministicInstant,
    })

    return new VocabularyCompileResult({
      evidenceSource,
      draft,
    })
  },
)

export class VocabularyCompiler extends Context.Service<VocabularyCompiler, {
  compile: (input: VocabularyInput) => Effect.Effect<VocabularyCompileResult, VocabularyCompileError>
}>()('harmony/headless-runtime/VocabularyCompiler') {
  static readonly layerDeterministic = Layer.succeed(
    VocabularyCompiler,
    VocabularyCompiler.of({
      compile: Effect.fn('VocabularyCompiler.compile')(function* (input) {
        const structuredManifest = yield* parseStructuredManifest(input)
        if (structuredManifest !== undefined) {
          return yield* compileStructuredManifest(input, structuredManifest)
        }
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

export class PackagePublisher extends Context.Service<PackagePublisher, {
  publish: (draft: SemanticPackageDraft) => Effect.Effect<PackagePublishResult>
}>()('harmony/headless-runtime/PackagePublisher') {
  static readonly layerDeterministic = Layer.effect(
    PackagePublisher,
    Effect.gen(function* () {
      const ledger = yield* SemanticLedger
      const publish = Effect.fn('PackagePublisher.publish')(function* (draft: SemanticPackageDraft) {
        const nextVersion = (yield* ledger.countPublishedVersions(draft.packageId)) + 1
        const version = `v${nextVersion}`
        const publishedPackage = new PublishedSemanticPackage({
          id: Schema.decodeUnknownSync(PublishedSemanticPackage.fields.id)(
            `published-package:${draft.namespace}:${version}`,
          ),
          packageId: draft.packageId,
          namespace: draft.namespace,
          lifecycle: 'published',
          artifacts: publishArtifacts(draft.artifacts),
          authoritativeRelations: publishRelations(draft.authoredRelations ?? []),
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
            publicationSource: new VocabularyDraftPublicationSource({
              sourceKind: 'vocabulary_draft',
              sourceDraftId: compileResult.draft.id,
              sourceIds: [compileResult.evidenceSource.id],
            }),
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
