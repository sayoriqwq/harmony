import * as Fs from 'node:fs/promises'
import * as Os from 'node:os'
import * as Path from 'node:path'
import { assert, describe, it } from '@effect/vitest'
import {
  getCaseQueryFromMcp,
  McpProjectRefInput,
  McpSemanticGetCaseRequest,
  McpSemanticStatusRequest,
  SemanticRuntimeFacade,
  statusQueryFromMcp,
} from '@harmony/headless-runtime/runtime/semantic-runtime-facade'
import {
  ProjectRef,
  RuntimeDataProbeCommand,
  RuntimeDataProbeQuery,
  RuntimeHostProvenance,
} from '@harmony/semantic-model/schema/runtime-data'
import {
  SemanticRuntimeGetCaseQuery,
  SemanticRuntimeStatusQuery,
} from '@harmony/semantic-model/schema/runtime-facade'
import { Effect, Schema } from 'effect'
import { RuntimeDataProbeLedger } from './runtime/runtime-data-locator.ts'
import { nodeFileSystemError } from './runtime/shared/errors.ts'

const makeTempDataRoot = Effect.tryPromise({
  try: () => Fs.mkdtemp(Path.join(Os.tmpdir(), 'harmony-runtime-facade-')),
  catch: nodeFileSystemError,
})

function removeTempDataRoot(dataRoot: string) {
  return Effect.tryPromise({
    try: () => Fs.rm(dataRoot, { recursive: true, force: true }),
    catch: nodeFileSystemError,
  }).pipe(
    Effect.catch(() => Effect.succeed(undefined)),
  )
}

const tempDataRoot = Effect.acquireRelease(
  makeTempDataRoot,
  dataRoot => removeTempDataRoot(dataRoot),
)

const projectRef = new ProjectRef({
  projectId: 'project:semantic-runtime-query',
  canonicalRoot: '/workspace/semantic-runtime-query',
})

function appendProbe(command: RuntimeDataProbeCommand) {
  return Effect.gen(function* () {
    const ledger = yield* RuntimeDataProbeLedger
    return yield* ledger.append(command)
  }).pipe(Effect.provide(RuntimeDataProbeLedger.layerLive))
}

function readProbeRecords(dataRoot: string) {
  return Effect.gen(function* () {
    const ledger = yield* RuntimeDataProbeLedger
    return yield* ledger.read(new RuntimeDataProbeQuery({
      dataRoot,
      projectRef,
    }))
  }).pipe(Effect.provide(RuntimeDataProbeLedger.layerLive))
}

function runFacade<A, E>(effect: Effect.Effect<A, E, SemanticRuntimeFacade>) {
  return effect.pipe(Effect.provide(SemanticRuntimeFacade.layerLive))
}

function status(dataRoot: string) {
  return runFacade(Effect.gen(function* () {
    const facade = yield* SemanticRuntimeFacade
    return yield* facade.status(new SemanticRuntimeStatusQuery({
      requestId: 'request:status-1',
      dataRoot,
      projectRef,
    }))
  }))
}

function getCase(dataRoot: string) {
  return runFacade(Effect.gen(function* () {
    const facade = yield* SemanticRuntimeFacade
    const query = yield* Schema.decodeUnknownEffect(SemanticRuntimeGetCaseQuery)({
      requestId: 'request:get-case-1',
      dataRoot,
      projectRef,
      caseId: 'case:missing-query-case',
    })
    return yield* facade.getCase(query)
  }))
}

