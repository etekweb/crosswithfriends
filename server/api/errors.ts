/**
 * Helper function to create HTTP errors with status codes
 * Standardizes error handling across all API routes
 */
export function createHttpError(message: string, statusCode: number): Error & {statusCode: number} {
  const error = new Error(message) as Error & {statusCode: number};
  error.statusCode = statusCode;
  return error;
}
