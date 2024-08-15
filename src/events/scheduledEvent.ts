import { addRole, removeRole } from "~/lib/discord/roles";
import { assertHasDefinedProperty, assertIsDefined } from "~/lib/validation";
import { ClientEvents } from "discord.js";
import { extractRoleIdFromEventDescription, registerEvent } from "./utils";
import { DoraException } from "~/lib/exceptions/DoraException";
import { actionWrapper } from "~/lib/actionWrapper";

const metadataSelector = (
  ...[scheduledEvent, user]: ClientEvents["guildScheduledEventUserAdd"]
) => ({
  user: user.tag,
  guild: scheduledEvent.guild?.name,
  scheduledEvent: scheduledEvent.name,
});

export const registerScheduledEvents = () => {
  registerEvent({
    event: "guildScheduledEventUserAdd",
    listener: async (scheduledEvent, user) => {
      assertHasDefinedProperty(
        scheduledEvent,
        "guild",
        "Event triggered without associated guild",
      );

      const roleId = extractRoleIdFromEventDescription(
        scheduledEvent.description,
      );
      assertIsDefined(
        roleId,
        "Unable to find roleId in scheduled event description",
        DoraException.Severity.Info,
      );

      await actionWrapper({
        action: () => addRole({ roleId, guild: scheduledEvent.guild, user }),
        actionDescription: "Adding role to user",
        meta: { roleId: roleId },
      });
    },
    metadataSelector,
  });

  registerEvent({
    event: "guildScheduledEventUserRemove",
    listener: async (scheduledEvent, user) => {
      assertHasDefinedProperty(
        scheduledEvent,
        "guild",
        "Event triggered without associated guild",
      );

      const roleId = extractRoleIdFromEventDescription(
        scheduledEvent.description,
      );
      assertIsDefined(
        roleId,
        "Unable to find roleId in scheduled event description",
        DoraException.Severity.Info,
      );

      await actionWrapper({
        action: () => removeRole({ roleId, guild: scheduledEvent.guild, user }),
        actionDescription: "Removing role from user",
        meta: { roleId: roleId },
      });
    },
    metadataSelector,
  });
};
