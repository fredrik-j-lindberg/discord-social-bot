import schedule from "node-schedule";
import { logger } from "./lib/logger";

export const registerCronJobs = () => {
  // Run every hour
  schedule.scheduleJob("0 * * * *", () => {
    logger.info("Running hourly cron job");
  });
};
