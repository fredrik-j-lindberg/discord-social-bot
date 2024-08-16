import { getUsersWithUpcomingBirthday } from "~/lib/airtable/userData";
import { assertHasDefinedProperty } from "~/lib/validation";
import { Command } from "./types";
import { formatDate } from "~/lib/helpers/date";

export const birthdaysCommand: Command = {
  name: "birthdays",
  description: "Lists the upcoming birthdays in the server",
  listener: async (interaction) => {
    assertHasDefinedProperty(
      interaction,
      "guild",
      "Modal submitted without associated guild",
    );
    const birthdays = await getUsersWithUpcomingBirthday(interaction.guild.id);
    const content = birthdays
      .map(({ username, nickname, birthday }) => {
        return `${nickname || username} - ${formatDate(birthday)}`;
      })
      .join("\n");
    await interaction.reply(content);
  },
};
