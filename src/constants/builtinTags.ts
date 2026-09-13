import type { PlaylistContext } from "../components/PlaylistContext.js"
import type { VariantStream } from "../types/playlist.js"
import type { BuiltinTag, TagLine } from "../types/tags.js"
import { createValueError } from "../utils/diagnostics.js"
import {
  parseAttributeList,
  parseEnumeratedString,
  parseQuotedString,
  parseResolution,
} from "../utils/value-parsers/attributes.js"
import {
  parseDecimalFloatingPoint,
  parseDecimalInteger,
  parseVersion,
} from "../utils/value-parsers/numbers.js"

export const builtinTags: readonly BuiltinTag[] = [
  {
    name: "EXTM3U",
    playlistType: "both",
    multiplicity: "single",
    handle(line) {
      if (line.text !== "#EXTM3U")
        throw createValueError("Header cannot have a payload", "INVALID_HEADER", line.text, {
          position: line.position,
          tag: line.name,
        })
    },
  },
  {
    name: "EXT-X-VERSION",
    playlistType: "both",
    multiplicity: "single",
    handle(line, playlistContext) {
      playlistContext.setVersion(
        parseVersion(line.payload, { position: line.payloadPosition, tag: line.name }),
      )
    },
  },
  {
    name: "EXT-X-PLAYLIST-TYPE",
    playlistType: "media",
    multiplicity: "single",
    handle(line, playlistContext) {
      if (line.payload !== "EVENT" && line.payload !== "VOD")
        throw createValueError("Expected EVENT or VOD", "INVALID_TAG", line.payload, {
          position: line.payloadPosition,
          tag: line.name,
        })

      playlistContext.setPlaylistType(line.payload)
    },
  },
  { name: "EXTINF", playlistType: "media", multiplicity: "repeatable", handle: parseExtinf },
  {
    name: "EXT-X-STREAM-INF",
    playlistType: "master",
    multiplicity: "repeatable",
    handle(line, playlistContext) {
      const variant = parseStreamInfo(line)

      playlistContext.expectUri(line, (uri) => {
        if (variant) playlistContext.addVariant({ ...variant, uri }, line.position)
      })
    },
  },
]

function parseExtinf(line: TagLine, playlistContext: PlaylistContext): void {
  const comma = line.payload.indexOf(",")
  const context = { position: line.payloadPosition, tag: line.name }

  if (comma < 0)
    throw createValueError(
      "EXTINF requires a duration followed by a comma",
      "INVALID_TAG",
      line.payload,
      context,
    )

  const durationRaw = line.payload.slice(0, comma)

  if (durationRaw.includes(".")) playlistContext.requireVersion(3, line)
  else parseDecimalInteger(durationRaw, context)

  const duration = parseDecimalFloatingPoint(durationRaw, context).value
  const title = line.payload.slice(comma + 1)

  playlistContext.expectUri(line, (uri) =>
    playlistContext.addSegment({ uri, duration, durationRaw, title }),
  )
}

type VariantFields = { -readonly [K in keyof Omit<VariantStream, "uri">]: VariantStream[K] }

function parseStreamInfo(line: TagLine): Omit<VariantStream, "uri"> | undefined {
  const context = { position: line.payloadPosition, tag: line.name }
  const attributes = parseAttributeList(line.payload, context)
  const bandwidth = attributes.find((attribute) => attribute.name === "BANDWIDTH")

  if (!bandwidth)
    throw createValueError("BANDWIDTH is required", "MISSING_ATTRIBUTE", line.payload, {
      ...context,
      attribute: "BANDWIDTH",
    })

  const variant: VariantFields = {
    bandwidth: parseDecimalInteger(bandwidth.rawValue, {
      ...context,
      attribute: bandwidth.name,
      position: bandwidth.valuePosition,
    }),
    rawAttributes: attributes.map(({ name, rawValue }) => ({ name, rawValue })),
    customTags: [],
  }
  let skip = false

  for (const attribute of attributes) {
    const { name, rawValue } = attribute
    const valueContext = { tag: line.name, attribute: name, position: attribute.valuePosition }

    switch (name) {
      case "AVERAGE-BANDWIDTH":
        variant.averageBandwidth = parseDecimalInteger(rawValue, valueContext)
        break
      case "RESOLUTION":
        variant.resolution = parseResolution(rawValue, valueContext)
        break
      case "FRAME-RATE":
        variant.frameRate = parseDecimalFloatingPoint(rawValue, valueContext).value
        break
      case "CODECS":
        variant.codecs = parseQuotedString(rawValue, valueContext).split(",")
        break
      case "HDCP-LEVEL": {
        const level = parseEnumeratedString(rawValue, valueContext)

        if (level === "NONE" || level === "TYPE-0") variant.hdcpLevel = level
        else skip = true
        break
      }
      case "AUDIO":
        variant.audio = parseQuotedString(rawValue, valueContext)
        break
      case "VIDEO":
        variant.video = parseQuotedString(rawValue, valueContext)
        break
      case "SUBTITLES":
        variant.subtitles = parseQuotedString(rawValue, valueContext)
        break
      case "CLOSED-CAPTIONS":
        if (rawValue.startsWith('"'))
          variant.closedCaptions = {
            kind: "group",
            groupId: parseQuotedString(rawValue, valueContext),
          }
        else if (parseEnumeratedString(rawValue, valueContext) === "NONE")
          variant.closedCaptions = { kind: "none" }
        else skip = true
        break
    }
  }

  return skip ? undefined : variant
}
