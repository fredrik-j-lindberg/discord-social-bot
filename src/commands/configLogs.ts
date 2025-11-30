import { SlashCommandBuilder } from "discord.js"

import type { Command } from "~/events/interactionCreate/listeners/commandRouter"
import { getGuildConfig } from "~/lib/database/guildConfigService"
import { DoraUserException } from "~/lib/exceptions/DoraUserException"
import guildConfigLogsModal from "~/modals/guildConfigLogsModal"

const command = new SlashCommandBuilder()
  .setName("config")
  .setDescription("Configure guild settings")
  .setContexts(0) // Guild only
  .setDefaultMemberPermissions(0) // Administrator only
  .addStringOption((option) =>
    option
      .setName("setting")
      .setDescription("What part of the config to configure")
      .setRequired(true)
      .addChoices({ name: "Logs", value: "logs" }),
  )

export default {
  type: "chat",
  deferReply: false,
  command,
  data: { name: command.name },
  execute: async (interaction) => {
    if (!interaction.guild) {
      return "This command can only be used in a server"
    }

    const setting = interaction.options.getString("setting", true)

    // Fetch current config to pre-fill modal
    const currentConfig = await getGuildConfig(interaction.guild.id)

    // Route to appropriate modal based on setting
    switch (setting) {
      case "logs": {
        const modal = guildConfigLogsModal.createModal(currentConfig)
        await interaction.showModal(modal)
        return undefined // No immediate reply since we're showing a modal
      }
      default:
        throw new DoraUserException(`Unknown setting: ${setting}`)
    }
  },
} satisfies Command
