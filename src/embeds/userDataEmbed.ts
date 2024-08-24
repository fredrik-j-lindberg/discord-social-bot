import { EmbedBuilder, User } from "discord.js";
import { UserData } from "~/lib/airtable/types";
import { formatDate } from "~/lib/helpers/date";

export const getUserDataEmbed = ({
  user,
  userData,
}: {
  user: User;
  userData: UserData;
}) =>
  new EmbedBuilder()
    .setColor(0x0099ff)
    .setTitle(`User Data - ${user.displayName}`)
    .setThumbnail(user.avatarURL())
    .addFields(
      { name: "First name", value: userData.firstName || "-", inline: true },
      { name: "Age", value: userData.age || "-", inline: true },
      {
        name: "Birthday",
        value: formatDate(userData.birthday) || "-",
        inline: true,
      },
      {
        name: "Height (cm)",
        value: userData.height?.toString() || "-",
        inline: true,
      },
      {
        name: "Switch friend code",
        value: userData.switchFriendCode || "-",
        inline: true,
      },
    )
    .setFooter({
      text: "Add or update your user data with the /pii command",
    });
