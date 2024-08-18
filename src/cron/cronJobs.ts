import schedule from "node-schedule";
import { logger } from "../lib/logger";
import { announceRelevantScheduledEventsForAllGuilds } from "./announceEvents";
import { happyBirthday } from "./happyBirthday";
import { actionWrapper } from "~/lib/actionWrapper";

/**
 * Interval options for cron job. A scheduled job with the minute format
 * will run every minute, and the hour format will run every hour etc
 */
const CRON_INTERVAL = {
  MINUTE: "* * * * *", // Helpful when running locally to test an action
  HOUR: "0 * * * *",
  DAILY_9: "0 9 * * *", // 9am daily
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
  schedule.scheduleJob(CRON_INTERVAL.DAILY_9, async () => {
    logger.info("Running daily 9 am cron job");
    await actionWrapper({
      action: happyBirthday,
      actionDescription: "Wish users happy birthday",
      swallowError: true,
    });
  });
  logger.info("Cron jobs successfully registered");
};
