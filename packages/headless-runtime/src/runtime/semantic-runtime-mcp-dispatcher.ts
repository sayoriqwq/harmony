import {
  compileAndPublishVocabularyCommandFromMcp,
  compileVocabularyDraftCommandFromMcp,
  getCaseQueryFromMcp,
  SemanticRuntimeFacade,
  statusQueryFromMcp,
} from '@harmony/headless-runtime/runtime/semantic-runtime-facade'
import {
  SemanticRuntimeCompileAndPublishVocabularyResponse,
  SemanticRuntimeCompileVocabularyDraftResponse,
  SemanticRuntimeGetCaseResponse,
  SemanticRuntimeStatusResponse,
} from '@harmony/semantic-model/schema/runtime-facade'
import { Effect, Schema } from 'effect'

const ToolArgumentsSchema = Schema.Record(Schema.String, Schema.Json)

type ToolArguments = typeof ToolArgumentsSchema.Type

export class SemanticRuntimeMcpToolCall extends Schema.Class<SemanticRuntimeMcpToolCall>(
  'harmony.headless-runtime/SemanticRuntimeMcpToolCall',
)({
  name: Schema.NonEmptyString,
  arguments: Schema.optionalKey(ToolArgumentsSchema),
}) {}

export class SemanticRuntimeMcpDispatchError extends Schema.TaggedErrorClass<SemanticRuntimeMcpDispatchError>()(
  'SemanticRuntimeMcpDispatchError',
  {
    reason: Schema.Literal('unknown_tool'),
    toolName: Schema.NonEmptyString,
    message: Schema.NonEmptyString,
  },
) {}

function requestEnvelope(
  name: string,
  effect: 'query' | 'evidence_command' | 'authority_command',
  input: ToolArguments | undefined,
) {
  return {
    ...input,
    tool: name,
    effect,
  }
}

function encodeStatusResponse(response: SemanticRuntimeStatusResponse) {
  return Schema.encodeUnknownEffect(SemanticRuntimeStatusResponse)(response).pipe(
    Effect.flatMap(Schema.decodeUnknownEffect(Schema.Json)),
  )
}

function encodeGetCaseResponse(response: SemanticRuntimeGetCaseResponse) {
  return Schema.encodeUnknownEffect(SemanticRuntimeGetCaseResponse)(response).pipe(
    Effect.flatMap(Schema.decodeUnknownEffect(Schema.Json)),
  )
}

function encodeCompileVocabularyDraftResponse(response: SemanticRuntimeCompileVocabularyDraftResponse) {
  return Schema.encodeUnknownEffect(SemanticRuntimeCompileVocabularyDraftResponse)(response).pipe(
    Effect.flatMap(Schema.decodeUnknownEffect(Schema.Json)),
  )
}

function encodeCompileAndPublishVocabularyResponse(response: SemanticRuntimeCompileAndPublishVocabularyResponse) {
  return Schema.encodeUnknownEffect(SemanticRuntimeCompileAndPublishVocabularyResponse)(response).pipe(
    Effect.flatMap(Schema.decodeUnknownEffect(Schema.Json)),
  )
}

export const dispatchSemanticRuntimeMcpToolCall = Effect.fn('dispatchSemanticRuntimeMcpToolCall')(
  function* (call: unknown) {
    const decoded = yield* Schema.decodeUnknownEffect(SemanticRuntimeMcpToolCall)(call)

    switch (decoded.name) {
      case 'semantic_status': {
        const facade = yield* SemanticRuntimeFacade
        const query = yield* statusQueryFromMcp(requestEnvelope(decoded.name, 'query', decoded.arguments))
        const response = yield* facade.status(query)
        return yield* encodeStatusResponse(response)
      }
      case 'semantic_get_case': {
        const facade = yield* SemanticRuntimeFacade
        const query = yield* getCaseQueryFromMcp(requestEnvelope(decoded.name, 'query', decoded.arguments))
        const response = yield* facade.getCase(query)
        return yield* encodeGetCaseResponse(response)
      }
      case 'semantic_compile_vocabulary_draft': {
        const facade = yield* SemanticRuntimeFacade
        const command = yield* compileVocabularyDraftCommandFromMcp(
          requestEnvelope(decoded.name, 'evidence_command', decoded.arguments),
        )
        const response = yield* facade.compileVocabularyDraft(command)
        return yield* encodeCompileVocabularyDraftResponse(response)
      }
      case 'semantic_compile_and_publish_vocabulary': {
        const facade = yield* SemanticRuntimeFacade
        const command = yield* compileAndPublishVocabularyCommandFromMcp(
          requestEnvelope(decoded.name, 'authority_command', decoded.arguments),
        )
        const response = yield* facade.compileAndPublishVocabulary(command)
        return yield* encodeCompileAndPublishVocabularyResponse(response)
      }
      default:
        return yield* new SemanticRuntimeMcpDispatchError({
          reason: 'unknown_tool',
          toolName: decoded.name,
          message: `Unknown semantic runtime MCP tool: ${decoded.name}`,
        })
    }
  },
)
