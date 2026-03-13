import type { EntityId, EntityTimestamps, Expirable } from "../types/projectTypes.ts";

// User type definition
export type User = {
  id: EntityId;
} & EntityTimestamps &
  Expirable;