import {
  type GuildBasedChannel,
  GuildScheduledEvent,
  type MessageCreateOptions,
  MessageFlags,
} from "discord.js"

import type { Photo } from "~/scraper/googlePhotosScraper"

import type { PhotoAlbum } from "../../../guildConfigs"
import { createDiscordTimestamp } from "../helpers/date"
import { assertChannelIsTextBased, assertIsDefined } from "../validation"

const sendMsg = async (
  channel: GuildBasedChannel | null,
  messagePayload: MessageCreateOptions,
) => {
  assertChannelIsTextBased(
    channel,
    "Channel was not found or is not a text based channel",
  )
  await channel.send(messagePayload)
}

export const sendRecentPhotosUploaded = async ({
  photos,
  channel,
  intervalHours,
  album,
}: {
  photos: Photo[]
  channel: GuildBasedChannel | null
  /** Hours back for the cutoff date. 1 = looked for photos uploaded in the last hour */
  intervalHours: number
  album: PhotoAlbum
}) => {
  const attachments = photos.map((photo) => ({
    attachment: photo.url,
    name: photo.uploadDate.toISOString() + ".png",
  }))

  const hoursText =
    intervalHours === 1 ? "last hour" : `last ${intervalHours} hours`
  await sendMsg(channel, {
    content: `\`${photos.length}\` photos were uploaded to a shared album [${album.name}](<${album.url}>) in the ${hoursText}. Preview:`,
    files: attachments.slice(0, 9),
  })
}

export const sendBirthdayWish = async ({
  userId,
  channel,
}: {
  userId: string
  channel: GuildBasedChannel | null
}) => {
  await sendMsg(channel, {
    content: `Happy birthday, <@${userId}>! 🎉`,
    flags: MessageFlags.SuppressNotifications,
  })
}

export const sendEventReminder = async ({
  scheduledEvent,
  channel,
}: {
  scheduledEvent: GuildScheduledEvent
  channel: GuildBasedChannel | null
}) => {
  const subscribers = await scheduledEvent.fetchSubscribers()
  const interestedUsers = subscribers.map((subscriber) => subscriber.user)

  const eventStartTimestamp = scheduledEvent.scheduledStartTimestamp
  assertIsDefined(eventStartTimestamp, "No start timestamp found for event")

  const nameWithoutEmojis = removeEmojis(scheduledEvent.name) // Emojis break the markdown link
  const relativeDateFormat = createDiscordTimestamp(eventStartTimestamp)
  await sendMsg(channel, {
    content: `[${nameWithoutEmojis}](${scheduledEvent.url}) will take place ${relativeDateFormat}. Currently set as interested: ${interestedUsers.join(" ")}`,
  })
}

const removeEmojis = (input: string) => {
  // Regex stolen from here: https://stackoverflow.com/a/40763403
  const regexMatchingAllEmojis =
    /(?:[\u2700-\u27bf]|(?:\ud83c[\udde6-\uddff]){2}|[\ud800-\udbff][\udc00-\udfff])[\ufe0e\ufe0f]?(?:[\u0300-\u036f\ufe20-\ufe23\u20d0-\u20f0]|\ud83c[\udffb-\udfff])?(?:\u200d(?:[^\ud800-\udfff]|(?:\ud83c[\udde6-\uddff]){2}|[\ud800-\udbff][\udc00-\udfff])[\ufe0e\ufe0f]?(?:[\u0300-\u036f\ufe20-\ufe23\u20d0-\u20f0]|\ud83c[\udffb-\udfff])?)*/g
  const withoutEmojis = input.replace(regexMatchingAllEmojis, "")
  const withoutDoubleSpaces = withoutEmojis.replace("  ", " ") // <text> <emoji> <text> will result in double spaces
  return withoutDoubleSpaces.trim()
}
