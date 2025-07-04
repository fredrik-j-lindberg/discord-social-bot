import { assertHasDefinedProperty } from "~/lib/validation";
import { SlashCommandBuilder } from "discord.js";
import type { Command } from "../commandRouter";
import { DoraUserException } from "~/lib/exceptions/DoraUserException";
import { getUserDataEmbed } from "~/embeds/userDataEmbed";
import { getUserData } from "~/lib/database/userData";
import { getMember } from "~/lib/discord/user";

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

    const member = await getMember({ guild: interaction.guild, user });

    const userData = await getUserData({
      userId: user.id,
      guildId: interaction.guild.id,
    });
    const embed = getUserDataEmbed({
      guildId: interaction.guild.id,
      member,
      userData,
    });
    return { embeds: [embed] };
  },
} satisfies Command;
