import { describe, it, expect } from 'vitest';
import { calculateDiscount } from './calc';

describe('calculateDiscount', () => {
  it('applies 10% discount for orders over $100', () => {
    const result = calculateDiscount(100, 0.1);
    expect(result).toBe(90);
  });
});
