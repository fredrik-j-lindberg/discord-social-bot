import {
  LabelBuilder,
  ModalSubmitInteraction,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextInputStyle,
} from "discord.js"
import z, { ZodType } from "zod/v4"

interface ModalFieldTextConfig {
  /** Determines which kind of field this config is for. Defaults to text */
  fieldType: "text"
  style: TextInputStyle
}

interface ModalFieldSelectConfig {
  fieldType: "select"
  style?: never
}

export type ModalFieldConfig = (
  | ModalFieldTextConfig
  | ModalFieldSelectConfig
) & {
  fieldName: string
  label: string
  description?: string
  getPrefilledValue: (
    /** The metadata relevant to prefill the data. For example for the member data (/pii) modal this might the database values for the member */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    modalMetadata: any,
  ) => string | null | undefined
  placeholder?: string
  validation: ZodType
  isRequired: boolean
  /**
   * Discord native limitation on the modal field length, to give the user an indication of how long of a string they can enter
   * This should be accompanied by a validation schema that enforces the same length
   */
  maxLength?: number
}

export interface ModalFieldConfigsMap {
  [key: string]: ModalFieldConfig
}

export type ModalSubmitInteractionWithGuild = Omit<
  ModalSubmitInteraction,
  "guild"
> & {
  guild: { id: string }
}

/** Helper for creating a modal schema from field configs */
export const generateModalSchema = <
  TFieldConfigsMap extends ModalFieldConfigsMap,
>(
  fieldConfigsMap: TFieldConfigsMap,
) => {
  const modalSchemaEntries = Object.values(fieldConfigsMap).map(
    (fieldConfig) => [fieldConfig.fieldName, fieldConfig.validation],
  )

  return z
    .object({
      ...(Object.fromEntries(modalSchemaEntries) as unknown as {
        [key in keyof TFieldConfigsMap]: TFieldConfigsMap[key]["validation"]
      }),
    })
    .strict()
}

export const extractAndValidateModalValues = <
  TValidationSchema extends ZodType = ZodType,
>({
  interaction,
  fieldConfigs,
  fieldsToExtract,
  validationSchema,
}: {
  interaction: ModalSubmitInteractionWithGuild
  fieldConfigs: ModalFieldConfig[]
  fieldsToExtract: string[]
  validationSchema: TValidationSchema
}) => {
  // It is important to filter these out before extracting the values as if the field is not
  // enabled for the guild, discord.js will throw an error when trying to get the value
  const fieldsToExtractConfigs = fieldConfigs.filter((fieldConfig) =>
    fieldsToExtract.some(
      (fieldToExtract) => fieldConfig.fieldName === fieldToExtract,
    ),
  )

  const valuesToValidate: { [key in string]?: string | null } = {}
  for (const fieldConfig of fieldsToExtractConfigs) {
    if (fieldConfig.fieldType === "select") {
      // For select menus, getStringSelectValues returns an array
      // We take the first value since single-select menus only have one value
      const values = interaction.fields.getStringSelectValues(
        fieldConfig.fieldName,
      )
      valuesToValidate[fieldConfig.fieldName] = values[0] ?? null
    } else {
      // Default to text input
      valuesToValidate[fieldConfig.fieldName] =
        interaction.fields.getTextInputValue(fieldConfig.fieldName) || null
    }
  }

  return validationSchema.safeParse(valuesToValidate)
}

export interface SelectMenuOption {
  value: string
  name: string
  description?: string | null
}
export const composeSelectMenu = ({
  customId,
  label = "Select options",
  description,
  placeholder,
  options,
  isRequired = false,
  multiSelect = false,
}: {
  customId: string
  label?: string
  description?: string
  placeholder?: string
  options: SelectMenuOption[]
  isRequired?: boolean
  multiSelect?: boolean
}) => {
  if (!options.length) {
    return
  }
  const labelBuilder = new LabelBuilder()
    .setLabel(label || "Select options")
    .setStringSelectMenuComponent(
      new StringSelectMenuBuilder()
        .setCustomId(customId)
        .setPlaceholder(placeholder || "Select option...")
        .addOptions(
          options.map((option) =>
            new StringSelectMenuOptionBuilder()
              .setLabel(option.name)
              .setValue(option.value)
              .setDescription(option.description || ""),
          ),
        )
        .setMaxValues(multiSelect ? options.length : 1)
        .setRequired(isRequired),
    )
  if (description) {
    labelBuilder.setDescription(description)
  }
  return labelBuilder
}
