import { calculateReadingTime } from '../../app/routes/article/reading-time';

const words = (count: number): string =>
  Array.from({ length: count }, (_, index) => `word${index}`).join(' ');

describe('ReadingTime', () => {
  describe('calculateReadingTime', () => {
    test('should return 1 for exactly 200 words', () => {
      expect(calculateReadingTime(words(200))).toBe(1);
    });

    test('should return 2 for 201 words', () => {
      expect(calculateReadingTime(words(201))).toBe(2);
    });

    test('should return 2 for 400 words', () => {
      expect(calculateReadingTime(words(400))).toBe(2);
    });

    test('should return 3 for 401 words', () => {
      expect(calculateReadingTime(words(401))).toBe(3);
    });

    test('should return 1 for a single word', () => {
      expect(calculateReadingTime('Hello')).toBe(1);
    });

    test('should return 1 for an empty body', () => {
      expect(calculateReadingTime('')).toBe(1);
    });

    test('should not count leading, trailing or repeated whitespace as words', () => {
      expect(calculateReadingTime(`  ${words(200)}  `)).toBe(1);
      expect(calculateReadingTime(words(200).split(' ').join('   '))).toBe(1);
      expect(calculateReadingTime(`\n\t${words(201)}\n`)).toBe(2);
    });

    test('should always return an integer of at least 1', () => {
      [1, 200, 201, 400, 401, 1000].forEach((count) => {
        const readingTime = calculateReadingTime(words(count));

        expect(Number.isInteger(readingTime)).toBe(true);
        expect(readingTime).toBeGreaterThanOrEqual(1);
      });
    });
  });
});
