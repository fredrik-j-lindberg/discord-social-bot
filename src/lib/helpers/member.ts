import type { GuildMember } from "discord.js"

import type { MemberData } from "../database/memberDataService"
import type { EmojiCount } from "../database/memberEmojisService"
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

export const mapToMemberFields = ({
  guildMember,
  memberData,
  emojiCounts,
}: {
  guildMember?: GuildMember
  memberData?: MemberData | null
  emojiCounts?: EmojiCount[]
}): MemberFields => {
  return {
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
  }
}
