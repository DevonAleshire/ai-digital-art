import OpenAI from "openai";

const apiKey = process.env.API_KEY;
if (!apiKey) {
  throw new Error("API_KEY environment variable is not set");
}

const openai = new OpenAI({ apiKey });

export default openai;