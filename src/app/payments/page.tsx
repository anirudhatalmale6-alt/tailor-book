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
      alert('Please fill in description and amount');
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
      alert('Failed to add expense');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="px-4 pt-4">
      <h1 className="text-2xl font-bold text-gray-900 mb-3">Payments</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="bg-white rounded-xl shadow-sm p-3">
          <p className="text-xs text-gray-400 mb-1">Received This Month</p>
          <p className="text-lg font-bold text-green-600">{formatCurrency(monthlyReceived - monthlyRefunds, currency)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-3">
          <p className="text-xs text-gray-400 mb-1">Outstanding</p>
          <p className="text-lg font-bold text-red-600">{formatCurrency(outstandingTotal, currency)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-3">
          <p className="text-xs text-gray-400 mb-1">Expenses This Month</p>
          <p className="text-lg font-bold text-gray-900">{formatCurrency(monthlyExpenses, currency)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-3">
          <p className="text-xs text-gray-400 mb-1">Net This Month</p>
          <p className={`text-lg font-bold ${(monthlyReceived - monthlyRefunds - monthlyExpenses) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(monthlyReceived - monthlyRefunds - monthlyExpenses, currency)}
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setShowExpenseModal(true)}
          className="flex-1 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          + Add Expense
        </button>
      </div>

      {/* Recent Payments */}
      <h2 className="text-sm font-semibold text-gray-900 mb-2">Recent Payments</h2>
      {payments === undefined ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
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
          <h2 className="text-sm font-semibold text-gray-900 mb-2">Recent Invoices</h2>
          <div className="space-y-2">
            {invoices.slice(0, 10).map((inv) => (
              <button
                key={inv.id}
                onClick={() => router.push(`/invoices/${inv.id}`)}
                className="w-full bg-white rounded-xl shadow-sm p-3 flex items-center justify-between active:bg-gray-50"
              >
                <div className="text-left">
                  <p className="text-sm font-medium text-gray-900">{inv.invoiceNumber}</p>
                  <p className="text-xs text-gray-400">
                    {customers[inv.customerId]?.name || 'Customer'} &middot; {formatDate(inv.createdAt)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">{formatCurrency(inv.total, currency)}</p>
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
          <h2 className="text-sm font-semibold text-gray-900 mb-2">Recent Expenses</h2>
          <div className="space-y-2">
            {expenses.slice(0, 10).map((e) => (
              <div key={e.id} className="bg-white rounded-xl shadow-sm p-3 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium text-gray-900">{e.description}</p>
                    <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-medium ${
                      (e.expenseType || 'business') === 'sewing'
                        ? 'bg-purple-50 text-purple-600'
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {(e.expenseType || 'business') === 'sewing' ? 'Sewing' : 'Business'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">{e.category || 'General'}</p>
                </div>
                <span className="text-sm font-semibold text-red-600">-{formatCurrency(e.amount, currency)}</span>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Expense Type</label>
            <div className="flex gap-2">
              <button
                onClick={() => setExpenseForm((p) => ({ ...p, expenseType: 'business' }))}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                  expenseForm.expenseType === 'business'
                    ? 'bg-gray-100 border-gray-400 text-gray-800'
                    : 'bg-white border-gray-200 text-gray-500'
                }`}
              >
                Business
              </button>
              <button
                onClick={() => setExpenseForm((p) => ({ ...p, expenseType: 'sewing' }))}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                  expenseForm.expenseType === 'sewing'
                    ? 'bg-purple-50 border-purple-300 text-purple-700'
                    : 'bg-white border-gray-200 text-gray-500'
                }`}
              >
                Sewing
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
            <input
              type="text"
              value={expenseForm.description}
              onChange={(e) => setExpenseForm((p) => ({ ...p, description: e.target.value }))}
              className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="What was the expense?"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
            <input
              type="number"
              value={expenseForm.amount}
              onChange={(e) => setExpenseForm((p) => ({ ...p, amount: e.target.value }))}
              className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <input
              type="text"
              value={expenseForm.category}
              onChange={(e) => setExpenseForm((p) => ({ ...p, category: e.target.value }))}
              className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g., Materials, Transport, Rent..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              value={expenseForm.date}
              onChange={(e) => setExpenseForm((p) => ({ ...p, date: e.target.value }))}
              className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button
            onClick={handleAddExpense}
            disabled={saving}
            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving...' : 'Save Expense'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
