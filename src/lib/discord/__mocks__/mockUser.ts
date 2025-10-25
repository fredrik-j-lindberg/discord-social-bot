import type { GuildMember, User } from "discord.js"
import { vi } from "vitest"

export const mockMember = ({
  user,
  displayName,
  kick = vi.fn(),
}: {
  user: User
  displayName: string
  kick?: (reason?: string) => Promise<GuildMember>
}): GuildMember =>
  ({
    id: user.id,
    user,
    displayName,
    kick,
    guild: { id: "mock-guild-id" },
  }) as unknown as GuildMember

export const mockUser = ({
  id,
  username,
}: {
  id: string
  username: string
}): User =>
  ({
    id,
    username,
    bot: false,
  }) as User
