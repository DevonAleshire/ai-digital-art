import openai from "../api/openai.js";

/**
 * Generates a creative art prompt using OpenAI Chat API.
 * @param {string} systemContent - System role content to guide the prompt generation.
 * @param {string} userContent - User instructions for the prompt.
 * @returns {Promise<string>} The generated prompt.
 * @throws {Error} If content is missing or API call fails.
 */
export async function generatePrompt(systemContent, userContent) {
  if (!systemContent || !userContent) {
    throw new Error(
      "System or user content is missing for generating a prompt."
    );
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemContent },
        { role: "user", content: userContent },
      ],
      temperature: 0.7,
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
