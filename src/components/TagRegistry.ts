import { TagRegistrationError } from "../errors.js"
import type { BuiltinTag, RegisteredTag, TagRegistration } from "../types/tags.js"

export class TagRegistry {
  private readonly tags = new Map<string, RegisteredTag>()

  constructor(builtins: readonly BuiltinTag[], customTags: readonly TagRegistration[] = []) {
    for (const definition of builtins)
      this.tags.set(definition.name, { kind: "builtin", definition })

    if (!Array.isArray(customTags)) {
      throw new TagRegistrationError("tags must be an array", { code: "INVALID_TAG_DEFINITION" })
    }

    for (const definition of customTags) {
      if (
        !definition ||
        typeof definition.name !== "string" ||
        /^EXT[A-Z0-9-]*$/.exec(definition.name)?.[0] !== definition.name
      ) {
        throw new TagRegistrationError("Expected a tag name matching EXT[A-Z0-9-]*", {
          code: "INVALID_TAG_NAME",
          ...(typeof definition?.name === "string" ? { tag: definition.name } : {}),
        })
      }

      const previous = this.tags.get(definition.name)

      if (previous) {
        throw new TagRegistrationError(`Tag ${definition.name} is already registered`, {
          code: previous.kind === "builtin" ? "RESERVED_TAG_NAME" : "DUPLICATE_TAG_NAME",
          tag: definition.name,
        })
      }

      if (
        !["both", "master", "media"].includes(definition.playlistType) ||
        !["single", "repeatable"].includes(definition.multiplicity) ||
        !["playlist", "uri", "next-segment", "persistent-segment"].includes(definition.scope) ||
        typeof definition.parse !== "function" ||
        (definition.createState !== undefined && typeof definition.createState !== "function") ||
        (definition.finalize !== undefined && typeof definition.finalize !== "function") ||
        (definition.playlistType === "master" && definition.scope.endsWith("segment"))
      ) {
        throw new TagRegistrationError(`Invalid definition of ${definition.name}`, {
          code: "INVALID_TAG_DEFINITION",
          tag: definition.name,
        })
      }

      this.tags.set(definition.name, {
        kind: "custom",
        definition: Object.freeze({ ...definition }),
      })
    }
  }

  get(name: string): RegisteredTag | undefined {
    return this.tags.get(name)
  }

  *getCustomTags(): Generator<TagRegistration> {
    for (const tag of this.tags.values()) if (tag.kind === "custom") yield tag.definition
  }
}
