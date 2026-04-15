import cron from "node-cron";
import imageService from "../services/imageService.js";
import fileUtils from "./fileUtils.js";

// Default: every minute for local dev. Override via CRON_SCHEDULE env var.
// Examples:
//   3x/day at 8am, 12pm, 6pm:  0 8,12,18 * * *
//   1x/day at 9am:              0 9 * * *
const schedule = process.env.CRON_SCHEDULE || "*/1 * * * *";

if (!cron.validate(schedule)) {
  console.error(`❌ Invalid CRON_SCHEDULE: "${schedule}". Using default: */1 * * * *`);
}

cron.schedule(cron.validate(schedule) ? schedule : "*/1 * * * *", async () => {
  const timestamp = new Date().toLocaleString();
  console.log(`\n⏱️  [${timestamp}] Starting image fetch...`);

  const startTime = performance.now();
  try {
    await imageService.fetchImage();
    const endTime = performance.now();
    const duration = (endTime - startTime).toFixed(2);

    fileUtils.writeToExecutionLog(startTime, endTime);
    console.log(`✅ Completed in ${duration}ms\n`);
  } catch (error) {
    const endTime = performance.now();
    const duration = (endTime - startTime).toFixed(2);
    console.log(`❌ Failed after ${duration}ms\n`);
  }
});
