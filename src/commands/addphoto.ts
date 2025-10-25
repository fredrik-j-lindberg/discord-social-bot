import { SlashCommandBuilder } from "discord.js"

import type { Command } from "~/events/interactionCreate/listeners/commandRouter"
import photoModal from "~/modals/photoModal"

const command = new SlashCommandBuilder()
  .setName("addphoto")
  .setDescription("Adds a photo to the channel")

export default {
  type: "chat",
  deferReply: false,
  command,
  data: { name: command.name },
  execute: async (interaction) => {
    const modal = photoModal.createModal()
    await interaction.showModal(modal)
    return undefined // Modal submission will handle response
  },
} satisfies Command
