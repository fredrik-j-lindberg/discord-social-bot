import schedule from "node-schedule";

import { actionWrapper } from "~/lib/actionWrapper";

import { logger } from "../lib/logger";
import { announceRelevantScheduledEventsForAllGuilds } from "./announceEvents";
import { happyBirthday } from "./happyBirthday";

/**
 * Interval options for cron job. A scheduled job with the minute format
 * will run every minute, and the hour format will run every hour etc
 */
const CRON_INTERVAL = {
  MINUTE: "* * * * *", // Helpful when running locally to test an action
  HOUR: "0 * * * *",
  MIDNIGHT: "0 0 * * *", // 00.00 daily
};

export const registerCronJobs = () => {
  schedule.scheduleJob(CRON_INTERVAL.HOUR, async () => {
    logger.info("Running hourly cron job");
    await actionWrapper({
      action: announceRelevantScheduledEventsForAllGuilds,
      actionDescription: "Announce relevant scheduled events for all guilds",
      swallowError: true,
    });
  });
  schedule.scheduleJob(CRON_INTERVAL.MIDNIGHT, async () => {
    logger.info("Running daily cron job");
    await actionWrapper({
      action: happyBirthday,
      actionDescription: "Handle birthday cron job",
      swallowError: true,
    });
  });
  logger.info("Cron jobs successfully registered");
};
