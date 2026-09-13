import { describe, expect, it } from "vitest"
import { PlaylistParseError } from "../errors.js"
import { invoke } from "./invoke.js"

const line = { text: "#EXT-ASSET:bad", position: { line: 3, column: 1, offset: 20 } }

describe("invoke", () => {
  it("returns the callback result and wraps unexpected errors with their cause", () => {
    const result = { id: 1 }
    expect(invoke("EXT-ASSET", line, () => result)).toBe(result)

    const cause = new Error("Something failed")
    expect(() =>
      invoke("EXT-ASSET", line, () => {
        throw cause
      }),
    ).toThrow(
      expect.objectContaining({
        name: "PlaylistParseError",
        code: "TAG_HANDLER_ERROR",
        tag: "EXT-ASSET",
        line: 3,
        column: 1,
        offset: 20,
        sourceFragment: line.text,
        cause,
      }),
    )
  })

  it("preserves the details of a parse error", () => {
    const cause = new PlaylistParseError("Invalid ID", {
      code: "INVALID_ATTRIBUTE",
      position: { line: 3, column: 12, offset: 31 },
      attribute: "ID",
      sourceFragment: "bad",
      firstOccurrence: { line: 2, column: 1, offset: 8 },
    })

    expect(() =>
      invoke("EXT-ASSET", line, () => {
        throw cause
      }),
    ).toThrow(
      expect.objectContaining({
        code: "INVALID_ATTRIBUTE",
        message: "Invalid ID",
        tag: "EXT-ASSET",
        attribute: "ID",
        line: 3,
        column: 12,
        offset: 31,
        sourceFragment: "bad",
        firstOccurrence: { line: 2, column: 1, offset: 8 },
        cause,
      }),
    )
  })
})
