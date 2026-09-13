import fastUri from "fast-uri"
import type { ValueContext } from "../../types/values.js"
import { createValueError } from "../diagnostics.js"

/**
 * Валидирует URI.
 * @param raw - URI.
 * @param context - Контекст для ошибки.
 * @returns Исходная строка raw.
 * @throws {@link PlaylistParseError} Если fast-uri сообщает об ошибке.
 */
export function validateUri(raw: string, context: ValueContext = {}): string {
  const { error } = fastUri.parse(raw, { scheme: "null" })

  if (error !== undefined) throw createValueError(error, "INVALID_URI", raw, context)

  return raw
}
