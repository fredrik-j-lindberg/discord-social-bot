import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js"

import {
  getActiveMemberFields,
  getActiveMemberFieldsMap,
  type MemberFieldConfig,
} from "~/configs/memberFieldsConfig"
import type { Command } from "~/events/interactionCreate/listeners/commandRouter"
import {
  getMembersWithField,
  type MemberData,
  type MemberDataDbKeysWithExtras,
} from "~/lib/database/memberDataService"
import { DoraUserException } from "~/lib/exceptions/DoraUserException"
import type { MemberFieldsIds } from "~/lib/helpers/member"
import { assertHasDefinedProperty, isOneOf } from "~/lib/validation"

import { getStaticGuildConfigById } from "../../guildConfigs"

// Fields backed by the member data table (simple aggregation)
const dbSupportedFields = [
  "firstName",
  "birthday",
  "age",
  "nextBirthday",
  "phoneNumber",
  "email",
  "switchFriendCode",
  "pokemonTcgpFriendCode",
  "dietaryPreferences",
  "messageCount",
  "latestMessageAt",
  "reactionCount",
  "latestReactionAt",
] as const satisfies MemberDataDbKeysWithExtras[]

const memberDataOptionName = "memberdata"
const roleOptionName = "role"
const command = new SlashCommandBuilder()
  .setName("memberdata")
  .setDescription("Lists member data by field")
  .setContexts(0) // Guild only
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
    return Object.values(getActiveMemberFields(guildConfig)).map((field) => ({
      name: field.name,
      value: field.id,
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

    const validChoices = getActiveMemberFields(
      getStaticGuildConfigById(interaction.guild.id),
    ).map((validField) => validField.id)

    if (!isOneOf(field, validChoices)) {
      throw new DoraUserException(
        `Invalid field '${field}' provided. Valid fields are: ${validChoices.join(
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
  field: MemberFieldsIds
  role?: { id: string } | null
}) => {
  const role = interaction.options.getRole(roleOptionName)
  const guildId = interaction.guild.id

  const activeFieldsConfig = getActiveMemberFieldsMap(
    getStaticGuildConfigById(guildId),
  )
  const fieldConfig = activeFieldsConfig[field]

  if (!fieldConfig) {
    throw new DoraUserException(
      `The '${field}' field is not active for this guild or has no configuration.`,
    )
  }

  if (isOneOf(field, dbSupportedFields)) {
    return await handleGenericDbFieldChoice({
      field,
      fieldConfig,
      guildId,
      role: role ? { id: role.id, name: role.name } : null,
      title: fieldConfig.name,
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
    throw new DoraUserException("No data found", {
      severity: DoraUserException.Severity.Info,
    })
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
  fieldConfig,
  guildId,
  title,
  role,
}: {
  field: (typeof dbSupportedFields)[number]
  fieldConfig: MemberFieldConfig
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
    valueSetter: (memberData) => {
      const value = memberData[field]
      return fieldConfig.formatter?.({ [field]: value }) || "-"
    },
  })
}
