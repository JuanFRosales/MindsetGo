import type { FastifyInstance } from "fastify";
import { adminAuthRoutes } from "./authRoutes.ts";
import { adminMaintenanceRoutes } from "./maintenanceRoutes.ts";
import { adminDiagnosticRoutes } from "./diagnosticRoutes.ts";
import { adminUserReadRoutes } from "./userReadRoutes.ts";
import { adminUserMutationRoutes } from "./userMutationRoutes.ts";

// Main function to register all admin routes
export const adminRoutes = async (app: FastifyInstance): Promise<void> => {
  await adminAuthRoutes(app);
  await adminMaintenanceRoutes(app);
  await adminDiagnosticRoutes(app);
  await adminUserReadRoutes(app);
  await adminUserMutationRoutes(app);
};