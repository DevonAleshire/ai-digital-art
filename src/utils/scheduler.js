import cron from "node-cron";
import imageService from "../services/imageService.js";
import fileUtils from "./fileUtils.js";

cron.schedule("*/1 * * * *", async () => {
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
