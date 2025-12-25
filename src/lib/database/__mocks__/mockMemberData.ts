import type { GuildMember } from "discord.js"

import type { DoraDatabaseMember } from "../../helpers/doraMember"

const baseMemberData: DoraDatabaseMember = {
  databaseId: "uuid",
  guildId: "test-guild",
  userId: "test-user-id",
  username: "test-user",
  displayName: "Test User",
  roleIds: [],
  stats: {
    messageCount: 0,
    latestMessageAt: null,
    reactionCount: 0,
    latestReactionAt: null,
    latestActivityAt: null,
    inactiveSince: null,
  },
  personalInfo: {
    firstName: null,
    birthday: null,
    phoneNumber: null,
    email: null,
    dietaryPreferences: null,
    nextBirthday: new Date(),
    age: null,
  },
  friendCodes: {
    switch: null,
    pokemonTcgp: null,
  },
}

export const mockMemberDataBasedOnGuildMember = (
  guildMember: GuildMember,
): DoraDatabaseMember => ({
  ...baseMemberData,
  userId: guildMember.id,
  username: guildMember.user.username,
  displayName: guildMember.displayName,
  guildId: guildMember.guild.id,
  roleIds: guildMember.roles.cache
    .filter((role) => role.id !== guildMember.guild.id)
    .map((role) => role.id),
})

export const mockMemberData = ({
  userId,
  latestActivityAt = null,
  inactiveSince = null,
  guildMember = null,
}: {
  userId?: string
  latestActivityAt?: Date | null
  inactiveSince?: Date | null
  /** If you want to base the mock on a specific guild member send it here. Any specific member data field you send as param will take precedence over this */
  guildMember?: GuildMember | null
}): DoraDatabaseMember => {
  const memberData = guildMember
    ? mockMemberDataBasedOnGuildMember(guildMember)
    : baseMemberData
  return {
    ...memberData,
    userId: userId !== undefined ? userId : memberData.userId,
    stats: {
      ...memberData.stats,
      latestActivityAt,
      inactiveSince,
    },
  }
}
