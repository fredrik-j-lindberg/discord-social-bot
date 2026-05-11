import { SlashCommandBuilder } from "discord.js"

import {
  type Command,
  ephemeralOptionName,
} from "~/events/interactionCreate/listeners/commandRouter"

const command = new SlashCommandBuilder()
  .setName("botinfo")
  .setDescription("Shows basic info about the bot")
  .setContexts(0) // Guild only
  .addBooleanOption((option) =>
    option
      .setName(ephemeralOptionName)
      .setDescription("Whether to reply silently (only visible to you)")
      .setRequired(false),
  )

export default {
  type: "chat",
  deferReply: false,
  command,
  data: { name: command.name },
  execute: () => {
    return "https://github.com/fredrik-j-lindberg/discord-social-bot"
  },
} satisfies Command
