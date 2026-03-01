'use client';

import Link from 'next/link';
import { type Order, type Customer } from '@/lib/db';
import { formatDate, formatCurrency } from '@/lib/utils';
import StatusBadge from './StatusBadge';

interface OrderCardProps {
  order: Order;
  customer?: Customer;
  currency?: string;
}

export default function OrderCard({ order, customer, currency = 'NGN' }: OrderCardProps) {
  return (
    <Link href={`/orders/${order.id}`} className="block">
      <div className="bg-white rounded-xl shadow-sm p-4 active:bg-gray-50 transition-colors">
        <div className="flex items-start justify-between mb-2">
          <div className="min-w-0 flex-1">
            <h3 className="text-gray-900 font-medium truncate">
              {customer?.name || 'Unknown Customer'}
            </h3>
            <p className="text-sm text-gray-500 truncate">{order.fabricType || 'No fabric specified'}</p>
          </div>
          <StatusBadge status={order.status} />
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">
            Due: {order.deliveryDate ? formatDate(order.deliveryDate) : 'Not set'}
          </span>
          <span className="font-semibold text-gray-900">
            {formatCurrency(order.totalAmount, currency)}
          </span>
        </div>
      </div>
    </Link>
  );
}
