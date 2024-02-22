import { registerScheduledEvents } from "./scheduledEvent";
import { registerInteractionEvent } from "./interactions";
import { login, registerEvent } from "./client";

export const registerEvents = () => {
  registerEvent("ready", (client) => {
    return {
      status: "completed",
      actionTaken: `Acknowledged that ${client.user.tag} was logged in`,
    };
  });
  registerInteractionEvent();
  registerScheduledEvents();

  login();
};
