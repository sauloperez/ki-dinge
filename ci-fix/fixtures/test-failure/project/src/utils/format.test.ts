import { describe, it, expect } from 'vitest';
import { formatPrice, formatDate } from './format';

describe('formatPrice', () => {
  it('formats to 2 decimal places', () => {
    expect(formatPrice(10)).toBe('$10.00');
  });

  it('handles integers', () => {
    expect(formatPrice(100)).toBe('$100.00');
  });
});
