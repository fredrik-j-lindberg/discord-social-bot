import { z } from "zod"

import type { ModalData } from "~/events/interactionCreate/listeners/modalSubmitRouter"
import { getGuildConfig } from "~/lib/database/guildConfigService"
import { createRoleMention } from "~/lib/discord/message"
import { addRole, removeRole } from "~/lib/discord/roles"
import { getMember } from "~/lib/discord/user"
import {
  createDynamicModal,
  extractAndValidateModalValues,
  generateModalSchema,
  type ModalInputConfig,
} from "~/lib/helpers/modals"
import { assertHasDefinedProperty } from "~/lib/validation"

export interface InterestRoleOption {
  id: string
  name: string
}

export interface InterestsModalInput {
  interestRoles: InterestRoleOption[]
  currentRoleIds: string[]
}

const modalInputsMap = {
  interests: {
    type: "select" as const,
    id: "interests",
    label: "Your Interests",
    description: "Select all that apply — your roles will be updated",
    isRequired: false,
    multiSelect: true,
    validation: z.array(z.string()),
    getOptions: (metadata: InterestsModalInput) =>
      metadata.interestRoles.map((role) => ({
        value: role.id,
        name: role.name,
        isDefault: metadata.currentRoleIds.includes(role.id),
      })),
  },
} satisfies Record<string, ModalInputConfig<string, InterestsModalInput>>

const interestsModalSchema = generateModalSchema(modalInputsMap)

const modalInputsConfig = Object.values(modalInputsMap)

export default {
  data: { name: "interestsModal" },
  async createModal(input) {
    return createDynamicModal({
      customId: this.data.name,
      title: "Your Interests",
      inputConfigs: modalInputsConfig,
      modalMetadata: input,
      modalOptions: { ephemeral: true },
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

    const guildConfig = await getGuildConfig(guildId)
    const configuredRoleIds = guildConfig?.interests?.roles ?? []

    if (configuredRoleIds.length === 0) {
      return "No interest roles are currently configured for this server."
    }

    const guild = interaction.guild
    const guildMember = await getMember({ guild, userId: interaction.user.id })

    const validatedInput = extractAndValidateModalValues({
      interaction,
      inputConfigs: modalInputsConfig,
      inputsToExtract: modalInputsConfig.map((f) => f.id),
      validationSchema: interestsModalSchema,
    })

    const selectedRoleIds = new Set(validatedInput.interests)
    const memberRoleIds = new Set(guildMember.roles.cache.keys())

    const roleIdsToAdd = configuredRoleIds.filter(
      (id) => selectedRoleIds.has(id) && !memberRoleIds.has(id),
    )
    const roleIdsToRemove = configuredRoleIds.filter(
      (id) => !selectedRoleIds.has(id) && memberRoleIds.has(id),
    )

    const results = await Promise.allSettled([
      ...roleIdsToAdd.map((roleId) =>
        addRole({ roleId, guild, member: guildMember }),
      ),
      ...roleIdsToRemove.map((roleId) =>
        removeRole({ roleId, guild, member: guildMember }),
      ),
    ])

    const failedCount = results.filter((r) => r.status === "rejected").length
    if (failedCount > 0) {
      return `Your interests were updated, but ${failedCount} role(s) could not be assigned. Make sure the bot has permission to manage those roles.`
    }

    if (validatedInput.interests.length === 0) {
      return "Your interests have been cleared."
    }

    return `Your interests have been updated! Current interests: ${validatedInput.interests.map(createRoleMention).join(", ")}.`
  },
} satisfies ModalData<InterestsModalInput | undefined>
