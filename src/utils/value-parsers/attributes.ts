import type { ParsedAttribute, Resolution } from "../../types/attributes.js"
import type { SourcePosition } from "../../types/source.js"
import type { ValueContext } from "../../types/values.js"
import { advance, createValueError, startPosition } from "../diagnostics.js"
import { parseDecimalInteger } from "./numbers.js"

/**
 * Парсит список аттрибутов.
 * @param raw - Полный список без двоеточия после тега.
 * @param context - Контекст для ошибки.
 * @returns Атрибуты в исходном порядке с кавычками и позициями.
 * @throws {@link PlaylistParseError} При неверной структуре или повторе имени.
 */
export function parseAttributeList(raw: string, context: ValueContext = {}): ParsedAttribute[] {
  const fail = (offset: number): never => {
    throw createValueError(
      "Expected NAME=value pairs separated by commas, without whitespace",
      "INVALID_ATTRIBUTE_LIST",
      raw,
      context,
      offset,
    )
  }

  const attributes: ParsedAttribute[] = []
  const seen = new Map<string, SourcePosition>()
  const position = context.position ?? startPosition
  let index = 0

  if (!raw.length) fail(0)

  while (index < raw.length) {
    const start = index

    while (index < raw.length && /[A-Z0-9-]/.test(raw[index] ?? "")) index++

    if (index === start || raw[index] !== "=") fail(index)

    const name = raw.slice(start, index)
    const namePosition = advance(position, start)
    const first = seen.get(name)

    if (first)
      throw createValueError(
        "Duplicate attribute",
        "DUPLICATE_ATTRIBUTE",
        raw,
        { ...context, attribute: name },
        start,
        first,
      )

    seen.set(name, namePosition)

    const valueStart = ++index

    if (raw[index] === '"') {
      index++

      while (index < raw.length && raw[index] !== '"') index++

      if (index === raw.length) fail(index)

      index++
      if (index < raw.length && raw[index] !== ",") fail(index)
    } else {
      while (index < raw.length && raw[index] !== ",") {
        if (/[\s"]/.test(raw[index] ?? "")) fail(index)

        index++
      }

      if (index === valueStart) fail(index)
    }

    attributes.push({
      name,
      rawValue: raw.slice(valueStart, index),
      position: namePosition,
      valuePosition: advance(position, valueStart),
    })

    if (index < raw.length && ++index === raw.length) fail(index)
  }
  return attributes
}

/**
 * Парсит строку с двойными кавычками.
 * @param raw - Строка с двойными кавычками.
 * @param context - Контекст для ошибки.
 * @returns Строка без двойных кавычек.
 * @throws {@link PlaylistParseError} При неверном типе значения.
 */
export function parseQuotedString(raw: string, context: ValueContext = {}): string {
  if (/^"[^"\r\n]*"$/.exec(raw)?.[0] !== raw)
    throw createValueError("Expected a quoted string", "INVALID_ATTRIBUTE", raw, context)

  return raw.slice(1, -1)
}

/**
 * Проверяет синтаксис строкого значения из перечисления.
 * @param raw - Значение без кавычек.
 * @param context - Контекст для ошибки.
 * @returns Исходное значение.
 * @throws {@link PlaylistParseError} При неверном типе значения.
 */
export function parseEnumeratedString(raw: string, context: ValueContext = {}): string {
  if (raw.length === 0 || /[",\s]/.test(raw))
    throw createValueError("Expected an enumerated string", "INVALID_ATTRIBUTE", raw, context)
  return raw
}

/**
 * Парсит разрешение.
 * @param raw - Исходная запись в форматие WIDTHxHEIGHT.
 * @param context - Контекст для ошибки.
 * @returns Точные размеры в пикселях.
 * @throws {@link PlaylistParseError} При неверной записи или диапазоне.
 */
export function parseResolution(raw: string, context: ValueContext = {}): Resolution {
  const separator = raw.indexOf("x")
  if (separator < 0)
    throw createValueError("Expected WIDTHxHEIGHT", "INVALID_ATTRIBUTE", raw, context)
  return {
    width: parseDecimalInteger(raw.slice(0, separator), context),
    height: parseDecimalInteger(raw.slice(separator + 1), {
      ...context,
      position: advance(context.position ?? startPosition, separator + 1),
    }),
  }
}
