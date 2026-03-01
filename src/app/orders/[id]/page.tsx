'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useOrder, updateOrder } from '@/hooks/useOrders';
import { useOrderPayments, addPayment } from '@/hooks/usePayments';
import { useCustomerMeasurements, useMeasurementFields } from '@/hooks/useMeasurements';
import { useCurrency } from '@/hooks/useSettings';
import { db, type Customer } from '@/lib/db';
import { formatDate, formatCurrency } from '@/lib/utils';
import StatusBadge from '@/components/StatusBadge';
import PaymentCard from '@/components/PaymentCard';
import Modal from '@/components/Modal';
import EmptyState from '@/components/EmptyState';

const STATUS_FLOW: Record<string, string> = {
  pending: 'in_progress',
  in_progress: 'ready',
  ready: 'delivered',
};

const STATUS_ACTIONS: Record<string, string> = {
  pending: 'Start Work',
  in_progress: 'Mark Ready',
  ready: 'Mark Delivered',
};

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const order = useOrder(id);
  const payments = useOrderPayments(id);
  const currency = useCurrency();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    type: 'balance' as 'deposit' | 'balance' | 'refund',
    method: 'cash' as 'cash' | 'transfer' | 'card' | 'mobile_money',
    notes: '',
  });

  useEffect(() => {
    if (order?.customerId) {
      db.customers.get(order.customerId).then((c) => setCustomer(c || null));
    }
  }, [order?.customerId]);

  const customerId = order?.customerId || '';
  const measurements = useCustomerMeasurements(customerId);
  const fields = useMeasurementFields();

  const totalPaid = payments
    ? payments.reduce((sum, p) => (p.type === 'refund' ? sum - p.amount : sum + p.amount), 0)
    : 0;
  const outstanding = order ? order.totalAmount - totalPaid : 0;
  const latestMeasurement = measurements && measurements.length > 0 ? measurements[0] : null;

  async function handleStatusChange() {
    if (!order) return;
    const nextStatus = STATUS_FLOW[order.status];
    if (!nextStatus) return;
    await updateOrder(id, { status: nextStatus as typeof order.status });
  }

  async function handleCancelOrder() {
    if (!order) return;
    if (confirm('Are you sure you want to cancel this order?')) {
      await updateOrder(id, { status: 'cancelled' });
    }
  }

  async function handleAddPayment() {
    if (!order) return;
    const amount = parseFloat(paymentForm.amount);
    if (!amount || amount <= 0) {
      alert('Please enter a valid amount');
      return;
    }
    setSaving(true);
    try {
      await addPayment({
        orderId: id,
        customerId: order.customerId,
        amount,
        type: paymentForm.type,
        method: paymentForm.method,
        notes: paymentForm.notes,
      });
      setShowPaymentModal(false);
      setPaymentForm({ amount: '', type: 'balance', method: 'cash', notes: '' });
    } catch (err) {
      console.error('Failed to add payment:', err);
      alert('Failed to add payment');
    } finally {
      setSaving(false);
    }
  }

  if (order === undefined) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="px-4 pt-4">
        <EmptyState title="Order not found" description="This order may have been deleted." />
      </div>
    );
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
        <h1 className="text-xl font-bold text-gray-900 flex-1 truncate">Order Details</h1>
        <StatusBadge status={order.status} />
      </div>

      {/* Customer Info */}
      {customer && (
        <button
          onClick={() => router.push(`/customers/${customer.id}`)}
          className="w-full bg-white rounded-xl shadow-sm p-3 mb-3 flex items-center gap-3 active:bg-gray-50"
        >
          <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
            <span className="text-indigo-600 font-semibold">
              {customer.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="text-left min-w-0">
            <p className="font-medium text-gray-900 truncate">{customer.name}</p>
            <p className="text-xs text-gray-500">{customer.phone}</p>
          </div>
          <svg className="w-5 h-5 text-gray-300 ml-auto flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {/* Order Details */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-3">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Order Information</h3>
        <div className="space-y-2">
          {order.fabricType && (
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Fabric Type</span>
              <span className="text-sm font-medium text-gray-900">{order.fabricType}</span>
            </div>
          )}
          {order.deliveryDate && (
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Delivery Date</span>
              <span className="text-sm font-medium text-gray-900">{formatDate(order.deliveryDate)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">Created</span>
            <span className="text-sm text-gray-900">{formatDate(order.createdAt)}</span>
          </div>
        </div>

        {order.styleDescription && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <span className="text-xs font-medium text-gray-400 uppercase">Style Description</span>
            <p className="text-sm text-gray-600 mt-1">{order.styleDescription}</p>
          </div>
        )}

        {order.notes && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <span className="text-xs font-medium text-gray-400 uppercase">Notes</span>
            <p className="text-sm text-gray-600 mt-1">{order.notes}</p>
          </div>
        )}
      </div>

      {/* Fabric & Style Photos */}
      {(order.fabricPhoto || order.styleImages.length > 0) && (
        <div className="bg-white rounded-xl shadow-sm p-4 mb-3">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Photos</h3>
          <div className="flex flex-wrap gap-2">
            {order.fabricPhoto && (
              <div className="relative">
                <img src={order.fabricPhoto} alt="Fabric" className="w-24 h-24 object-cover rounded-lg" />
                <span className="absolute bottom-1 left-1 text-[10px] bg-black/50 text-white px-1 rounded">Fabric</span>
              </div>
            )}
            {order.styleImages.map((img, i) => (
              <img key={i} src={img} alt={`Style ${i + 1}`} className="w-24 h-24 object-cover rounded-lg" />
            ))}
          </div>
        </div>
      )}

      {/* Financial Summary */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-3">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Payment Summary</h3>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">Total Amount</span>
            <span className="text-sm font-semibold text-gray-900">{formatCurrency(order.totalAmount, currency)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">Total Paid</span>
            <span className="text-sm font-medium text-green-600">{formatCurrency(totalPaid, currency)}</span>
          </div>
          <div className="flex justify-between pt-2 border-t border-gray-100">
            <span className="text-sm font-medium text-gray-700">Outstanding</span>
            <span className={`text-sm font-bold ${outstanding > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {formatCurrency(Math.max(0, outstanding), currency)}
            </span>
          </div>
        </div>
      </div>

      {/* Status Actions */}
      {order.status !== 'delivered' && order.status !== 'cancelled' && (
        <div className="flex gap-2 mb-3">
          <button
            onClick={handleStatusChange}
            className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 active:bg-indigo-800 transition-colors text-sm"
          >
            {STATUS_ACTIONS[order.status]}
          </button>
          <button
            onClick={handleCancelOrder}
            className="px-4 py-3 bg-red-50 text-red-600 rounded-xl font-semibold hover:bg-red-100 transition-colors text-sm"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Add Payment Button */}
      <button
        onClick={() => setShowPaymentModal(true)}
        className="w-full py-3 bg-white border-2 border-indigo-600 text-indigo-600 rounded-xl font-semibold hover:bg-indigo-50 transition-colors text-sm mb-3"
      >
        Add Payment
      </button>

      {/* Payment History */}
      {payments && payments.length > 0 && (
        <div className="mb-3">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Payment History</h3>
          <div className="space-y-2">
            {payments.map((p) => (
              <PaymentCard key={p.id} payment={p} currency={currency} />
            ))}
          </div>
        </div>
      )}

      {/* Latest Measurements */}
      {latestMeasurement && fields && (
        <div className="bg-white rounded-xl shadow-sm p-4 mb-3">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Customer Measurements</h3>
          <p className="text-xs text-gray-400 mb-2">As of {formatDate(latestMeasurement.createdAt)}</p>
          <div className="grid grid-cols-2 gap-1">
            {fields.map((f) => {
              const val = latestMeasurement.fields[f.id];
              if (val === undefined) return null;
              return (
                <div key={f.id} className="flex justify-between bg-gray-50 rounded-lg px-2 py-1.5 text-xs">
                  <span className="text-gray-500">{f.name}</span>
                  <span className="font-medium text-gray-700">{val} {f.unit}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Payment Modal */}
      <Modal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        title="Add Payment"
      >
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
            <input
              type="number"
              value={paymentForm.amount}
              onChange={(e) => setPaymentForm((p) => ({ ...p, amount: e.target.value }))}
              className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="0"
            />
            {outstanding > 0 && (
              <button
                onClick={() => setPaymentForm((p) => ({ ...p, amount: outstanding.toString() }))}
                className="text-xs text-indigo-600 mt-1"
              >
                Fill outstanding: {formatCurrency(outstanding, currency)}
              </button>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <div className="flex gap-2">
              {(['deposit', 'balance', 'refund'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setPaymentForm((p) => ({ ...p, type: t }))}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                    paymentForm.type === t
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Method</label>
            <select
              value={paymentForm.method}
              onChange={(e) =>
                setPaymentForm((p) => ({
                  ...p,
                  method: e.target.value as typeof paymentForm.method,
                }))
              }
              className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="cash">Cash</option>
              <option value="transfer">Transfer</option>
              <option value="card">Card</option>
              <option value="mobile_money">Mobile Money</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <input
              type="text"
              value={paymentForm.notes}
              onChange={(e) => setPaymentForm((p) => ({ ...p, notes: e.target.value }))}
              className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Optional notes..."
            />
          </div>

          <button
            onClick={handleAddPayment}
            disabled={saving}
            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving...' : 'Save Payment'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
