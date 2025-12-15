import { type APIEmbedField, EmbedBuilder } from "discord.js"

import { getActiveMemberFieldsMap } from "~/configs/memberFieldsConfig"
import { type DoraMember, type MemberFieldsIds } from "~/lib/helpers/member"

import { getStaticGuildConfigById } from "../../guildConfigs"

/** Which fields to show in embed (pre-guild filtering) and in which order */
const embedFieldOrder: MemberFieldsIds[] = [
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

const getFieldsRelevantForGuilds = ({
  guildId,
  doraMember,
}: {
  guildId: string
  doraMember: DoraMember
}): APIEmbedField[] => {
  const activeFieldsConfig = getActiveMemberFieldsMap(
    getStaticGuildConfigById(guildId).optInMemberFields,
  )
  const filteredEmbedOrder = embedFieldOrder
    .map((fieldId) => activeFieldsConfig[fieldId])
    .filter((fieldConfig) => fieldConfig !== undefined)

  return filteredEmbedOrder.map(
    (field) =>
      ({
        name: field.name,
        value: field.formatter?.(doraMember.fields, "compact") || "-",
        inline: true,
      }) satisfies APIEmbedField,
  )
}

export const getMemberDataEmbed = ({
  guildId,
  doraMember,
}: {
  guildId: string
  doraMember: DoraMember
}) => {
  return new EmbedBuilder()
    .setColor(0x0099ff)
    .setTitle(doraMember.displayName)
    .setThumbnail(doraMember.guildMember?.displayAvatarURL() || null)
    .addFields(
      getFieldsRelevantForGuilds({
        guildId,
        doraMember,
      }),
    )
    .setFooter({
      text: "Add or update your member data with the /pii command",
    })
}
