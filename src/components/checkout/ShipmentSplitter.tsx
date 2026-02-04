
import { useState, useEffect, useMemo } from 'react';
import { Address } from './AddressBook';
import { ManualShipmentForm } from './ManualShipmentForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Package, Truck, MapPin, CheckCircle2, Edit2, Plus, ArrowRight } from 'lucide-react';
import { getProductWeight } from '@/utils/shippingCalculator';

interface CartItem {
  product_id: string;
  quantity: number;
  product?: {
    id: string;
    name: string;
    price: number;
    weight?: number | null;
    size?: string | null;
    vendor_id?: string | null;
  };
}

interface ShipmentSplitterProps {
  items: CartItem[];
  onShipmentsChange: (shipments: ShipmentGroup[]) => void;
}

export interface ShipmentGroup {
  id: string;
  address: Address;
  items: Array<{
    product_id: string;
    quantity: number;
    name: string;
    weight: number;
    vendor_id?: string | null;
    product: any; // Keep ref to original product
  }>;
}

// Helper to generate unique ID
const uid = () => Math.random().toString(36).substr(2, 9);

export function ShipmentSplitter({ items, onShipmentsChange }: ShipmentSplitterProps) {
  // "Explode" items into individual units
  const [units, setUnits] = useState<Array<{
    id: string;
    productId: string;
    productName: string;
    product: any;
    assignedAddressId: string | null;
  }>>([]);

  // Store addresses created manually in this session (or fetched if we wanted)
  const [manualDestinations, setManualDestinations] = useState<Address[]>([]);
  
  // Controls for the manual form dialog
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [activeUnitId, setActiveUnitId] = useState<string | null>(null); // If assigning a specific unit
  const [isBulkAssign, setIsBulkAssign] = useState(false); // If assigning all
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null); // If editing an existing destination

  // Initialize units
  useEffect(() => {
    const newUnits: typeof units = [];
    items.forEach(item => {
      for (let i = 0; i < item.quantity; i++) {
        newUnits.push({
          id: uid(),
          productId: item.product_id,
          productName: item.product?.name || 'Unknown Item',
          product: item.product,
          assignedAddressId: null
        });
      }
    });
    setUnits(newUnits);
  }, [items]);

  // Group units by address and notify parent
  useEffect(() => {
    if (units.length === 0) return;

    const groups: Record<string, ShipmentGroup> = {};

    units.forEach(unit => {
      if (!unit.assignedAddressId) return;

      const address = manualDestinations.find(a => a.id === unit.assignedAddressId);
      if (!address) return;

      if (!groups[unit.assignedAddressId]) {
        groups[unit.assignedAddressId] = {
          id: `shipment-${unit.assignedAddressId}`,
          address: address,
          items: []
        };
      }

      const existingItem = groups[unit.assignedAddressId].items.find(i => i.product_id === unit.productId);
      if (existingItem) {
        existingItem.quantity += 1;
      } else {
        groups[unit.assignedAddressId].items.push({
          product_id: unit.productId,
          quantity: 1,
          name: unit.productName,
          weight: getProductWeight(unit.product),
          vendor_id: unit.product?.vendor_id,
          product: unit.product
        });
      }
    });

    onShipmentsChange(Object.values(groups));
  }, [units, manualDestinations]);

  // Handlers for opening the form
  const openAssignForm = (unitId: string) => {
    setActiveUnitId(unitId);
    setIsBulkAssign(false);
    setEditingAddressId(null);
    setIsFormOpen(true);
  };

  const openBulkAssignForm = () => {
    setActiveUnitId(null);
    setIsBulkAssign(true);
    setEditingAddressId(null);
    setIsFormOpen(true);
  };

  const openEditForm = (addressId: string) => {
    setEditingAddressId(addressId);
    setActiveUnitId(null);
    setIsBulkAssign(false);
    setIsFormOpen(true);
  };

  // Handler for saving an address from the form
  const handleAddressSave = (newAddress: Address) => {
    // 1. Add or Update in local state
    setManualDestinations(prev => {
      const exists = prev.findIndex(a => a.id === newAddress.id);
      if (exists >= 0) {
        const updated = [...prev];
        updated[exists] = newAddress;
        return updated;
      }
      return [...prev, newAddress];
    });

    // 2. Assign to units
    if (isBulkAssign) {
      setUnits(prev => prev.map(u => ({ ...u, assignedAddressId: newAddress.id })));
    } else if (activeUnitId) {
      setUnits(prev => prev.map(u => 
        u.id === activeUnitId ? { ...u, assignedAddressId: newAddress.id } : u
      ));
    }
    // If just editing, the assignment ID stays the same, so no unit update needed
  };

  // Handler for selecting an existing destination for a unit (re-use)
  const handleReuseAddress = (unitId: string, addressId: string) => {
    if (addressId === 'new') {
      openAssignForm(unitId);
    } else {
      setUnits(prev => prev.map(u => 
        u.id === unitId ? { ...u, assignedAddressId: addressId } : u
      ));
    }
  };

  const handleBulkReuse = (addressId: string) => {
    if (addressId === 'new') {
      openBulkAssignForm();
    } else {
      setUnits(prev => prev.map(u => ({ ...u, assignedAddressId: addressId })));
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Assign Items to Shipments</CardTitle>
          <Button variant="outline" size="sm" onClick={openBulkAssignForm}>
            Assign All to New Address
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-end mb-4">
              <Select onValueChange={handleBulkReuse}>
                <SelectTrigger className="w-[240px]">
                  <SelectValue placeholder="Bulk Assign..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">
                    <span className="flex items-center text-primary font-medium">
                      <Plus className="h-3 w-3 mr-2" /> New Destination
                    </span>
                  </SelectItem>
                  {manualDestinations.map(a => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.label} - {a.city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
          </div>

          <div className="space-y-3">
            {units.map((unit, index) => {
              const assignedAddr = manualDestinations.find(a => a.id === unit.assignedAddressId);
              
              return (
                <div key={unit.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-lg bg-card hover:bg-accent/5 transition-colors gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-xs shrink-0">
                      {index + 1}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm sm:text-base truncate">{unit.productName}</p>
                      <p className="text-xs text-muted-foreground">Unit #{index + 1}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                    {assignedAddr && (
                       <Button 
                         variant="ghost" 
                         size="icon" 
                         className="h-10 w-10 sm:h-9 sm:w-9 shrink-0"
                         onClick={() => openEditForm(assignedAddr.id)}
                         title="Edit Destination Details"
                       >
                         <Edit2 className="h-4 w-4 text-muted-foreground" />
                       </Button>
                    )}
                    
                    <Select 
                      value={unit.assignedAddressId || ''} 
                      onValueChange={(val) => handleReuseAddress(unit.id, val)}
                    >
                      <SelectTrigger className="w-full sm:w-[240px] h-10 sm:h-10">
                        <span className="truncate flex-1 text-left">
                          {assignedAddr 
                            ? `${assignedAddr.full_name} (${assignedAddr.city})`
                            : <span className="text-muted-foreground">Select Destination</span>
                          }
                        </span>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new" className="h-10">
                          <span className="flex items-center text-primary font-medium">
                            <Plus className="h-3 w-3 mr-2" /> New Destination
                          </span>
                        </SelectItem>
                        {manualDestinations.map(a => (
                          <SelectItem key={a.id} value={a.id} className="h-10">
                            <span className="flex items-center justify-between w-full gap-2 min-w-0">
                               <span className="truncate">{a.full_name} ({a.city})</span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 p-4 bg-secondary/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="font-medium text-sm">Assignment Status</span>
            </div>
            <div className="flex flex-wrap gap-4 text-sm">
                <span className="text-muted-foreground">Total Units: {units.length}</span>
                <span className={units.every(u => u.assignedAddressId) ? "text-green-600 font-medium" : "text-amber-600"}>
                  Assigned: {units.filter(u => u.assignedAddressId).length}
                </span>
                <span className="text-muted-foreground">Remaining: {units.filter(u => !u.assignedAddressId).length}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <ManualShipmentForm 
        open={isFormOpen} 
        onOpenChange={setIsFormOpen}
        onSave={handleAddressSave}
        initialData={editingAddressId ? manualDestinations.find(a => a.id === editingAddressId) : null}
      />
    </div>
  );
}
