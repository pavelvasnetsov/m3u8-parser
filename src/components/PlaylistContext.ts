import { PlaylistParseError } from "../errors.js"
import type { ParsedCustomTag } from "../types/custom-tags.js"
import type {
  MediaPlaylistType,
  MediaSegment,
  Playlist,
  PlaylistInfo,
  PlaylistKind,
  VariantStream,
} from "../types/playlist.js"
import type { SourceLine, SourcePosition } from "../types/source.js"
import type { TagLine, TagMultiplicity, TagPlaylistType, TagScope } from "../types/tags.js"
import { startPosition } from "../utils/diagnostics.js"
import { validateUri } from "../utils/value-parsers/uri.js"

/** Тег, ожидающий следующую URI-строку. */
interface PendingUri {
  readonly line: TagLine
  readonly consume: (uri: string) => void
}

/** Накапливает данные и проверяет связи тегов при разборе одного плейлиста. */
export class PlaylistContext {
  private kind: PlaylistKind = "unknown"
  private kindPosition: SourcePosition | undefined
  private version: number | undefined
  private playlistType: MediaPlaylistType | undefined
  private requiredVersion = 1
  private versionRequirement: TagLine | undefined
  private pendingUri: PendingUri | undefined
  private readonly occurrences = new Map<string, TagLine>()
  private readonly segments: MediaSegment[] = []
  private readonly variants: VariantStream[] = []
  private readonly variantPositions: SourcePosition[] = []
  private readonly customTags: ParsedCustomTag[] = []
  private nextSegment: ParsedCustomTag[] = []
  private readonly persistentSegment = new Map<string, ParsedCustomTag>()

  /** Текущий тип и версия плейлиста для обработчиков тегов. */
  get info(): PlaylistInfo {
    return {
      kind: this.kind,
      resolvedVersion: this.version ?? 1,
      ...(this.version === undefined ? {} : { version: this.version }),
    }
  }

  /** Возвращает первое появление тега либо undefined. */
  getFirstOccurrence(name: string): TagLine | undefined {
    return this.occurrences.get(name)
  }

  /** Проверяет повтор тега и совместимость с типом плейлиста, затем запоминает тег. */
  acceptTag(line: TagLine, playlistType: TagPlaylistType, multiplicity: TagMultiplicity): void {
    const first = this.occurrences.get(line.name)

    if (first && multiplicity === "single") {
      throw new PlaylistParseError(`Duplicate ${line.name}`, {
        code: "DUPLICATE_TAG",
        tag: line.name,
        position: line.position,
        firstOccurrence: first.position,
        sourceFragment: line.text,
      })
    }

    if (playlistType !== "both") this.setKind(playlistType, line)

    if (!first) this.occurrences.set(line.name, line)
  }

  /** Определяет тип плейлиста по тегу и запрещает смешивать Master и Media. */
  private setKind(kind: "master" | "media", line: TagLine): void {
    if (this.kind !== "unknown" && this.kind !== kind) {
      throw new PlaylistParseError("Master and Media tags cannot be mixed", {
        code: "MIXED_PLAYLIST_TYPES",
        position: line.position,
        tag: line.name,
        sourceFragment: line.text,
        ...(this.kindPosition === undefined ? {} : { firstOccurrence: this.kindPosition }),
      })
    }

    if (this.kind === "unknown") {
      this.kind = kind
      this.kindPosition = line.position
    }
  }

  /** Сохраняет явно указанную версию протокола. */
  setVersion(version: number): void {
    this.version = version
  }

  /** Сохраняет тип Media Playlist: EVENT или VOD. */
  setPlaylistType(type: MediaPlaylistType): void {
    this.playlistType = type
  }

  /** Запоминает наибольшую требуемую версию и тег, который её потребовал. */
  requireVersion(version: number, line: TagLine): void {
    if (!Number.isSafeInteger(version) || version <= 0)
      throw new TypeError("Required version must be a positive safe integer")

    if (version > this.requiredVersion) {
      this.requiredVersion = version
      this.versionRequirement = line
    }
  }

  /** Регистрирует обработчик следующего UR, одновременно ждать URI может один тег. */
  expectUri(line: TagLine, consume: (uri: string) => void): void {
    if (this.pendingUri) {
      throw new PlaylistParseError("Another tag is still waiting for its URI", {
        code: "CONFLICTING_URI",
        position: line.position,
        tag: line.name,
        firstOccurrence: this.pendingUri.line.position,
        sourceFragment: line.text,
      })
    }

    this.pendingUri = { line, consume }
  }

