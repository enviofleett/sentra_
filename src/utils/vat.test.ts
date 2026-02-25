import { describe, it, expect } from 'vitest';
import { calculateVat, calculateTotalWithVat, extractVatFromTotal } from './vat';

describe('VAT Calculations', () => {
  it('should calculate VAT amount correctly', () => {
    expect(calculateVat(100, 7.5)).toBe(7.5);
    expect(calculateVat(200, 10)).toBe(20);
    expect(calculateVat(0, 7.5)).toBe(0);
  });

  it('should calculate total with VAT correctly', () => {
    expect(calculateTotalWithVat(100, 7.5)).toBe(107.5);
    expect(calculateTotalWithVat(200, 10)).toBe(220);
  });

  it('should extract VAT from total correctly', () => {
    const { subtotal, vatAmount } = extractVatFromTotal(107.5, 7.5);
    expect(subtotal).toBeCloseTo(100);
    expect(vatAmount).toBeCloseTo(7.5);

    const { subtotal: s2, vatAmount: v2 } = extractVatFromTotal(220, 10);
    expect(s2).toBeCloseTo(200);
    expect(v2).toBeCloseTo(20);
  });
});
