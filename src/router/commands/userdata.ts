import { getUsersWithUpcomingBirthday } from "~/lib/airtable/userData";
import { assertHasDefinedProperty } from "~/lib/validation";
import { CommandInteraction, SlashCommandBuilder } from "discord.js";
import { Command } from "../commandRouter";
import { formatDate } from "~/lib/helpers/date";
import { DoraException } from "~/lib/exceptions/DoraException";

const userDataTypeOptions = {
  name: "field",
  choices: {
    birthdays: {
      name: "Birthdays",
      value: "birthdays",
    },
    height: {
      name: "Height",
      value: "height",
    },
  },
};
export default {
  deferReply: true,
  data: new SlashCommandBuilder()
    .setName("userdata")
    .setDescription("Lists user data by field")
    .addStringOption((option) =>
      option
        .setName(userDataTypeOptions.name)
        .setDescription("List user data for field")
        .setRequired(true)
        .setChoices(
          userDataTypeOptions.choices.birthdays,
          userDataTypeOptions.choices.height,
        ),
    ),
  execute: async (interaction) => {
    assertHasDefinedProperty(
      interaction,
      "guild",
      "Command issued without associated guild",
    );

    const field = interaction.options.getString(userDataTypeOptions.name);
    if (!field) {
      throw new DoraException(
        "Required cmd option is missing",
        DoraException.Type.Unknown,
        { metadata: { missingOption: userDataTypeOptions.name } },
      );
    }

    await handleFieldChoice(interaction, field);
  },
} satisfies Command;

type CommandInteractionWithGuild = Omit<CommandInteraction, "guild"> & {
  guild: { id: string };
};

const handleFieldChoice = async (
  interaction: CommandInteractionWithGuild,
  field: string,
) => {
  if (field === "birthdays") {
    const birthdays = await getUsersWithUpcomingBirthday(interaction.guild.id);
    if (birthdays.length === 0) {
      await interaction.editReply(
        "No upcoming birthdays found, add yours via the /userdata form",
      );
    }
    const content = birthdays
      .map(({ username, nickname, birthday }) => {
        return `**${nickname || username}** - ${formatDate(birthday)}`;
      })
      .join("\n");
    await interaction.editReply(content);
    return;
  }
  if (field === "height") {
    // TODO: Fix height view
    await interaction.editReply(
      "Not implemented yet. Eckron is the tallest though",
    );
    return;
  }
  throw new Error(`Unknown field: ${field}`);
};
