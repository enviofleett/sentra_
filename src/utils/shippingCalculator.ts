import { supabase } from '@/integrations/supabase/client';

interface CartItem {
  product_id: string;
  quantity: number;
  product?: {
    id: string;
    name: string;
    weight?: number | null;
    vendor_id?: string | null;
  };
}

interface WeightRate {
  min_weight: number;
  max_weight: number;
  cost: number;
}

interface VendorRule {
  vendor_id: string;
  min_quantity: number;
  shipping_schedule: string;
}

interface VendorSchedule {
  vendorId: string;
  vendorName: string;
  quantity: number;
  schedule: string;
}

export interface ShippingCalculationResult {
  totalWeight: number;
  weightBasedCost: number;
  vendorSchedules: VendorSchedule[];
  consolidatedSchedule: string;
  hasVendorRules: boolean;
}

/**
 * Calculate shipping based on cart weight and vendor-specific MOQ rules
 */
export async function calculateShipping(
  cartItems: CartItem[]
): Promise<ShippingCalculationResult> {
  // Default result
  const result: ShippingCalculationResult = {
    totalWeight: 0,
    weightBasedCost: 0,
    vendorSchedules: [],
    consolidatedSchedule: 'Standard shipping',
    hasVendorRules: false,
  };

  if (!cartItems || cartItems.length === 0) {
    return result;
  }

  // Step 1: Calculate total cart weight
  result.totalWeight = cartItems.reduce((sum, item) => {
    const weight = item.product?.weight || 0;
    return sum + weight * item.quantity;
  }, 0);

  // Step 2: Fetch global weight-based shipping rates
  const { data: weightRates } = await supabase
    .from('shipping_weight_rates')
    .select('min_weight, max_weight, cost')
    .order('min_weight', { ascending: true });

  if (weightRates && weightRates.length > 0) {
    const matchingRate = weightRates.find(
      (rate) =>
        result.totalWeight >= rate.min_weight &&
        result.totalWeight < rate.max_weight
    );
    
    if (matchingRate) {
      result.weightBasedCost = matchingRate.cost;
    } else if (result.totalWeight >= weightRates[weightRates.length - 1].max_weight) {
      // If weight exceeds all ranges, use the highest rate
      result.weightBasedCost = weightRates[weightRates.length - 1].cost;
    }
  }

  // Step 3: Group cart items by vendor
  const vendorQuantities: Record<string, { quantity: number; vendorId: string }> = {};
  
  cartItems.forEach((item) => {
    const vendorId = item.product?.vendor_id;
    if (vendorId) {
      if (!vendorQuantities[vendorId]) {
        vendorQuantities[vendorId] = { quantity: 0, vendorId };
      }
      vendorQuantities[vendorId].quantity += item.quantity;
    }
  });

  // Step 4: Fetch vendor shipping rules for all vendors in the cart
  const vendorIds = Object.keys(vendorQuantities);
  
  if (vendorIds.length > 0) {
    const { data: vendorRules } = await supabase
      .from('vendor_shipping_rules')
      .select('vendor_id, min_quantity, shipping_schedule')
      .in('vendor_id', vendorIds)
      .eq('is_active', true)
      .order('min_quantity', { ascending: false });

    // Step 5: Fetch vendor names
    const { data: vendors } = await supabase
      .from('vendors')
      .select('id, rep_full_name')
      .in('id', vendorIds);

    const vendorNameMap: Record<string, string> = {};
    vendors?.forEach((v) => {
      vendorNameMap[v.id] = v.rep_full_name;
    });

    // Step 6: Find the highest matching MOQ tier for each vendor
    if (vendorRules && vendorRules.length > 0) {
      result.hasVendorRules = true;

      vendorIds.forEach((vendorId) => {
        const quantity = vendorQuantities[vendorId].quantity;
        
        // Rules are sorted descending by min_quantity, so first match is highest tier
        const matchingRule = vendorRules.find(
          (rule) => rule.vendor_id === vendorId && quantity >= rule.min_quantity
        );

        if (matchingRule) {
          result.vendorSchedules.push({
            vendorId,
            vendorName: vendorNameMap[vendorId] || 'Unknown Vendor',
            quantity,
            schedule: matchingRule.shipping_schedule,
          });
        }
      });

      // Step 7: Build consolidated schedule string
      if (result.vendorSchedules.length > 0) {
        result.consolidatedSchedule = result.vendorSchedules
          .map((vs) => `${vs.vendorName}: ${vs.schedule}`)
          .join(' | ');
      }
    }
  }

  return result;
}

/**
 * Get just the weight-based shipping cost (simpler version)
 */
export async function getWeightBasedShippingCost(totalWeight: number): Promise<number> {
  const { data: weightRates } = await supabase
    .from('shipping_weight_rates')
    .select('min_weight, max_weight, cost')
    .order('min_weight', { ascending: true });

  if (!weightRates || weightRates.length === 0) {
    return 0;
  }

  const matchingRate = weightRates.find(
    (rate) => totalWeight >= rate.min_weight && totalWeight < rate.max_weight
  );

  if (matchingRate) {
    return matchingRate.cost;
  }

  // If weight exceeds all ranges, use the highest rate
  if (totalWeight >= weightRates[weightRates.length - 1].max_weight) {
    return weightRates[weightRates.length - 1].cost;
  }

  return 0;
}

/**
 * Get vendor shipping schedule for a specific vendor and quantity
 */
export async function getVendorShippingSchedule(
  vendorId: string,
  quantity: number
): Promise<string | null> {
  const { data: rules } = await supabase
    .from('vendor_shipping_rules')
    .select('min_quantity, shipping_schedule')
    .eq('vendor_id', vendorId)
    .eq('is_active', true)
    .lte('min_quantity', quantity)
    .order('min_quantity', { ascending: false })
    .limit(1);

  if (rules && rules.length > 0) {
    return rules[0].shipping_schedule;
  }

  return null;
}
