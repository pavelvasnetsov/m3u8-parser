import { PlaylistParseError } from "../errors.js"
import type { PlaylistParseErrorCode } from "../types/errors.js"
import type { SourceLine, SourcePosition } from "../types/source.js"
import type { TagDiagnostics } from "../types/tags.js"

import type { ValueContext } from "../types/values.js"

export const startPosition: SourcePosition = Object.freeze({
  line: 1,
  column: 1,
  offset: 0,
})

export function advance(position: SourcePosition, count: number): SourcePosition {
  return {
    line: position.line,
    column: position.column + count,
    offset: position.offset + count,
  }
}

export function createValueError(
  message: string,
  code: PlaylistParseErrorCode,
  raw: string,
  context: ValueContext,
  offset = 0,
  firstOccurrence?: SourcePosition,
): PlaylistParseError {
  return new PlaylistParseError(message, {
    ...context,
    code,
    position: advance(context.position ?? startPosition, offset),
    sourceFragment: raw,
    ...(firstOccurrence === undefined ? {} : { firstOccurrence }),
  })
}

export function createDiagnostics(name: string, line?: SourceLine): TagDiagnostics {
  return {
    createError: (message, details = {}) =>
      new PlaylistParseError(message, {
        ...details,
        code: details.code ?? "INVALID_TAG",
        position: details.position ?? line?.position ?? startPosition,
        tag: name,
        ...(line ? { sourceFragment: line.text } : {}),
      }),
  }
}
