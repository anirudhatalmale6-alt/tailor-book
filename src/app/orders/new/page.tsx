'use client';

import { Suspense, useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { db, type Customer } from '@/lib/db';
import { addOrder } from '@/hooks/useOrders';
import { addPayment } from '@/hooks/usePayments';
import { fileToBase64 } from '@/lib/utils';
import PhotoUpload from '@/components/PhotoUpload';

export default function NewOrderPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold"></div></div>}>
      <NewOrderForm />
    </Suspense>
  );
}

function NewOrderForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedCustomerId = searchParams.get('customerId');
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const [form, setForm] = useState({
    fabricType: '',
    fabricPhoto: '',
    styleDescription: '',
    styleImages: [] as string[],
    deliveryDate: '',
    totalAmount: '',
    depositAmount: '',
    notes: '',
  });

  useEffect(() => {
    db.customers.orderBy('name').toArray().then(setCustomers);
  }, []);

  useEffect(() => {
    if (preselectedCustomerId && customers.length > 0) {
      const c = customers.find((c) => c.id === preselectedCustomerId);
      if (c) {
        setSelectedCustomer(c);
        setCustomerSearch(c.name);
      }
    }
  }, [preselectedCustomerId, customers]);

  const filteredCustomers = customers.filter((c) =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase())
  );

  function handleChange(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleStyleImages(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    const images: string[] = [...form.styleImages];
    for (let i = 0; i < files.length; i++) {
      const base64 = await fileToBase64(files[i]);
      images.push(base64);
    }
    setForm((prev) => ({ ...prev, styleImages: images }));
  }

  function removeStyleImage(index: number) {
    setForm((prev) => ({
      ...prev,
      styleImages: prev.styleImages.filter((_, i) => i !== index),
    }));
  }

  async function handleSave() {
    if (savingRef.current) return;
    if (!selectedCustomer) {
      alert('Please select a customer');
      return;
    }
    if (!form.totalAmount || parseFloat(form.totalAmount) <= 0) {
      alert('Please enter the total amount');
      return;
    }

    savingRef.current = true;
    setSaving(true);
    try {
      const totalAmount = parseFloat(form.totalAmount);
      const depositAmount = form.depositAmount ? parseFloat(form.depositAmount) : 0;

      const orderId = await addOrder({
        customerId: selectedCustomer.id,
        fabricType: form.fabricType,
        fabricPhoto: form.fabricPhoto,
        styleDescription: form.styleDescription,
        styleImages: form.styleImages,
        deliveryDate: form.deliveryDate,
        status: 'pending',
        totalAmount,
        depositPaid: depositAmount,
        notes: form.notes,
      });

      if (depositAmount > 0) {
        await addPayment({
          orderId,
          customerId: selectedCustomer.id,
          amount: depositAmount,
          type: 'deposit',
          method: 'cash',
          notes: 'Initial deposit',
        });
      }

      router.replace(`/orders/${orderId}`);
    } catch (err) {
      console.error('Failed to save order:', err);
      alert('Failed to save order. Please try again.');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  return (
    <div className="px-4 pt-4">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => router.back()} className="p-1 text-white">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-white">New Order</h1>
      </div>

      <div className="space-y-4">
        {/* Customer Selector */}
        <div className="relative">
          <label className="block text-sm font-medium text-white mb-1">Account Holder *</label>
          <input
            type="text"
            value={customerSearch}
            onChange={(e) => {
              setCustomerSearch(e.target.value);
              setShowCustomerDropdown(true);
              if (selectedCustomer && e.target.value !== selectedCustomer.name) {
                setSelectedCustomer(null);
              }
            }}
            onFocus={() => setShowCustomerDropdown(true)}
            className={`w-full px-4 py-3 bg-royal-card rounded-xl border text-white focus:outline-none focus:ring-2 focus:ring-gold ${
              selectedCustomer ? 'border-green-300' : 'border-royal-border'
            }`}
            placeholder="Search accounts..."
          />
          {showCustomerDropdown && !selectedCustomer && customerSearch && (
            <div className="absolute z-10 w-full mt-1 bg-royal-card rounded-xl shadow-lg shadow-black/20 border border-royal-border max-h-48 overflow-y-auto">
              {filteredCustomers.length > 0 ? (
                filteredCustomers.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setSelectedCustomer(c);
                      setCustomerSearch(c.name);
                      setShowCustomerDropdown(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-royal-hover text-sm text-white"
                  >
                    {c.name} {c.phone ? `- ${c.phone}` : ''}
                  </button>
                ))
              ) : (
                <div className="px-4 py-2 text-sm text-white">No accounts found</div>
              )}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-1">Fabric Type</label>
          <input
            type="text"
            value={form.fabricType}
            onChange={(e) => handleChange('fabricType', e.target.value)}
            className="w-full px-4 py-3 bg-royal-card rounded-xl border border-royal-border text-white focus:outline-none focus:ring-2 focus:ring-gold"
            placeholder="e.g., Senator, Ankara, Lace..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-1">Fabric Photo</label>
          <PhotoUpload
            value={form.fabricPhoto}
            onChange={(v) => handleChange('fabricPhoto', v)}
            className="w-full h-40"
            placeholder="Upload fabric photo"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-1">Style Description</label>
          <textarea
            value={form.styleDescription}
            onChange={(e) => handleChange('styleDescription', e.target.value)}
            className="w-full px-4 py-3 bg-royal-card rounded-xl border border-royal-border text-white focus:outline-none focus:ring-2 focus:ring-gold resize-none"
            rows={3}
            placeholder="Describe the style, design details..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-1">Style Reference Images</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {form.styleImages.map((img, i) => (
              <div key={i} className="relative w-20 h-20">
                <img src={img} alt={`Style ${i + 1}`} className="w-full h-full object-cover rounded-lg" />
                <button
                  onClick={() => removeStyleImage(i)}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-red-400 text-white rounded-full flex items-center justify-center text-xs"
                >
                  X
                </button>
              </div>
            ))}
          </div>
          <label className="inline-flex items-center gap-2 px-4 py-2 bg-royal-hover rounded-lg text-sm text-white cursor-pointer hover:bg-gray-200">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Images
            <input type="file" accept="image/*" multiple onChange={handleStyleImages} className="hidden" />
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-1">Delivery Date</label>
          <input
            type="date"
            value={form.deliveryDate}
            onChange={(e) => handleChange('deliveryDate', e.target.value)}
            className="w-full px-4 py-3 bg-royal-card rounded-xl border border-royal-border text-white focus:outline-none focus:ring-2 focus:ring-gold"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-white mb-1">Total Amount *</label>
            <input
              type="number"
              value={form.totalAmount}
              onChange={(e) => handleChange('totalAmount', e.target.value)}
              className="w-full px-4 py-3 bg-royal-card rounded-xl border border-royal-border text-white focus:outline-none focus:ring-2 focus:ring-gold"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white mb-1">Deposit</label>
            <input
              type="number"
              value={form.depositAmount}
              onChange={(e) => handleChange('depositAmount', e.target.value)}
              className="w-full px-4 py-3 bg-royal-card rounded-xl border border-royal-border text-white focus:outline-none focus:ring-2 focus:ring-gold"
              placeholder="0"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-1">Notes</label>
          <textarea
            value={form.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            className="w-full px-4 py-3 bg-royal-card rounded-xl border border-royal-border text-white focus:outline-none focus:ring-2 focus:ring-gold resize-none"
            rows={2}
            placeholder="Additional notes..."
          />
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3 bg-gradient-to-r from-gold-dim to-gold text-white rounded-xl font-semibold hover:bg-gold-dim active:bg-gold-dim disabled:opacity-50 transition-colors"
        >
          {saving ? 'Creating Order...' : 'Create Order'}
        </button>
      </div>
    </div>
  );
}
