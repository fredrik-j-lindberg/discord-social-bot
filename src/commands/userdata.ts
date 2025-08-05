import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js"

import type { Command } from "~/events/interactionCreate/listeners/commandRouter"
import {
  getUsersWithPokemonTcgpFriendCode,
  getUsersWithUpcomingBirthday,
} from "~/lib/database/userData"
import { DoraUserException } from "~/lib/exceptions/DoraUserException"
import { createDiscordTimestamp } from "~/lib/helpers/date"
import { assertHasDefinedProperty, isOneOf } from "~/lib/validation"

import type { OptInUserFields } from "../../guildConfigs"

interface UserDataTypeOption {
  name: string
  choices: Record<string, { name: string; value: OptInUserFields }>
}

const userDataTypeOptions = {
  name: "field",
  choices: {
    birthdays: {
      name: "Upcoming Birthdays",
      value: "birthday",
    },
    pokemonTcgp: {
      name: "Pokemon TCGP Friend Code",
      value: "pokemonTcgpFriendCode",
    },
  },
} satisfies UserDataTypeOption
const validFieldChoices = Object.values(userDataTypeOptions.choices).map(
  (choice) => choice.value,
)

const command = new SlashCommandBuilder()
  .setName("userdata")
  .setDescription("Lists user data by field")
  .addStringOption((option) =>
    option
      .setName(userDataTypeOptions.name)
      .setDescription("List user data for field")
      .setRequired(true)
      .setChoices(
        userDataTypeOptions.choices.birthdays,
        userDataTypeOptions.choices.pokemonTcgp,
      ),
  )
  .addRoleOption((option) =>
    option
      .setName("role")
      .setDescription("Optionally filter by role")
      .setRequired(false),
  )

export default {
  deferReply: true,
  command,
  data: { name: command.name },
  execute: async (interaction) => {
    assertHasDefinedProperty(
      interaction,
      "guild",
      "Command issued without associated guild",
    )

    const field = interaction.options.getString(userDataTypeOptions.name)
    if (!field) {
      throw new DoraUserException(
        `Required option '${userDataTypeOptions.name}' is missing`,
      )
    }

    if (!isOneOf(field, validFieldChoices)) {
      throw new DoraUserException(
        `Invalid field '${field}' provided. Valid fields are: ${validFieldChoices.join(
          ", ",
        )}`,
      )
    }

    return await handleFieldChoice({ interaction, field })
  },
} satisfies Command

type CommandInteractionWithGuild = Omit<
  ChatInputCommandInteraction,
  "guild"
> & {
  guild: { id: string }
}

const handleFieldChoice = async ({
  interaction,
  field,
}: {
  interaction: CommandInteractionWithGuild
  field: OptInUserFields
  role?: { id: string } | null
}) => {
  const role = interaction.options.getRole("role")
  if (field === "birthday") {
    if (role) {
      throw new DoraUserException(
        "Role filter is not yet supported for the birthday field.",
      )
    }
    return await handleBirthdayFieldChoice({ interaction })
  }

  if (field === "pokemonTcgpFriendCode") {
    if (role) {
      throw new DoraUserException(
        "Role filter is not yet supported for the pokemonTcgp field.",
      )
    }
    return await handlePokemonTcgpFieldChoice({ interaction })
  }

  throw new Error(`Was unable to handle userdata field: ${field}`)
}

const handleBirthdayFieldChoice = async ({
  interaction,
}: {
  interaction: CommandInteractionWithGuild
}): Promise<string> => {
  const membersWithUpcomingBirthday = await getUsersWithUpcomingBirthday({
    guildId: interaction.guild.id,
  })
  if (membersWithUpcomingBirthday.length === 0) {
    throw new DoraUserException(
      "No upcoming birthdays found, add yours via the /pii modal",
    )
  }
  return membersWithUpcomingBirthday
    .map(({ username, displayName, nextBirthday }) => {
      return `**${displayName || username}**: ${createDiscordTimestamp(nextBirthday) || "-"}`
    })
    .join("\n")
}

const handlePokemonTcgpFieldChoice = async ({
  interaction,
}: {
  interaction: CommandInteractionWithGuild
}): Promise<string> => {
  const membersWithTcgpAccount = await getUsersWithPokemonTcgpFriendCode({
    guildId: interaction.guild.id,
  })
  if (membersWithTcgpAccount.length === 0) {
    throw new DoraUserException(
      "No users with TCGP friend code found, add yours via the /pii modal",
    )
  }
  return membersWithTcgpAccount
    .map(({ username, displayName, pokemonTcgpFriendCode }) => {
      return `**${displayName || username}**: ${pokemonTcgpFriendCode}`
    })
    .join("\n")
}
