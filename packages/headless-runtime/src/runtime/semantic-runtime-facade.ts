import type { VocabularyCompileError } from './errors.ts'
import type { LedgerViewNotFound } from './ledger.ts'
import { SourceSpanId, VocabularyInputId } from '@harmony/semantic-model/schema/ids'
import { SourceSpan, VocabularyInput } from '@harmony/semantic-model/schema/input'
import { PromptGateBlockDecision, PromptGateNoopDecision } from '@harmony/semantic-model/schema/prompt-gate'
import {
  ProjectRef,
  RuntimeDataProbeQuery,
} from '@harmony/semantic-model/schema/runtime-data'
import {
  SemanticRuntimeCompileAndPublishVocabularyCommand,
  SemanticRuntimeCompileAndPublishVocabularyResponse,
  SemanticRuntimeCompileVocabularyDraftCommand,
  SemanticRuntimeCompileVocabularyDraftResponse,
  SemanticRuntimeEvaluatePromptCommand,
  SemanticRuntimeEvaluatePromptResponse,
  SemanticRuntimeFoundCaseResult,
  SemanticRuntimeGetCaseQuery,
  SemanticRuntimeGetCaseResponse,
  SemanticRuntimeMissingCaseResult,
  SemanticRuntimeQueryError,
  SemanticRuntimeStatusQuery,
  SemanticRuntimeStatusResponse,
  SemanticRuntimeStatusResult,
  SemanticRuntimeToolMetadata,
  SemanticRuntimeVocabularyDraftCompiledResult,
  SemanticRuntimeVocabularyPublishedResult,
} from '@harmony/semantic-model/schema/runtime-facade'
import { Context, Effect, Layer, Schema } from 'effect'
import { healthyIntegrationHealth, ledgerUnavailableIntegrationHealth } from './integration-health.ts'
import { PromptGateLedger, PromptGateLedgerBusyError, PromptGateLedgerError } from './prompt-gate-ledger.ts'
import { RuntimeDataAccessError, RuntimeDataProbeLedger } from './runtime-data-locator.ts'
import { VocabularyCommandLedger, VocabularyCommandLedgerError, vocabularyRecordIds } from './vocabulary-command-ledger.ts'

export class McpProjectRefInput extends Schema.Class<McpProjectRefInput>(
  'harmony.headless-runtime/McpProjectRefInput',
)({
  project_id: Schema.NonEmptyString,
  canonical_root: Schema.NonEmptyString,
  worktree_id: Schema.optionalKey(Schema.NonEmptyString),
}) {}

export class McpSemanticStatusRequest extends Schema.Class<McpSemanticStatusRequest>(
  'harmony.headless-runtime/McpSemanticStatusRequest',
)({
  tool: Schema.Literal('semantic_status'),
  effect: Schema.Literal('query'),
  request_id: Schema.NonEmptyString,
  data_root: Schema.NonEmptyString,
  project_ref: McpProjectRefInput,
}) {}

export class McpSemanticGetCaseRequest extends Schema.Class<McpSemanticGetCaseRequest>(
  'harmony.headless-runtime/McpSemanticGetCaseRequest',
)({
  tool: Schema.Literal('semantic_get_case'),
  effect: Schema.Literal('query'),
  request_id: Schema.NonEmptyString,
  data_root: Schema.NonEmptyString,
  project_ref: McpProjectRefInput,
  case_id: Schema.NonEmptyString,
}) {}

export class McpVocabularySourceInput extends Schema.Class<McpVocabularySourceInput>(
  'harmony.headless-runtime/McpVocabularySourceInput',
)({
  namespace: Schema.NonEmptyString,
  vocabulary_kind: Schema.Literals(['base', 'domain']),
  content: Schema.NonEmptyString,
}) {}

