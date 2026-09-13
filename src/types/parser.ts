import type { Playlist } from "./playlist.js"
import type { TagRegistration } from "./tags.js"

/** Опции PlaylistParser. */
export interface PlaylistParserOptions {
  /** Определение кастомных тегов. */
  readonly tags?: readonly TagRegistration[]
}

/**
 * API PlaylistParser.
 */
export interface PlaylistParserApi {
  /**
   * Парсит m3u8-плейлист с учетом переданных опций в экземпляр PlaylistParser-а.
   * @param content - Контент m3u8-плейлиста в формате строки.
   * @returns Объект плейлиста.
   * @throws TypeError Если было передано значение, не являющееся строкой.
   * @throws {@link PlaylistParseError} Если переданный плейлист некорректен.
   */
  parse(content: string): Playlist
}
