import { client } from "~/client"
import { getChannel } from "~/lib/discord/channels"
import { sendRecentPhotosUploaded } from "~/lib/discord/sendMessage"
import { DoraException } from "~/lib/exceptions/DoraException"
import { assertIsDefined, assertIsTruthy } from "~/lib/validation"
import { fetchRecentPhotos } from "~/scraper/googlePhotosScraper"

import { getGuildConfigById } from "../../guildConfigs"

export const announceRecentPhotoUploads = async () => {
  const oAuth2Guilds = await client.guilds.fetch()
  for (const [, oAuth2Guild] of oAuth2Guilds) {
    const guild = await oAuth2Guild.fetch()
    const guildConfig = getGuildConfigById(guild.id)

    assertIsTruthy(
      guildConfig.photos,
      "No photos configuration for guild",
      DoraException.Severity.Info,
    )
    const channel = await getChannel({
      guild,
      channelId: guildConfig.photos.channelId,
    })

    // TODO: handle multiple
    const firstAlbum = guildConfig.photos.albums[0]
    assertIsDefined(firstAlbum, "No photo album url found")

    const intervalHours = 1 // Change this to the desired interval, e.g., 1 for last hour, 24 for last day, etc.

    const now = new Date()
    const cutoffDate = new Date(now.getTime() - intervalHours * 60 * 60 * 1000)

    const photos = await fetchRecentPhotos({
      albumUrl: firstAlbum.url,
      cutoffDate,
    })

    assertIsTruthy(
      photos.length,
      "Did not find any recent photos for album",
      DoraException.Severity.Info,
    )

    await sendRecentPhotosUploaded({
      photos,
      channel,
      intervalHours,
      album: firstAlbum,
    })
  }
}
