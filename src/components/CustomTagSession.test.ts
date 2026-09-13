import { describe, expect, it, vi } from "vitest"
import { PlaylistParser } from "../PlaylistParser.js"
import type { TagDefinition, TagFinalizeContext } from "../types/tags.js"

describe("CustomTagSession", () => {
  it("shares state between callbacks and resets it for the next playlist", () => {
    const finalize = vi.fn((context: TagFinalizeContext<{ count: number }>) => {
      if (context.state.count === 0) throw context.createError("Counter is required")
    })
    const counter: TagDefinition<number, { count: number }> = {
      name: "EXT-COUNT",
      playlistType: "both",
      multiplicity: "repeatable",
      scope: "playlist",
      createState: () => ({ count: 0 }),
      parse(_payload, context) {
        context.requireVersion(3)
        return ++context.state.count
      },
      finalize,
    }
    const parser = new PlaylistParser({ tags: [counter] })
    const content = "#EXTM3U\n#EXT-COUNT\n#EXT-COUNT\n#EXT-X-VERSION:3"
    const result = parser.parse(content)

    expect(result.customTags.map((tag) => tag.value)).toEqual([1, 2])
    expect(finalize).toHaveBeenCalledWith(
      expect.objectContaining({
        playlist: result,
        state: { count: 2 },
        firstOccurrence: { line: 2, column: 1, offset: 8 },
      }),
    )
    expect(() => parser.parse("#EXTM3U\n#EXT-COUNT")).toThrow(
      expect.objectContaining({ code: "INCOMPATIBLE_VERSION" }),
    )
    expect(() => parser.parse("#EXTM3U")).toThrow(
      expect.objectContaining({
        code: "INVALID_TAG",
        tag: "EXT-COUNT",
        message: "Counter is required",
      }),
    )
    expect(parser.parse(content)).toEqual(result)
  })

  it("applies segment tags in source order and binds custom URI tags", () => {
    const persistent: TagDefinition<string> = {
      name: "EXT-PERSIST",
      playlistType: "media",
      multiplicity: "repeatable",
      scope: "persistent-segment",
      parse: (payload) => payload,
    }
    const once: TagDefinition<string> = { ...persistent, name: "EXT-ONCE", scope: "next-segment" }
    const asset: TagDefinition<string> = { ...persistent, name: "EXT-ASSET", scope: "uri" }
    const parser = new PlaylistParser({ tags: [persistent, once, asset] })
    const result = parser.parse(
      [
        "#EXTM3U",
        "#EXT-PERSIST:old",
        "#EXT-ONCE:first",
        "#EXT-PERSIST:new",
        "#EXTINF:1,",
        "one.ts",
        "#EXTINF:1,",
        "#EXT-ONCE:second",
        "two.ts",
        "#EXTINF:1,",
        "three.ts",
        "#EXT-ASSET:cover",
        "cover.jpg",
      ].join("\n"),
    )

    if (result.kind !== "media") throw new Error("Expected media playlist")
    expect(result.segments.map((segment) => segment.customTags.map((tag) => tag.value))).toEqual([
      ["first", "new"],
      ["new", "second"],
      ["new"],
    ])
    expect(result.customTags).toEqual([
      expect.objectContaining({ name: "EXT-ASSET", value: "cover", uri: "cover.jpg" }),
    ])
    expect(() => parser.parse("#EXTM3U\n#EXT-ONCE:unused")).toThrow(
      expect.objectContaining({ code: "UNAPPLIED_EXTENSION" }),
    )
  })
})
