import {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { assertHasDefinedProperty } from "~/lib/validation";
import { setUserData } from "~/lib/airtable/userData";
import { UserData } from "~/lib/airtable/types";
import { formatDate } from "~/lib/helpers/date";
import { guildConfigs } from "../../../guildConfigs";
import { DoraException } from "~/lib/exceptions/DoraException";
import { ModalData } from "../modalRouter";

const modalId = "userDataModal";
export const piiFieldNames = {
  birthday: "birthdayInput",
  firstName: "firstNameInput",
  height: "heightInput",
  switchFriendCode: "switchFriendCodeInput",
} as const;
export type PiiFieldName = (typeof piiFieldNames)[keyof typeof piiFieldNames];
const generateComponents = (
  userData: UserData | undefined,
): TextInputBuilder[] => {
  const preFilledBirthday = userData?.birthday || "1990-01-01";
  return [
    new TextInputBuilder()
      .setCustomId(piiFieldNames.birthday)
      .setLabel("Birthday (DD/MM/YYYY)")
      .setValue(formatDate(preFilledBirthday, { dateStyle: "short" }) || "")
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
      .setLabel("Height (cm)")
      .setValue(userData?.height?.toString() || "")
      .setStyle(TextInputStyle.Short)
      .setRequired(false),
    new TextInputBuilder()
      .setCustomId(piiFieldNames.switchFriendCode)
      .setLabel("Nintendo Switch friend code")
      .setValue(userData?.switchFriendCode || "")
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
type CreateModalProps = {
  guildId: string;
  userData: UserData | undefined;
};
const createModal = ({ guildId, userData }: CreateModalProps) => {
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

export default {
  data: { name: modalId },
  createModal,
  deferReply: true,
  handleSubmit: async (interaction) => {
    assertHasDefinedProperty(
      interaction,
      "guild",
      "Modal submitted without associated guild",
    );
    const displayName =
      interaction.member && "displayName" in interaction.member
        ? interaction.member.displayName
        : undefined;

    await setUserData({
      userId: interaction.user.id,
      guildId: interaction.guild.id,
      userData: {
        birthday:
          interaction.fields.getTextInputValue(piiFieldNames.birthday) || null,
        username: interaction.user.username,
        displayName: displayName || undefined,
        firstName:
          interaction.fields.getTextInputValue(piiFieldNames.firstName) || null,
        height:
          parseInt(
            interaction.fields.getTextInputValue(piiFieldNames.height),
          ) || null,
        switchFriendCode:
          interaction.fields.getTextInputValue(
            piiFieldNames.switchFriendCode,
          ) || null,
      },
    });
    return "Your user data was submitted successfully!";
  },
} satisfies ModalData;
