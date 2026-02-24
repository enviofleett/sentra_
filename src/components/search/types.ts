
export interface SearchResult {
  id: string;
  name: string;
  brand: string | null;
  price: number;
  image_url: string | null;
  category_id?: string | null;
  scent_profile?: string | null;
}

export interface SearchFilters {
  brand?: string[];
  priceRange?: [number, number];
  scentProfile?: string[];
  categoryId?: string[];
}

export interface SearchHistoryItem {
  term: string;
  timestamp: number;
}
