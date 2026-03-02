import { env } from "../../config/env.ts";
import type { AiProvider, GenerateReplyInput, GenerateReplyOutput } from "../types.ts";

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

const compact = (s: string): string => s.replace(/\s+/g, " ").trim();

const contextMiniSummary = (context: { role: string; content: string }[]): string => {
  const last = context.slice(-6);
  const userCount = last.filter((m) => m.role === "user").length;
  const assistantCount = last.filter((m) => m.role === "assistant").length;
  const sample = compact(last.map((m) => m.content).join(" ")).slice(0, 180);
  return `Viestejä: käyttäjä ${userCount}, assistentti ${assistantCount}. ${sample}`;
};

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

export const localStubProvider: AiProvider = {
  async generateReply(input: GenerateReplyInput): Promise<GenerateReplyOutput> {
    const { task, scrubbedMessage, context, signal } = input;

    await sleep(env.testStubSleepMs, signal);

    if (task === "reply") {
      if (env.testReplyFail || scrubbedMessage.includes("FAIL_REPLY")) {
        throw new Error("stub_reply_failed");
      }

      const preview = compact(scrubbedMessage).slice(0, 220);
      const ctx = contextMiniSummary(context);
      return { scrubbedReply: `Kuittaus. Sain viestin: ${preview}. ${ctx}` };
    }

    if (task === "summary") {
      if (env.testSummaryFail || scrubbedMessage.includes("FAIL_SUMMARY")) {
        throw new Error("stub_summary_failed");
      }
      return { scrubbedReply: makeSummary(context) };
    }

    if (task === "profile") {
      if (env.testProfileFail || scrubbedMessage.includes("FAIL_PROFILE")) {
        throw new Error("stub_profile_failed");
      }

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
