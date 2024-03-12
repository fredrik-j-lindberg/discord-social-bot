import schedule from "node-schedule";
import { logger } from "./lib/logger";
import { announceRelevantScheduledEventsForAllGuilds } from "./lib/scheduledEvents";

export const registerCronJobs = () => {
  // Run every hour
  schedule.scheduleJob("0 * * * *", async () => {
    logger.info("Running hourly cron job");
    await announceRelevantScheduledEventsForAllGuilds();
  });
};
