import { SlashCommandBuilder } from "discord.js"

import { getMemberDataEmbed } from "~/embeds/memberDataEmbed"
import type { Command } from "~/events/interactionCreate/listeners/commandRouter"
import { getMemberData } from "~/lib/database/memberDataService"
import { createRoleMention } from "~/lib/discord/message"
import { getMember } from "~/lib/discord/user"
import { DoraUserException } from "~/lib/exceptions/DoraUserException"
import { createDiscordTimestamp, formatDate } from "~/lib/helpers/date"
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
    assertHasDefinedProperty(
      interaction,
      "guild",
      "Command issued without associated guild",
    )

    const user = interaction.options.getUser(memberOptionName)
    if (!user) {
      throw new DoraUserException(
        `Required '${memberOptionName}' option is missing`,
      )
    }

    const guildMember = await getMember({ guild: interaction.guild, user })

    const memberData = await getMemberData({
      userId: guildMember.id,
      guildId: interaction.guild.id,
    })

    if (!memberData) {
      return `No member data was found for ${user.displayName}`
    }

    const specificField = interaction.options.getString(memberDataOptionName)
    // If we don't have a specific field requested, return the default embed
    if (!specificField) {
      const embed = getMemberDataEmbed({
        guildId: interaction.guild.id,
        guildMember,
        memberData,
      })
      return { embeds: [embed] }
    }

    const validChoices = getGuildConfigById(
      interaction.guild.id,
    ).optInMemberFields

    if (!isOneOf(specificField, validChoices)) {
      throw new DoraUserException(
        `Invalid field for ${memberDataOptionName} specified ('${specificField}'). Valid fields are: ${validChoices.join(
          ", ",
        )}`,
      )
    }

    // If the field should have special handling, add an if here. Otherwise it defaults to the value below
    if (specificField === "joinedServer") {
      return (
        createDiscordTimestamp(guildMember.joinedTimestamp) ||
        `No server join date was found for ${user.displayName}`
      )
    }
    if (specificField === "accountCreation") {
      return (
        createDiscordTimestamp(guildMember.user.createdTimestamp) ||
        `No account creation date was found for ${user.displayName}`
      )
    }
    if (specificField === "birthday") {
      return memberData.birthday
        ? `${formatDate(memberData[specificField])}, ${createDiscordTimestamp(memberData.nextBirthday)}`
        : `No birthday was found for ${user.displayName}. They can add it via the /pii command`
    }
    if (specificField === "latestMessageAt") {
      return (
        createDiscordTimestamp(memberData[specificField]) ||
        `No latest message date found for ${user.displayName}`
      )
    }
    if (specificField === "latestReactionAt") {
      return (
        createDiscordTimestamp(memberData[specificField]) ||
        `No latest reaction date found for ${user.displayName}`
      )
    }
    if (specificField === "roles") {
      return (
        memberData.roleIds
          .map((roleId) => createRoleMention(roleId))
          .join(" ") || `No roles found for ${user.displayName}`
      )
    }

    return (
      memberData[specificField]?.toString() ||
      `No ${specificField} found for ${user.displayName}`
    )
  },
} satisfies Command
