'use client';

import { useRouter } from 'next/navigation';
import { type Order, type Customer } from '@/lib/db';
import { formatDate, formatCurrency } from '@/lib/utils';
import StatusBadge from './StatusBadge';

interface OrderCardProps {
  order: Order;
  customer?: Customer;
  currency?: string;
}

export default function OrderCard({ order, customer, currency = 'NGN' }: OrderCardProps) {
  const router = useRouter();

  return (
    <div
      onClick={() => router.push(`/orders/${order.id}`)}
      className="bg-royal-card rounded-xl shadow-none p-4 active:bg-royal-hover transition-colors cursor-pointer"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-white font-medium truncate">
              {customer?.name || 'Unknown Account'}
            </h3>
            {order.orderCode && (
              <span className="text-xs bg-gold/20 text-gold px-2 py-0.5 rounded-full font-mono shrink-0">
                {order.orderCode}
              </span>
            )}
          </div>
          <p className="text-sm text-white truncate">{order.fabricType || 'No fabric specified'}</p>
        </div>
        <StatusBadge status={order.status} />
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-white">
          Due: {order.deliveryDate ? formatDate(order.deliveryDate) : 'Not set'}
        </span>
        <span className="font-semibold text-white">
          {formatCurrency(order.totalAmount, currency)}
        </span>
      </div>
    </div>
  );
}
