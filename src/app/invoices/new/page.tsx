'use client';

import { Suspense, useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { db, type Customer, type Order, type Payment, type InvoiceItem } from '@/lib/db';
import { addInvoice, generateInvoiceNumber } from '@/hooks/useInvoices';
import { useCurrency, useTaxRate } from '@/hooks/useSettings';
import { formatCurrency } from '@/lib/utils';

export default function NewInvoicePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      }
    >
      <NewInvoiceForm />
    </Suspense>
  );
}

function NewInvoiceForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');
  const currency = useCurrency();
  const defaultTaxRate = useTaxRate();

  const [saving, setSaving] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [taxRate, setTaxRate] = useState('0');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<InvoiceItem[]>([
    { description: '', quantity: 1, unitPrice: 0, total: 0 },
  ]);
  const [amountPaid, setAmountPaid] = useState(0);

  // Load order data and generate invoice number
  useEffect(() => {
    generateInvoiceNumber().then(setInvoiceNumber);
  }, []);

  useEffect(() => {
    setTaxRate(defaultTaxRate.toString());
  }, [defaultTaxRate]);

  useEffect(() => {
    if (!orderId) return;
    (async () => {
      const ord = await db.orders.get(orderId);
      if (!ord) return;
      setOrder(ord);

      const cust = await db.customers.get(ord.customerId);
      if (cust) setCustomer(cust);

      // Get payments for this order
      const payments = await db.payments
        .where('orderId')
        .equals(orderId)
        .toArray();
      const totalPaid = payments.reduce(
        (sum: number, p: Payment) => (p.type === 'refund' ? sum - p.amount : sum + p.amount),
        0
      );
      setAmountPaid(totalPaid);

      // Pre-fill line items from order
      const orderItems: InvoiceItem[] = [];
      if (ord.fabricType || ord.styleDescription) {
        orderItems.push({
          description: [ord.fabricType, ord.styleDescription].filter(Boolean).join(' - '),
          quantity: 1,
          unitPrice: ord.totalAmount,
          total: ord.totalAmount,
        });
      } else {
        orderItems.push({
          description: 'Tailoring service',
          quantity: 1,
          unitPrice: ord.totalAmount,
          total: ord.totalAmount,
        });
      }
      setItems(orderItems);
    })();
  }, [orderId]);

  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + item.total, 0);
  }, [items]);

  const taxAmount = useMemo(() => {
    const rate = parseFloat(taxRate) || 0;
    return subtotal * (rate / 100);
  }, [subtotal, taxRate]);

  const total = subtotal + taxAmount;
  const balanceDue = total - amountPaid;

  function updateItem(index: number, field: keyof InvoiceItem, value: string | number) {
    setItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[index] };
      if (field === 'description') {
        item.description = value as string;
      } else if (field === 'quantity') {
        item.quantity = parseFloat(value as string) || 0;
        item.total = item.quantity * item.unitPrice;
      } else if (field === 'unitPrice') {
        item.unitPrice = parseFloat(value as string) || 0;
        item.total = item.quantity * item.unitPrice;
      }
      updated[index] = item;
      return updated;
    });
  }

  function addItem() {
    setItems((prev) => [...prev, { description: '', quantity: 1, unitPrice: 0, total: 0 }]);
  }

  function removeItem(index: number) {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    if (!orderId || !order) {
      alert('No order linked to this invoice');
      return;
    }
    if (items.every((item) => !item.description.trim())) {
      alert('Please add at least one item with a description');
      return;
    }

    setSaving(true);
    try {
      const rate = parseFloat(taxRate) || 0;
      const invoiceId = await addInvoice({
        invoiceNumber,
        orderId,
        customerId: order.customerId,
        items: items.filter((item) => item.description.trim()),
        subtotal,
        tax: taxAmount,
        taxRate: rate,
        total,
        amountPaid,
        balanceDue: Math.max(0, balanceDue),
        notes,
      });
      router.replace(`/invoices/${invoiceId}`);
    } catch (err) {
      console.error('Failed to create invoice:', err);
      alert('Failed to create invoice');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="px-4 pt-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => router.back()} className="p-1 text-gray-600">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-gray-900">Create Invoice</h1>
      </div>

      {/* Invoice Number */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">Invoice Number</span>
          <span className="text-sm font-bold text-indigo-600">{invoiceNumber}</span>
        </div>
        {customer && (
          <div className="mt-2 pt-2 border-t border-gray-100">
            <span className="text-xs text-gray-400">Customer</span>
            <p className="text-sm font-medium text-gray-900">{customer.name}</p>
            {customer.phone && <p className="text-xs text-gray-500">{customer.phone}</p>}
          </div>
        )}
      </div>

      {/* Line Items */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-3">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Items</h3>
        <div className="space-y-3">
          {items.map((item, idx) => (
            <div key={idx} className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <div className="flex-1 space-y-2">
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => updateItem(idx, 'description', e.target.value)}
                    className="w-full px-3 py-2 bg-white rounded-lg border border-gray-200 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Item description"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-gray-400 mb-0.5">Qty</label>
                      <input
                        type="number"
                        value={item.quantity || ''}
                        onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                        className="w-full px-3 py-2 bg-white rounded-lg border border-gray-200 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        min="0"
                        step="1"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-400 mb-0.5">Unit Price</label>
                      <input
                        type="number"
                        value={item.unitPrice || ''}
                        onChange={(e) => updateItem(idx, 'unitPrice', e.target.value)}
                        className="w-full px-3 py-2 bg-white rounded-lg border border-gray-200 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-gray-500">Total: </span>
                    <span className="text-sm font-semibold text-gray-900">
                      {formatCurrency(item.total, currency)}
                    </span>
                  </div>
                </div>
                {items.length > 1 && (
                  <button
                    onClick={() => removeItem(idx)}
                    className="p-1 text-gray-400 hover:text-red-500 mt-1"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={addItem}
          className="mt-2 w-full py-2 border border-dashed border-gray-300 text-gray-500 rounded-lg text-sm hover:border-indigo-400 hover:text-indigo-600 transition-colors"
        >
          + Add Item
        </button>
      </div>

      {/* Tax & Totals */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-3">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">Subtotal</span>
            <span className="text-sm font-medium text-gray-900">{formatCurrency(subtotal, currency)}</span>
          </div>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Tax</span>
              <input
                type="number"
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
                className="w-16 px-2 py-1 bg-gray-50 rounded border border-gray-200 text-gray-900 text-xs text-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
                min="0"
                max="100"
                step="0.1"
              />
              <span className="text-xs text-gray-400">%</span>
            </div>
            <span className="text-sm text-gray-900">{formatCurrency(taxAmount, currency)}</span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-gray-100">
            <span className="text-sm font-semibold text-gray-900">Total</span>
            <span className="text-sm font-bold text-gray-900">{formatCurrency(total, currency)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">Amount Paid</span>
            <span className="text-sm font-medium text-green-600">{formatCurrency(amountPaid, currency)}</span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-gray-100">
            <span className="text-sm font-semibold text-gray-700">Balance Due</span>
            <span className={`text-sm font-bold ${balanceDue > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {formatCurrency(Math.max(0, balanceDue), currency)}
            </span>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-3">
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          rows={2}
          placeholder="Thank you for your business..."
        />
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 transition-colors mb-4"
      >
        {saving ? 'Creating Invoice...' : 'Create Invoice'}
      </button>
    </div>
  );
}
