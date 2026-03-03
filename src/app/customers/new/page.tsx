'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { addCustomer, updateCustomer } from '@/hooks/useCustomers';
import { db } from '@/lib/db';
import PhotoUpload from '@/components/PhotoUpload';

export default function NewCustomerPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold"></div></div>}>
      <NewCustomerForm />
    </Suspense>
  );
}

function NewCustomerForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: '',
    phone: '',
    whatsapp: '',
    email: '',
    address: '',
    photo: '',
    notes: '',
    stylePreferences: '',
    contactType: 'client' as 'client' | 'colleague',
  });

  useEffect(() => {
    if (editId) {
      db.customers.get(editId).then((customer) => {
        if (customer) {
          setForm({
            name: customer.name,
            phone: customer.phone,
            whatsapp: customer.whatsapp,
            email: customer.email,
            address: customer.address,
            photo: customer.photo,
            notes: customer.notes,
            stylePreferences: customer.stylePreferences,
            contactType: customer.contactType || 'client',
          });
        }
      });
    }
  }, [editId]);

  function handleChange(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    if (!form.name.trim()) {
      alert('Please enter a customer name');
      return;
    }
    setSaving(true);
    try {
      if (editId) {
        await updateCustomer(editId, form);
        router.back();
      } else {
        const id = await addCustomer(form);
        router.replace(`/customers/${id}`);
      }
    } catch (err) {
      console.error('Failed to save customer:', err);
      alert('Failed to save customer. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="px-4 pt-4">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => router.back()} className="p-1 text-royal-light">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-white">
          {editId ? 'Edit Customer' : 'New Customer'}
        </h1>
      </div>

      <div className="space-y-4">
        <div className="flex justify-center">
          <PhotoUpload
            value={form.photo}
            onChange={(v) => handleChange('photo', v)}
            className="w-28 h-28"
            placeholder="Add Photo"
          />
        </div>

        {/* Contact Type Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-200 mb-1">This person is a...</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setForm((p) => ({ ...p, contactType: 'client' }))}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                form.contactType === 'client'
                  ? 'bg-gold-bg border-indigo-300 text-gold-dim'
                  : 'bg-royal-card border-royal-border text-royal-light'
              }`}
            >
              Client
            </button>
            <button
              type="button"
              onClick={() => setForm((p) => ({ ...p, contactType: 'colleague' }))}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                form.contactType === 'colleague'
                  ? 'bg-amber-50 border-amber-300 text-gold'
                  : 'bg-royal-card border-royal-border text-royal-light'
              }`}
            >
              Colleague (Tailor)
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-200 mb-1">Name *</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => handleChange('name', e.target.value)}
            className="w-full px-4 py-3 bg-royal-card rounded-xl border border-royal-border text-white focus:outline-none focus:ring-2 focus:ring-gold"
            placeholder="Customer name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-200 mb-1">Phone</label>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            className="w-full px-4 py-3 bg-royal-card rounded-xl border border-royal-border text-white focus:outline-none focus:ring-2 focus:ring-gold"
            placeholder="Phone number"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-200 mb-1">WhatsApp</label>
          <input
            type="tel"
            value={form.whatsapp}
            onChange={(e) => handleChange('whatsapp', e.target.value)}
            className="w-full px-4 py-3 bg-royal-card rounded-xl border border-royal-border text-white focus:outline-none focus:ring-2 focus:ring-gold"
            placeholder="WhatsApp number"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-200 mb-1">Email</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => handleChange('email', e.target.value)}
            className="w-full px-4 py-3 bg-royal-card rounded-xl border border-royal-border text-white focus:outline-none focus:ring-2 focus:ring-gold"
            placeholder="Email address"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-200 mb-1">Address</label>
          <textarea
            value={form.address}
            onChange={(e) => handleChange('address', e.target.value)}
            className="w-full px-4 py-3 bg-royal-card rounded-xl border border-royal-border text-white focus:outline-none focus:ring-2 focus:ring-gold resize-none"
            rows={2}
            placeholder="Address"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-200 mb-1">Style Preferences</label>
          <textarea
            value={form.stylePreferences}
            onChange={(e) => handleChange('stylePreferences', e.target.value)}
            className="w-full px-4 py-3 bg-royal-card rounded-xl border border-royal-border text-white focus:outline-none focus:ring-2 focus:ring-gold resize-none"
            rows={2}
            placeholder="e.g., Prefers slim fit, likes French cuffs..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-200 mb-1">Notes</label>
          <textarea
            value={form.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            className="w-full px-4 py-3 bg-royal-card rounded-xl border border-royal-border text-white focus:outline-none focus:ring-2 focus:ring-gold resize-none"
            rows={3}
            placeholder="Additional notes..."
          />
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3 bg-gradient-to-r from-gold-dim to-gold text-white rounded-xl font-semibold hover:bg-gold-dim active:bg-gold-dim disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving...' : editId ? 'Update Customer' : 'Save Customer'}
        </button>
      </div>
    </div>
  );
}
