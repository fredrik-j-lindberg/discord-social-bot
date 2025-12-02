import { ModalBuilder, TextInputStyle } from "discord.js"
import { z } from "zod"

import type { ModalData } from "~/events/interactionCreate/listeners/modalSubmitRouter"
import {
  getGuildConfig,
  type GuildConfig,
  type GuildConfigData,
  upsertGuildConfig,
} from "~/lib/database/guildConfigService"
import {
  composeSelectMenu,
  composeTextInput,
  extractAndValidateModalValues,
  generateModalSchema,
  type ModalInputConfig,
} from "~/lib/helpers/modals"
import { assertHasDefinedProperty } from "~/lib/validation"

const LOG_LEVELS = ["info", "warn", "error", "fatal"] as const

const modalInputsMap = {
  webhookUrl: {
    type: "text" as const,
    id: "webhookUrl",
    label: "Discord Webhook URL",
    description:
      "Webhook URL to send the logs to (Channel settings -> Integrations -> Webhooks)",
    style: TextInputStyle.Short,
    validation: z.url(),
    placeholder: "https://discord.com/api/webhooks/...",
    isRequired: true,
    getPrefilledValue: (config) => config?.logs?.webhookUrl,
  },
  levelThreshold: {
    type: "select" as const,
    id: "levelThreshold",
    label: "Level Threshold",
    validation: z.enum(LOG_LEVELS),
    isRequired: true,
    getOptions: (config) =>
      LOG_LEVELS.map((level) => ({
        value: level,
        name: level.toUpperCase(),
        isDefault: config?.logs?.levelThreshold
          ? level === config.logs.levelThreshold
          : level === "info",
      })),
  },
} satisfies Record<string, ModalInputConfig<string, GuildConfig | undefined>>

const guildConfigLogsModalSchema = generateModalSchema(modalInputsMap)

const inputConfigs = Object.values(modalInputsMap)

export default {
  data: {
    name: "guildConfigLogsModal",
  },
  async createModal(currentConfig) {
    const modal = new ModalBuilder()
      .setCustomId("guildConfigLogsModal")
      .setTitle("Update Guild Log Configuration")

    const webhookUrlLabel = composeTextInput(
      modalInputsMap.webhookUrl,
      currentConfig,
    )
    modal.addLabelComponents(webhookUrlLabel)

    const levelThresholdLabel = await composeSelectMenu(
      modalInputsMap.levelThreshold,
      currentConfig,
    )
    if (levelThresholdLabel) {
      modal.addLabelComponents(levelThresholdLabel)
    }

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
      inputConfigs,
      inputsToExtract: inputConfigs.map((input) => input.id),
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
