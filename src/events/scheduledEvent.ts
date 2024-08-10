import { addRole, removeRole } from "~/lib/discord/roles";
import {
  assertHasDefinedProperty,
  assertIsDefined,
  assertIsTruthy,
} from "~/lib/validation";
import {
  ClientEvents,
  Guild,
  GuildScheduledEvent,
  PartialGuildScheduledEvent,
} from "discord.js";
import { extractRoleIdFromEventDescription, registerEvent } from "./utils";
import { DoraException } from "~/lib/exceptions/DoraException";
import { scheduledEventIterator } from "~/lib/discord/scheduledEvents/utils";

const metadataSelector = (
  ...[event, user]: ClientEvents["guildScheduledEventUserAdd"]
) => ({
  user: user.tag,
  guild: event.guild?.name,
  scheduledEvent: event.name,
});

export const registerScheduledEvents = () => {
  registerEvent({
    event: "guildScheduledEventUserAdd",
    listener: async (event, user) => {
      const roleId = extractRoleIdFromEventDescription(event.description);
      assertIsDefined(
        roleId,
        "Unable to find roleId in event description",
        DoraException.Severity.Info,
      );
      assertIsDefined(event.guild, "Event triggered without associated guild");

      const roleAdded = await addRole({ roleId, guild: event.guild, user });
      return {
        status: "completed",
        actionTaken: "Role added to user",
        metadata: { role: roleAdded.name },
      };
    },
    metadataSelector,
  });

  registerEvent({
    event: "guildScheduledEventUserRemove",
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

      const otherEventsWithSameRole =
        await getOtherEventsWithSameRoleIdUserIsInterestedIn({
          scheduledEvent: event,
        });
      assertIsTruthy(
        otherEventsWithSameRole.length === 0,
        "Role is used in other scheduled events user is interested in, not removing role",
        DoraException.Severity.Info,
      );

      const roleAdded = await removeRole({ roleId, guild: event.guild, user });
      return {
        status: "completed",
        actionTaken: "Role removed from user",
        metadata: { role: roleAdded.name },
      };
    },
    metadataSelector,
  });
};

type ScheduledEventWithGuild = Omit<
  GuildScheduledEvent | PartialGuildScheduledEvent,
  "guild"
> & { guild: Guild };
const getOtherEventsWithSameRoleIdUserIsInterestedIn = async ({
  scheduledEvent,
}: {
  scheduledEvent: ScheduledEventWithGuild;
}) => {
  const allEventRoleIdResults = await scheduledEventIterator({
    guild: scheduledEvent.guild,
    action: (scheduledEvent) => {
      if (scheduledEvent.id === scheduledEvent.id) return; // Skip the current event
      // TODO: Filter out events that the user is not interested in
      return extractRoleIdFromEventDescription(scheduledEvent.description);
    },
    meta: { purpose: "GetAllEventRoleIds" },
  });

  const allEventRoleIds = allEventRoleIdResults.map(({ result }) => result);
  return allEventRoleIds.filter((roleId) => roleId !== undefined) as string[];
};
