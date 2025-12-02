import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js"

import {
  allMemberFieldsConfig,
  type DoraMemberFields,
} from "~/configs/memberDataConfig"
import type { Command } from "~/events/interactionCreate/listeners/commandRouter"
import {
  getMembersWithField,
  getMembersWithUpcomingBirthday,
  type MemberData,
} from "~/lib/database/memberDataService"
import type { MemberDataDbKeys } from "~/lib/database/schema"
import { createDiscordTimestamp } from "~/lib/discord/message"
import { DoraUserException } from "~/lib/exceptions/DoraUserException"
import { assertHasDefinedProperty, isOneOf } from "~/lib/validation"

import { getStaticGuildConfigById } from "../../guildConfigs"

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
    const guildConfig = getStaticGuildConfigById(interaction.guild.id)
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

    const validFieldChoices = Object.values(allMemberFieldsConfig).map(
      (config) => config.name,
    )
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
  const guildId = interaction.guild.id
  const commonOptions = { interaction, role, guildId }

  if (field === "birthday") {
    return await handleBirthdayFieldChoice({ ...commonOptions })
  }

  if (field === "pokemonTcgpFriendCode") {
    return await handleGenericDbFieldChoice({
      ...commonOptions,
      field,
      title: "Pokemon TCGP Friend Codes",
    })
  }

  if (field === "dietaryPreferences") {
    return await handleGenericDbFieldChoice({
      ...commonOptions,
      field,
      title: "Dietary Preferences",
    })
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
    throw new DoraUserException("No data found")
  }

  const list = membersData
    .map((memberData) => {
      return `- **${memberData.displayName || memberData.username}**: ${valueSetter(memberData) || "-"}`
    })
    .join("\n")
  return `*${title}*\n${list}`
}

/** Generic handling for fields that can be selected from the DB */
const handleGenericDbFieldChoice = async ({
  field,
  guildId,
  title,
  role,
}: {
  field: MemberDataDbKeys
  guildId: string
  title: string
  role: { id: string; name: string } | null
}) => {
  const filteredMembers = await getMembersWithField({
    guildId,
    field,
    roleIds: role ? [role.id] : undefined,
  })

  return composeMemberDataList({
    title: role ? `${title} in role '${role.name}'` : title,
    membersData: filteredMembers,
    valueSetter: (memberData) => memberData[field]?.toString(),
  })
}

const handleBirthdayFieldChoice = async ({
  interaction,
  role,
}: {
  interaction: CommandInteractionWithGuild
  /** Role to filter on */
  role: { id: string; name: string } | null
}): Promise<string> => {
  const membersWithUpcomingBirthday = await getMembersWithUpcomingBirthday({
    guildId: interaction.guild.id,
    roleIds: role ? [role.id] : undefined,
  })

  return composeMemberDataList({
    title: "Upcoming Birthdays",
    membersData: membersWithUpcomingBirthday,
    valueSetter: (memberData) =>
      createDiscordTimestamp(memberData.nextBirthday),
  })
}
