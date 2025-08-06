import {
  ChatInputCommandInteraction,
  Guild,
  SlashCommandBuilder,
} from "discord.js"

import type { Command } from "~/events/interactionCreate/listeners/commandRouter"
import type { UserData } from "~/lib/database/schema"
import {
  getUsersWithDietaryPreferences,
  getUsersWithPokemonTcgpFriendCode,
  getUsersWithUpcomingBirthday,
} from "~/lib/database/userData"
import { getMembersInRole } from "~/lib/discord/user"
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
    dietaryPreferences: {
      name: "Dietary Preferences",
      value: "dietaryPreferences",
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
        userDataTypeOptions.choices.dietaryPreferences,
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
  guild: NonNullable<ChatInputCommandInteraction["guild"]>
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

  if (field === "dietaryPreferences") {
    return await handleDietaryPreferencesFieldChoice({ interaction, role })
  }

  throw new Error(
    `The '${field}' field does not have an aggregate view yet, ask the Dora team to implement it!`,
  )
}

const composeUserdataList = ({
  title,
  usersData,
  valueSetter,
}: {
  title: string
  usersData: UserData[]
  valueSetter: (user: UserData) => string | null | undefined
}) => {
  if (usersData.length === 0) {
    throw new DoraUserException(
      "No data found, it can be added via the /pii command",
    )
  }

  const list = usersData
    .map((user) => {
      return `- **${user.displayName || user.username}**: ${valueSetter(user) || "-"}`
    })
    .join("\n")
  return `*${title}*\n${list}`
}

const handleBirthdayFieldChoice = async ({
  interaction,
}: {
  interaction: CommandInteractionWithGuild
}): Promise<string> => {
  const usersWithUpcomingBirthday = await getUsersWithUpcomingBirthday({
    guildId: interaction.guild.id,
  })
  return composeUserdataList({
    title: "Upcoming Birthdays",
    usersData: usersWithUpcomingBirthday,
    valueSetter: (user) => createDiscordTimestamp(user.nextBirthday),
  })
}

const handlePokemonTcgpFieldChoice = async ({
  interaction,
}: {
  interaction: CommandInteractionWithGuild
}): Promise<string> => {
  const usersWithTcgpAccount = await getUsersWithPokemonTcgpFriendCode({
    guildId: interaction.guild.id,
  })
  return composeUserdataList({
    title: "Pokemon TCGP Friend Codes",
    usersData: usersWithTcgpAccount,
    valueSetter: (user) => user.pokemonTcgpFriendCode,
  })
}

const optionallyFilterUsersByRole = async <TUser extends { userId: string }>({
  users,
  guild,
  roleId,
}: {
  users: TUser[]
  guild: Guild
  roleId?: string | null
}): Promise<TUser[]> => {
  if (!roleId) return users

  const membersInRole = await getMembersInRole({
    guild,
    roleId,
  })
  if (!membersInRole) {
    throw new DoraUserException(
      `Failed to fetch members in role with id ${roleId}`,
    )
  }

  return users.filter((user) => {
    const member = membersInRole.get(user.userId)
    return Boolean(member)
  })
}

const handleDietaryPreferencesFieldChoice = async ({
  interaction,
  role,
}: {
  interaction: CommandInteractionWithGuild
  /** Role to filter on */
  role: { id: string; name: string } | null
}): Promise<string> => {
  const usersWithDietaryPreferences = await getUsersWithDietaryPreferences({
    guildId: interaction.guild.id,
  })

  const filteredMembers = await optionallyFilterUsersByRole({
    users: usersWithDietaryPreferences,
    guild: interaction.guild,
    roleId: role?.id,
  })

  return composeUserdataList({
    title: role
      ? `Dietary preferences in role '${role.name}'`
      : "Dietary preferences",
    usersData: filteredMembers,
    valueSetter: (user) => user.dietaryPreferences,
  })
}
