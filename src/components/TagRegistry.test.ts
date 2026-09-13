import { expect, it } from "vitest"
import { PlaylistParser } from "../PlaylistParser.js"
import type { TagDefinition } from "../types/tags.js"

it("rejects reserved names, duplicates and invalid custom definitions", () => {
  const tag: TagDefinition<string> = {
    name: "EXT-ASSET",
    playlistType: "both",
    multiplicity: "single",
    scope: "playlist",
    parse: (payload) => payload,
  }

  for (const [tags, code] of [
    [[{ ...tag, name: "EXTINF" }], "RESERVED_TAG_NAME"],
    [[tag, tag], "DUPLICATE_TAG_NAME"],
    [[{ ...tag, name: "invalid" }], "INVALID_TAG_NAME"],
    [[{ ...tag, playlistType: "master", scope: "next-segment" }], "INVALID_TAG_DEFINITION"],
  ] as const) {
    expect(() => new PlaylistParser({ tags })).toThrow(
      expect.objectContaining({ name: "TagRegistrationError", code }),
    )
  }
})
