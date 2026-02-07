const KILO_API_KEY = process.env.KILO_API_KEY;
const KILO_API_URL = "https://api.kilo.ai/api/openrouter/chat/completions";
const KILO_MODELS_URL = "https://api.kilo.ai/api/openrouter/models";

// Default model
const KILO_MODEL = process.env.KILO_MODEL ?? "anthropic/claude-haiku-4.5";

// Fallback models (ordered by preference)
const CHEAP_FALLBACK_MODELS = [
  "google/gemini-3-flash-preview",
];

// Stable identifier for this bot instance — used for prompt cache affinity.
// All conversations share the same FAQ/system prompt, so a single task ID
// lets the provider cache that prefix and reuse it across requests.
const BOT_TASK_ID = "intro-skipper-support-bot";

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
  preferredIndex?: number;
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

    // Find a model that:
    // 1. Ends with :free (Kilo's naming convention for free models)
    // 2. Has a preferredIndex (meaning Kilo has vetted/endorsed it)
    // 3. Has zero pricing
    // This avoids picking OpenRouter :free models that Kilo blocks
    const kiloFreeModel = models.find(
      (model) =>
        model.id.endsWith(":free") &&
        model.preferredIndex !== undefined &&
        model.pricing &&
        parseFloat(model.pricing.prompt) === 0 &&
        parseFloat(model.pricing.completion) === 0
    );
    if (kiloFreeModel) return kiloFreeModel.id;

    // Fallback: any model ending with :free that has zero pricing
    const freeModel = models.find(
      (model) =>
        model.id.endsWith(":free") &&
        model.pricing &&
        parseFloat(model.pricing.prompt) === 0 &&
        parseFloat(model.pricing.completion) === 0
    );
    return freeModel?.id ?? null;
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
      // Enable prompt caching: the server hashes this with the user ID
      // to create a prompt_cache_key, which tells the provider to reuse
      // the cached system prompt prefix across requests.
      "X-KiloCode-TaskId": BOT_TASK_ID,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        ...history,
      ],
      temperature: 0.1, // Low for factual accuracy
      max_tokens: 800, // Adjust based on desired summary length
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
7. Use Discord-friendly formatting: bold, italic, code blocks, and bullet lists work. NEVER use markdown tables - Discord does not render them. Use bullet points or plain text instead.
8. When mentioning the support channel, ALWAYS use the exact format <#1308018820618649630> - never say "support channel" or any other variation
9. You can reference previous messages in the conversation to provide context-aware follow-up answers
10. NEVER suggest users try accessing the manifest URL (https://intro-skipper.org/manifest.json) directly in a browser - it will not work because the server requires a Jellyfin server user agent. Only Jellyfin servers can fetch the manifest.
11. When sharing URLs, put them in inline code using backticks (e.g., \`https://github.com/...\`) - do NOT use markdown link syntax like [text](url) as it will break in Discord.

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

  // Tier 1: Try the configured model (default: free)
  let response = await makeRequest(KILO_MODEL, systemPrompt, recentHistory);

  // Tier 2: If configured model fails, try to find any free model
  if (!response.ok) {
    console.warn(
      `Model ${KILO_MODEL} failed (${response.status}), searching for free model...`
    );
    const freeModel = await getFreeModel();

    if (freeModel) {
      console.log(`Retrying with free model: ${freeModel}`);
      response = await makeRequest(freeModel, systemPrompt, recentHistory);
    }
  }

  // Tier 3: If no free model works, try cheap paid models
  if (!response.ok) {
    for (const cheapModel of CHEAP_FALLBACK_MODELS) {
      console.warn(
        `Free models unavailable, trying cheap paid model: ${cheapModel}`
      );
      response = await makeRequest(cheapModel, systemPrompt, recentHistory);

      if (response.ok) {
        console.log(`Success with cheap paid model: ${cheapModel}`);
        break;
      }

      console.warn(`Cheap model ${cheapModel} failed (${response.status})`);
    }
  }

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Kilo API error: ${response.status} - ${error}`);
  }

  const data = (await response.json()) as KiloResponse;
  const answer =
    data.choices[0]?.message?.content ?? "Sorry, I couldn't generate a response.";

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
