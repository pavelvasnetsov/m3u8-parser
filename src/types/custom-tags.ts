import type { SourcePosition } from "./source.js"

/** Данные, возвращённые обработчиком кастомного тега. */
export interface ParsedCustomTag<TValue = unknown> {
  /** Имя тега. */
  readonly name: string
  /** Значение тега. */
  readonly value: TValue
  /** Позиция тега. */
  readonly position: SourcePosition
  /** URI тега, присутствует только у тегов с собственным URI. */
  readonly uri?: string
}
