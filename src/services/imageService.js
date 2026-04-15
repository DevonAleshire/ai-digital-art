import axios from "axios";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import openai from "../api/openai.js";
import fileUtils from "../utils/fileUtils.js";
import * as promptService from "./promptService.js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey)
    : null;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Fetches and saves a daily digital art image using DALL-E.
 * Randomly chooses between a generated prompt or a pre-defined one,
 * unless an override prompt is provided (e.g. from an SMS).
 * @param {string|null} overridePrompt - Optional prompt to use directly, skipping random selection.
 * @throws {Error} If image generation or file operations fail.
 */
async function fetchImage(overridePrompt = null) {
  try {
    let prompt;

    if (overridePrompt) {
      prompt = overridePrompt;
      console.log(`SMS Override Prompt: ${prompt}`);
    } else {
      const useGeneratedPrompt = Math.random() > 0.5;
      prompt = useGeneratedPrompt
        ? await promptService.generatePrompt(
            fileUtils.getRandomSystemContent(),
            fileUtils.getRandomUserContent()
          )
        : fileUtils.getRandomUserGeneratedPrompt();

      console.log(
        useGeneratedPrompt
          ? `Generated Prompt: ${prompt}`
          : `Using Random Prompt: ${prompt}`
      );
    }

    if (!prompt) {
      throw new Error("Insufficient data to proceed.");
    }

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

    // Upload to Supabase Storage and record metadata
    if (supabase) {
      await uploadToSupabase({ imgFilePath, imgFileName, prompt, overridePrompt, dateStr });
    } else {
      console.warn("Supabase not configured — skipping cloud upload.");
    }
  } catch (error) {
    console.error("Error fetching image:", error);
    throw error;
  }
}

/**
 * Uploads a generated image to Supabase Storage and inserts a metadata row.
 * @param {object} opts
 * @param {string} opts.imgFilePath  - Local path to the saved PNG
 * @param {string} opts.imgFileName  - Base filename (e.g. 20260415_image_1.png)
 * @param {string} opts.prompt       - The prompt used to generate the image
 * @param {string|null} opts.overridePrompt - Original SMS override, if any
 * @param {string} opts.dateStr      - YYYYMMDD string used for path partitioning
 */
async function uploadToSupabase({ imgFilePath, imgFileName, prompt, overridePrompt, dateStr }) {
  try {
    const year = dateStr.slice(0, 4);
    const month = dateStr.slice(4, 6);
    const storagePath = `${year}/${month}/${imgFileName}`;

    const fileBuffer = fs.readFileSync(imgFilePath);
    const { error: uploadError } = await supabase.storage
      .from("art-images")
      .upload(storagePath, fileBuffer, {
        contentType: "image/png",
        upsert: false,
      });

    if (uploadError) {
      console.error("Supabase Storage upload error:", uploadError.message);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("art-images")
      .getPublicUrl(storagePath);

    const imageUrl = urlData?.publicUrl;
    if (!imageUrl) {
      console.error("Supabase Storage: could not retrieve public URL.");
      return;
    }

    const source = overridePrompt ? "sms" : "generated";
    const { error: insertError } = await supabase.from("images").insert({
      prompt,
      image_url: imageUrl,
      source,
      model: "dall-e-3",
    });

    if (insertError) {
      console.error("Supabase DB insert error:", insertError.message);
      return;
    }

    console.log(`Supabase: uploaded ${storagePath} and recorded metadata.`);
  } catch (err) {
    console.error("Supabase upload failed:", err);
  }
}

export default {
  fetchImage,
};
