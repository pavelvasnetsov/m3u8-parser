import type { Attribute, ClosedCaptions, HdcpLevel, Resolution } from "./attributes.js"
import type { ParsedCustomTag } from "./custom-tags.js"

/** Вид плейлиста, определённый по распознанным тегам. */
export type PlaylistKind = "master" | "media" | "unknown"

/** Явное значение EXT-X-PLAYLIST-TYPE. Отсутствие тега не означает LIVE. */
export type MediaPlaylistType = "EVENT" | "VOD"

/** Метаданные плейлиста, доступные в процессе парсинга. */
export interface PlaylistInfo {
  /** Вид плейлиста. */
  readonly kind: PlaylistKind
  /** Версия протокола, явно заданная тегом EXT-X-VERSION. */
  readonly version?: number
  /** Используемая версия протокола: явно заданная или 1 по умолчанию. */
  readonly resolvedVersion: number
}

/** Общие поля результата парсинга плейлиста. */
export interface PlaylistBase extends PlaylistInfo {
  /** Обязательный заголовок формата m3u8. */
  readonly header: "EXTM3U"
  /** Данные кастомных тегов. */
  readonly customTags: readonly ParsedCustomTag[]
}

/** Медиасегмент, описанный тегом EXTINF и следующей строкой URI. */
export interface MediaSegment {
  /** Исходный URI сегмента. */
  readonly uri: string
  /** Длительность в секундах, представленная конечным числом JavaScript. */
  readonly duration: number
  /** Исходная запись длительности. */
  readonly durationRaw: string
  /** Полный текст после первой запятой в EXTINF. */
  readonly title: string
  /** Данные кастомных тегов. */
  readonly customTags: readonly ParsedCustomTag[]
}

/** Вариант потока, описанный тегом EXT-X-STREAM-INF и следующей строкой URI. */
export interface VariantStream {
  /** Исходный URI плейлиста. */
  readonly uri: string
  /** Пиковый битрейт. */
  readonly bandwidth: bigint
  /** Средний битрейт. */
  readonly averageBandwidth?: bigint
  /** Кодеки. */
  readonly codecs?: readonly string[]
  /** Разрешение. */
  readonly resolution?: Resolution
  /** Частота кадров. */
  readonly frameRate?: number
  /** Уровень защиты HDCP. */
  readonly hdcpLevel?: HdcpLevel
  /** Идентификатор группы аудио. */
  readonly audio?: string
  /** Идентификатор группы видео. */
  readonly video?: string
  /** Идентификатор группы субтитров. */
  readonly subtitles?: string
  /** Отсутствие скрытых субтитров или идентификатор их группы. */
  readonly closedCaptions?: ClosedCaptions
  /** Все исходные атрибуты. */
  readonly rawAttributes: readonly Attribute[]
  /** Данные кастомных тегов. */
  readonly customTags: readonly ParsedCustomTag[]
}

/** Мастер плейлист. */
export interface MasterPlaylist extends PlaylistBase {
  /** Признак мастер плейлиста. */
  readonly kind: "master"
  /** Варианты потока в исходном порядке. */
  readonly variants: readonly VariantStream[]
}

/** Медиа плейлист. */
export interface MediaPlaylist extends PlaylistBase {
  /** Признак медиа плейлиста. */
  readonly kind: "media"
  /** Явное значение EXT-X-PLAYLIST-TYPE. */
  readonly playlistType?: MediaPlaylistType
  /** Сегменты в исходном порядке. */
  readonly segments: readonly MediaSegment[]
}

/**
 * Результат, для которого распознанных тегов недостаточно для определения вида плейлиста.
 */
export interface UnknownPlaylist extends PlaylistBase {
  /** Признак неопределённого вида плейлиста. */
  readonly kind: "unknown"
}

/**
 * Результат парсинга в виде обычного JS объекта.
 *
 * @example
 * ```ts
 * function countEntries(playlist: Playlist): number {
 *   switch (playlist.kind) {
 *     case "master": return playlist.variants.length
 *     case "media": return playlist.segments.length
 *     case "unknown": return 0
 *   }
 * }
 * ```
 */
export type Playlist = MasterPlaylist | MediaPlaylist | UnknownPlaylist
