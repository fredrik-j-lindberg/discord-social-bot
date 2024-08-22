import { client } from "~/client";
import { getUsersWithBirthdayToday } from "~/lib/airtable/userData";
import { sendBirthdayWish } from "~/lib/discord/sendMessage";
import { DoraException } from "~/lib/exceptions/DoraException";
import { guildConfigs } from "../../guildConfigs";
import { addRole } from "~/lib/discord/roles";
import { Guild, GuildMember } from "discord.js";
import { getChannel } from "~/lib/discord/channels";
import { assertIsDefined } from "~/lib/validation";
import { actionWrapper } from "~/lib/actionWrapper";

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
    await actionWrapper({
      action: () =>
        handleBirthdayRole({
          guild,
          roleId: guildConfig.birthdays.roleId,
          member,
        }),
      actionDescription: "Add birthday role",
      meta: { userId: user.userId, guildId: guild.id },
      swallowError: true,
    });

    await actionWrapper({
      action: () =>
        handleBirthdayWish({
          guild,
          channelId: guildConfig.birthdays.channelId,
          member,
        }),
      actionDescription: "Send birthday wish",
      meta: { userId: user.userId, guildId: guild.id },
      swallowError: true,
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
  assertIsDefined(
    roleId,
    "No birthday role configured",
    DoraException.Severity.Warn,
  );
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
  assertIsDefined(
    channelId,
    "No birthday channel configured",
    DoraException.Severity.Warn,
  );
  const channel = await getChannel({ guild, channelId });
  assertIsDefined(
    channel,
    "Birthday channel not found",
    DoraException.Severity.Warn,
  );

  await sendBirthdayWish({ userId: member.user.id, channel });
};
