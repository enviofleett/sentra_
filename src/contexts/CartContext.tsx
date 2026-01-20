import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface CartItem {
  id: string;
  product_id: string;
  quantity: number;
  product?: {
    id: string;
    name: string;
    price: number;
    image_url?: string;
    stock_quantity: number;
    vendor_id?: string;
  };
}

interface CartContextType {
  items: CartItem[];
  loading: boolean;
  addToCart: (productId: string, quantity: number) => Promise<void>;
  removeFromCart: (itemId: string) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  totalItems: number;
  subtotal: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

// Guest cart localStorage helpers
const GUEST_CART_KEY = 'sentra_guest_cart';

const getLocalCart = (): { product_id: string; quantity: number }[] => {
  try {
    const saved = localStorage.getItem(GUEST_CART_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

const setLocalCart = (cart: { product_id: string; quantity: number }[]) => {
  localStorage.setItem(GUEST_CART_KEY, JSON.stringify(cart));
};

const clearLocalCart = () => {
  localStorage.removeItem(GUEST_CART_KEY);
};

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Sync guest cart to DB on login, or load appropriate cart
  useEffect(() => {
    const syncAndLoad = async () => {
      setLoading(true);
      
      if (user) {
        // User is logged in - sync any guest items then load from DB
        const localItems = getLocalCart();
        
        if (localItems.length > 0) {
          // Fetch existing DB cart to merge
          const { data: dbItems } = await supabase
            .from('cart_items')
            .select('product_id, quantity')
            .eq('user_id', user.id);
          
          const dbMap = new Map(dbItems?.map(i => [i.product_id, i.quantity]));

          // Merge local items into DB
          for (const localItem of localItems) {
            if (dbMap.has(localItem.product_id)) {
              const newQty = (dbMap.get(localItem.product_id) || 0) + localItem.quantity;
              await supabase
                .from('cart_items')
                .update({ quantity: newQty })
                .eq('user_id', user.id)
                .eq('product_id', localItem.product_id);
            } else {
              await supabase.from('cart_items').insert({
                user_id: user.id,
                product_id: localItem.product_id,
                quantity: localItem.quantity
              });
            }
          }
          
          clearLocalCart();
        }
        
        await loadUserCart();
      } else {
        // Guest - load from localStorage
        await loadGuestCart();
      }
      
      setLoading(false);
    };

    syncAndLoad();
  }, [user]);

  const loadUserCart = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('cart_items')
      .select(`
        *,
        product:products(id, name, price, image_url, stock_quantity, vendor_id)
      `)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error loading cart:', error);
      toast({ title: 'Error', description: 'Failed to load cart', variant: 'destructive' });
    } else {
      setItems(data || []);
    }
  };

  const loadGuestCart = async () => {
    const localItems = getLocalCart();
    if (localItems.length === 0) {
      setItems([]);
      return;
    }

    // Fetch product details for guest cart items
    const productIds = localItems.map(i => i.product_id);
    const { data: products } = await supabase
      .from('products')
      .select('id, name, price, image_url, stock_quantity, vendor_id')
      .in('id', productIds);

    if (products) {
      const mergedItems = localItems
        .map(localItem => {
          const product = products.find(p => p.id === localItem.product_id);
          if (!product) return null;
          return {
            id: `guest_${localItem.product_id}`,
            product_id: localItem.product_id,
            quantity: localItem.quantity,
            product
          };
        })
        .filter(Boolean) as CartItem[];
      setItems(mergedItems);
    }
  };

  const addToCart = async (productId: string, quantity: number) => {
    // GUEST MODE
    if (!user) {
      const localItems = getLocalCart();
      const existing = localItems.find(i => i.product_id === productId);

      if (existing) {
        existing.quantity += quantity;
      } else {
        localItems.push({ product_id: productId, quantity });
      }

      setLocalCart(localItems);
      await loadGuestCart();
      toast({ title: 'Added to cart', description: 'Item added to your cart' });
      return;
    }

    // AUTHENTICATED MODE
    const existingItem = items.find(item => item.product_id === productId);

    if (existingItem) {
      await updateQuantity(existingItem.id, existingItem.quantity + quantity);
    } else {
      const { data, error } = await supabase
        .from('cart_items')
        .insert({ user_id: user.id, product_id: productId, quantity })
        .select(`*, product:products(id, name, price, image_url, stock_quantity, vendor_id)`)
        .single();

      if (error) {
        console.error('Error adding to cart:', error);
        toast({ title: 'Error', description: 'Failed to add item to cart', variant: 'destructive' });
      } else {
        setItems([...items, data]);
        toast({ title: 'Added to cart', description: 'Item added to your cart' });
      }
    }
  };

  const removeFromCart = async (itemId: string) => {
    // GUEST MODE
    if (!user) {
      const targetItem = items.find(i => i.id === itemId);
      if (!targetItem) return;

      const localItems = getLocalCart().filter(i => i.product_id !== targetItem.product_id);
      setLocalCart(localItems);
      await loadGuestCart();
      toast({ title: 'Removed', description: 'Item removed from cart' });
      return;
    }

    // AUTHENTICATED MODE
    const { error } = await supabase.from('cart_items').delete().eq('id', itemId);

    if (error) {
      console.error('Error removing from cart:', error);
      toast({ title: 'Error', description: 'Failed to remove item', variant: 'destructive' });
    } else {
      setItems(items.filter(item => item.id !== itemId));
      toast({ title: 'Removed', description: 'Item removed from cart' });
    }
  };

  const updateQuantity = async (itemId: string, quantity: number) => {
    if (quantity < 1) {
      await removeFromCart(itemId);
      return;
    }

    // GUEST MODE
    if (!user) {
      const targetItem = items.find(i => i.id === itemId);
      if (!targetItem) return;

      const localItems = getLocalCart().map(i =>
        i.product_id === targetItem.product_id ? { ...i, quantity } : i
      );
      setLocalCart(localItems);
      await loadGuestCart();
      return;
    }

    // AUTHENTICATED MODE
    const { error } = await supabase.from('cart_items').update({ quantity }).eq('id', itemId);

    if (error) {
      console.error('Error updating quantity:', error);
      toast({ title: 'Error', description: 'Failed to update quantity', variant: 'destructive' });
    } else {
      setItems(items.map(item => (item.id === itemId ? { ...item, quantity } : item)));
    }
  };

  const clearCart = async () => {
    // GUEST MODE
    if (!user) {
      clearLocalCart();
      setItems([]);
      return;
    }

    // AUTHENTICATED MODE
    const { error } = await supabase.from('cart_items').delete().eq('user_id', user.id);

    if (error) {
      console.error('Error clearing cart:', error);
    } else {
      setItems([]);
    }
  };

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + (item.product?.price || 0) * item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        loading,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        totalItems,
        subtotal
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
