import Fastify from "fastify";
import type { GenerateReplyInput, GenerateReplyOutput } from "../ai/types.ts";
import { scrubText } from "../utils/piiScrubber.ts";

const app = Fastify({ logger: true });

app.post("/generate-reply", async (req, reply) => {
  const input = req.body as GenerateReplyInput;

  const preview = scrubText(input.scrubbedMessage).slice(0, 200);
  const out: GenerateReplyOutput = {
    scrubbedReply: `AI service kuittaus. Sain viestin: ${preview}`,
  };

  return reply.send(out);
});

const start = async () => {
  const port = Number(process.env.AI_SERVICE_PORT ?? "5050");
  const host = "0.0.0.0";
  await app.listen({ port, host });
  app.log.info({ port, host }, "ai service listening");
};

start().catch((err) => {
  console.error(err);
  process.exit(1);
});