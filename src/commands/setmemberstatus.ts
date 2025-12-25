import { SlashCommandBuilder } from "discord.js"

import {
  type Command,
  ephemeralOptionName,
} from "~/events/interactionCreate/listeners/commandRouter"
import { setMemberData } from "~/lib/database/memberDataService"
import type { MemberStatus } from "~/lib/database/schema"
import { DoraUserException } from "~/lib/exceptions/DoraUserException"
import { getDoraDatabaseMember } from "~/lib/helpers/doraMember"
import { assertHasDefinedProperty, isOneOf } from "~/lib/validation"

const userIdOptionName = "userid"
const statusOptionName = "status"

const validStatuses: MemberStatus[] = ["active", "inactive", "departed"]

const command = new SlashCommandBuilder()
  .setName("setmemberstatus")
  .setDescription("Manually set a member's status")
  .setContexts(0) // Guild only
  .setDefaultMemberPermissions(0) // Administrator only
  .addStringOption((option) =>
    option
      .setName(userIdOptionName)
      .setDescription("The Discord user ID to update")
      .setRequired(true),
  )
  .addStringOption((option) =>
    option
      .setName(statusOptionName)
      .setDescription("The status to set")
      .setRequired(true)
      .addChoices(
        // Currently only departed seems relevant, but uncomment these if you want to enable full manual status setting
        // { name: "Active", value: "active" },
        // { name: "Inactive", value: "inactive" },
        { name: "Departed", value: "departed" },
      ),
  )
  .addBooleanOption((option) =>
    option
      .setName(ephemeralOptionName)
      .setDescription("Whether to reply silently (only visible to you)")
      .setRequired(false),
  )

export default {
  type: "chat",
  deferReply: true,
  command,
  data: { name: command.name },
  execute: async (interaction) => {
    assertHasDefinedProperty(
      interaction,
      "guild",
      "Command issued without associated guild",
    )

    const targetUserId = interaction.options.getString(userIdOptionName)
    if (!targetUserId) {
      throw new DoraUserException(
        `Required option '${userIdOptionName}' is missing`,
      )
    }

    const status = interaction.options.getString(statusOptionName)
    if (!status) {
      throw new DoraUserException(
        `Required option '${statusOptionName}' is missing`,
      )
    }

    if (!isOneOf(status, validStatuses)) {
      throw new DoraUserException(
        `Invalid status '${status}'. Valid statuses are: ${validStatuses.join(", ")}`,
      )
    }

    const member = await getDoraDatabaseMember({
      guildId: interaction.guild.id,
      userId: targetUserId,
    })

    if (!member) {
      throw new DoraUserException(
        `No member data found for user with id ${targetUserId} in the member data.`,
      )
    }

    // Keep inactivity tracking consistent with manual status changes
    const inactiveSince = status === "inactive" ? new Date() : null

    await setMemberData({
      doraMember: {
        guildId: interaction.guild.id,
        userId: member.userId,
        username: member.username,
        displayName: member.displayName,
        status,
        stats: { inactiveSince },
      },
    })

    return `Changed status for **${member.displayName}** from \`${member.status ?? "unknown"}\` to \`${status}\``
  },
} satisfies Command
