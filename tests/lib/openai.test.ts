import test from "node:test";
import assert from "node:assert/strict";

test("openai helpers do not explode when the API key is missing until used", async () => {
  const originalApiKey = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;

  try {
    const { getOpenAI, isOpenAIConfigured } = await import(
      "../../src/lib/openai.ts"
    );

    assert.equal(isOpenAIConfigured(), false);
    assert.throws(() => getOpenAI(), /OPENAI_API_KEY/);
  } finally {
    if (originalApiKey === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = originalApiKey;
    }
  }
});
