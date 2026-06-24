import type {
  ActiveEnvironmentBuildRequest,
  LedgerRecordType as LedgerRecord,
  PackageIdType as PackageId,
  PromptInput,
  RequestDecisionType as RequestDecision,
  SemanticInputIdType as SemanticInputId,
  SourceSpan,
  VocabularyInput,
} from '@harmony/semantic-model'
import {
  ActiveEnvironmentBuildResult,
  ActiveEnvironmentProvenance,
  ActiveSemanticEnvironment,
  ActiveSemanticEnvironmentConstructedRecord,
  ClarificationDecision,
  ClarificationOption,
  ClarificationSemanticDifference,
  CompetingInterpretation,
  CompileAndPublishResult,
  Concept,
  Definition,
  EnvironmentSemanticBinding,
  EvidenceRef,
  EvidenceSource,
  LedgerRecord as LedgerRecordSchema,
  LexicalSense,
  PackageActivation,
  PackageCurrentView,
  PackageId as PackageIdSchema,
  PackagePublishResult,
  PackageVersion,
  PackageVersionPublishedRecord,
  ProhibitedAction,
  PromptClarificationWorkflowResult,
  PromptEvidenceSource,
  PromptInputCapturedRecord,
  PromptParseResult,
  PublishedSemanticPackage,
  RequestDecision as RequestDecisionSchema,
  RequestFrame,
  RequestTarget,
  RuntimeBindingIdentity,
  SemanticIr,
  SemanticIrProducedRecord,
  SemanticKernelIdentity,
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
const activeEnvironmentBuilderVersion = 'deterministic-active-environment-builder@0.1.0'
const promptParserVersion = 'deterministic-prompt-parser@0.1.0'
const promptDecisionVersion = 'deterministic-request-decision@0.1.0'

export const defaultSemanticKernelIdentity = new SemanticKernelIdentity({
  id: Schema.decodeUnknownSync(SemanticKernelIdentity.fields.id)('semantic-kernel:harmony-v1'),
  protocolVersion: 'semantic-kernel.v1',
  version: 'harmony-semantic-kernel@0.1.0',
})

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

export class PromptParseError extends Schema.TaggedErrorClass<PromptParseError>()(
  'PromptParseError',
  {
    inputId: Schema.String,
    message: Schema.String,
  },
) {}

export class RequestDecisionUnsupported extends Schema.TaggedErrorClass<RequestDecisionUnsupported>()(
  'RequestDecisionUnsupported',
  {
    irId: Schema.String,
    message: Schema.String,
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

const findPromptSpan = Effect.fn('findPromptSpan')(
  function* (input: PromptInput, text: string, label: string): Effect.fn.Return<SourceSpan, PromptParseError> {
    const exact = input.spans.find(span => span.text === text)
    if (exact !== undefined) {
      return exact
    }
    return yield* new PromptParseError({
      inputId: input.id,
      message: `Deterministic prompt fixture is missing ${label} span "${text}".`,
    })
  },
)

const firstPromptTargetRef = Effect.fn('firstPromptTargetRef')(
  function* (input: PromptInput): Effect.fn.Return<SemanticInputId, PromptParseError> {
    const targetRef = input.targetRefs[0]
    if (targetRef === undefined) {
      return yield* new PromptParseError({
        inputId: input.id,
        message: 'PromptInput must include a target document reference.',
      })
    }
    return targetRef
  },
)

function evidenceRef(source: PromptEvidenceSource, span: SourceSpan) {
  return new EvidenceRef({
    sourceId: source.id,
    spanId: span.id,
  })
}

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

function isSemanticPackageDraftCompiledRecord(record: LedgerRecord): record is SemanticPackageDraftCompiledRecord {
  return record.recordKind === 'SemanticPackageDraftCompiled'
}

function unique<A>(items: ReadonlyArray<A>): Array<A> {
  return Array.from(new Set(items))
}

function uniqueEvidenceRefs(items: ReadonlyArray<EvidenceRef>): Array<EvidenceRef> {
  const seen = new Set<string>()
  return items.filter((item) => {
    const key = `${item.sourceId}:${item.spanId}`
    if (seen.has(key)) {
      return false
    }
    seen.add(key)
    return true
  })
}

function packageSourceIds(records: ReadonlyArray<LedgerRecord>, packageId: PackageId) {
  return unique(records.flatMap(record =>
    isSemanticPackageDraftCompiledRecord(record) && record.draft.packageId === packageId
      ? [record.draft.sourceId]
      : [],
  ))
}

function packageLedgerRecordIds(records: ReadonlyArray<LedgerRecord>, packageId: PackageId) {
  const sourceIds = packageSourceIds(records, packageId)
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
    return []
  }))
}

