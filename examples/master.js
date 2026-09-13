import { readFileSync } from "node:fs"
import { PlaylistParser } from "m3u8-parser"

const content = readFileSync(new URL("./x36xhzz.m3u8", import.meta.url), "utf8")
const playlist = new PlaylistParser().parse(content)
if (playlist.kind !== "master") throw new Error("Expected a Master Playlist")

console.log(
  JSON.stringify(playlist, (_, value) => (typeof value === "bigint" ? value.toString() : value), 2),
)
