import dotenv from "dotenv";
import OpenAI from "openai";
dotenv.config();

// Initialize OpenAI API
const apiKey = process.env.API_KEY;
if (!apiKey) {
  console.error("Error: API key is missing. Check your .env file.");
  process.exit(1); // Exit the process if API key is missing
}
const openai = new OpenAI({ apiKey });

export default openai;