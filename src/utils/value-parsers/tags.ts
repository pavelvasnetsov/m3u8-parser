import type { SourceLine } from "../../types/source.js"
import type { TagLine } from "../../types/tags.js"
import { advance } from "../diagnostics.js"

export function parseTagLine(line: SourceLine): TagLine {
  const colon = line.text.indexOf(":")
  const end = colon < 0 ? line.text.length : colon

  return {
    ...line,
    name: line.text.slice(1, end),
    payload: colon < 0 ? "" : line.text.slice(colon + 1),
    payloadPosition: advance(line.position, colon < 0 ? end : colon + 1),
  }
}
