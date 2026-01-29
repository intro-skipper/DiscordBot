const KILO_API_KEY = process.env.KILO_API_KEY;
const KILO_API_URL = "https://api.kilo.ai/api/openrouter/chat/completions";
const KILO_MODELS_URL = "https://api.kilo.ai/api/openrouter/models";
const KILO_MODEL = process.env.KILO_MODEL ?? "minimax/minimax-m2.1:free";

import { getSupportedVersions, formatSupportedVersions } from "./versions";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface KiloResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
}

interface KiloModel {
  id: string;
  name: string;
}

interface KiloModelWithPricing extends KiloModel {
  pricing?: {
    prompt: string;
    completion: string;
  };
}

// Conversation history storage (channelId/uniqueId -> messages)
const conversationHistory = new Map<string, ChatMessage[]>();
const HISTORY_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes
const MAX_HISTORY_MESSAGES = 10;

// Track when conversations were last active
const conversationTimestamps = new Map<string, number>();

// Clean up old conversations periodically
function cleanupOldConversations() {
  const now = Date.now();
  for (const [id, timestamp] of conversationTimestamps) {
    if (now - timestamp > HISTORY_EXPIRY_MS) {
      conversationHistory.delete(id);
      conversationTimestamps.delete(id);
    }
  }
}

// Run cleanup every 10 minutes
setInterval(cleanupOldConversations, 10 * 60 * 1000);

async function getFreeModel(): Promise<string | null> {
  try {
    const response = await fetch(KILO_MODELS_URL, {
      headers: {
        Authorization: `Bearer ${KILO_API_KEY}`,
      },
    });

    if (!response.ok) return null;

    const data = (await response.json()) as { data: KiloModelWithPricing[] };
    const models = data.data ?? [];

    // First, try to find a model ending with :free
    const freeModel = models.find((model) => model.id.endsWith(":free"));
    if (freeModel) return freeModel.id;

    // Fallback: find a model with zero pricing
    const zeroPricingModel = models.find(
      (model) =>
        model.pricing &&
        parseFloat(model.pricing.prompt) === 0 &&
        parseFloat(model.pricing.completion) === 0
    );
    return zeroPricingModel?.id ?? null;
  } catch {
    return null;
  }
}

async function makeRequest(
  model: string,
  systemPrompt: string,
  history: ChatMessage[]
): Promise<Response> {
  return fetch(KILO_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${KILO_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://github.com/intro-skipper/intro-skipper",
      "X-Title": "Intro Skipper Support Bot",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        ...history,
      ],
      temperature: 0.1,
      max_tokens: 500,
    }),
  });
}

export async function askFAQ(
  faqContent: string,
  userQuestion: string,
  conversationId?: string
): Promise<string> {
  if (!KILO_API_KEY) {
    throw new Error("KILO_API_KEY is not set in environment variables");
  }

  // Fetch current supported versions
  const versions = await getSupportedVersions();
  const versionInfo = formatSupportedVersions(versions);

  const systemPrompt = `You are a helpful support assistant for Intro Skipper, a Jellyfin plugin that automatically detects and skips intro/credit sequences. Your job is to answer user questions using ONLY the FAQ information and version data provided below.

RULES:
1. Answer questions based ONLY on the FAQ content and version data provided
2. If the FAQ contains a relevant answer, provide it in a friendly, concise way
3. When answering questions about supported versions, requirements, or compatibility, ALWAYS include the specific version information from SUPPORTED VERSIONS below
4. If no FAQ matches the question, respond with: "I don't have information about that in my FAQ. Please check the wiki at https://github.com/intro-skipper/intro-skipper/wiki or ask in <#1308018820618649630>"
5. Do NOT make up information that isn't in the FAQ or version data
6. Keep responses concise and helpful
7. Use Discord-friendly formatting (markdown works)
8. When mentioning the support channel, ALWAYS use the exact format <#1308018820618649630> - never say "support channel" or any other variation
9. You can reference previous messages in the conversation to provide context-aware follow-up answers

SUPPORTED VERSIONS (LIVE DATA):
${versionInfo}

FAQ CONTENT:
${faqContent}`;

  // Get or create conversation history
  let history: ChatMessage[] = [];
  if (conversationId) {
    history = conversationHistory.get(conversationId) ?? [];
    conversationTimestamps.set(conversationId, Date.now());
  }

  // Add current question
  history.push({ role: "user", content: userQuestion });

  // Keep only recent messages to avoid token limits
  const recentHistory = history.slice(-MAX_HISTORY_MESSAGES);

  let response = await makeRequest(KILO_MODEL, systemPrompt, recentHistory);

  // If the model fails, try to find a free model
  if (!response.ok) {
    console.warn(`Model ${KILO_MODEL} failed, searching for free model...`);
    const freeModel = await getFreeModel();

    if (freeModel) {
      console.log(`Retrying with free model: ${freeModel}`);
      response = await makeRequest(freeModel, systemPrompt, recentHistory);
    }
  }

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Kilo API error: ${response.status} - ${error}`);
  }

  const data = (await response.json()) as KiloResponse;
  const answer = data.choices[0]?.message?.content ?? "Sorry, I couldn't generate a response.";

  // Save assistant response to history
  if (conversationId) {
    history.push({ role: "assistant", content: answer });
    conversationHistory.set(conversationId, history.slice(-MAX_HISTORY_MESSAGES));
  }

  return answer;
}

// Export function to clear a conversation
export function clearConversation(conversationId: string): void {
  conversationHistory.delete(conversationId);
  conversationTimestamps.delete(conversationId);
}
