import type {
  RuntimeDataProbeRecordType as RuntimeDataProbeRecordShape,
} from '@harmony/semantic-model/schema/runtime-data'
import { createHash } from 'node:crypto'
import * as Fs from 'node:fs/promises'
import * as Path from 'node:path'
import {
  ProjectRef,
  RuntimeDataLocation,
  RuntimeDataLocatorRequest,
  RuntimeDataProbeCommand,
  RuntimeDataProbeQuery,
  RuntimeDataProbeRecord,
} from '@harmony/semantic-model/schema/runtime-data'
import { Context, Effect, Layer, Schema } from 'effect'

const RuntimeDataAccessOperation = Schema.Literals([
  'resolve-data-root',
  'write-project-ref',
  'append-probe-ledger',
  'read-probe-ledger',
  'decode-probe-ledger-line',
])

export class RuntimeDataAccessError extends Schema.TaggedErrorClass<RuntimeDataAccessError>()(
  'RuntimeDataAccessError',
  {
    operation: RuntimeDataAccessOperation,
    path: Schema.String,
    message: Schema.String,
  },
) {}

function causeMessage(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause)
}

function accessError(
  operation: typeof RuntimeDataAccessOperation.Type,
  targetPath: string,
  cause: unknown,
) {
  return new RuntimeDataAccessError({
    operation,
    path: targetPath,
    message: causeMessage(cause),
  })
}

function digest(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 16)
}

function safeLabel(value: string): string {
  const label = value
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)

  return label.length === 0 ? 'ref' : label
}

function storageKey(value: string): string {
  return `${safeLabel(value)}-${digest(value)}`
}

function projectRefPartitionKey(projectRef: ProjectRef): string {
  return `${projectRef.projectId}\n${projectRef.worktreeId ?? 'default'}`
}

function projectDataRoot(dataRoot: string, projectRef: ProjectRef): string {
  const projectRoot = Path.join(dataRoot, 'projects', storageKey(projectRef.projectId))
  if (projectRef.worktreeId === undefined) {
    return Path.join(projectRoot, 'default')
  }
  return Path.join(projectRoot, 'worktrees', storageKey(projectRef.worktreeId))
}

const ensureDirectory = Effect.fn('ensureDirectory')(
  (targetPath: string) =>
    Effect.tryPromise({
      try: () => Fs.mkdir(targetPath, { recursive: true }),
      catch: cause => accessError('resolve-data-root', targetPath, cause),
    }),
)

