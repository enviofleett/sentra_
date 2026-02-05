
import { describe, it, expect, vi } from 'vitest';
import { calculateTotalWeight, CartItem } from './shippingCalculator';

// Mock Supabase client to avoid localStorage issues
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('calculateTotalWeight', () => {
  const standardItems: CartItem[] = [
    {
      product_id: '1',
      quantity: 2,
      product: { id: 'p1', name: 'Light Item', weight: 0.1, size: null }
    },
    {
      product_id: '2',
      quantity: 1,
      product: { id: 'p2', name: 'Heavy Item', weight: 1.0, size: null }
    }
  ];

  const sizeBasedItems: CartItem[] = [
    {
      product_id: '3',
      quantity: 1,
      product: { id: 'p3', name: 'Liquid Item', weight: null, size: '100ml' }
    }
  ];

  const noWeightItems: CartItem[] = [
    {
      product_id: '4',
      quantity: 1,
      product: { id: 'p4', name: 'Unknown Weight Item', weight: null, size: null }
    }
  ];

  describe('Single Address Mode (Standard Accumulation)', () => {
    it('calculates cumulative weight correctly for explicit weights', () => {
      // 2 * 0.1 + 1 * 1.0 = 1.2
      const total = calculateTotalWeight(standardItems, false);
      expect(total).toBeCloseTo(1.2);
    });

    it('calculates weight from size string using tiered logic (ml + glass/box)', () => {
      // 100ml = 0.1kg liquid.
      // Tier > 60ml & <= 100ml: + 0.3kg container
      // Total = 0.4kg
      const total = calculateTotalWeight(sizeBasedItems, false);
      expect(total).toBeCloseTo(0.4);
    });

    it('calculates small 30ml items correctly', () => {
      // 30ml = 0.03kg liquid
      // Tier <= 30ml: + 0.15kg container
      // Total = 0.18kg
      const smallItems: CartItem[] = [{
        product_id: 's1', quantity: 1, product: { id: 's1', name: 'Small', weight: null, size: '30ml' }
      }];
      const total = calculateTotalWeight(smallItems, false);
      expect(total).toBeCloseTo(0.18);
    });

    it('calculates large 200ml items correctly', () => {
      // 200ml = 0.2kg liquid
      // Tier > 100ml: + 0.50kg container
      // Total = 0.7kg
      const largeItems: CartItem[] = [{
        product_id: 'l1', quantity: 1, product: { id: 'l1', name: 'Large', weight: null, size: '200ml' }
      }];
      const total = calculateTotalWeight(largeItems, false);
      expect(total).toBeCloseTo(0.7);
    });

    it('uses default weight (0.5kg) when no weight/size provided', () => {
      const total = calculateTotalWeight(noWeightItems, false);
      expect(total).toBe(0.5);
    });

    it('calculates mixed cart correctly', () => {
      const allItems = [...standardItems, ...sizeBasedItems, ...noWeightItems];
      // Standard: 1.2
      // SizeBased (100ml): 0.4
      // Default: 0.5
      // Total: 2.1
      const total = calculateTotalWeight(allItems, false);
      expect(total).toBeCloseTo(2.1);
    });
  });

  describe('Multi Address Mode (Min 0.5kg per product)', () => {
    it('enforces min 0.5kg per product unit for light items', () => {
      // Light Item: 0.1 < 0.5 -> becomes 0.5. Total: 2 * 0.5 = 1.0
      // Heavy Item: 1.0 > 0.5 -> stays 1.0. Total: 1 * 1.0 = 1.0
      // Grand Total: 2.0
      const total = calculateTotalWeight(standardItems, true);
      expect(total).toBeCloseTo(2.0);
    });

    it('enforces min 0.5kg for size-based items if calculated weight is low', () => {
      // Test item: 30ml = 0.03kg + 0.15kg (pkg) = 0.18kg. 
      // Should be bumped to 0.5kg in multi-address mode
      const smallLiquid: CartItem[] = [{
        product_id: '5',
        quantity: 1,
        product: { id: 'p5', name: 'Small Liquid', weight: null, size: '30ml' }
      }];
      
      const total = calculateTotalWeight(smallLiquid, true);
      expect(total).toBe(0.5);
    });

    it('handles edge case of exactly 0.5kg correctly', () => {
      const exactItems: CartItem[] = [
          {
              product_id: '3',
              quantity: 1,
              product: { id: 'p3', name: 'Exact Item', weight: 0.5, size: null }
          }
      ];
      const result = calculateTotalWeight(exactItems, true);
      expect(result).toBe(0.5);
    });

    it('handles mixed scenarios with enforcement', () => {
        // Light (0.1) -> 0.5 * 2 = 1.0
        // Heavy (1.0) -> 1.0 * 1 = 1.0
        // Small Liquid (30ml) -> 0.18 < 0.5 -> 0.5
        // Default (0.5) -> 0.5 * 1 = 0.5
        // Total: 3.0
        const items = [
            ...standardItems,
            {
                product_id: '5',
                quantity: 1,
                product: { id: 'p5', name: 'Small Liquid', weight: null, size: '30ml' }
            },
            ...noWeightItems
        ];
        const total = calculateTotalWeight(items, true);
        expect(total).toBeCloseTo(3.0);
    });
  });
});
