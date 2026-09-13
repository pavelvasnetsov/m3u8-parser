import { describe, expect, it } from "vitest"
import {
  parseAttributeList,
  parseEnumeratedString,
  parseQuotedString,
  parseResolution,
} from "./attributes.js"

describe("attributes", () => {
  it("preserves quoted separators and locates duplicate attributes", () => {
    const context = { position: { line: 2, column: 5, offset: 12 }, tag: "EXT-ASSET" }
    const attributes = parseAttributeList('ID="a,b=c",COUNT=2', context)

    expect(attributes).toEqual([
      {
        name: "ID",
        rawValue: '"a,b=c"',
        position: { line: 2, column: 5, offset: 12 },
        valuePosition: { line: 2, column: 8, offset: 15 },
      },
      {
        name: "COUNT",
        rawValue: "2",
        position: { line: 2, column: 16, offset: 23 },
        valuePosition: { line: 2, column: 22, offset: 29 },
      },
    ])
    expect(() => parseAttributeList("A=1,A=2", context)).toThrow(
      expect.objectContaining({
        code: "DUPLICATE_ATTRIBUTE",
        tag: "EXT-ASSET",
        attribute: "A",
        line: 2,
        column: 9,
        offset: 16,
        firstOccurrence: { line: 2, column: 5, offset: 12 },
      }),
    )
  })

  it("rejects malformed lists and validates attribute value types", () => {
    for (const raw of ["", "A", "A=", "A=1,", 'A="unclosed', 'A="a"b', "a=1", "A =1", "A=1, B=2"]) {
      expect(() => parseAttributeList(raw)).toThrow(
        expect.objectContaining({ code: "INVALID_ATTRIBUTE_LIST" }),
      )
    }
    expect(parseQuotedString('"a,b"')).toBe("a,b")
    expect(parseEnumeratedString("NONE")).toBe("NONE")
    expect(parseResolution("1920x1080")).toEqual({ width: 1920n, height: 1080n })
    expect(() => parseQuotedString("NONE")).toThrow()
    expect(() => parseEnumeratedString('"NONE"')).toThrow()
    expect(() => parseResolution("1920X1080")).toThrow()
  })
})
