import {
  ModalSubmitInteraction,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import z, { ZodType } from "zod/v4";

export type ModalFieldConfig = {
  fieldName: string;
  label: string;
  style: TextInputStyle;
  getPrefilledValue: (
    /** The metadata relevant to prefill the data. For example for the user / pii modal this might the database values for the user */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    modalMetadata: any,
  ) => string | null | undefined;
  validation: ZodType;
  isRequired: boolean;
};

export type ModalFieldConfigsMap = {
  [key: string]: ModalFieldConfig;
};

export type ModalSubmitInteractionWithGuild = Omit<
  ModalSubmitInteraction,
  "guild"
> & {
  guild: { id: string };
};

// /** Helper for filtering the components to be relevant for the specific guild based on guild config */
// export const getComponentsRelevantForGuild = (
//   guildId: string,
//   components: TextInputBuilder[],
// ) => {
//   const guildConfig = getGuildConfigById(guildId);
//   return components.filter(
//     (component) =>
//       component.data.custom_id &&
//       // https://github.com/microsoft/TypeScript/issues/26255
//       // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
//       guildConfig.piiFields.includes(component.data.custom_id as any),
//   );
// };

/** Helper for creating a modal schema from field configs */
export const generateModalSchema = <
  TFieldConfigsMap extends ModalFieldConfigsMap,
>(
  fieldConfigsMap: TFieldConfigsMap,
) => {
  const test = Object.values(fieldConfigsMap).map((fieldConfig) => [
    fieldConfig.fieldName,
    fieldConfig.validation,
  ]);

  return z
    .object({
      ...(Object.fromEntries(test) as unknown as {
        [key in keyof TFieldConfigsMap]: TFieldConfigsMap[key]["validation"];
      }),
    })
    .strict();
};

export const extractAndValidateModalValues = <
  TFieldConfigs extends ModalFieldConfig[],
  TFieldName extends string = TFieldConfigs[number]["fieldName"],
  TValidationSchema extends ZodType = ZodType,
>({
  interaction,
  fieldConfigs,
  fieldsToExtract,
  validationSchema,
}: {
  interaction: ModalSubmitInteractionWithGuild;
  fieldConfigs: TFieldConfigs;
  fieldsToExtract: TFieldName[];
  validationSchema: TValidationSchema;
}) => {
  // It is important to filter these out before extracting the values as if the field is not
  // enabled for the guild, discord.js will throw an error when trying to get the value
  const fieldsToExtractConfigs = fieldConfigs.filter((fieldConfig) =>
    fieldsToExtract.some(
      (fieldToExtract) => fieldConfig.fieldName === fieldToExtract,
    ),
  );

  const valuesToValidate: { [key in TFieldName]?: string | null } = {};
  for (const fieldConfig of fieldsToExtractConfigs) {
    // TODO: Can this be solved without the coercion
    valuesToValidate[fieldConfig.fieldName as TFieldName] =
      interaction.fields.getTextInputValue(fieldConfig.fieldName) || null;
  }

  return validationSchema.safeParse(valuesToValidate);
};

export const generateComponents = <
  TFieldConfigs extends ModalFieldConfig[],
  TFieldName extends string = TFieldConfigs[number]["fieldName"],
>({
  fieldConfigs,
  fieldsToGenerate,
  modalMetaData,
}: {
  fieldConfigs: TFieldConfigs;
  fieldsToGenerate: TFieldName[];
  modalMetaData?: Parameters<TFieldConfigs[number]["getPrefilledValue"]>[0];
}) => {
  const fieldsToGenerateConfigs = fieldConfigs.filter((fieldConfig) =>
    fieldsToGenerate.some(
      (fieldToExtract) => fieldConfig.fieldName === fieldToExtract,
    ),
  );

  if (fieldsToGenerateConfigs.length > 5) {
    throw new Error(
      // Discord modals have a limit of 5 fields per modal
      `Tried to generate too many modal fields. Max allowed per modal is 5 fields but tried to generate '${fieldsToGenerate.join(", ")}'`,
    );
  }

  return fieldsToGenerateConfigs.map((fieldConfig) =>
    new TextInputBuilder()
      .setCustomId(fieldConfig.fieldName)
      .setLabel(fieldConfig.label)
      .setValue(fieldConfig.getPrefilledValue(modalMetaData) || "")
      .setStyle(fieldConfig.style)
      .setRequired(fieldConfig.isRequired),
  );
};
