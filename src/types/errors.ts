import type { SourcePosition } from "./source.js"

/** Коды ошибок парсинга плейлиста. */
export type PlaylistParseErrorCode =
  | "INVALID_HEADER"
  | "INVALID_TEXT"
  | "INVALID_TAG"
  | "INVALID_ATTRIBUTE_LIST"
  | "DUPLICATE_ATTRIBUTE"
  | "MISSING_ATTRIBUTE"
  | "INVALID_ATTRIBUTE"
  | "INVALID_NUMBER"
  | "INVALID_URI"
  | "DUPLICATE_TAG"
  | "MIXED_PLAYLIST_TYPES"
  | "MISSING_URI"
  | "UNEXPECTED_URI"
  | "CONFLICTING_URI"
  | "INCOMPATIBLE_VERSION"
  | "INCONSISTENT_CLOSED_CAPTIONS"
  | "UNAPPLIED_EXTENSION"
  | "TAG_HANDLER_ERROR"

/** Коды ошибок регистрации кастомных тегов. */
export type TagRegistrationErrorCode =
  | "INVALID_TAG_NAME"
  | "DUPLICATE_TAG_NAME"
  | "RESERVED_TAG_NAME"
  | "INVALID_TAG_DEFINITION"

/** Дополнительные сведения об ошибке парсинга плейлиста. */
export interface PlaylistParseErrorOptions extends ErrorOptions {
  /** Код ошибки. */
  readonly code: PlaylistParseErrorCode
  /** Позиция причины ошибки. */
  readonly position: SourcePosition
  /** Имя тега, если применимо. */
  readonly tag?: string
  /** Имя атрибута, если применимо. */
  readonly attribute?: string
  /** Позиция первого объявления при дублировании или конфликте. */
  readonly firstOccurrence?: SourcePosition
  /** Диагностический фрагмент. */
  readonly sourceFragment?: string
}

/** Дополнительные сведения об ошибке регистрации кастомного тега. */
export interface TagRegistrationErrorOptions extends ErrorOptions {
  /** Код ошибки. */
  readonly code: TagRegistrationErrorCode
  /** Имя тега, если задано. */
  readonly tag?: string
}
