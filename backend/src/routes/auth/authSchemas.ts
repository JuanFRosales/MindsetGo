import { emptyBodySchema, idString } from "../../http/schemas.ts";

// Re-export empty body schema for consistency
export { emptyBodySchema };

// Schema for validating a request body containing an invitation code
export const inviteCodeBodySchema = {
  type: "object",
  required: ["code"],
  additionalProperties: false, // Disallow extra fields for security
  properties: { code: idString },
};

// Schema for validating a request body containing a login proof ID
export const proofIdBodySchema = {
  type: "object",
  required: ["proofId"],
  additionalProperties: false,
  properties: { proofId: idString },
};