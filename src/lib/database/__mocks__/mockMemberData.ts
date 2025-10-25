import type { GuildMember } from "discord.js"

import type { MemberData } from "../memberDataService"

const baseMemberData = {
  id: "uuid",
  guildId: "test-guild",
  userId: "test-user-id",
  username: "test-user",
  displayName: "Test User",
  messageCount: 0,
  latestMessageAt: null,
  reactionCount: 0,
  latestReactionAt: null,
  latestActivityAt: null,
  inactiveSince: null,
  firstName: null,
  birthday: null,
  phoneNumber: null,
  email: null,
  height: null,
  switchFriendCode: null,
  pokemonTcgpFriendCode: null,
  dietaryPreferences: null,
  recordCreatedAt: new Date(),
  recordUpdatedAt: new Date(),
  nextBirthday: new Date(),
  age: null,
  roleIds: [],
}

export const mockMemberDataBasedOnGuildMember = (
  guildMember: GuildMember,
): MemberData => ({
  ...baseMemberData,
  userId: guildMember.id,
  username: guildMember.user.username,
  displayName: guildMember.displayName,
  guildId: guildMember.guild.id,
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
}): MemberData => {
  const memberData = guildMember
    ? mockMemberDataBasedOnGuildMember(guildMember)
    : baseMemberData
  return {
    ...memberData,
    userId: userId !== undefined ? userId : memberData.userId,
    latestActivityAt,
    inactiveSince,
  }
}
