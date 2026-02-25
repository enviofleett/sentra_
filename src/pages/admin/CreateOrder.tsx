import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Search, Plus, Trash2, UserPlus, Calculator, Loader2, ArrowLeft, Download, CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { generateInvoice } from '@/utils/invoiceGenerator';
import { calculateVat, calculateTotalWithVat, extractVatFromTotal } from '@/utils/vat';
import { z } from 'zod';

const shippingSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  address: z.string().min(5, "Address is required"),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
  phone: z.string().min(10, "Phone number is invalid"),
  country: z.string().default('Nigeria')
});

interface Product {
  id: string;
  name: string;
  price: number;
  stock_quantity: number | null;
  image_url: string | null;
  sku?: string | null;
}

interface CartItem {
  product: Product;
  quantity: number;
}

interface UserProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
}

export function CreateOrder() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [searchingUser, setSearchingUser] = useState(false);
  const [searchingProduct, setSearchingProduct] = useState(false);
  
  // User Selection
  const [userQuery, setUserQuery] = useState('');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [isNewUser, setIsNewUser] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');
  
  // Product Selection
  const [productQuery, setProductQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  
  // Order Details
  const [shippingAddress, setShippingAddress] = useState({
    fullName: '',
    address: '',
    city: '',
    state: '',
    phone: '',
    country: 'Nigeria'
  });
  
  // VAT
  const [vatRate, setVatRate] = useState(7.5);

  // Success State
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [createdOrderData, setCreatedOrderData] = useState<any>(null); // Use any to allow virtual_account_details for now
  const [generatingInvoice, setGeneratingInvoice] = useState(false);

  useEffect(() => {
    fetchVatRate();
  }, []);

  const fetchVatRate = async () => {
    const { data } = await supabase
      .from('vat_settings' as any)
      .select('rate')
      .eq('is_active', true)
      .maybeSingle();
    
    if (data) {
      setVatRate(Number((data as any).rate));
    }
  };

  // User Search
  useEffect(() => {
    if (!userQuery || selectedUser) return;
    
    const timer = setTimeout(async () => {
      setSearchingUser(true);
      // Note: searching profiles by name. Email is in auth.users which is hard to search from client without edge function or secure view.
      // Assuming profiles has email or we search by name.
      // Actually, profiles table usually has id, full_name. Email is not always there.
      // We might need to rely on full_name or add email to profiles if not present.
      // Checking profiles schema... assuming full_name exists.
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .ilike('full_name', `%${userQuery}%`)
        .limit(5);
        
      if (data) setUsers(data as any);
      setSearchingUser(false);
    }, 500);
    
    return () => clearTimeout(timer);
  }, [userQuery, selectedUser]);

  // Product Search
  useEffect(() => {
    if (!productQuery) return;
    
    const timer = setTimeout(async () => {
      setSearchingProduct(true);
      const { data, error } = await supabase
        .from('products')
        .select('id, name, price, stock_quantity, image_url, sku')
        .ilike('name', `%${productQuery}%`)
        .limit(10);
        
      if (data) setProducts(data);
      setSearchingProduct(false);
    }, 500);
    
    return () => clearTimeout(timer);
  }, [productQuery]);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.product.id === product.id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    setProductQuery(''); // Clear search
    setProducts([]);
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity < 1) return;
    setCart(prev => prev.map(item => 
      item.product.id === productId ? { ...item, quantity } : item
    ));
  };

  const handleUserSelect = (user: UserProfile) => {
    setSelectedUser(user);
    setShippingAddress({
      fullName: user.full_name || '',
      address: user.address || '',
      city: user.city || '',
      state: user.state || '',
      phone: user.phone || '',
      country: 'Nigeria'
    });
    setUsers([]);
    setUserQuery('');
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const vatAmount = calculateVat(subtotal, vatRate);
  const total = subtotal + vatAmount;

  const handlePlaceOrder = async () => {
    try {
      if (!selectedUser && !isNewUser) {
        throw new Error('Please select or create a user');
      }
      if (cart.length === 0) {
        throw new Error('Cart is empty');
      }
      
      // Validate Shipping Address
      const validation = shippingSchema.safeParse(shippingAddress);
      if (!validation.success) {
        const errorMsg = validation.error.errors[0].message;
        throw new Error(errorMsg);
      }
      
      // Validate New User
      if (isNewUser) {
        if (!newUserEmail || !newUserEmail.includes('@')) throw new Error('Valid email is required');
        if (!newUserName) throw new Error('Full name is required');
      }

      setLoading(true);
      let userId = selectedUser?.id;

      // Create new user if needed
      if (isNewUser) {
        // Call edge function to create user
        const { data: newUser, error: createError } = await supabase.functions.invoke('admin-create-user', {
          body: { email: newUserEmail, fullName: newUserName }
        });

        if (createError || !newUser) throw new Error(createError?.message || 'Failed to create user');
        userId = newUser.id;
      }

      if (!userId) throw new Error('User ID missing');

      // --- 1. Paystack Virtual Account Generation (Pre-Order) ---
      let dvaData = null;
      try {
        // Validation
        if (!shippingAddress.phone || shippingAddress.phone.length < 10) {
           throw new Error("Valid phone number is required for payment account generation");
        }

        // Prepare customer data for DVA creation
        const customerData = {
          email: selectedUser?.email || newUserEmail,
          first_name: shippingAddress.fullName.split(' ')[0] || 'Customer',
          last_name: shippingAddress.fullName.split(' ').slice(1).join(' ') || 'User',
          phone: shippingAddress.phone
        };

        const { data, error: invokeError } = await supabase.functions.invoke('paystack-create-virtual-account', {
          body: customerData
        });

        if (invokeError) {
           console.error('Edge Function Error:', invokeError);
           // Try to parse the error message if it's a string or object
           let msg = invokeError.message || "Unknown error";
           if (invokeError.context && typeof invokeError.context.json === 'function') {
               try {
                   const errBody = await invokeError.context.json();
                   if (errBody.error) msg = errBody.error;
               } catch (e) { /* ignore */ }
           }
           throw new Error(msg);
        }

        if (!data) {
           throw new Error("No data returned from payment service");
        }
        
        // Check if data has error field (in case function returned 200 but with error, though my function returns 400)
        if (data.error) {
            throw new Error(data.error);
        }

        dvaData = data;
        toast.success('Virtual Account Generated');

      } catch (dvaErr: any) {
        console.error('Error in DVA generation flow:', dvaErr);
        // Show the specific error message from the backend
        toast.error(`Payment Account Error: ${dvaErr.message}`);
        setLoading(false);
        return; // STOP execution
      }
      // -----------------------------------------------------------

      // Create Order
      const orderPayload = {
        user_id: userId,
        total_amount: total,
        subtotal: subtotal,
        tax: vatAmount,
        shipping_cost: 0,
        status: 'pending',
        payment_status: 'pending',
        shipping_address: shippingAddress,
        billing_address: shippingAddress,
        customer_email: selectedUser?.email || newUserEmail,
        virtual_account_details: dvaData, // Store directly
        items: cart.map(item => ({
          product_id: item.product.id,
          name: item.product.name,
          quantity: item.quantity,
          price: item.product.price,
          image_url: item.product.image_url,
          // vendor_id: (item.product as any).vendor_id // If needed
        }))
      };

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert(orderPayload as any)
        .select()
        .single();

      if (orderError) throw orderError;


      setCreatedOrderData(order);
      setOrderSuccess(true);
      toast.success('Order created successfully');
      // navigate(`/admin/orders`); // Don't redirect immediately

    } catch (error: any) {
      console.error('Error creating order:', error);
      toast.error(error.message || 'Failed to create order');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadInvoice = async () => {
    if (!createdOrderData) return;
    setGeneratingInvoice(true);
    
    try {
      // 1. Fetch VAT rate used (we have vatRate state, but ideally should be from order if stored)
      // 2. Use stored subtotal and vat amount if available
      const orderTotal = createdOrderData.total_amount;
      const subtotal = createdOrderData.subtotal || (orderTotal / (1 + vatRate / 100));
      const vatAmount = createdOrderData.tax || (orderTotal - subtotal);

      // 3. Try to get Paystack Payment Link
      let paymentRef = createdOrderData.id;
      let paystackUrl = '';
      
      try {
        const { data: paystackData, error } = await supabase.functions.invoke('paystack-init-transaction', {
          body: {
            email: createdOrderData.customer_email,
            amount: orderTotal,
            reference: createdOrderData.id,
            callback_url: `${window.location.origin}/payment-callback` // Placeholder
          }
        });
        
        if (paystackData?.authorization_url) {
          paystackUrl = paystackData.authorization_url;
          paymentRef = paystackData.reference;
        }
      } catch (err) {
        console.warn('Failed to init Paystack transaction for invoice', err);
      }

      // 4. Generate PDF
      // Note: We need items details. createdOrderData.items is JSONB from the order insert.
      // It should match the structure we inserted.
      const items = createdOrderData.items || [];
      
      // Determine Virtual Account to display
      // Priority: 1. Stored in Order (DVA) 2. Calculated above (none)
      const virtualAccount = createdOrderData.virtual_account_details ? {
          bankName: createdOrderData.virtual_account_details.bank_name,
          accountNumber: createdOrderData.virtual_account_details.account_number,
          accountName: createdOrderData.virtual_account_details.account_name
      } : (paystackUrl ? {
          bankName: "Paystack Checkout",
          accountNumber: "Click Link",
          accountName: "Online Payment"
      } : undefined);

      generateInvoice({
        orderId: createdOrderData.id,
        customerName: createdOrderData.shipping_address?.fullName || 'Customer',
        customerEmail: createdOrderData.customer_email,
        customerAddress: `${createdOrderData.shipping_address?.address || ''}, ${createdOrderData.shipping_address?.city || ''}`,
        date: new Date(createdOrderData.created_at),
        dueDate: new Date(new Date(createdOrderData.created_at).getTime() + 24 * 60 * 60 * 1000),
        items: items.map((item: any) => ({
          description: item.name,
          quantity: item.quantity,
          price: item.price,
          total: item.price * item.quantity
        })),
        subtotal: subtotal,
        vatRate: vatRate,
        vatAmount: vatAmount,
        total: orderTotal,
        paymentRef: paymentRef,
        paymentLink: paystackUrl,
        virtualAccount: virtualAccount
      });
      
      toast.success('Invoice downloaded');
    } catch (error) {
      console.error('Error generating invoice:', error);
      toast.error('Failed to generate invoice');
    } finally {
      setGeneratingInvoice(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/admin/orders')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        <h1 className="text-3xl font-bold">Create New Order</h1>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Left Column: User & Products */}
        <div className="md:col-span-2 space-y-6">
          
          {/* User Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>Customer Details</span>
                <Button variant="outline" size="sm" onClick={() => {
                  setIsNewUser(!isNewUser);
                  setSelectedUser(null);
                  setUserQuery('');
                }}>
                  {isNewUser ? 'Select Existing' : <><UserPlus className="h-4 w-4 mr-2" /> New Customer</>}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isNewUser ? (
                <div className="grid gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Full Name</Label>
                      <Input 
                        value={newUserName} 
                        onChange={(e) => setNewUserName(e.target.value)} 
                        placeholder="John Doe"
                      />
                    </div>
                    <div>
                      <Label>Email</Label>
                      <Input 
                        type="email" 
                        value={newUserEmail} 
                        onChange={(e) => setNewUserEmail(e.target.value)} 
                        placeholder="john@example.com"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  {selectedUser ? (
                    <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/20">
                      <div>
                        <p className="font-medium">{selectedUser.full_name}</p>
                        <p className="text-sm text-muted-foreground">{selectedUser.email || 'No email'}</p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedUser(null)}>Change</Button>
                    </div>
                  ) : (
                    <div>
                      <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search customers..."
                          className="pl-8"
                          value={userQuery}
                          onChange={(e) => setUserQuery(e.target.value)}
                        />
                      </div>
                      {users.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-popover border rounded-md shadow-md">
                          {users.map(u => (
                            <div 
                              key={u.id} 
                              className="p-2 hover:bg-accent cursor-pointer text-sm"
                              onClick={() => handleUserSelect(u)}
                            >
                              <p className="font-medium">{u.full_name}</p>
                              <p className="text-xs text-muted-foreground">{u.email}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Shipping Address */}
              <div className="pt-4 border-t">
                <h3 className="font-medium mb-3">Shipping Address</h3>
                <div className="grid gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Full Name</Label>
                      <Input 
                        value={shippingAddress.fullName} 
                        onChange={(e) => setShippingAddress({...shippingAddress, fullName: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label>Phone</Label>
                      <Input 
                        value={shippingAddress.phone} 
                        onChange={(e) => setShippingAddress({...shippingAddress, phone: e.target.value})}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Address</Label>
                    <Input 
                      value={shippingAddress.address} 
                      onChange={(e) => setShippingAddress({...shippingAddress, address: e.target.value})}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>City</Label>
                      <Input 
                        value={shippingAddress.city} 
                        onChange={(e) => setShippingAddress({...shippingAddress, city: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label>State</Label>
                      <Input 
                        value={shippingAddress.state} 
                        onChange={(e) => setShippingAddress({...shippingAddress, state: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label>Country</Label>
                      <Input 
                        value={shippingAddress.country} 
                        disabled
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Product Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Add Products</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative mb-4">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products by name..."
                  className="pl-8"
                  value={productQuery}
                  onChange={(e) => setProductQuery(e.target.value)}
                />
                {products.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-popover border rounded-md shadow-md max-h-60 overflow-y-auto">
                    {products.map(p => (
                      <div 
                        key={p.id} 
                        className="p-2 hover:bg-accent cursor-pointer text-sm flex justify-between items-center"
                        onClick={() => addToCart(p)}
                      >
                        <div className="flex items-center gap-2">
                          {p.image_url && <img src={p.image_url} alt="" className="h-8 w-8 rounded object-cover" />}
                          <div>
                            <p className="font-medium">{p.name}</p>
                            <p className="text-xs text-muted-foreground">Stock: {p.stock_quantity}</p>
                          </div>
                        </div>
                        <span className="font-bold">₦{p.price.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {cart.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="w-[100px]">Price</TableHead>
                      <TableHead className="w-[100px]">Qty</TableHead>
                      <TableHead className="w-[100px]">Total</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cart.map(item => (
                      <TableRow key={item.product.id}>
                        <TableCell className="font-medium">{item.product.name}</TableCell>
                        <TableCell>₦{item.product.price.toLocaleString()}</TableCell>
                        <TableCell>
                          <Input 
                            type="number" 
                            min="1" 
                            className="h-8 w-16" 
                            value={item.quantity}
                            onChange={(e) => updateQuantity(item.product.id, parseInt(e.target.value) || 1)}
                          />
                        </TableCell>
                        <TableCell>₦{(item.product.price * item.quantity).toLocaleString()}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => removeFromCart(item.product.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No items added yet. Search for products above.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Summary */}
        <div className="md:col-span-1">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>₦{subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">VAT ({vatRate}%)</span>
                  <span>₦{vatAmount.toLocaleString()}</span>
                </div>
                <div className="pt-2 border-t flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>₦{total.toLocaleString()}</span>
                </div>
              </div>

              <Button 
                className="w-full" 
                size="lg" 
                onClick={handlePlaceOrder}
                disabled={loading || cart.length === 0 || (!selectedUser && !isNewUser)}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Calculator className="h-4 w-4 mr-2" />}
                Place Order
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={orderSuccess} onOpenChange={setOrderSuccess}>
        <DialogContent className="sm:max-w-lg bg-background p-6 rounded-lg shadow-lg border border-border">
          <DialogHeader className="space-y-3 items-center text-center">
            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mb-2">
              <CheckCircle className="h-6 w-6 text-green-600" aria-hidden="true" />
            </div>
            <DialogTitle className="text-xl font-semibold text-foreground">
              Order Created Successfully
            </DialogTitle>
            <DialogDescription className="text-base text-muted-foreground max-w-sm mx-auto">
              Order <span className="font-medium text-foreground">#{createdOrderData?.id?.slice(0, 8).toUpperCase()}</span> has been created for <span className="font-medium text-foreground">{createdOrderData?.customer_email}</span>.
            </DialogDescription>
          </DialogHeader>

          <div className="py-6 space-y-4">
             <div className="bg-muted/30 p-4 rounded-md text-sm text-muted-foreground text-center border border-muted">
               <p className="leading-relaxed">
                 You can now download the invoice or return to the orders list.
                 The invoice includes payment instructions and a Paystack payment link.
               </p>
             </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-3 sm:gap-2 sm:justify-end w-full">
             <Button 
              variant="outline" 
              onClick={() => navigate('/admin/orders')}
              className="w-full sm:w-auto order-2 sm:order-1"
            >
              View All Orders
            </Button>
            
            <Button 
              variant="secondary" 
              onClick={() => {
                setOrderSuccess(false);
                setCart([]);
                setSelectedUser(null);
                setIsNewUser(false);
                setNewUserEmail('');
                setNewUserName('');
                setShippingAddress({
                  fullName: '', address: '', city: '', state: '', phone: '', country: 'Nigeria'
                });
              }}
              className="w-full sm:w-auto order-3 sm:order-2"
            >
              Create Another
            </Button>

            <Button 
              onClick={handleDownloadInvoice} 
              disabled={generatingInvoice}
              className="w-full sm:w-auto order-1 sm:order-3 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {generatingInvoice ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
              Download Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
