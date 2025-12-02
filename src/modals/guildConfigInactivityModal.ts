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

const modalInputsMap = {
  daysUntilInactive: {
    type: "text" as const,
    id: "daysUntilInactive",
    label: "Days Until Inactive",
    description: "Number of days of inactivity before marking a user inactive",
    style: TextInputStyle.Short,
    validation: z.coerce.number().int().positive(),
    placeholder: "90",
    isRequired: true,
    getPrefilledValue: (config) =>
      config?.inactivity?.daysUntilInactive.toString(),
  },
  daysAsInactiveBeforeKick: {
    type: "text" as const,
    id: "daysAsInactiveBeforeKick",
    label: "Days as Inactive Before Kick",
    description:
      "Days after being marked inactive before kicking the user from the server",
    style: TextInputStyle.Short,
    validation: z.coerce.number().int().positive(),
    placeholder: "30",
    isRequired: true,
    getPrefilledValue: (config) =>
      config?.inactivity?.daysAsInactiveBeforeKick.toString(),
  },
  inviteLink: {
    type: "text" as const,
    id: "inviteLink",
    label: "Invite Link",
    description: "Invite link to include in kick notice for easy rejoining",
    style: TextInputStyle.Short,
    validation: z
      .string()
      .optional()
      .nullable()
      .transform((val) => (val && val.length > 0 ? val : undefined))
      .pipe(z.url().optional()),
    placeholder: "https://discord.gg/...",
    isRequired: false,
    getPrefilledValue: (config) => config?.inactivity?.inviteLink,
  },
  inactiveRoleId: {
    type: "text" as const,
    id: "inactiveRoleId",
    label: "Inactive Role ID",
    description: "Role ID to assign to inactive users",
    style: TextInputStyle.Short,
    validation: z
      .string()
      .optional()
      .nullable()
      .transform((val) => (val && val.length > 0 ? val : undefined)),
    placeholder: "1234567890123456789",
    isRequired: false,
    getPrefilledValue: (config) => config?.inactivity?.inactiveRoleId,
  },
} satisfies Record<string, ModalInputConfig<string, GuildConfig | undefined>>

const guildConfigInactivityModalSchema = generateModalSchema(modalInputsMap)

const modalInputsConfig = Object.values(modalInputsMap)

export default {
  data: {
    name: "guildConfigInactivityModal",
  },
  async createModal(currentConfig) {
    const modal = new ModalBuilder()
      .setCustomId("guildConfigInactivityModal")
      .setTitle("Update Inactivity Configuration")

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

    // Extract and validate form data
    const inputParsing = extractAndValidateModalValues({
      interaction,
      inputConfigs: modalInputsConfig,
      inputsToExtract: modalInputsConfig.map((f) => f.id),
      validationSchema: guildConfigInactivityModalSchema,
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
      inactivity: {
        daysUntilInactive: validatedInput.daysUntilInactive,
        daysAsInactiveBeforeKick: validatedInput.daysAsInactiveBeforeKick,
        inviteLink: validatedInput.inviteLink,
        inactiveRoleId: validatedInput.inactiveRoleId,
      },
    }

    // Update the config
    await upsertGuildConfig(guildId, newConfigData)

    return "Successfully updated inactivity configuration!"
  },
} satisfies ModalData<GuildConfig | undefined>
