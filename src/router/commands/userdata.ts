import { getUsersWithUpcomingBirthday } from "~/lib/database/tempRouter";
import { assertHasDefinedProperty } from "~/lib/validation";
import { CommandInteraction, SlashCommandBuilder } from "discord.js";
import { Command } from "../commandRouter";
import { formatDate } from "~/lib/helpers/date";
import { DoraUserException } from "~/lib/exceptions/DoraUserException";

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
      throw new DoraUserException(
        `Required option '${userDataTypeOptions.name}' is missing`,
      );
    }

    return await handleFieldChoice(interaction, field);
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
    const birthdays = await getUsersWithUpcomingBirthday({
      guildId: interaction.guild.id,
    });
    if (birthdays.length === 0) {
      throw new DoraUserException(
        "No upcoming birthdays found, add yours via the /pii form",
      );
    }
    const content = birthdays
      .map(({ username, displayName, birthday }) => {
        return `**${displayName || username}** - ${formatDate(birthday)}`;
      })
      .join("\n");
    return content;
  }
  if (field === "height") {
    // TODO: Fix height view
    throw new DoraUserException(
      "Not implemented yet. Anti is the tallest though",
    );
  }
  throw new Error(`Unknown field: ${field}`);
};
