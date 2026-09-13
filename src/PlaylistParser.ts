import { CustomTagSession } from "./components/CustomTagSession.js"
import { PlaylistContext } from "./components/PlaylistContext.js"
import { TagRegistry } from "./components/TagRegistry.js"
import { builtinTags } from "./constants/builtinTags.js"
import { PlaylistParseError } from "./errors.js"
import type { PlaylistParserApi, PlaylistParserOptions } from "./types/parser.js"
import type { Playlist } from "./types/playlist.js"
import { readLines } from "./utils/readLines.js"
import { parseTagLine } from "./utils/value-parsers/tags.js"

/**
 * Парсер M3U8 с расширяемым набором тегов.
 *
 * @example
 * ```ts
 * const parser = new PlaylistParser();
 * const playlist = parser.parse("#EXTM3U\n#EXTINF:10,\nsegment.ts");
 * if (playlist.kind === "media") console.log(playlist.segments[0]?.uri);
 * ```
 */
export class PlaylistParser implements PlaylistParserApi {
  private readonly registry: TagRegistry

  /**
   * Фиксирует набор опций.
   * @param options - Дополнительные определения тегов.
   * @throws {@link TagRegistrationError} При неверном определении или конфликте имён.
   */
  constructor(options: PlaylistParserOptions = {}) {
    this.registry = new TagRegistry(builtinTags, options.tags)
  }

  /**
   * Парсит текст m3u8-плейлиста, где каждый вызов создаёт отдельное состояние.
   * @param content - Текст плейлиста.
   * @returns Объект плейлиста.
   * @throws TypeError При нестроковом аргументе.
   * @throws {@link PlaylistParseError} При некорректном плейлисте или ошибке обработчика.
   */
  parse(content: string): Playlist {
    if (typeof content !== "string") throw new TypeError("Playlist content must be a string")

    return this.parsePlaylist(content)
  }

  private parsePlaylist(content: string): Playlist {
    const playlistContext = new PlaylistContext()
    const sessions = new Map<string, CustomTagSession>()

    for (const definition of this.registry.getCustomTags())
      sessions.set(definition.name, new CustomTagSession(definition))

    for (const line of readLines(content)) {
      if (line.position.line === 1 && line.text !== "#EXTM3U") {
        throw new PlaylistParseError("First line must be exactly #EXTM3U", {
          code: "INVALID_HEADER",
          position: line.position,
          sourceFragment: line.text,
        })
      }

      if (line.text === "") continue

      if (!line.text.startsWith("#")) {
        playlistContext.consumeUri(line)
        continue
      }

      if (!line.text.startsWith("#EXT")) continue

      const tag = parseTagLine(line)
      const registered = this.registry.get(tag.name)

      if (!registered) continue

      playlistContext.acceptTag(
        tag,
        registered.definition.playlistType,
        registered.definition.multiplicity,
      )

      if (registered.kind === "builtin") registered.definition.handle(tag, playlistContext)
      else sessions.get(tag.name)?.parse(tag, playlistContext)
    }

    const playlist = playlistContext.finish()

    for (const [name, session] of sessions)
      session.finalize(playlist, playlistContext.getFirstOccurrence(name))

    return playlist
  }
}
