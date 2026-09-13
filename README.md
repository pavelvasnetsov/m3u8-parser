# m3u8-parser

Парсер M3U8. Принимает текст плейлиста и возвращает
JS-объект. Поддерживает Master и Media Playlist, регистрацию собственных тегов
и ошибки с позицией в исходном тексте.

## Запуск

Для разработки используется Node.js 24:

```sh
npm ci
npm run check
```

`check` собирает пакет, запускает проверки, создаёт HTML-документацию.

Пакет не публиковался, Для установки в другой проект соберите локальный архив:

```sh
npm run build
npm pack
# В проекте потребителя:
npm install /path/to/m3u8-parser-0.0.0.tgz fast-uri@^4.1.4
```

## Использование

```ts
import { PlaylistParser } from "m3u8-parser"

const parser = new PlaylistParser()
const playlist = parser.parse(
  "#EXTM3U\n#EXT-X-VERSION:3\n#EXTINF:9.950,Первый сегмент\n../segment.ts"
)

if (playlist.kind === "media") {
  console.log(playlist.segments[0])
  // { uri: '../segment.ts', duration: 9.95, durationRaw: '9.950',
  //   title: 'Первый сегмент', customTags: [] }
}
```

Экземпляр можно использовать повторно, в том числе после ошибки. Каждый вызов
создаёт отдельное состояние. Конструктор копирует переданные определения тегов, поэтому 
изменение исходного массива не меняет конфигурацию экземпляра.

## Результат

`Playlist` — объединение `MasterPlaylist | MediaPlaylist | UnknownPlaylist`.
Поле `kind` позволяет сузить тип результата.

| Поле | Содержимое |
| --- | --- |
| `header` | Всегда `"EXTM3U"` |
| `version` | Версия из `EXT-X-VERSION` |
| `resolvedVersion` | Определенная версия или `1` по умолчанию |
| `customTags` | Данные пользовательских тегов плейлиста |
| `variants` | Только у `master`: варианты в исходном порядке |
| `segments` | Только у `media`: сегменты в исходном порядке |
| `playlistType` | Только у `media`, если задан `EVENT` или `VOD` |

Документ только с заголовком, общими или неизвестными тегами имеет `kind: "unknown"`.
У него нет `variants` и `segments`.

Сегмент содержит `uri`, `duration`, `durationRaw`, `title` и `customTags`.
Вариант содержит `uri`, обязательный `bandwidth`, необязательные `averageBandwidth`,
`codecs`, `resolution`, `frameRate`, `hdcpLevel`, `audio`, `video`, `subtitles`,
`closedCaptions`, `rawAttributes` и `customTags`. Отсутствующие атрибуты
не заполняются значениями по умолчанию.

`rawAttributes` сохраняет все пары `{ name, rawValue }` в исходном порядке, включая
кавычки и неизвестные атрибуты.

Типы полей и коллекций доступны только для чтения. 

### Числа и URI

`bandwidth`, `averageBandwidth` и размеры `resolution` представлены как `bigint`, так как
диапазон uint64 шире точных целых JavaScript. Длительности и частоты кадров — 
`number`. Исходная длительность остаётся в
`durationRaw`, частота кадров — в `rawAttributes`.

## Ошибки

```ts
import { PlaylistParseError, PlaylistParser } from "m3u8-parser"

try {
  new PlaylistParser().parse("#EXTM3U\n#EXTINF:10,")
} catch (error) {
  if (error instanceof PlaylistParseError) {
    console.error(error.code, error.line, error.column, error.message)
    // MISSING_URI, 2, 1, ...
  } else {
    throw error
  }
}
```

`PlaylistParseError` содержит `code`, строку и колонку от 1, `offset` от 0,
а при наличии контекста — `tag`, `attribute`, `firstOccurrence`, `sourceFragment` и `cause`.

## Кастомные теги

```ts
import { PlaylistParser, type TagDefinition } from "m3u8-parser"

const assetId: TagDefinition<string> = {
  name: "EXT-X-ASSET-ID",
  playlistType: "both",
  multiplicity: "single",
  scope: "playlist",
  parse(payload, context) {
    if (!payload) throw context.createError("Expected an asset identifier")
    return payload
  },
}

const parser = new PlaylistParser({ tags: [assetId] })
const playlist = parser.parse("#EXTM3U\n#EXT-X-ASSET-ID:movie-1")
console.log(playlist.customTags[0]?.value) // movie-1
```

