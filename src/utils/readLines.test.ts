import { describe, expect, it } from "vitest"
import { readLines } from "./readLines.js"

describe("readLines", () => {
  it("preserves spaces and positions across LF and CRLF, including the final line", () => {
    expect([...readLines("a\r\nb\n c")]).toEqual([
      { text: "a", position: { line: 1, column: 1, offset: 0 } },
      { text: "b", position: { line: 2, column: 1, offset: 3 } },
      { text: " c", position: { line: 3, column: 1, offset: 5 } },
    ])
    expect([...readLines("a\n")].at(-1)).toEqual({
      text: "",
      position: { line: 2, column: 1, offset: 2 },
    })
  })

  it("rejects BOM, control characters and text outside NFC with a source position", () => {
    for (const text of ["\ufeffa", "\ta", "\0a", "\ra", "e\u0301"]) {
      expect(() => [...readLines(text)]).toThrow(
        expect.objectContaining({ code: "INVALID_TEXT", line: 1, column: 1, offset: 0 }),
      )
    }
    expect(() => [...readLines("ok\r\na\t")]).toThrow(
      expect.objectContaining({ code: "INVALID_TEXT", line: 2, column: 2, offset: 5 }),
    )
  })
})
