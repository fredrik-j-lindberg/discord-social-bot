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
  composeModalInputs,
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

const modalInputsConfig = Object.values(modalInputsMap)

export default {
  data: {
    name: "guildConfigLogsModal",
  },
  async createModal(currentConfig) {
    const modal = new ModalBuilder()
      .setCustomId("guildConfigLogsModal")
      .setTitle("Update Guild Log Configuration")

    const composedInputs = await composeModalInputs(
      modalInputsConfig,
      currentConfig,
    )
    modal.addLabelComponents(...composedInputs)

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

    const validatedInput = extractAndValidateModalValues({
      interaction,
      inputConfigs: modalInputsConfig,
      inputsToExtract: modalInputsConfig.map((input) => input.id),
      validationSchema: guildConfigLogsModalSchema,
    })

    // Merge the existing config with the new log config
    const currentConfig = await getGuildConfig(guildId)
    const newConfigData: GuildConfigData = {
      ...currentConfig,
      logs: validatedInput,
    }

    await upsertGuildConfig(guildId, newConfigData)

    return "Successfully updated guild log configuration!"
  },
} satisfies ModalData<GuildConfig | undefined>
