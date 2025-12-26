import {
  Collection,
  type Guild,
  type GuildMember,
  OAuth2Guild,
} from "discord.js"
import { vi } from "vitest"

/**
 * Creates a minimal mock Guild object suitable for tests.
 */
export const mockGuild = ({
  id = "mock-guild-id",
  name = "Mock Guild",
  members = [],
}: {
  id?: string
  name?: string
  members?: GuildMember[]
}): Guild => {
  const collection = new Collection<string, GuildMember>(
    members.map((m) => [m.id, m]),
  )
  return {
    id,
    name,
    members: {
      fetch: vi.fn().mockResolvedValue(collection),
      get: vi.fn((userId: string) => collection.get(userId)),
    },
  } as unknown as Guild
}

export const mockOAuthGuild = ({
  id = "mock-oauth-guild-id",
  name = "Mock OAuth Guild",
  members = [],
}: {
  id?: string
  name?: string
  members?: GuildMember[]
}): OAuth2Guild => {
  return {
    fetch: vi.fn().mockResolvedValue(mockGuild({ id, name, members })),
  } as unknown as OAuth2Guild
}
