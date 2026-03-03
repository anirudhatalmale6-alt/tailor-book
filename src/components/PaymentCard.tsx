'use client';

import { type Payment } from '@/lib/db';
import { formatCurrency, formatDateTime } from '@/lib/utils';

interface PaymentCardProps {
  payment: Payment;
  customerName?: string;
  currency?: string;
}

export default function PaymentCard({ payment, customerName, currency = 'NGN' }: PaymentCardProps) {
  const typeColors: Record<string, string> = {
    deposit: 'text-green-400 bg-green-400/10',
    balance: 'text-blue-400 bg-blue-400/10',
    refund: 'text-red-400 bg-red-400/10',
  };

  const methodLabels: Record<string, string> = {
    cash: 'Cash',
    transfer: 'Transfer',
    card: 'Card',
    mobile_money: 'Mobile Money',
  };

  return (
    <div className="bg-royal-card rounded-xl shadow-none p-4">
      <div className="flex items-start justify-between mb-1">
        <div className="min-w-0 flex-1">
          {customerName && (
            <h3 className="text-white font-medium truncate">{customerName}</h3>
          )}
          <p className="text-sm text-royal-light">{methodLabels[payment.method] || payment.method}</p>
        </div>
        <div className="text-right">
          <span className={`font-semibold ${payment.type === 'refund' ? 'text-red-400' : 'text-green-400'}`}>
            {payment.type === 'refund' ? '-' : '+'}{formatCurrency(payment.amount, currency)}
          </span>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${typeColors[payment.type] || 'text-royal-light bg-royal-bg'}`}>
          {payment.type}
        </span>
        <span className="text-xs text-royal-muted">{formatDateTime(payment.createdAt)}</span>
      </div>
      {payment.notes && (
        <p className="text-xs text-royal-muted mt-1 truncate">{payment.notes}</p>
      )}
    </div>
  );
}
