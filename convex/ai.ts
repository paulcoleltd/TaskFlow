"use node";
/**
 * AI actions — powered by Claude via @anthropic-ai/sdk.
 * These actions run in the Node.js runtime so they can use the SDK.
 *
 * Usage (from client):
 *   const suggest = useAction(api.ai.suggestSubtasks);
 *   const titles  = await suggest({ title, description });
 *
 *   const improve = useAction(api.ai.improveDescription);
 *   const text    = await improve({ title, description });
 */
import { action } from "./_generated/server";
import { v } from "convex/values";
import Anthropic from "@anthropic-ai/sdk";

function getClient() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY is not set");
  return new Anthropic({ apiKey: key });
}

export const suggestSubtasks = action({
  args: {
    title:       v.string(),
    description: v.optional(v.string()),
  },
  handler: async (_ctx, { title, description }): Promise<string[]> => {
    const client = getClient();
    const prompt = [
      `Task title: ${title}`,
      description ? `Description: ${description}` : null,
      "",
      "Suggest 3–5 concise, actionable subtask titles for this task.",
      "Return ONLY a JSON array of strings, no prose, no markdown fences.",
      "Example: [\"Research options\",\"Draft proposal\",\"Review with team\"]",
    ].filter(Boolean).join("\n");

    const msg = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 256,
      messages: [{ role: "user", content: prompt }],
    });

    const text = msg.content.find(b => b.type === "text")?.text ?? "[]";
    try {
      const parsed = JSON.parse(text.trim());
      if (Array.isArray(parsed)) return parsed.slice(0, 5).map(String);
    } catch {
      // fall through to empty array
    }
    return [];
  },
});

export const improveDescription = action({
  args: {
    title:       v.string(),
    description: v.optional(v.string()),
  },
  handler: async (_ctx, { title, description }): Promise<string> => {
    const client = getClient();
    const prompt = [
      `Task title: ${title}`,
      description ? `Current description: ${description}` : null,
      "",
      "Write a clear, concise task description (2–4 sentences) that explains",
      "what needs to be done, why it matters, and any key acceptance criteria.",
      "Return ONLY the description text — no headers, no bullet points.",
    ].filter(Boolean).join("\n");

    const msg = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      messages: [{ role: "user", content: prompt }],
    });

    return msg.content.find(b => b.type === "text")?.text?.trim() ?? "";
  },
});
