import schedule from "node-schedule";
import { logger } from "../lib/logger";
import { announceRelevantScheduledEventsForAllGuilds } from "./announceEvents";
import { actionWrapper } from "~/lib/actionWrapper";

/**
 * Interval options for cron job. A scheduled job with the minute format
 * will run every minute, and the hour format will run every hour etc
 */
const CRON_INTERVAL = {
  MINUTE: "* * * * *", // Helpful when running locally to test an action
  HOUR: "0 * * * *",
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
  logger.info("Cron jobs successfully registered");
};
