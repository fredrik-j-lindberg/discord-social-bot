import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js"

import type { Command } from "~/events/interactionCreate/listeners/commandRouter"
import { getEmojiCounts } from "~/lib/database/memberEmojisService"
import { getGuildEmojis } from "~/lib/discord/guilds"
import { createEmojiMention } from "~/lib/discord/message"
import { DoraException } from "~/lib/exceptions/DoraException"
import { DoraUserException } from "~/lib/exceptions/DoraUserException"
import { assertHasDefinedProperty, isOneOf } from "~/lib/validation"

const dataOption = {
  name: "memberdata",
  description: "List member data for field",
  choices: {
    popularEmojis: { name: "Popular emojis", value: "popularEmojis" },
    unpopularEmojis: { name: "Unpopular emojis", value: "unpopularEmojis" },
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
  role?: { id: string } | null
}) => {
  const guildId = interaction.guild.id

  switch (dataChoice) {
    case "popularEmojis":
      return await handleEmojiPopularityChoice({
        guildId,
        mode: "popular",
      })
    case "unpopularEmojis":
      return await handleEmojiPopularityChoice({
        guildId,
        mode: "unpopular",
      })
    default:
      dataChoice satisfies never
      throw new DoraException(`Unhandled choice: ${dataChoice as string}`)
  }
}

const handleEmojiPopularityChoice = async ({
  guildId,
  mode,
}: {
  guildId: string
  mode: "popular" | "unpopular"
}): Promise<string> => {
  const emojis = await getGuildEmojis(guildId)

  const emojiCounts = await getEmojiCounts(
    emojis.map((emoji) => ({ id: emoji.id, name: emoji.name })),
  )

  const limit = 15
  const relevantRange =
    mode === "popular"
      ? [0, limit]
      : [emojiCounts.length - limit, emojiCounts.length]
  const relevantCounts = emojiCounts.slice(...relevantRange)

  const list = relevantCounts
    .map((emojiCount) => {
      return `- ${createEmojiMention(emojiCount.emojiName, emojiCount.emojiId)}: ${emojiCount.count || "-"}`
    })
    .join("\n")
  return `*${mode === "popular" ? "Popular" : "Unpopular"} emojis*\n${list}`
}
