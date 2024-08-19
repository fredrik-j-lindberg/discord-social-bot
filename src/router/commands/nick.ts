import { SlashCommandBuilder } from "discord.js";
import type { Command } from "../commandRouter";
import { DoraException } from "~/lib/exceptions/DoraException";

export default {
  deferReply: false,
  data: new SlashCommandBuilder()
    .setName("nick")
    .setDescription("Debug command to help see why Osyx is broken"),
  execute: async (interaction) => {
    const member = interaction.member;
    if (!member) {
      throw new DoraException(
        "Discord event lack member object",
        DoraException.Type.NotFound,
      );
    }

    if (!("nickname" in member)) {
      throw new DoraException(
        "Discord event contained the member object but it lacks nickname prop",
        DoraException.Type.NotFound,
      );
    }

    if (member.nickname === null) {
      throw new DoraException(
        "Discord event contained the member object but its nickname prop is null",
        DoraException.Type.NotFound,
      );
    }
    await interaction.reply(member.nickname);
  },
} satisfies Command;