describe('SemanticRuntimeFacade query vertical', () => {
  it.effect('reconstructs status from probe records with read-only response provenance', () =>
    Effect.gen(function* () {
      const dataRoot = yield* tempDataRoot
      const hookRecord = yield* appendProbe(new RuntimeDataProbeCommand({
        dataRoot,
        projectRef,
        operationId: 'operation:status-hook',
        origin: 'user-prompt-hook',
        hostProvenance: new RuntimeHostProvenance({
          hostKind: 'hook',
          cwd: '/workspace/semantic-runtime-query',
          pluginDataRoot: dataRoot,
          sessionId: 'session:status',
          turnId: 'turn:status',
          eventName: 'UserPromptSubmit',
        }),
      }))
      const mcpRecord = yield* appendProbe(new RuntimeDataProbeCommand({
        dataRoot,
        projectRef,
        operationId: 'operation:status-mcp',
        origin: 'mcp',
        hostProvenance: new RuntimeHostProvenance({
          hostKind: 'mcp',
          cwd: '/workspace/semantic-runtime-query/packages/headless-runtime',
          pluginDataRoot: dataRoot,
          sessionId: 'session:status',
          eventName: 'semantic_status',
        }),
      }))

      const before = yield* readProbeRecords(dataRoot)
      const response = yield* status(dataRoot)
      const after = yield* readProbeRecords(dataRoot)

      assert.strictEqual(response.apiVersion, 'semantic-runtime-facade.v1')
      assert.strictEqual(response.requestId, 'request:status-1')
      assert.strictEqual(response.effect, 'pure')
      assert.strictEqual(response.asOfSeq, 2)
      assert.deepStrictEqual(response.sourceRecordIds, [hookRecord.recordId, mcpRecord.recordId])
      assert.deepStrictEqual(response.committedRecordIds, [])
      assert.strictEqual(response.result.resultKind, 'runtime_status')
      assert.strictEqual(response.result.integrationHealth.status, 'fully-active')
      assert.strictEqual(response.result.integrationHealth.reason, 'healthy')
      assert.strictEqual(response.result.probeRecordCount, 2)
      assert.deepStrictEqual(response.result.observedOrigins, ['user-prompt-hook', 'mcp'])
      assert.strictEqual(before.length, after.length)
      assert.deepStrictEqual(after.map(record => record.recordId), before.map(record => record.recordId))
    }))

  it.effect('maps MCP-shaped status requests into facade query requests', () =>
    Effect.gen(function* () {
      const query = yield* statusQueryFromMcp(new McpSemanticStatusRequest({
        tool: 'semantic_status',
        effect: 'query',
        request_id: 'request:mcp-status',
        data_root: '/tmp/harmony-runtime',
        project_ref: new McpProjectRefInput({
          project_id: 'project:mcp-status',
          canonical_root: '/workspace/mcp-status',
          worktree_id: 'worktree:query',
        }),
      }))

      assert.strictEqual(query.requestId, 'request:mcp-status')
      assert.strictEqual(query.dataRoot, '/tmp/harmony-runtime')
      assert.strictEqual(query.projectRef.projectId, 'project:mcp-status')
      assert.strictEqual(query.projectRef.canonicalRoot, '/workspace/mcp-status')
      assert.strictEqual(query.projectRef.worktreeId, 'worktree:query')
      assert.strictEqual('request_id' in query, false)
      assert.strictEqual('project_ref' in query, false)
    }))

  it.effect('returns missing-case as a domain result without appending records', () =>
    Effect.gen(function* () {
      const dataRoot = yield* tempDataRoot
      const record = yield* appendProbe(new RuntimeDataProbeCommand({
        dataRoot,
        projectRef,
        operationId: 'operation:get-case-probe',
        origin: 'mcp',
        hostProvenance: new RuntimeHostProvenance({
          hostKind: 'mcp',
          cwd: '/workspace/semantic-runtime-query',
          pluginDataRoot: dataRoot,
          sessionId: 'session:get-case',
          eventName: 'semantic_get_case',
        }),
      }))

      const before = yield* readProbeRecords(dataRoot)
      const response = yield* getCase(dataRoot)
      const after = yield* readProbeRecords(dataRoot)

      assert.strictEqual(response.apiVersion, 'semantic-runtime-facade.v1')
      assert.strictEqual(response.effect, 'pure')
      assert.strictEqual(response.asOfSeq, 1)
      assert.deepStrictEqual(response.sourceRecordIds, [record.recordId])
      assert.deepStrictEqual(response.committedRecordIds, [])
      assert.strictEqual(response.result.resultKind, 'missing_case')
      if (response.result.resultKind !== 'missing_case') {
        assert.fail('Expected missing-case domain result')
      }
      assert.strictEqual(response.result.caseId, 'case:missing-query-case')
      assert.strictEqual(response.result.reason, 'case_not_found')
      assert.strictEqual(before.length, after.length)
    }))

  it.effect('maps MCP-shaped get-case requests into facade query requests', () =>
    Effect.gen(function* () {
      const query = yield* getCaseQueryFromMcp(new McpSemanticGetCaseRequest({
        tool: 'semantic_get_case',
        effect: 'query',
        request_id: 'request:mcp-get-case',
        data_root: '/tmp/harmony-runtime',
        project_ref: new McpProjectRefInput({
          project_id: 'project:mcp-get-case',
          canonical_root: '/workspace/mcp-get-case',
        }),
        case_id: 'case:mcp-missing-case',
      }))

      assert.strictEqual(query.requestId, 'request:mcp-get-case')
      assert.strictEqual(query.caseId, 'case:mcp-missing-case')
      assert.strictEqual(query.projectRef.projectId, 'project:mcp-get-case')
      assert.strictEqual('case_id' in query, false)
      assert.strictEqual('project_ref' in query, false)
    }))

  it.effect('maps unavailable storage to degraded integration health', () =>
    Effect.gen(function* () {
      const response = yield* status('relative-runtime-data-root')
      assert.strictEqual(response.result.integrationHealth.status, 'degraded')
      assert.strictEqual(response.result.integrationHealth.reason, 'ledger_unavailable')
      assert.strictEqual(response.result.integrationHealth.ledgerProvenance?.ledgerKind, 'runtime-data')
      assert.deepStrictEqual(response.sourceRecordIds, [])
      assert.deepStrictEqual(response.committedRecordIds, [])
    }))
})
