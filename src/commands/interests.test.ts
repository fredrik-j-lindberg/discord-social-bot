import type { ChatInputCommandInteraction } from "discord.js"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { GuildConfig } from "~/lib/database/guildConfigService"
import { getGuildConfig } from "~/lib/database/guildConfigService"
import {
  mockMember,
  mockRoles,
  mockUser,
} from "~/lib/discord/__mocks__/mockUser"
import { getRole } from "~/lib/discord/roles"
import { getMember } from "~/lib/discord/user"
import { DoraUserException } from "~/lib/exceptions/DoraUserException"

import interestsCommand from "./interests"

const { mockCreateModal } = vi.hoisted(() => ({
  mockCreateModal: vi.fn(),
}))

vi.mock("~/lib/database/guildConfigService")
vi.mock("~/lib/discord/roles")
vi.mock("~/lib/discord/user")
vi.mock("../modals/interestsModal", () => ({
  default: {
    data: { name: "interestsModal" },
    createModal: mockCreateModal,
  },
}))

const mockGetGuildConfig = vi.mocked(getGuildConfig)
const mockGetRole = vi.mocked(getRole)
const mockGetMember = vi.mocked(getMember)

const mockGuildId = "mock-guild-id"
const mockUserId = "mock-user-id"
const mockRoleId1 = "role-dancing"
const mockRoleId2 = "role-climbing"

const mockGuildConfig: GuildConfig = {
  id: "config-id",
  guildId: mockGuildId,
  interests: { roles: [mockRoleId1, mockRoleId2] },
}

const mockGuild = { id: mockGuildId } as ChatInputCommandInteraction["guild"] &
  object

let mockShowModal: ReturnType<typeof vi.fn>

const createMockInteraction = () => {
  const user = mockUser({ id: mockUserId })
  mockShowModal = vi.fn()
  return {
    guild: mockGuild,
    user,
    showModal: mockShowModal,
  } as unknown as ChatInputCommandInteraction
}

describe("interests command", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("throws if no guild", async () => {
    const interaction = {
      ...createMockInteraction(),
      guild: null,
    } as unknown as ChatInputCommandInteraction
    await expect(interestsCommand.execute(interaction)).rejects.toThrow()
  })

  it("throws DoraUserException if no interest roles are configured", async () => {
    mockGetGuildConfig.mockResolvedValue(undefined)
    await expect(
      interestsCommand.execute(createMockInteraction()),
    ).rejects.toThrow(DoraUserException)
  })

  it("throws DoraUserException if interests config has empty roles", async () => {
    mockGetGuildConfig.mockResolvedValue({
      ...mockGuildConfig,
      interests: { roles: [] },
    })
    await expect(
      interestsCommand.execute(createMockInteraction()),
    ).rejects.toThrow(DoraUserException)
  })

  it("shows modal with correct roles and pre-checked current member roles", async () => {
    mockGetGuildConfig.mockResolvedValue(mockGuildConfig)
    mockGetMember.mockResolvedValue(
      mockMember({
        user: mockUser({ id: mockUserId }),
        roles: mockRoles({ guildId: mockGuildId, roleIds: [mockRoleId1] }),
      }),
    )
    mockGetRole
      .mockResolvedValueOnce({ id: mockRoleId1, name: "Dancing" } as ReturnType<
        typeof getRole
      > extends Promise<infer T>
        ? T
        : never)
      .mockResolvedValueOnce({
        id: mockRoleId2,
        name: "Climbing",
      } as ReturnType<typeof getRole> extends Promise<infer T> ? T : never)

    const mockModalBuilder = { custom_id: "interestsModal" }
    mockCreateModal.mockResolvedValue(mockModalBuilder as never)

    const interaction = createMockInteraction()
    await interestsCommand.execute(interaction)

    expect(mockCreateModal).toHaveBeenCalledWith({
      interestRoles: [
        { id: mockRoleId1, name: "Dancing" },
        { id: mockRoleId2, name: "Climbing" },
      ],
      currentRoleIds: [mockRoleId1],
    })
    expect(mockShowModal).toHaveBeenCalledWith(mockModalBuilder)
  })

  it("falls back to role id as name when role cannot be fetched", async () => {
    mockGetGuildConfig.mockResolvedValue(mockGuildConfig)
    mockGetMember.mockResolvedValue(
      mockMember({ user: mockUser({ id: mockUserId }) }),
    )
    mockGetRole.mockResolvedValue(null as never)

    const mockModal = {} as never
    mockCreateModal.mockResolvedValue(mockModal)
    await interestsCommand.execute(createMockInteraction())

    expect(mockCreateModal).toHaveBeenCalledWith({
      interestRoles: [
        { id: mockRoleId1, name: mockRoleId1 },
        { id: mockRoleId2, name: mockRoleId2 },
      ],
      currentRoleIds: [],
    })
  })
})
