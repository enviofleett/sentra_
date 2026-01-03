import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface CategoryTabsProps {
  selectedCategory: string | null;
  onCategoryChange: (categoryId: string | null) => void;
}

export function CategoryTabs({ selectedCategory, onCategoryChange }: CategoryTabsProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase
        .from('categories')
        .select('id, name, slug')
        .eq('is_active', true)
        .order('name');
      
      if (data) {
        setCategories(data);
      }
      setLoading(false);
    };

    fetchCategories();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center gap-3 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-10 w-24 bg-muted rounded-full animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <motion.div 
      className="flex justify-center gap-2 sm:gap-3 mb-10 overflow-x-auto pb-2 px-4 -mx-4"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <button
        onClick={() => onCategoryChange(null)}
        className={`px-5 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-300 ${
          selectedCategory === null
            ? 'bg-foreground text-background'
            : 'bg-transparent text-foreground/70 hover:bg-accent border border-border'
        }`}
      >
        All
      </button>
      {categories.map((category) => (
        <button
          key={category.id}
          onClick={() => onCategoryChange(category.id)}
          className={`px-5 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-300 ${
            selectedCategory === category.id
              ? 'bg-foreground text-background'
              : 'bg-transparent text-foreground/70 hover:bg-accent border border-border'
          }`}
        >
          {category.name}
        </button>
      ))}
    </motion.div>
  );
}
