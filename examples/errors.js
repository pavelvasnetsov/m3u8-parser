import { readFileSync } from "node:fs"
import { PlaylistParseError, PlaylistParser, TagRegistrationError } from "m3u8-parser"

const parser = new PlaylistParser()

for (const [file, code] of [
  ["missing-uri.m3u8", "MISSING_URI"],
  ["duplicate-version.m3u8", "DUPLICATE_TAG"],
  ["invalid-bandwidth.m3u8", "INVALID_NUMBER"],
  ["mixed-playlist-types.m3u8", "MIXED_PLAYLIST_TYPES"],
]) {
  const content = readFileSync(new URL(`./invalid/${file}`, import.meta.url), "utf8")
  showError(file, code, () => parser.parse(content))
}

/** @type {import("m3u8-parser").TagDefinition<string>} */
const asset = {
  name: "EXT-X-ASSET",
  playlistType: "both",
  multiplicity: "single",
  scope: "playlist",
  parse(payload, context) {
    if (!payload) throw context.createError("Asset ID is required")
    return payload
  },
}

const assetContent = readFileSync(new URL("./invalid/empty-asset.m3u8", import.meta.url), "utf8")
showError("empty-asset.m3u8", "INVALID_TAG", () => {
  new PlaylistParser({ tags: [asset] }).parse(assetContent)
})

showError("Попытка заменить встроенный тег", "RESERVED_TAG_NAME", () => {
  new PlaylistParser({ tags: [{ ...asset, name: "EXTINF" }] })
})

function showError(title, expectedCode, run) {
  try {
    run()
  } catch (error) {
    if (!(error instanceof PlaylistParseError || error instanceof TagRegistrationError)) {
      throw error
    }
    if (error.code !== expectedCode) throw error

    console.log(title)
    console.log({ name: error.name, code: error.code, message: error.message, tag: error.tag })

    if (error instanceof PlaylistParseError) {
      console.log({
        line: error.line,
        column: error.column,
        offset: error.offset,
        attribute: error.attribute,
        firstOccurrence: error.firstOccurrence,
        sourceFragment: error.sourceFragment,
        cause: error.cause instanceof Error ? error.cause.message : error.cause,
      })
    }
    return
  }

  throw new Error(`Expected ${expectedCode}: ${title}`)
}
