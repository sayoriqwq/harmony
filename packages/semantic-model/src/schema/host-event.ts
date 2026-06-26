import { Schema } from 'effect'

export const CodexPermissionMode = Schema.Literals([
  'default',
  'acceptEdits',
  'plan',
  'dontAsk',
  'bypassPermissions',
])

export const CodexHookEventName = Schema.Literals([
  'UserPromptSubmit',
  'PreToolUse',
  'SessionStart',
])

export const CodexSessionStartSource = Schema.Literals([
  'startup',
  'resume',
  'clear',
  'compact',
])

function isMcpToolNameSegment(segment: string) {
  if (segment.length === 0) {
    return false
  }

  for (const character of segment) {
    const code = character.charCodeAt(0)
    const isDigit = code >= 48 && code <= 57
    const isUppercase = code >= 65 && code <= 90
    const isLowercase = code >= 97 && code <= 122
    const isSeparator = character === '_' || character === '.' || character === '-'
    if (!isDigit && !isUppercase && !isLowercase && !isSeparator) {
      return false
    }
  }

  return true
}

function isCodexMcpToolName(value: string) {
  if (!value.startsWith('mcp__')) {
    return false
  }

  const separatorIndex = value.indexOf('__', 5)
  if (separatorIndex === -1) {
    return false
  }

  return isMcpToolNameSegment(value.slice(5, separatorIndex))
    && isMcpToolNameSegment(value.slice(separatorIndex + 2))
}

export const CodexMcpToolName = Schema.NonEmptyString.check(
  Schema.makeFilter(isCodexMcpToolName, {
    title: 'Codex MCP tool name',
    description: 'A Codex MCP hook tool name such as mcp__server__tool.',
  }),
)

const HostText = Schema.NonEmptyString
const HostPath = Schema.NonEmptyString
const TranscriptPath = Schema.NullOr(HostPath)

const commonHookFields = {
  session_id: HostText,
  transcript_path: TranscriptPath,
  cwd: HostPath,
  model: HostText,
  permission_mode: CodexPermissionMode,
}

export class CodexBashToolInput extends Schema.Class<CodexBashToolInput>(
  'harmony.semantic-model/CodexBashToolInput',
)({
  command: HostText,
}) {}

export class CodexApplyPatchToolInput extends Schema.Class<CodexApplyPatchToolInput>(
  'harmony.semantic-model/CodexApplyPatchToolInput',
)({
  patch: HostText,
}) {}

export const CodexMcpToolInput = Schema.Record(Schema.String, Schema.Json)
export type CodexMcpToolInputType = typeof CodexMcpToolInput.Type

export class CodexUserPromptSubmitEvent extends Schema.Class<CodexUserPromptSubmitEvent>(
  'harmony.semantic-model/CodexUserPromptSubmitEvent',
)({
  ...commonHookFields,
  hook_event_name: Schema.Literal('UserPromptSubmit'),
  turn_id: HostText,
  prompt: HostText,
}) {}

export class CodexPreToolUseBashEvent extends Schema.Class<CodexPreToolUseBashEvent>(
  'harmony.semantic-model/CodexPreToolUseBashEvent',
)({
  ...commonHookFields,
  hook_event_name: Schema.Literal('PreToolUse'),
  turn_id: HostText,
  tool_name: Schema.Literal('Bash'),
  tool_use_id: HostText,
  tool_input: CodexBashToolInput,
}) {}

export class CodexPreToolUseApplyPatchEvent extends Schema.Class<CodexPreToolUseApplyPatchEvent>(
  'harmony.semantic-model/CodexPreToolUseApplyPatchEvent',
)({
  ...commonHookFields,
  hook_event_name: Schema.Literal('PreToolUse'),
  turn_id: HostText,
  tool_name: Schema.Literal('apply_patch'),
  tool_use_id: HostText,
  tool_input: CodexApplyPatchToolInput,
}) {}

export class CodexPreToolUseMcpEvent extends Schema.Class<CodexPreToolUseMcpEvent>(
  'harmony.semantic-model/CodexPreToolUseMcpEvent',
)({
  ...commonHookFields,
  hook_event_name: Schema.Literal('PreToolUse'),
  turn_id: HostText,
  tool_name: CodexMcpToolName,
  tool_use_id: HostText,
  tool_input: CodexMcpToolInput,
}) {}

