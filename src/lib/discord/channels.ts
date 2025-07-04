import { Guild, type GuildBasedChannel } from "discord.js";
import { DoraException } from "../exceptions/DoraException";

export const getChannel = async ({
  guild,
  channelId,
}: {
  guild: Guild;
  channelId: string;
}): Promise<GuildBasedChannel | null> => {
  try {
    return await guild.channels.fetch(channelId);
  } catch (err) {
    throw new DoraException(
      `Failed to fetch guild channel`,
      DoraException.Type.Unknown,
      { cause: err, metadata: { channelId, guildId: guild.id } },
    );
  }
};
