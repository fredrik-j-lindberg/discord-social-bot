import { SlashCommandBuilder } from "discord.js"

import type { Command } from "../commandRouter"

export default {
  deferReply: false,
  data: new SlashCommandBuilder()
    .setName("botinfo")
    .setDescription("Shows basic info about the bot"),
  execute: () => {
    return "https://github.com/fredrik-j-lindberg/discord-social-bot"
  },
} satisfies Command
