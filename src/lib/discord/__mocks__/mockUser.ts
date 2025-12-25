import { Collection, type GuildMember, type User } from "discord.js"
import { vi } from "vitest"

/**
 * Creates a GuildMember roles-like object with a cache collection
 * including the mandatory @everyone role (guildId) and any extra role IDs.
 */
export const mockRoles = ({
  guildId,
  roleIds = [],
}: {
  guildId: string
  roleIds?: string[]
}): GuildMember["roles"] => {
  const entries: [string, { id: string }][] = [
    [guildId, { id: guildId }], // @everyone
    ...roleIds.map<[string, { id: string }]>((id) => [id, { id }]),
  ]

  return {
    cache: new Collection<string, { id: string }>(entries),
  } as unknown as GuildMember["roles"]
}

export const mockMember = ({
  user,
  displayName,
  kick = vi.fn(),
  roles,
  roleIds,
}: {
  user: User
  displayName: string
  kick?: (reason?: string) => Promise<GuildMember>
  /** Provide a preconstructed roles manager-like object if desired */
  roles?: GuildMember["roles"]
  /** Or provide role IDs to construct a mock roles manager (besides @everyone) */
  roleIds?: string[]
}): GuildMember =>
  ({
    id: user.id,
    user,
    displayName,
    kick,
    guild: { id: "mock-guild-id" },
    roles: roles ?? mockRoles({ guildId: "mock-guild-id", roleIds }),
  }) as unknown as GuildMember

export const mockUser = ({
  id,
  username,
  bot = false,
}: {
  id: string
  username: string
  bot?: boolean
}): User =>
  ({
    id,
    username,
    bot,
  }) as User
