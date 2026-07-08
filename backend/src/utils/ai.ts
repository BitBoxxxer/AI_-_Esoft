export interface AIChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

const AI_BASE_URL = process.env.AI_BASE_URL || "http://127.0.0.1:11434/v1/chat/completions";
const AI_MODEL = process.env.AI_MODEL || "llama3.1:8b";

export async function generateAIResponse(
  messages: AIChatMessage[],
  model = AI_MODEL
) {
  const response = await fetch(AI_BASE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 500,
      stream: false,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`AI API error: ${error}`);
  }

  const data = await response.json();
  return data.choices[0].message.content as string;
}
