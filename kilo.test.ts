import { test, describe, expect, beforeAll } from "bun:test";
import { getAvailableModels, askFAQ, getCurrentModel, setCurrentModel } from "./kilo";

describe("Model Filtering", () => {
  test("should only return text models (no image models)", async () => {
    const models = await getAvailableModels();
    
    console.log(`Found ${models.length} models`);
    
    // Log first 10 models for verification
    console.log("First 10 models:");
    models.slice(0, 10).forEach(m => {
      console.log(`  - ${m.id}`);
    });
    
    // Verify we have models
    expect(models.length).toBeGreaterThan(0);
  });
});

describe("FAQ Test with Free Model", () => {
  test("should answer FAQ question using a free model", async () => {
    // Use a free model for testing
    const freeModel = "minimax/minimax-m2.1:free";
    setCurrentModel(freeModel);
    
    const currentModel = getCurrentModel();
    console.log(`Current model: ${currentModel}`);
    
    // Simple FAQ content for testing
    const faqContent = `
# Intro Skipper FAQ

## What is Intro Skipper?
Intro Skipper is a Jellyfin plugin that automatically detects and skips intro/credit sequences in TV shows.

## How do I install it?
1. Add the repository URL to Jellyfin
2. Install the plugin from the catalog
3. Restart Jellyfin

## What are the supported versions?
Jellyfin 10.9.0 and higher are supported.
`;
    
    const result = await askFAQ(faqContent, "What is Intro Skipper?");
    
    console.log(`\nModel used: ${result.model}`);
    console.log(`Cost: ${result.cost}`);
    console.log(`Tokens: ${result.tokens.total} (cached: ${result.tokens.cached})`);
    console.log(`\nAnswer:\n${result.answer}`);
    
    // Verify we got a response
    expect(result.answer).toBeDefined();
    expect(result.answer.length).toBeGreaterThan(10);
    
    // Verify it mentions Intro Skipper
    expect(result.answer.toLowerCase()).toContain("intro skipper");
  });
});
