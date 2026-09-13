import { expectTypeOf } from "vitest"
import type {
  ClosedCaptions,
  MasterPlaylist,
  MediaPlaylist,
  MediaSegment,
  ParsedCustomTag,
  Playlist,
  UnknownPlaylist,
  VariantStream,
} from "../../index.js"

// Эти проверки выполняет компилятор при typecheck; они не запускают парсер.
export function narrowPlaylist(playlist: Playlist): void {
  expectTypeOf<Playlist>().not.toBeAny()
  expectTypeOf(playlist.version).toEqualTypeOf<number | undefined>()
  switch (playlist.kind) {
    case "master":
      expectTypeOf(playlist).toEqualTypeOf<MasterPlaylist>()
      expectTypeOf(playlist.variants).toEqualTypeOf<readonly VariantStream[]>()
      // @ts-expect-error Главный плейлист содержит варианты потока; поля segments у него нет.
      playlist.segments
      // @ts-expect-error Коллекции результата доступны только для чтения.
      playlist.variants.push({})
      break
    case "media":
      expectTypeOf(playlist).toEqualTypeOf<MediaPlaylist>()
      expectTypeOf(playlist.segments).toEqualTypeOf<readonly MediaSegment[]>()
      expectTypeOf(playlist.playlistType).toEqualTypeOf<"EVENT" | "VOD" | undefined>()
      // @ts-expect-error Медиаплейлист содержит сегменты; поля variants у него нет.
      playlist.variants
      break
    case "unknown":
      expectTypeOf(playlist).toEqualTypeOf<UnknownPlaylist>()
      // @ts-expect-error Для результата неопределённого вида коллекция сегментов не выводится.
      playlist.segments
      break
    default:
      expectTypeOf(playlist).toBeNever()
  }
  // @ts-expect-error Публичным метаданным нельзя присвоить новое значение.
  playlist.resolvedVersion = 5
}

export const minimalMaster = {
  kind: "master",
  header: "EXTM3U",
  resolvedVersion: 1,
  variants: [],
  customTags: [],
} satisfies MasterPlaylist

export const minimalMedia = {
  kind: "media",
  header: "EXTM3U",
  resolvedVersion: 1,
  segments: [],
  customTags: [],
} satisfies MediaPlaylist

export const fullVariant = {
  uri: "../720p.m3u8",
  bandwidth: 9007199254740993n,
  averageBandwidth: 1000n,
  codecs: ["avc1.64001f", "mp4a.40.2"],
  resolution: { width: 1280n, height: 720n },
  frameRate: 29.97,
  hdcpLevel: "TYPE-0",
  audio: "audio",
  video: "video",
  subtitles: "subtitles",
  closedCaptions: { kind: "group", groupId: "NONE" },
  rawAttributes: [{ name: "FRAME-RATE", rawValue: "29.970" }],
  customTags: [],
} satisfies VariantStream

export function checkNumbersAndCaptions(variant: VariantStream, captions: ClosedCaptions): void {
  expectTypeOf(variant.bandwidth).toEqualTypeOf<bigint>()
  expectTypeOf(variant.averageBandwidth).toEqualTypeOf<bigint | undefined>()
  expectTypeOf(variant.resolution?.width).toEqualTypeOf<bigint | undefined>()
  // @ts-expect-error BANDWIDTH нельзя неявно представить типом number в JavaScript.
  const invalid: VariantStream = { ...variant, bandwidth: 1000 }
  void invalid
  if (captions.kind === "group") {
    expectTypeOf(captions.groupId).toEqualTypeOf<string>()
  } else {
    // @ts-expect-error NONE без кавычек отличается от группы с именем "NONE".
    captions.groupId
  }
}

// @ts-expect-error Необязательное поле можно опустить, но нельзя явно задать как undefined.
export const undefinedVersion: MasterPlaylist = { ...minimalMaster, version: undefined }
// @ts-expect-error Отсутствие явного тега VOD/EVENT не означает значение LIVE.
export const inferredLive: MediaPlaylist = { ...minimalMedia, playlistType: "LIVE" }

export function checkCustomTag(customTag: ParsedCustomTag, typed: ParsedCustomTag<string>): void {
  expectTypeOf(customTag.value).toBeUnknown()
  expectTypeOf(typed.value).toEqualTypeOf<string>()
  expectTypeOf(customTag.uri).toEqualTypeOf<string | undefined>()
  // @ts-expect-error Позиции в исходном тексте доступны только для чтения.
  customTag.position.line = 3
}
