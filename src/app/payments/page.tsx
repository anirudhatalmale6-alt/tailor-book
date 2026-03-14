'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { usePayments } from '@/hooks/usePayments';
import { useExpenses, addExpense } from '@/hooks/useExpenses';
import { useInvoices } from '@/hooks/useInvoices';
import { useCurrency } from '@/hooks/useSettings';
import { db, type Customer, type Order } from '@/lib/db';
import { formatCurrency, formatDate, isThisMonth } from '@/lib/utils';
import PaymentCard from '@/components/PaymentCard';
import Modal from '@/components/Modal';
import EmptyState from '@/components/EmptyState';
import { toast } from '@/lib/toast';

export default function PaymentsPage() {
  const router = useRouter();
  const payments = usePayments();
  const expenses = useExpenses();
  const invoices = useInvoices();
  const currency = useCurrency();
  const [customers, setCustomers] = useState<Record<string, Customer>>({});
  const [orders, setOrders] = useState<Record<string, Order>>({});
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [expenseForm, setExpenseForm] = useState({
    description: '',
    amount: '',
    category: '',
    date: new Date().toISOString().split('T')[0],
    expenseType: 'business' as 'business' | 'sewing',
  });

  useEffect(() => {
    db.customers.toArray().then((custs) => {
      const map: Record<string, Customer> = {};
      custs.forEach((c) => { map[c.id] = c; });
      setCustomers(map);
    });
    db.orders.toArray().then((ords) => {
      const map: Record<string, Order> = {};
      ords.forEach((o) => { map[o.id] = o; });
      setOrders(map);
    });
  }, [payments]);

  const monthlyReceived = useMemo(() => {
    if (!payments) return 0;
    return payments
      .filter((p) => isThisMonth(p.createdAt) && p.type !== 'refund')
      .reduce((sum, p) => sum + p.amount, 0);
  }, [payments]);

  const monthlyRefunds = useMemo(() => {
    if (!payments) return 0;
    return payments
      .filter((p) => isThisMonth(p.createdAt) && p.type === 'refund')
      .reduce((sum, p) => sum + p.amount, 0);
  }, [payments]);

  const outstandingTotal = useMemo(() => {
    if (!payments) return 0;
    const allOrders = Object.values(orders);
    let total = 0;
    allOrders.forEach((order) => {
      if (order.status === 'cancelled') return;
      const orderPayments = payments.filter((p) => p.orderId === order.id);
      const paid = orderPayments.reduce((s, p) => (p.type === 'refund' ? s - p.amount : s + p.amount), 0);
      const balance = order.totalAmount - paid;
      if (balance > 0) total += balance;
    });
    return total;
  }, [payments, orders]);

  const monthlyExpenses = useMemo(() => {
    if (!expenses) return 0;
    return expenses
      .filter((e) => isThisMonth(e.createdAt))
      .reduce((sum, e) => sum + e.amount, 0);
  }, [expenses]);

  async function handleAddExpense() {
    if (!expenseForm.description.trim() || !expenseForm.amount) {
      toast('Please fill in description and amount', 'error');
      return;
    }
    setSaving(true);
    try {
      await addExpense({
        description: expenseForm.description,
        amount: parseFloat(expenseForm.amount),
        category: expenseForm.category,
        expenseType: expenseForm.expenseType,
        date: expenseForm.date,
      });
      setShowExpenseModal(false);
      setExpenseForm({
        description: '',
        amount: '',
        category: '',
        date: new Date().toISOString().split('T')[0],
        expenseType: 'business',
      });
    } catch (err) {
      console.error('Failed to add expense:', err);
      toast('Failed to add expense', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="px-4 pt-4">
      <h1 className="text-2xl font-bold text-white mb-3">Payments</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="bg-royal-card rounded-xl shadow-none p-3">
          <p className="text-xs text-white/60 mb-1">Received This Month</p>
          <p className="text-lg font-bold text-green-400">{formatCurrency(monthlyReceived - monthlyRefunds, currency)}</p>
        </div>
        <div className="bg-royal-card rounded-xl shadow-none p-3">
          <p className="text-xs text-white/60 mb-1">Outstanding</p>
          <p className="text-lg font-bold text-red-400">{formatCurrency(outstandingTotal, currency)}</p>
        </div>
        <div className="bg-royal-card rounded-xl shadow-none p-3">
          <p className="text-xs text-white/60 mb-1">Expenses This Month</p>
          <p className="text-lg font-bold text-white">{formatCurrency(monthlyExpenses, currency)}</p>
        </div>
        <div className="bg-royal-card rounded-xl shadow-none p-3">
          <p className="text-xs text-white/60 mb-1">Net This Month</p>
          <p className={`text-lg font-bold ${(monthlyReceived - monthlyRefunds - monthlyExpenses) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {formatCurrency(monthlyReceived - monthlyRefunds - monthlyExpenses, currency)}
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setShowExpenseModal(true)}
          className="flex-1 py-2.5 bg-royal-card border border-royal-border text-white rounded-xl text-sm font-medium hover:bg-royal-hover transition-colors"
        >
          + Add Expense
        </button>
      </div>

      {/* Recent Payments */}
      <h2 className="text-sm font-semibold text-white mb-2">Recent Payments</h2>
      {payments === undefined ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
        </div>
      ) : payments.length === 0 ? (
        <EmptyState
          title="No payments yet"
          description="Payments will appear here when you receive them"
        />
      ) : (
        <div className="space-y-2 mb-4">
          {payments.slice(0, 20).map((p) => (
            <PaymentCard
              key={p.id}
              payment={p}
              customerName={customers[p.customerId]?.name}
              currency={currency}
            />
          ))}
        </div>
      )}

      {/* Recent Invoices */}
      {invoices && invoices.length > 0 && (
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-white mb-2">Recent Invoices</h2>
          <div className="space-y-2">
            {invoices.slice(0, 10).map((inv) => (
              <button
                key={inv.id}
                onClick={() => router.push(`/invoices/${inv.id}`)}
                className="w-full bg-royal-card rounded-xl shadow-none p-3 flex items-center justify-between active:bg-royal-hover"
              >
                <div className="text-left">
                  <p className="text-sm font-medium text-white">{inv.invoiceNumber}</p>
                  <p className="text-xs text-white/60">
                    {customers[inv.customerId]?.name || 'Account'} &middot; {formatDate(inv.createdAt)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-white">{formatCurrency(inv.total, currency)}</p>
                  {inv.balanceDue > 0 ? (
                    <p className="text-[10px] text-red-500">Due: {formatCurrency(inv.balanceDue, currency)}</p>
                  ) : (
                    <p className="text-[10px] text-green-500">Paid</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Recent Expenses */}
      {expenses && expenses.length > 0 && (
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-white mb-2">Recent Expenses</h2>
          <div className="space-y-2">
            {expenses.slice(0, 10).map((e) => (
              <div key={e.id} className="bg-royal-card rounded-xl shadow-none p-3 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium text-white">{e.description}</p>
                    <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-medium ${
                      (e.expenseType || 'business') === 'sewing'
                        ? 'bg-purple-50 text-purple-600'
                        : 'bg-royal-hover text-white'
                    }`}>
                      {(e.expenseType || 'business') === 'sewing' ? 'Sewing' : 'Business'}
                    </span>
                  </div>
                  <p className="text-xs text-white/60">{e.category || 'General'}</p>
                </div>
                <span className="text-sm font-semibold text-red-400">-{formatCurrency(e.amount, currency)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Expense Modal */}
      <Modal
        isOpen={showExpenseModal}
        onClose={() => setShowExpenseModal(false)}
        title="Add Expense"
      >
        <div className="space-y-3">
          {/* Expense Type Toggle */}
          <div>
            <label className="block text-sm font-medium text-white mb-1">Expense Type</label>
            <div className="flex gap-2">
              <button
                onClick={() => setExpenseForm((p) => ({ ...p, expenseType: 'business' }))}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                  expenseForm.expenseType === 'business'
                    ? 'bg-royal-hover border-gray-400 text-white'
                    : 'bg-royal-card border-royal-border text-white'
                }`}
              >
                Business
              </button>
              <button
                onClick={() => setExpenseForm((p) => ({ ...p, expenseType: 'sewing' }))}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                  expenseForm.expenseType === 'sewing'
                    ? 'bg-purple-50 border-purple-300 text-purple-700'
                    : 'bg-royal-card border-royal-border text-white'
                }`}
              >
                Sewing
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-white mb-1">Description *</label>
            <input
              type="text"
              value={expenseForm.description}
              onChange={(e) => setExpenseForm((p) => ({ ...p, description: e.target.value }))}
              className="w-full px-4 py-3 bg-royal-bg rounded-xl border border-royal-border text-white focus:outline-none focus:ring-2 focus:ring-gold"
              placeholder="What was the expense?"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white mb-1">Amount *</label>
            <input
              type="number"
              value={expenseForm.amount}
              onChange={(e) => setExpenseForm((p) => ({ ...p, amount: e.target.value }))}
              className="w-full px-4 py-3 bg-royal-bg rounded-xl border border-royal-border text-white focus:outline-none focus:ring-2 focus:ring-gold"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white mb-1">Category</label>
            <input
              type="text"
              value={expenseForm.category}
              onChange={(e) => setExpenseForm((p) => ({ ...p, category: e.target.value }))}
              className="w-full px-4 py-3 bg-royal-bg rounded-xl border border-royal-border text-white focus:outline-none focus:ring-2 focus:ring-gold"
              placeholder="e.g., Materials, Transport, Rent..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white mb-1">Date</label>
            <input
              type="date"
              value={expenseForm.date}
              onChange={(e) => setExpenseForm((p) => ({ ...p, date: e.target.value }))}
              className="w-full px-4 py-3 bg-royal-bg rounded-xl border border-royal-border text-white focus:outline-none focus:ring-2 focus:ring-gold"
            />
          </div>
          <button
            onClick={handleAddExpense}
            disabled={saving}
            className="w-full py-3 bg-gradient-to-r from-gold-dim to-gold text-white rounded-xl font-semibold hover:bg-gold-dim disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving...' : 'Save Expense'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
