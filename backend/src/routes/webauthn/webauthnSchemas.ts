import { idString } from "../../http/schemas.ts";

export const registerOptionsBodySchema = {
  type: "object",
  required: ["resolutionId"],
  additionalProperties: false,
  properties: {
    resolutionId: idString,
  },
};

export const registerVerifyBodySchema = {
  type: "object",
  required: ["challengeId", "response"],
  additionalProperties: false,
  properties: {
    challengeId: idString,
    response: { type: "object" },
  },
};

export const loginOptionsBodySchema = {
  type: "object",
  required: ["userId"],
  additionalProperties: false,
  properties: {
    userId: idString,
  },
};

export const loginVerifyBodySchema = {
  type: "object",
  required: ["challengeId", "resolutionId", "response"],
  additionalProperties: false,
  properties: {
    challengeId: idString,
    resolutionId: idString,
    response: { type: "object" },
  },
};