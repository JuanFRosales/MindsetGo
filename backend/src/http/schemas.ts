// Schema to enforce an empty request body
export const emptyBodySchema = {
  type: "object",
  additionalProperties: false,
  properties: {},
  maxProperties: 0,
} as const;

// Schema for a non-empty identifier string
export const idString = {
  type: "string",
  minLength: 1,
} as const;