export class McpSemanticCompileVocabularyDraftRequest extends Schema.Class<McpSemanticCompileVocabularyDraftRequest>(
  'harmony.headless-runtime/McpSemanticCompileVocabularyDraftRequest',
)({
  tool: Schema.Literal('semantic_compile_vocabulary_draft'),
  effect: Schema.Literal('evidence_command'),
  request_id: Schema.NonEmptyString,
  data_root: Schema.NonEmptyString,
  project_ref: McpProjectRefInput,
  operation_id: Schema.NonEmptyString,
  vocabulary_source: McpVocabularySourceInput,
}) {}

export class McpSemanticCompileAndPublishVocabularyRequest extends Schema.Class<McpSemanticCompileAndPublishVocabularyRequest>(
  'harmony.headless-runtime/McpSemanticCompileAndPublishVocabularyRequest',
)({
  tool: Schema.Literal('semantic_compile_and_publish_vocabulary'),
  effect: Schema.Literal('authority_command'),
  request_id: Schema.NonEmptyString,
  data_root: Schema.NonEmptyString,
  project_ref: McpProjectRefInput,
  operation_id: Schema.NonEmptyString,
  vocabulary_source: McpVocabularySourceInput,
}) {}

function sourceRecordIds(records: ReadonlyArray<{ readonly recordId: string }>) {
  return records.map(record => record.recordId)
}

function runtimeLedgerIds(records: ReadonlyArray<{ readonly id: string }>) {
  return records.map(record => record.id)
}

function projectRefFromMcp(input: McpProjectRefInput) {
  return new ProjectRef({
    projectId: input.project_id,
    canonicalRoot: input.canonical_root,
    ...(input.worktree_id !== undefined ? { worktreeId: input.worktree_id } : {}),
  })
}

function storageUnavailableError(requestId: string, error: RuntimeDataAccessError | PromptGateLedgerError | VocabularyCommandLedgerError) {
  return new SemanticRuntimeQueryError({
    reason: 'storage_unavailable',
    requestId,
    message: error.message,
  })
}

function ledgerBusyError(requestId: string, error: PromptGateLedgerBusyError) {
  return new SemanticRuntimeQueryError({
    reason: 'ledger_busy',
    requestId,
    message: error.message,
  })
}

function toProbeRuntimeError(
  requestId: string,
  error: RuntimeDataAccessError | Schema.SchemaError,
) {
  if (error instanceof RuntimeDataAccessError) {
    return storageUnavailableError(requestId, error)
  }

  return error
}

function toPromptRuntimeError(
  requestId: string,
  error: RuntimeDataAccessError | PromptGateLedgerBusyError | PromptGateLedgerError | Schema.SchemaError,
) {
  if (error instanceof PromptGateLedgerBusyError) {
    return ledgerBusyError(requestId, error)
  }
  if (error instanceof RuntimeDataAccessError || error instanceof PromptGateLedgerError) {
    return storageUnavailableError(requestId, error)
  }

  return error
}

function toVocabularyReadRuntimeError(
  requestId: string,
  error: RuntimeDataAccessError | VocabularyCommandLedgerError | Schema.SchemaError,
) {
  if (error instanceof RuntimeDataAccessError || error instanceof VocabularyCommandLedgerError) {
    return storageUnavailableError(requestId, error)
  }

  return error
}

function toVocabularyDraftRuntimeError(
  requestId: string,
  error:
    | RuntimeDataAccessError
    | VocabularyCommandLedgerError
    | VocabularyCompileError
    | Schema.SchemaError,
) {
  if (error instanceof RuntimeDataAccessError || error instanceof VocabularyCommandLedgerError) {
    return storageUnavailableError(requestId, error)
  }

  return error
}

function toVocabularyPublishRuntimeError(
  requestId: string,
  error:
    | RuntimeDataAccessError
    | PromptGateLedgerBusyError
    | PromptGateLedgerError
    | VocabularyCommandLedgerError
    | VocabularyCompileError
    | LedgerViewNotFound
    | Schema.SchemaError,
) {
  if (
    error instanceof PromptGateLedgerBusyError
  ) {
    return ledgerBusyError(requestId, error)
  }
  if (
    error instanceof RuntimeDataAccessError
    || error instanceof PromptGateLedgerError
    || error instanceof VocabularyCommandLedgerError
  ) {
    return storageUnavailableError(requestId, error)
  }

  return error
}

