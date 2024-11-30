import { getUserData } from "~/lib/database/tempRouter";
import { assertHasDefinedProperty } from "~/lib/validation";
import { SlashCommandBuilder } from "discord.js";
import { Command } from "../commandRouter";
import { DoraUserException } from "~/lib/exceptions/DoraUserException";
import { getUserDataEmbed } from "~/embeds/userDataEmbed";

const userOptionName = "user";
export default {
  deferReply: true,
  data: new SlashCommandBuilder()
    .setName("whois")
    .setDescription("Get info about a user")
    .addUserOption((option) =>
      option
        .setName(userOptionName)
        .setDescription("The user to get info about")
        .setRequired(true),
    ),
  execute: async (interaction) => {
    assertHasDefinedProperty(
      interaction,
      "guild",
      "Command issued without associated guild",
    );

    const user = interaction.options.getUser(userOptionName);
    if (!user) {
      throw new DoraUserException("Required user option is missing");
    }

    const userData = await getUserData({
      userId: user.id,
      guildId: interaction.guild.id,
    });
    if (!userData) return "No data found";
    const embed = getUserDataEmbed({
      guildId: interaction.guild.id,
      user,
      userData,
    });
    return { embeds: [embed] };
  },
} satisfies Command;
