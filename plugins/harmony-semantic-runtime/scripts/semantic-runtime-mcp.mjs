#!/usr/bin/env node
import { Buffer } from 'node:buffer'
import process from 'node:process'
import {
  causeMessage,
  dataRoot,
  importFromRepo,
  importHeadlessRuntime,
  json,
  projectRefInputForCwd,
  requestId,
  runEffect,
  stderrLine,
} from './runtime-env.mjs'

const serverInfo = {
  name: 'harmony-semantic-runtime',
  version: '0.1.0',
}

const tools = [
  {
    name: 'semantic_status',
    description: 'Read Harmony semantic runtime status for the current project.',
    inputSchema: {
      type: 'object',
      properties: {
        request_id: { type: 'string' },
        cwd: { type: 'string' },
        data_root: { type: 'string' },
        project_ref: { type: 'object' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'semantic_get_case',
    description: 'Read a semantic runtime case by case id.',
    inputSchema: {
      type: 'object',
      properties: {
        case_id: { type: 'string' },
        request_id: { type: 'string' },
        cwd: { type: 'string' },
        data_root: { type: 'string' },
        project_ref: { type: 'object' },
      },
      required: ['case_id'],
      additionalProperties: false,
    },
  },
  {
    name: 'semantic_compile_vocabulary_draft',
    description: 'Compile a vocabulary source into a draft and record evidence.',
    inputSchema: {
      type: 'object',
      properties: {
        namespace: { type: 'string' },
        content: { type: 'string' },
        vocabulary_kind: { type: 'string', enum: ['base', 'domain'] },
        operation_id: { type: 'string' },
        request_id: { type: 'string' },
        cwd: { type: 'string' },
        data_root: { type: 'string' },
        project_ref: { type: 'object' },
      },
      required: ['namespace', 'content'],
      additionalProperties: false,
    },
  },
  {
    name: 'semantic_compile_and_publish_vocabulary',
    description: 'Compile and publish a vocabulary source through the semantic runtime.',
    inputSchema: {
      type: 'object',
      properties: {
        namespace: { type: 'string' },
        content: { type: 'string' },
        vocabulary_kind: { type: 'string', enum: ['base', 'domain'] },
        operation_id: { type: 'string' },
        request_id: { type: 'string' },
        cwd: { type: 'string' },
        data_root: { type: 'string' },
        project_ref: { type: 'object' },
      },
      required: ['namespace', 'content'],
      additionalProperties: false,
    },
  },
  {
    name: 'semantic_tool_metadata',
    description: 'Return semantic runtime tool effect metadata.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
]

function runtimeContext(args = {}) {
  const cwd = args.cwd ?? process.cwd()
  return {
    cwd,
    data_root: args.data_root ?? dataRoot(),
    project_ref: args.project_ref ?? projectRefInputForCwd(cwd),
  }
}

function baseRequest(tool, effect, args) {
  const context = runtimeContext(args)
  return {
    tool,
    effect,
    request_id: args.request_id ?? requestId(tool, [context.cwd, Date.now(), Math.random()]),
    data_root: context.data_root,
    project_ref: context.project_ref,
  }
}

function vocabularySource(args) {
  return {
    namespace: args.namespace,
    vocabulary_kind: args.vocabulary_kind ?? 'domain',
    content: args.content,
  }
}

async function callTool(name, args = {}) {
  const { Effect } = await importFromRepo('effect')
  const { SemanticRuntimeFacade } = await importHeadlessRuntime('semantic-runtime-facade.ts')
  const { dispatchSemanticRuntimeMcpToolCall } = await importHeadlessRuntime('semantic-runtime-mcp-dispatcher.ts')

  function dispatch(arguments_) {
    return runEffect(
      Effect.gen(function* () {
        return yield* dispatchSemanticRuntimeMcpToolCall({
          name,
          arguments: arguments_,
        })
      }),
      SemanticRuntimeFacade.layerLive,
    )
  }

  switch (name) {
    case 'semantic_status': {
      return dispatch({
        ...baseRequest(name, 'query', args),
      })
    }
    case 'semantic_get_case': {
      return dispatch({
        ...baseRequest(name, 'query', args),
        case_id: args.case_id,
      })
    }
    case 'semantic_compile_vocabulary_draft': {
      return dispatch({
        ...baseRequest(name, 'evidence_command', args),
        operation_id: args.operation_id ?? requestId('vocabulary-draft-operation', [args.namespace, args.content]),
        vocabulary_source: vocabularySource(args),
      })
    }
    case 'semantic_compile_and_publish_vocabulary': {
      return dispatch({
        ...baseRequest(name, 'authority_command', args),
        operation_id: args.operation_id ?? requestId('vocabulary-publish-operation', [args.namespace, args.content]),
        vocabulary_source: vocabularySource(args),
      })
    }
    case 'semantic_tool_metadata': {
      const { semanticRuntimeToolMetadata } = await importHeadlessRuntime('semantic-runtime-facade.ts')
      return semanticRuntimeToolMetadata()
    }
    default:
      throw new Error(`Unknown tool: ${name}`)
  }
}

function parseMessages(buffer, state) {
  const messages = []
  let offset = 0

  while (offset < buffer.length) {
    const headerEnd = buffer.indexOf('\r\n\r\n', offset)
    if (headerEnd !== -1) {
      const header = buffer.slice(offset, headerEnd).toString('utf8')
      const match = /^Content-Length:\s*(\d+)$/im.exec(header)
      if (match !== null) {
        const length = Number(match[1])
        const bodyStart = headerEnd + 4
        const bodyEnd = bodyStart + length
        if (buffer.length < bodyEnd) {
          break
        }
        state.framed = true
        messages.push(JSON.parse(buffer.slice(bodyStart, bodyEnd).toString('utf8')))
        offset = bodyEnd
        continue
      }
    }

    const newline = buffer.indexOf('\n', offset)
    if (newline === -1) {
      break
    }
    const line = buffer.slice(offset, newline).toString('utf8').trim()
    offset = newline + 1
    if (line.length === 0) {
      continue
    }
    state.framed = false
    messages.push(JSON.parse(line))
  }

  return {
    messages,
    rest: buffer.slice(offset),
  }
}

function writeMessage(message, state) {
  const payload = JSON.stringify(message)
  if (state.framed === true) {
    process.stdout.write(`Content-Length: ${Buffer.byteLength(payload, 'utf8')}\r\n\r\n${payload}`)
    return
  }
  process.stdout.write(`${payload}\n`)
}

function result(id, value) {
  return {
    jsonrpc: '2.0',
    id,
    result: value,
  }
}

function errorResponse(id, code, message, data) {
  return {
    jsonrpc: '2.0',
    id,
    error: {
      code,
      message,
      ...(data === undefined ? {} : { data }),
    },
  }
}

async function handle(message) {
  if (message.id === undefined && typeof message.method === 'string' && message.method.startsWith('notifications/')) {
    return undefined
  }

  switch (message.method) {
    case 'initialize':
      return result(message.id, {
        protocolVersion: message.params?.protocolVersion ?? '2024-11-05',
        capabilities: {
          tools: {},
        },
        serverInfo,
      })
    case 'ping':
      return result(message.id, {})
    case 'tools/list':
      return result(message.id, { tools })
    case 'tools/call': {
      const name = message.params?.name
      const args = message.params?.arguments ?? {}
      try {
        const output = await callTool(name, args)
        return result(message.id, {
          content: [
            {
              type: 'text',
              text: json(output),
            },
          ],
          isError: false,
        })
      }
      catch (error) {
        return result(message.id, {
          content: [
            {
              type: 'text',
              text: causeMessage(error),
            },
          ],
          isError: true,
        })
      }
    }
    default:
      return errorResponse(message.id, -32601, `Method not found: ${message.method}`)
  }
}

async function main() {
  const state = { framed: undefined }
  let buffer = Buffer.alloc(0)
  for await (const chunk of process.stdin) {
    buffer = Buffer.concat([buffer, chunk])
    const parsed = parseMessages(buffer, state)
    buffer = parsed.rest
    for (const message of parsed.messages) {
      const response = await handle(message)
      if (response !== undefined) {
        writeMessage(response, state)
      }
    }
  }
}

main().catch((error) => {
  stderrLine(`SEMANTIC_RUNTIME_MCP_ERROR: ${causeMessage(error)}`)
  process.exitCode = 1
})
