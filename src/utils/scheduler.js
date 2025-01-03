import cron from "node-cron";
import imageService from "../services/imageService.js";

// // Schedule the script to run periodically
cron.schedule("*/1 * * * *", async () => {
  console.log("Fetching a new image...\n");

  // Start Time
  const startTime = performance.now();

  // Run the process
  await imageService.fetchImage();

  // End Time
  const endTime = performance.now();

  writeToExecutionLog();
  console.log(executionTime);
});
