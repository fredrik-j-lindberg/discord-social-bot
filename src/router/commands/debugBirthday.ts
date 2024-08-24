import { SlashCommandBuilder } from "discord.js";
import type { Command } from "../commandRouter";
import { happyBirthday } from "~/cron/happyBirthday";

export default {
  deferReply: false,
  data: new SlashCommandBuilder()
    .setName("debugbirthday")
    .setDescription(
      "Should remove role from existing members, and re-add it to anyone whose birthday is today",
    ),
  execute: async () => {
    await happyBirthday();
    return "Ran happy birthday cron manually";
  },
} satisfies Command;
