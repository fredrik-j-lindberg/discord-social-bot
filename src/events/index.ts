import { registerScheduledEvents } from "./scheduledEvent";
import { registerInteractionEvent } from "./interactions";
import { registerEvent } from "./utils";

export const registerEvents = () => {
  registerEvent({
    event: "ready",
    listener: (client) => {
      return {
        status: "completed",
        actionTaken: `Acknowledged that ${client.user.tag} was logged in`,
      };
    },
  });
  registerInteractionEvent();
  registerScheduledEvents();
};
