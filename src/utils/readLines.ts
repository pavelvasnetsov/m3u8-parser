import type { SourceLine } from "../types/source.js"
import { createValueError } from "./diagnostics.js"

/**
 * Читает строки с разделителями LF или CRLF, сохраняя пробелы и позиции.
 * @param content - Текст плейлиста.
 * @returns Итератор строк без символов переноса. Последний перенос даёт пустую строку.
 * @throws {@link PlaylistParseError} При запрещённых символах или тексте не в форме NFC.
 */
export function* readLines(content: string): Generator<SourceLine> {
  let start = 0
  let line = 1

  for (let index = 0; index <= content.length; index++) {
    if (index !== content.length && content[index] !== "\n") continue

    const end =
      index > start && content[index - 1] === "\r" && index < content.length ? index - 1 : index
    const text = content.slice(start, end)
    const position = { line, column: 1, offset: start }

    for (let column = 0; column < text.length; column++) {
      const code = text.charCodeAt(column)

      if (
        code < 0x20 ||
        (code >= 0x7f && code <= 0x9f) ||
        (start + column === 0 && code === 0xfeff)
      ) {
        throw createValueError(
          "Forbidden character in playlist text",
          "INVALID_TEXT",
          text,
          { position },
          column,
        )
      }
    }

    const normalized = text.normalize("NFC")

    if (text !== normalized) {
      let column = 0

      while (text[column] === normalized[column]) column++

      throw createValueError(
        "Playlist text must be Unicode NFC",
        "INVALID_TEXT",
        text,
        { position },
        column,
      )
    }

    yield { text, position }
    start = index + 1
    line++
  }
}
