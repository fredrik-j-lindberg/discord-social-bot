import { SlashCommandBuilder } from "discord.js"

import type { Command } from "~/events/interactionCreate/listeners/commandRouter"
import { assertHasDefinedProperty } from "~/lib/validation"
import tagModal from "~/modals/tagModal"

const command = new SlashCommandBuilder()
  .setName("addtag")
  .setDescription(
    "Adds a tag to the bot database that can be used for categorizing items such as photos",
  )

export default {
  type: "chat",
  deferReply: false,
  command,
  data: { name: command.name },
  execute: async (interaction) => {
    assertHasDefinedProperty(
      interaction,
      "guild",
      "Command issued without associated guild",
    )
    const modal = await tagModal.createModal()
    await interaction.showModal(modal)
    return undefined
  },
} satisfies Command
