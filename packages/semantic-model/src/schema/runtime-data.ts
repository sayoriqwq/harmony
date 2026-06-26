import { Schema } from 'effect'

export const RuntimeProbeOrigin = Schema.Literals([
  'user-prompt-hook',
  'pre-tool-hook',
  'mcp',
])

export const RuntimeHostKind = Schema.Literals([
  'hook',
  'mcp',
])

export class ProjectRef extends Schema.Class<ProjectRef>(
  'harmony.semantic-model/ProjectRef',
)({
  projectId: Schema.NonEmptyString,
  canonicalRoot: Schema.NonEmptyString,
  worktreeId: Schema.optionalKey(Schema.NonEmptyString),
}) {}

export class RuntimeHostProvenance extends Schema.Class<RuntimeHostProvenance>(
  'harmony.semantic-model/RuntimeHostProvenance',
)({
  hostKind: RuntimeHostKind,
  cwd: Schema.optionalKey(Schema.NonEmptyString),
  pluginDataRoot: Schema.optionalKey(Schema.NonEmptyString),
  sessionId: Schema.optionalKey(Schema.NonEmptyString),
  turnId: Schema.optionalKey(Schema.NonEmptyString),
  toolUseId: Schema.optionalKey(Schema.NonEmptyString),
  eventName: Schema.optionalKey(Schema.NonEmptyString),
  pluginVersion: Schema.optionalKey(Schema.NonEmptyString),
}) {}

export class RuntimeDataLocatorRequest extends Schema.Class<RuntimeDataLocatorRequest>(
  'harmony.semantic-model/RuntimeDataLocatorRequest',
)({
  dataRoot: Schema.NonEmptyString,
  projectRef: ProjectRef,
}) {}

export class RuntimeDataLocation extends Schema.Class<RuntimeDataLocation>(
  'harmony.semantic-model/RuntimeDataLocation',
)({
  locatorVersion: Schema.Literal('runtime-data-locator.v1'),
  dataRoot: Schema.NonEmptyString,
  projectDataRoot: Schema.NonEmptyString,
  projectRefPath: Schema.NonEmptyString,
  probeLedgerPath: Schema.NonEmptyString,
  projectRef: ProjectRef,
}) {}

export class RuntimeDataProbeCommand extends Schema.Class<RuntimeDataProbeCommand>(
  'harmony.semantic-model/RuntimeDataProbeCommand',
)({
  dataRoot: Schema.NonEmptyString,
  projectRef: ProjectRef,
  operationId: Schema.NonEmptyString,
  origin: RuntimeProbeOrigin,
  hostProvenance: RuntimeHostProvenance,
}) {}

export class RuntimeDataProbeQuery extends Schema.Class<RuntimeDataProbeQuery>(
  'harmony.semantic-model/RuntimeDataProbeQuery',
)({
  dataRoot: Schema.NonEmptyString,
  projectRef: ProjectRef,
}) {}

export class RuntimeDataProbeRecord extends Schema.Class<RuntimeDataProbeRecord>(
  'harmony.semantic-model/RuntimeDataProbeRecord',
)({
  recordKind: Schema.Literal('RuntimeDataProbeRecorded'),
  schemaVersion: Schema.Literal(1),
  recordId: Schema.NonEmptyString,
  recordedAt: Schema.NonEmptyString,
  projectRef: ProjectRef,
  operationId: Schema.NonEmptyString,
  origin: RuntimeProbeOrigin,
  hostProvenance: RuntimeHostProvenance,
}) {}

export type ProjectRefType = typeof ProjectRef.Type
export type RuntimeDataLocationType = typeof RuntimeDataLocation.Type
export type RuntimeDataProbeRecordType = typeof RuntimeDataProbeRecord.Type
