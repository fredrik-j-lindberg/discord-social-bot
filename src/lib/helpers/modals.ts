import {
  FileUploadBuilder,
  LabelBuilder,
  ModalSubmitInteraction,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js"
import z, { ZodType } from "zod/v4"

import { logger } from "../logger"

interface ModalFieldBaseConfig {
  fieldName: string
  label: string
  /** Note that discord limits descriptions to 100 characters */
  description?: string
  placeholder?: string
  validation?: ZodType
  isRequired: boolean
  /**
   * Discord native limitation on the modal field length, to give the user an indication of how long of a string they can enter
   * This should be accompanied by a validation schema that enforces the same length
   */
  maxLength?: number
}

export interface ModalFieldTextConfig extends ModalFieldBaseConfig {
  /** Determines which kind of field this config is for. Defaults to text */
  fieldType: "text"
  getPrefilledValue?: (
    /** The metadata relevant to prefill the data. For example for the member data (/pii) modal this might the database values for the member */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    modalMetadata?: any,
  ) => string | null | undefined
  style: TextInputStyle
}

export interface SelectMenuOption {
  value: string
  name: string
  description?: string | null
  isDefault: boolean
}
export interface ModalFieldSelectConfig extends ModalFieldBaseConfig {
  fieldType: "select"
  getOptions: (
    /** The metadata relevant to prefill the data. For example for the tag modal this might be the guild id */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    modalMetadata?: any,
  ) => Promise<SelectMenuOption[]> | SelectMenuOption[]
  /** Not applicable for select fields */
  style?: never
}

export interface ModalFieldFileUploadConfig extends ModalFieldBaseConfig {
  fieldType: "fileUpload"
  /** Maximum number of files that can be uploaded (Discord limits this to 10) */
  maxValues?: number
  /** Array of accepted MIME types for file validation (e.g., ['image/jpeg', 'video/mp4']) */
  acceptedMimeTypes?: string[]
  /** Not applicable for file upload fields */
  style?: never
}

export type ModalFieldConfig =
  | ModalFieldTextConfig
  | ModalFieldSelectConfig
  | ModalFieldFileUploadConfig

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
      const values = interaction.fields.getStringSelectValues(
        fieldConfig.fieldName,
      )
      // TODO: support multiple values
      // We take the first value since single-select menus only have one value
      valuesToValidate[fieldConfig.fieldName] = values[0] ?? null
    } else {
      // Default to text input
      valuesToValidate[fieldConfig.fieldName] =
        interaction.fields.getTextInputValue(fieldConfig.fieldName) || null
    }
  }

  return validationSchema.safeParse(valuesToValidate)
}

const createFieldLabelBuilder = (fieldConfig: ModalFieldConfig) => {
  const labelBuilder = new LabelBuilder().setLabel(fieldConfig.label)
  if (fieldConfig.description) {
    if (fieldConfig.description.length > 100) {
      logger.warn(
        `Modal field description for field '${fieldConfig.fieldName}' exceeds Discord's limit of 100 characters. Description will be truncated.`,
      )
    }
    labelBuilder.setDescription(fieldConfig.description.slice(0, 100))
  }
  return labelBuilder
}

export const composeSelectMenu = async (
  fieldConfig: ModalFieldSelectConfig,
  modalMetadata?: unknown,
) => {
  const options = await fieldConfig.getOptions(modalMetadata)
  if (!options.length) {
    return
  }
  return createFieldLabelBuilder(fieldConfig).setStringSelectMenuComponent(
    new StringSelectMenuBuilder()
      .setCustomId(fieldConfig.fieldName)
      .addOptions(
        options.map((option) => {
          const optionBuilder = new StringSelectMenuOptionBuilder()
            .setLabel(option.name)
            .setValue(option.value)
            .setDefault(option.isDefault)

          if (option.description) {
            optionBuilder.setDescription(option.description)
          }

          return optionBuilder
        }),
      )
      // TODO: Support multiple values
      .setMaxValues(1)
      .setRequired(fieldConfig.isRequired),
  )
}

export const composeTextInput = (
  fieldConfig: ModalFieldTextConfig,
  modelMetadata?: unknown,
) => {
  const textInputBuilder = new TextInputBuilder()
    .setCustomId(fieldConfig.fieldName)
    .setStyle(fieldConfig.style)
    .setMaxLength(fieldConfig.maxLength || 4000) // Discord's max length for text inputs is 4000 characters
    .setPlaceholder(fieldConfig.placeholder || "")
    .setRequired(fieldConfig.isRequired)

  const prefilledValue = fieldConfig.getPrefilledValue?.(modelMetadata)
  if (prefilledValue) {
    textInputBuilder.setValue(prefilledValue)
  }

  return createFieldLabelBuilder(fieldConfig).setTextInputComponent(
    textInputBuilder,
  )
}

export const composeFileUpload = (fieldConfig: ModalFieldFileUploadConfig) => {
  const fileUploadBuilder = new FileUploadBuilder()
    .setCustomId(fieldConfig.fieldName)
    .setRequired(fieldConfig.isRequired)

  if (fieldConfig.maxValues) {
    fileUploadBuilder.setMaxValues(fieldConfig.maxValues)
  }

  return createFieldLabelBuilder(fieldConfig).setFileUploadComponent(
    fileUploadBuilder,
  )
}
