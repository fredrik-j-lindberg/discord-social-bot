import { SlashCommandBuilder } from "discord.js"

import {
  type Command,
  ephemeralOptionName,
} from "~/events/interactionCreate/listeners/commandRouter"
import { getDoraDatabaseMember } from "~/lib/helpers/member"
import { assertHasDefinedProperty } from "~/lib/validation"

import piiModal from "../modals/piiModal"

const command = new SlashCommandBuilder()
  .setName("pii")
  .setDescription("Triggers form for adding member data about yourself")
  .setContexts(0) // Guild only
  .addBooleanOption((option) =>
    option
      .setName(ephemeralOptionName)
      .setDescription("Whether to reply silently (only visible to you)")
      .setRequired(false),
  )

export default {
  type: "chat",
  deferReply: false,
  command,
  data: { name: command.name },
  execute: async (interaction) => {
    assertHasDefinedProperty(
      interaction,
      "guild",
      "Command issued without associated guild",
    )

    const doraMember = await getDoraDatabaseMember({
      userId: interaction.user.id,
      guildId: interaction.guild.id,
      withEmojiCounts: false,
    })
    const modal = await piiModal.createModal({
      guildId: interaction.guild.id,
      doraMember,
      ephemeral:
        interaction.options.getBoolean(ephemeralOptionName) ?? undefined,
    })
    // TODO: can this be handled by the execute wrapper? If response is of type modalbuilder, do this. Then we could return above.
    await interaction.showModal(modal)
    return undefined // Modal submission will handle response
  },
} satisfies Command
