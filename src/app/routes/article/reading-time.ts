const WORDS_PER_MINUTE = 200;

export function calculateReadingTime(body: string): number {
  const tokens = body.split(/\s+/).filter((token) => token.length > 0);

  return Math.max(1, Math.ceil(tokens.length / WORDS_PER_MINUTE));
}
