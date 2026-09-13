import { PlaylistParseError } from "../errors.js"
import type { PlaylistParseErrorCode } from "../types/errors.js"
import type { SourceLine, SourcePosition } from "../types/source.js"
import type { TagDiagnostics } from "../types/tags.js"

import type { ValueContext } from "../types/values.js"

/** Начало плейлиста; используется, если позиция не передана. */
export const startPosition: SourcePosition = Object.freeze({
  line: 1,
  column: 1,
  offset: 0,
})

/**
 * Сдвигает позицию внутри одной строки.
 * @param position - Исходная позиция.
 * @param count - Смещение.
 * @returns Новая позиция с тем же номером строки.
 */
export function advance(position: SourcePosition, count: number): SourcePosition {
  return {
    line: position.line,
    column: position.column + count,
    offset: position.offset + count,
  }
}

/**
 * Создаёт ошибку значения с исходным текстом и позицией.
 * @param message - Описание ошибки.
 * @param code - Код ошибки.
 * @param raw - Исходная запись значения.
 * @param context - Контекст для ошибки.
 * @param offset - Смещение от позиции в context внутри той же строки, в единицах UTF-16.
 * @param firstOccurrence - Позиция первого объявления при повторе.
 * @returns Ошибка; функция сама её не выбрасывает.
 */
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

/**
 * Создаёт средство диагностики для обработчика тега.
 * @param name - Имя тега.
 * @param line - Строка для текста и позиции ошибки.
 * @returns Объект с методом createError. Переданные ему детали могут уточнить позицию.
 */
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
