import type {
  PlaylistParseErrorCode,
  PlaylistParseErrorOptions,
  TagRegistrationErrorCode,
  TagRegistrationErrorOptions,
} from "./types/errors.js"
import type { SourcePosition } from "./types/source.js"

/** Ошибка парсинга. */
export class PlaylistParseError extends Error {
  override readonly name = "PlaylistParseError"
  /** Код ошибки. */
  readonly code: PlaylistParseErrorCode
  /** Номер строки, начиная с 1. */
  readonly line: number
  /** Номер столбца, начиная с 1. */
  readonly column: number
  /** Смещение от начала исходного текста, начиная с 0. */
  readonly offset: number
  /** Связанный с ошибкой тег, если известен. */
  readonly tag?: string
  /** Связанный с ошибкой атрибут, если известен. */
  readonly attribute?: string
  /** Позиция первого объявления, если известна. */
  readonly firstOccurrence?: SourcePosition
  /** Фрагмент исходного текста плейлиста. */
  readonly sourceFragment?: string

  /**
   * Создаёт ошибку.
   * @param message - Описание ошибки.
   * @param options - Дополнительные данные ошибки.
   */
  constructor(message: string, options: PlaylistParseErrorOptions) {
    super(message, options)

    this.code = options.code
    this.line = options.position.line
    this.column = options.position.column
    this.offset = options.position.offset

    if (options.tag !== undefined) this.tag = options.tag

    if (options.attribute !== undefined) this.attribute = options.attribute

    if (options.firstOccurrence !== undefined)
      this.firstOccurrence = Object.freeze({ ...options.firstOccurrence })

    if (options.sourceFragment !== undefined) this.sourceFragment = options.sourceFragment
  }
}

/** Ошибка регистрации тегов. */
export class TagRegistrationError extends Error {
  override readonly name = "TagRegistrationError"
  /** Код ошибки. */
  readonly code: TagRegistrationErrorCode
  /** Имя тега, если известно. */
  readonly tag?: string

  /**
   * Создаёт ошибку.
   * @param message - Описание ошибки регистрации.
   * @param options - Дополнительные данные ошибки.
   */
  constructor(message: string, options: TagRegistrationErrorOptions) {
    super(message, options)

    this.code = options.code

    if (options.tag !== undefined) this.tag = options.tag
  }
}