function sourceSpanId(namespace: string, suffix: string) {
  return Schema.decodeUnknownSync(SourceSpanId)(`source-span:${namespace}:${suffix}`)
}

function vocabularyInputId(namespace: string) {
  return Schema.decodeUnknownSync(VocabularyInputId)(`vocabulary-input:${namespace}:mcp`)
}

function vocabularyInputFromMcp(input: McpVocabularySourceInput) {
  const fullSpan = new SourceSpan({
    id: sourceSpanId(input.namespace, 'entry'),
    startOffset: 0,
    endOffset: input.content.length,
    text: input.content,
  })
  const separatorIndex = input.content.search(/[：:]/)
  const spans = [fullSpan]
  if (separatorIndex > 0 && separatorIndex < input.content.length - 1) {
    const term = input.content.slice(0, separatorIndex).trim()
    const definitionStart = separatorIndex + 1
    const definition = input.content.slice(definitionStart).trim()
    if (term.length > 0) {
      spans.push(new SourceSpan({
        id: sourceSpanId(input.namespace, 'term'),
        startOffset: 0,
        endOffset: term.length,
        text: term,
      }))
    }
    if (definition.length > 0) {
      spans.push(new SourceSpan({
        id: sourceSpanId(input.namespace, 'definition'),
        startOffset: definitionStart,
        endOffset: definitionStart + definition.length,
        text: definition,
      }))
    }
  }

  return Schema.decodeUnknownSync(VocabularyInput)({
    id: vocabularyInputId(input.namespace),
    inputKind: 'vocabulary',
    content: input.content,
    vocabularyKind: input.vocabulary_kind,
    namespace: input.namespace,
    spans,
  })
}

export const statusQueryFromMcp = Effect.fn('statusQueryFromMcp')(
  function* (
    request: unknown,
  ): Effect.fn.Return<SemanticRuntimeStatusQuery, Schema.SchemaError> {
    const decoded = yield* Schema.decodeUnknownEffect(McpSemanticStatusRequest)(request)
    return new SemanticRuntimeStatusQuery({
      requestId: decoded.request_id,
      dataRoot: decoded.data_root,
      projectRef: projectRefFromMcp(decoded.project_ref),
    })
  },
)

export const getCaseQueryFromMcp = Effect.fn('getCaseQueryFromMcp')(
  function* (
    request: unknown,
  ): Effect.fn.Return<SemanticRuntimeGetCaseQuery, Schema.SchemaError> {
    const decoded = yield* Schema.decodeUnknownEffect(McpSemanticGetCaseRequest)(request)
    return yield* Schema.decodeUnknownEffect(SemanticRuntimeGetCaseQuery)({
      requestId: decoded.request_id,
      dataRoot: decoded.data_root,
      projectRef: projectRefFromMcp(decoded.project_ref),
      caseId: decoded.case_id,
    })
  },
)

export const compileVocabularyDraftCommandFromMcp = Effect.fn('compileVocabularyDraftCommandFromMcp')(
  function* (
    request: unknown,
  ): Effect.fn.Return<SemanticRuntimeCompileVocabularyDraftCommand, Schema.SchemaError> {
    const decoded = yield* Schema.decodeUnknownEffect(McpSemanticCompileVocabularyDraftRequest)(request)
    return yield* Schema.decodeUnknownEffect(SemanticRuntimeCompileVocabularyDraftCommand)({
      requestId: decoded.request_id,
      dataRoot: decoded.data_root,
      projectRef: projectRefFromMcp(decoded.project_ref),
      operationId: decoded.operation_id,
      input: vocabularyInputFromMcp(decoded.vocabulary_source),
    })
  },
)

