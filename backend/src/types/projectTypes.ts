
// Type for the next function in middleware
export type NextFunction = (err?: Error) => void;

// Type for asynchronous middleware functions
export type AsyncMiddleware<TArgs extends unknown[]> = (...args: TArgs) => Promise<unknown>;