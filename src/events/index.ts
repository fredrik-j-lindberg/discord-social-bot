import { registerScheduledEvents } from "./scheduledEvent";
import { registerInteractionEvent } from "./interaction";
import { registerEvent } from "../lib/discord/events/registerEvent";
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
