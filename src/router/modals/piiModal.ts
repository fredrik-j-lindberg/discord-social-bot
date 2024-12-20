import {
  ActionRowBuilder,
  ModalBuilder,
  ModalSubmitInteraction,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { assertHasDefinedProperty } from "~/lib/validation";
import { formatDate, ukDateStringToDate } from "~/lib/helpers/date";
import { getGuildConfigById } from "../../../guildConfigs";
import { ModalData } from "../modalRouter";
import { UserData, UserDataPost } from "~/lib/database/schema";
import { z, ZodSchema, ZodTypeDef } from "zod";
import { setUserData } from "~/lib/database/userData";

const userDataPostSchema: ZodSchema<
  UserDataPost, // Output
  ZodTypeDef, // Ignore (default)
  Omit<UserDataPost, "birthday"> & { birthday?: string | null } // Input
> = z
  .object({
    guildId: z.string(),
    userId: z.string(),
    username: z.string(),
    displayName: z.string().optional().nullable(),
    firstName: z
      .string()
      .regex(/^[a-zA-ZäöåÄÖÅ]+$/)
      .optional()
      .nullable(),
    birthday: z
      .string()
      .regex(/^\d{2}\/\d{2}\/\d{4}$/)
      .transform((value) => new Date(ukDateStringToDate(value))) // Transforms for example 01/01/1990 to 1990-01-01 and then converts it to a Date object
      .optional()
      .nullable(),
    phoneNumber: z.string().max(10).optional().nullable(),
    email: z
      .string()
      .regex(
        // https://stackoverflow.com/questions/201323/how-can-i-validate-an-email-address-using-a-regular-expression
        // eslint-disable-next-line no-control-regex
        /(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/,
      )
      .optional()
      .nullable(),
    height: z.number().max(300).min(50).optional().nullable(),
    switchFriendCode: z
      .string()
      .regex(/SW-\d{4}-\d{4}-\d{4}/)
      .optional()
      .nullable(),
  })
  .strict();

type ModalSubmitInteractionWithGuild = Omit<ModalSubmitInteraction, "guild"> & {
  guild: { id: string };
};

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
  const guildConfig = getGuildConfigById(guildId);
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

const getSubmittedFieldValue = (
  interaction: ModalSubmitInteractionWithGuild,
  fieldName: PiiFieldName,
) => {
  const guildConfig = getGuildConfigById(interaction.guild.id);
  const fieldIsEnabledForGuild =
    guildConfig.piiFields === "all" ||
    guildConfig.piiFields.includes(fieldName);

  // Important to early exit here, as otherwise discord js throws an error due
  // to the component for the field not being found
  if (!fieldIsEnabledForGuild) return null;
  return interaction.fields.getTextInputValue(fieldName) || null;
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

    const firstName = getSubmittedFieldValue(
      interaction,
      piiFieldNames.firstName,
    );
    const height = getSubmittedFieldValue(interaction, piiFieldNames.height);
    const birthday = getSubmittedFieldValue(
      interaction,
      piiFieldNames.birthday,
    );
    const switchFriendCode = getSubmittedFieldValue(
      interaction,
      piiFieldNames.switchFriendCode,
    );
    const validatedUserData = userDataPostSchema.parse({
      userId: interaction.user.id,
      guildId: interaction.guild.id,
      username: interaction.user.username,
      displayName: displayName || null,
      birthday: birthday,
      firstName,
      height: height ? parseInt(height) : null,
      switchFriendCode,
    });
    await setUserData({
      userData: validatedUserData,
    });
    return "Your user data was submitted successfully!";
  },
} satisfies ModalData;
