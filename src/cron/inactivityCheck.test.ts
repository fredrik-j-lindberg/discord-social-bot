import { Collection, type Guild, type GuildMember } from "discord.js"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { mockMemberData } from "~/lib/database/__mocks__/mockMemberData"
import {
  getAllGuildConfigs,
  type GuildConfig,
} from "~/lib/database/guildConfigService"
import {
  getInactiveGuildMemberData,
  setMemberData,
} from "~/lib/database/memberDataService"
import { mockMember, mockUser } from "~/lib/discord/__mocks__/mockUser"
import { getGuild } from "~/lib/discord/guilds"
import { addRole } from "~/lib/discord/roles"
import { getMember } from "~/lib/discord/user"
import { expectDoraMember } from "~/lib/helpers/__mocks__/mockDoraMember"
import { subtractDaysFromDate } from "~/lib/helpers/date"
import { logger } from "~/lib/logger"

import { inactivityMonitor } from "./inactivityCheck"

vi.mock("~/lib/database/guildConfigService")
vi.mock("~/lib/database/memberDataService")
vi.mock("~/lib/discord/guilds")
vi.mock("~/lib/discord/roles")
vi.mock("~/lib/discord/user")
vi.mock("~/lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn().mockReturnThis(),
  },
}))

const mockNowTime = new Date("2026-01-01")

const mockGuildId = "test-guild"
const mockDaysUntilInactive = 30
const mockDaysAsInactiveBeforeKick = 10
const mockInactiveRoleId = "inactive-role-id"
const mockGuildConfig: GuildConfig = {
  id: "config-id",
  guildId: mockGuildId,
  inactivity: {
    daysUntilInactive: mockDaysUntilInactive,
    daysAsInactiveBeforeKick: mockDaysAsInactiveBeforeKick,
    inactiveRoleId: mockInactiveRoleId,
  },
}

const mockActiveMember = mockMember({
  user: mockUser({ id: "active-user", username: "active" }),
  displayName: "Active User",
})
const mockToMarkAsInactiveMember = mockMember({
  user: mockUser({
    id: "inactive-user",
    username: "inactive",
  }),
  displayName: "Inactive User",
})
const mockAlreadyInactiveMember = mockMember({
  user: mockUser({
    id: "already-inactive-user",
    username: "already-inactive",
  }),
  displayName: "Already Inactive User",
})
const mockMemberToKick = mockMember({
  user: mockUser({ id: "kick-user", username: "kick" }),
  displayName: "Kick User",
})
const mockDebugMember = mockMember({
  user: mockUser({ id: "debug-user", username: "debug" }),
  displayName: "Debug User",
})

/** Member that should be marked as inactive */
const mockToMarkInactiveMemberData = mockMemberData({
  guildMember: mockToMarkAsInactiveMember,
  latestActivityAt: subtractDaysFromDate(
    mockNowTime,
    mockDaysUntilInactive + 1,
  ),
})
/** Member that should just remain inactive (no action taken) */
const mockAlreadyInactiveMemberData = mockMemberData({
  guildMember: mockAlreadyInactiveMember,
  inactiveSince: subtractDaysFromDate(
    mockNowTime,
    mockDaysAsInactiveBeforeKick - 1,
  ),
  latestActivityAt: subtractDaysFromDate(
    mockNowTime,
    mockDaysUntilInactive + mockDaysAsInactiveBeforeKick - 1,
  ),
})
const mockToKickMemberData = mockMemberData({
  guildMember: mockMemberToKick,
  inactiveSince: subtractDaysFromDate(
    mockNowTime,
    mockDaysAsInactiveBeforeKick + 1,
  ),
  latestActivityAt: subtractDaysFromDate(
    mockNowTime,
    mockDaysUntilInactive + mockDaysAsInactiveBeforeKick + 1,
  ),
})

