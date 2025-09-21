import { logger } from "~/lib/logger"

import { registerEventListener } from "../lib/discord/events/registerEvent"
import { registerInteractionCreateEvent } from "./interactionCreate"
import { registerMemberUpdateEvent } from "./memberUpdate"
import { registerMessageCreateEvent } from "./messageCreate"
import { registerReactionAddEvent } from "./reactionAdded"
import { registerReactionRemoveEvent } from "./reactionRemoved"
import { registerScheduledEventUserAddEvent } from "./scheduledEventUserAdd"
import { registerScheduledEventUserRemoveEvent } from "./scheduledEventUserRemove"

export const registerEvents = async () => {
  registerEventListener({
    event: "ready",
    listener: {
      data: { name: "readyConfirmation" },
      execute: (client) => {
        logger.info(`Bot ${client.user.tag} logged in and ready!`)
      },
    },
  })
  registerEventListener({
    event: "error",
    listener: {
      data: { name: "errorLogger" },
      execute: (error) => {
        logger.info(`Websocket triggered an error event: ${error.message}`)
      },
    },
  })

  await registerInteractionCreateEvent()
  await registerScheduledEventUserAddEvent()
  await registerScheduledEventUserRemoveEvent()
  await registerMessageCreateEvent()
  await registerReactionAddEvent()
  await registerReactionRemoveEvent()
  await registerMemberUpdateEvent()

  logger.info("Events successfully registered")
}
