import { addRole, removeRole } from "~/lib/roles";
import { assertIsDefined } from "~/lib/validation";
import { ClientEvents } from "discord.js";
import { extractRoleIdFromEventDescription, registerEvent } from "./utils";

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
      assertIsDefined(roleId, "Unable to find roleId in event description");
      assertIsDefined(event.guild, "Event triggered outside guild");

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
      assertIsDefined(roleId, "Unable to find roleId in event description");
      assertIsDefined(event.guild, "Event triggered outside guild");

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
