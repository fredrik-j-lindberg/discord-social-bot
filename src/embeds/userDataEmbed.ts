import { APIEmbedField, EmbedBuilder, GuildMember } from "discord.js";
import { UserData } from "~/lib/database/schema";
import { formatDate } from "~/lib/helpers/date";
import { getGuildConfigById, OptInUserFields } from "../../guildConfigs";

const getFieldsRelevantForGuilds = ({
  guildId,
  userData,
  member,
}: {
  guildId: string;
  userData: UserData;
  member: GuildMember;
}): APIEmbedField[] => {
  const optInEmbedFields: Record<OptInUserFields, APIEmbedField[]> = {
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
    joinedServer: [
      {
        name: "Joined server",
        value: member.joinedTimestamp
          ? `<t:${Math.round(member.joinedTimestamp / 1000)}:R>`
          : "-",
        inline: true,
      },
    ],
    accountCreation: [
      {
        name: "Account creation",
        value: member.joinedTimestamp
          ? `<t:${Math.round(member.user.createdTimestamp / 1000)}:R>`
          : "-",
        inline: true,
      },
    ],
  };
  const guildConfig = getGuildConfigById(guildId);
  const relevantFields = Object.entries(optInEmbedFields)
    .map(([key, value]) => {
      if (!guildConfig.optInUserFields.includes(key as OptInUserFields))
        return null;
      return value;
    })
    .filter(Boolean) as APIEmbedField[][];
  return relevantFields.flat();
};

export const getUserDataEmbed = ({
  guildId,
  member,
  userData,
}: {
  guildId: string;
  member: GuildMember;
  userData: UserData;
}) =>
  new EmbedBuilder()
    .setColor(0x0099ff)
    .setTitle(`User Data - ${member.displayName}`)
    .setThumbnail(member.avatarURL())
    .addFields(getFieldsRelevantForGuilds({ guildId, userData, member }))
    .setFooter({
      text: "Add or update your user data with the /pii command",
    });
