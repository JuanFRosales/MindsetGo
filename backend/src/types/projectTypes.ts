// Next function type for middleware
export type NextFunction = (err?: Error) => void;
// Async middleware type
export type AsyncMiddleware<TArgs extends unknown[]> = (...args: TArgs) => Promise<unknown>;

// Types for entities with timestamps and expiration
export type EntityTimestamps = {
  createdAt: number;
  lastActiveAt: number;
};

// Type for entities that expire
export type Expirable = {
  expiresAt: number;
};

// Type for unique entity identifiers
export type EntityId = string;

// Type for entities with only timestamps
export type Timestamps = {
  createdAt: number;
};
// Type for entities that track activity
export type ActivityTracked = {
  lastActiveAt: number;
};

// Request context type to hold current user information
export type RequestUserContext = {
  currentUserId?: EntityId;
};