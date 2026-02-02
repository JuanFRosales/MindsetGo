// Next function type for middleware
export type NextFunction = (err?: Error) => void;
// Async middleware type
export type AsyncMiddleware<TArgs extends unknown[]> = (...args: TArgs) => Promise<unknown>;