const writeJsonFile = Effect.fn('writeJsonFile')(
  (targetPath: string, value: unknown) =>
    Effect.tryPromise({
      try: () => Fs.writeFile(targetPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8'),
      catch: cause => accessError('write-project-ref', targetPath, cause),
    }),
)

const appendJsonLine = Effect.fn('appendJsonLine')(
  (targetPath: string, value: unknown) =>
    Effect.tryPromise({
      try: () => Fs.appendFile(targetPath, `${JSON.stringify(value)}\n`, 'utf8'),
      catch: cause => accessError('append-probe-ledger', targetPath, cause),
    }),
)

function isNotFound(cause: unknown): boolean {
  return cause instanceof Error && 'code' in cause && cause.code === 'ENOENT'
}

const readUtf8IfExists = Effect.fn('readUtf8IfExists')(
  (targetPath: string) =>
    Effect.tryPromise({
      async try() {
        try {
          return await Fs.readFile(targetPath, 'utf8')
        }
        catch (cause) {
          if (isNotFound(cause)) {
            return ''
          }
          throw cause
        }
      },
      catch: cause => accessError('read-probe-ledger', targetPath, cause),
    }),
)

const parseJsonLine = Effect.fn('parseJsonLine')(
  (targetPath: string, line: string, lineNumber: number) =>
    Effect.try({
      try: () => JSON.parse(line) as unknown,
      catch: cause =>
        new RuntimeDataAccessError({
          operation: 'decode-probe-ledger-line',
          path: targetPath,
          message: `Invalid JSON on line ${lineNumber}: ${causeMessage(cause)}`,
        }),
    }),
)

const locateRuntimeData = Effect.fn('RuntimeDataLocator.locate')(
  function* (
    request: RuntimeDataLocatorRequest,
  ): Effect.fn.Return<RuntimeDataLocation, RuntimeDataAccessError | Schema.SchemaError> {
    const decoded = yield* Schema.decodeUnknownEffect(RuntimeDataLocatorRequest)(request)
    if (!Path.isAbsolute(decoded.dataRoot)) {
      return yield* new RuntimeDataAccessError({
        operation: 'resolve-data-root',
        path: decoded.dataRoot,
        message: 'Runtime data root must be absolute; pass PLUGIN_DATA or an explicit absolute data root.',
      })
    }

    const dataRoot = Path.resolve(decoded.dataRoot)
    const resolvedProjectDataRoot = projectDataRoot(dataRoot, decoded.projectRef)
    const projectRefPath = Path.join(resolvedProjectDataRoot, 'project-ref.json')
    const probeLedgerPath = Path.join(resolvedProjectDataRoot, 'probe-ledger.jsonl')
    yield* ensureDirectory(resolvedProjectDataRoot)

    const encodedProjectRef = yield* Schema.encodeUnknownEffect(ProjectRef)(decoded.projectRef)
    yield* writeJsonFile(projectRefPath, encodedProjectRef)

    return yield* Schema.decodeUnknownEffect(RuntimeDataLocation)(new RuntimeDataLocation({
      locatorVersion: 'runtime-data-locator.v1',
      dataRoot,
      projectDataRoot: resolvedProjectDataRoot,
      projectRefPath,
      probeLedgerPath,
      projectRef: decoded.projectRef,
    }))
  },
)

function probeRecordId(command: RuntimeDataProbeCommand): string {
  return `runtime-data-probe:${digest([
    command.projectRef.projectId,
    command.projectRef.worktreeId ?? 'default',
    command.operationId,
    command.origin,
  ].join('\n'))}`
}

export class RuntimeDataLocator extends Context.Service<RuntimeDataLocator, {
  locate: (
    request: RuntimeDataLocatorRequest,
  ) => Effect.Effect<RuntimeDataLocation, RuntimeDataAccessError | Schema.SchemaError>
}>()('harmony/headless-runtime/RuntimeDataLocator') {
  static readonly layerLive = Layer.succeed(
    RuntimeDataLocator,
    RuntimeDataLocator.of({
      locate: locateRuntimeData,
    }),
  )
}

export class RuntimeDataProbeLedger extends Context.Service<RuntimeDataProbeLedger, {
  append: (
    command: RuntimeDataProbeCommand,
  ) => Effect.Effect<RuntimeDataProbeRecord, RuntimeDataAccessError | Schema.SchemaError>
  read: (
    query: RuntimeDataProbeQuery,
  ) => Effect.Effect<ReadonlyArray<RuntimeDataProbeRecord>, RuntimeDataAccessError | Schema.SchemaError>
}>()('harmony/headless-runtime/RuntimeDataProbeLedger') {
  static readonly layerNoDeps = Layer.effect(
    RuntimeDataProbeLedger,
    Effect.gen(function* () {
      const locator = yield* RuntimeDataLocator

      const append = Effect.fn('RuntimeDataProbeLedger.append')(
        function* (
          command: RuntimeDataProbeCommand,
        ): Effect.fn.Return<RuntimeDataProbeRecord, RuntimeDataAccessError | Schema.SchemaError> {
          const decoded = yield* Schema.decodeUnknownEffect(RuntimeDataProbeCommand)(command)
          const location = yield* locator.locate(new RuntimeDataLocatorRequest({
            dataRoot: decoded.dataRoot,
            projectRef: decoded.projectRef,
          }))
          const record = yield* Schema.decodeUnknownEffect(RuntimeDataProbeRecord)(new RuntimeDataProbeRecord({
            recordKind: 'RuntimeDataProbeRecorded',
            schemaVersion: 1,
            recordId: probeRecordId(decoded),
            recordedAt: new Date().toISOString(),
            projectRef: decoded.projectRef,
            operationId: decoded.operationId,
            origin: decoded.origin,
            hostProvenance: decoded.hostProvenance,
          }))
          const encoded = yield* Schema.encodeUnknownEffect(RuntimeDataProbeRecord)(record)
          yield* appendJsonLine(location.probeLedgerPath, encoded)
          return record
        },
      )

      const read = Effect.fn('RuntimeDataProbeLedger.read')(
        function* (
          query: RuntimeDataProbeQuery,
        ): Effect.fn.Return<ReadonlyArray<RuntimeDataProbeRecord>, RuntimeDataAccessError | Schema.SchemaError> {
          const decoded = yield* Schema.decodeUnknownEffect(RuntimeDataProbeQuery)(query)
          const location = yield* locator.locate(new RuntimeDataLocatorRequest({
            dataRoot: decoded.dataRoot,
            projectRef: decoded.projectRef,
          }))
          const text = yield* readUtf8IfExists(location.probeLedgerPath)
          const lines = text.split(/\r?\n/).filter(line => line.length > 0)
          const records: Array<RuntimeDataProbeRecordShape> = []

          for (const [lineIndex, line] of lines.entries()) {
            const parsed = yield* parseJsonLine(location.probeLedgerPath, line, lineIndex + 1)
            const record = yield* Schema.decodeUnknownEffect(RuntimeDataProbeRecord)(parsed)
            if (projectRefPartitionKey(record.projectRef) === projectRefPartitionKey(decoded.projectRef)) {
              records.push(record)
            }
          }

          return records
        },
      )

      return RuntimeDataProbeLedger.of({
        append,
        read,
      })
    }),
  )

  static readonly layerLive = RuntimeDataProbeLedger.layerNoDeps.pipe(
    Layer.provide(RuntimeDataLocator.layerLive),
  )
}
