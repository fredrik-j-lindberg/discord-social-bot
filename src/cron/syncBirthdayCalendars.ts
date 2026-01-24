import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3"

import { env } from "~/env"
import { actionWrapper } from "~/lib/actionWrapper"
import { generateBirthdayCalendar } from "~/lib/calendar/icsGenerator"
import { getMembersWithField } from "~/lib/database/memberDataService"
import { DoraException } from "~/lib/exceptions/DoraException"
import { logger } from "~/lib/logger"

import { type StaticGuildConfig, staticGuildConfigs } from "../../guildConfigs"

// Initialize R2 client for calendar uploads
const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
})

const publicR2DevUrl = "https://pub-c6e6274e80fa4883b490d132062cb48c.r2.dev"

/**
 * Generates and uploads a birthday calendar for a specific guild to R2
 * Returns the public URL of the uploaded calendar
 */
const syncGuildBirthdayCalendar = async (
  guildConfig: StaticGuildConfig,
): Promise<string> => {
  const guildId = guildConfig.guildId

  // Check if birthdays are enabled for this guild
  const hasBirthdayField = guildConfig.optInMemberFields.includes("birthday")
  if (!hasBirthdayField) {
    throw new DoraException(
      "Birthday field not enabled for guild",
      DoraException.Type.NotFound,
      {
        severity: DoraException.Severity.Debug,
        metadata: { guildId },
      },
    )
  }

  // Get all members with birthdays in this guild
  const members = await getMembersWithField({
    guildId,
    field: "birthday",
  })

  // Filter to only members that have a birthday set
  const membersWithBirthdays = members.filter(
    (member) => member.personalInfo.birthday != null,
  )

  logger.debug(
    { guildId, memberCount: membersWithBirthdays.length },
    "Generating birthday calendar",
  )

  // Generate the ICS calendar content
  const calendarContent = generateBirthdayCalendar(
    membersWithBirthdays.map((member) => ({
      id: `${guildId}-${member.userId}`,
      displayName: member.displayName,
      birthday: member.personalInfo.birthday!,
    })),
    {
      calendarName: `Server Birthdays`,
      calendarId: `discord-birthday-calendar-${guildId}`,
      description: `Birthday calendar for Discord server members. Subscribe to this calendar to never miss a birthday!`,
    },
  )

  // Upload to R2 with a consistent key for this guild
  const key = `calendars/${guildId}/birthdays.ics`

  await r2Client.send(
    new PutObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: key,
      Body: calendarContent,
      ContentType: "text/calendar; charset=utf-8",
      // Cache for 1 hour, but allow revalidation
      CacheControl: "public, max-age=3600, must-revalidate",
      Metadata: {
        guildId,
        memberCount: String(membersWithBirthdays.length),
        generatedAt: new Date().toISOString(),
      },
    }),
  )

  const publicUrl = `${publicR2DevUrl}/${key}`

  logger.info(
    { guildId, memberCount: membersWithBirthdays.length, url: publicUrl },
    "Birthday calendar uploaded successfully",
  )

  return publicUrl
}

/**
 * Syncs birthday calendars for all configured guilds
 * This should be run periodically (e.g., daily or after birthday updates)
 */
export const syncAllBirthdayCalendars = async (): Promise<void> => {
  for (const guildConfig of Object.values(staticGuildConfigs)) {
    await actionWrapper({
      action: () => syncGuildBirthdayCalendar(guildConfig),
      actionDescription: "Sync birthday calendar",
      meta: { guildId: guildConfig.guildId },
      swallowError: true,
    })
  }
}

/**
 * Gets the public URL for a guild's birthday calendar
 */
export const getBirthdayCalendarUrl = (guildId: string): string => {
  return `${publicR2DevUrl}/calendars/${guildId}/birthdays.ics`
}
