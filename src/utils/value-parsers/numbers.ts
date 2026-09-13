import type { DecimalValue, ValueContext } from "../../types/values.js"
import { createValueError } from "../diagnostics.js"

/**
 * Парсит строку как целое число uint64.
 * @param raw - Исходная запись числа.
 * @param context - Контекст для ошибки.
 * @returns Положительное целое число.
 * @throws {@link PlaylistParseError} Если некорретная запись.
 */
export function parseDecimalInteger(raw: string, context: ValueContext = {}): bigint {
  const value = BigInt(raw)

  if (raw.length === 0 || raw.length > 20 || /[^0-9]/.test(raw) || value > 18446744073709551615n) {
    throw createValueError("Expected a decimal uint64", "INVALID_NUMBER", raw, context)
  }

  return value
}

/**
 * Парсит версию.
 * @param raw - Исходная запись версии.
 * @param context - Контекст для ошибки.
 * @returns Положительное целое число.
 * @throws {@link PlaylistParseError} Если некорретная запись.
 */
export function parseVersion(raw: string, context: ValueContext = {}): number {
  const value = Number(raw)

  if (raw.length === 0 || /[^0-9]/.test(raw) || !Number.isSafeInteger(value) || value <= 0) {
    throw createValueError(
      "Expected a positive safe integer version",
      "INVALID_NUMBER",
      raw,
      context,
    )
  }

  return value
}

/**
 * Парсит неотрицательную дробь.
 * @param raw - Исходная запись числа.
 * @param context - Контекст для ошибки.
 * @returns Число и исходная запись.
 * @throws {@link PlaylistParseError} Если некорретная запись.
 */
export function parseDecimalFloatingPoint(raw: string, context: ValueContext = {}): DecimalValue {
  const value = Number(raw)
  if (
    /[^0-9.]/.test(raw) ||
    !/^(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+)$/.test(raw) ||
    !Number.isFinite(value) ||
    (value === 0 && /[1-9]/.test(raw))
  ) {
    throw createValueError("Expected a finite nonnegative decimal", "INVALID_NUMBER", raw, context)
  }
  return { value, raw }
}
