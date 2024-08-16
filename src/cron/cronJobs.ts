import schedule from "node-schedule";
import { logger } from "../lib/logger";
import { announceRelevantScheduledEventsForAllGuilds } from "./announceEvents";

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
    await announceRelevantScheduledEventsForAllGuilds();
  });
  logger.info("Cron jobs successfully registered");
};
