import { registerScheduledEvents } from "./scheduledEvent";
import { registerInteractionEvent } from "./interactions";
import { registerEvent } from "./utils";
import { logger } from "~/lib/logger";

export const registerEvents = () => {
  registerEvent({
    event: "ready",
    listener: (client) => {
      logger.info(`Bot ${client.user.tag} logged in and ready!`);
    },
  });
  registerInteractionEvent();
  registerScheduledEvents();
};
