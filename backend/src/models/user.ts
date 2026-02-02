import type { EntityId, EntityTimestamps, Expirable } from "../types/projectTypes.ts";

export type User = {
  id: EntityId;
} & EntityTimestamps &
  Expirable;
