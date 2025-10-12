import { type Interaction, SlashCommandBuilder } from "discord.js"

import { getMemberDataEmbed } from "~/embeds/memberDataEmbed"
import type { Command } from "~/events/interactionCreate/listeners/commandRouter"
import { getMemberData } from "~/lib/database/memberDataService"
import { getMemberEmojiCounts } from "~/lib/database/memberEmojisService"
import {
  createDiscordTimestamp,
  createEmojiMention,
  createRoleMention,
} from "~/lib/discord/message"
import { getMember } from "~/lib/discord/user"
import { DoraUserException } from "~/lib/exceptions/DoraUserException"
import { formatDate } from "~/lib/helpers/date"
import { assertHasDefinedProperty, isOneOf } from "~/lib/validation"

import { getGuildConfigById } from "../../guildConfigs"

const memberOptionName = "member"
const memberDataOptionName = "memberdata"
const command = new SlashCommandBuilder()
  .setName("whois")
  .setDescription("Get info about a member")
  .addUserOption((option) =>
    option
      .setName(memberOptionName)
      .setDescription("The member to get info about")
      .setRequired(true),
  )
  .addStringOption((option) =>
    option
      .setName(memberDataOptionName)
      .setDescription("The specific piece of member data to retrieve")
      .setAutocomplete(true)
      .setRequired(false),
  )

export default {
  type: "chat",
  deferReply: true,
  command,
  data: { name: command.name },
  autocomplete: (interaction) => {
    assertHasDefinedProperty(
      interaction,
      "guild",
      "Command autocomplete issued without associated guild",
    )
    const guildConfig = getGuildConfigById(interaction.guild.id)
    return guildConfig.optInMemberFields.map((field) => ({
      name: field,
      value: field,
    }))
  },
  execute: async (interaction) => {
    const user = interaction.options.getUser(memberOptionName)
    if (!user) {
      throw new DoraUserException(
        `Required '${memberOptionName}' option is missing`,
      )
    }
    const specificMemberData =
      interaction.options.getString(memberDataOptionName)
    return handleWhoIs({
      interaction,
      userId: user.id,
      specificMemberData,
    })
  },
} satisfies Command

export const handleWhoIs = async ({
  interaction,
  userId,
  specificMemberData,
}: {
  interaction: Interaction
  userId: string
  /** Send if only interested in a specific piece of member data, can be useful if for example you want to copy paste a value */
  specificMemberData?: string | null
}) => {
  assertHasDefinedProperty(
    interaction,
    "guild",
    "Command issued without associated guild",
  )

  const guildMember = await getMember({
    guild: interaction.guild,
    userId,
  })

  const memberData = await getMemberData({
    userId: guildMember.id,
    guildId: interaction.guild.id,
  })

  if (!memberData) {
    return `No member data was found for ${guildMember.displayName}`
  }

  const emojiCounts = await getMemberEmojiCounts(memberData.id)

  // If we don't have a specific field requested, return the default embed
  if (!specificMemberData) {
    const embed = getMemberDataEmbed({
      guildId: interaction.guild.id,
      guildMember,
      memberData,
      emojiCounts,
    })
    return { embeds: [embed] }
  }

  const validChoices = getGuildConfigById(
    interaction.guild.id,
  ).optInMemberFields

  if (!isOneOf(specificMemberData, validChoices)) {
    throw new DoraUserException(
      `Invalid field for ${memberDataOptionName} specified ('${specificMemberData}'). Valid fields are: ${validChoices.join(
        ", ",
      )}`,
    )
  }

  // If the field should have special handling, add an if here. Otherwise it defaults to the value below
  if (specificMemberData === "joinedServer") {
    return (
      createDiscordTimestamp(guildMember.joinedTimestamp) ||
      `No server join date was found for ${guildMember.displayName}`
    )
  }
  if (specificMemberData === "accountCreation") {
    return (
      createDiscordTimestamp(guildMember.user.createdTimestamp) ||
      `No account creation date was found for ${guildMember.displayName}`
    )
  }
  if (specificMemberData === "birthday") {
    return memberData.birthday
      ? `${formatDate(memberData[specificMemberData])}, ${createDiscordTimestamp(memberData.nextBirthday)}`
      : `No birthday was found for ${guildMember.displayName}. They can add it via the /pii command`
  }
  if (specificMemberData === "latestMessageAt") {
    return (
      createDiscordTimestamp(memberData[specificMemberData]) ||
      `No latest message date found for ${guildMember.displayName}`
    )
  }
  if (specificMemberData === "latestReactionAt") {
    return (
      createDiscordTimestamp(memberData[specificMemberData]) ||
      `No latest reaction date found for ${guildMember.displayName}`
    )
  }
  if (specificMemberData === "roles") {
    return (
      memberData.roleIds.map((roleId) => createRoleMention(roleId)).join(" ") ||
      `No roles found for ${guildMember.displayName}`
    )
  }
  if (specificMemberData === "favoriteEmojis") {
    return (
      emojiCounts
        .slice(0, 10)
        .map(
          ({ emojiId, emojiName, count }) =>
            `${createEmojiMention(emojiName, emojiId)} (${count})`,
        )
        .join(", ") || `No favorite emojis found for ${guildMember.displayName}`
    )
  }

  return (
    memberData[specificMemberData]?.toString() ||
    `No ${specificMemberData} found for ${guildMember.displayName}`
  )
}
