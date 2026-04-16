import axios from "axios";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import openai from "../api/openai.js";
import * as promptService from "./promptService.js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey)
    : null;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DAILY_ART_PATH = path.resolve(__dirname, "../daily_art.png");

/**
 * Generates a new image, saves it as daily_art.png, and uploads to Supabase.
 * @param {string|null} overridePrompt - Optional prompt (e.g. from SMS), skips random selection.
 */
async function fetchImage(overridePrompt = null) {
  try {
    let prompt;

    if (overridePrompt) {
      prompt = overridePrompt;
      console.log(`SMS Override Prompt: ${prompt}`);
    } else {
      prompt = await promptService.generatePrompt();
    }

    if (!prompt) throw new Error("Insufficient data to proceed.");

    // Generate the image with DALL-E 3
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: `${prompt}\nIf the image includes people or animals, ensure their eyes, faces, and bodies are realistically proportioned and free from distortions, maintaining a natural and cohesive appearance.`,
      n: 1,
      size: "1792x1024",
    });

    const imageUrl = response.data[0]?.url;
    if (!imageUrl) throw new Error("Image generation returned an empty URL.");

    const revisedPrompt = response.data[0]?.revised_prompt || prompt;
    const description = await promptService.generateDescription(revisedPrompt);
    console.log(`Description: ${description}`);

    // Download image as a buffer
    const imageResponse = await axios({ url: imageUrl, method: "GET", responseType: "arraybuffer" });
    const imageBuffer = Buffer.from(imageResponse.data);

    // Save to daily_art.png for the display frame
    fs.writeFileSync(DAILY_ART_PATH, imageBuffer);
    console.log(`Saved daily_art.png`);

    // Upload to Supabase Storage and record metadata
    if (supabase) {
      await uploadToSupabase({ imageBuffer, prompt, description, overridePrompt });
    } else {
      console.warn("Supabase not configured — skipping cloud upload.");
    }
  } catch (error) {
    console.error("Error fetching image:", error);
    throw error;
  }
}

/**
 * Uploads the image buffer to Supabase Storage and inserts a metadata row.
 * @param {object} opts
 * @param {Buffer}      opts.imageBuffer    - The raw image bytes
 * @param {string}      opts.prompt         - The prompt used to generate the image
 * @param {string}      opts.description    - Short AI-generated gallery description
 * @param {string|null} opts.overridePrompt - Original SMS override, if any
 */
async function uploadToSupabase({ imageBuffer, prompt, description, overridePrompt }) {
  try {
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0].replace(/-/g, "");
    const year = dateStr.slice(0, 4);
    const month = dateStr.slice(4, 6);
    const imgFileName = `${dateStr}_${Date.now()}.png`;
    const storagePath = `${year}/${month}/${imgFileName}`;

    const { error: uploadError } = await supabase.storage
      .from("art-images")
      .upload(storagePath, imageBuffer, {
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
      description: description || null,
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
