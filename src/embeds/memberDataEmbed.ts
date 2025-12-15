import { type APIEmbedField, EmbedBuilder, GuildMember } from "discord.js"

import { getActiveMemberFieldsMap } from "~/configs/memberFieldsConfig"
import type { MemberData } from "~/lib/database/memberDataService"
import type { EmojiCount } from "~/lib/database/memberEmojisService"
import {
  mapToMemberFields,
  type MemberFields,
  type MemberFieldsIds,
} from "~/lib/helpers/member"

import { getStaticGuildConfigById } from "../../guildConfigs"

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
  /** Which fields to show in embed (pre-guild filtering) and in which order */
  const embedOrder: MemberFieldsIds[] = [
    "firstName",
    "age",
    // "birthday", Not really relevant to show both age, next birthday AND birthday
    "nextBirthday",
    "email",
    "phoneNumber",
    "dietaryPreferences",
    "switchFriendCode",
    "pokemonTcgpFriendCode",
    "messageCount",
    "reactionCount",
    "latestMessageAt",
    "latestReactionAt",
    "favoriteEmojis",
    // "roles", A bit verbose to show in embeds as users often have a large number of roles
    "joinedServer",
    "accountCreation",
  ]

  const memberFieldsData: MemberFields = mapToMemberFields({
    guildMember,
    memberData,
    emojiCounts,
  })

  const activeFieldsConfig = getActiveMemberFieldsMap(
    getStaticGuildConfigById(guildId).optInMemberFields,
  )
  const filteredEmbedOrder = embedOrder
    .map((fieldId) => activeFieldsConfig[fieldId])
    .filter((fieldConfig) => fieldConfig !== undefined)

  return filteredEmbedOrder.map(
    (field) =>
      ({
        name: field.name,
        value: field.formatter?.(memberFieldsData, "compact") || "-",
        inline: true,
      }) satisfies APIEmbedField,
  )
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
