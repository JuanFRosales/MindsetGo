import type { NextFunction } from "../types/projectTypes.ts";

// Wrapper to handle async functions in middleware
export function asyncHandler<TArgs extends unknown[]>(
  fn: (...args: TArgs) => Promise<unknown>
) {
  return (...args: TArgs): void => {
// Extract the next function from arguments
    const next = args[2];
// If next is a function, use it to handle errors
    if (typeof next === "function") {

      fn(...args).catch(next as NextFunction);
    } else {

      fn(...args).catch((err) => {
        console.error("Unhandled error in asyncHandler:", err);
      });
    }
  };
}