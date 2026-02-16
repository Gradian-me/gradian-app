'use client';

import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createPurchaseOrderSchema } from '@/lib/validations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RepeatingSection } from '@/gradian-ui/shared/components';
import { Plus, Trash2 } from 'lucide-react';

interface PurchaseOrderFormProps {
  onSubmit: (data: any) => void;
  onCancel: () => void;
  isLoading?: boolean;
  vendors?: any[];
}

export function PurchaseOrderForm({ onSubmit, onCancel, isLoading = false, vendors = [] }: PurchaseOrderFormProps) {
  const [selectedVendor, setSelectedVendor] = useState<any>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    setValue,
    watch,
  } = useForm({
    resolver: zodResolver(createPurchaseOrderSchema),
    defaultValues: {
      vendorId: '',
      tenderId: '',
      quotationId: '',
      paymentTerms: 'Net 30 days',
      deliveryTerms: 'FOB Destination',
      expectedDeliveryDate: new Date(),
      items: [
        {
          productName: '',
          description: '',
          quantity: 1,
          unit: 'piece',
          unitPrice: 0,
          specifications: '',
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  const addItem = () => {
    append({
      productName: '',
      description: '',
      quantity: 1,
      unit: 'piece',
      unitPrice: 0,
      specifications: '',
    });
  };

  const handleFormSubmit = (data: any) => {
    onSubmit(data);
  };

  const watchedItems = watch('items');
  const subtotal = watchedItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  const taxRate = 9; // 9% tax rate
  const tax = subtotal * (taxRate / 100);
  const total = subtotal + tax;

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Vendor Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Vendor Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="vendorId">Select Vendor *</Label>
            <Select onValueChange={(value) => {
              setValue('vendorId', value);
              const vendor = vendors.find(v => v.id === value);
              setSelectedVendor(vendor);
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Select a vendor" />
              </SelectTrigger>
              <SelectContent>
                {vendors.map((vendor) => (
                  <SelectItem key={vendor.id} value={vendor.id}>
                    {vendor.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.vendorId && (
              <p className="text-xs text-red-600 mt-1">{errors.vendorId.message}</p>
            )}
          </div>
          {selectedVendor && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Selected Vendor Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <div><span className="font-medium">Name:</span> {selectedVendor.name}</div>
                <div><span className="font-medium">Email:</span> {selectedVendor.email}</div>
                <div><span className="font-medium">Phone:</span> {selectedVendor.phone}</div>
                <div><span className="font-medium">Rating:</span> {selectedVendor.rating}/5</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Terms and Conditions */}
      <Card>
        <CardHeader>
          <CardTitle>Terms and Conditions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="paymentTerms">Payment Terms *</Label>
              <Select onValueChange={(value) => setValue('paymentTerms', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select payment terms" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Net 15 days">Net 15 days</SelectItem>
                  <SelectItem value="Net 30 days">Net 30 days</SelectItem>
                  <SelectItem value="Net 45 days">Net 45 days</SelectItem>
                  <SelectItem value="Net 60 days">Net 60 days</SelectItem>
                  <SelectItem value="COD">Cash on Delivery</SelectItem>
                </SelectContent>
              </Select>
              {errors.paymentTerms && (
                <p className="text-xs text-red-600 mt-1">{errors.paymentTerms.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="deliveryTerms">Delivery Terms *</Label>
              <Select onValueChange={(value) => setValue('deliveryTerms', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select delivery terms" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FOB Origin">FOB Origin</SelectItem>
                  <SelectItem value="FOB Destination">FOB Destination</SelectItem>
                  <SelectItem value="CIF">CIF (Cost, Insurance, Freight)</SelectItem>
                  <SelectItem value="EXW">EXW (Ex Works)</SelectItem>
                </SelectContent>
              </Select>
              {errors.deliveryTerms && (
                <p className="text-xs text-red-600 mt-1">{errors.deliveryTerms.message}</p>
              )}
            </div>
          </div>
          <div>
            <Label htmlFor="expectedDeliveryDate">Expected Delivery Date *</Label>
            <Input
              id="expectedDeliveryDate"
              type="date"
              {...register('expectedDeliveryDate')}
            />
            {errors.expectedDeliveryDate && (
              <p className="text-xs text-red-600 mt-1">{errors.expectedDeliveryDate.message}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Purchase Order Items */}
      <RepeatingSection
        title="Purchase Order Items"
        items={fields}
        onAdd={addItem}
        onRemove={remove}
        minItems={1}
        renderItem={(item, index) => (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor={`items.${index}.productName`}>Product Name *</Label>
                <Input
                  {...register(`items.${index}.productName`)}
                  placeholder="Enter product name"
                />
                {errors.items?.[index]?.productName && (
                  <p className="text-xs text-red-600 mt-1">
                    {errors.items[index]?.productName?.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor={`items.${index}.quantity`}>Quantity *</Label>
                <Input
                  type="number"
                  {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                  placeholder="Enter quantity"
                />
                {errors.items?.[index]?.quantity && (
                  <p className="text-xs text-red-600 mt-1">
                    {errors.items[index]?.quantity?.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor={`items.${index}.unit`}>Unit *</Label>
                <Select onValueChange={(value) => setValue(`items.${index}.unit`, value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="piece">Piece</SelectItem>
                    <SelectItem value="kg">Kilogram</SelectItem>
                    <SelectItem value="L">Liter</SelectItem>
                    <SelectItem value="box">Box</SelectItem>
                    <SelectItem value="set">Set</SelectItem>
                  </SelectContent>
                </Select>
                {errors.items?.[index]?.unit && (
                  <p className="text-xs text-red-600 mt-1">
                    {errors.items[index]?.unit?.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor={`items.${index}.unitPrice`}>Unit Price *</Label>
                <Input
                  type="number"
                  step="0.01"
                  {...register(`items.${index}.unitPrice`, { valueAsNumber: true })}
                  placeholder="Enter unit price"
                />
                {errors.items?.[index]?.unitPrice && (
                  <p className="text-xs text-red-600 mt-1">
                    {errors.items[index]?.unitPrice?.message}
                  </p>
                )}
              </div>
            </div>
            <div>
              <Label htmlFor={`items.${index}.description`}>Description *</Label>
              <Textarea
                {...register(`items.${index}.description`)}
                placeholder="Enter item description"
                rows={2}
              />
              {errors.items?.[index]?.description && (
                <p className="text-xs text-red-600 mt-1">
                  {errors.items[index]?.description?.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor={`items.${index}.specifications`}>Specifications</Label>
              <Textarea
                {...register(`items.${index}.specifications`)}
                placeholder="Enter technical specifications (optional)"
                rows={2}
              />
            </div>
          </div>
        )}
      />

      {/* Order Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Order Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Tax ({taxRate}%):</span>
              <span>${tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg border-t pt-2">
              <span>Total:</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Form Actions */}
      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Creating...' : 'Create Purchase Order'}
        </Button>
      </div>
    </form>
  );
}
