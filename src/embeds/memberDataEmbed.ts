import { type APIEmbedField, EmbedBuilder, GuildMember } from "discord.js"

import type { MemberData } from "~/lib/database/schema"
import { createDiscordTimestamp } from "~/lib/helpers/date"

import { type DoraMemberFields, getGuildConfigById } from "../../guildConfigs"

const getFieldsRelevantForGuilds = ({
  guildId,
  memberData,
  guildMember,
}: {
  guildId: string
  memberData?: MemberData
  guildMember: GuildMember
}): APIEmbedField[] => {
  const optInEmbedFields: Record<DoraMemberFields, APIEmbedField[]> = {
    firstName: [
      {
        name: "First name",
        value: memberData?.firstName || "-",
        inline: true,
      },
    ],
    birthday: [
      { name: "Age", value: memberData?.age?.toString() || "-", inline: true },
      {
        name: "Next birthday",
        value: createDiscordTimestamp(memberData?.nextBirthday) || "-",
        inline: true,
      },
    ],
    switchFriendCode: [
      {
        name: "Switch friend code",
        value: memberData?.switchFriendCode || "-",
        inline: true,
      },
    ],
    pokemonTcgpFriendCode: [
      {
        name: "Pokémon TCGP",
        value: memberData?.pokemonTcgpFriendCode || "-",
        inline: true,
      },
    ],
    email: [
      {
        name: "Email",
        value: memberData?.email || "-",
        inline: true,
      },
    ],
    phoneNumber: [
      {
        name: "Phone number",
        value: memberData?.phoneNumber || "-",
        inline: true,
      },
    ],
    dietaryPreferences: [
      {
        name: "Dietary Preferences",
        value: memberData?.dietaryPreferences || "-",
        inline: true,
      },
    ],
    joinedServer: [
      {
        name: "Joined server",
        value: createDiscordTimestamp(guildMember.joinedTimestamp) || "-",
        inline: true,
      },
    ],
    accountCreation: [
      {
        name: "Account creation",
        value: createDiscordTimestamp(guildMember.user.createdTimestamp) || "-",
        inline: true,
      },
    ],
    messageCount: [
      {
        name: "Message count",
        value: memberData?.messageCount.toString() || "-",
        inline: true,
      },
    ],
    latestMessageAt: [
      {
        name: "Latest Message",
        value: createDiscordTimestamp(memberData?.latestMessageAt) || "-",
        inline: true,
      },
    ],
    reactionCount: [
      {
        name: "Reaction count",
        value: memberData?.reactionCount.toString() || "-",
        inline: true,
      },
    ],
    latestReactionAt: [
      {
        name: "Latest Reaction",
        value: createDiscordTimestamp(memberData?.latestReactionAt) || "-",
        inline: true,
      },
    ],
  }
  const guildConfig = getGuildConfigById(guildId)
  const relevantFields = Object.entries(optInEmbedFields)
    .map(([key, value]) => {
      if (!guildConfig.optInMemberFields.includes(key as DoraMemberFields)) {
        return null
      }
      return value
    })
    .filter(Boolean) as APIEmbedField[][]
  return relevantFields.flat()
}

export const getMemberDataEmbed = ({
  guildId,
  guildMember,
  memberData,
}: {
  guildId: string
  guildMember: GuildMember
  memberData?: MemberData
}) => {
  return new EmbedBuilder()
    .setColor(0x0099ff)
    .setTitle(guildMember.displayName)
    .setThumbnail(guildMember.displayAvatarURL())
    .addFields(getFieldsRelevantForGuilds({ guildId, memberData, guildMember }))
    .setFooter({
      text: "Add or update your member data with the /pii command",
    })
}
