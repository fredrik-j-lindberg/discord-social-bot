import { Collection, OAuth2Guild } from "discord.js"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { client } from "~/client"
import { setMemberData } from "~/lib/database/memberDataService"
import { mockGuild, mockOAuthGuild } from "~/lib/discord/__mocks__/mockGuild"
import {
  mockMember,
  mockRoles,
  mockUser,
} from "~/lib/discord/__mocks__/mockUser"
import { expectDoraMember } from "~/lib/helpers/__mocks__/mockDoraMember"

import { syncDiscordMembersWithDb } from "./syncDiscordMembersWithDb"

vi.mock("~/client", () => ({
  client: {
    guilds: {
      fetch: vi.fn(),
    },
  },
}))

vi.mock("~/lib/helpers/member", () => ({
  getDoraDiscordMembers: vi.fn(),
}))

vi.mock("~/lib/database/memberDataService", () => ({
  setMemberData: vi.fn(),
}))

vi.mock("~/lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn().mockReturnThis(),
  },
}))

describe("syncDiscordMembersWithDb", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it("it updates relevant data and skips bots", async () => {
    const guild = mockGuild({ id: "g1", name: "Guild 1" })
    const rolesMember1 = ["r1", "r2"]
    const member1 = mockMember({
      guild,
      user: mockUser({ id: "u1", username: "user1" }),
      roles: mockRoles({ guildId: guild.id, roleIds: rolesMember1 }),
    })

    const rolesMember2 = ["r3"]
    const member2 = mockMember({
      guild,
      user: mockUser({ id: "u2", username: "user2" }),
      roles: mockRoles({ guildId: guild.id, roleIds: rolesMember2 }),
    })

    const botMember = mockMember({
      guild,
      user: mockUser({ id: "bot", username: "Bot", bot: true }),
      roles: mockRoles({ guildId: guild.id, roleIds: ["r-bot"] }),
    })

    vi.spyOn(client.guilds, "fetch").mockResolvedValue(
      new Collection<string, OAuth2Guild>([
        [
          guild.id,
          mockOAuthGuild({
            id: guild.id,
            name: guild.name,
            members: [member1, member2, botMember],
          }),
        ],
      ]),
    )

    await syncDiscordMembersWithDb()

    expect(setMemberData).toHaveBeenCalledWith({
      doraMember: expectDoraMember({
        userId: member1.user.id,
        roleIds: rolesMember1,
      }),
    })
    expect(setMemberData).toHaveBeenCalledWith({
      doraMember: expectDoraMember({
        userId: member2.user.id,
        roleIds: rolesMember2,
      }),
    })

    // Bot member should be skipped
    expect(setMemberData).not.toHaveBeenCalledWith({
      doraMember: expectDoraMember({
        userId: botMember.user.id,
      }),
    })
    expect(setMemberData).toHaveBeenCalledTimes(2)
  })
})
