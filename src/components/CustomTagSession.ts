import type { Playlist } from "../types/playlist.js"
import type { TagDefinition, TagLine, TagRegistration } from "../types/tags.js"
import { createDiagnostics } from "../utils/diagnostics.js"
import { invoke } from "../utils/invoke.js"
import type { PlaylistContext } from "./PlaylistContext.js"

/** Обработчик кастомного тега и его состояние для одного разбора плейлиста. */
export class CustomTagSession {
  private readonly definition: TagDefinition<unknown, unknown>
  private readonly state: unknown

  /** Создаёт состояние тега через createState, если фабрика задана. */
  constructor(definition: TagRegistration) {
    this.definition = definition as TagDefinition<unknown, unknown>
    this.state = invoke(definition.name, undefined, () => definition.createState?.())
  }

  /** Вызывает обработчик строки и сохраняет результат в области действия тега. */
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

  /** Запускает итоговую проверк, first задаёт позицию ошибки по умолчанию. */
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
