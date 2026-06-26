import * as PlatformError from 'effect/PlatformError'

function errnoCode(cause: unknown): unknown {
  return cause instanceof Error && 'code' in cause ? cause.code : undefined
}

function errnoSyscall(cause: unknown): string | undefined {
  return cause instanceof Error && 'syscall' in cause && typeof cause.syscall === 'string'
    ? cause.syscall
    : undefined
}

function systemErrorTag(cause: unknown): PlatformError.SystemErrorTag {
  switch (errnoCode(cause)) {
    case 'EEXIST':
      return 'AlreadyExists'
    case 'ENOENT':
      return 'NotFound'
    case 'EACCES':
      return 'PermissionDenied'
    case 'EISDIR':
    case 'ENOTDIR':
    case 'ELOOP':
      return 'BadResource'
    case 'EBUSY':
      return 'Busy'
    default:
      return 'Unknown'
  }
}

export function nodeFileSystemError(
  method: string,
  pathOrDescriptor: string | number,
): (cause: unknown) => PlatformError.PlatformError {
  return cause =>
    PlatformError.systemError({
      _tag: systemErrorTag(cause),
      module: 'FileSystem',
      method,
      pathOrDescriptor,
      syscall: errnoSyscall(cause),
      cause,
    })
}

export function causeMessage(cause: unknown): string {
  const innerCause = cause instanceof PlatformError.PlatformError ? cause.cause : cause
  return innerCause instanceof Error ? innerCause.message : String(innerCause)
}

export function hasErrorCode(cause: unknown, code: string): boolean {
  const innerCause = cause instanceof PlatformError.PlatformError ? cause.cause : cause
  return innerCause instanceof Error && 'code' in innerCause && innerCause.code === code
}
