import { readFileSync } from "node:fs"
import { PlaylistParser } from "m3u8-parser"

const content = readFileSync(new URL("./193039199_mp4_h264_aac_hd_7.m3u8", import.meta.url), "utf8")
const playlist = new PlaylistParser().parse(content)
if (playlist.kind !== "media") throw new Error("Expected a Media Playlist")

console.log({
  version: playlist.version,
  playlistType: playlist.playlistType,
  segments: playlist.segments.length,
  duration: playlist.segments.reduce((total, segment) => total + segment.duration, 0),
  first: playlist.segments[0],
  last: playlist.segments.at(-1),
})