function packageActivationFromView(
  records: ReadonlyArray<LedgerRecord>,
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
    sourceIds: packageSourceIds(records, view.packageId),
    ledgerRecordIds: packageLedgerRecordIds(records, view.packageId),
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

export class SemanticKernel extends Context.Service<SemanticKernel, {
  readonly identity: SemanticKernelIdentity
}>()('harmony/headless-runtime/SemanticKernel') {
  static layerFromIdentity(identity: SemanticKernelIdentity) {
    return Layer.succeed(
      SemanticKernel,
      SemanticKernel.of({ identity }),
    )
  }

  static readonly layerDefault = this.layerFromIdentity(defaultSemanticKernelIdentity)
}

export class BaseSemanticLayer extends Context.Service<BaseSemanticLayer, {
  readonly packageId: PackageId
}>()('harmony/headless-runtime/BaseSemanticLayer') {
  static layerFromPackageId(packageId: PackageId) {
    return Layer.succeed(
      BaseSemanticLayer,
      BaseSemanticLayer.of({ packageId }),
    )
  }
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
          const recordsBeforeBuild = yield* ledger.records
          const baseView = yield* ledger.currentPackageView(baseLayer.packageId)
          const requestedDomainPackageIds = unique(request.enabledDomainPackageIds)
          const domainViews = yield* Effect.forEach(
            requestedDomainPackageIds,
            packageId => ledger.currentPackageView(packageId),
          )

          const baseActivation = packageActivationFromView(
            recordsBeforeBuild,
            baseView,
            'base',
            'default_base_layer',
          )
          const domainActivations = domainViews.map(view =>
            packageActivationFromView(
              recordsBeforeBuild,
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

export class SemanticParser extends Context.Service<SemanticParser, {
  parsePrompt: (
    input: PromptInput,
    environment: ActiveSemanticEnvironment,
  ) => Effect.Effect<PromptParseResult, PromptParseError | Schema.SchemaError>
}>()('harmony/headless-runtime/SemanticParser') {
  static readonly layerDeterministic = Layer.succeed(
    SemanticParser,
    SemanticParser.of({
      parsePrompt: Effect.fn('SemanticParser.parsePrompt')(function* (input, environment) {
        const actionSpan = yield* findPromptSpan(input, 'check', 'action cue')
        const targetSpan = yield* findPromptSpan(input, 'this document', 'target cue')
        const prohibitedSpan = yield* findPromptSpan(input, 'do not edit it', 'prohibited action cue')
        const targetRef = yield* firstPromptTargetRef(input)
        const evidenceSource = new PromptEvidenceSource({
          id: Schema.decodeUnknownSync(PromptEvidenceSource.fields.id)(
            `evidence-source:${input.id}:${promptParserVersion}`,
          ),
          evidenceKind: 'prompt-source',
          inputRef: input.id,
          originalText: input.content,
          spans: input.spans,
          capturedAt: deterministicInstant,
        })
        const actionEvidence = evidenceRef(evidenceSource, actionSpan)
        const targetEvidence = evidenceRef(evidenceSource, targetSpan)
        const prohibitedEvidence = evidenceRef(evidenceSource, prohibitedSpan)
        const target = new RequestTarget({
          targetKind: 'referenced_document',
          targetRef,
          evidenceRefs: [targetEvidence],
        })
        const prohibitedRewrite = new ProhibitedAction({
          action: 'rewrite',
          evidenceRefs: [prohibitedEvidence],
        })
        const validateFrame = new RequestFrame({
          id: Schema.decodeUnknownSync(RequestFrame.fields.id)(`request-frame:${input.id}:validate`),
          frameKind: 'request',
          action: 'validate',
          target,
          prohibitedActions: [prohibitedRewrite],
          actionEvidenceRefs: [actionEvidence],
          targetEvidenceRefs: [targetEvidence],
          prohibitedActionEvidenceRefs: [prohibitedEvidence],
        })
        const rewriteFrame = new RequestFrame({
          id: Schema.decodeUnknownSync(RequestFrame.fields.id)(`request-frame:${input.id}:rewrite`),
          frameKind: 'request',
          action: 'rewrite',
          target,
          prohibitedActions: [prohibitedRewrite],
          actionEvidenceRefs: [actionEvidence],
          targetEvidenceRefs: [targetEvidence],
          prohibitedActionEvidenceRefs: [prohibitedEvidence],
        })
        const validateInterpretation = new CompetingInterpretation({
          id: Schema.decodeUnknownSync(CompetingInterpretation.fields.id)(
            `competing-interpretation:${input.id}:validate`,
          ),
          interpretationKind: 'request-frame',
          frameId: validateFrame.id,
          action: 'validate',
          behavior: 'review_without_modifying',
          summary: 'Interpret "check" as validate/review the referenced document without modifying it.',
          evidenceRefs: [actionEvidence, targetEvidence, prohibitedEvidence],
        })
        const rewriteInterpretation = new CompetingInterpretation({
          id: Schema.decodeUnknownSync(CompetingInterpretation.fields.id)(
            `competing-interpretation:${input.id}:rewrite`,
          ),
          interpretationKind: 'request-frame',
          frameId: rewriteFrame.id,
          action: 'rewrite',
          behavior: 'modify_target_content',
          summary: 'Interpret "check" as rewrite/modify the referenced document, which conflicts with the prohibition.',
          evidenceRefs: [actionEvidence, targetEvidence, prohibitedEvidence],
        })
        const semanticIr = new SemanticIr({
          id: Schema.decodeUnknownSync(SemanticIr.fields.id)(`semantic-ir:${input.id}:${environment.id}`),
          artifactKind: 'semantic-ir',
          inputKind: 'prompt',
          inputRef: input.id,
          environmentRef: environment.id,
          frameInstances: [validateFrame, rewriteFrame],
          competingInterpretations: [validateInterpretation, rewriteInterpretation],
          unresolvedSpans: [],
          evidenceRefs: [actionEvidence, targetEvidence, prohibitedEvidence],
          decisionState: 'requires_clarification',
        })
        const result = new PromptParseResult({
          evidenceSource,
          semanticIr,
        })

        return yield* Schema.decodeUnknownEffect(PromptParseResult)(result)
      }),
    }),
  )
}

export class RequestDecisionEngine extends Context.Service<RequestDecisionEngine, {
  decideRequest: (
    semanticIr: SemanticIr,
  ) => Effect.Effect<RequestDecision, RequestDecisionUnsupported | Schema.SchemaError>
}>()('harmony/headless-runtime/RequestDecisionEngine') {
  static readonly layer = Layer.succeed(
    RequestDecisionEngine,
    RequestDecisionEngine.of({
      decideRequest: Effect.fn('RequestDecisionEngine.decideRequest')(function* (semanticIr) {
        const requestFrames = semanticIr.frameInstances.filter(frame => frame.frameKind === 'request')
        const hasValidate = requestFrames.some(frame => frame.action === 'validate')
        const hasRewrite = requestFrames.some(frame => frame.action === 'rewrite')
        const rewriteProhibited = requestFrames.some(frame =>
          frame.prohibitedActions.some(action => action.action === 'rewrite'),
        )

        if (!hasValidate || !hasRewrite || !rewriteProhibited) {
          return yield* new RequestDecisionUnsupported({
            irId: semanticIr.id,
            message: 'Expected competing validate and rewrite request frames with rewrite prohibited.',
          })
        }

        const interpretations = semanticIr.competingInterpretations.filter(interpretation =>
          requestFrames.some(frame => frame.id === interpretation.frameId),
        )
        if (interpretations.length < 2) {
          return yield* new RequestDecisionUnsupported({
            irId: semanticIr.id,
            message: 'Expected at least two competing request interpretations.',
          })
        }

        const prohibitedActionEvidenceRefs = uniqueEvidenceRefs(
          requestFrames.flatMap(frame => frame.prohibitedActionEvidenceRefs),
        )
        const evidenceRefs = uniqueEvidenceRefs([
          ...semanticIr.evidenceRefs,
          ...interpretations.flatMap(interpretation => interpretation.evidenceRefs),
        ])
        const decision = new ClarificationDecision({
          id: Schema.decodeUnknownSync(ClarificationDecision.fields.id)(
            `clarification-decision:${semanticIr.id}:${promptDecisionVersion}`,
          ),
          decisionKind: 'clarify',
          reason: 'behavior_changing_action_ambiguity',
          irId: semanticIr.id,
          promptInputRef: semanticIr.inputRef,
          competingInterpretationIds: interpretations.map(interpretation => interpretation.id),
          semanticDifference: new ClarificationSemanticDifference({
            differenceKind: 'request_action',
            options: interpretations.map(interpretation =>
              new ClarificationOption({
                interpretationId: interpretation.id,
                frameId: interpretation.frameId,
                action: interpretation.action,
                behavior: interpretation.behavior,
                outcome: interpretation.action === 'validate'
                  ? 'Review or validate the target document without changing its content.'
                  : 'Rewrite or modify the target document content.',
              })),
            prohibitedActionEvidenceRefs,
          }),
          requiredUserResolution:
            'Choose whether "check" means validate/review only, or whether rewrite/modify is authorized despite the prohibition.',
          evidenceRefs,
        })

        return yield* Schema.decodeUnknownEffect(RequestDecisionSchema)(decision)
      }),
    }),
  )
}

export class PromptClarificationWorkflow extends Context.Service<PromptClarificationWorkflow, {
  clarifyPrompt: (
    input: PromptInput,
    environment: ActiveSemanticEnvironment,
  ) => Effect.Effect<
    PromptClarificationWorkflowResult,
    PromptParseError | RequestDecisionUnsupported | Schema.SchemaError
  >
}>()('harmony/headless-runtime/PromptClarificationWorkflow') {
  static readonly layer = Layer.effect(
    PromptClarificationWorkflow,
    Effect.gen(function* () {
      const parser = yield* SemanticParser
      const decisionEngine = yield* RequestDecisionEngine
      const ledger = yield* SemanticLedger

      const clarifyPrompt = Effect.fn('PromptClarificationWorkflow.clarifyPrompt')(
        function* (input: PromptInput, environment: ActiveSemanticEnvironment) {
          const parseResult = yield* parser.parsePrompt(input, environment)
          const decision = yield* decisionEngine.decideRequest(parseResult.semanticIr)
          const recordsBeforeCapture = yield* ledger.records
          const promptRecord = new PromptInputCapturedRecord({
            id: Schema.decodeUnknownSync(PromptInputCapturedRecord.fields.id)(
              `ledger-record:${input.id}:${recordsBeforeCapture.length + 1}-prompt-captured`,
            ),
            recordKind: 'PromptInputCaptured',
            recordedAt: deterministicInstant,
            source: parseResult.evidenceSource,
          })

          yield* ledger.append(promptRecord)

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

          const result = new PromptClarificationWorkflowResult({
            evidenceSource: parseResult.evidenceSource,
            semanticIr: parseResult.semanticIr,
            decision,
            ledgerRecords: yield* ledger.records,
          })

          return yield* Schema.decodeUnknownEffect(PromptClarificationWorkflowResult)(result)
        },
      )

      return PromptClarificationWorkflow.of({ clarifyPrompt })
    }),
  )
}

export function layerInMemoryWithActiveEnvironment(
  basePackageId: PackageId,
  kernelIdentity: SemanticKernelIdentity = defaultSemanticKernelIdentity,
) {
  return ActiveEnvironmentBuilder.layer.pipe(
    Layer.provide(SemanticKernel.layerFromIdentity(kernelIdentity)),
    Layer.provide(BaseSemanticLayer.layerFromPackageId(basePackageId)),
    Layer.provideMerge(layerInMemory),
  )
}

export function layerInMemoryWithPromptClarification(
  basePackageId: PackageId,
  kernelIdentity: SemanticKernelIdentity = defaultSemanticKernelIdentity,
) {
  return PromptClarificationWorkflow.layer.pipe(
    Layer.provide(RequestDecisionEngine.layer),
    Layer.provide(SemanticParser.layerDeterministic),
    Layer.provideMerge(layerInMemoryWithActiveEnvironment(basePackageId, kernelIdentity)),
  )
}
