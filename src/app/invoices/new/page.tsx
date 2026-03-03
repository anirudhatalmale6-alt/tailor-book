'use client';

import { Suspense, useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { db, type Customer, type Order, type Payment, type InvoiceItem, type Project, type ProjectItem } from '@/lib/db';
import { addInvoice, generateInvoiceNumber } from '@/hooks/useInvoices';
import { useCurrency, useTaxRate } from '@/hooks/useSettings';
import { formatCurrency } from '@/lib/utils';

export default function NewInvoicePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold" />
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
  const projectId = searchParams.get('projectId');
  const currency = useCurrency();
  const defaultTaxRate = useTaxRate();

  const [saving, setSaving] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [taxRate, setTaxRate] = useState('0');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<InvoiceItem[]>([
    { description: '', quantity: 1, unitPrice: 0, total: 0 },
  ]);
  const [amountPaid, setAmountPaid] = useState(0);

  // Generate invoice number
  useEffect(() => {
    generateInvoiceNumber().then(setInvoiceNumber);
  }, []);

  useEffect(() => {
    setTaxRate(defaultTaxRate.toString());
  }, [defaultTaxRate]);

  // Load ORDER-based invoice data
  useEffect(() => {
    if (!orderId) return;
    (async () => {
      const ord = await db.orders.get(orderId);
      if (!ord) return;
      setOrder(ord);

      const cust = await db.customers.get(ord.customerId);
      if (cust) setCustomer(cust);

      const payments = await db.payments
        .where('orderId')
        .equals(orderId)
        .toArray();
      const totalPaid = payments.reduce(
        (sum: number, p: Payment) => (p.type === 'refund' ? sum - p.amount : sum + p.amount),
        0
      );
      setAmountPaid(totalPaid);

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

  // Load PROJECT-based invoice data
  useEffect(() => {
    if (!projectId) return;
    (async () => {
      const proj = await db.projects.get(projectId);
      if (!proj) return;
      setProject(proj);

      const cust = await db.customers.get(proj.customerId);
      if (cust) setCustomer(cust);

      // Get all sub-clients for this project
      const projectItems = await db.projectItems
        .where('projectId')
        .equals(projectId)
        .toArray();

      // Get project expenses
      const projectExpenses = await db.expenses
        .where('projectId')
        .equals(projectId)
        .toArray();
      const totalExpenses = projectExpenses.reduce((sum, e) => sum + e.amount, 0);

      // Create line items from sub-clients
      const invoiceItems: InvoiceItem[] = projectItems.map((item: ProjectItem) => ({
        description: [item.name, item.fabricType, item.styleDescription]
          .filter(Boolean)
          .join(' - ') || item.name,
        quantity: 1,
        unitPrice: item.price || 0,
        total: item.price || 0,
      }));

      // Add expenses as a separate line if any
      if (totalExpenses > 0) {
        invoiceItems.push({
          description: 'Materials & Sewing Expenses',
          quantity: 1,
          unitPrice: totalExpenses,
          total: totalExpenses,
        });
      }

      if (invoiceItems.length === 0) {
        invoiceItems.push({ description: '', quantity: 1, unitPrice: 0, total: 0 });
      }

      setItems(invoiceItems);
    })();
  }, [projectId]);

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
    if (!orderId && !projectId) {
      alert('No order or project linked to this invoice');
      return;
    }
    if (items.every((item) => !item.description.trim())) {
      alert('Please add at least one item with a description');
      return;
    }

    const customerId = order?.customerId || project?.customerId || '';
    if (!customerId) {
      alert('No account linked');
      return;
    }

    setSaving(true);
    try {
      const rate = parseFloat(taxRate) || 0;
      const invoiceId = await addInvoice({
        invoiceNumber,
        orderId: orderId || '',
        customerId,
        projectId: projectId || undefined,
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
    <div className="px-4 pt-4 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => router.back()} className="p-1 text-royal-light">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-white">Create Invoice</h1>
      </div>

      {/* Invoice Number & Customer Info */}
      <div className="bg-royal-card rounded-xl shadow-none p-4 mb-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-royal-light">Invoice Number</span>
          <span className="text-sm font-bold text-gold">{invoiceNumber}</span>
        </div>
        {customer && (
          <div className="mt-2 pt-2 border-t border-royal-border">
            <span className="text-xs text-royal-muted">Bill To</span>
            <p className="text-sm font-medium text-white">{customer.name}</p>
            {customer.phone && <p className="text-xs text-royal-light">{customer.phone}</p>}
            {customer.email && <p className="text-xs text-royal-light">{customer.email}</p>}
            {customer.address && <p className="text-xs text-royal-light mt-0.5">{customer.address}</p>}
          </div>
        )}
        {project && (
          <div className="mt-2 pt-2 border-t border-royal-border">
            <span className="text-xs text-royal-muted">Project</span>
            <p className="text-sm font-medium text-white">{project.name}</p>
          </div>
        )}
      </div>

      {/* Line Items */}
      <div className="bg-royal-card rounded-xl shadow-none p-4 mb-3">
        <h3 className="text-sm font-semibold text-white mb-3">Items</h3>
        <div className="space-y-3">
          {items.map((item, idx) => (
            <div key={idx} className="bg-royal-bg rounded-lg p-3">
              <div className="flex items-start gap-2">
                <div className="flex-1 space-y-2">
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => updateItem(idx, 'description', e.target.value)}
                    className="w-full px-3 py-2 bg-royal-card rounded-lg border border-royal-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold"
                    placeholder="Item description"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-royal-muted mb-0.5">Qty</label>
                      <input
                        type="number"
                        value={item.quantity || ''}
                        onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                        className="w-full px-3 py-2 bg-royal-card rounded-lg border border-royal-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold"
                        min="0"
                        step="1"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-royal-muted mb-0.5">Unit Price</label>
                      <input
                        type="number"
                        value={item.unitPrice || ''}
                        onChange={(e) => updateItem(idx, 'unitPrice', e.target.value)}
                        className="w-full px-3 py-2 bg-royal-card rounded-lg border border-royal-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold"
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-royal-light">Total: </span>
                    <span className="text-sm font-semibold text-white">
                      {formatCurrency(item.total, currency)}
                    </span>
                  </div>
                </div>
                {items.length > 1 && (
                  <button
                    onClick={() => removeItem(idx)}
                    className="p-1 text-royal-muted hover:text-red-500 mt-1"
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
          className="mt-2 w-full py-2 border border-dashed border-royal-dark text-royal-light rounded-lg text-sm hover:border-indigo-400 hover:text-gold transition-colors"
        >
          + Add Item
        </button>
      </div>

      {/* Tax & Totals */}
      <div className="bg-royal-card rounded-xl shadow-none p-4 mb-3">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-royal-light">Subtotal</span>
            <span className="text-sm font-medium text-white">{formatCurrency(subtotal, currency)}</span>
          </div>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-sm text-royal-light">Tax</span>
              <input
                type="number"
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
                className="w-16 px-2 py-1 bg-royal-bg rounded border border-royal-border text-white text-xs text-center focus:outline-none focus:ring-2 focus:ring-gold"
                min="0"
                max="100"
                step="0.1"
              />
              <span className="text-xs text-royal-muted">%</span>
            </div>
            <span className="text-sm text-white">{formatCurrency(taxAmount, currency)}</span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-royal-border">
            <span className="text-sm font-semibold text-white">Total</span>
            <span className="text-sm font-bold text-white">{formatCurrency(total, currency)}</span>
          </div>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-sm text-royal-light">Amount Paid</span>
            </div>
            <input
              type="number"
              value={amountPaid || ''}
              onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
              className="w-28 px-2 py-1 bg-royal-bg rounded border border-royal-border text-white text-sm text-right focus:outline-none focus:ring-2 focus:ring-gold"
              min="0"
              step="0.01"
              placeholder="0"
            />
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-royal-border">
            <span className="text-sm font-semibold text-gray-200">Balance Due</span>
            <span className={`text-sm font-bold ${balanceDue > 0 ? 'text-red-400' : 'text-green-400'}`}>
              {formatCurrency(Math.max(0, balanceDue), currency)}
            </span>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="bg-royal-card rounded-xl shadow-none p-4 mb-3">
        <label className="block text-sm font-medium text-gray-200 mb-1">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full px-4 py-3 bg-royal-bg rounded-xl border border-royal-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold resize-none"
          rows={2}
          placeholder="Thank you for your business..."
        />
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-3 bg-gradient-to-r from-gold-dim to-gold text-white rounded-xl font-semibold hover:bg-gold-dim active:bg-gold-dim disabled:opacity-50 transition-colors mb-4"
      >
        {saving ? 'Creating Invoice...' : 'Create Invoice'}
      </button>
    </div>
  );
}
