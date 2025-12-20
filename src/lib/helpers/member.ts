import type { Guild, GuildMember } from "discord.js"

import { getMemberData, type MemberData } from "../database/memberDataService"
import {
  type EmojiCount,
  getMemberEmojiCounts,
} from "../database/memberEmojisService"
import { getMember } from "../discord/user"
import { DoraException } from "../exceptions/DoraException"
import { getValidDate } from "./date"

/** The official Dora member representation, combining data from both discord and Dora member database */
export interface DoraMember {
  username: string
  /** Picked from Discord guild member data or the dora member database. Defaults to username if for some reason neither of those are set */
  displayName: string
  /** Role IDs assigned to the member in the guild */
  roleIds: string[]
  /** Various statistics about the member */
  stats: {
    messageCount?: number | null
    latestMessageAt?: Date | null
    reactionCount?: number | null
    latestReactionAt?: Date | null
    favoriteEmojis?: EmojiCount[] | null
    joinedServer?: Date | null
    accountCreation?: Date | null
  }
  /** Personal info provided by the member themself */
  personalInfo: {
    birthday?: Date | null
    nextBirthday?: Date | null
    age?: number | null
    firstName?: string | null
    phoneNumber?: string | null
    email?: string | null
    dietaryPreferences?: string | null
  }
  /** Friend codes provided by the member themself */
  friendCodes: {
    switch?: string | null
    pokemonTcgp?: string | null
  }
  /** The original guild member object from Discord, if available */
  guildMember?: GuildMember
}

export const mapToDoraMember = ({
  guildMember,
  memberData,
  emojiCounts,
}: {
  guildMember?: GuildMember
  memberData?: MemberData | null
  emojiCounts?: EmojiCount[]
}): DoraMember => {
  const username = guildMember?.user.username || memberData?.username
  if (!username) {
    throw new DoraException(
      "Cannot map to Dora member: Missing mandatory username",
    )
  }
  const displayName =
    guildMember?.displayName || memberData?.displayName || username

  const memberDataRoleIds = memberData?.roleIds.filter(
    (roleId) => roleId !== guildMember?.guild.id, // Remove the irrelevant @everyone role
  )

  return {
    username,
    displayName,
    roleIds: memberDataRoleIds || [],
    stats: {
      messageCount: memberData?.messageCount,
      latestMessageAt: memberData?.latestMessageAt,
      reactionCount: memberData?.reactionCount,
      latestReactionAt: memberData?.latestReactionAt,
      favoriteEmojis: emojiCounts,
      joinedServer: getValidDate(guildMember?.joinedTimestamp),
      accountCreation: getValidDate(guildMember?.user.createdTimestamp),
    },
    personalInfo: {
      birthday: memberData?.birthday,
      nextBirthday: memberData?.nextBirthday,
      age: memberData?.age,
      firstName: memberData?.firstName,
      phoneNumber: memberData?.phoneNumber,
      email: memberData?.email,
      dietaryPreferences: memberData?.dietaryPreferences,
    },
    friendCodes: {
      switch: memberData?.switchFriendCode,
      pokemonTcgp: memberData?.pokemonTcgpFriendCode,
    },
    guildMember,
  }
}

export const getDoraMember = async ({
  guild,
  userId,
}: {
  guild: Guild
  userId: string
}) => {
  const guildMember = await getMember({
    guild,
    userId,
  })

  const memberData = await getMemberData({
    userId: guildMember.id,
    guildId: guild.id,
  })

  if (!memberData) {
    return mapToDoraMember({ guildMember })
  }

  const emojiCounts = await getMemberEmojiCounts({
    memberId: memberData.id,
    sortBy: "mostUsed",
    limit: 15,
  })

  return mapToDoraMember({
    guildMember,
    memberData,
    emojiCounts,
  })
}
