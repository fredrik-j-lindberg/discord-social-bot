import {
  ChatInputCommandInteraction,
  Guild,
  SlashCommandBuilder,
} from "discord.js"

import type { Command } from "~/events/interactionCreate/listeners/commandRouter"
import {
  getMembersWithDietaryPreferences,
  getMembersWithPokemonTcgpFriendCode,
  getMembersWithUpcomingBirthday,
} from "~/lib/database/memberDataDb"
import type { MemberData } from "~/lib/database/schema"
import { getMembersInRole } from "~/lib/discord/user"
import { DoraUserException } from "~/lib/exceptions/DoraUserException"
import { createDiscordTimestamp } from "~/lib/helpers/date"
import { assertHasDefinedProperty, isOneOf } from "~/lib/validation"

import {
  type DoraMemberFields,
  getGuildConfigById,
  SUPPORTED_MEMBER_FIELDS,
} from "../../guildConfigs"

const memberDataOptionName = "memberdata"
const roleOptionName = "role"
const command = new SlashCommandBuilder()
  .setName("memberdata")
  .setDescription("Lists member data by field")
  .addStringOption((option) =>
    option
      .setName(memberDataOptionName)
      .setDescription("List member data for field")
      .setRequired(true)
      .setAutocomplete(true),
  )
  .addRoleOption((option) =>
    option
      .setName(roleOptionName)
      .setDescription("Optionally filter by role")
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

    const field = interaction.options.getString(memberDataOptionName)
    if (!field) {
      throw new DoraUserException(
        `Required option '${memberDataOptionName}' is missing`,
      )
    }

    const validFieldChoices = Object.values(SUPPORTED_MEMBER_FIELDS)
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
  field: DoraMemberFields
  role?: { id: string } | null
}) => {
  const role = interaction.options.getRole(roleOptionName)
  if (field === "birthday") {
    return await handleBirthdayFieldChoice({ interaction, role })
  }

  if (field === "pokemonTcgpFriendCode") {
    return await handlePokemonTcgpFieldChoice({ interaction, role })
  }

  if (field === "dietaryPreferences") {
    return await handleDietaryPreferencesFieldChoice({ interaction, role })
  }

  throw new DoraUserException(
    `The '${field}' field does not have an aggregate view yet, ask the Dora team to implement it!`,
  )
}

const composeMemberDataList = ({
  title,
  membersData,
  valueSetter,
}: {
  title: string
  membersData: MemberData[]
  valueSetter: (memberData: MemberData) => string | null | undefined
}) => {
  if (membersData.length === 0) {
    throw new DoraUserException(
      "No data found, it can be added via the /pii command",
    )
  }

  const list = membersData
    .map((memberData) => {
      return `- **${memberData.displayName || memberData.username}**: ${valueSetter(memberData) || "-"}`
    })
    .join("\n")
  return `*${title}*\n${list}`
}

const handleBirthdayFieldChoice = async ({
  interaction,
  role,
}: {
  interaction: CommandInteractionWithGuild
  /** Role to filter on */
  role: { id: string; name: string } | null
}): Promise<string> => {
  const membersInRole =
    role &&
    (await getMembersInRole({
      guild: interaction.guild,
      roleId: role.id,
    }))

  if (role && !membersInRole?.size) {
    throw new DoraUserException(`No members found in role '${role.name}'`)
  }

  const membersWithUpcomingBirthday = await getMembersWithUpcomingBirthday({
    guildId: interaction.guild.id,
    userIds: membersInRole?.map((guildMember) => guildMember.id),
  })

  return composeMemberDataList({
    title: "Upcoming Birthdays",
    membersData: membersWithUpcomingBirthday,
    valueSetter: (memberData) =>
      createDiscordTimestamp(memberData.nextBirthday),
  })
}

const handlePokemonTcgpFieldChoice = async ({
  interaction,
  role,
}: {
  interaction: CommandInteractionWithGuild
  /** Role to filter on */
  role: { id: string; name: string } | null
}): Promise<string> => {
  const filteredMembers = await optionallyFilterMembersByRole({
    membersData: await getMembersWithPokemonTcgpFriendCode({
      guildId: interaction.guild.id,
    }),
    guild: interaction.guild,
    roleId: role?.id,
  })

  return composeMemberDataList({
    title: "Pokemon TCGP Friend Codes",
    membersData: filteredMembers,
    valueSetter: (memberData) => memberData.pokemonTcgpFriendCode,
  })
}

const optionallyFilterMembersByRole = async <
  TMemberData extends { userId: string },
>({
  membersData,
  guild,
  roleId,
}: {
  membersData: TMemberData[]
  guild: Guild
  /** If sent as falsy, will return the members list unfiltered */
  roleId?: string | null
}): Promise<TMemberData[]> => {
  if (!roleId) return membersData

  const membersInRole = await getMembersInRole({
    guild,
    roleId,
  })
  if (!membersInRole) {
    throw new DoraUserException(`No members found in role '${roleId}'`)
  }

  return membersData.filter((member) => {
    return Boolean(membersInRole.get(member.userId))
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
  const filteredMembers = await optionallyFilterMembersByRole({
    membersData: await getMembersWithDietaryPreferences({
      guildId: interaction.guild.id,
    }),
    guild: interaction.guild,
    roleId: role?.id,
  })

  return composeMemberDataList({
    title: role
      ? `Dietary preferences in role '${role.name}'`
      : "Dietary preferences",
    membersData: filteredMembers,
    valueSetter: (memberData) => memberData.dietaryPreferences,
  })
}
