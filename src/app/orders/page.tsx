'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useOrders } from '@/hooks/useOrders';
import { useCurrency } from '@/hooks/useSettings';
import { db, type Customer } from '@/lib/db';
import OrderCard from '@/components/OrderCard';
import { useReadOnlyGuard } from '@/hooks/useSubscription';
import FloatingButton from '@/components/FloatingButton';
import EmptyState from '@/components/EmptyState';

const statusFilters = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'ready', label: 'Ready' },
  { key: 'delivered', label: 'Delivered' },
];

export default function OrdersPage() {
  const [statusFilter, setStatusFilter] = useState('all');
  const orders = useOrders(statusFilter);
  const currency = useCurrency();
  const router = useRouter();
  const canEdit = useReadOnlyGuard();
  const [customers, setCustomers] = useState<Record<string, Customer>>({});

  useEffect(() => {
    db.customers.toArray().then((custs) => {
      const map: Record<string, Customer> = {};
      custs.forEach((c) => { map[c.id] = c; });
      setCustomers(map);
    });
  }, [orders]);

  return (
    <div className="px-4 pt-4">
      <h1 className="text-2xl font-bold text-white mb-3">Orders</h1>

      {/* Status filter tabs */}
      <div className="flex gap-1 overflow-x-auto mb-4 pb-1 -mx-4 px-4">
        {statusFilters.map((f) => (
          <button
            key={f.key}
            onClick={() => setStatusFilter(f.key)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              statusFilter === f.key
                ? 'bg-gradient-to-r from-gold-dim to-gold text-white'
                : 'bg-royal-card text-white border border-royal-border'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {orders === undefined ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
        </div>
      ) : orders.length === 0 ? (
        <EmptyState
          icon={
            <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          }
          title={statusFilter !== 'all' ? 'No orders with this status' : 'No orders yet'}
          description="Create your first order to get started"
        />
      ) : (
        <div className="space-y-2">
          {orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              customer={customers[order.customerId]}
              currency={currency}
            />
          ))}
        </div>
      )}

      <FloatingButton
        onClick={() => { if (canEdit()) router.push('/orders/new'); }}
        label="New Order"
      />
    </div>
  );
}
