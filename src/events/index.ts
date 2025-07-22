import { logger } from "~/lib/logger"

import { registerEvent } from "../lib/discord/events/registerEvent"
import { registerInteractionEvent } from "./interaction"
import { registerMessageEvent } from "./message"
import { registerScheduledEvents } from "./scheduledEvent"

export const registerEvents = () => {
  registerEvent({
    event: "ready",
    listener: (client) => {
      logger.info(`Bot ${client.user.tag} logged in and ready!`)
    },
  })
  registerEvent({
    event: "error",
    listener: (error) => {
      logger.info(`Websocket triggered an error event: ${error.message}`)
    },
  })
  registerInteractionEvent()
  registerScheduledEvents()
  registerMessageEvent()
  logger.info("Events successfully registered")
}
