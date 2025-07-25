import type { Events } from "discord.js"

import type { EventListener } from "~/lib/discord/events/registerEvent"

export default {
  data: { name: "christianServer" },
  execute: async (message) => {
    /**
     * The listener should only listen for user triggered messages.
     * This also makes sure we avoid an infinite loop of a bot responding to itself
     */
    if (message.author.bot) return

    const containsKeyword = message.content
      .toLowerCase()
      .includes("christian server")

    if (!containsKeyword) return

    await message.channel.send(":cross:")
  },
} satisfies EventListener<Events.MessageCreate>
