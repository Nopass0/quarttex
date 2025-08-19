// Create a canonical JSON string by sorting the top-level keys alphabetically.
// This mirrors the example provided in the Wellbit documentation where the PHP
// implementation calls `ksort` on the request body before encoding.
export function canonicalJson(input: string | object): string {
  const obj = typeof input === 'string' ? JSON.parse(input) : input

  if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
    const sorted = Object.keys(obj)
      .sort()
      .reduce((acc, key) => {
        acc[key] = (obj as any)[key]
        return acc
      }, {} as Record<string, any>)
    // JSON.stringify in JavaScript does not escape slashes or Unicode characters
    // by default, matching PHP's JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE
    return JSON.stringify(sorted)
  }

  return JSON.stringify(obj)
}
