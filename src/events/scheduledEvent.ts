import { addRole, removeRole } from "~/lib/discord/roles";
import { assertHasDefinedProperty, assertIsDefined } from "~/lib/validation";
import {
  ClientEvents,
  GuildScheduledEvent,
  PartialGuildScheduledEvent,
} from "discord.js";
import { DoraException } from "~/lib/exceptions/DoraException";
import { actionWrapper } from "~/lib/actionWrapper";
import { extractRoleIdFromEventDescription } from "~/lib/discord/scheduledEvents/extractDescriptionValues";
import { registerEvent } from "../lib/discord/events/registerEvent";

const metadataSelector = (
  ...[scheduledEvent, user]: ClientEvents["guildScheduledEventUserAdd"]
) => ({
  user: user.tag,
  guild: scheduledEvent.guild?.name,
  scheduledEvent: scheduledEvent.name,
});

/**
 * Validates that scheduled event is relevant for adding/removing roles
 *
 * @returns The validated scheduled event and role id
 * @throws DoraException of varying severity if the event does not pass assertions needed to proceed
 */
const validateScheduledEventForRoleChange = (
  scheduledEvent: GuildScheduledEvent | PartialGuildScheduledEvent,
) => {
  assertHasDefinedProperty(
    scheduledEvent,
    "guild",
    "Event triggered without associated guild",
  );

  const roleId = extractRoleIdFromEventDescription(scheduledEvent.description);
  assertIsDefined(
    roleId,
    "Unable to find roleId in scheduled event description",
    DoraException.Severity.Info,
  );

  return { scheduledEvent, roleId };
};

export const registerScheduledEvents = () => {
  registerEvent({
    event: "guildScheduledEventUserAdd",
    listener: async (unparsedScheduledEvent, user) => {
      const { scheduledEvent, roleId } = validateScheduledEventForRoleChange(
        unparsedScheduledEvent,
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
    listener: async (unparsedScheduledEvent, user) => {
      const { scheduledEvent, roleId } = validateScheduledEventForRoleChange(
        unparsedScheduledEvent,
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
