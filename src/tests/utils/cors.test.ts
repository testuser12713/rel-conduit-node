import { createCorsMiddleware, parseCorsOrigins } from '../../cors';

type HeaderValue = string | number | string[];

const runMiddleware = (middleware: ReturnType<typeof createCorsMiddleware>, origin?: string) => {
  const headers: Record<string, HeaderValue> = {};
  const req = {
    method: 'GET',
    headers: origin ? { origin } : {},
  } as never;
  const res = {
    setHeader: (key: string, value: HeaderValue) => {
      headers[key.toLowerCase()] = value;
    },
    getHeader: (key: string) => headers[key.toLowerCase()],
  } as never;

  middleware?.(req, res, () => undefined);

  return headers;
};

describe('CORS policy', () => {
  describe('parseCorsOrigins', () => {
    test('returns no origins for an unset value', () => {
      expect(parseCorsOrigins(undefined)).toEqual([]);
      expect(parseCorsOrigins('')).toEqual([]);
      expect(parseCorsOrigins(' , ')).toEqual([]);
    });

    test('splits and trims a comma-separated list', () => {
      expect(parseCorsOrigins(' https://web.example.com , https://admin.example.com ')).toEqual([
        'https://web.example.com',
        'https://admin.example.com',
      ]);
    });
  });

  describe('createCorsMiddleware', () => {
    test('is disabled when CORS_ORIGIN is unset', () => {
      expect(createCorsMiddleware(undefined)).toBeNull();
      expect(createCorsMiddleware('')).toBeNull();
    });

    test('names the configured origin instead of an asterisk', () => {
      const headers = runMiddleware(
        createCorsMiddleware('https://web.example.com'),
        'https://web.example.com',
      );

      expect(headers['access-control-allow-origin']).toBe('https://web.example.com');
      expect(headers['access-control-allow-origin']).not.toBe('*');
      expect(headers['access-control-allow-credentials']).toBeUndefined();
    });

    test('accepts a request from any origin of a configured list', () => {
      const middleware = createCorsMiddleware(
        'https://web.example.com,https://admin.example.com',
      );

      expect(runMiddleware(middleware, 'https://admin.example.com')[
        'access-control-allow-origin'
      ]).toBe('https://admin.example.com');
    });

    test('does not answer with an allow-origin header for an unlisted origin', () => {
      const headers = runMiddleware(
        createCorsMiddleware('https://web.example.com'),
        'https://attacker.example.com',
      );

      expect(headers['access-control-allow-origin']).toBeUndefined();
    });

    test('does not answer with an allow-origin header when the request has no origin', () => {
      const headers = runMiddleware(createCorsMiddleware('https://web.example.com'));

      expect(headers['access-control-allow-origin']).toBeUndefined();
    });
  });
});
