import { Schema } from 'effect'

export class NodeFileSystemError extends Schema.TaggedErrorClass<NodeFileSystemError>()(
  'NodeFileSystemError',
  {
    cause: Schema.Defect(),
  },
) {}

export function nodeFileSystemError(cause: unknown): NodeFileSystemError {
  return new NodeFileSystemError({ cause })
}

export function causeMessage(cause: unknown): string {
  const innerCause = cause instanceof NodeFileSystemError ? cause.cause : cause
  return innerCause instanceof Error ? innerCause.message : String(innerCause)
}

export function hasErrorCode(cause: unknown, code: string): boolean {
  const innerCause = cause instanceof NodeFileSystemError ? cause.cause : cause
  return innerCause instanceof Error && 'code' in innerCause && innerCause.code === code
}
