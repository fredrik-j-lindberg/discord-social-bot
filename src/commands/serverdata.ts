import {
  type ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from "discord.js"

import type { Command } from "~/events/interactionCreate/listeners/commandRouter"
import { getEmojiCounts } from "~/lib/database/memberEmojisService"
import { getGuildEmojis } from "~/lib/discord/guilds"
import { createEmojiMention, createPaginatedList } from "~/lib/discord/message"
import { DoraException } from "~/lib/exceptions/DoraException"
import { DoraUserException } from "~/lib/exceptions/DoraUserException"
import { assertHasDefinedProperty, isOneOf } from "~/lib/validation"

const dataOption = {
  name: "data",
  description: "List server data for a given field",
  choices: {
    emojis: { name: "Guild emoji stats", value: "emojis" },
  } as const,
}

type DataOption =
  (typeof dataOption.choices)[keyof typeof dataOption.choices]["value"]

const command = new SlashCommandBuilder()
  .setName("serverdata")
  .setDescription("Lists server data")
  .addStringOption((option) =>
    option
      .setName(dataOption.name)
      .setDescription(dataOption.description)
      .setRequired(true)
      .setChoices(...Object.values(dataOption.choices)),
  )

export default {
  type: "chat",
  deferReply: true,
  command,
  data: { name: command.name },
  execute: async (interaction) => {
    assertHasDefinedProperty(
      interaction,
      "guild",
      "Command issued without associated guild",
    )

    const dataChoice = interaction.options.getString(dataOption.name)
    if (!dataChoice) {
      throw new DoraUserException(
        `Required option '${dataOption.name}' is missing`,
      )
    }

    const validDataChoices = Object.values(dataOption.choices).map(
      ({ value }) => value,
    )
    if (!isOneOf(dataChoice, validDataChoices)) {
      throw new DoraUserException(
        `Invalid data option choice '${dataChoice}' provided. Valid choices are: ${validDataChoices.join(
          ", ",
        )}`,
      )
    }

    return await handleDataChoice({ interaction, dataChoice })
  },
} satisfies Command

type CommandInteractionWithGuild = Omit<
  ChatInputCommandInteraction,
  "guild"
> & {
  guild: NonNullable<ChatInputCommandInteraction["guild"]>
}

const handleDataChoice = async ({
  interaction,
  dataChoice,
}: {
  interaction: CommandInteractionWithGuild
  dataChoice: DataOption
}) => {
  const guildId = interaction.guild.id

  switch (dataChoice) {
    // TODO: Remove this ignore when more choices are added
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    case "emojis": {
      return await handleEmojiPopularityChoice({
        guildId,
      })
    }
    default:
      dataChoice satisfies never
      throw new DoraException(`Unhandled choice: ${dataChoice as string}`)
  }
}

const handleEmojiPopularityChoice = async ({
  guildId,
}: {
  guildId: string
}): Promise<EmbedBuilder[]> => {
  const emojis = await getGuildEmojis(guildId)

  const emojiCounts = await getEmojiCounts(
    emojis.map((emoji) => ({ id: emoji.id, name: emoji.name })),
  )

  return createPaginatedList({
    items: emojiCounts.map((emojiCount) => {
      const emoji = createEmojiMention(emojiCount.emojiName, emojiCount.emojiId)
      return `${emoji}   ${emojiCount.count}`
    }),
    header: "Emoji Usage",
    itemsPerPage: 10,
    listType: "number",
  })
}