describe("inactivityMonitor", () => {
  const mockGetAllGuildConfigs = vi.mocked(getAllGuildConfigs)
  const mockGetInactiveGuildMemberData = vi.mocked(getInactiveGuildMemberData)
  const mockSetMemberData = vi.mocked(setMemberData)
  const mockGetGuild = vi.mocked(getGuild)
  const mockAddRole = vi.mocked(addRole)
  const mockLogger = vi.mocked(logger)
  const mockGetMember = vi.mocked(getMember)

  const setupMocks = (guildConfig: GuildConfig = mockGuildConfig) => {
    mockGetAllGuildConfigs.mockResolvedValue([guildConfig])

    const mockMembers = new Collection<string, GuildMember>([
      [mockActiveMember.id, mockActiveMember],
      [mockToMarkAsInactiveMember.id, mockToMarkAsInactiveMember],
      [mockAlreadyInactiveMember.id, mockAlreadyInactiveMember],
      [mockMemberToKick.id, mockMemberToKick],
    ])
    const mockGuild = {
      id: mockGuildId,
      name: "Test Guild",
      members: {
        fetch: vi.fn().mockResolvedValue(mockMembers),
        get: vi.fn((id: string) => mockMembers.get(id)),
      },
    } as unknown as Guild
    mockGetGuild.mockResolvedValue(mockGuild)
    mockGetMember.mockResolvedValue({
      user: mockDebugMember,
    } as unknown as GuildMember)

    mockGetInactiveGuildMemberData.mockResolvedValue([
      mockToMarkInactiveMemberData,
      mockAlreadyInactiveMemberData,
      mockToKickMemberData,
    ])

    return { mockGuild }
  }

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(mockNowTime)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it("should do nothing if inactivity monitoring is not configured", async () => {
    setupMocks({
      ...mockGuildConfig,
      inactivity: undefined,
    })

    await inactivityMonitor()

    expect(mockGetGuild).not.toHaveBeenCalled()
  })

  it("handles marking inactive members and kicking relevant members", async () => {
    const { mockGuild } = setupMocks()

    await inactivityMonitor()

    // Mark relevant member as inactive
    expect(mockAddRole).toHaveBeenCalledExactlyOnceWith({
      guild: mockGuild,
      roleId: mockInactiveRoleId,
      member: mockToMarkAsInactiveMember,
    })
    expect(mockSetMemberData).toHaveBeenCalledWith({
      doraMember: expectDoraMember({
        userId: mockToMarkInactiveMemberData.userId,
        stats: { inactiveSince: mockNowTime },
      }),
    })
    expect(mockLogger.info).toHaveBeenCalledWith(
      {
        userId: mockToMarkAsInactiveMember.id,
        guildId: mockGuildId,
      },
      `Set member ${mockToMarkAsInactiveMember.displayName} as inactive in guild as their latest activity was ${mockToMarkInactiveMemberData.stats.latestActivityAt?.toISOString() || "N/A"} and the guild inactivity threshold is ${mockDaysUntilInactive} days`,
    )
    expect(mockToMarkAsInactiveMember.kick).not.toHaveBeenCalled()
    expect(mockToMarkAsInactiveMember.send).toHaveBeenCalledOnce()
    expect(mockToMarkAsInactiveMember.send.mock.calls[0]?.[0]).toMatchSnapshot()

    expect(mockLogger.info).toHaveBeenCalledWith(
      {
        userId: mockMemberToKick.id,
        guildId: mockGuildId,
      },
      `Kicked inactive member ${mockMemberToKick.displayName} from guild as their latest activity was ${mockToKickMemberData.stats.latestActivityAt?.toISOString() || "N/A"}`,
    )
    expect(mockMemberToKick.kick).toHaveBeenCalledOnce()
    expect(mockMemberToKick.kick.mock.calls[0]?.[0]).toMatchSnapshot()
    expect(mockMemberToKick.send).toHaveBeenCalledOnce()
    expect(mockMemberToKick.send.mock.calls[0]?.[0]).toMatchSnapshot()
  })

  it("does not add inactive role when inactiveRoleId is not configured", async () => {
    setupMocks({
      ...mockGuildConfig,
      inactivity: {
        daysUntilInactive: mockDaysUntilInactive,
        daysAsInactiveBeforeKick: mockDaysAsInactiveBeforeKick,
        inactiveRoleId: undefined,
      },
    })

    await inactivityMonitor()

    // Should not attempt to add role
    expect(mockAddRole).not.toHaveBeenCalled()

    // Still sets inactive status and sends notice
    expect(mockSetMemberData).toHaveBeenCalledWith({
      doraMember: expectDoraMember({
        userId: mockToMarkInactiveMemberData.userId,
        stats: { inactiveSince: mockNowTime },
      }),
    })
  })
})
