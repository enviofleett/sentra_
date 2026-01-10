import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface DiscountThreshold {
  id: string;
  name: string;
  type: 'quantity' | 'value';
  threshold: number;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  target_type: 'global' | 'product' | 'category';
  is_active: boolean;
}

interface CartIncentiveResult {
  loading: boolean;
  currentProgress: number;
  nextThreshold: DiscountThreshold | null;
  amountToNext: number;
  itemsToNext: number;
  progressPercentage: number;
  allThresholds: DiscountThreshold[];
  unlockedThreshold: DiscountThreshold | null;
}

export function useCartIncentive(
  cartSubtotal: number,
  cartItemCount: number
): CartIncentiveResult {
  const [loading, setLoading] = useState(true);
  const [thresholds, setThresholds] = useState<DiscountThreshold[]>([]);

  useEffect(() => {
    loadThresholds();
  }, []);

  const loadThresholds = async () => {
    const { data, error } = await supabase
      .from('discount_thresholds')
      .select('*')
      .eq('is_active', true)
      .eq('target_type', 'global')
      .order('threshold', { ascending: true });

    if (data && !error) {
      setThresholds(data as DiscountThreshold[]);
    }
    setLoading(false);
  };

  // Separate thresholds by type
  const valueThresholds = thresholds.filter(t => t.type === 'value');
  const quantityThresholds = thresholds.filter(t => t.type === 'quantity');

  // Find the next value threshold the user hasn't reached
  const nextValueThreshold = valueThresholds.find(t => cartSubtotal < t.threshold);
  
  // Find the next quantity threshold the user hasn't reached
  const nextQuantityThreshold = quantityThresholds.find(t => cartItemCount < t.threshold);

  // Find unlocked thresholds (ones the user has already passed)
  const unlockedValueThresholds = valueThresholds.filter(t => cartSubtotal >= t.threshold);
  const unlockedQuantityThresholds = quantityThresholds.filter(t => cartItemCount >= t.threshold);
  
  // Get the highest unlocked threshold
  const unlockedThreshold = [...unlockedValueThresholds, ...unlockedQuantityThresholds]
    .sort((a, b) => b.discount_value - a.discount_value)[0] || null;

  // Determine which next threshold to display (prefer the one closest to achieving)
  let nextThreshold: DiscountThreshold | null = null;
  let amountToNext = 0;
  let itemsToNext = 0;
  let progressPercentage = 0;

  if (nextValueThreshold && nextQuantityThreshold) {
    // Calculate progress percentages to determine which is closer
    const valueProgress = (cartSubtotal / nextValueThreshold.threshold) * 100;
    const quantityProgress = (cartItemCount / nextQuantityThreshold.threshold) * 100;
    
    if (valueProgress >= quantityProgress) {
      nextThreshold = nextValueThreshold;
      amountToNext = Math.round((nextValueThreshold.threshold - cartSubtotal) * 100) / 100;
      progressPercentage = Math.min(valueProgress, 100);
    } else {
      nextThreshold = nextQuantityThreshold;
      itemsToNext = nextQuantityThreshold.threshold - cartItemCount;
      progressPercentage = Math.min(quantityProgress, 100);
    }
  } else if (nextValueThreshold) {
    nextThreshold = nextValueThreshold;
    amountToNext = Math.round((nextValueThreshold.threshold - cartSubtotal) * 100) / 100;
    progressPercentage = Math.min((cartSubtotal / nextValueThreshold.threshold) * 100, 100);
  } else if (nextQuantityThreshold) {
    nextThreshold = nextQuantityThreshold;
    itemsToNext = nextQuantityThreshold.threshold - cartItemCount;
    progressPercentage = Math.min((cartItemCount / nextQuantityThreshold.threshold) * 100, 100);
  }

  return {
    loading,
    currentProgress: nextThreshold?.type === 'value' ? cartSubtotal : cartItemCount,
    nextThreshold,
    amountToNext,
    itemsToNext,
    progressPercentage,
    allThresholds: thresholds,
    unlockedThreshold
  };
}
