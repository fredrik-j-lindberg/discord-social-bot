import { client } from "~/client";
import { getUsersWithBirthdayToday } from "~/lib/airtable/userData";
import { sendBirthdayWish } from "~/lib/discord/sendMessage";
import { DoraException } from "~/lib/exceptions/DoraException";
import { guildConfigs } from "../../guildConfigs";

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
    const channel = await guild.channels.fetch(
      guildConfig.channelIds.birthdayWishes,
    );
    await sendBirthdayWish({ userId: user.userId, channel });
  }
};
