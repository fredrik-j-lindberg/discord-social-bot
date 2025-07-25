import { SlashCommandBuilder } from "discord.js"

import type { Command } from "~/events/interactionCreate/listeners/commandRouter"

const command = new SlashCommandBuilder()
  .setName("ping")
  .setDescription("Replies with Pong!")

export default {
  deferReply: false,
  command,
  data: { name: command.name },
  execute: () => {
    return "Pong!"
  },
} satisfies Command
