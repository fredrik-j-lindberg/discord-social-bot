import { APIEmbedField, EmbedBuilder, User } from "discord.js";
import { UserData } from "~/lib/database/schema";
import { formatDate } from "~/lib/helpers/date";
import { getGuildConfigById } from "../../guildConfigs";
import { PiiFieldName } from "~/router/modals/piiModal";

const getFieldsRelevantForGuilds = ({
  guildId,
  userData,
}: {
  guildId: string;
  userData: UserData;
}): APIEmbedField[] => {
  const piiFieldsMappedToEmbedFields: Record<PiiFieldName, APIEmbedField[]> = {
    firstName: [
      {
        name: "First name",
        value: userData.firstName || "-",
        inline: true,
      },
    ],
    birthday: [
      { name: "Age", value: userData.age?.toString() || "-", inline: true },
      {
        name: "Birthday",
        value: formatDate(userData.birthday) || "-",
        inline: true,
      },
    ],
    switchFriendCode: [
      {
        name: "Switch friend code",
        value: userData.switchFriendCode || "-",
        inline: true,
      },
    ],
    pokemonTcgpFriendCode: [
      {
        name: "Pokémon TCGP",
        value: userData.pokemonTcgpFriendCode || "-",
        inline: true,
      },
    ],
    email: [
      {
        name: "Email",
        value: userData.email || "-",
        inline: true,
      },
    ],
    phoneNumber: [
      {
        name: "Phone number",
        value: userData.phoneNumber || "-",
        inline: true,
      },
    ],
  };
  const guildConfig = getGuildConfigById(guildId);
  const relevantFields = Object.entries(piiFieldsMappedToEmbedFields)
    .map(([key, value]) => {
      if (!guildConfig.piiFields.includes(key as PiiFieldName)) return null;
      return value;
    })
    .filter(Boolean) as APIEmbedField[][];
  return relevantFields.flat();
};

export const getUserDataEmbed = ({
  guildId,
  user,
  userData,
}: {
  guildId: string;
  user: User;
  userData: UserData;
}) =>
  new EmbedBuilder()
    .setColor(0x0099ff)
    .setTitle(`User Data - ${user.displayName}`)
    .setThumbnail(user.avatarURL())
    .addFields(getFieldsRelevantForGuilds({ guildId, userData }))
    .setFooter({
      text: "Add or update your user data with the /pii command",
    });
