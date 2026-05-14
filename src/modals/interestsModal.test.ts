import type { ModalSubmitInteraction } from "discord.js"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { GuildConfig } from "~/lib/database/guildConfigService"
import { getGuildConfig } from "~/lib/database/guildConfigService"
import {
  mockMember,
  mockRoles,
  mockUser,
} from "~/lib/discord/__mocks__/mockUser"
import { addRole, removeRole } from "~/lib/discord/roles"
import { getMember } from "~/lib/discord/user"

import interestsModal from "./interestsModal"

vi.mock("~/lib/database/guildConfigService")
vi.mock("~/lib/discord/roles")
vi.mock("~/lib/discord/user")

const mockGetGuildConfig = vi.mocked(getGuildConfig)
const mockGetMember = vi.mocked(getMember)
const mockAddRole = vi.mocked(addRole)
const mockRemoveRole = vi.mocked(removeRole)

const mockGuildId = "mock-guild-id"
const mockUserId = "mock-user-id"
const mockRoleId1 = "role-dancing"
const mockRoleId2 = "role-climbing"
const mockRoleId3 = "role-hiking"

const mockGuild = { id: mockGuildId }

const mockGuildConfig: GuildConfig = {
  id: "config-id",
  guildId: mockGuildId,
  interests: { roles: [mockRoleId1, mockRoleId2, mockRoleId3] },
}

const createMockInteraction = (selectedRoleIds: string[]) =>
  ({
    guild: mockGuild,
    user: { id: mockUserId },
    fields: {
      getStringSelectValues: vi.fn().mockReturnValue(selectedRoleIds),
    },
  }) as unknown as ModalSubmitInteraction

describe("interestsModal handleSubmit", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAddRole.mockResolvedValue({} as never)
    mockRemoveRole.mockResolvedValue({} as never)
  })

  it("returns early if no interest roles configured", async () => {
    mockGetGuildConfig.mockResolvedValue(undefined)
    mockGetMember.mockResolvedValue(
      mockMember({ user: mockUser({ id: mockUserId }) }),
    )

    const result = await interestsModal.handleSubmit(createMockInteraction([]))

    expect(result).toBe(
      "No interest roles are currently configured for this server.",
    )
    expect(mockAddRole).not.toHaveBeenCalled()
    expect(mockRemoveRole).not.toHaveBeenCalled()
  })

  it("adds selected roles the member does not already have", async () => {
    mockGetGuildConfig.mockResolvedValue(mockGuildConfig)
    mockGetMember.mockResolvedValue(
      mockMember({
        user: mockUser({ id: mockUserId }),
        roles: mockRoles({ guildId: mockGuildId, roleIds: [] }),
      }),
    )

    const result = await interestsModal.handleSubmit(
      createMockInteraction([mockRoleId1, mockRoleId2]),
    )

    expect(mockAddRole).toHaveBeenCalledWith(
      expect.objectContaining({ roleId: mockRoleId1 }),
    )
    expect(mockAddRole).toHaveBeenCalledWith(
      expect.objectContaining({ roleId: mockRoleId2 }),
    )
    expect(mockRemoveRole).not.toHaveBeenCalled()
    expect(result).toContain("interests have been updated")
  })

  it("removes configured roles the member has but did not select", async () => {
    mockGetGuildConfig.mockResolvedValue(mockGuildConfig)
    mockGetMember.mockResolvedValue(
      mockMember({
        user: mockUser({ id: mockUserId }),
        roles: mockRoles({
          guildId: mockGuildId,
          roleIds: [mockRoleId1, mockRoleId2],
        }),
      }),
    )

    await interestsModal.handleSubmit(createMockInteraction([mockRoleId1]))

    expect(mockAddRole).not.toHaveBeenCalled()
    expect(mockRemoveRole).toHaveBeenCalledOnce()
    expect(mockRemoveRole).toHaveBeenCalledWith(
      expect.objectContaining({ roleId: mockRoleId2 }),
    )
  })

  it("skips adding roles the member already has", async () => {
    mockGetGuildConfig.mockResolvedValue(mockGuildConfig)
    mockGetMember.mockResolvedValue(
      mockMember({
        user: mockUser({ id: mockUserId }),
        roles: mockRoles({ guildId: mockGuildId, roleIds: [mockRoleId1] }),
      }),
    )

    await interestsModal.handleSubmit(createMockInteraction([mockRoleId1]))

    expect(mockAddRole).not.toHaveBeenCalled()
    expect(mockRemoveRole).not.toHaveBeenCalled()
  })

  it("returns cleared message when no roles selected", async () => {
    mockGetGuildConfig.mockResolvedValue(mockGuildConfig)
    mockGetMember.mockResolvedValue(
      mockMember({
        user: mockUser({ id: mockUserId }),
        roles: mockRoles({ guildId: mockGuildId, roleIds: [mockRoleId1] }),
      }),
    )

    const result = await interestsModal.handleSubmit(createMockInteraction([]))

    expect(mockRemoveRole).toHaveBeenCalledWith(
      expect.objectContaining({ roleId: mockRoleId1 }),
    )
    expect(result).toBe("Your interests have been cleared.")
  })

  it("reports partially failed role assignments without throwing", async () => {
    mockGetGuildConfig.mockResolvedValue(mockGuildConfig)
    mockGetMember.mockResolvedValue(
      mockMember({
        user: mockUser({ id: mockUserId }),
        roles: mockRoles({ guildId: mockGuildId, roleIds: [] }),
      }),
    )
    mockAddRole.mockRejectedValueOnce(new Error("Missing permissions"))

    const result = await interestsModal.handleSubmit(
      createMockInteraction([mockRoleId1, mockRoleId2]),
    )

    expect(result).toContain("1 role(s) could not be assigned")
  })

  it("does not touch roles outside the configured interest roles", async () => {
    const otherRoleId = "some-unrelated-role"
    mockGetGuildConfig.mockResolvedValue(mockGuildConfig)
    mockGetMember.mockResolvedValue(
      mockMember({
        user: mockUser({ id: mockUserId }),
        roles: mockRoles({ guildId: mockGuildId, roleIds: [otherRoleId] }),
      }),
    )

    await interestsModal.handleSubmit(createMockInteraction([]))

    // Only configured interest roles are candidates — unrelated role must not be removed
    expect(mockRemoveRole).not.toHaveBeenCalledWith(
      expect.objectContaining({ roleId: otherRoleId }),
    )
  })
})
