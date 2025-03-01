import openai from "../api/openai.js";

// Generate a creative prompt using OpenAI Chat API
export async function generatePrompt(systemContent, userContent) {
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
