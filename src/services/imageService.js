import axios from "axios";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import openai from "../api/openai.js";
import fileUtils from "../utils/fileUtils.js";
import * as promptService from "./promptService.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Fetches and saves a daily digital art image using DALL-E.
 * Randomly chooses between a generated prompt or a pre-defined one.
 * @throws {Error} If image generation or file operations fail.
 */
async function fetchImage() {
  try {
    const useGeneratedPrompt = Math.random() > 0.5;

    const prompt = useGeneratedPrompt
      ? await promptService.generatePrompt(
          fileUtils.getRandomSystemContent(),
          fileUtils.getRandomUserContent()
        )
      : fileUtils.getRandomUserGeneratedPrompt();

    if (!prompt) {
      throw new Error("Insufficient data to proceed.");
    }

    console.log(
      useGeneratedPrompt
        ? `Generated Prompt: ${prompt}`
        : `Using Random Prompt: ${prompt}`
    );

    // Generate the image with DALL-E 3
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

    // Download the image
    const imageResponse = await axios({
      url: imageUrl,
      method: "GET",
      responseType: "stream",
    });

    const fileDestinations = [
      { filePath: path.resolve(__dirname, "../daily_art.png") },
      { filePath: imgFilePath },
    ];

    await fileUtils.saveToMultipleDestinations(
      imageResponse.data,
      fileDestinations
    );

    // Record the prompt with the image
    const promptFileName = "prompts.txt";
    const promptFilePath = path.join(dirPath, promptFileName);
    const promptEntry = `${imgFileName}: ${prompt}\n`;

    fs.appendFileSync(promptFilePath, promptEntry, "utf8");
    console.log(`Appended prompt to file: ${promptFilePath}`);
  } catch (error) {
    console.error("Error fetching image:", error);
    throw error;
  }
}

export default {
  fetchImage,
};
