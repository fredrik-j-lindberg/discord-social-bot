import {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { ModalData } from "./types";
import { assertHasDefinedProperty } from "~/lib/validation";
import { setUserData } from "~/lib/airtable/userData";
import { UserData } from "~/lib/airtable/types";
import { formatDate } from "~/lib/helpers/date";
import { guildConfigs } from "../../guildConfigs";
import { DoraException } from "~/lib/exceptions/DoraException";

const modalId = "userDataModal";
export const piiFieldNames = {
  birthday: "birthdayInput",
  firstName: "firstNameInput",
  height: "heightInput",
} as const;
export type PiiFieldName = (typeof piiFieldNames)[keyof typeof piiFieldNames];
const generateComponents = (
  userData: UserData | undefined,
): TextInputBuilder[] => {
  return [
    new TextInputBuilder()
      .setCustomId(piiFieldNames.birthday)
      .setLabel("Birthday (YYYY-MM-DD)")
      .setValue(
        formatDate(userData?.birthday, { dateStyle: "short" }) || "1990-01-01",
      )
      .setStyle(TextInputStyle.Short)
      .setRequired(false),
    new TextInputBuilder()
      .setCustomId(piiFieldNames.firstName)
      .setLabel("First name")
      .setValue(userData?.firstName || "")
      .setStyle(TextInputStyle.Short)
      .setRequired(false),
    new TextInputBuilder()
      .setCustomId(piiFieldNames.height)
      .setLabel("Height cm, Eckron want you to know he is tall")
      .setValue(userData?.height?.toString() || "170")
      .setStyle(TextInputStyle.Short)
      .setRequired(false),
  ];
};
const componentsRelevantForGuild = (
  guildId: string,
  components: TextInputBuilder[],
) => {
  const guildConfig = Object.values(guildConfigs).find(
    (guildConfig) => guildConfig.guildId === guildId,
  );
  if (!guildConfig) {
    throw new DoraException(
      "Guild config not found",
      DoraException.Type.NotFound,
      { metadata: { guildId } },
    );
  }
  if (guildConfig.piiFields === "all") return components;
  return components.filter(
    (component) =>
      component.data.custom_id &&
      // https://github.com/microsoft/TypeScript/issues/26255
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
      guildConfig.piiFields.includes(component.data.custom_id as any),
  );
};

// https://discordjs.guide/interactions/modals.html#building-and-responding-with-modals
const createModal = ({
  guildId,
  userData,
}: {
  guildId: string;
  userData: UserData | undefined;
}) => {
  const modal = new ModalBuilder()
    .setCustomId(modalId)
    .setTitle("User data form. Optional!");

  const components = generateComponents(userData);
  const relevantComponents = componentsRelevantForGuild(guildId, components);
  const rows = relevantComponents.map((component) => {
    return new ActionRowBuilder<TextInputBuilder>().addComponents(component);
  });

  modal.addComponents(rows);
  return modal;
};

export const piiModal = {
  id: modalId,
  createModal,
  listener: async (interaction) => {
    await interaction.deferReply();
    assertHasDefinedProperty(
      interaction,
      "guild",
      "Modal submitted without associated guild",
    );
    const nickname =
      interaction.member && "nickname" in interaction.member
        ? interaction.member.nickname
        : undefined;

    const userData = {
      birthday:
        interaction.fields.getTextInputValue(piiFieldNames.birthday) || null,
      username: interaction.user.username,
      nickname: nickname || undefined,
      firstName:
        interaction.fields.getTextInputValue(piiFieldNames.firstName) || null,
      height:
        parseInt(interaction.fields.getTextInputValue(piiFieldNames.height)) ||
        null,
    };

    await setUserData({
      userId: interaction.user.id,
      guildId: interaction.guild.id,
      userData: userData,
    });
    await interaction.editReply({
      content: "Your user data was submitted successfully!",
    });
  },
} satisfies ModalData;
