import { SlashCommandBuilder } from "discord.js"

import { getUserDataEmbed } from "~/embeds/userDataEmbed"
import type { Command } from "~/events/interactionCreate/listeners/commandRouter"
import { getUserData } from "~/lib/database/userData"
import { getMember } from "~/lib/discord/user"
import { DoraUserException } from "~/lib/exceptions/DoraUserException"
import { createDiscordTimestamp, formatDate } from "~/lib/helpers/date"
import { assertHasDefinedProperty, isOneOf } from "~/lib/validation"

import { getGuildConfigById } from "../../guildConfigs"

const noDataMessage =
  "No data found. You can ask them to add it via the /pii command!"

const userOptionName = "user"
const userDataOptionName = "userdata"
const command = new SlashCommandBuilder()
  .setName("whois")
  .setDescription("Get info about a user")
  .addUserOption((option) =>
    option
      .setName(userOptionName)
      .setDescription("The user to get info about")
      .setRequired(true),
  )
  .addStringOption((option) =>
    option
      .setName(userDataOptionName)
      .setDescription("The specific piece of user data to retrieve")
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
      "Whois autocomplete issued without associated guild",
    )
    const guildConfig = getGuildConfigById(interaction.guild.id)
    return guildConfig.optInUserFields.map((field) => ({
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

    const user = interaction.options.getUser(userOptionName)
    if (!user) {
      throw new DoraUserException("Required user option is missing")
    }

    const member = await getMember({ guild: interaction.guild, user })

    const userData = await getUserData({
      userId: user.id,
      guildId: interaction.guild.id,
    })

    if (!userData) {
      return noDataMessage
    }

    const specificField = interaction.options.getString(userDataOptionName)
    // If we don't have a specific field requested, return the default embed
    if (!specificField) {
      const embed = getUserDataEmbed({
        guildId: interaction.guild.id,
        member,
        userData,
      })
      return { embeds: [embed] }
    }

    const validChoices = getGuildConfigById(
      interaction.guild.id,
    ).optInUserFields

    if (!isOneOf(specificField, validChoices)) {
      throw new DoraUserException(
        `Invalid field for ${userDataOptionName} specified ('${specificField}'). Valid fields are: ${validChoices.join(
          ", ",
        )}`,
      )
    }

    // If the field should have special handling, add an if here. Otherwise it defaults to the value below
    if (specificField === "joinedServer") {
      return createDiscordTimestamp(member.joinedTimestamp) || noDataMessage
    }
    if (specificField === "accountCreation") {
      return (
        createDiscordTimestamp(member.user.createdTimestamp) || noDataMessage
      )
    }
    if (specificField === "birthday") {
      return userData.birthday
        ? `${formatDate(userData[specificField])}, ${createDiscordTimestamp(userData.nextBirthday)}`
        : noDataMessage
    }
    if (specificField === "latestMessageAt") {
      return createDiscordTimestamp(userData[specificField]) || noDataMessage
    }
    if (specificField === "latestReactionAt") {
      return createDiscordTimestamp(userData[specificField]) || noDataMessage
    }

    return userData[specificField]?.toString() || noDataMessage
  },
} satisfies Command
