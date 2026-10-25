import { calculateReadingTime } from '../../app/routes/article/reading-time';

const words = (count: number): string[] =>
  Array.from({ length: count }, (_, index) => `word${index}`);

describe('ReadingTime', () => {
  describe('calculateReadingTime', () => {
    test('should return 1 minute for exactly 200 words', () => {
      expect(calculateReadingTime(words(200).join(' '))).toBe(1);
    });

    test('should return 2 minutes for 201 words', () => {
      expect(calculateReadingTime(words(201).join(' '))).toBe(2);
    });

    test('should return 2 minutes for 400 words', () => {
      expect(calculateReadingTime(words(400).join(' '))).toBe(2);
    });

    test('should return 3 minutes for 401 words', () => {
      expect(calculateReadingTime(words(401).join(' '))).toBe(3);
    });

    test('should return 1 minute for a single word', () => {
      expect(calculateReadingTime('RealWorld')).toBe(1);
    });

    test('should return 1 minute for an empty body', () => {
      expect(calculateReadingTime('')).toBe(1);
    });

    test('should ignore leading, trailing and repeated whitespace', () => {
      expect(calculateReadingTime(`  ${words(200).join(' \n\t ')}  `)).toBe(1);
      expect(calculateReadingTime(`  ${words(201).join('   ')}  `)).toBe(2);
    });

    test('should always return an integer of at least 1', () => {
      expect(Number.isInteger(calculateReadingTime(''))).toBe(true);
      expect(Number.isInteger(calculateReadingTime(words(401).join(' ')))).toBe(
        true
      );
      expect(calculateReadingTime('   ')).toBeGreaterThanOrEqual(1);
    });
  });
});
