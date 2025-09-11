/**
 * Sanitizes a token by removing non-ASCII characters to prevent HTTP header encoding errors
 * @param token - The token to sanitize
 * @returns The sanitized token containing only ASCII characters
 */
export function sanitizeToken(token: string | null | undefined): string {
  if (!token) return '';
  return token.replace(/[^\x00-\x7F]/g, "");
}
