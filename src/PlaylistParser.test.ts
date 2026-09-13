import { describe, expect, it } from "vitest"
import { PlaylistParseError, PlaylistParser } from "./index.js"

describe("PlaylistParser", () => {
  it("parses a media playlist and preserves segment order, titles and URIs", () => {
    const content = [
      "#EXTM3U",
      "#EXT-X-VERSION:3",
      "#EXT-X-PLAYLIST-TYPE:VOD",
      "#EXTINF:2.500, First, part 1",
      "#EXT-UNKNOWN:anything",
      "# comment",
      "",
      "../segment.ts?token=%2F#part",
      "#EXTINF:1,Second",
      "../segment.ts?token=%2F#part",
    ].join("\r\n")

    expect(new PlaylistParser().parse(content)).toEqual({
      kind: "media",
      header: "EXTM3U",
      version: 3,
      resolvedVersion: 3,
      playlistType: "VOD",
      customTags: [],
      segments: [
        {
          uri: "../segment.ts?token=%2F#part",
          duration: 2.5,
          durationRaw: "2.500",
          title: " First, part 1",
          customTags: [],
        },
        {
          uri: "../segment.ts?token=%2F#part",
          duration: 1,
          durationRaw: "1",
          title: "Second",
          customTags: [],
        },
      ],
    })
  })

  it("parses all STREAM-INF attributes without losing integer precision", () => {
    const attributes = [
      "BANDWIDTH=9007199254740993",
      "AVERAGE-BANDWIDTH=1000",
      'CODECS="avc1.640028,mp4a.40.2"',
      "RESOLUTION=1920x1080",
      "FRAME-RATE=29.970",
      "HDCP-LEVEL=TYPE-0",
      'AUDIO="audio"',
      'VIDEO="video"',
      'SUBTITLES="subs"',
      'CLOSED-CAPTIONS="cc"',
      'EXTRA="a,b=c"',
    ]
    const result = new PlaylistParser().parse(
      `#EXTM3U\n#EXT-X-STREAM-INF:${attributes.join(",")}\nvideo.m3u8`,
    )

    expect(result.kind).toBe("master")
    if (result.kind !== "master") throw new Error("Expected master playlist")

    expect(result.variants).toHaveLength(1)
    expect(result.variants[0]).toMatchObject({
      uri: "video.m3u8",
      bandwidth: 9007199254740993n,
      averageBandwidth: 1000n,
      codecs: ["avc1.640028", "mp4a.40.2"],
      resolution: { width: 1920n, height: 1080n },
      frameRate: 29.97,
      hdcpLevel: "TYPE-0",
      audio: "audio",
      video: "video",
      subtitles: "subs",
      closedCaptions: { kind: "group", groupId: "cc" },
      customTags: [],
    })
    expect(result.variants[0]?.rawAttributes).toHaveLength(attributes.length)
    expect(result.variants[0]?.rawAttributes.at(-1)).toEqual({
      name: "EXTRA",
      rawValue: '"a,b=c"',
    })
    expect(result.resolvedVersion).toBe(1)
    expect(result.version).toBeUndefined()
  })

  it("skips unknown tags without choosing a playlist kind", () => {
    expect(new PlaylistParser().parse("#EXTM3U\n#EXT-UNKNOWN:invalid,data\n# comment\n")).toEqual({
      kind: "unknown",
      header: "EXTM3U",
      resolvedVersion: 1,
      customTags: [],
    })
  })

  it("starts each parse with fresh state, including after an error", () => {
    const parser = new PlaylistParser()
    const input = "#EXTM3U\n#EXTINF:1,\na.ts\n#EXT-X-PLAYLIST-TYPE:EVENT"
    const first = parser.parse(input)

    expect(first).toMatchObject({ kind: "media", playlistType: "EVENT" })
    expect(() => parser.parse("#EXTM3U\n#EXTINF:1,")).toThrow(PlaylistParseError)
    expect(parser.parse(input)).toEqual(first)
    expect(parser.parse(input)).not.toBe(first)
    expect(parser.parse("#EXTM3U")).toMatchObject({ kind: "unknown", resolvedVersion: 1 })
  })

  it.each([
    ["wrong header", "INVALID_HEADER", 1],
    ["#EXTM3U\n#EXTM3U", "DUPLICATE_TAG", 2],
    ["#EXTM3U\n#EXT-X-VERSION:1\n#EXT-X-VERSION:2", "DUPLICATE_TAG", 3],
    ["#EXTM3U\n#EXTINF:1,", "MISSING_URI", 2],
    ["#EXTM3U\na.ts", "UNEXPECTED_URI", 2],
    ["#EXTM3U\n#EXTINF:1,\n#EXTINF:2,\na.ts", "CONFLICTING_URI", 3],
    ["#EXTM3U\n#EXTINF:1,\na.ts\n#EXT-X-STREAM-INF:BANDWIDTH=1\nv.m3u8", "MIXED_PLAYLIST_TYPES", 4],
    ["#EXTM3U\n#EXTINF:1.5,\na.ts", "INCOMPATIBLE_VERSION", 2],
    ['#EXTM3U\n#EXT-X-STREAM-INF:CODECS="avc1"\na.m3u8', "MISSING_ATTRIBUTE", 2],
    ["#EXTM3U\n#EXTINF:1,\na%ZZ.ts", "INVALID_URI", 3],
    ["#EXTM3U\n#EXT-X-PLAYLIST-TYPE:LIVE", "INVALID_TAG", 2],
  ])("reports %s as %s on line %i", (content, code, line) => {
    expect(() => new PlaylistParser().parse(content)).toThrow(
      expect.objectContaining({ name: "PlaylistParseError", code, line }),
    )
  })

  it("reports the attribute and source position for an invalid number", () => {
    expect(() =>
      new PlaylistParser().parse('#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH="bad"\na'),
    ).toThrow(
      expect.objectContaining({
        code: "INVALID_NUMBER",
        tag: "EXT-X-STREAM-INF",
        attribute: "BANDWIDTH",
        line: 2,
        column: 29,
        offset: 36,
        sourceFragment: '"bad"',
      }),
    )
  })

  it("consumes the URI of a skipped variant and checks captions on the remaining variants", () => {
    const content = [
      "#EXTM3U",
      "#EXT-X-STREAM-INF:BANDWIDTH=1,HDCP-LEVEL=FUTURE",
      "skipped.m3u8",
      "#EXT-X-STREAM-INF:BANDWIDTH=2,CLOSED-CAPTIONS=NONE",
      "kept.m3u8",
    ].join("\n")
    const parser = new PlaylistParser()
    const result = parser.parse(content)

    expect(result).toMatchObject({
      kind: "master",
      variants: [{ uri: "kept.m3u8", closedCaptions: { kind: "none" } }],
    })
    if (result.kind !== "master") throw new Error("Expected master playlist")
    expect(result.variants).toHaveLength(1)
    expect(() => parser.parse(`${content}\n#EXT-X-STREAM-INF:BANDWIDTH=3\nother.m3u8`)).toThrow(
      expect.objectContaining({ code: "INCONSISTENT_CLOSED_CAPTIONS" }),
    )
  })

  it("rejects non-string input", () => {
    expect(() => new PlaylistParser().parse(null as unknown as string)).toThrow(TypeError)
  })
})
