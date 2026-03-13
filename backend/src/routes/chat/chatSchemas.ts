import { emptyBodySchema, idString } from "../../http/schemas.ts";
import { env } from "../../config/env.ts";

// Re-export empty body schema for reuse in chat-related endpoints
export { emptyBodySchema };

// Schema for validating an incoming chat message and its target conversation
export const chatMessageBodySchema = {
  type: "object",
  required: ["message"],
  properties: {
    // Enforce length limits based on environment configuration
    message: { type: "string", minLength: 1, maxLength: env.chatMessageMaxLength },
    conversationId: { type: "string", maxLength: 120 },
  },
};

// Schema for validating a specific message ID in URL parameters
export const chatMessageIdParamsSchema = {
  type: "object",
  required: ["id"],
  properties: { id: idString },
};