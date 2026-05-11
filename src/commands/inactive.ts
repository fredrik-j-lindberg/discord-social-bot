import { SlashCommandBuilder } from "discord.js"

import {
  type Command,
  ephemeralOptionName,
} from "~/events/interactionCreate/listeners/commandRouter"
import { getGuildConfig } from "~/lib/database/guildConfigService"
import { getMarkedInactiveGuildMembers } from "~/lib/database/memberDataService"
import {
  createDiscordTimestamp,
  createPaginatedList,
  createUserMention,
} from "~/lib/discord/message"
import { DoraUserException } from "~/lib/exceptions/DoraUserException"
import { addDaysToDate } from "~/lib/helpers/date"
import { assertHasDefinedProperty } from "~/lib/validation"

const command = new SlashCommandBuilder()
  .setName("inactive")
  .setDescription("Lists members marked as inactive and their kick countdown")
  .setContexts(0) // Guild only
  .setDefaultMemberPermissions(0) // Administrator only
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

    const guildConfig = await getGuildConfig(interaction.guild.id)
    const inactivityConfig = guildConfig?.inactivity

    if (!inactivityConfig) {
      throw new DoraUserException(
        "Inactivity monitoring is not configured for this server. Use `/config` to set it up.",
      )
    }

    const inactiveMembers = await getMarkedInactiveGuildMembers({
      guildId: interaction.guild.id,
    })

    if (inactiveMembers.length === 0) {
      return {
        content: "🎉 No members are currently marked as inactive!",
      }
    }

    const items = inactiveMembers.map((member) => {
      const inactiveSince = member.stats.inactiveSince
      const kickDate = inactiveSince
        ? addDaysToDate(
            inactiveSince,
            inactivityConfig.daysAsInactiveBeforeKick,
          )
        : null

      const lastSeenText = member.stats.latestActivityAt
        ? createDiscordTimestamp(member.stats.latestActivityAt)
        : "Never"

      const kickCountdown = kickDate
        ? createDiscordTimestamp(kickDate)
        : "Unknown"

      return `${createUserMention(member.userId)} - Last seen: ${lastSeenText} - Will be kicked: ${kickCountdown}`
    })

    const pages = createPaginatedList({
      items,
      header: `⚠️ Inactive Members (${inactiveMembers.length})`,
      itemsPerPage: 10,
      listType: "bullet",
    })

    return {
      components: pages,
      flags: ["IsComponentsV2"],
    }
  },
} satisfies Command
