const extractDataFromEventDescription = ({
  description,
  selector,
}: {
  description: string | null;
  selector: string;
}) => {
  const regex = new RegExp(`${selector}="([^"]+)"`); // Matches for example: roleId="12345", channelId="12345" or shouldRemind="true"
  const match = description?.match(regex);
  return match?.[1];
};

export const extractRoleIdFromEventDescription = (description: string | null) =>
  extractDataFromEventDescription({ description, selector: "roleId" });

export const extractChannelIdFromEventDescription = (
  description: string | null,
) => extractDataFromEventDescription({ description, selector: "channelId" });

export const extractShouldRemindFromEventDescription = (
  description: string | null,
) => {
  const shouldRemind = extractDataFromEventDescription({
    description,
    selector: "shouldRemind",
  });
  return shouldRemind === "true";
};

export const extractLatestReminderFromEventDescription = (
  description: string | null,
) => {
  const latestReminderAt = extractDataFromEventDescription({
    description,
    selector: "latestReminderAt",
  });

  if (!latestReminderAt) return undefined;
  return parseInt(latestReminderAt);
};
