import { Guild, GuildBasedChannel } from "discord.js";
import { DoraException } from "../exceptions/DoraException";

export const getChannel = async ({
  guild,
  channelId,
}: {
  guild: Guild;
  channelId: string;
}): Promise<GuildBasedChannel> => {
  const channel = await guild.channels.fetch(channelId);
  if (!channel) {
    throw new DoraException(
      `Failed to fetch guild channel`,
      DoraException.Type.NotFound,
      { metadata: { channelId, guildId: guild.id } },
    );
  }
  return channel;
};
