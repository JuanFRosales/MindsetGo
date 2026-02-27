import Fastify from "fastify";
import type { GenerateReplyInput } from "../ai/types.ts";
import { scrubText } from "../utils/piiScrubber.ts";

// configure Fastify with strict logging and security limits
const app = Fastify({ 
  logger: {
    // Redact sensitive headers from logs
    redact: ["req.headers.authorization", "req.headers.cookie"],
    level: "info",
  },
  // security, global body size limit to prevent abuse (2 MB)
  bodyLimit: 2 * 1024 * 1024,
  // security, prevent automatic request logging to avoid body leakage
  disableRequestLogging: true,
  // 4. Stability: Set connection timeout (30 seconds)
  connectionTimeout: 30000,
  requestTimeout: 30000
});

// health check endpoint
app.get("/health", async () => {
  return { status: "ok", uptime: process.uptime() };
});

app.post("/generate-reply", async (req, reply) => {
  const input = req.body as GenerateReplyInput;
  const task = input.task ?? "reply";

  // summary
  if (task === "summary") {
    const users = Array.isArray(input.context)
      ? input.context
          .filter((m) => m.role === "user")
          .map((m) => String(m.content ?? ""))
      : [];

    const cleaned = scrubText(users.join(" "))
      .replace(/\s+/g, " ")
      .trim();

    const out = cleaned.slice(0, 300);

    return reply.send({
      scrubbedReply: `Yhteenveto: ${out}`,
    });
  }

  // profile
  if (task === "profile") {
    const users = Array.isArray(input.context)
      ? input.context
          .filter((m) => m.role === "user")
          .map((m) => String(m.content ?? ""))
      : [];

    const cleaned = scrubText(users.join(" "))
      .replace(/\s+/g, " ")
      .trim();

    const profile = {
      lang: "fi",
      topics: cleaned ? cleaned.slice(0, 120) : "empty",
      updatedAt: Date.now(),
      status: "active"
    };

    return reply.send({ 
      scrubbedReply: JSON.stringify(profile) 
    });
  }

  // reply task
  const preview = scrubText(input.scrubbedMessage || "").slice(0, 200);
  return reply.send({
    scrubbedReply: `AI service response. Received: ${preview}`,
  });
});

const start = async () => {
  const port = Number(process.env.AI_SERVICE_PORT ?? "5050");
  const host = "0.0.0.0";
  try {
    await app.listen({ port, host });
    app.log.info({ port, host }, "ai service listening");
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();