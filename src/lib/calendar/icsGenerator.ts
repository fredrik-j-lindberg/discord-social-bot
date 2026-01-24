/**
 * ICS (iCalendar) file generator for birthday calendars
 *
 * This generates an ICS file that can be subscribed to by Google Calendar
 * or any other calendar application that supports iCal feeds.
 */

interface CalendarEvent {
  /** Unique identifier for the event */
  uid: string
  /** Event title/summary */
  summary: string
  /** Event description (optional) */
  description?: string
  /** Start date (for all-day events, just the date portion is used) */
  startDate: Date
  /** Whether this is an all-day event */
  allDay?: boolean
  /** Recurrence rule (e.g., "FREQ=YEARLY" for annual events) */
  rrule?: string
  /** When the event was created/last modified */
  timestamp: Date
}

interface CalendarOptions {
  /** Calendar name */
  name: string
  /** Calendar description */
  description?: string
  /** Unique identifier for the calendar (used as PRODID) */
  calendarId: string
}

/**
 * Formats a Date to ICS date format (YYYYMMDD) for all-day events
 */
const formatIcsDate = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}${month}${day}`
}

/**
 * Formats a Date to ICS datetime format (YYYYMMDDTHHMMSSZ)
 */
const formatIcsDateTime = (date: Date): string => {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z"
}

/**
 * Escapes special characters in ICS text fields
 */
const escapeIcsText = (text: string): string => {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n")
}

/**
 * Folds long lines according to ICS spec (max 75 chars per line)
 */
const foldLine = (line: string): string => {
  const maxLength = 75
  if (line.length <= maxLength) return line

  const parts: string[] = []
  let remaining = line

  while (remaining.length > 0) {
    if (parts.length === 0) {
      parts.push(remaining.slice(0, maxLength))
      remaining = remaining.slice(maxLength)
    } else {
      // Continuation lines start with a space and have 74 chars of content
      parts.push(" " + remaining.slice(0, maxLength - 1))
      remaining = remaining.slice(maxLength - 1)
    }
  }

  return parts.join("\r\n")
}

/**
 * Generates an ICS event block
 */
const generateEvent = (event: CalendarEvent): string => {
  const lines: string[] = ["BEGIN:VEVENT"]

  lines.push(`UID:${event.uid}`)
  lines.push(`DTSTAMP:${formatIcsDateTime(event.timestamp)}`)
  lines.push(`SUMMARY:${escapeIcsText(event.summary)}`)

  if (event.allDay) {
    lines.push(`DTSTART;VALUE=DATE:${formatIcsDate(event.startDate)}`)
    // For all-day events, end date is exclusive, so add 1 day
    const endDate = new Date(event.startDate)
    endDate.setDate(endDate.getDate() + 1)
    lines.push(`DTEND;VALUE=DATE:${formatIcsDate(endDate)}`)
  } else {
    lines.push(`DTSTART:${formatIcsDateTime(event.startDate)}`)
  }

  if (event.description) {
    lines.push(`DESCRIPTION:${escapeIcsText(event.description)}`)
  }

  if (event.rrule) {
    lines.push(`RRULE:${event.rrule}`)
  }

  lines.push("END:VEVENT")

  return lines.map(foldLine).join("\r\n")
}

/**
 * Generates a complete ICS calendar file content
 */
export const generateIcsCalendar = (
  options: CalendarOptions,
  events: CalendarEvent[],
): string => {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${options.calendarId}//EN`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcsText(options.name)}`,
  ]

  if (options.description) {
    lines.push(`X-WR-CALDESC:${escapeIcsText(options.description)}`)
  }

  // Add refresh interval hint for calendar apps (12 hours)
  lines.push("REFRESH-INTERVAL;VALUE=DURATION:PT12H")
  lines.push("X-PUBLISHED-TTL:PT12H")

  const header = lines.map(foldLine).join("\r\n")
  const eventBlocks = events.map(generateEvent).join("\r\n")
  const footer = "END:VCALENDAR"

  return `${header}\r\n${eventBlocks}\r\n${footer}\r\n`
}

interface BirthdayMember {
  /** Unique identifier (e.g., guildId-userId) */
  id: string
  /** Display name for the calendar event */
  displayName: string
  /** Birthday date */
  birthday: Date
}

/**
 * Creates a birthday calendar event
 * The event recurs yearly on the birthday date
 */
export const createBirthdayEvent = (
  member: BirthdayMember,
  calendarId: string,
): CalendarEvent => {
  // Use the original birthday as the start, it will recur yearly
  // We need to set the year to the first occurrence
  const birthdayThisYear = new Date(
    new Date().getFullYear(),
    member.birthday.getMonth(),
    member.birthday.getDate(),
  )

  return {
    uid: `birthday-${member.id}@${calendarId}`,
    summary: `🎂 ${member.displayName}'s Birthday`,
    description: `Happy Birthday to ${member.displayName}!`,
    startDate: birthdayThisYear,
    allDay: true,
    rrule: "FREQ=YEARLY",
    timestamp: new Date(),
  }
}

/**
 * Generates a complete birthday calendar for a list of members
 */
export const generateBirthdayCalendar = (
  members: BirthdayMember[],
  options: {
    calendarName: string
    calendarId: string
    description?: string
  },
): string => {
  const events = members.map((member) =>
    createBirthdayEvent(member, options.calendarId),
  )

  return generateIcsCalendar(
    {
      name: options.calendarName,
      description: options.description,
      calendarId: options.calendarId,
    },
    events,
  )
}
