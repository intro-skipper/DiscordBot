import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const KILO_API_KEY = process.env.KILO_API_KEY;
const ORGID = process.env.KILO_ORGID;
const KILO_API_URL = "https://api.kilo.ai/api/openrouter/chat/completions";
const KILO_MODELS_URL = "https://api.kilo.ai/api/openrouter/models";

// Path to persist the current model (use /data for Docker containers with volume mount)
const DATA_DIR = process.env.DATA_DIR ?? "/data";
const MODEL_CONFIG_PATH = join(DATA_DIR, "model-config.json");

// Default model from environment or fallback
const DEFAULT_MODEL = process.env.KILO_MODEL ?? "kilo-auto/free";

// Load persisted model or use default
function loadPersistedModel(): string {
  try {
    if (existsSync(MODEL_CONFIG_PATH)) {
      const data = readFileSync(MODEL_CONFIG_PATH, "utf-8");
      const config = JSON.parse(data);
      if (config.currentModel && typeof config.currentModel === "string") {
        console.log(`🤖 Loaded persisted model: ${config.currentModel}`);
        return config.currentModel;
      }
    }
  } catch (error) {
    console.warn("Failed to load persisted model, using default:", error);
  }
  return DEFAULT_MODEL;
}

// Save model to persistent storage
function persistModel(model: string): void {
  try {
    writeFileSync(MODEL_CONFIG_PATH, JSON.stringify({ currentModel: model }, null, 2));
  } catch (error) {
    console.error("Failed to persist model:", error);
  }
}

// Current model (can be changed at runtime, persisted across restarts)
let currentModel = loadPersistedModel();

// Fallback models (ordered by preference)
const CHEAP_FALLBACK_MODELS = [
  "google/gemini-3-flash-preview",
];

// Stable identifier for this bot instance — used for prompt cache affinity.
// All conversations share the same FAQ/system prompt, so a single task ID
// lets the provider cache that prefix and reuse it across requests.
const BOT_TASK_ID = "intro-skipper-support-bot";

import { X_KILOCODE_ORGANIZATIONID, X_KILOCODE_PROJECTID, X_KILOCODE_TASKID, X_TITLE } from "./headers";
import { getSupportedVersions, formatSupportedVersions } from "./versions";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface KiloUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost?: number;
  prompt_tokens_details?: { cached_tokens: number };
}

interface KiloResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
  model?: string;
  usage?: KiloUsage;
}

export interface FAQResult {
  answer: string;
  model: string;
  cost: number;
  tokens: {
    prompt: number;
    completion: number;
    total: number;
    cached: number;
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

async function makeRequest(
  model: string,
  systemPrompt: string,
  history: ChatMessage[]
): Promise<Response> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${KILO_API_KEY}`,
    "Content-Type": "application/json",
    [X_KILOCODE_PROJECTID]: "https://github.com/intro-skipper/DiscordBot.git",
    [X_TITLE]: "Intro Skipper Support Bot",
    // Enable prompt caching: the server hashes this with the user ID
    // to create a prompt_cache_key, which tells the provider to reuse
    // the cached system prompt prefix across requests.
    [X_KILOCODE_TASKID]: BOT_TASK_ID,
  };

  // Add organization ID header if ORGID environment variable exists
  if (ORGID) {
    headers[X_KILOCODE_ORGANIZATIONID] = ORGID;
  }

  return fetch(KILO_API_URL, {
    method: "POST",
    headers,
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

function formatCost(cost: number): string {
  if (cost === 0) return "free";
  if (cost < 0.0001) return `$${cost.toFixed(6)}`;
  if (cost < 0.01) return `$${cost.toFixed(4)}`;
  return `$${cost.toFixed(4)}`;
}

export async function askFAQ(
  faqContent: string,
  userQuestion: string,
  conversationId?: string
): Promise<FAQResult> {
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

  // Try the configured primary model
  let response = await makeRequest(currentModel, systemPrompt, recentHistory);

  // If primary model fails, try fallback models
  if (!response.ok) {
    for (const fallbackModel of CHEAP_FALLBACK_MODELS) {
      console.warn(
        `Model ${currentModel} failed (${response.status}), trying fallback: ${fallbackModel}`
      );
      response = await makeRequest(fallbackModel, systemPrompt, recentHistory);

      if (response.ok) {
        console.log(`Success with fallback model: ${fallbackModel}`);
        break;
      }

      console.warn(`Fallback model ${fallbackModel} failed (${response.status})`);
    }
  }

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Kilo API error: ${response.status} - ${error}`);
  }

  const data = (await response.json()) as KiloResponse;
  const answer =
    data.choices[0]?.message?.content ?? "Sorry, I couldn't generate a response.";

  // Extract usage/cost info
  const usage = data.usage;
  const result: FAQResult = {
    answer,
    model: data.model ?? "unknown",
    cost: usage?.cost ?? 0,
    tokens: {
      prompt: usage?.prompt_tokens ?? 0,
      completion: usage?.completion_tokens ?? 0,
      total: usage?.total_tokens ?? 0,
      cached: usage?.prompt_tokens_details?.cached_tokens ?? 0,
    },
  };

  // Save assistant response to history
  if (conversationId) {
    history.push({ role: "assistant", content: answer });
    conversationHistory.set(conversationId, history.slice(-MAX_HISTORY_MESSAGES));
  }

  return result;
}

export { formatCost };

// Export function to clear a conversation
export function clearConversation(conversationId: string): void {
  conversationHistory.delete(conversationId);
  conversationTimestamps.delete(conversationId);
}

// Model management
export interface ModelInfo {
  id: string;
  name: string;
  context_length?: number;
  pricing?: {
    prompt?: number;
    completion?: number;
  };
}

interface KiloModelsResponse {
  data: Array<{
    id: string;
    name?: string;
    context_length?: number;
    pricing?: {
      prompt?: number;
      completion?: number;
    };
    architecture?: {
      modality?: string;
      input_modalities?: string[];
      output_modalities?: string[];
      tokenizer?: string;
      instruct_type?: string;
    };
  }>;
}

// Fetch available models from Kilo Code API (text-only models)
export async function getAvailableModels(): Promise<ModelInfo[]> {

  const response = await fetch(KILO_MODELS_URL);

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch models: ${response.status} - ${error}`);
  }

  const data = (await response.json()) as KiloModelsResponse;

  // Filter out image models - only keep text models
  // Check output_modalities: only include models that output text
  return data.data
    .filter((model) => {
      const outputModalities = model.architecture?.output_modalities ?? [];
      
      // Only include models that have "text" as output modality
      // This excludes image generation models that output "image"
      if (!outputModalities.includes("text")) return false;
      
      // Exclude models that output images
      if (outputModalities.includes("image")) return false;
      
      return true;
    })
    .map((model) => ({
      id: model.id,
      name: model.name ?? model.id,
      context_length: model.context_length,
      pricing: model.pricing,
    }));
}

// Get the current model
export function getCurrentModel(): string {
  return currentModel;
}

// Set the current model (persists across restarts)
export function setCurrentModel(model: string): void {
  currentModel = model;
  persistModel(model);
  console.log(`🤖 Model changed to: ${model}`);
}
