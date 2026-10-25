import cors from 'cors';
import { RequestHandler } from 'express';

export const parseCorsOrigins = (value: string | undefined): string[] =>
  (value ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

export const createCorsMiddleware = (
  value: string | undefined = process.env.CORS_ORIGIN,
): RequestHandler | null => {
  const origins = parseCorsOrigins(value);

  if (origins.length === 0) {
    return null;
  }

  return cors({ origin: origins, credentials: false });
};
