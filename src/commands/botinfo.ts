import { SlashCommandBuilder } from "discord.js"

import { announceRecentPhotoUploads } from "~/cron/recentPhotos"
import type { Command } from "~/events/interactionCreate/listeners/commandRouter"

const command = new SlashCommandBuilder()
  .setName("botinfo")
  .setDescription("Shows basic info about the bot")

export default {
  deferReply: false,
  command,
  data: { name: command.name },
  execute: () => {
    void announceRecentPhotoUploads()
    return "https://github.com/fredrik-j-lindberg/discord-social-bot"
  },
} satisfies Command
