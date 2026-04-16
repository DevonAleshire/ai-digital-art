import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import openai from "../api/openai.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROMPTS_FILE = path.resolve(__dirname, "../prompts/prompts.txt");

/**
 * Returns true if prompts.txt has at least one non-empty line.
 */
function hasQueuedPrompts() {
  if (!fs.existsSync(PROMPTS_FILE)) return false;
  const lines = fs.readFileSync(PROMPTS_FILE, "utf-8").split("\n");
  return lines.some((l) => l.trim().length > 0);
}

/**
 * Reads prompts.txt and returns the first prompt, removing it from the file.
 * Returns null if the file is empty or does not exist.
 */
function dequeuePrompt() {
  if (!fs.existsSync(PROMPTS_FILE)) return null;
  const lines = fs.readFileSync(PROMPTS_FILE, "utf-8").split("\n");
  const firstNonEmpty = lines.findIndex((l) => l.trim().length > 0);
  if (firstNonEmpty === -1) return null;
  const prompt = lines[firstNonEmpty].trim();
  const remaining = lines.slice(firstNonEmpty + 1);
  fs.writeFileSync(PROMPTS_FILE, remaining.join("\n"), "utf-8");
  console.log(`[promptService] Using queued prompt: "${prompt}"`);
  return prompt;
}

const SYSTEM_CONTENT =
  "You are a creative director for a digital art gallery. Generate prompts for AI image generation that produce results worthy of display as wall art. Output should be visually striking, compositionally strong, and aesthetically intentional — spanning fine art, photography, abstraction, and occasionally whimsical or playful themes. Always specify subject, artistic style, mood, and lighting or color palette. Be specific and avoid generic descriptions.";

const USER_CONTENT =
  "Generate a single image generation prompt for a digital art gallery display. The prompt should be vivid, specific, and describe a scene that would make compelling wall art. Output only the prompt text, nothing else.";

// Weighted categories — higher weight = appears more often.
// Total weight = 100 for easy reasoning about percentages.
const CATEGORIES = [
  // Fine art & photography (60%)
  { weight: 10, label: "oil painting landscape", hint: "classical oil painting landscape, rich colors, painterly brushwork, golden hour light" },
  { weight: 8,  label: "architectural photography", hint: "striking architectural composition, geometric forms, dramatic shadows, urban or monumental subject" },
  { weight: 8,  label: "abstract expressionism", hint: "bold abstract expressionist painting, dynamic brushstrokes, strong color contrast, emotional energy" },
  { weight: 8,  label: "portrait fine art", hint: "fine art portrait, dramatic chiaroscuro lighting, painterly style, strong composition" },
  { weight: 8,  label: "minimalist design", hint: "clean minimalist composition, geometric shapes, limited palette, strong negative space" },
  { weight: 8,  label: "nature photography", hint: "photorealistic nature scene, macro or landscape, stunning natural light, high detail" },
  { weight: 6,  label: "impressionist scene", hint: "impressionist style painting, loose brushwork, soft light, everyday scene elevated to fine art" },
  { weight: 4,  label: "art nouveau", hint: "art nouveau illustration, flowing organic lines, botanical motifs, decorative elegance" },

  // Surreal & creative (25%)
  { weight: 8,  label: "surrealist fine art", hint: "surrealist composition in the style of Magritte or Dalí, dreamlike but sophisticated, gallery-worthy" },
  { weight: 7,  label: "concept art", hint: "high-quality concept art, cinematic lighting, detailed world-building, professional digital painting" },
  { weight: 5,  label: "still life", hint: "classical or modern still life, carefully composed objects, painterly or photographic quality, beautiful lighting" },
  { weight: 5,  label: "street photography style", hint: "street photography aesthetic, candid urban moment, film grain, strong storytelling composition" },

  // Whimsical & playful (15%) — still in the mix, just less frequent
  { weight: 6,  label: "whimsical scene", hint: "charming whimsical scene, could include fairytale castles, cartoon animals, or magical worlds — fun and imaginative" },
  { weight: 5,  label: "fantasy landscape", hint: "fantasy or sci-fi landscape, imaginative world, cosmic or mythical elements allowed, beautiful and dramatic" },
  { weight: 4,  label: "playful digital art", hint: "fun and playful digital art, bright colors, could include cute animals or characters, joyful mood" },
];

function pickWeightedCategory() {
  const total = CATEGORIES.reduce((sum, c) => sum + c.weight, 0);
  let rand = Math.random() * total;
  for (const cat of CATEGORIES) {
    rand -= cat.weight;
    if (rand <= 0) return cat;
  }
  return CATEGORIES[0];
}

/**
 * Generates a creative art prompt using OpenAI Chat API.
 * @returns {Promise<string>} The generated prompt.
 * @throws {Error} If API call fails.
 */
export async function generatePrompt() {
  if (hasQueuedPrompts() && Math.random() < 0.5) {
    return dequeuePrompt();
  }

  const category = pickWeightedCategory();
  console.log(`[promptService] Generating via AI (category: ${category.label})`);
  const enrichedUser = `${USER_CONTENT}\n\nFor this image, focus on the following category: ${category.label}. Style guidance: ${category.hint}. Be specific — include subject, artistic style, mood, lighting, and color palette.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: SYSTEM_CONTENT },
        { role: "user", content: enrichedUser },
      ],
      temperature: 0.9,
    });

    const fullResponse = response.choices[0]?.message?.content?.trim();
    if (!fullResponse) {
      throw new Error("Prompt generation returned an empty response.");
    }

    // Extract prompt if it follows "Prompt: ..." format, otherwise return full response
    const promptMatch = fullResponse.match(/Prompt:\s*([\s\S]*)/i);
    return promptMatch ? promptMatch[1].trim() : fullResponse;
  } catch (error) {
    console.error("Error generating prompt:", error);
    throw error;
  }
}

/**
 * Generates a short one-sentence gallery description from DALL-E's revised prompt.
 * @param {string} revisedPrompt - The revised prompt returned by DALL-E 3.
 * @returns {Promise<string>} A 10–15 word description of the artwork.
 */
export async function generateDescription(revisedPrompt) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You write brief, evocative one-sentence descriptions of artworks for a gallery display. Be concise — 10 to 15 words maximum. No title prefix, just the description sentence.",
        },
        {
          role: "user",
          content: `Write a one-sentence description (10–15 words) of this artwork:\n\n${revisedPrompt}`,
        },
      ],
      max_tokens: 60,
      temperature: 0.7,
    });
    return response.choices[0]?.message?.content?.trim() ?? "";
  } catch (err) {
    console.error("Description generation failed:", err);
    return "";
  }
}
