import { readFile } from 'node:fs/promises'
import { assert, describe, it } from '@effect/vitest'
import {
  codexHostEventProvenance,
  decodeCodexHostEvent,
  decodeCodexHostEventFixture,
  decodeCodexPreToolUseApplyPatchEvent,
  decodeCodexPreToolUseBashEvent,
  decodeCodexPreToolUseMcpEvent,
  decodeCodexSessionStartEvent,
  decodeCodexUserPromptSubmitEvent,
} from '@harmony/semantic-model/schema/host-event'
import { Effect } from 'effect'

const fixtureNames = [
  'user-prompt-submit.json',
  'pre-tool-use-bash.json',
  'pre-tool-use-mcp.json',
  'session-start.json',
] as const

type FixtureName = (typeof fixtureNames)[number]

function fixtureUrl(name: FixtureName) {
  return new URL(`../../../../fixtures/hooks/${name}`, import.meta.url)
}

const readRawFixture = Effect.fn('readRawFixture')(function* (name: FixtureName) {
  const raw = yield* Effect.promise(() => readFile(fixtureUrl(name), 'utf8'))
  return JSON.parse(raw) as unknown
})

const readDecodedFixture = Effect.fn('readDecodedFixture')(function* (name: FixtureName) {
  const raw = yield* readRawFixture(name)
  return yield* decodeCodexHostEventFixture(raw)
})

function decodeFails(effect: Effect.Effect<unknown, unknown>) {
  return effect.pipe(
    Effect.map(() => false),
    Effect.catch(() => Effect.succeed(true)),
  )
}

