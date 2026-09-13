import { PlaylistParseError } from "../errors.js"
import type { SourceLine } from "../types/source.js"
import { startPosition } from "./diagnostics.js"

/**
 * Вызывает обработчик и дополняет его ошибки контекстом тега.
 * @param name - Имя тега.
 * @param line - Исходная строка, если она известна.
 * @param callback - Синхронный обработчик.
 * @returns Результат обработчика.
 * @throws {@link PlaylistParseError} С исходной ошибкой в cause, код и позиция ошибки парсинга сохраняются.
 */
export function invoke<T>(name: string, line: SourceLine | undefined, callback: () => T): T {
  try {
    return callback()
  } catch (cause) {
    if (cause instanceof PlaylistParseError) {
      throw new PlaylistParseError(cause.message, {
        code: cause.code,
        position: { line: cause.line, column: cause.column, offset: cause.offset },
        tag: name,
        cause,
        ...(cause.attribute === undefined ? {} : { attribute: cause.attribute }),
        ...(cause.firstOccurrence === undefined ? {} : { firstOccurrence: cause.firstOccurrence }),
        ...(cause.sourceFragment === undefined
          ? line
            ? { sourceFragment: line.text }
            : {}
          : { sourceFragment: cause.sourceFragment }),
      })
    }

    throw new PlaylistParseError(`Handler for ${name} failed`, {
      code: "TAG_HANDLER_ERROR",
      tag: name,
      position: line?.position ?? startPosition,
      cause,
      ...(line ? { sourceFragment: line.text } : {}),
    })
  }
}