export const CodexPreToolUseEvent = Schema.Union([
  CodexPreToolUseBashEvent,
  CodexPreToolUseApplyPatchEvent,
  CodexPreToolUseMcpEvent,
])
export type CodexPreToolUseEventType = typeof CodexPreToolUseEvent.Type

export class CodexSessionStartEvent extends Schema.Class<CodexSessionStartEvent>(
  'harmony.semantic-model/CodexSessionStartEvent',
)({
  ...commonHookFields,
  hook_event_name: Schema.Literal('SessionStart'),
  source: CodexSessionStartSource,
}) {}

export const CodexHostEvent = Schema.Union([
  CodexUserPromptSubmitEvent,
  CodexPreToolUseBashEvent,
  CodexPreToolUseApplyPatchEvent,
  CodexPreToolUseMcpEvent,
  CodexSessionStartEvent,
])
export type CodexHostEventType = typeof CodexHostEvent.Type

export class CodexHookRuntimeMetadata extends Schema.Class<CodexHookRuntimeMetadata>(
  'harmony.semantic-model/CodexHookRuntimeMetadata',
)({
  pluginRoot: Schema.optionalKey(HostPath),
  pluginData: Schema.optionalKey(HostPath),
}) {}
export type CodexHookRuntimeMetadataType = typeof CodexHookRuntimeMetadata.Type

export class CodexHostEventFixture extends Schema.Class<CodexHostEventFixture>(
  'harmony.semantic-model/CodexHostEventFixture',
)({
  fixtureKind: Schema.Literal('codex-host-event-fixture'),
  payload: CodexHostEvent,
  runtime: CodexHookRuntimeMetadata,
}) {}
export type CodexHostEventFixtureType = typeof CodexHostEventFixture.Type

export class CodexHostEventProvenance extends Schema.Class<CodexHostEventProvenance>(
  'harmony.semantic-model/CodexHostEventProvenance',
)({
  eventName: CodexHookEventName,
  sessionId: HostText,
  turnId: Schema.optionalKey(HostText),
  cwd: HostPath,
  transcriptPath: TranscriptPath,
  toolName: Schema.optionalKey(HostText),
  toolUseId: Schema.optionalKey(HostText),
  pluginRoot: Schema.optionalKey(HostPath),
  pluginData: Schema.optionalKey(HostPath),
}) {}
export type CodexHostEventProvenanceType = typeof CodexHostEventProvenance.Type

export const decodeCodexUserPromptSubmitEvent = Schema.decodeUnknownEffect(CodexUserPromptSubmitEvent)
export const decodeCodexPreToolUseBashEvent = Schema.decodeUnknownEffect(CodexPreToolUseBashEvent)
export const decodeCodexPreToolUseApplyPatchEvent = Schema.decodeUnknownEffect(CodexPreToolUseApplyPatchEvent)
export const decodeCodexPreToolUseMcpEvent = Schema.decodeUnknownEffect(CodexPreToolUseMcpEvent)
export const decodeCodexSessionStartEvent = Schema.decodeUnknownEffect(CodexSessionStartEvent)
export const decodeCodexHostEvent = Schema.decodeUnknownEffect(CodexHostEvent)
export const decodeCodexHostEventFixture = Schema.decodeUnknownEffect(CodexHostEventFixture)

export function codexHostEventProvenance(
  event: CodexHostEventType,
  runtime: CodexHookRuntimeMetadataType = {},
): CodexHostEventProvenance {
  const runtimeProvenance = {
    ...(runtime.pluginRoot !== undefined ? { pluginRoot: runtime.pluginRoot } : {}),
    ...(runtime.pluginData !== undefined ? { pluginData: runtime.pluginData } : {}),
  }
  const turnProvenance = 'turn_id' in event ? { turnId: event.turn_id } : {}
  const toolProvenance = event.hook_event_name === 'PreToolUse'
    ? { toolName: event.tool_name, toolUseId: event.tool_use_id }
    : {}

  return new CodexHostEventProvenance({
    eventName: event.hook_event_name,
    sessionId: event.session_id,
    cwd: event.cwd,
    transcriptPath: event.transcript_path,
    ...turnProvenance,
    ...toolProvenance,
    ...runtimeProvenance,
  })
}