describe('Codex host event codec fixtures', () => {
  it.effect('decodes each fixture with the host event and event-specific decoders', () =>
    Effect.gen(function* () {
      for (const name of fixtureNames) {
        const fixture = yield* readDecodedFixture(name)
        yield* decodeCodexHostEvent(fixture.payload)
      }

      const userPrompt = yield* readDecodedFixture('user-prompt-submit.json')
      const decodedUserPrompt = yield* decodeCodexUserPromptSubmitEvent(userPrompt.payload)
      assert.strictEqual(decodedUserPrompt.hook_event_name, 'UserPromptSubmit')
      assert.strictEqual(decodedUserPrompt.turn_id, 'codex-turn:prompt-001')
      assert.strictEqual(decodedUserPrompt.prompt, 'check this document; do not edit it')

      const bashTool = yield* readDecodedFixture('pre-tool-use-bash.json')
      const decodedBashTool = yield* decodeCodexPreToolUseBashEvent(bashTool.payload)
      assert.strictEqual(decodedBashTool.hook_event_name, 'PreToolUse')
      assert.strictEqual(decodedBashTool.tool_name, 'Bash')
      assert.strictEqual(decodedBashTool.tool_input.command, 'pnpm test')

      const mcpTool = yield* readDecodedFixture('pre-tool-use-mcp.json')
      const decodedMcpTool = yield* decodeCodexPreToolUseMcpEvent(mcpTool.payload)
      assert.strictEqual(decodedMcpTool.hook_event_name, 'PreToolUse')
      assert.strictEqual(decodedMcpTool.tool_name, 'mcp__semantic_runtime__semantic_status')
      assert.strictEqual(decodedMcpTool.tool_input.includeLedger, false)

      const sessionStart = yield* readDecodedFixture('session-start.json')
      const decodedSessionStart = yield* decodeCodexSessionStartEvent(sessionStart.payload)
      assert.strictEqual(decodedSessionStart.hook_event_name, 'SessionStart')
      assert.strictEqual(decodedSessionStart.source, 'startup')
    }))

  it.effect('accepts apply_patch PreToolUse payloads without an inline patch field', () =>
    Effect.gen(function* () {
      const bashTool = yield* readDecodedFixture('pre-tool-use-bash.json')
      const decodedApplyPatch = yield* decodeCodexPreToolUseApplyPatchEvent({
        ...bashTool.payload,
        tool_name: 'apply_patch',
        tool_use_id: 'codex-tool:apply-patch-without-patch',
        tool_input: {},
      })

      assert.strictEqual(decodedApplyPatch.tool_name, 'apply_patch')
      assert.strictEqual(decodedApplyPatch.tool_input.patch, undefined)
    }))

  it.effect('ignores unknown fixture, payload, runtime, and tool input fields', () =>
    Effect.gen(function* () {
      const raw = (yield* readRawFixture('pre-tool-use-bash.json')) as Record<string, unknown>
      const payload = raw.payload as Record<string, unknown>
      const toolInput = payload.tool_input as Record<string, unknown>
      const runtime = raw.runtime as Record<string, unknown>

      const decoded = yield* decodeCodexHostEventFixture({
        ...raw,
        fixtureCapturedAt: '2026-06-25T00:00:00.000Z',
        payload: {
          ...payload,
          unexpected_host_field: 'ignored',
          tool_input: {
            ...toolInput,
            workdir: '/tmp/ignored',
          },
        },
        runtime: {
          ...runtime,
          ignoredEnvironmentField: true,
        },
      })

      assert.strictEqual('fixtureCapturedAt' in decoded, false)
      assert.strictEqual('unexpected_host_field' in decoded.payload, false)
      assert.strictEqual('ignoredEnvironmentField' in decoded.runtime, false)
      if (decoded.payload.hook_event_name !== 'PreToolUse' || decoded.payload.tool_name !== 'Bash') {
        assert.fail('Expected decoded Bash PreToolUse payload')
      }
      assert.strictEqual('workdir' in decoded.payload.tool_input, false)
      assert.strictEqual(decoded.payload.tool_input.command, 'pnpm test')
    }))

  it.effect('rejects malformed required fields for each supported event shape', () =>
    Effect.gen(function* () {
      const userPrompt = yield* readDecodedFixture('user-prompt-submit.json')
      const bashTool = yield* readDecodedFixture('pre-tool-use-bash.json')
      const mcpTool = yield* readDecodedFixture('pre-tool-use-mcp.json')
      const sessionStart = yield* readDecodedFixture('session-start.json')

      const malformedUserPromptFailed = yield* decodeFails(decodeCodexUserPromptSubmitEvent({
        ...userPrompt.payload,
        prompt: 42,
      }))
      const malformedBashToolFailed = yield* decodeFails(decodeCodexPreToolUseBashEvent({
        ...bashTool.payload,
        tool_input: {
          command: 42,
        },
      }))
      const malformedMcpToolFailed = yield* decodeFails(decodeCodexPreToolUseMcpEvent({
        ...mcpTool.payload,
        tool_name: 'semantic_status',
      }))
      const malformedSessionStartFailed = yield* decodeFails(decodeCodexSessionStartEvent({
        ...sessionStart.payload,
        source: 'warm',
      }))
      const malformedCommonFieldFailed = yield* decodeFails(decodeCodexHostEvent({
        ...sessionStart.payload,
        session_id: 42,
      }))

      assert.strictEqual(malformedUserPromptFailed, true)
      assert.strictEqual(malformedBashToolFailed, true)
      assert.strictEqual(malformedMcpToolFailed, true)
      assert.strictEqual(malformedSessionStartFailed, true)
      assert.strictEqual(malformedCommonFieldFailed, true)
    }))

  it.effect('projects host ids and paths only as provenance metadata', () =>
    Effect.gen(function* () {
      const userPrompt = yield* readDecodedFixture('user-prompt-submit.json')
      const bashTool = yield* readDecodedFixture('pre-tool-use-bash.json')
      const mcpTool = yield* readDecodedFixture('pre-tool-use-mcp.json')
      const sessionStart = yield* readDecodedFixture('session-start.json')

      const userPromptPayload = yield* decodeCodexUserPromptSubmitEvent(userPrompt.payload)
      const userPromptProvenance = codexHostEventProvenance(userPromptPayload, userPrompt.runtime)
      assert.deepStrictEqual(Object.keys(userPromptProvenance).sort(), [
        'cwd',
        'eventName',
        'pluginData',
        'pluginRoot',
        'sessionId',
        'transcriptPath',
        'turnId',
      ])
      assert.strictEqual(userPromptProvenance.sessionId, userPromptPayload.session_id)
      assert.strictEqual(userPromptProvenance.turnId, userPromptPayload.turn_id)
      assert.strictEqual(userPromptProvenance.cwd, userPromptPayload.cwd)
      assert.strictEqual(userPromptProvenance.transcriptPath, userPromptPayload.transcript_path)
      assert.strictEqual(userPromptProvenance.pluginRoot, userPrompt.runtime.pluginRoot)
      assert.strictEqual(userPromptProvenance.pluginData, userPrompt.runtime.pluginData)
      assert.strictEqual('prompt' in userPromptProvenance, false)
      assert.strictEqual('caseId' in userPromptProvenance, false)
      assert.strictEqual('projectId' in userPromptProvenance, false)

      const bashToolProvenance = codexHostEventProvenance(bashTool.payload, bashTool.runtime)
      assert.deepStrictEqual(Object.keys(bashToolProvenance).sort(), [
        'cwd',
        'eventName',
        'pluginData',
        'pluginRoot',
        'sessionId',
        'toolName',
        'toolUseId',
        'transcriptPath',
        'turnId',
      ])
      assert.strictEqual(bashToolProvenance.toolName, 'Bash')
      assert.strictEqual(bashToolProvenance.toolUseId, 'codex-tool:bash-001')
      assert.strictEqual('toolInput' in bashToolProvenance, false)

      const mcpToolProvenance = codexHostEventProvenance(mcpTool.payload, mcpTool.runtime)
      assert.strictEqual(mcpToolProvenance.toolName, 'mcp__semantic_runtime__semantic_status')
      assert.strictEqual(mcpToolProvenance.toolUseId, 'codex-tool:mcp-001')
      assert.strictEqual('toolInput' in mcpToolProvenance, false)

      const sessionStartProvenance = codexHostEventProvenance(sessionStart.payload, sessionStart.runtime)
      assert.deepStrictEqual(Object.keys(sessionStartProvenance).sort(), [
        'cwd',
        'eventName',
        'pluginData',
        'pluginRoot',
        'sessionId',
        'transcriptPath',
      ])
      assert.strictEqual('turnId' in sessionStartProvenance, false)
      assert.strictEqual('toolName' in sessionStartProvenance, false)
      assert.strictEqual('toolUseId' in sessionStartProvenance, false)
    }))
})
