import { SlashCommandBuilder } from "discord.js";
import type { Command } from "../commandRouter";
import { DoraUserException } from "~/lib/exceptions/DoraUserException";

export default {
  deferReply: false,
  data: new SlashCommandBuilder()
    .setName("nick")
    .setDescription("Debug command to help see why Osyx is broken"),
  execute: async (interaction) => {
    const member = interaction.member;
    if (!member) {
      throw new DoraUserException("Discord event lack member object");
    }

    if (!("nickname" in member)) {
      throw new DoraUserException(
        "Discord event contained the member object but it lacks nickname prop",
      );
    }

    if (member.nickname === null) {
      throw new DoraUserException(
        "Discord event contained the member object but its nickname prop is null",
      );
    }
    await interaction.reply(member.nickname);
  },
} satisfies Command;
