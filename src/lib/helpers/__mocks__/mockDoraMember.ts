import { expect } from "vitest"

import { mockMember, mockUser } from "~/lib/discord/__mocks__/mockUser"

import type {
  DoraDatabaseMember,
  DoraDiscordMember,
  DoraMember,
} from "../doraMember"

export const mockDoraDiscordMember = ({
  userId = "mock-user-id",
  roleIds = ["role-1", "role-2"],
}: {
  userId?: string
  roleIds?: string[]
}): DoraDiscordMember => ({
  userId,
  guildId: "mock-guild-id",
  username: "mock-username",
  displayName: "Mock Display Name",
  roleIds,
  stats: {
    joinedServer: new Date("2023-01-01T00:00:00Z"),
    accountCreation: new Date("2022-01-01T00:00:00Z"),
  },
  guildMember: mockMember({
    user: mockUser({ id: userId, username: "mock-username" }),
    displayName: "Mock Display Name",
    roleIds,
  }),
})

export const mockDoraDatabaseMember = ({
  databaseId = "mock-database-id",
  userId = "mock-user-id",
  roleIds = ["role-1", "role-2", "role-3"],
}: {
  databaseId?: string
  userId?: string
  roleIds?: string[]
}): DoraDatabaseMember => ({
  databaseId,
  userId,
  guildId: "mock-guild-id",
  username: "mock-username",
  displayName: "Database Display Name",
  roleIds,
  friendCodes: {
    switch: "SW-1234-5678-9012",
    pokemonTcgp: "1234 5678 9012",
  },
  personalInfo: {
    age: 25,
    birthday: new Date("1998-01-01"),
    dietaryPreferences: "Vegetarian",
    email: "mock@example.com",
    firstName: "Mock",
    nextBirthday: new Date("2024-01-01"),
    phoneNumber: "123 456 7890",
  },
  stats: {
    messageCount: 100,
    reactionCount: 25,
    latestActivityAt: new Date("2023-06-01T00:00:00Z"),
    latestMessageAt: new Date("2023-05-30T00:00:00Z"),
    latestReactionAt: new Date("2023-05-28T00:00:00Z"),
  },
})

export const expectDoraMember = (doraMember: Partial<DoraMember> = {}) => {
  return expect.objectContaining({
    guildId: expect.any(String) as string,
    userId: expect.any(String) as string,
    username: expect.any(String) as string,
    displayName: expect.any(String) as string,
    ...doraMember,
  }) as DoraMember
}
