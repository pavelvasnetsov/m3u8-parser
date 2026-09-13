import type { Playlist } from "../types/playlist.js"
import type { TagDefinition, TagLine, TagRegistration } from "../types/tags.js"
import { createDiagnostics } from "../utils/diagnostics.js"
import { invoke } from "../utils/invoke.js"
import type { PlaylistContext } from "./PlaylistContext.js"

export class CustomTagSession {
  private readonly definition: TagDefinition<unknown, unknown>
  private readonly state: unknown

  constructor(definition: TagRegistration) {
    this.definition = definition as TagDefinition<unknown, unknown>
    this.state = invoke(definition.name, undefined, () => definition.createState?.())
  }

  parse(line: TagLine, playlistContext: PlaylistContext): void {
    const value = invoke(line.name, line, () =>
      this.definition.parse(line.payload, {
        ...createDiagnostics(line.name, line),
        position: line.position,
        payloadPosition: line.payloadPosition,
        playlistInfo: playlistContext.info,
        state: this.state,
        requireVersion: (version) => playlistContext.requireVersion(version, line),
      }),
    )

    playlistContext.addCustomTag(line, this.definition.scope, value)
  }

  finalize(playlist: Playlist, first?: TagLine): void {
    invoke(this.definition.name, first, () =>
      this.definition.finalize?.({
        ...createDiagnostics(this.definition.name, first),
        playlist,
        state: this.state,
        ...(first ? { firstOccurrence: first.position } : {}),
      }),
    )
  }
}
