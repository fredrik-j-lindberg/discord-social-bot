import { SlashCommandBuilder } from "discord.js"

import {
  type Command,
  ephemeralOptionName,
} from "~/events/interactionCreate/listeners/commandRouter"

const command = new SlashCommandBuilder()
  .setName("ping")
  .setDescription("Replies with Pong!")
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
    return "Pong!"
  },
} satisfies Command
