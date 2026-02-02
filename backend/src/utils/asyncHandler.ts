import type { NextFunction, AsyncMiddleware } from "../types/projectTypes.ts";

// Wrapper to handle async errors in middleware
export const asyncHandler = <TArgs extends unknown[]>(fn: AsyncMiddleware<TArgs>) => {
  return (...args: TArgs): void => {
    const next = args[2];

    if (typeof next === "function") {
      void fn(...args).catch(next as NextFunction);
      return;
    }

    void fn(...args).catch((err) => {
      console.error("Unhandled error in asyncHandler:", err);
    });
  };
};