import type { Guild, GuildMember } from "discord.js"

import { getMemberData, type MemberData } from "../database/memberDataService"
import {
  type EmojiCount,
  getMemberEmojiCounts,
} from "../database/memberEmojisService"
import { getMember } from "../discord/user"
import { DoraException } from "../exceptions/DoraException"
import { getValidDate } from "./date"

interface MemberOptInFields {
  birthday?: Date | null
  firstName?: string | null
  phoneNumber?: string | null
  email?: string | null
  dietaryPreferences?: string | null
  switchFriendCode?: string | null
  pokemonTcgpFriendCode?: string | null
}
export type MemberOptInFieldIds = keyof MemberOptInFields

interface MemberDoraProvidedFields {
  messageCount?: number | null
  latestMessageAt?: Date | null
  reactionCount?: number | null
  latestReactionAt?: Date | null
  favoriteEmojis?: EmojiCount[] | null
  nextBirthday?: Date | null
  age?: number | null
  roles?: string[] | null
  joinedServer?: Date | null
  accountCreation?: Date | null
}

type MemberDoraProvidedFieldIds = keyof MemberDoraProvidedFields

export type MemberFields = MemberOptInFields & MemberDoraProvidedFields

export type MemberFieldsIds = MemberOptInFieldIds | MemberDoraProvidedFieldIds

/** The official Dora member representation, combining data from both discord and Dora member database */
export interface DoraMember {
  username: string
  /** Picked from Discord guild member data or the dora member database. Defaults to username if for some reason neither of those are set */
  displayName: string
  guildMember?: GuildMember
  /** The fields that automatically maps to functionality used for e.g. /whois and /memberdata together with the memberFieldsConfig */
  fields: MemberFields
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

  return {
    username,
    displayName,
    fields: {
      firstName: memberData?.firstName,
      phoneNumber: memberData?.phoneNumber,
      email: memberData?.email,
      dietaryPreferences: memberData?.dietaryPreferences,
      switchFriendCode: memberData?.switchFriendCode,
      pokemonTcgpFriendCode: memberData?.pokemonTcgpFriendCode,
      birthday: memberData?.birthday,
      messageCount: memberData?.messageCount,
      latestMessageAt: memberData?.latestMessageAt,
      reactionCount: memberData?.reactionCount,
      latestReactionAt: memberData?.latestReactionAt,
      favoriteEmojis: emojiCounts,
      nextBirthday: memberData?.nextBirthday,
      age: memberData?.age,
      roles: memberData?.roleIds.filter(
        (roleId) => roleId !== guildMember?.guild.id, // Remove the irrelevant @everyone role
      ),
      joinedServer: getValidDate(guildMember?.joinedTimestamp),
      accountCreation: getValidDate(guildMember?.user.createdTimestamp),
    },
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
