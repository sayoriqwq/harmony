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
  requestId,
  runEffect,
  stderrLine,
  unwrapHostFixture,
} from './runtime-env.mjs'

function responseContext(response) {
  const result = response.result
  if (result.decisionKind === 'pass' || result.decisionKind === 'clarificationResolved') {
    return hookContext('Harmony semantic runtime', [
      ['decision', result.decisionKind],
      ['caseId', result.caseId],
      ['action', result.action],
      ['prohibitedActions', result.prohibitedActions],
      ['environmentRef', result.environmentRef],
    ])
  }
  if (result.decisionKind === 'noop') {
    return hookContext('Harmony semantic runtime', [
      ['decision', 'noop'],
      ['reason', result.reason],
      ['projectId', result.projectRef.projectId],
    ])
  }
  return undefined
}

function blockMessage(response) {
  const result = response.result
  if (result.decisionKind === 'blockClarify') {
    const options = result.candidates
      .map(candidate => `- ${candidate.candidateId}: ${candidate.label}`)
      .join('\n')
    return [
      `SEMANTIC_RUNTIME_BLOCK_CLARIFY: ${result.question}`,
      `caseId: ${result.caseId}`,
      `questionId: ${result.questionId}`,
      options,
    ].filter(line => line.length > 0).join('\n')
  }
  if (result.decisionKind === 'block') {
    return [
      `SEMANTIC_RUNTIME_BLOCK: ${result.reason}`,
      `projectId: ${result.projectRef.projectId}`,
      `integrationHealth: ${result.integrationHealth?.status ?? 'unknown'}`,
    ].join('\n')
  }
  if (result.decisionKind === 'clarificationCanceled' || result.decisionKind === 'clarificationMaxAttemptsReached') {
    return `SEMANTIC_RUNTIME_BLOCK: ${result.decisionKind} for case ${result.caseId}`
  }
  return undefined
}

async function main() {
  const raw = await readStdinJson()
  if (raw === undefined) {
    return
  }

  const { payload, runtime } = unwrapHostFixture(raw)
  const { decodeCodexUserPromptSubmitEvent } = await importSemanticSchema('host-event.ts')
  const { SemanticRuntimeFacade } = await importHeadlessRuntime('semantic-runtime-facade.ts')
  const event = await runEffect(decodeCodexUserPromptSubmitEvent(payload))
  const cwd = event.cwd
  const { Effect } = await importFromRepo('effect')
  const command = {
    requestId: requestId('user-prompt', [event.session_id, event.turn_id, event.prompt]),
    dataRoot: dataRoot(runtime),
    projectRef: projectRefForCwd(cwd),
    managedProject: isManagedProject(cwd),
    operationId: operationId('user-prompt', [event.session_id, event.turn_id]),
    hostEvent: event,
  }
  const evaluation = await runEffect(
    Effect.gen(function* () {
      const facade = yield* SemanticRuntimeFacade
      return yield* facade.evaluateAndRecordPrompt(command)
    }),
    SemanticRuntimeFacade.layerLive,
  )

  const block = blockMessage(evaluation)
  if (block !== undefined) {
    stderrLine(block)
    process.exitCode = 2
    return
  }

  const ctx = responseContext(evaluation)
  if (ctx !== undefined) {
    process.stdout.write(`${json({
      hookSpecificOutput: {
        hookEventName: 'UserPromptSubmit',
        additionalContext: ctx,
      },
    })}\n`)
  }
}

main().catch((error) => {
  stderrLine(`SEMANTIC_RUNTIME_ERROR: ${causeMessage(error)}`)
  process.exitCode = 2
})