export const compileAndPublishVocabularyCommandFromMcp = Effect.fn('compileAndPublishVocabularyCommandFromMcp')(
  function* (
    request: unknown,
  ): Effect.fn.Return<SemanticRuntimeCompileAndPublishVocabularyCommand, Schema.SchemaError> {
    const decoded = yield* Schema.decodeUnknownEffect(McpSemanticCompileAndPublishVocabularyRequest)(request)
    return yield* Schema.decodeUnknownEffect(SemanticRuntimeCompileAndPublishVocabularyCommand)({
      requestId: decoded.request_id,
      dataRoot: decoded.data_root,
      projectRef: projectRefFromMcp(decoded.project_ref),
      operationId: decoded.operation_id,
      input: vocabularyInputFromMcp(decoded.vocabulary_source),
    })
  },
)

export function semanticRuntimeToolMetadata() {
  return [
    new SemanticRuntimeToolMetadata({
      toolName: 'semantic_status',
      category: 'query',
      operationEffect: 'pure',
    }),
    new SemanticRuntimeToolMetadata({
      toolName: 'semantic_get_case',
      category: 'query',
      operationEffect: 'pure',
    }),
    new SemanticRuntimeToolMetadata({
      toolName: 'semantic_compile_vocabulary_draft',
      category: 'evidence_command',
      operationEffect: 'ledger-write',
    }),
    new SemanticRuntimeToolMetadata({
      toolName: 'semantic_compile_and_publish_vocabulary',
      category: 'authority_command',
      operationEffect: 'ledger-write',
    }),
  ]
}

