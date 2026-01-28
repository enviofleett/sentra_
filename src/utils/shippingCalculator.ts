import { supabase } from '@/integrations/supabase/client';

// Constants for weight calculation
const PACKAGING_OVERHEAD_KG = 0.2; // Glass bottle + box weight
const DEFAULT_WEIGHT_KG = 0.5; // Fallback weight for products without weight data

interface CartItem {
  product_id: string;
  quantity: number;
  product?: {
    id: string;
    name: string;
    weight?: number | null;
    size?: string | null;
    vendor_id?: string | null;
  };
}

interface VendorSchedule {
  vendorId: string;
  vendorName: string;
  quantity: number;
  schedule: string;
  estimatedDays?: string;
}

interface VendorBreakdown {
  vendorId: string;
  vendorName: string;
  vendorRegionId: string | null;
  vendorRegionName: string | null;
  totalWeight: number;
  itemCount: number;
  shippingCost: number;
  schedule: string;
  estimatedDays?: string;
}

export interface ShippingCalculationResult {
  totalWeight: number;
  weightBasedCost: number;
  vendorSchedules: VendorSchedule[];
  consolidatedSchedule: string;
  hasVendorRules: boolean;
  vendorBreakdown: VendorBreakdown[];
  hasLocationBasedPricing: boolean;
}

/**
 * Extract numeric weight from product.size string (e.g., "100ml" -> 0.1kg)
 * Adds packaging overhead for liquid products
 */
export function getProductWeight(product: CartItem['product']): number {
  if (!product) return DEFAULT_WEIGHT_KG;

  // 1. If product.weight is set and > 0, use it directly
  if (product.weight && product.weight > 0) {
    return product.weight;
  }

  // 2. Try to parse weight from size string (e.g., "100ml", "50ML", "200 ml")
  if (product.size) {
    const sizeStr = product.size.toLowerCase().replace(/\s/g, '');
    const mlMatch = sizeStr.match(/(\d+(?:\.\d+)?)\s*ml/);
    
    if (mlMatch) {
      const mlValue = parseFloat(mlMatch[1]);
      // Convert ml to kg (1000ml = 1kg for liquid) + packaging overhead
      const liquidWeight = mlValue / 1000;
      return liquidWeight + PACKAGING_OVERHEAD_KG;
    }
  }

  // 3. Fallback to default weight
  return DEFAULT_WEIGHT_KG;
}

/**
 * Calculate total weight for an array of cart items
 */
export function calculateTotalWeight(cartItems: CartItem[]): number {
  return cartItems.reduce((sum, item) => {
    const weight = getProductWeight(item.product);
    return sum + weight * item.quantity;
  }, 0);
}

/**
 * Calculate shipping based on cart weight, vendor regions, and customer location
 * Enhanced version with location-aware pricing
 */
