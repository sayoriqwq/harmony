#!/usr/bin/env node
import process from 'node:process'
import {
  causeMessage,
  dataRoot,
  hookContext,
  importFromRepo,
  importHeadlessRuntime,
  importSemanticSchema,
  isManagedProject,
  json,
  operationId,
  projectRefForCwd,
  readStdinJson,
  runEffect,
  stderrLine,
  unwrapHostFixture,
} from './runtime-env.mjs'

async function decodeEvent(payload) {
  const hostEvent = await importSemanticSchema('host-event.ts')
  if (payload.tool_name === 'apply_patch') {
    return runEffect(hostEvent.decodeCodexPreToolUseApplyPatchEvent(payload))
  }
  if (typeof payload.tool_name === 'string' && payload.tool_name.startsWith('mcp__')) {
    return runEffect(hostEvent.decodeCodexPreToolUseMcpEvent(payload))
  }
  if (payload.tool_name === 'Bash') {
    return runEffect(hostEvent.decodeCodexPreToolUseBashEvent(payload))
  }
  return undefined
}

function blockMessage(decision) {
  if (decision.decisionKind === 'deny') {
    return [
      `SEMANTIC_RUNTIME_DENY: ${decision.reason}`,
      `toolName: ${decision.toolName}`,
      `attemptedAction: ${decision.attemptedAction}`,
      decision.caseId === undefined ? undefined : `caseId: ${decision.caseId}`,
      decision.integrationHealth === undefined ? undefined : `integrationHealth: ${decision.integrationHealth.status}`,
    ].filter(Boolean).join('\n')
  }
  if (decision.decisionKind === 'defer') {
    return [
      `SEMANTIC_RUNTIME_DEFER: ${decision.reason}`,
      `toolName: ${decision.toolName}`,
      `retryAfterMs: ${decision.retryAfterMs}`,
    ].join('\n')
  }
  return undefined
}

function allowContext(decision) {
  if (decision.decisionKind !== 'allow') {
    return undefined
  }
  return hookContext('Harmony action gate', [
    ['decision', 'allow'],
    ['reason', decision.reason],
    ['supportedPath', decision.supportedPath],
  ])
}

async function main() {
  const raw = await readStdinJson()
  if (raw === undefined) {
    return
  }

  const { payload, runtime } = unwrapHostFixture(raw)
  const event = await decodeEvent(payload)
  if (event === undefined) {
    return
  }

  const { Effect } = await importFromRepo('effect')
  const { ActionGate } = await importHeadlessRuntime('action-gate.ts')
  const request = {
    dataRoot: dataRoot(runtime),
    projectRef: projectRefForCwd(event.cwd),
    managedProject: isManagedProject(event.cwd),
    operationId: operationId('pre-tool', [
      event.session_id,
      event.turn_id,
      event.tool_use_id,
      event.tool_name,
    ]),
    event,
  }
  const decision = await runEffect(
    Effect.gen(function* () {
      const gate = yield* ActionGate
      return yield* gate.evaluate(request)
    }),
    ActionGate.layerLive,
  )

  const block = blockMessage(decision)
  if (block !== undefined) {
    stderrLine(block)
    process.exitCode = 2
    return
  }

  const ctx = allowContext(decision)
  if (ctx !== undefined) {
    process.stdout.write(`${json({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'allow',
        additionalContext: ctx,
      },
    })}\n`)
  }
}

main().catch((error) => {
  stderrLine(`SEMANTIC_RUNTIME_ERROR: ${causeMessage(error)}`)
  process.exitCode = 2
})
