import OpenAI from "openai";

export function getLlmClient() {
  return new OpenAI({
    baseURL: process.env.LLM_BASE_URL,
    apiKey: process.env.LLM_API_KEY,
  });
}

export const LLM_MODEL = process.env.LLM_MODEL ?? "openrouter/free";

export async function askYesNo(question: string, input?: string): Promise<"YES" | "NO"> {
  const client = getLlmClient();
  const userContent = input?.trim()
    ? `Scenario:\n"""\n${input.trim()}\n"""\n\nQuestion about the scenario above: ${question}`
    : question;

  const completion = await client.chat.completions.create({
    model: LLM_MODEL,
    messages: [
      {
        role: "system",
        content:
          'Answer the question with a single word: YES or NO. Output nothing else — no punctuation, no explanation, no reasoning.\nExample — Question: "Is water wet?" Answer: YES',
      },
      { role: "user", content: userContent },
    ],
    temperature: 0,
    // Some free-tier models "think out loud" before answering, so we give
    // them room to finish and then take the last YES/NO in the output,
    // instead of truncating mid-thought.
    max_tokens: 300,
  });

  const raw = completion.choices[0]?.message?.content?.trim().toUpperCase() ?? "";
  const matches = raw.match(/\b(YES|NO)\b/g);
  const answer = matches?.[matches.length - 1];
  if (answer === "YES" || answer === "NO") return answer;
  throw new Error(`Model did not return YES or NO (got: "${raw.slice(0, 200)}")`);
}
