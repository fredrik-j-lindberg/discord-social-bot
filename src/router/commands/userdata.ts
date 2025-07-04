import { assertHasDefinedProperty } from "~/lib/validation";
import { CommandInteraction, SlashCommandBuilder } from "discord.js";
import { Command } from "../commandRouter";
import { formatDate } from "~/lib/helpers/date";
import { DoraUserException } from "~/lib/exceptions/DoraUserException";
import {
  getUsersWithPokemonTcgpFriendCode,
  getUsersWithUpcomingBirthday,
} from "~/lib/database/userData";
import { OptInUserFields } from "../../../guildConfigs";

type UserDataTypeOption = {
  name: string;
  choices: Record<string, { name: string; value: OptInUserFields }>;
};

const userDataTypeOptions = {
  name: "field",
  choices: {
    birthdays: {
      name: "Upcoming Birthdays",
      value: "birthday",
    },
    pokemonTcgp: {
      name: "Pokemon TCGP Friend Code",
      value: "pokemonTcgpFriendCode",
    },
  },
} satisfies UserDataTypeOption;

function assertIsValidUserDataField(
  field: string | null,
): asserts field is OptInUserFields {
  if (!field) {
    throw new DoraUserException(
      `Required option '${userDataTypeOptions.name}' is missing`,
    );
  }

  const validFieldChoices = Object.values(userDataTypeOptions.choices).map(
    (choice) => choice.value,
  );
  if (
    validFieldChoices.every((validFieldChoice) => validFieldChoice !== field)
  ) {
    throw new DoraUserException(
      `Invalid field '${field}' provided. Valid fields are: ${validFieldChoices.join(
        ", ",
      )}`,
    );
  }
}

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
          userDataTypeOptions.choices.pokemonTcgp,
        ),
    ),
  execute: async (interaction) => {
    assertHasDefinedProperty(
      interaction,
      "guild",
      "Command issued without associated guild",
    );

    const field = interaction.options.getString(userDataTypeOptions.name);
    assertIsValidUserDataField(field);

    return await handleFieldChoice(interaction, field);
  },
} satisfies Command;

type CommandInteractionWithGuild = Omit<CommandInteraction, "guild"> & {
  guild: { id: string };
};

const handleFieldChoice = async (
  interaction: CommandInteractionWithGuild,
  field: OptInUserFields,
) => {
  if (field === "birthday") {
    const membersWithUpcomingBirthday = await getUsersWithUpcomingBirthday({
      guildId: interaction.guild.id,
    });
    if (membersWithUpcomingBirthday.length === 0) {
      throw new DoraUserException(
        "No upcoming birthdays found, add yours via the /pii modal",
      );
    }
    const content = membersWithUpcomingBirthday
      .map(({ username, displayName, birthday }) => {
        return `**${displayName || username}**: ${formatDate(birthday) || "-"}`;
      })
      .join("\n");
    return content;
  }

  if (field === "pokemonTcgpFriendCode") {
    const membersWithTcgpAccount = await getUsersWithPokemonTcgpFriendCode({
      guildId: interaction.guild.id,
    });
    if (membersWithTcgpAccount.length === 0) {
      throw new DoraUserException(
        "No users with TCGP friend code found, add yours via the /pii modal",
      );
    }
    const content = membersWithTcgpAccount
      .map(({ username, displayName, pokemonTcgpFriendCode }) => {
        return `**${displayName || username}**: ${pokemonTcgpFriendCode}`;
      })
      .join("\n");
    return content;
  }

  throw new Error(`Was unable to handle userdata field: ${field}`);
};
