import { getUsersWithUpcomingBirthday } from "~/lib/airtable/userData";
import { assertHasDefinedProperty } from "~/lib/validation";
import { formatDate } from "~/lib/helpers/date";
import { SlashCommandBuilder } from "discord.js";
import type { Command } from "../commandRouter";

export default {
  data: new SlashCommandBuilder()
    .setName("birthdays")
    .setDescription("Lists the upcoming birthdays in the server"),
  execute: async (interaction) => {
    assertHasDefinedProperty(
      interaction,
      "guild",
      "Modal submitted without associated guild",
    );
    const birthdays = await getUsersWithUpcomingBirthday(interaction.guild.id);
    const content = birthdays
      .map(({ username, nickname, birthday }) => {
        return `**${nickname || username}** - ${formatDate(birthday)}`;
      })
      .join("\n");
    await interaction.reply(content);
  },
} satisfies Command;
