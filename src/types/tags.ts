import type { PlaylistContext } from "../components/PlaylistContext.js"
import type { PlaylistParseError } from "../errors.js"
import type { PlaylistParseErrorCode } from "./errors.js"
import type { Playlist, PlaylistInfo } from "./playlist.js"
import type { SourceLine, SourcePosition } from "./source.js"

/** Строка тега с данными и позицией в плейлисте. */
export interface TagLine extends SourceLine {
  /** Имя тега без символа #. */
  readonly name: string
  /** Данные после двоеточия, пустая строка, если двоеточия нет. */
  readonly payload: string
  /** Позиция после двоеточия либо в конце строки, если двоеточия нет. */
  readonly payloadPosition: SourcePosition
}

/** Виды плейлистов, в которых разрешён тег. */
export type TagPlaylistType = "both" | "master" | "media"

/** Допустимость повторного появления тега в одном плейлисте. */
export type TagMultiplicity = "single" | "repeatable"

/** Область, в которую может быть помещен тег. */
export type TagScope = "playlist" | "uri" | "next-segment" | "persistent-segment"

/** Детали ошибки тега. */
export interface TagErrorDetails extends ErrorOptions {
  /** Код ошибки. */
  readonly code?: PlaylistParseErrorCode
  /** Позиция причины ошибки. */
  readonly position?: SourcePosition
  /** Атрибут, вызвавший ошибку. */
  readonly attribute?: string
  /** Позиция более раннего объявления при дублировании или конфликте. */
  readonly firstOccurrence?: SourcePosition
}

/** Средство диагностики. */
export interface TagDiagnostics {
  /**
   * Создаёт ошибку с именем текущего тега и контекстом.
   * @param message - Описание ошибки.
   * @param details - Детали ошибки.
   * @returns Ошибка парсинга с контекстом,сам вызов метода её не выбрасывает.
   */
  createError(message: string, details?: TagErrorDetails): PlaylistParseError
}

/** Контекст тега, передаваемый parse. */
export interface TagContext<TState = unknown> extends TagDiagnostics {
  /** Позиция тега. */
  readonly position: SourcePosition
  /** Позиция сразу после двоеточия либо в конце строки, если двоеточия нет. */
  readonly payloadPosition: SourcePosition
  /** Данные плейлиста. */
  readonly playlistInfo: PlaylistInfo
  /** Состояние тега. */
  readonly state: TState
  /**
   * Регистрирует требование к версии.
   * @param version - Минимальная версия протокола.
   */
  requireVersion(version: number): void
}

/** Контекст итоговой проверки после чтения всех строк и проверки структуры. */
export interface TagFinalizeContext<TState = unknown> extends TagDiagnostics {
  /** Позиция первого появления тега. */
  readonly firstOccurrence?: SourcePosition
  /** Готовый плейлист. */
  readonly playlist: Playlist
  /** Состояние тега. */
  readonly state: TState
}

/**
 * Метаданные и поведение кастомного тега.
 *
 *
 * @typeParam TValue - Значение, добавляемое в результат парсинга.
 * @typeParam TState - Изменяемое состояние тега в пределах одного плейлиста.
 * @example
 * ```ts
 * const assetIdTag: TagDefinition<string> = {
 *   name: "EXT-X-ASSET-ID",
 *   playlistType: "both",
 *   multiplicity: "single",
 *   scope: "playlist",
 *   parse(payload) { return payload },
 * }
 * ```
 */
export type TagDefinition<TValue = unknown, TState = undefined> = {
  /** Имя с учётом регистра по шаблону EXT[A-Z0-9-]*, без начального символа #. */
  readonly name: string
  /** Вид плейлиста, определяемый или допускаемый этим тегом. */
  readonly playlistType: TagPlaylistType
  /** Допустимость повторного появления тега в одном плейлисте. */
  readonly multiplicity: TagMultiplicity
  /** Область размещения возвращённого значения. */
  readonly scope: TagScope
  /**
   * Разбирает содержимое одного тега.
   * @param payload - Исходный текст после первого двоеточия либо пустая строка.
   * @param context - Контекст тега.
   * @returns Значение тега.
   * @throws {@link PlaylistParseError} Если содержимое тега некорректно.
   */
  readonly parse: (payload: string, context: TagContext<TState>) => TValue
  /**
   * Проверяет готовый плейлист, в том числе при отсутствии в нём этого тега.
   * @param context - Контекст итоговой проверки.
   * @throws {@link PlaylistParseError} Если нарушено ограничение для всего документа.
   */
  readonly finalize?: (context: TagFinalizeContext<TState>) => void
} & (undefined extends TState
  ? {
      /** Фабрика, создающая новое состояние для каждого парсинга плейлиста. Без фабрики оно будет равно undefined. */
      readonly createState?: () => TState
    }
  : {
      /** Обязательная фабрика, если обработчикам нужно состояние, отличное от undefined. */
      readonly createState: () => TState
    })

/**
 * Запись регистрации, позволяющая объединять разные типы тегов в PlaylistParserOptions.
 *
 */
export type TagRegistration = Omit<TagDefinition<unknown, never>, "createState"> & {
  /** Фабрика, создающая новое состояние для каждого парсинга плейлиста. */
  readonly createState?: () => unknown
}

/** Определение встроенного тега. */
export interface BuiltinTag {
  /** Имя тега без #. */
  readonly name: string
  /** Совместимый тип плейлиста. */
  readonly playlistType: TagPlaylistType
  /** Допустимость повторного появления тега. */
  readonly multiplicity: TagMultiplicity
  /** Обработчик, сохраняющий данные тега в контексте плейлиста. */
  readonly handle: (line: TagLine, playlistContext: PlaylistContext) => void
}

/** Запись реестра со встроенным или кастомным определением. */
export type RegisteredTag =
  | { readonly kind: "builtin"; readonly definition: BuiltinTag }
  | { readonly kind: "custom"; readonly definition: TagRegistration }
