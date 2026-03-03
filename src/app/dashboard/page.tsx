'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useOrders } from '@/hooks/useOrders';
import { usePayments } from '@/hooks/usePayments';
import { useExpenses } from '@/hooks/useExpenses';
import { useProjects } from '@/hooks/useProjects';
import { useCurrency } from '@/hooks/useSettings';
import { db, type Customer, type Order } from '@/lib/db';
import { formatCurrency, formatDate, isThisMonth, getStatusColor, getStatusLabel } from '@/lib/utils';
import OrderCard from '@/components/OrderCard';
import Link from 'next/link';

export default function DashboardPage() {
  const orders = useOrders();
  const payments = usePayments();
  const expenses = useExpenses();
  const projects = useProjects();
  const currency = useCurrency();
  const router = useRouter();
  const [customers, setCustomers] = useState<Record<string, Customer>>({});
  const [dismissedReminders, setDismissedReminders] = useState(false);

  useEffect(() => {
    db.customers.toArray().then((custs) => {
      const map: Record<string, Customer> = {};
      custs.forEach((c) => { map[c.id] = c; });
      setCustomers(map);
    });
  }, [orders]);

  // Delivery date reminders
  const { dueToday, overdue, dueSoon } = useMemo(() => {
    if (!orders) return { dueToday: [], overdue: [], dueSoon: [] };
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const threeDays = new Date(today);
    threeDays.setDate(threeDays.getDate() + 3);

    const activeOrders = orders.filter(
      (o) => o.deliveryDate && o.status !== 'delivered' && o.status !== 'cancelled'
    );

    const dueTodayList: Order[] = [];
    const overdueList: Order[] = [];
    const dueSoonList: Order[] = [];

    activeOrders.forEach((order) => {
      const dd = new Date(order.deliveryDate);
      const deliveryDay = new Date(dd.getFullYear(), dd.getMonth(), dd.getDate());

      if (deliveryDay.getTime() === today.getTime()) {
        dueTodayList.push(order);
      } else if (deliveryDay < today) {
        overdueList.push(order);
      } else if (deliveryDay > today && deliveryDay <= threeDays) {
        dueSoonList.push(order);
      }
    });

    return { dueToday: dueTodayList, overdue: overdueList, dueSoon: dueSoonList };
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

  const activeProjectCount = useMemo(() => {
    if (!projects) return 0;
    return projects.filter((p) => p.status === 'active').length;
  }, [projects]);

  const recentOrders = useMemo(() => {
    if (!orders) return [];
    return orders.slice(0, 5);
  }, [orders]);

  const hasReminders = overdue.length > 0 || dueToday.length > 0 || dueSoon.length > 0;

  return (
    <div className="px-4 pt-4">
      <h1 className="text-2xl font-bold text-white mb-4">Dashboard</h1>

      {/* Delivery Date Reminders */}
      {hasReminders && !dismissedReminders && (
        <div className="mb-4 space-y-2">
          {/* Overdue Orders — Red Alert */}
          {overdue.length > 0 && (
            <div className="bg-red-400/10 border border-red-400/20 rounded-xl p-3">
              <div className="flex items-start gap-2">
                <div className="mt-0.5 flex-shrink-0">
                  <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-red-400">
                    {overdue.length} Overdue Order{overdue.length !== 1 ? 's' : ''}
                  </p>
                  <div className="mt-1 space-y-1">
                    {overdue.map((order) => (
                      <Link key={order.id} href={`/orders/${order.id}`} className="block">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-red-400 font-medium truncate">
                            {customers[order.customerId]?.name || 'Account'} — {order.fabricType || 'Order'}
                          </span>
                          <span className="text-red-500 flex-shrink-0 ml-2">
                            Due {formatDate(order.deliveryDate)}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Due Today — Orange Alert */}
          {dueToday.length > 0 && (
            <div className="bg-orange-400/10 border border-orange-400/20 rounded-xl p-3">
              <div className="flex items-start gap-2">
                <div className="mt-0.5 flex-shrink-0">
                  <svg className="w-5 h-5 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-orange-400">
                    {dueToday.length} Order{dueToday.length !== 1 ? 's' : ''} Due Today
                  </p>
                  <div className="mt-1 space-y-1">
                    {dueToday.map((order) => (
                      <Link key={order.id} href={`/orders/${order.id}`} className="block">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-orange-700 font-medium truncate">
                            {customers[order.customerId]?.name || 'Account'} — {order.fabricType || 'Order'}
                          </span>
                          <span className="text-orange-500 flex-shrink-0 ml-2">
                            {order.status === 'ready' ? 'Ready for pickup' : getStatusLabel(order.status)}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Due Soon (within 3 days) — Blue Info */}
          {dueSoon.length > 0 && (
            <div className="bg-blue-400/10 border border-blue-400/20 rounded-xl p-3">
              <div className="flex items-start gap-2">
                <div className="mt-0.5 flex-shrink-0">
                  <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-blue-400">
                    {dueSoon.length} Order{dueSoon.length !== 1 ? 's' : ''} Due Soon
                  </p>
                  <div className="mt-1 space-y-1">
                    {dueSoon.map((order) => (
                      <Link key={order.id} href={`/orders/${order.id}`} className="block">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-blue-400 font-medium truncate">
                            {customers[order.customerId]?.name || 'Account'} — {order.fabricType || 'Order'}
                          </span>
                          <span className="text-blue-500 flex-shrink-0 ml-2">
                            Due {formatDate(order.deliveryDate)}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Dismiss button */}
          <button
            onClick={() => setDismissedReminders(true)}
            className="w-full text-center text-xs text-white/60 py-1"
          >
            Dismiss reminders
          </button>
        </div>
      )}

      {/* Revenue Cards */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="bg-royal-card rounded-xl shadow-none p-4">
          <p className="text-xs text-white/60 mb-1">Revenue This Month</p>
          <p className="text-xl font-bold text-green-400">{formatCurrency(netRevenue, currency)}</p>
        </div>
        <div className="bg-royal-card rounded-xl shadow-none p-4">
          <p className="text-xs text-white/60 mb-1">Expenses This Month</p>
          <p className="text-xl font-bold text-red-400">{formatCurrency(monthlyExpenses, currency)}</p>
        </div>
        <div className="bg-royal-card rounded-xl shadow-none p-4">
          <p className="text-xs text-white/60 mb-1">Profit This Month</p>
          <p className={`text-xl font-bold ${profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {formatCurrency(profit, currency)}
          </p>
        </div>
        <div className="bg-royal-card rounded-xl shadow-none p-4">
          <p className="text-xs text-white/60 mb-1">Outstanding Debts</p>
          <p className="text-xl font-bold text-orange-400">{formatCurrency(outstandingDebts, currency)}</p>
        </div>
      </div>

      {/* Active Projects Card */}
      <button
        onClick={() => router.push('/projects')}
        className="w-full bg-royal-card rounded-xl shadow-none p-4 mb-4 flex items-center justify-between active:bg-royal-hover transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gold-bg rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-white">Active Projects</p>
            <p className="text-xs text-white/60">Tap to view all projects</p>
          </div>
        </div>
        <p className="text-2xl font-bold text-gold">{activeProjectCount}</p>
      </button>

      {/* Active Orders by Status */}
      <div className="bg-royal-card rounded-xl shadow-none p-4 mb-4">
        <h2 className="text-sm font-semibold text-white mb-3">Active Orders</h2>
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
          <h2 className="text-sm font-semibold text-white">Recent Orders</h2>
          <button
            onClick={() => router.push('/orders')}
            className="text-xs text-gold font-medium"
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
          <div className="bg-royal-card rounded-xl shadow-none p-6 text-center">
            <p className="text-white text-sm">No orders yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
