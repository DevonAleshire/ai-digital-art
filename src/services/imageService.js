import fs from "fs";
import axios from "axios";
import path from "path";
import openai from "../api/openai.js";
import fileUtils from "../utils/fileUtils.js";
import generalUtils from "../utils/generalUtils.js";
import * as promptService from "./promptService.js";

// File paths
const FILE_PATHS = {
  systemRole: "../prompts/role_system.txt",
  userRole: "../prompts/role_user.txt",
  prompts: "../prompts/prompts.txt",
  dailyArt: "./daily_art.png",
  archive: "./archive/",
};

// Fetch and save an image based on a generated or random prompt
async function fetchImage() {
  try {
    const systemRoleArr = fileUtils.readFileToArray(FILE_PATHS.systemRole);
    const userRoleArr = fileUtils.readFileToArray(FILE_PATHS.userRole);
    const promptArr = fileUtils.readFileToArray(FILE_PATHS.prompts);

    const systemContent = generalUtils.getRandomValue(systemRoleArr);
    const userContent = generalUtils.getRandomValue(userRoleArr);
    const randomPrompt = generalUtils.getRandomValue(promptArr);

    if (!systemContent || !userContent || !randomPrompt) {
      throw new Error("Insufficient data to proceed.");
    }

    console.log(`System Content: ${systemContent}`);
    console.log(`User Content: ${userContent}`);
    console.log(`Random Prompt: ${randomPrompt}\n`);

    // Decide whether to generate a new prompt or use the existing one
    const useGeneratedPrompt = Math.round(Math.random());
    const prompt = useGeneratedPrompt
      ? await promptService.generatePrompt(systemContent, userContent)
      : randomPrompt;

    console.log(
      useGeneratedPrompt
        ? `Generated Prompt: ${prompt}`
        : `Using Random Prompt: ${prompt}`
    );

    // const prompt =
    //   "Act like a professional painter throughout time and recreate some of the best works of art, or create something new inspired by famous works of art. The output should only be the artwork so it can be prominently displayed on a digital monitor for all to see.";

    // Generate the image
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: `${prompt}\nIf the image includes people or animals, ensure their eyes, faces, and bodies are realistically proportioned and free from distortions, maintaining a natural and cohesive appearance.`,
      n: 1,
      size: "1792x1024",
    });

    const imageUrl = response.data[0]?.url;
    if (!imageUrl) throw new Error("Image generation returned an empty URL.");

    // Determine file paths
    const { dirPath, dateStr } = fileUtils.getTodayDirectory(
      FILE_PATHS.archive
    );
    const { imgFileName, imgFilePath } = fileUtils.getNextImageFilePath(
      dirPath,
      dateStr
    );

    console.log("Image URL:", imageUrl);
    console.log("FILE_PATHS.dailyArt:", FILE_PATHS.dailyArt);
    console.log("imgFilePath:", imgFilePath);

    // Save the image
    const imageResponse = await axios({
      url: imageUrl,
      method: "GET",
      responseType: "stream",
    });

    const fileDestinations = [
      { filePath: FILE_PATHS.dailyArt },
      { filePath: imgFilePath },
    ];

    await fileUtils.saveToMultipleDestinations(
      imageResponse.data,
      fileDestinations
    );

    // Update the prompt file
    const promptFileName = "prompts.txt";
    const promptFilePath = path.join(dirPath, promptFileName);
    const promptEntry = `${imgFileName}: ${prompt}\n`;

    fs.appendFileSync(promptFilePath, promptEntry, "utf8");
    console.log(`Appended prompt to file: ${promptFilePath}`);
  } catch (error) {
    console.error("Error fetching image:", error);
  }
}

export default {
  fetchImage,
};
