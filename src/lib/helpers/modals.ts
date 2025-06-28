import {
  ModalSubmitInteraction,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { getGuildConfigById } from "../../../guildConfigs";
import z, { ZodType } from "zod/v4";

export type ModalFieldConfig = {
  fieldName: string;
  label: string;
  style: TextInputStyle;
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

/** Helper for filtering the components to be relevant for the specific guild based on guild config */
export const getComponentsRelevantForGuild = (
  guildId: string,
  components: TextInputBuilder[],
) => {
  const guildConfig = getGuildConfigById(guildId);
  return components.filter(
    (component) =>
      component.data.custom_id &&
      // https://github.com/microsoft/TypeScript/issues/26255
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
      guildConfig.piiFields.includes(component.data.custom_id as any),
  );
};

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