  /** Проверяет URI и передаёт его ожидающему тегу, URI без такого тега вызывает ошибку. */
  consumeUri(line: SourceLine): void {
    const pending = this.pendingUri

    if (!pending)
      throw new PlaylistParseError("URI has no preceding owner tag", {
        code: "UNEXPECTED_URI",
        position: line.position,
        sourceFragment: line.text,
      })

    const uri = validateUri(line.text, { position: line.position, tag: pending.line.name })

    this.pendingUri = undefined
    pending.consume(uri)
  }

  /** Добавляет сегмент с постоянными и одноразовыми тегами в порядке исходного текста. */
  addSegment(segment: Omit<MediaSegment, "customTags">): void {
    const customTags: ParsedCustomTag[] = []
    let next = 0

    for (const persistent of this.persistentSegment.values()) {
      let once = this.nextSegment[next]

      while (once && once.position.offset < persistent.position.offset) {
        customTags.push(once)
        once = this.nextSegment[++next]
      }

      customTags.push(persistent)
    }

    while (next < this.nextSegment.length) {
      const once = this.nextSegment[next]

      if (once) customTags.push(once)

      next++
    }

    this.segments.push({ ...segment, customTags })
    this.nextSegment = []
  }

  /** Добавляет вариант потока и сохраняет позицию для итоговых проверок. */
  addVariant(variant: VariantStream, position: SourcePosition): void {
    this.variants.push(variant)
    this.variantPositions.push(position)
  }

  /** Сохраняет кастомный тег в плейлисте или назначает его сегментам согласно scope. */
  addCustomTag(line: TagLine, scope: TagScope, value: unknown): void {
    const tag: ParsedCustomTag = { name: line.name, value, position: line.position }

    switch (scope) {
      case "playlist":
        this.customTags.push(tag)

        break
      case "uri": {
        const index = this.customTags.length

        this.expectUri(line, (uri) => {
          this.customTags[index] = { ...tag, uri }
        })
        this.customTags.push(tag)

        break
      }
      case "next-segment":
        this.setKind("media", line)
        this.nextSegment.push(tag)

        break
      case "persistent-segment":
        this.setKind("media", line)
        this.persistentSegment.delete(line.name)
        this.persistentSegment.set(line.name, tag)

        break
    }
  }

  /**
   * Проверяет незавершённые связи, версию и субтитры, затем возвращает плейлист.
   * @throws {@link PlaylistParseError} Если итоговые данные противоречат друг другу или неполны.
   */
  finish(): Playlist {
    if (this.pendingUri) {
      const { line } = this.pendingUri

      throw new PlaylistParseError("Expected a URI before end of playlist", {
        code: "MISSING_URI",
        position: line.position,
        tag: line.name,
        sourceFragment: line.text,
      })
    }

    const unapplied = this.nextSegment[0]

    if (unapplied)
      throw new PlaylistParseError("Tag was not applied to a segment", {
        code: "UNAPPLIED_EXTENSION",
        position: unapplied.position,
        tag: unapplied.name,
      })

    if ((this.version ?? 1) < this.requiredVersion) {
      throw new PlaylistParseError(`This tag requires protocol version ${this.requiredVersion}`, {
        code: "INCOMPATIBLE_VERSION",
        position: this.versionRequirement?.position ?? startPosition,
        ...(this.versionRequirement
          ? { tag: this.versionRequirement.name, sourceFragment: this.versionRequirement.text }
          : {}),
      })
    }

    this.validateCaptions()

    const base = { ...this.info, header: "EXTM3U" as const, customTags: this.customTags }

    switch (this.kind) {
      case "master":
        return { ...base, kind: "master", variants: this.variants }
      case "media":
        return {
          ...base,
          kind: "media",
          segments: this.segments,
          ...(this.playlistType === undefined ? {} : { playlistType: this.playlistType }),
        }
      case "unknown":
        return { ...base, kind: "unknown" }
    }
  }

  /** Проверяет, что CLOSED-CAPTIONS=NONE указан либо у всех вариантов, либо ни у одного. */
  private validateCaptions(): void {
    const first = this.variants[0]

    if (!first) return

    const none = first.closedCaptions?.kind === "none"
    const conflict = this.variants.findIndex(
      (variant) => (variant.closedCaptions?.kind === "none") !== none,
    )

    if (conflict < 0) return

    throw new PlaylistParseError(
      "CLOSED-CAPTIONS=NONE must be present on every applicable variant",
      {
        code: "INCONSISTENT_CLOSED_CAPTIONS",
        tag: "EXT-X-STREAM-INF",
        attribute: "CLOSED-CAPTIONS",
        position: this.variantPositions[conflict] ?? startPosition,
        firstOccurrence: this.variantPositions[0] ?? startPosition,
      },
    )
  }
}
