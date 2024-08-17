import { SlashCommandBuilder } from "discord.js";
import type { Command } from "../commandRouter";

export default {
  data: new SlashCommandBuilder()
    .setName("botinfo")
    .setDescription("Shows basic info about the bot"),
  execute: async (interaction) => {
    await interaction.reply(
      "https://github.com/fredrik-j-lindberg/discord-social-bot",
    );
  },
} satisfies Command;
