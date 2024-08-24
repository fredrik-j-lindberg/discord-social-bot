import { getUsersWithBirthdayToday } from "~/lib/airtable/userData";
import { sendBirthdayWish } from "~/lib/discord/sendMessage";
import { DoraException } from "~/lib/exceptions/DoraException";
import { guildConfigs } from "../../guildConfigs";
import { addRole, getRole } from "~/lib/discord/roles";
import { Guild, GuildMember } from "discord.js";
import { getChannel } from "~/lib/discord/channels";
import { assertIsDefined } from "~/lib/validation";
import { actionWrapper } from "~/lib/actionWrapper";
import { getGuild } from "~/lib/discord/guilds";
import { logger } from "~/lib/logger";

export const happyBirthday = async () => {
  await actionWrapper({
    action: () => resetBirthdayRole(),
    actionDescription: "Reset birthday role",
    swallowError: true,
  });
  const userData = await getUsersWithBirthdayToday();
  for (const user of userData) {
    const guild = await getGuild(user.guildId);
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

const resetBirthdayRole = async () => {
  logger.debug({ guildConfigs }, "TEMP: Resetting birthday role");
  for (const guildConfig of Object.values(guildConfigs)) {
    const guild = await getGuild(guildConfig.guildId);
    const roleId = guildConfig.birthdays.roleId;
    if (!roleId) {
      logger.debug(
        { guildId: guild.id },
        "No birthday role configured, skipping reset",
      );
      return;
    }
    const role = await getRole({ guild, roleId });
    assertIsDefined(
      role,
      "Birthday role not found",
      DoraException.Severity.Warn,
    );
    logger.debug(
      { memberIds: role.members.map((m) => m.id), guildId: guild.id },
      "Removing role from members",
    );
    for (const [, member] of role.members) {
      await actionWrapper({
        action: () => member.roles.remove(role),
        actionDescription: "Remove birthday role from member",
        meta: { userId: member.user.id, guildId: guild.id },
        swallowError: true,
      });
    }
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
