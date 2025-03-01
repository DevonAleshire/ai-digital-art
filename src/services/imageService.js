import fs from "fs";
import axios from "axios";
import path from "path";
import openai from "../api/openai.js";
import fileUtils from "../utils/fileUtils.js";
import * as promptService from "./promptService.js";

// Fetch and save an image based on a generated or random prompt
async function fetchImage() {
  try {
    // Decide whether to generate a new prompt or use the existing one
    const useGeneratedPrompt = Math.round(Math.random());

    const prompt = useGeneratedPrompt
      ? await promptService.generatePrompt(
          fileUtils.getRandomSystemContent(),
          fileUtils.getRandomUserContent()
        )
      : fileUtils.getRandomUserGeneratedPrompt();

    //const systemContent = generalUtils.getRandomValue(config.sysRoleContent);
    //const userContent = generalUtils.getRandomValue(config.userRoleContent);
    //const randomPrompt = generalUtils.getRandomValue(config.userGenPrompts);

    if (!prompt) {
      throw new Error("Insufficient data to proceed.");
    }

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
    const { dirPath, dateStr } = fileUtils.getTodayDirectory();
    const { imgFileName, imgFilePath } = fileUtils.getNextImageFilePath(
      dirPath,
      dateStr
    );

    console.log("Image URL:", imageUrl);
    console.log("FILE_PATHS.dailyArt:", "src/daily_art.png");
    console.log("imgFilePath:", imgFilePath);

    // Save the image
    const imageResponse = await axios({
      url: imageUrl,
      method: "GET",
      responseType: "stream",
    });

    const fileDestinations = [
      { filePath: "src/daily_art.png"}, //FILE_PATHS.dailyArt },
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
