import { client } from "~/client";
import { getUsersWithBirthdayToday } from "~/lib/airtable/userData";
import { sendBirthdayWish } from "~/lib/discord/sendMessage";
import { DoraException } from "~/lib/exceptions/DoraException";
import { guildConfigs } from "../../guildConfigs";
import { addRole } from "~/lib/discord/roles";
import { Guild, GuildMember } from "discord.js";
import { getChannel } from "~/lib/discord/channels";
import { logger } from "~/lib/logger";

export const happyBirthday = async () => {
  const userData = await getUsersWithBirthdayToday();
  const oAuth2Guilds = await client.guilds.fetch();
  for (const user of userData) {
    const oAuth2Guild = oAuth2Guilds.get(user.guildId);
    if (!oAuth2Guild) {
      throw new DoraException("Guild not found", DoraException.Type.Unknown, {
        metadata: { guildId: user.guildId },
      });
    }
    const guild = await oAuth2Guild.fetch();
    const guildConfig = guildConfigs[guild.id];
    if (!guildConfig) {
      throw new DoraException(
        "Guild config not found",
        DoraException.Type.NotFound,
        { metadata: { guildId: guild.id } },
      );
    }
    const member = await guild.members.fetch(user.userId);
    await handleBirthdayRole({
      guild,
      roleId: guildConfig.birthdays.roleId,
      member,
    });
    await handleBirthdayWish({
      guild,
      channelId: guildConfig.birthdays.channelId,
      member,
    });
  }
};

const handleBirthdayRole = async ({
  guild,
  roleId,
  member,
}: {
  guild: Guild;
  roleId?: string;
  member: GuildMember;
}) => {
  if (!roleId) {
    logger.warn({ guildId: guild.id }, "No birthday role configured");
    return;
  }
  await addRole({ user: member.user, guild, roleId });
};

const handleBirthdayWish = async ({
  guild,
  channelId,
  member,
}: {
  guild: Guild;
  channelId?: string;
  member: GuildMember;
}) => {
  if (!channelId) {
    logger.warn({ guildId: guild.id }, "No birthday channel configured");
    return;
  }
  const channel = await getChannel({ guild, channelId });
  await sendBirthdayWish({ userId: member.user.id, channel });
};
