import { env } from "../../config/env.ts";
import type { AiProvider, GenerateReplyInput, GenerateReplyOutput } from "../types.ts";

// Custom sleep function that supports AbortSignal cancellation

const sleep = (ms: number, signal?: AbortSignal): Promise<void> =>
  new Promise((resolve, reject) => {
    if (ms <= 0) return resolve();
    const t = setTimeout(() => resolve(), ms);
    
    if (signal) {
      if (signal.aborted) {
        clearTimeout(t);
        return reject(new Error("aborted"));
      }
      signal.addEventListener(
        "abort",
        () => {
          clearTimeout(t);
          reject(new Error("aborted"));
        },
        { once: true },
      );
    }
  });

// Remove extra whitespace and trim string
const compact = (s: string): string => s.replace(/\s+/g, " ").trim();

// Create a short metadata string about the recent chat history
const contextMiniSummary = (context: { role: string; content: string }[]): string => {
  const last = context.slice(-6);
  const userCount = last.filter((m) => m.role === "user").length;
  const assistantCount = last.filter((m) => m.role === "assistant").length;
  const sample = compact(last.map((m) => m.content).join(" ")).slice(0, 180);
  return `Viestejä: käyttäjä ${userCount}, assistentti ${assistantCount}. ${sample}`;
};

// Generate a mock summary from the message history
const makeSummary = (context: { role: string; content: string }[]): string => {
  const lastUser = [...context].reverse().find((m) => m.role === "user")?.content ?? "";
  const lastAssistant = [...context].reverse().find((m) => m.role === "assistant")?.content ?? "";
  const a = compact(lastUser).slice(0, 180);
  const b = compact(lastAssistant).slice(0, 180);
  const c = compact(context.map((m) => m.content).join(" ")).slice(0, 180);
  
  const parts = [a, b, c].filter((x) => x.length > 0).slice(0, 3);
  if (parts.length === 0) return "Keskustelussa ei ollut sisältöä.";
  if (parts.length === 1) return `${parts[0]}.`;
  if (parts.length === 2) return `${parts[0]}. ${parts[1]}.`;
  return `${parts[0]}. ${parts[1]}. ${parts[2]}.`;
};

/**
 * Local stub provider for testing purposes without external API calls
 */
export const localStubProvider: AiProvider = {
  async generateReply(input: GenerateReplyInput): Promise<GenerateReplyOutput> {
    const { task, scrubbedMessage, context, signal } = input;

    // Simulate network/processing delay
    await sleep(env.testStubSleepMs, signal);

    // Handle standard message reply task
    if (task === "reply") {
      if (env.testReplyFail || scrubbedMessage.includes("FAIL_REPLY")) {
        throw new Error("stub_reply_failed");
      }

      const preview = compact(scrubbedMessage).slice(0, 220);
      const ctx = contextMiniSummary(context);
      return { scrubbedReply: `Kuittaus. Sain viestin: ${preview}. ${ctx}` };
    }

    // Handle conversation summarization task
    if (task === "summary") {
      if (env.testSummaryFail || scrubbedMessage.includes("FAIL_SUMMARY")) {
        throw new Error("stub_summary_failed");
      }
      return { scrubbedReply: makeSummary(context) };
    }

    // Handle user profiling and preference extraction task
    if (task === "profile") {
      if (env.testProfileFail || scrubbedMessage.includes("FAIL_PROFILE")) {
        throw new Error("stub_profile_failed");
      }

      // Mock PII leak scenario for testing filters
      if (env.testProfilePii || scrubbedMessage.includes("PROFILE_PII")) {
        const obj = {
          lang: "fi",
          goals: "Ota yhteys test@example.com",
          preferences: "Soita 0401234567",
          tone: "neutral",
          updatedAt: Date.now(),
        };
        return { scrubbedReply: JSON.stringify(obj) };
      }

      // Default mock profile
      const obj = {
        lang: "fi",
        goals: "Rakentaa yksityisyys ensin chat.",
        preferences: "Pidä vastaukset lyhyinä ja selkeinä.",
        tone: "neutral",
        updatedAt: Date.now(),
      };
      return { scrubbedReply: JSON.stringify(obj) };
    }

    return { scrubbedReply: "unsupported_task" };
  },
};