import type { FastifyReply } from "fastify";

// Helper to send a standardized JSON error response
export const sendError = (
  reply: FastifyReply,
  statusCode: number,
  error: string,
  message: string,
) => {
  return reply.status(statusCode).send({ error, message });
};

// Error: Requested user does not exist
export const sendUserNotFound = (reply: FastifyReply) => {
  return sendError(reply, 404, "user_not_found", "User not found");
};

// Error: AI profile state for the user is missing
export const sendProfileStateNotFound = (reply: FastifyReply) => {
  return sendError(reply, 404, "profile_state_not_found", "Profile state not found");
};

// Error: Provided master admin key is incorrect
export const sendInvalidAdminKey = (reply: FastifyReply) => {
  return sendError(reply, 401, "invalid_admin_key", "Invalid admin key");
};

// Error: No admin session cookie present in request
export const sendMissingAdminSession = (reply: FastifyReply) => {
  return sendError(reply, 401, "admin_session_missing", "Admin session is missing");
};

// Error: Admin session ID is not found in the store
export const sendInvalidAdminSession = (reply: FastifyReply) => {
  return sendError(reply, 401, "admin_session_invalid", "Admin session is invalid");
};

// Error: Admin session has passed its expiration time
export const sendExpiredAdminSession = (reply: FastifyReply) => {
  return sendError(reply, 401, "admin_session_expired", "Admin session has expired");
};