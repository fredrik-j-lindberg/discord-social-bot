import { type APIEmbedField, EmbedBuilder, GuildMember } from "discord.js"

import type { MemberData } from "~/lib/database/memberDataService"
import type { EmojiCount } from "~/lib/database/memberEmojisService"
import {
  createCopyableText,
  createDiscordTimestamp,
  createEmojiMention,
  createRoleMention,
} from "~/lib/discord/message"

import { type DoraMemberFields, getGuildConfigById } from "../../guildConfigs"

const getFieldsRelevantForGuilds = ({
  guildId,
  guildMember,
  memberData,
  emojiCounts,
}: {
  guildId: string
  guildMember: GuildMember
  memberData?: MemberData
  emojiCounts: EmojiCount[]
}): APIEmbedField[] => {
  const optInEmbedFields: Record<DoraMemberFields, APIEmbedField[]> = {
    firstName: [
      {
        name: "First Name",
        value: createCopyableText(memberData?.firstName) || "-",
        inline: true,
      },
    ],
    birthday: [
      {
        name: "Age",
        value: createCopyableText(memberData?.age?.toString()) || "-",
        inline: true,
      },
      {
        name: "Next Birthday",
        value: createDiscordTimestamp(memberData?.nextBirthday) || "-",
        inline: true,
      },
    ],
    switchFriendCode: [
      {
        name: "Switch Friend Code",
        value: createCopyableText(memberData?.switchFriendCode) || "-",
        inline: true,
      },
    ],
    pokemonTcgpFriendCode: [
      {
        name: "Pokémon TCGP",
        value: createCopyableText(memberData?.pokemonTcgpFriendCode) || "-",
        inline: true,
      },
    ],
    email: [
      {
        name: "Email",
        value: createCopyableText(memberData?.email) || "-",
        inline: true,
      },
    ],
    phoneNumber: [
      {
        name: "Phone Number",
        value: createCopyableText(memberData?.phoneNumber) || "-",
        inline: true,
      },
    ],
    dietaryPreferences: [
      {
        name: "Dietary Preferences",
        value: createCopyableText(memberData?.dietaryPreferences) || "-",
        inline: true,
      },
    ],
    joinedServer: [
      {
        name: "Joined Server",
        value: createDiscordTimestamp(guildMember.joinedTimestamp) || "-",
        inline: true,
      },
    ],
    accountCreation: [
      {
        name: "Account Creation",
        value: createDiscordTimestamp(guildMember.user.createdTimestamp) || "-",
        inline: true,
      },
    ],
    messageCount: [
      {
        name: "Message Count",
        value: createCopyableText(memberData?.messageCount.toString()) || "-",
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
        name: "Reaction Count",
        value: createCopyableText(memberData?.reactionCount.toString()) || "-",
        inline: true,
      },
    ],
    favoriteEmojis: [
      {
        name: "Favorite Emojis",
        value:
          emojiCounts
            .slice(0, 3)
            .map(({ emojiId, emojiName }) =>
              createEmojiMention(emojiName, emojiId),
            )
            .join(" ") || "-",
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
    roles: [
      {
        name: "Roles",
        value:
          memberData?.roleIds
            .filter((roleId) => roleId !== guildId) // Remove the irrelevant @everyone role
            .map((roleId) => createRoleMention(roleId))
            .join(" ") || "-",
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
  emojiCounts,
}: {
  guildId: string
  guildMember: GuildMember
  memberData?: MemberData
  emojiCounts: EmojiCount[]
}) => {
  return new EmbedBuilder()
    .setColor(0x0099ff)
    .setTitle(guildMember.displayName)
    .setThumbnail(guildMember.displayAvatarURL())
    .addFields(
      getFieldsRelevantForGuilds({
        guildId,
        memberData,
        guildMember,
        emojiCounts,
      }),
    )
    .setFooter({
      text: "Add or update your member data with the /pii command",
    })
}
