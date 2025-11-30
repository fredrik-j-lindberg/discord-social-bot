import {
  LabelBuilder,
  ModalBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js"
import { z } from "zod"

import type { ModalData } from "~/events/interactionCreate/listeners/modalSubmitRouter"
import {
  getGuildConfig,
  type GuildConfig,
  type GuildConfigData,
  upsertGuildConfig,
} from "~/lib/database/guildConfigService"
import {
  extractAndValidateModalValues,
  generateModalSchema,
  type ModalFieldConfig,
} from "~/lib/helpers/modals"
import { assertHasDefinedProperty } from "~/lib/validation"

const LOG_LEVELS = ["info", "warn", "error", "fatal"] as const

const guildConfigLogsFieldConfigsMap = {
  webhookUrl: {
    fieldType: "text" as const,
    fieldName: "webhookUrl",
    label: "Discord Webhook URL",
    description:
      "Webhook URL to send the logs to. This can be found in a channel's settings under Integrations > Webhooks",
    style: TextInputStyle.Short,
    validation: z.url(),
    placeholder: "https://discord.com/api/webhooks/...",
    isRequired: true,
    getPrefilledValue: (config?: GuildConfig) => config?.logs?.webhookUrl,
  },
  levelThreshold: {
    fieldType: "select" as const,
    fieldName: "levelThreshold",
    label: "Level Threshold",
    validation: z.enum(LOG_LEVELS),
    isRequired: true,
    getPrefilledValue: (config?: GuildConfig) => config?.logs?.levelThreshold,
  },
} satisfies Record<string, ModalFieldConfig>

const guildConfigLogsModalSchema = generateModalSchema(
  guildConfigLogsFieldConfigsMap,
)

const fieldConfigs = Object.values(guildConfigLogsFieldConfigsMap)

export default {
  data: {
    name: "guildConfigLogsModal",
  },
  createModal: (currentConfig) => {
    const modal = new ModalBuilder()
      .setCustomId("guildConfigLogsModal")
      .setTitle("Update Guild Log Configuration")

    const webhookUrlLabel = new LabelBuilder()
      .setLabel(guildConfigLogsFieldConfigsMap.webhookUrl.label)
      .setTextInputComponent(
        new TextInputBuilder()
          .setCustomId(guildConfigLogsFieldConfigsMap.webhookUrl.fieldName)
          .setValue(
            guildConfigLogsFieldConfigsMap.webhookUrl.getPrefilledValue(
              currentConfig,
            ) ?? "",
          )
          .setStyle(guildConfigLogsFieldConfigsMap.webhookUrl.style)
          .setPlaceholder(guildConfigLogsFieldConfigsMap.webhookUrl.placeholder)
          .setRequired(false),
      )

    const currentLevelThreshold =
      guildConfigLogsFieldConfigsMap.levelThreshold.getPrefilledValue(
        currentConfig,
      )

    const levelThresholdLabel = new LabelBuilder()
      .setLabel(guildConfigLogsFieldConfigsMap.levelThreshold.label)
      .setStringSelectMenuComponent(
        new StringSelectMenuBuilder()
          .setCustomId(guildConfigLogsFieldConfigsMap.levelThreshold.fieldName)
          .addOptions(
            LOG_LEVELS.map((level) =>
              new StringSelectMenuOptionBuilder()
                .setLabel(level.toUpperCase())
                .setValue(level)
                .setDefault(
                  currentLevelThreshold
                    ? level === currentLevelThreshold
                    : level === "info",
                ),
            ),
          )
          .setRequired(false),
      )

    modal.addLabelComponents(webhookUrlLabel, levelThresholdLabel)

    return modal
  },
  deferReply: true,
  handleSubmit: async (interaction) => {
    assertHasDefinedProperty(
      interaction,
      "guild",
      "Modal submitted without associated guild",
    )

    const guildId = interaction.guild.id

    // Extract and validate form data
    const inputParsing = extractAndValidateModalValues({
      interaction,
      fieldConfigs,
      fieldsToExtract: fieldConfigs.map((f) => f.fieldName),
      validationSchema: guildConfigLogsModalSchema,
    })

    if (!inputParsing.success) {
      const errorMessage = z.prettifyError(inputParsing.error)
      return errorMessage
    }

    const validatedInput = inputParsing.data

    // Get current config to merge with
    const currentConfig = await getGuildConfig(guildId)

    // Prepare new config data
    const newConfigData: GuildConfigData = {
      ...currentConfig,
      logs: {
        webhookUrl: validatedInput.webhookUrl,
        levelThreshold: validatedInput.levelThreshold,
      },
    }

    // Update the config
    await upsertGuildConfig(guildId, newConfigData)

    return "Successfully updated guild log configuration!"
  },
} satisfies ModalData<GuildConfig | undefined>
