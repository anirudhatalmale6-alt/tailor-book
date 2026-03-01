'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useOrders } from '@/hooks/useOrders';
import { usePayments } from '@/hooks/usePayments';
import { useExpenses } from '@/hooks/useExpenses';
import { useCurrency } from '@/hooks/useSettings';
import { db, type Customer } from '@/lib/db';
import { formatCurrency, isThisMonth, getStatusColor, getStatusLabel } from '@/lib/utils';
import OrderCard from '@/components/OrderCard';

export default function DashboardPage() {
  const orders = useOrders();
  const payments = usePayments();
  const expenses = useExpenses();
  const currency = useCurrency();
  const router = useRouter();
  const [customers, setCustomers] = useState<Record<string, Customer>>({});

  useEffect(() => {
    db.customers.toArray().then((custs) => {
      const map: Record<string, Customer> = {};
      custs.forEach((c) => { map[c.id] = c; });
      setCustomers(map);
    });
  }, [orders]);

  const monthlyRevenue = useMemo(() => {
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

  const monthlyExpenses = useMemo(() => {
    if (!expenses) return 0;
    return expenses
      .filter((e) => isThisMonth(e.createdAt))
      .reduce((sum, e) => sum + e.amount, 0);
  }, [expenses]);

  const netRevenue = monthlyRevenue - monthlyRefunds;
  const profit = netRevenue - monthlyExpenses;

  const outstandingDebts = useMemo(() => {
    if (!orders || !payments) return 0;
    let total = 0;
    orders.forEach((order) => {
      if (order.status === 'cancelled') return;
      const orderPayments = payments.filter((p) => p.orderId === order.id);
      const paid = orderPayments.reduce((s, p) => (p.type === 'refund' ? s - p.amount : s + p.amount), 0);
      const balance = order.totalAmount - paid;
      if (balance > 0) total += balance;
    });
    return total;
  }, [orders, payments]);

  const statusCounts = useMemo(() => {
    if (!orders) return { pending: 0, in_progress: 0, ready: 0, delivered: 0 };
    const counts = { pending: 0, in_progress: 0, ready: 0, delivered: 0 };
    orders.forEach((o) => {
      if (o.status in counts) {
        counts[o.status as keyof typeof counts]++;
      }
    });
    return counts;
  }, [orders]);

  const recentOrders = useMemo(() => {
    if (!orders) return [];
    return orders.slice(0, 5);
  }, [orders]);

  return (
    <div className="px-4 pt-4">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Dashboard</h1>

      {/* Revenue Cards */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-xs text-gray-400 mb-1">Revenue This Month</p>
          <p className="text-xl font-bold text-green-600">{formatCurrency(netRevenue, currency)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-xs text-gray-400 mb-1">Expenses This Month</p>
          <p className="text-xl font-bold text-red-600">{formatCurrency(monthlyExpenses, currency)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-xs text-gray-400 mb-1">Profit This Month</p>
          <p className={`text-xl font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(profit, currency)}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-xs text-gray-400 mb-1">Outstanding Debts</p>
          <p className="text-xl font-bold text-orange-600">{formatCurrency(outstandingDebts, currency)}</p>
        </div>
      </div>

      {/* Active Orders by Status */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Active Orders</h2>
        <div className="grid grid-cols-4 gap-2">
          {(['pending', 'in_progress', 'ready', 'delivered'] as const).map((status) => {
            const colors = getStatusColor(status);
            return (
              <button
                key={status}
                onClick={() => router.push('/orders')}
                className={`${colors.bg} rounded-lg p-3 text-center`}
              >
                <p className={`text-2xl font-bold ${colors.text}`}>{statusCounts[status]}</p>
                <p className={`text-[10px] font-medium ${colors.text}`}>{getStatusLabel(status)}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Recent Orders */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-gray-900">Recent Orders</h2>
          <button
            onClick={() => router.push('/orders')}
            className="text-xs text-indigo-600 font-medium"
          >
            View All
          </button>
        </div>
        {recentOrders.length > 0 ? (
          <div className="space-y-2">
            {recentOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                customer={customers[order.customerId]}
                currency={currency}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm p-6 text-center">
            <p className="text-gray-500 text-sm">No orders yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
