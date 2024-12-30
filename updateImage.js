import dotenv from "dotenv";
import OpenAI from "openai";
import axios from "axios";
import cron from 'node-cron';
import fs from "fs";
import { once } from "events";

dotenv.config();

// Initialize OpenAI API
const apiKey = process.env.API_KEY;
if (!apiKey) {
  console.error("Error: API key is missing. Check your .env file.");
  process.exit(1); // Exit the process if API key is missing
}
const openai = new OpenAI({ apiKey });

// File paths
const FILE_PATHS = {
  systemRole: "./role_system.txt",
  userRole: "./role_user.txt",
  prompts: "./prompts.txt",
};

// Utility to read file content into an array
function readFileToArray(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`Error: File not found at path: ${filePath}`);
    return [];
  }

  try {
    const data = fs.readFileSync(filePath, "utf8");
    return data
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0); // Exclude empty lines
  } catch (error) {
    console.error(`Error reading file at ${filePath}:`, error);
    return [];
  }
}

// Get a random value from an array
function getRandomValue(array) {
  if (!Array.isArray(array) || array.length === 0) {
    console.warn(
      "Warning: Attempted to get a random value from an empty array."
    );
    return null;
  }
  const randomIndex = Math.floor(Math.random() * array.length);
  return array[randomIndex];
}

// Save streamed image to file
async function saveImageToFile(writer, filePath) {
  try {
    await once(writer, "finish");
    console.log(`Image successfully saved to ${filePath}`);
    return filePath;
  } catch (error) {
    console.error("Error saving the image:", error);
    throw error;
  }
}

// Generate a creative prompt using OpenAI Chat API
async function generatePrompt(systemContent, userContent) {
  if (!systemContent || !userContent) {
    throw new Error(
      "System or user content is missing for generating a prompt."
    );
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // Use the GPT-4 model
      messages: [
        { role: "system", content: systemContent },
        { role: "user", content: userContent },
      ],
      temperature: 0.7,
    });

    const fullResponse = response.choices[0]?.message?.content?.trim();
    if (!fullResponse)
      throw new Error("Prompt generation returned an empty response.");

    const promptMatch = fullResponse.match(/Prompt:\s*([\s\S]*)/i);
    return promptMatch ? promptMatch[1].trim() : fullResponse;
  } catch (error) {
    console.error("Error generating prompt:", error);
    throw error;
  }
}

// Fetch and save an image based on a generated or random prompt
async function fetchImage() {
  try {
    const systemRoleArr = readFileToArray(FILE_PATHS.systemRole);
    const userRoleArr = readFileToArray(FILE_PATHS.userRole);
    const promptArr = readFileToArray(FILE_PATHS.prompts);

    const systemContent = getRandomValue(systemRoleArr);
    const userContent = getRandomValue(userRoleArr);
    const randPromptVal = getRandomValue(promptArr);

    if (!systemContent || !userContent || !randPromptVal) {
      throw new Error("Insufficient data to proceed.");
    }

    console.log(`\nSystem Content: ${systemContent}`);
    console.log(`User Content: ${userContent}`);
    console.log(`Random Prompt: ${randPromptVal}\n`);

    // Decide whether to generate a new prompt or use the existing one
    const useGeneratedPrompt = Math.round(Math.random());
    const prompt = useGeneratedPrompt
      ? await generatePrompt(systemContent, userContent)
      : randPromptVal;
    
    console.log(
      useGeneratedPrompt
        ? `Generated Prompt: ${prompt}`
        : `Using Random Prompt: ${prompt}`
    );

    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: `${prompt}\nIf the image includes people or animals, ensure their eyes, faces, and bodies are realistically proportioned and free from distortions, maintaining a natural and cohesive appearance.`,
      n: 1,
      size: "1792x1024",
    });

    const imageUrl = response.data[0]?.url;
    if (!imageUrl) throw new Error("Image generation returned an empty URL.");

    console.log("Image URL:", imageUrl);

    const imageResponse = await axios({
      url: imageUrl,
      method: "GET",
      responseType: "stream",
    });

    const filePath = "./daily_art.png";
    const writer = fs.createWriteStream(filePath);
    imageResponse.data.pipe(writer);

    await saveImageToFile(writer, filePath);
    return filePath;
  } catch (error) {
    console.error("Error fetching image:", error);
  }
}

cron.schedule('*/5 * * * *', async () => {
  console.log('Fetching a new image...\n');
  
  // Start Time
  const startTime = performance.now();
  
  // Run the process
  fetchImage();
  
  // End Time
  const endTime = performance.now();
  const executionTime = `Execution Time: ${(endTime - startTime).toFixed(2)}ms\n`;
  
  // Log to file
  fs.appendFileSync(`execution_time.log`, executionTime, 'utf8');

});
