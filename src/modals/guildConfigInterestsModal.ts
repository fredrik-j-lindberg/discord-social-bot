import { z } from "zod"

import type { ModalData } from "~/events/interactionCreate/listeners/modalSubmitRouter"
import {
  getGuildConfig,
  type GuildConfig,
  type GuildConfigData,
  upsertGuildConfig,
} from "~/lib/database/guildConfigService"
import { createRoleMention } from "~/lib/discord/message"
import {
  createDynamicModal,
  extractAndValidateModalValues,
  generateModalSchema,
  type ModalInputConfig,
} from "~/lib/helpers/modals"
import { assertHasDefinedProperty } from "~/lib/validation"

const modalInputsMap = {
  interestRoleIds: {
    type: "roleSelect" as const,
    id: "interestRoleIds",
    label: "Interest Roles",
    description: "Select roles members can self-assign as interests",
    isRequired: false,
    maxValues: 25,
    validation: z.array(z.string()),
    getDefaultRoleIds: (config: GuildConfig | undefined) =>
      config?.interests?.roles ?? [],
  },
} satisfies Record<string, ModalInputConfig<string, GuildConfig | undefined>>

const guildConfigInterestsModalSchema = generateModalSchema(modalInputsMap)

const modalInputsConfig = Object.values(modalInputsMap)

export default {
  data: {
    name: "guildConfigInterestsModal",
  },
  async createModal(currentConfig) {
    return createDynamicModal({
      customId: this.data.name,
      title: "Configure Interest Roles",
      inputConfigs: modalInputsConfig,
      modalMetadata: currentConfig,
    })
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
      inputsToExtract: modalInputsConfig.map((f) => f.id),
      validationSchema: guildConfigInterestsModalSchema,
    })

    const roles = validatedInput.interestRoleIds

    const currentConfig = await getGuildConfig(guildId)
    const newConfigData: GuildConfigData = {
      ...currentConfig,
      interests: roles.length > 0 ? { roles } : undefined,
    }

    await upsertGuildConfig(guildId, newConfigData)

    if (roles.length === 0) {
      return "Interest roles configuration cleared."
    }

    return `Successfully configured ${roles.length} interest role(s): ${roles.map(createRoleMention).join(", ")}`
  },
} satisfies ModalData<GuildConfig | undefined>
