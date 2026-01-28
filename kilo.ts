const KILO_API_KEY = process.env.KILO_API_KEY;
const KILO_API_URL = "https://api.kilo.ai/api/openrouter/chat/completions";
const KILO_MODEL = process.env.KILO_MODEL ?? "minimax/minimax-m2.1:free";

interface KiloResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
}

export async function askFAQ(faqContent: string, userQuestion: string): Promise<string> {
  if (!KILO_API_KEY) {
    throw new Error("KILO_API_KEY is not set in environment variables");
  }

  const systemPrompt = `You are a helpful support assistant for Intro Skipper, a Jellyfin plugin that automatically detects and skips intro/credit sequences. Your job is to answer user questions using ONLY the FAQ information provided below.

RULES:
1. Answer questions based ONLY on the FAQ content provided
2. If the FAQ contains a relevant answer, provide it in a friendly, concise way
3. If no FAQ matches the question, respond with: "I don't have information about that in my FAQ. Please check the wiki at https://github.com/intro-skipper/intro-skipper/wiki or ask in the Support Channel"
4. Do NOT make up information that isn't in the FAQ
5. Keep responses concise and helpful
6. Use Discord-friendly formatting (markdown works)

FAQ CONTENT:
${faqContent}`;

  const response = await fetch(KILO_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${KILO_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://github.com/intro-skipper/intro-skipper",
      "X-Title": "Intro Skipper Support Bot",
    },
    body: JSON.stringify({
      model: KILO_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userQuestion },
      ],
      temperature: 0.1, // Low temperature for consistent, factual responses
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Kilo API error: ${response.status} - ${error}`);
  }

  const data = (await response.json()) as KiloResponse;
  return data.choices[0]?.message?.content ?? "Sorry, I couldn't generate a response.";
}
