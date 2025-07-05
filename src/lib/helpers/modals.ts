import {
  ActionRowBuilder,
  ModalBuilder,
  ModalSubmitInteraction,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js"
import z, { ZodType } from "zod/v4"

export interface ModalFieldConfig {
  fieldName: string
  label: string
  style: TextInputStyle
  getPrefilledValue: (
    /** The metadata relevant to prefill the data. For example for the user / pii modal this might the database values for the user */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    modalMetadata: any,
  ) => string | null | undefined
  placeholder?: string
  validation: ZodType
  isRequired: boolean
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
  const test = Object.values(fieldConfigsMap).map((fieldConfig) => [
    fieldConfig.fieldName,
    fieldConfig.validation,
  ])

  return z
    .object({
      ...(Object.fromEntries(test) as unknown as {
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
    // TODO: Can this be solved without the coercion
    valuesToValidate[fieldConfig.fieldName] =
      interaction.fields.getTextInputValue(fieldConfig.fieldName) || null
  }

  return validationSchema.safeParse(valuesToValidate)
}

// https://discordjs.guide/interactions/modals.html#building-and-responding-with-modals
export const createModal = <TFieldConfigs extends ModalFieldConfig[]>({
  modalId,
  title,
  fieldConfigs,
  fieldsToGenerate,
  modalMetaData,
}: {
  modalId: string
  title: string
  fieldConfigs: TFieldConfigs
  fieldsToGenerate: string[]
  modalMetaData?: Parameters<TFieldConfigs[number]["getPrefilledValue"]>[0]
}) => {
  const modal = new ModalBuilder().setCustomId(modalId).setTitle(title)

  const fieldsToGenerateConfigs = fieldConfigs.filter((fieldConfig) =>
    fieldsToGenerate.some(
      (fieldToExtract) => fieldConfig.fieldName === fieldToExtract,
    ),
  )

  if (fieldsToGenerateConfigs.length > 5) {
    throw new Error(
      // Discord modals have a limit of 5 fields per modal
      `Tried to generate too many modal fields. Max allowed per modal is 5 fields but tried to generate '${fieldsToGenerate.join(", ")}'`,
    )
  }

  const components = fieldsToGenerateConfigs.map((fieldConfig) =>
    new TextInputBuilder()
      .setCustomId(fieldConfig.fieldName)
      .setLabel(fieldConfig.label)
      .setValue(fieldConfig.getPrefilledValue(modalMetaData) || "")
      .setStyle(fieldConfig.style)
      .setPlaceholder(fieldConfig.placeholder || "")
      .setRequired(fieldConfig.isRequired),
  )

  const rows = components.map((component) => {
    return new ActionRowBuilder<TextInputBuilder>().addComponents(component)
  })

  modal.addComponents(rows)
  return modal
}
