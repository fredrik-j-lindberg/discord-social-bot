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

interface ModalInputBaseConfig<TId extends string = string> {
  id: TId
  label: string
  /** Note that discord limits descriptions to 100 characters */
  description?: string
  placeholder?: string
  validation?: ZodType
  isRequired: boolean
}

export interface ModalTextInputConfig<
  TId extends string = string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TModalMetadata = any,
> extends ModalInputBaseConfig<TId> {
  /** Determines which kind of input this config is for */
  type: "text"
  getPrefilledValue?: (
    modalMetadata: TModalMetadata,
  ) => string | null | undefined
  style: TextInputStyle
  /**
   * Discord native limitation on the modal field length, to give the user an indication of how long of a string they can enter.
   * This should be accompanied by a validation schema that enforces the same length
   */
  maxLength?: number
}

export interface SelectMenuOption {
  value: string
  name: string
  description?: string | null
  isDefault: boolean
}
export interface ModalSelectInputConfig<
  TId extends string = string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TModalMetadata = any,
> extends ModalInputBaseConfig<TId> {
  type: "select"
  getOptions: (
    /** The metadata relevant to prefill the data. For example for the tag modal this might be the guild id */
    modalMetadata: TModalMetadata,
  ) => Promise<SelectMenuOption[]> | SelectMenuOption[]
  /** Not applicable for select fields */
  style?: never
  maxLength?: never
}

export interface ModalFileUploadInputConfig<TId extends string = string>
  extends ModalInputBaseConfig<TId> {
  type: "fileUpload"
  /** Maximum number of files that can be uploaded (Discord limits this to 10) */
  maxValues?: number
  /** Array of accepted MIME types for file validation (e.g., ['image/jpeg', 'video/mp4']) */
  acceptedMimeTypes?: string[]
  /** Not applicable for file upload fields */
  style?: never
  maxLength?: never
}

export type ModalInputConfig<
  TId extends string = string,
  /** The metadata relevant to prefill the data. For example for the member data (/pii) modal this might the database values for the member */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TModalMetadata = any,
> =
  | ModalTextInputConfig<TId, TModalMetadata>
  | ModalSelectInputConfig<TId, TModalMetadata>
  | ModalFileUploadInputConfig<TId>

export interface ModalInputConfigsMap {
  [inputId: string]: ModalInputConfig
}

export type ModalSubmitInteractionWithGuild = Omit<
  ModalSubmitInteraction,
  "guild"
> & {
  guild: { id: string }
}

/** Helper for creating a modal schema from field configs */
export const generateModalSchema = <
  TInputConfigsMap extends ModalInputConfigsMap,
>(
  inputConfigsMap: TInputConfigsMap,
) => {
  const modalSchemaEntries = Object.values(inputConfigsMap).map(
    (inputConfig) => [inputConfig.id, inputConfig.validation],
  )

  return z
    .object({
      ...(Object.fromEntries(modalSchemaEntries) as unknown as {
        [key in keyof TInputConfigsMap]: TInputConfigsMap[key]["validation"]
      }),
    })
    .strict()
}

export const extractAndValidateModalValues = <
  TValidationSchema extends ZodType = ZodType,
>({
  interaction,
  inputConfigs,
  inputsToExtract,
  validationSchema,
}: {
  interaction: ModalSubmitInteractionWithGuild
  inputConfigs: ModalInputConfig[]
  inputsToExtract: string[]
  validationSchema: TValidationSchema
}) => {
  // It is important to filter these out before extracting the values as if the field is not
  // enabled for the guild, discord.js will throw an error when trying to get the value
  const inputsToExtractConfigs = inputConfigs.filter((inputConfig) =>
    inputsToExtract.some((inputToExtract) => inputConfig.id === inputToExtract),
  )

  const valuesToValidate: { [key in string]?: string | null } = {}
  for (const inputConfig of inputsToExtractConfigs) {
    if (inputConfig.type === "select") {
      const values = interaction.fields.getStringSelectValues(inputConfig.id)
      // TODO: support multiple values
      // We take the first value since single-select menus only have one value
      valuesToValidate[inputConfig.id] = values[0] ?? null
    } else {
      // Default to text input
      valuesToValidate[inputConfig.id] =
        interaction.fields.getTextInputValue(inputConfig.id) || null
    }
  }

  return validationSchema.safeParse(valuesToValidate)
}

const createFieldLabelBuilder = (inputConfig: ModalInputConfig) => {
  const labelBuilder = new LabelBuilder().setLabel(inputConfig.label)
  if (inputConfig.description) {
    if (inputConfig.description.length > 100) {
      logger.warn(
        `Modal field description for field '${inputConfig.id}' exceeds Discord's limit of 100 characters. Description will be truncated.`,
      )
    }
    labelBuilder.setDescription(inputConfig.description.slice(0, 100))
  }
  return labelBuilder
}

export const composeSelectMenu = async (
  selectInputConfig: ModalSelectInputConfig,
  modalMetadata?: unknown,
) => {
  const options = await selectInputConfig.getOptions(modalMetadata)
  if (!options.length) {
    return
  }
  return createFieldLabelBuilder(
    selectInputConfig,
  ).setStringSelectMenuComponent(
    new StringSelectMenuBuilder()
      .setCustomId(selectInputConfig.id)
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
      .setRequired(selectInputConfig.isRequired),
  )
}

export const composeTextInput = (
  textInputConfig: ModalTextInputConfig,
  modelMetadata?: unknown,
) => {
  const textInputBuilder = new TextInputBuilder()
    .setCustomId(textInputConfig.id)
    .setStyle(textInputConfig.style)
    .setMaxLength(textInputConfig.maxLength || 4000) // Discord's max length for text inputs is 4000 characters
    .setPlaceholder(textInputConfig.placeholder || "")
    .setRequired(textInputConfig.isRequired)

  const prefilledValue = textInputConfig.getPrefilledValue?.(modelMetadata)
  if (prefilledValue) {
    textInputBuilder.setValue(prefilledValue)
  }

  return createFieldLabelBuilder(textInputConfig).setTextInputComponent(
    textInputBuilder,
  )
}

export const composeFileUpload = (
  fileUploadInputConfig: ModalFileUploadInputConfig,
) => {
  const fileUploadBuilder = new FileUploadBuilder()
    .setCustomId(fileUploadInputConfig.id)
    .setRequired(fileUploadInputConfig.isRequired)

  if (fileUploadInputConfig.maxValues) {
    fileUploadBuilder.setMaxValues(fileUploadInputConfig.maxValues)
  }

  return createFieldLabelBuilder(fileUploadInputConfig).setFileUploadComponent(
    fileUploadBuilder,
  )
}
