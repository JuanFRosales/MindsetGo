import type { AiProvider, GenerateReplyInput, GenerateReplyOutput } from "../types.ts";

// a simple local stub provider for testing and development purposes
const hasFlag = (s: string | undefined, flag: string): boolean => {
  if (!s) return false;
  return s.includes(flag);
};

// This provider simulates AI responses based on the input message and task type
export const localStubProvider: AiProvider = {
  async generateReply(input: GenerateReplyInput): Promise<GenerateReplyOutput> {
    const task = input.task ?? "reply";
    const msg = input.scrubbedMessage ?? "";

    if (task === "reply") {
      if (hasFlag(msg, "FAIL_REPLY")) throw new Error("stub_reply_failed");
      const preview = msg.slice(0, 200);
      return { scrubbedReply: `Kuittaus. Sain viestin: ${preview}` };
    }

    if (task === "summary") {
      if (hasFlag(msg, "FAIL_SUMMARY")) throw new Error("stub_summary_failed");
      const joined = input.context.map((m) => m.content).join(" ").replace(/\s+/g, " ").trim();
      return { scrubbedReply: joined.slice(0, 180) || "Ei sisältöä." };
    }

    if (task === "profile") {
      if (hasFlag(msg, "FAIL_PROFILE")) throw new Error("stub_profile_failed");

      if (hasFlag(msg, "PROFILE_PII")) {
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
        goals: "",
        preferences: "",
        tone: "neutral",
        updatedAt: Date.now(),
      };
      return { scrubbedReply: JSON.stringify(obj) };
    }

    return { scrubbedReply: "Unsupported task" };
  },
};