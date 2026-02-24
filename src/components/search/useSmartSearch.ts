
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SearchResult, SearchFilters, SearchHistoryItem } from './types';

// Fallback if useDebounce doesn't exist
const useDebounceValue = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

export const useSmartSearch = () => {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounceValue(query, 300);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const [filters, setFilters] = useState<SearchFilters>({});
  
  // Available filter options
  const [brands, setBrands] = useState<string[]>([]);
  const [scentProfiles, setScentProfiles] = useState<string[]>([]);
  const [categories, setCategories] = useState<{id: string, name: string}[]>([]);

  // Load history on mount
  useEffect(() => {
    const saved = localStorage.getItem('search_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse search history', e);
      }
    }
    fetchFilterOptions();
  }, []);

  const fetchFilterOptions = async () => {
    const [brandsRes, categoriesRes] = await Promise.all([
      supabase.from('featured_brands').select('name').order('name'),
      supabase.from('categories').select('id, name').eq('is_active', true).order('name')
    ]);

    if (brandsRes.data) {
      setBrands(brandsRes.data.map(b => b.name));
    }
    
    if (categoriesRes.data) {
      setCategories(categoriesRes.data);
    }

    // For scent profiles, we might need to fetch distinct values from products
    // This is expensive on large datasets without a dedicated table/view, 
    // so we'll skip or use a static list if needed.
    // For now, let's just use a hardcoded list of common profiles
    setScentProfiles(['Floral', 'Woody', 'Fresh', 'Oriental', 'Spicy', 'Citrus', 'Fruity', 'Gourmand']);
  };

  const addToHistory = (term: string) => {
    if (!term.trim()) return;
    const newItem = { term, timestamp: Date.now() };
    const newHistory = [newItem, ...history.filter(h => h.term !== term)].slice(0, 10);
    setHistory(newHistory);
    localStorage.setItem('search_history', JSON.stringify(newHistory));
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('search_history');
  };

  useEffect(() => {
    const fetchResults = async () => {
      if (!debouncedQuery.trim() && Object.keys(filters).length === 0) {
        setResults([]);
        setSuggestions([]);
        return;
      }

      setLoading(true);
      try {
        let queryBuilder = supabase
          .from('products')
          .select('id, name, brand, price, image_url, category_id, scent_profile')
          .eq('is_active', true);

        if (debouncedQuery.trim()) {
          // Fuzzy match on name or brand
          // Note: Supabase/PostgREST doesn't support OR across columns easily without .or() syntax
          queryBuilder = queryBuilder.or(`name.ilike.%${debouncedQuery}%,brand.ilike.%${debouncedQuery}%`);
        }

        // Apply filters
        if (filters.brand && filters.brand.length > 0) {
          queryBuilder = queryBuilder.in('brand', filters.brand);
        }
        
        if (filters.categoryId && filters.categoryId.length > 0) {
          queryBuilder = queryBuilder.in('category_id', filters.categoryId);
        }

        if (filters.scentProfile && filters.scentProfile.length > 0) {
          // Assuming scent_profile is a single string column. 
          // If it's JSON or array, this needs adjustment.
          queryBuilder = queryBuilder.in('scent_profile', filters.scentProfile);
        }
        
        if (filters.priceRange) {
          queryBuilder = queryBuilder.gte('price', filters.priceRange[0]).lte('price', filters.priceRange[1]);
        }

        const { data, error } = await queryBuilder.limit(20);

        if (error) throw error;

        if (data) {
          setResults(data);
          // Extract unique names for suggestions if query is short
          if (debouncedQuery.length > 2) {
             const names = data.map(d => d.name).slice(0, 5);
             setSuggestions(names);
          }
        }
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [debouncedQuery, filters]);

  return {
    query,
    setQuery,
    results,
    suggestions,
    loading,
    history,
    addToHistory,
    clearHistory,
    filters,
    setFilters,
    brands,
    categories,
    scentProfiles
  };
};
