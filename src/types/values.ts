import type { SourcePosition } from "./source.js"

/** Исходная позиция и необязательный контекст разбираемого значения. */
export interface ValueContext {
  /** Позиция первого символа значения; по умолчанию начало документа. */
  readonly position?: SourcePosition
  /** Имя тега для диагностики. */
  readonly tag?: string
  /** Имя атрибута для диагностики. */
  readonly attribute?: string
}

/** Десятичное число и его исходная запись. */
export interface DecimalValue {
  /** Конечное значение JavaScript; возможна двоичная погрешность. */
  readonly value: number
  /** Неизменённая десятичная запись. */
  readonly raw: string
}
