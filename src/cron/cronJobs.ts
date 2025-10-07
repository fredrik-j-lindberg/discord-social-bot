import schedule from "node-schedule"

import { actionWrapper } from "~/lib/actionWrapper"

import { logger } from "../lib/logger"
import { announceRelevantScheduledEventsForAllGuilds } from "./announceEvents"
import { happyBirthday } from "./happyBirthday"
import { inactivityMonitor } from "./inactivityCheck"

/**
 * Interval options for cron job. A scheduled job with the minute format
 * will run every minute, and the hour format will run every hour etc
 */
const CRON_INTERVAL = {
  MINUTE: "* * * * *", // Helpful when running locally to test an action
  HOUR: "0 * * * *",
  MIDNIGHT: "0 0 * * *", // 00.00 daily
  MIDDAY: "0 12 * * *", // 12.00 daily
  WEEKLY: "0 8 * * 0", // 08.00 every Sunday
}

export const registerCronJobs = () => {
  schedule.scheduleJob(CRON_INTERVAL.HOUR, async () => {
    logger.debug("Running hourly cron job")
    await actionWrapper({
      action: announceRelevantScheduledEventsForAllGuilds,
      actionDescription: "Announce relevant scheduled events for all guilds",
      swallowError: true,
    })
  })
  schedule.scheduleJob(CRON_INTERVAL.MIDNIGHT, async () => {
    logger.debug("Running daily midnight cron job")
    await actionWrapper({
      action: happyBirthday,
      actionDescription: "Handle birthday cron job",
      swallowError: true,
    })
  })
  schedule.scheduleJob(CRON_INTERVAL.MIDDAY, async () => {
    logger.debug("Running daily midday cron job")
    await actionWrapper({
      action: inactivityMonitor,
      actionDescription: "Handle inactivity monitor cron job",
      swallowError: true,
    })
  })
  logger.debug("Cron jobs successfully registered")
}
