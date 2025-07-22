import { messageRouter } from "~/router/messageRouter"

import { registerEvent } from "../lib/discord/events/registerEvent"

export const registerMessageEvent = () => {
  registerEvent({
    event: "messageCreate",
    listener: async (message) => {
      await messageRouter(message)
    },
    metadataSelector: (message) => ({
      user: message.interactionMetadata?.user.tag,
    }),
  })
}
