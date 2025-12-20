import { Collection, type Guild, type GuildMember } from "discord.js"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { mockMemberData } from "~/lib/database/__mocks__/mockMemberData"
import {
  getAllGuildConfigs,
  type GuildConfig,
} from "~/lib/database/guildConfigService"
import {
  getAllGuildMemberData,
  type MemberData,
  setMemberData,
} from "~/lib/database/memberDataService"
import { mockMember, mockUser } from "~/lib/discord/__mocks__/mockUser"
import { getGuild } from "~/lib/discord/guilds"
import { addRole } from "~/lib/discord/roles"
import { sendInactivityNotice, sendKickNotice } from "~/lib/discord/sendMessage"
import { subtractDaysFromDate } from "~/lib/helpers/date"
import { logger } from "~/lib/logger"

import { inactivityMonitor } from "./inactivityCheck"

vi.mock("~/lib/database/guildConfigService")
vi.mock("~/lib/database/memberDataService")
vi.mock("~/lib/discord/guilds")
vi.mock("~/lib/discord/roles")
vi.mock("~/lib/discord/sendMessage")
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
const mockKickFn = vi.fn()
const mockMemberToKick = mockMember({
  user: mockUser({ id: "kick-user", username: "kick" }),
  displayName: "Kick User",
  kick: mockKickFn,
})

/** Member that is active (no action taken) */
const mockActiveMemberData = mockMemberData({
  guildMember: mockActiveMember,
  latestActivityAt: subtractDaysFromDate(
    mockNowTime,
    mockDaysUntilInactive - 1,
  ),
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
  const mockGetAllGuildMemberData = vi.mocked(getAllGuildMemberData)
  const mockSetMemberData = vi.mocked(setMemberData)
  const mockGetGuild = vi.mocked(getGuild)
  const mockAddRole = vi.mocked(addRole)
  const mockSendInactivityNotice = vi.mocked(sendInactivityNotice)
  const mockSendKickNotice = vi.mocked(sendKickNotice)
  const mockLogger = vi.mocked(logger)

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

    mockGetAllGuildMemberData.mockResolvedValue([
      mockActiveMemberData,
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
      doraMember: expect.objectContaining({
        userId: mockToMarkInactiveMemberData.userId,
        stats: {
          inactiveSince: mockNowTime,
        },
      }) as unknown as MemberData,
    })

    expect(mockSendInactivityNotice).toHaveBeenCalledExactlyOnceWith({
      memberData: expect.objectContaining({
        userId: mockToMarkInactiveMemberData.userId,
      }) as unknown as MemberData,
      guildName: mockGuild.name,
      member: mockToMarkAsInactiveMember,
      inactivityConfig: mockGuildConfig.inactivity,
    })

    // Kick relevant member
    expect(mockSendKickNotice).toHaveBeenCalledExactlyOnceWith({
      memberData: expect.objectContaining({
        userId: mockToKickMemberData.userId,
      }) as unknown as MemberData,
      guildName: mockGuild.name,
      member: mockMemberToKick,
      inactivityConfig: mockGuildConfig.inactivity,
    })
    expect(mockKickFn).toHaveBeenCalledWith(
      `Automatically kicked due to inactivity. Last seen ${mockToKickMemberData.stats.latestActivityAt?.toISOString() || "N/A"}`,
    )
    expect(mockSetMemberData).toHaveBeenCalledWith({
      doraMember: expect.objectContaining({
        userId: mockToKickMemberData.userId,
        stats: {
          inactiveSince: null, // After kicking, the inactivity status should be reset
        },
      }) as unknown as MemberData,
    })

    expect(mockLogger.info).toHaveBeenCalledWith(
      {
        userId: mockToMarkAsInactiveMember.id,
        guildId: mockGuildId,
      },
      `Set member ${mockToMarkAsInactiveMember.displayName} as inactive in guild as their latest activity was ${mockToMarkInactiveMemberData.stats.latestActivityAt?.toISOString() || "N/A"} and the guild inactivity threshold is ${mockDaysUntilInactive} days`,
    )
    expect(mockLogger.info).toHaveBeenCalledWith(
      {
        userId: mockMemberToKick.id,
        guildId: mockGuildId,
      },
      `Kicked inactive member ${mockMemberToKick.displayName} from guild as their latest activity was ${mockToKickMemberData.stats.latestActivityAt?.toISOString() || "N/A"}`,
    )
    expect(mockLogger.info).toHaveBeenCalledTimes(2) // Make sure we don't log more than expected
  })
})
