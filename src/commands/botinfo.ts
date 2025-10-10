import { SlashCommandBuilder } from "discord.js"

import type { Command } from "~/events/interactionCreate/listeners/commandRouter"

const command = new SlashCommandBuilder()
  .setName("botinfo")
  .setDescription("Shows basic info about the bot")

export default {
  type: "chat",
  deferReply: false,
  command,
  data: { name: command.name },
  execute: () => {
    return "https://github.com/fredrik-j-lindberg/discord-social-bot"
  },
} satisfies Command