export class SemanticRuntimeFacade extends Context.Service<SemanticRuntimeFacade, {
  status: (
    query: SemanticRuntimeStatusQuery,
  ) => Effect.Effect<SemanticRuntimeStatusResponse, SemanticRuntimeQueryError | Schema.SchemaError>
  getCase: (
    query: SemanticRuntimeGetCaseQuery,
  ) => Effect.Effect<SemanticRuntimeGetCaseResponse, SemanticRuntimeQueryError | Schema.SchemaError>
  evaluateAndRecordPrompt: (
    command: SemanticRuntimeEvaluatePromptCommand,
  ) => Effect.Effect<SemanticRuntimeEvaluatePromptResponse, SemanticRuntimeQueryError | Schema.SchemaError>
  compileVocabularyDraft: (
    command: SemanticRuntimeCompileVocabularyDraftCommand,
  ) => Effect.Effect<
    SemanticRuntimeCompileVocabularyDraftResponse,
    SemanticRuntimeQueryError | VocabularyCompileError | Schema.SchemaError
  >
  compileAndPublishVocabulary: (
    command: SemanticRuntimeCompileAndPublishVocabularyCommand,
  ) => Effect.Effect<
    SemanticRuntimeCompileAndPublishVocabularyResponse,
    SemanticRuntimeQueryError | VocabularyCompileError | LedgerViewNotFound | Schema.SchemaError
  >
}>()('harmony/headless-runtime/SemanticRuntimeFacade') {
  static readonly layerNoDeps = Layer.effect(
    SemanticRuntimeFacade,
    Effect.gen(function* () {
      const probeLedger = yield* RuntimeDataProbeLedger
      const promptGateLedger = yield* PromptGateLedger
      const vocabularyLedger = yield* VocabularyCommandLedger

      const status = Effect.fn('SemanticRuntimeFacade.status')(
        function* (
          query: SemanticRuntimeStatusQuery,
        ): Effect.fn.Return<SemanticRuntimeStatusResponse, SemanticRuntimeQueryError | Schema.SchemaError> {
          const decoded = yield* Schema.decodeUnknownEffect(SemanticRuntimeStatusQuery)(query)
          const probeState = yield* probeLedger.read(new RuntimeDataProbeQuery({
            dataRoot: decoded.dataRoot,
            projectRef: decoded.projectRef,
          })).pipe(
            Effect.matchEffect({
              onFailure: (error) => {
                if (error instanceof RuntimeDataAccessError) {
                  return Effect.succeed({
                    records: [],
                    integrationHealth: ledgerUnavailableIntegrationHealth(error, {
                      ledgerKind: 'runtime-data',
                      dataRoot: decoded.dataRoot,
                      projectRef: decoded.projectRef,
                      operation: 'read-probe-ledger',
                    }),
                  })
                }
                return Effect.fail(toProbeRuntimeError(decoded.requestId, error))
              },
              onSuccess: records =>
                Effect.succeed({
                  records,
                  integrationHealth: healthyIntegrationHealth(),
                }),
            }),
          )
          const vocabularyState = probeState.integrationHealth.status === 'degraded'
            ? { records: [], integrationHealth: probeState.integrationHealth }
            : yield* vocabularyLedger.records(decoded.dataRoot, decoded.projectRef).pipe(
              Effect.matchEffect({
                onFailure: (error) => {
                  if (error instanceof RuntimeDataAccessError || error instanceof VocabularyCommandLedgerError) {
                    return Effect.succeed({
                      records: [],
                      integrationHealth: ledgerUnavailableIntegrationHealth(error, {
                        ledgerKind: 'runtime-data',
                        dataRoot: decoded.dataRoot,
                        projectRef: decoded.projectRef,
                        operation: 'read-vocabulary-records',
                      }),
                    })
                  }
                  return Effect.fail(toVocabularyReadRuntimeError(decoded.requestId, error))
                },
                onSuccess: records =>
                  Effect.succeed({
                    records,
                    integrationHealth: healthyIntegrationHealth(),
                  }),
              }),
            )
          const records = probeState.records
          const vocabularyRecords = vocabularyState.records
          const integrationHealth = vocabularyState.integrationHealth.status === 'degraded'
            ? vocabularyState.integrationHealth
            : probeState.integrationHealth
          const statusSourceRecordIds = integrationHealth.status === 'degraded'
            ? []
            : [...sourceRecordIds(records), ...runtimeLedgerIds(vocabularyRecords)]
          return yield* Schema.decodeUnknownEffect(SemanticRuntimeStatusResponse)(new SemanticRuntimeStatusResponse({
            apiVersion: 'semantic-runtime-facade.v1',
            requestId: decoded.requestId,
            effect: 'pure',
            asOfSeq: statusSourceRecordIds.length,
            sourceRecordIds: statusSourceRecordIds,
            committedRecordIds: [],
            result: new SemanticRuntimeStatusResult({
              resultKind: 'runtime_status',
              integrationHealth,
              projectRef: decoded.projectRef,
              probeRecordCount: records.length,
              observedOrigins: Array.from(new Set(records.map(record => record.origin))),
            }),
          }))
        },
      )

      const getCase = Effect.fn('SemanticRuntimeFacade.getCase')(
        function* (
          query: SemanticRuntimeGetCaseQuery,
        ): Effect.fn.Return<SemanticRuntimeGetCaseResponse, SemanticRuntimeQueryError | Schema.SchemaError> {
          const decoded = yield* Schema.decodeUnknownEffect(SemanticRuntimeGetCaseQuery)(query)
          const records = yield* probeLedger.read(new RuntimeDataProbeQuery({
            dataRoot: decoded.dataRoot,
            projectRef: decoded.projectRef,
          })).pipe(
            Effect.mapError(error => toProbeRuntimeError(decoded.requestId, error)),
          )
          const vocabularyRecords = yield* vocabularyLedger.records(decoded.dataRoot, decoded.projectRef).pipe(
            Effect.mapError(error => toVocabularyReadRuntimeError(decoded.requestId, error)),
          )
          const querySourceRecordIds = [...sourceRecordIds(records), ...runtimeLedgerIds(vocabularyRecords)]
          const caseView = yield* promptGateLedger.getCase(decoded.dataRoot, decoded.projectRef, decoded.caseId).pipe(
            Effect.mapError(error => toPromptRuntimeError(decoded.requestId, error)),
          )
          if (caseView !== undefined) {
            return yield* Schema.decodeUnknownEffect(SemanticRuntimeGetCaseResponse)(new SemanticRuntimeGetCaseResponse({
              apiVersion: 'semantic-runtime-facade.v1',
              requestId: decoded.requestId,
              effect: 'pure',
              asOfSeq: querySourceRecordIds.length + caseView.sourceRecordIds.length,
              sourceRecordIds: caseView.sourceRecordIds,
              committedRecordIds: [],
              result: new SemanticRuntimeFoundCaseResult({
                resultKind: 'case_found',
                caseView,
              }),
            }))
          }

          return yield* Schema.decodeUnknownEffect(SemanticRuntimeGetCaseResponse)(new SemanticRuntimeGetCaseResponse({
            apiVersion: 'semantic-runtime-facade.v1',
            requestId: decoded.requestId,
            effect: 'pure',
            asOfSeq: querySourceRecordIds.length,
            sourceRecordIds: querySourceRecordIds,
            committedRecordIds: [],
            result: new SemanticRuntimeMissingCaseResult({
              resultKind: 'missing_case',
              caseId: decoded.caseId,
              reason: 'case_not_found',
            }),
          }))
        },
      )

      const evaluateAndRecordPrompt = Effect.fn('SemanticRuntimeFacade.evaluateAndRecordPrompt')(
        function* (
          command: SemanticRuntimeEvaluatePromptCommand,
        ): Effect.fn.Return<SemanticRuntimeEvaluatePromptResponse, SemanticRuntimeQueryError | Schema.SchemaError> {
          const decoded = yield* Schema.decodeUnknownEffect(SemanticRuntimeEvaluatePromptCommand)(command)
          if (decoded.managedProject === false) {
            return yield* Schema.decodeUnknownEffect(SemanticRuntimeEvaluatePromptResponse)(
              new SemanticRuntimeEvaluatePromptResponse({
                apiVersion: 'semantic-runtime-facade.v1',
                requestId: decoded.requestId,
                effect: 'pure',
                asOfSeq: 0,
                sourceRecordIds: [],
                committedRecordIds: [],
                result: new PromptGateNoopDecision({
                  decisionKind: 'noop',
                  reason: 'unmanaged_project',
                  projectRef: decoded.projectRef,
                  storagePolicy: 'no_storage_required',
                }),
              }),
            )
          }

          return yield* promptGateLedger.recordPrompt(decoded).pipe(
            Effect.matchEffect({
              onFailure: (error) => {
                if (error instanceof RuntimeDataAccessError || error instanceof PromptGateLedgerError) {
                  const integrationHealth = ledgerUnavailableIntegrationHealth(error, {
                    ledgerKind: 'prompt-gate',
                    dataRoot: decoded.dataRoot,
                    projectRef: decoded.projectRef,
                    operation: 'record-prompt',
                  })
                  return Schema.decodeUnknownEffect(SemanticRuntimeEvaluatePromptResponse)(
                    new SemanticRuntimeEvaluatePromptResponse({
                      apiVersion: 'semantic-runtime-facade.v1',
                      requestId: decoded.requestId,
                      effect: 'pure',
                      asOfSeq: 0,
                      sourceRecordIds: [],
                      committedRecordIds: [],
                      result: new PromptGateBlockDecision({
                        decisionKind: 'block',
                        reason: 'ledger_unavailable',
                        projectRef: decoded.projectRef,
                        integrationHealth,
                      }),
                    }),
                  )
                }
                return Effect.fail(toPromptRuntimeError(decoded.requestId, error))
              },
              onSuccess: (commit) => {
                if (commit instanceof PromptGateNoopDecision) {
                  return Schema.decodeUnknownEffect(SemanticRuntimeEvaluatePromptResponse)(
                    new SemanticRuntimeEvaluatePromptResponse({
                      apiVersion: 'semantic-runtime-facade.v1',
                      requestId: decoded.requestId,
                      effect: 'pure',
                      asOfSeq: 0,
                      sourceRecordIds: [],
                      committedRecordIds: [],
                      result: commit,
                    }),
                  )
                }
                const committedRecordIds = commit.records.map(record => record.recordId)
                return Schema.decodeUnknownEffect(SemanticRuntimeEvaluatePromptResponse)(
                  new SemanticRuntimeEvaluatePromptResponse({
                    apiVersion: 'semantic-runtime-facade.v1',
                    requestId: decoded.requestId,
                    effect: 'ledger-write',
                    asOfSeq: committedRecordIds.length,
                    sourceRecordIds: committedRecordIds,
                    committedRecordIds,
                    result: commit.decision,
                  }),
                )
              },
            }),
          )
        },
      )

      const compileVocabularyDraft = Effect.fn('SemanticRuntimeFacade.compileVocabularyDraft')(
        function* (command: SemanticRuntimeCompileVocabularyDraftCommand) {
          const decoded = yield* Schema.decodeUnknownEffect(SemanticRuntimeCompileVocabularyDraftCommand)(command)
          const commit = yield* vocabularyLedger.compileDraft(decoded).pipe(
            Effect.mapError(error => toVocabularyDraftRuntimeError(decoded.requestId, error)),
          )
          const committedRecordIds = vocabularyRecordIds(commit.records)
          return yield* Schema.decodeUnknownEffect(SemanticRuntimeCompileVocabularyDraftResponse)(
            new SemanticRuntimeCompileVocabularyDraftResponse({
              apiVersion: 'semantic-runtime-facade.v1',
              requestId: decoded.requestId,
              effect: 'ledger-write',
              asOfSeq: commit.allRecords.length,
              sourceRecordIds: committedRecordIds,
              committedRecordIds,
              result: new SemanticRuntimeVocabularyDraftCompiledResult({
                resultKind: 'vocabulary_draft_compiled',
                evidenceSource: commit.evidenceSource,
                draft: commit.draft,
                ledgerRecordIds: committedRecordIds,
              }),
            }),
          )
        },
      )

      const compileAndPublishVocabulary = Effect.fn('SemanticRuntimeFacade.compileAndPublishVocabulary')(
        function* (command: SemanticRuntimeCompileAndPublishVocabularyCommand) {
          const decoded = yield* Schema.decodeUnknownEffect(SemanticRuntimeCompileAndPublishVocabularyCommand)(command)
          const commit = yield* vocabularyLedger.compileAndPublish(decoded).pipe(
            Effect.mapError(error => toVocabularyPublishRuntimeError(decoded.requestId, error)),
          )
          const committedRecordIds = vocabularyRecordIds(commit.records)
          return yield* Schema.decodeUnknownEffect(SemanticRuntimeCompileAndPublishVocabularyResponse)(
            new SemanticRuntimeCompileAndPublishVocabularyResponse({
              apiVersion: 'semantic-runtime-facade.v1',
              requestId: decoded.requestId,
              effect: 'ledger-write',
              asOfSeq: commit.allRecords.length,
              sourceRecordIds: committedRecordIds,
              committedRecordIds,
              result: new SemanticRuntimeVocabularyPublishedResult({
                resultKind: 'vocabulary_published',
                evidenceSource: commit.evidenceSource,
                draft: commit.draft,
                publishedPackage: commit.publishedPackage,
                packageVersion: commit.packageVersion,
                currentView: commit.currentView,
                ledgerRecordIds: committedRecordIds,
              }),
            }),
          )
        },
      )

      return SemanticRuntimeFacade.of({
        status,
        getCase,
        evaluateAndRecordPrompt,
        compileVocabularyDraft,
        compileAndPublishVocabulary,
      })
    }),
  )

  static readonly layerLive = SemanticRuntimeFacade.layerNoDeps.pipe(
    Layer.provide(VocabularyCommandLedger.layerLive),
    Layer.provide(PromptGateLedger.layerLive),
    Layer.provide(RuntimeDataProbeLedger.layerLive),
  )
}
