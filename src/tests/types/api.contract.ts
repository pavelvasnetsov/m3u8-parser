import { expectTypeOf } from "vitest"
import type {
  Playlist,
  PlaylistParseError,
  PlaylistParseErrorCode,
  PlaylistParserApi,
  PlaylistParserOptions,
  SourcePosition,
  TagContext,
  TagDefinition,
  TagFinalizeContext,
  TagRegistration,
  TagRegistrationErrorCode,
} from "../../index.js"

export const assetIdTag: TagDefinition<string> = {
  name: "EXT-X-ASSET-ID",
  playlistType: "both",
  multiplicity: "single",
  scope: "playlist",
  parse(payload, context) {
    if (payload.length === 0) throw context.createError("Expected an asset identifier")
    return payload
  },
}

interface CounterState {
  count: number
}

export const counterTag: TagDefinition<number, CounterState> = {
  name: "EXT-X-COUNTER",
  playlistType: "media",
  multiplicity: "repeatable",
  scope: "next-segment",
  createState: () => ({ count: 0 }),
  parse(_payload, context) {
    expectTypeOf(context.state).toEqualTypeOf<CounterState>()
    context.requireVersion(3)
    context.state.count += 1
    return context.state.count
  },
  finalize(context) {
    expectTypeOf(context.state).toEqualTypeOf<CounterState>()
    if (
      context.playlist.kind === "media" &&
      context.playlist.segments.length < context.state.count
    ) {
      throw context.createError("A counter value was not assigned to a segment")
    }
  },
}

// Публичный API принимает вместе теги с разными типами значений и состояния.
export const options: PlaylistParserOptions = { tags: [assetIdTag, counterTag] }
export const defaults: PlaylistParserOptions = {}

export const wrongHandler: TagDefinition<number> = {
  ...assetIdTag,
  // @ts-expect-error Результат обработчика должен соответствовать объявленному типу значения.
  parse: () => "not a number",
}

export const wrongState: TagDefinition<number, CounterState> = {
  ...counterTag,
  // @ts-expect-error Фабрика должна создавать состояние объявленного типа.
  createState: () => ({ count: "not a number" }),
}

// @ts-expect-error Обработчик, которому нужно состояние, обязан предоставлять его фабрику.
export const missingFactory: TagDefinition<number, CounterState> = {
  name: "EXT-X-COUNTER",
  playlistType: "media",
  multiplicity: "repeatable",
  scope: "next-segment",
  parse: (_payload, context) => context.state.count,
}

export const incompatibleContext: TagDefinition<string> = {
  ...assetIdTag,
  // @ts-expect-error Определение без состояния не может требовать постороннее изменяемое состояние.
  parse: (_payload, context: TagContext<CounterState>) => String(context.state.count),
}

export function checkErasedState(tag: TagRegistration, context: TagContext<unknown>): void {
  // @ts-expect-error Стирание типа при регистрации не должно допускать произвольное состояние обработчика.
  tag.parse("", context)
}

export function checkContext(context: TagContext<CounterState>): void {
  expectTypeOf(context.createError("Invalid value")).toEqualTypeOf<PlaylistParseError>()
  expectTypeOf(context.playlistInfo.kind).toEqualTypeOf<"master" | "media" | "unknown">()
  // @ts-expect-error Обработчики не могут напрямую менять вид документа.
  context.playlistInfo.kind = "master"
  // @ts-expect-error Обработчики не могут заменять состояние текущего парсинга через контекст.
  context.state = { count: 10 }
  // @ts-expect-error Перебор входных строк выполняет ядро.
  context.readNextLine()
}

export function checkFinalize(context: TagFinalizeContext<CounterState>): void {
  expectTypeOf(context.playlist).toEqualTypeOf<Playlist>()
  expectTypeOf(context.firstOccurrence).toEqualTypeOf<SourcePosition | undefined>()
  // @ts-expect-error Требования к версии объявляются при разборе, до итоговой проверки.
  context.requireVersion(4)
}

export function checkApi(parser: PlaylistParserApi, configuration: PlaylistParserOptions): void {
  expectTypeOf(parser.parse("#EXTM3U")).toEqualTypeOf<Playlist>()
  // @ts-expect-error Публичный контракт принимает только декодированный текст.
  parser.parse(new Uint8Array())
  // @ts-expect-error Коллекция тегов в настройках недоступна для изменения.
  configuration.tags?.push(assetIdTag)
  // @ts-expect-error Поля конфигурации доступны только для чтения.
  configuration.tags = []
}

// @ts-expect-error Коды ошибок парсинга и регистрации относятся к разным контрактам.
export const invalidParseCode: PlaylistParseErrorCode = "RESERVED_TAG_NAME"
// @ts-expect-error Ошибки регистрации не зависят от синтаксиса документа.
export const invalidRegistrationCode: TagRegistrationErrorCode = "INVALID_HEADER"
