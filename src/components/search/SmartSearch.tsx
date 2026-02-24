
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Clock, ChevronRight, Tag, Filter } from 'lucide-react';
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from '@/components/ui/command';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { useSmartSearch } from './useSmartSearch';

interface SmartSearchProps {
  placeholder?: string;
  className?: string;
}

const SearchFiltersPanel = ({ 
  brands, 
  categories, 
  filters, 
  setFilters,
  onClose
}: { 
  brands: string[], 
  categories: any[], 
  filters: any, 
  setFilters: any,
  onClose: () => void
}) => {
  const [priceRange, setPriceRange] = useState(filters.priceRange || [0, 500000]);

  return (
    <div className="p-4 w-80 space-y-6">
      <div className="flex items-center justify-between">
        <h4 className="font-medium">Filters</h4>
        <Button variant="ghost" size="sm" onClick={() => {
          setFilters({});
          setPriceRange([0, 500000]);
        }}>Reset</Button>
      </div>
      
      <div className="space-y-4">
        <div>
          <Label className="mb-2 block">Price Range (₦)</Label>
          <div className="px-2">
            <Slider
              defaultValue={[0, 500000]}
              value={priceRange}
              max={1000000}
              step={5000}
              onValueChange={setPriceRange}
              onValueCommit={(val) => setFilters({ ...filters, priceRange: val })}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span>₦{priceRange[0].toLocaleString()}</span>
            <span>₦{priceRange[1].toLocaleString()}</span>
          </div>
        </div>

        <div>
          <Label className="mb-2 block">Brands</Label>
          <ScrollArea className="h-32 rounded-md border p-2">
            <div className="space-y-2">
              {brands.map(brand => (
                <div key={brand} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`filter-brand-${brand}`}
                    checked={filters.brand?.includes(brand)}
                    onCheckedChange={(checked) => {
                      const current = filters.brand || [];
                      const next = checked 
                        ? [...current, brand]
                        : current.filter((b: string) => b !== brand);
                      setFilters({ ...filters, brand: next });
                    }}
                  />
                  <label htmlFor={`filter-brand-${brand}`} className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    {brand}
                  </label>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        <div>
          <Label className="mb-2 block">Categories</Label>
          <ScrollArea className="h-32 rounded-md border p-2">
            <div className="space-y-2">
              {categories.map((cat: any) => (
                <div key={cat.id} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`filter-cat-${cat.id}`}
                    checked={filters.categoryId?.includes(cat.id)}
                    onCheckedChange={(checked) => {
                      const current = filters.categoryId || [];
                      const next = checked 
                        ? [...current, cat.id]
                        : current.filter((id: string) => id !== cat.id);
                      setFilters({ ...filters, categoryId: next });
                    }}
                  />
                  <label htmlFor={`filter-cat-${cat.id}`} className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    {cat.name}
                  </label>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
};

export const SmartSearchInput: React.FC<SmartSearchProps> = ({ placeholder = "Search...", className }) => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const {
    query,
    setQuery,
    results,
    loading,
    history,
    addToHistory,
    clearHistory,
    filters,
    setFilters,
    brands,
    categories
  } = useSmartSearch();

  const handleSelect = (id: string) => {
    addToHistory(query);
    setOpen(false);
    navigate(`/products/${id}`);
  };

  const handleSearch = () => {
    if (query.trim()) {
      addToHistory(query);
      setOpen(false);
      navigate(`/products?q=${encodeURIComponent(query)}`);
    }
  };

  return (
    <div className={cn("flex gap-2 w-full", className)}>
      <div className="relative flex-1">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                ref={inputRef}
                className="flex h-12 w-full rounded-full border border-input bg-background px-3 py-2 pl-10 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder={placeholder}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setOpen(true);
                }}
                onFocus={() => setOpen(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch();
                  }
                }}
              />
              {query && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setQuery('');
                    inputRef.current?.focus();
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 hover:bg-muted"
                >
                  <X className="h-3 w-3 text-muted-foreground" />
                </button>
              )}
            </div>
          </PopoverTrigger>
          <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)] min-w-[300px]" align="start">
            <Command className="rounded-lg border shadow-md">
              <CommandList className="max-h-[300px]">
                {loading && <div className="p-4 text-sm text-center text-muted-foreground">Loading...</div>}
                
                {!loading && results.length === 0 && query && (
                  <CommandEmpty>No results found.</CommandEmpty>
                )}

                {!query && history.length > 0 && (
                  <CommandGroup heading="Recent Searches">
                    {history.map((item, i) => (
                      <CommandItem 
                        key={i} 
                        value={`history-${item.term}`}
                        onSelect={() => {
                          setQuery(item.term);
                        }}
                      >
                        <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                        <span>{item.term}</span>
                      </CommandItem>
                    ))}
                    <CommandItem onSelect={clearHistory} className="text-xs text-muted-foreground justify-center cursor-pointer">
                      Clear History
                    </CommandItem>
                  </CommandGroup>
                )}

                {results.length > 0 && (
                  <CommandGroup heading="Products">
                    {results.map((product) => (
                      <CommandItem
                        key={product.id}
                        value={product.name}
                        onSelect={() => handleSelect(product.id)}
                      >
                        {product.image_url && (
                          <img 
                            src={product.image_url} 
                            alt={product.name} 
                            className="mr-2 h-8 w-8 object-cover rounded-sm"
                          />
                        )}
                        <div className="flex flex-col">
                          <span className="font-medium">{product.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {product.brand} • ₦{product.price.toLocaleString()}
                          </span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}

                {brands.length > 0 && query && (
                  <CommandGroup heading="Brands">
                    {brands
                      .filter(b => b.toLowerCase().includes(query.toLowerCase()))
                      .slice(0, 3)
                      .map(brand => (
                        <CommandItem
                          key={brand}
                          value={`brand-${brand}`}
                          onSelect={() => {
                            setOpen(false);
                            navigate(`/products?brand=${encodeURIComponent(brand)}`);
                          }}
                        >
                          <Tag className="mr-2 h-4 w-4" />
                          {brand}
                        </CommandItem>
                      ))}
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="icon" className="h-12 w-12 rounded-full shrink-0">
            <Filter className="h-4 w-4" />
            {Object.keys(filters).length > 0 && (
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-auto p-0">
          <SearchFiltersPanel 
            brands={brands}
            categories={categories}
            filters={filters}
            setFilters={setFilters}
            onClose={() => {}}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};

export const SmartSearchDialog: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
}> = ({ open, onOpenChange }) => {
  const navigate = useNavigate();
  const {
    query,
    setQuery,
    results,
    loading,
    history,
    addToHistory,
    clearHistory
  } = useSmartSearch();

  const handleSelect = (id: string) => {
    addToHistory(query);
    onOpenChange(false);
    navigate(`/products/${id}`);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput 
        placeholder="Search products, brands, notes..." 
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {loading && <div className="p-4 text-sm text-center text-muted-foreground">Loading...</div>}
        
        {!loading && results.length === 0 && query && (
          <CommandEmpty>No results found.</CommandEmpty>
        )}

        {!query && history.length > 0 && (
          <CommandGroup heading="Recent Searches">
            {history.map((item, i) => (
              <CommandItem 
                key={i} 
                value={`history-${item.term}`}
                onSelect={() => setQuery(item.term)}
              >
                <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>{item.term}</span>
              </CommandItem>
            ))}
             <CommandItem onSelect={clearHistory} className="text-xs text-muted-foreground justify-center cursor-pointer">
                Clear History
              </CommandItem>
          </CommandGroup>
        )}

        {results.length > 0 && (
          <CommandGroup heading="Suggestions">
            {results.map((product) => (
              <CommandItem
                key={product.id}
                value={product.name}
                onSelect={() => handleSelect(product.id)}
              >
                {product.image_url && (
                  <img 
                    src={product.image_url} 
                    alt={product.name} 
                    className="mr-2 h-8 w-8 object-cover rounded-sm"
                  />
                )}
                <div className="flex flex-col">
                  <span className="font-medium">{product.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {product.brand} • ₦{product.price.toLocaleString()}
                  </span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
};
