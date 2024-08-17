import { SlashCommandBuilder } from "discord.js";
import type { Command } from "../commandRouter";

export default {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Replies with Pong!"),
  execute: async (interaction) => {
    await interaction.reply("Pong!");
  },
} satisfies Command;
