import * as Fs from 'node:fs/promises'
import * as Os from 'node:os'
import * as Path from 'node:path'
import { assert, describe, it } from '@effect/vitest'
import { SemanticRuntimeFacade } from '@harmony/headless-runtime/runtime/semantic-runtime-facade'
import {
  dispatchSemanticRuntimeMcpToolCall,
  SemanticRuntimeMcpDispatchError,
} from '@harmony/headless-runtime/runtime/semantic-runtime-mcp-dispatcher'
import { Effect } from 'effect'
import { nodeFileSystemError } from './runtime/shared/errors.ts'

const makeTempDataRoot = Effect.tryPromise({
  try: () => Fs.mkdtemp(Path.join(Os.tmpdir(), 'harmony-runtime-mcp-dispatcher-')),
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

const projectRef = {
  project_id: 'project:mcp-dispatcher',
  canonical_root: '/workspace/mcp-dispatcher',
}

function runDispatcher(call: unknown) {
  return dispatchSemanticRuntimeMcpToolCall(call).pipe(
    Effect.provide(SemanticRuntimeFacade.layerLive),
  )
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function record(value: unknown, label: string) {
  if (isRecord(value)) {
    return value
  }
  assert.fail(`Expected ${label} to be a JSON object`)
}

function jsonRoundTrip(value: unknown) {
  const serialized = JSON.stringify(value)
  if (serialized === undefined) {
    assert.fail('Expected JSON serialization to produce text')
  }
  const parsed: unknown = JSON.parse(serialized)
  assert.deepStrictEqual(parsed, value)
}

describe('SemanticRuntime MCP dispatcher', () => {
  it.effect('dispatches query calls through the facade and returns plain serializable data', () =>
    Effect.gen(function* () {
      const dataRoot = yield* tempDataRoot

      const response = yield* runDispatcher({
        name: 'semantic_status',
        arguments: {
          request_id: 'request:mcp-dispatch-status',
          data_root: dataRoot,
          project_ref: projectRef,
        },
      })

      jsonRoundTrip(response)
      const responseRecord = record(response, 'status response')
      const resultRecord = record(responseRecord.result, 'status result')

      assert.strictEqual(responseRecord.apiVersion, 'semantic-runtime-facade.v1')
      assert.strictEqual(responseRecord.requestId, 'request:mcp-dispatch-status')
      assert.strictEqual(responseRecord.effect, 'pure')
      assert.strictEqual(resultRecord.resultKind, 'runtime_status')
    }))

  it.effect('dispatches vocabulary draft commands without publishing authority', () =>
    Effect.gen(function* () {
      const dataRoot = yield* tempDataRoot

      const response = yield* runDispatcher({
        name: 'semantic_compile_vocabulary_draft',
        arguments: {
          request_id: 'request:mcp-dispatch-vocabulary-draft',
          data_root: dataRoot,
          project_ref: projectRef,
          operation_id: 'operation:mcp-dispatch-vocabulary-draft',
          vocabulary_source: {
            namespace: 'base.dispatcher-refund',
            vocabulary_kind: 'base',
            content: '退款：将已支付金额返还给用户',
          },
        },
      })

      jsonRoundTrip(response)
      const responseRecord = record(response, 'vocabulary draft response')
      const resultRecord = record(responseRecord.result, 'vocabulary draft result')

      assert.strictEqual(responseRecord.effect, 'ledger-write')
      assert.strictEqual(resultRecord.resultKind, 'vocabulary_draft_compiled')
      assert.strictEqual(record(resultRecord.draft, 'vocabulary draft').lifecycle, 'draft')
    }))

  it.effect('rejects the generic vocabulary import tool', () =>
    runDispatcher({
      name: 'semantic_import_vocabulary',
      arguments: {},
    }).pipe(
      Effect.matchEffect({
        onFailure: error =>
          Effect.succeed(error instanceof SemanticRuntimeMcpDispatchError ? error.reason : 'unexpected-error'),
        onSuccess: () => Effect.succeed('unexpected-success'),
      }),
      Effect.map(result => assert.strictEqual(result, 'unknown_tool')),
    ))
})
