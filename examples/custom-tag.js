import {
  PlaylistParser,
  parseAttributeList,
  parseDecimalInteger,
  parseQuotedString,
} from "m3u8-parser"

/** @type {import("m3u8-parser").TagDefinition<{ id: string, count: bigint }>} */
const asset = {
  name: "EXT-X-ASSET",
  playlistType: "both",
  multiplicity: "single",
  scope: "playlist",
  parse(payload, context) {
    const attributes = parseAttributeList(payload, {
      position: context.payloadPosition,
      tag: "EXT-X-ASSET",
    })
    const id = attributes.find((attribute) => attribute.name === "ID")
    const count = attributes.find((attribute) => attribute.name === "COUNT")
    if (!id || !count) throw context.createError("Asset requires ID and COUNT")
    return {
      id: parseQuotedString(id.rawValue, { position: id.valuePosition, attribute: "ID" }),
      count: parseDecimalInteger(count.rawValue, {
        position: count.valuePosition,
        attribute: "COUNT",
      }),
    }
  },
}

const parser = new PlaylistParser({ tags: [asset] })
const playlist = parser.parse('#EXTM3U\n#EXT-X-ASSET:ID="movie,part-1",COUNT=9007199254740993')
console.log(
  JSON.stringify(playlist, (_, value) => (typeof value === "bigint" ? value.toString() : value), 2),
)