Имя без `#` должно соответствовать `EXT[A-Z0-9-]*`. Встроенные имена и повторная
регистрация одного имени запрещены. `playlistType` задаёт `both`, `master` или `media`,
`multiplicity` — `single` или `repeatable`.

| `scope` | Куда попадает значение |
| --- | --- |
| `playlist` | В `playlist.customTags` |
| `uri` | Туда же, с собственной последующей строкой `uri` |
| `next-segment` | Только в следующий сегмент, повторения сохраняются |
| `persistent-segment` | В последующие сегменты до замены значением того же тега |

Области сегментов определяют Media Playlist и несовместимы с Master. Метаданные
сегмента можно ставить между `EXTINF` и его URI. 

Обработчик получает исходный payload, `position`, `payloadPosition`, текущие сведения
`playlistInfo`, собственное `state`, методы `requireVersion(version)` и `createError()`.
Требование версии проверяется после чтения всего документа, поэтому поздняя версия
учитывается. `TagDefinition<Value, State>` требует `createState`, если состояние не
допускает `undefined, фабрика вызывается заново для каждого разбора.

Необязательный `finalize` получает готовый `playlist`, состояние и `firstOccurrence`.
Он вызывается после структурных проверок даже при отсутствии тега. В таком случае
`firstOccurrence` отсутствует, а позиция ошибки по умолчанию указывает на заголовок.
Исключения callbacks сохраняются в `cause` ошибки разбора.

Общие функции `parseAttributeList`, `parseDecimalInteger`, `parseDecimalFloatingPoint`,
`parseVersion`, `parseQuotedString`, `parseEnumeratedString`, `parseResolution` и
`parseUriReference` доступны из корня пакета. Вторым аргументом можно передать позицию,
имя тега и атрибута. `parseAttributeList` возвращает также позиции имени и значения, что позволяет расширениям выдавать такую же диагностику, как встроенным тегам.

## Поддерживаемые из коробки теги

Встроены `EXTM3U`, `EXT-X-VERSION`, `EXT-X-STREAM-INF`, `EXT-X-PLAYLIST-TYPE` и `EXTINF`.
Поддерживаются все десять атрибутов `STREAM-INF` из RFC 8216. Неизвестный enum известного
атрибута приводит к пропуску варианта вместе с его URI, структура списка и типы остальных
известных атрибутов всё равно проверяются. Неизвестные кодеки и ссылки на группы сохраняются.

Неизвестные теги пропускаются без разбора payload. Поэтому успешный результат не означает
полную валидность или воспроизводимость HLS: `TARGETDURATION`, `ENDLIST`, шифрование,
группы `EXT-X-MEDIA`, LL-HLS и сетевые ресурсы не проверяются. Неизвестный тег с собственной
URI-строкой нужно зарегистрировать, иначе у URI не будет владельца.

Первая строка должна быть ровно `#EXTM3U`. Принимаются LF/CRLF и EOF без переноса строки,
BOM, одиночный CR, запрещённые управляющие символы и не-NFC текст
отклоняются. Вход не исправляется через trim или нормализацию. Дробная запись `EXTINF`
требует версии 3, версия — положительное безопасное целое, без ограничения числом 7.

## Разработка

| Команда | Назначение |
| --- | --- |
| `npm run check` | Все проверки, сборка, примеры и документация |
| `npm run lint` / `npm run format:check` | Biome без изменения файлов |
| `npm run lint:fix` / `npm run format` | Исправление lint-ошибок / форматирование |
| `npm run typecheck` | Типы библиотеки, конфигураций и тестов |
| `npm run build` | ESM-сборка Vite и декларации TypeScript в `dist/` |
| `npm test` / `npm run test:watch` | Vitest однократно / в режиме наблюдения |
| `npm run test:coverage` | Покрытие тестами в `coverage/` |
| `npm run docs` / `npm run docs:watch` | Генерация / обновление HTML-документации |

Откройте `api-docs/index.html` в браузере после `npm run docs`. Документация генерируется
из публичных экспортов и JSDoc, вручную редактировать HTML не нужно.

Pre-commit через Husky запускает Biome только для staged-файлов, затем typecheck всего
проекта. lint-staged сохраняет unstaged-изменения частично добавленных файлов. Ошибка
типов вне коммита тоже блокирует коммит, автоматические исправления хук не применяет.
Установка готового пакета не подключает хуки у потребителя.

GitHub Actions запускает проверки для pull request и push в `main`. Отдельные шаги
выполняют `npm ci`, lint, format:check, тесты, typecheck, build, примеры и документацию.
В CI Husky отключён. Ошибка любого шага завершает проверку неуспешно.
