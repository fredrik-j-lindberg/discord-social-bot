import { addRole, removeRole } from "~/lib/discord/roles";
import { assertHasDefinedProperty, assertIsDefined } from "~/lib/validation";
import { ClientEvents } from "discord.js";
import { extractRoleIdFromEventDescription, registerEvent } from "./utils";
import { DoraException } from "~/lib/exceptions/DoraException";
import { actionWrapper } from "~/lib/actionWrapper";

const metadataSelector = (
  // TODO: update event to scheduledEvent
  ...[event, user]: ClientEvents["guildScheduledEventUserAdd"]
) => ({
  user: user.tag,
  guild: event.guild?.name,
  scheduledEvent: event.name,
});

export const registerScheduledEvents = () => {
  registerEvent({
    event: "guildScheduledEventUserAdd",
    // TODO: update event to scheduledEvent
    listener: async (event, user) => {
      const roleId = extractRoleIdFromEventDescription(event.description);
      assertIsDefined(
        roleId,
        "Unable to find roleId in event description",
        DoraException.Severity.Info,
      );
      assertHasDefinedProperty(
        event,
        "guild",
        "Event triggered without associated guild",
      );

      await actionWrapper({
        action: () => addRole({ roleId, guild: event.guild, user }),
        actionDescription: "Adding role to user",
        meta: { roleId: roleId },
      });
    },
    metadataSelector,
  });

  registerEvent({
    event: "guildScheduledEventUserRemove",
    // TODO: update event to scheduledEvent
    listener: async (event, user) => {
      const roleId = extractRoleIdFromEventDescription(event.description);
      assertIsDefined(
        roleId,
        "Unable to find roleId in event description",
        DoraException.Severity.Info,
      );
      assertHasDefinedProperty(
        event,
        "guild",
        "Event triggered without associated guild",
      );

      await actionWrapper({
        action: () => removeRole({ roleId, guild: event.guild, user }),
        actionDescription: "Removing role from user",
        meta: { roleId: roleId },
      });
    },
    metadataSelector,
  });
};
