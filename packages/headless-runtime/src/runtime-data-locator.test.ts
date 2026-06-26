import * as Fs from 'node:fs/promises'
import * as Os from 'node:os'
import * as Path from 'node:path'
import { assert, describe, it } from '@effect/vitest'
import {
  RuntimeDataLocator,
  RuntimeDataProbeLedger,
} from '@harmony/headless-runtime/runtime/runtime-data-locator'
import {
  ProjectRef,
  RuntimeDataLocation,
  RuntimeDataLocatorRequest,
  RuntimeDataProbeCommand,
  RuntimeDataProbeQuery,
  RuntimeDataProbeRecord,
  RuntimeHostProvenance,
} from '@harmony/semantic-model/schema/runtime-data'
import { Effect, Schema } from 'effect'
import { nodeFileSystemError } from './runtime/shared/errors.ts'

function firstOf<A>(items: ReadonlyArray<A>, label: string): A {
  const value = items[0]
  if (value === undefined) {
    assert.fail(`Missing ${label}`)
  }
  return value
}

const makeTempDataRoot = Effect.tryPromise({
  try: () => Fs.mkdtemp(Path.join(Os.tmpdir(), 'harmony-runtime-data-')),
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

function appendWithFreshRuntime(command: RuntimeDataProbeCommand) {
  return Effect.gen(function* () {
    const ledger = yield* RuntimeDataProbeLedger
    return yield* ledger.append(command)
  }).pipe(Effect.provide(RuntimeDataProbeLedger.layerLive))
}

function readWithFreshRuntime(query: RuntimeDataProbeQuery) {
  return Effect.gen(function* () {
    const ledger = yield* RuntimeDataProbeLedger
    return yield* ledger.read(query)
  }).pipe(Effect.provide(RuntimeDataProbeLedger.layerLive))
}

function locateWithFreshRuntime(request: RuntimeDataLocatorRequest) {
  return Effect.gen(function* () {
    const locator = yield* RuntimeDataLocator
    return yield* locator.locate(request)
  }).pipe(Effect.provide(RuntimeDataLocator.layerLive))
}

describe('RuntimeDataLocator probe ledger tracer', () => {
  it.effect('lets hook-shaped and MCP-shaped callers share probe state without process memory', () =>
    Effect.gen(function* () {
      const dataRoot = yield* tempDataRoot
      const projectRef = new ProjectRef({
        projectId: 'project:checkout-core',
        canonicalRoot: '/workspace/checkout-core',
      })

      const hookCommand = new RuntimeDataProbeCommand({
        dataRoot,
        projectRef,
        operationId: 'operation:pre-tool-hook-1',
        origin: 'pre-tool-hook',
        hostProvenance: new RuntimeHostProvenance({
          hostKind: 'hook',
          cwd: '/workspace/checkout-core',
          pluginDataRoot: dataRoot,
          sessionId: 'session:alpha',
          turnId: 'turn:1',
          toolUseId: 'tool-use:write',
          eventName: 'PreToolUse',
          pluginVersion: 'plugin:test',
        }),
      })
      const mcpCommand = new RuntimeDataProbeCommand({
        dataRoot,
        projectRef,
        operationId: 'operation:mcp-1',
        origin: 'mcp',
        hostProvenance: new RuntimeHostProvenance({
          hostKind: 'mcp',
          cwd: '/workspace/checkout-core/packages/headless-runtime',
          pluginDataRoot: dataRoot,
          sessionId: 'session:alpha',
          turnId: 'turn:1',
          eventName: 'semantic_runtime_probe',
          pluginVersion: 'plugin:test',
        }),
      })

      yield* appendWithFreshRuntime(hookCommand)
      const seenByMcp = yield* readWithFreshRuntime(new RuntimeDataProbeQuery({
        dataRoot,
        projectRef,
      }))
      assert.strictEqual(seenByMcp.length, 1)
      assert.strictEqual(firstOf(seenByMcp, 'MCP-visible hook record').operationId, hookCommand.operationId)

      yield* appendWithFreshRuntime(mcpCommand)
      const seenByHook = yield* readWithFreshRuntime(new RuntimeDataProbeQuery({
        dataRoot,
        projectRef,
      }))
      assert.deepStrictEqual(seenByHook.map(record => record.origin), ['pre-tool-hook', 'mcp'])
      assert.strictEqual(firstOf(seenByHook, 'first probe record').projectRef.projectId, projectRef.projectId)
      assert.strictEqual(seenByHook[1]?.hostProvenance.hostKind, 'mcp')
      assert.notStrictEqual(hookCommand.hostProvenance.cwd, mcpCommand.hostProvenance.cwd)

      const encodedRecord = yield* Schema.encodeUnknownEffect(RuntimeDataProbeRecord)(
        firstOf(seenByHook, 'encoded probe record'),
      )
      yield* Schema.decodeUnknownEffect(RuntimeDataProbeRecord)(encodedRecord)
    }))

  it.effect('partitions multiple ProjectRefs under one data root and distinguishes worktree refs', () =>
    Effect.gen(function* () {
      const dataRoot = yield* tempDataRoot
      const defaultProject = new ProjectRef({
        projectId: 'project:checkout-core',
        canonicalRoot: '/workspace/checkout-core',
      })
      const otherProject = new ProjectRef({
        projectId: 'project:billing-core',
        canonicalRoot: '/workspace/billing-core',
      })
      const worktreeProject = new ProjectRef({
        projectId: 'project:checkout-core',
        canonicalRoot: '/workspace/worktrees/checkout-core-runtime-probe',
        worktreeId: 'worktree:runtime-probe',
      })

      const defaultLocation = yield* locateWithFreshRuntime(new RuntimeDataLocatorRequest({
        dataRoot,
        projectRef: defaultProject,
      }))
      const otherLocation = yield* locateWithFreshRuntime(new RuntimeDataLocatorRequest({
        dataRoot,
        projectRef: otherProject,
      }))
      const worktreeLocation = yield* locateWithFreshRuntime(new RuntimeDataLocatorRequest({
        dataRoot,
        projectRef: worktreeProject,
      }))

      yield* Schema.decodeUnknownEffect(RuntimeDataLocation)(defaultLocation)
      assert.strictEqual(defaultLocation.dataRoot, dataRoot)
      assert.notStrictEqual(defaultLocation.projectDataRoot, otherLocation.projectDataRoot)
      assert.notStrictEqual(defaultLocation.projectDataRoot, worktreeLocation.projectDataRoot)
      assert.isTrue(worktreeLocation.projectDataRoot.includes(`${Path.sep}worktrees${Path.sep}`))

      const provenance = new RuntimeHostProvenance({
        hostKind: 'hook',
        cwd: '/workspace/checkout-core',
        pluginDataRoot: dataRoot,
        sessionId: 'session:partition',
        eventName: 'PreToolUse',
      })
      yield* appendWithFreshRuntime(new RuntimeDataProbeCommand({
        dataRoot,
        projectRef: defaultProject,
        operationId: 'operation:default-project',
        origin: 'pre-tool-hook',
        hostProvenance: provenance,
      }))
      yield* appendWithFreshRuntime(new RuntimeDataProbeCommand({
        dataRoot,
        projectRef: otherProject,
        operationId: 'operation:other-project',
        origin: 'pre-tool-hook',
        hostProvenance: provenance,
      }))
      yield* appendWithFreshRuntime(new RuntimeDataProbeCommand({
        dataRoot,
        projectRef: worktreeProject,
        operationId: 'operation:worktree-project',
        origin: 'pre-tool-hook',
        hostProvenance: provenance,
      }))

      const defaultRecords = yield* readWithFreshRuntime(new RuntimeDataProbeQuery({
        dataRoot,
        projectRef: defaultProject,
      }))
      const otherRecords = yield* readWithFreshRuntime(new RuntimeDataProbeQuery({
        dataRoot,
        projectRef: otherProject,
      }))
      const worktreeRecords = yield* readWithFreshRuntime(new RuntimeDataProbeQuery({
        dataRoot,
        projectRef: worktreeProject,
      }))

      assert.deepStrictEqual(defaultRecords.map(record => record.operationId), ['operation:default-project'])
      assert.deepStrictEqual(otherRecords.map(record => record.operationId), ['operation:other-project'])
      assert.deepStrictEqual(worktreeRecords.map(record => record.operationId), ['operation:worktree-project'])
      assert.strictEqual(firstOf(worktreeRecords, 'worktree probe record').projectRef.worktreeId, 'worktree:runtime-probe')
    }))
})
