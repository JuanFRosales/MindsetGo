export const emptyBodySchema = {
  type: "object",
  additionalProperties: false,
  properties: {},
  maxProperties: 0,
} as const;

export const idString = {
  type: "string",
  minLength: 1,
} as const;