export async function calculateShipping(
  cartItems: CartItem[],
  customerRegionId?: string
): Promise<ShippingCalculationResult> {
  // Default result
  const result: ShippingCalculationResult = {
    totalWeight: 0,
    weightBasedCost: 0,
    vendorSchedules: [],
    consolidatedSchedule: 'Standard shipping',
    hasVendorRules: false,
    vendorBreakdown: [],
    hasLocationBasedPricing: false,
  };

  if (!cartItems || cartItems.length === 0) {
    return result;
  }

  // Step 1: Calculate total cart weight using smart weight calculation
  result.totalWeight = calculateTotalWeight(cartItems);

  // Calculate total quantity across all items for bulk order override
  const totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  // Step 2: Group cart items by vendor
  const vendorGroups: Record<string, { 
    items: CartItem[]; 
    quantity: number; 
    weight: number;
  }> = {};

  cartItems.forEach((item) => {
    const vendorId = item.product?.vendor_id || 'unknown';
    if (!vendorGroups[vendorId]) {
      vendorGroups[vendorId] = { items: [], quantity: 0, weight: 0 };
    }
    vendorGroups[vendorId].items.push(item);
    vendorGroups[vendorId].quantity += item.quantity;
    vendorGroups[vendorId].weight += getProductWeight(item.product) * item.quantity;
  });

  const vendorIds = Object.keys(vendorGroups).filter(id => id !== 'unknown');

  // Step 3: Fetch vendor information including their shipping regions
  let vendorRegionMap: Record<string, { regionId: string | null; regionName: string | null; name: string }> = {};
  
  if (vendorIds.length > 0) {
    const { data: vendors } = await supabase
      .from('vendors')
      .select(`
        id, 
        rep_full_name,
        shipping_region_id,
        shipping_region:shipping_regions(id, name)
      `)
      .in('id', vendorIds);

    vendors?.forEach((v: any) => {
      vendorRegionMap[v.id] = {
        regionId: v.shipping_region_id,
        regionName: v.shipping_region?.name || null,
        name: v.rep_full_name
      };
    });
  }

  // Step 4: If customer region is provided, calculate location-based shipping
  if (customerRegionId) {
    result.hasLocationBasedPricing = true;
    
    // Fetch weight-based rates for fallback (in case matrix routes don't exist)
    let { data: weightRates, error: weightRatesError } = await supabase
      .from('shipping_weight_rates')
      .select('min_weight, max_weight, cost')
      .order('min_weight', { ascending: true });
    
    // Fallback defaults if DB is empty or error
    if (weightRatesError || !weightRates || weightRates.length === 0) {
      console.warn('[Shipping] Using hardcoded default weight rates because DB is empty or error.');
      weightRates = [
        { min_weight: 0, max_weight: 2, cost: 2500 },
        { min_weight: 2, max_weight: 5, cost: 4500 },
        { min_weight: 5, max_weight: 10, cost: 8000 },
        { min_weight: 10, max_weight: 100, cost: 15000 }
      ];
    }
    
    // Helper function to get weight-based cost for a given weight
    const getWeightBasedCost = (weight: number): number => {
      if (!weightRates || weightRates.length === 0) {
        console.warn(`[Shipping] No weight-based rates available. Weight: ${weight}kg`);
        return 0;
      }
      
      const matchingRate = weightRates.find(
        (rate) => weight >= rate.min_weight && weight < rate.max_weight
      );

      if (matchingRate) {
        return matchingRate.cost;
      } else if (weight >= weightRates[weightRates.length - 1].max_weight) {
        // Use the highest rate if weight exceeds all ranges
        return weightRates[weightRates.length - 1].cost;
      }
      
      // If weight is less than the minimum rate, use the first rate
      if (weight < weightRates[0].min_weight && weightRates.length > 0) {
        return weightRates[0].cost;
      }
      
      return 0;
    };
    
    for (const vendorId of vendorIds) {
      const vendorInfo = vendorRegionMap[vendorId];
      const group = vendorGroups[vendorId];
      
      const breakdown: VendorBreakdown = {
        vendorId,
        vendorName: vendorInfo?.name || 'Unknown Vendor',
        vendorRegionId: vendorInfo?.regionId || null,
        vendorRegionName: vendorInfo?.regionName || null,
        totalWeight: group.weight,
        itemCount: group.quantity,
        shippingCost: 0,
        schedule: 'Standard shipping',
      };

      // Look up shipping matrix for this origin->destination
      let foundMatrixRoute = false;
      if (vendorInfo?.regionId) {
        const { data: matrixRoute } = await supabase
          .from('shipping_matrix')
          .select('base_cost, weight_rate, estimated_days')
          .eq('origin_region_id', vendorInfo.regionId)
          .eq('destination_region_id', customerRegionId)
          .eq('is_active', true)
          .maybeSingle();

        if (matrixRoute) {
          // Calculate cost: base_cost + (weight * weight_rate)
          breakdown.shippingCost = matrixRoute.base_cost + (group.weight * matrixRoute.weight_rate);
          breakdown.estimatedDays = matrixRoute.estimated_days || undefined;
          foundMatrixRoute = true;
        }
      }
      
      // Fallback to weight-based rates if no matrix route found
      if (!foundMatrixRoute) {
        const fallbackCost = getWeightBasedCost(group.weight);
        breakdown.shippingCost = fallbackCost;
        
        // Log for debugging (can be removed in production)
        if (fallbackCost === 0 && group.weight > 0) {
          console.warn(`[Shipping] No matrix route found for vendor ${vendorId} (${vendorInfo?.name || 'Unknown'}) from region ${vendorInfo?.regionId || 'none'} to ${customerRegionId}. Weight: ${group.weight}kg. No weight-based rate matched.`);
        }
      }

      // Check vendor MOQ rules for schedule override
      const { data: vendorRules } = await supabase
        .from('vendor_shipping_rules')
        .select('min_quantity, shipping_schedule')
        .eq('vendor_id', vendorId)
        .eq('is_active', true)
        .lte('min_quantity', group.quantity)
        .order('min_quantity', { ascending: false })
        .limit(1);

      if (vendorRules && vendorRules.length > 0) {
        result.hasVendorRules = true;
        breakdown.schedule = vendorRules[0].shipping_schedule;
        
        result.vendorSchedules.push({
          vendorId,
          vendorName: breakdown.vendorName,
          quantity: group.quantity,
          schedule: breakdown.schedule,
          estimatedDays: breakdown.estimatedDays,
        });
      }

      result.vendorBreakdown.push(breakdown);
    }

    // Sum up all vendor shipping costs - this is the CORRECT cumulative calculation
    result.weightBasedCost = result.vendorBreakdown.reduce((sum, b) => sum + b.shippingCost, 0);
    
    // Only use fallback if NO vendor-specific shipping costs were calculated
    // This ensures we don't override the proper cumulative weight-based calculation
    if (result.weightBasedCost === 0 && result.totalWeight > 0) {
      // Check if we actually have vendor breakdowns but they all returned 0 cost
      const hasVendorBreakdownsButZeroCost = result.vendorBreakdown.length > 0 && 
        result.vendorBreakdown.every(b => b.shippingCost === 0);
      
      if (hasVendorBreakdownsButZeroCost) {
        // This indicates a configuration issue - log it but use total weight fallback
        const totalWeightCost = getWeightBasedCost(result.totalWeight);
        result.weightBasedCost = totalWeightCost;
        
        console.warn(`[Shipping] All vendor shipping costs are 0. Using total weight fallback: ${result.totalWeight}kg = ₦${totalWeightCost}. Check shipping matrix configuration.`);
        console.warn(`[Shipping] Vendor breakdown:`, result.vendorBreakdown);
      }
      // If no vendor breakdowns exist at all, this is expected behavior
    }

  } else {
    // Fallback: Use global weight-based shipping rates (old behavior)
    let { data: weightRates } = await supabase
      .from('shipping_weight_rates')
      .select('min_weight, max_weight, cost')
      .order('min_weight', { ascending: true });

    // Fallback defaults if DB is empty
    if (!weightRates || weightRates.length === 0) {
      weightRates = [
        { min_weight: 0, max_weight: 2, cost: 2500 },
        { min_weight: 2, max_weight: 5, cost: 4500 },
        { min_weight: 5, max_weight: 10, cost: 8000 },
        { min_weight: 10, max_weight: 100, cost: 15000 }
      ];
    }

    if (weightRates && weightRates.length > 0) {
      const matchingRate = weightRates.find(
        (rate) =>
          result.totalWeight >= rate.min_weight &&
          result.totalWeight < rate.max_weight
      );

      if (matchingRate) {
        result.weightBasedCost = matchingRate.cost;
      } else if (result.totalWeight >= weightRates[weightRates.length - 1].max_weight) {
        result.weightBasedCost = weightRates[weightRates.length - 1].cost;
      }
    }

    // Fetch vendor MOQ rules for delivery schedules
    if (vendorIds.length > 0) {
      const { data: vendorRules } = await supabase
        .from('vendor_shipping_rules')
        .select('vendor_id, min_quantity, shipping_schedule')
        .in('vendor_id', vendorIds)
        .eq('is_active', true)
        .order('min_quantity', { ascending: false });

      if (vendorRules && vendorRules.length > 0) {
        result.hasVendorRules = true;

        vendorIds.forEach((vendorId) => {
          const quantity = vendorGroups[vendorId].quantity;
          const matchingRule = vendorRules.find(
            (rule) => rule.vendor_id === vendorId && quantity >= rule.min_quantity
          );

          if (matchingRule) {
            result.vendorSchedules.push({
              vendorId,
              vendorName: vendorRegionMap[vendorId]?.name || 'Unknown Vendor',
              quantity,
              schedule: matchingRule.shipping_schedule,
            });
          }
        });
      }
    }
  }

  // Build consolidated schedule string
  if (result.vendorSchedules.length > 0) {
    result.consolidatedSchedule = result.vendorSchedules
      .map((vs) => `${vs.vendorName}: ${vs.schedule}`)
      .join(' | ');
  }

  // Bulk Order Shipping Schedule Override (12+ units = expedited shipping)
  // This override happens AFTER weight calculation and schedule building
  // but BEFORE returning the result, ensuring weight is the primary factor for cost
  if (totalQuantity >= 12) {
    // Override consolidated schedule
    result.consolidatedSchedule = 'Within 2 business days';
    
    // Override all vendor schedules
    result.vendorSchedules = result.vendorSchedules.map(vs => ({
      ...vs,
      schedule: 'Within 2 business days',
      estimatedDays: '2 days'
    }));
    
    // Override all vendor breakdown schedules
    result.vendorBreakdown = result.vendorBreakdown.map(bd => ({
      ...bd,
      schedule: 'Within 2 business days',
      estimatedDays: '2 days'
    }));
  }

  return result;
}

/**
 * Get just the weight-based shipping cost (legacy fallback)
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

/**
 * Fetch all active shipping regions for dropdown selection
 */
export async function getShippingRegions(): Promise<Array<{ id: string; name: string }>> {
  const { data } = await supabase
    .from('shipping_regions')
    .select('id, name')
    .eq('is_active', true)
    .order('name');

  return data || [];
}
