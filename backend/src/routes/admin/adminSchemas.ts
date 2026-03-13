import { idString } from "../../http/schemas.ts";

// Schema for validating user ID in URL parameters
export const adminUserIdParamsSchema = {
  type: "object",
  required: ["id"],
  properties: { id: idString },
};

// Schema for validating user list pagination query parameters
export const adminUsersQuerySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    limit: { type: "string", pattern: "^[0-9]+$" },
  },
};