import { SlashCommandBuilder } from "discord.js";

import type { Command } from "../commandRouter";

export default {
  deferReply: false,
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Replies with Pong!"),
  execute: () => {
    return "Pong!";
  },
} satisfies Command;
