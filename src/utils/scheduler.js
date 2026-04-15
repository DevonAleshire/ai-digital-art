import cron from "node-cron";
import imageService from "../services/imageService.js";
import fileUtils from "./fileUtils.js";

cron.schedule("*/1 * * * *", async () => {
  console.log("Fetching a new image...\n");

  const startTime = performance.now();
  await imageService.fetchImage();
  const endTime = performance.now();

  fileUtils.writeToExecutionLog(startTime, endTime);
});
