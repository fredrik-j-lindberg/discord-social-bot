import { Collection, type GuildMember, type User } from "discord.js"
import { type Mock, vi } from "vitest"

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

type TestUser = User & {
  send: Mock
}

type TestMember = GuildMember & {
  user: TestUser
  kick: Mock
  send: Mock
}

export const mockMember = (
  member: Pick<
    Partial<TestMember>,
    "id" | "user" | "displayName" | "guild" | "kick" | "send" | "roles"
  >,
) => {
  const user = member.user ?? mockUser()
  return {
    id: user.id,
    user,
    displayName: "Mock Member",
    kick: vi.fn(),
    send: vi.fn(),
    guild: { id: "mock-guild-id" },
    roles: mockRoles({ guildId: "mock-guild-id", roleIds: [] }),
    ...member,
  } as unknown as TestMember
}

export const mockUser = (
  user: Pick<Partial<TestUser>, "id" | "username" | "bot" | "send"> = {},
) =>
  ({
    id: "mock-user-id",
    username: "mock-user",
    bot: false,
    send: vi.fn(),
    ...user,
  }) as TestUser
